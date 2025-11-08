import { Helius } from "../../src"; // Replace with 'helius-sdk' in a production setting
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

async function main() {
  const helius = new Helius('YOUR_API_KEY');

  const wallet = new PublicKey('D8vy6wcSCoJx3WzbJCHdd2enYBe5eKXU8N5vTESkX1sk');
  console.log('Fetching Heliusdelegated stake accounts for: - getHeliusStakeAccounts.ts:8', wallet.toBase58());

  const stakeAccounts = await helius.rpc.getHeliusStakeAccounts(wallet.toBase58());

  if (stakeAccounts.length === 0) {
    console.log('No stake accounts found delegated to Helius. - getHeliusStakeAccounts.ts:13');
    return;
  }

  for (const account of stakeAccounts) {
    const data = account.account.data;

    if (data && 'parsed' in data) {
      const info = data.parsed.info;
      const delegation = info.stake?.delegation;

      console.log('');
      console.log('Stake Pubkey: - getHeliusStakeAccounts.ts:25', account.pubkey.toBase58());
      console.log('Stake Amount: - getHeliusStakeAccounts.ts:26', delegation.stake / LAMPORTS_PER_SOL, 'SOL');
      console.log('Delegated to: - getHeliusStakeAccounts.ts:27', delegation.voter);
      console.log('Activation Epoch: - getHeliusStakeAccounts.ts:28', delegation.activationEpoch);
      console.log('Deactivation Epoch: - getHeliusStakeAccounts.ts:29', delegation.deactivationEpoch);
    }
  }
}

main().catch((err) => {
  console.error('Example failed: - getHeliusStakeAccounts.ts:35', err);
  process.exit(1);
});
