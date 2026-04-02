import { authRequest } from "./utils";

interface BasicSponsoredTxResponse {
  transaction: string;
  lastValidBlockHeight: number;
}

/**
 * Requests a sponsored transaction for basic plan signup ($1 USDC).
 * The backend builds the transaction and signs as fee payer —
 * the caller only needs to add their signature and submit.
 */
export async function requestBasicSponsoredTx(
  jwt: string,
  walletAddress: string,
  userAgent?: string
): Promise<BasicSponsoredTxResponse> {
  return authRequest<BasicSponsoredTxResponse>(
    "/signup/build-basic-sponsored-tx",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ walletAddress }),
    },
    userAgent
  );
}
