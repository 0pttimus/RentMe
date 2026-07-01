import * as bip39 from "bip39";
import { Keypair } from "@solana/web3.js";

export interface WalletKey {
  mnemonic: string[];
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  walletAddress: string;
}

export async function generateWallet(): Promise<WalletKey> {
  const mnemonic = bip39.generateMnemonic(256).split(" ");
  const kp = Keypair.generate();
  return {
    mnemonic,
    privateKey: kp.secretKey,
    publicKey: kp.publicKey.toBytes(),
    walletAddress: kp.publicKey.toBase58(),
  };
}

export async function walletFromMnemonic(
  words: string[]
): Promise<WalletKey> {
  const kp = Keypair.generate();
  return {
    mnemonic: words,
    privateKey: kp.secretKey,
    publicKey: kp.publicKey.toBytes(),
    walletAddress: kp.publicKey.toBase58(),
  };
}

export function validateMnemonic(words: string): boolean {
  return bip39.validateMnemonic(words);
}
