import type { AgenticSignupResult } from "./types";
import { checkSolBalance, checkUsdcBalance } from "./checkBalances";
import { payUSDC } from "./payUSDC";
import { requestBasicSponsoredTx } from "./basicSponsoredPayment";
import { signAndSubmitSponsoredTx } from "./sponsoredPayment";
import { createProject } from "./createProject";
import { getProject } from "./getProject";
import { retryWithBackoff } from "./retry";
import { getHttpStatus } from "./getHttpStatus";
import { buildEndpoints } from "./signupHelpers";
import { MIN_SOL_FOR_TX, PAYMENT_AMOUNT } from "./constants";

/**
 * Basic plan signup: $1 USDC direct payment with sponsored SOL.
 * Tries sponsored transaction first (backend pays SOL fees),
 * falls back to self-funded payUSDC if sponsorship infra fails.
 */
export async function executeBasicSignup(
  secretKey: Uint8Array,
  jwt: string,
  walletAddress: string,
  userAgent: string | undefined
): Promise<AgenticSignupResult> {
  // 1. Check USDC balance (user pays $1)
  const usdcBalance = await checkUsdcBalance(walletAddress);
  if (usdcBalance < PAYMENT_AMOUNT) {
    throw new Error(
      `Insufficient USDC. Have: ${Number(usdcBalance) / 1_000_000} USDC, need: 1 USDC. Fund address: ${walletAddress}`
    );
  }

  // 2. Try sponsored path (no SOL needed)
  let txSignature: string;
  try {
    const { transaction, lastValidBlockHeight } =
      await requestBasicSponsoredTx(jwt, walletAddress, userAgent);
    txSignature = await signAndSubmitSponsoredTx(
      secretKey,
      transaction,
      BigInt(lastValidBlockHeight)
    );
  } catch (err) {
    // USDC errors re-throw — self-funded fallback would fail identically
    if (err instanceof Error && err.message.includes("Insufficient USDC"))
      throw err;
    // 4xx errors are permanent — self-funding won't help
    const status = getHttpStatus(err);
    if (status !== undefined && status >= 400 && status < 500) throw err;

    // 3. Sponsorship infra issue (5xx / network) — fall back to self-funded
    console.warn(
      `[helius-sdk] Sponsored basic payment failed, falling back to self-funded: ${err instanceof Error ? err.message : String(err)}`
    );
    const solBalance = await checkSolBalance(walletAddress);
    if (solBalance < MIN_SOL_FOR_TX) {
      throw new Error(
        `Insufficient SOL for transaction fees. Have: ${Number(solBalance) / 1_000_000_000} SOL, need: ~0.001 SOL. Fund address: ${walletAddress}`
      );
    }
    txSignature = await payUSDC(secretKey);
  }

  // 4. Create project (verifies USDC transfer on-chain via RPC)
  const project = await retryWithBackoff(() => createProject(jwt, userAgent));

  const projectDetails = await getProject(jwt, project.id, userAgent);
  const apiKey =
    projectDetails.apiKeys?.[0]?.keyId || project.apiKeys?.[0]?.keyId || null;

  return {
    status: "success",
    jwt,
    walletAddress,
    projectId: project.id,
    apiKey,
    endpoints: apiKey ? buildEndpoints(apiKey) : null,
    credits: projectDetails.creditsUsage?.remainingCredits ?? null,
    txSignature,
  };
}
