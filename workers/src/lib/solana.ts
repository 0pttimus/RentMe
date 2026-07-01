import { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, getAssociatedTokenAddress, getAssociatedTokenAddressSync, getAccount, createTransferInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { Env } from "./env";

const DEVNET_USDC = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";

const DISCRIMINATORS: Record<string, number[]> = {
  init_escrow: [70, 46, 40, 23, 6, 11, 81, 139],
  mark_done: [112, 146, 215, 90, 40, 16, 44, 149],
  confirm: [174, 1, 15, 213, 3, 190, 131, 0],
  refund: [2, 96, 183, 251, 63, 208, 46, 46],
};

export class SolanaClient {
  private conn: Connection;
  private programId: PublicKey;
  private tokenMint: PublicKey;
  private adminKeypair: Keypair;

  constructor(env: Env) {
    this.conn = new Connection(env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com");
    this.programId = new PublicKey(env.SOLANA_ESCROW_PROGRAM_ID ?? "");
    this.tokenMint = new PublicKey(env.TOKEN_MINT_ADDRESS ?? DEVNET_USDC);
    const secret = env.SOLANA_ADMIN_SECRET;
    if (!secret) throw new Error("SOLANA_ADMIN_SECRET required");
    this.adminKeypair = Keypair.fromSecretKey(Buffer.from(secret, "base64"));
  }

  escrowPda(owner: PublicKey, nonce: number | bigint): { pda: PublicKey; bump: number } {
    const nonceBuf = Buffer.alloc(8);
    nonceBuf.writeBigUInt64LE(BigInt(nonce));
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), owner.toBuffer(), nonceBuf],
      this.programId,
    );
    return { pda, bump };
  }

  async getEscrowState(escrowAddr: PublicKey): Promise<Record<string, any> | null> {
    try {
      const account = await this.conn.getAccountInfo(escrowAddr);
      if (!account) return null;
      const d = account.data.subarray(8);
      let off = 0;
      const readPubkey = () => { const k = new PublicKey(d.subarray(off, off + 32)); off += 32; return k.toBase58(); };
      const readU64 = () => { const v = d.readBigUInt64LE(off); off += 8; return v.toString(); };
      const readI64 = () => { const v = d.readBigInt64LE(off); off += 8; return v.toString(); };
      const readBool = () => { const v = d[off] !== 0; off += 1; return v; };
      const readU16 = () => { const v = d.readUInt16LE(off); off += 2; return v; };
      return {
        tenant: readPubkey(), worker: readPubkey(), owner: readPubkey(),
        nonce: readU64(),
        feeBps: readU16(),
        commitmentAmount: readU64(),
        feeCollector: readPubkey(), escrowTokenAccount: readPubkey(),
        amount: readU64(),
        isActive: readBool(), workerDone: readBool(),
        createdAt: readI64(), bump: off < d.length ? d[off] : 0,
      };
    } catch { return null; }
  }

  /** Admin signs + pays gas for an instruction that needs admin authority. */
  async sendAsAdmin(tx: Transaction): Promise<string> {
    tx.feePayer = this.adminKeypair.publicKey;
    const sig = await this.conn.sendTransaction(tx, [this.adminKeypair]);
    await this.conn.confirmTransaction(sig);
    return sig;
  }

  /** Admin pays gas, user provides the authorization signature. */
  async sendAsFeePayer(tx: Transaction, userSigner: Keypair): Promise<string> {
    tx.feePayer = this.adminKeypair.publicKey;
    const sig = await this.conn.sendTransaction(tx, [userSigner, this.adminKeypair]);
    await this.conn.confirmTransaction(sig);
    return sig;
  }

  async initEscrow(
    tenant: PublicKey, worker: PublicKey, nonce: number | bigint,
    feeBps: number, commitmentAmount: number | bigint, feeCollector: PublicKey,
    escrowTokenAccount: PublicKey, amount: number | bigint,
  ): Promise<{ escrowAddress: PublicKey; txHash: string }> {
    const { pda } = this.escrowPda(this.adminKeypair.publicKey, nonce);
    const feeBuf = Buffer.alloc(2);
    feeBuf.writeUInt16LE(feeBps);
    const data = Buffer.concat([
      Buffer.from(DISCRIMINATORS.init_escrow),
      tenant.toBuffer(),
      worker.toBuffer(),
      this.u64(Number(nonce)),
      feeBuf,
      this.u64(Number(commitmentAmount)),
      feeCollector.toBuffer(),
      escrowTokenAccount.toBuffer(),
      this.u64(Number(amount)),
    ]);
    const ix = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: pda, isSigner: false, isWritable: true },
        { pubkey: this.adminKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });
    const tx = new Transaction().add(ix);
    const txHash = await this.sendAsAdmin(tx);
    return { escrowAddress: pda, txHash };
  }

  async markDone(escrowAddr: PublicKey, workerKeypair: Keypair): Promise<string> {
    const ix = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: escrowAddr, isSigner: false, isWritable: true },
        { pubkey: workerKeypair.publicKey, isSigner: true, isWritable: false },
      ],
      data: Buffer.from(DISCRIMINATORS.mark_done),
    });
    return this.sendAsFeePayer(new Transaction().add(ix), workerKeypair);
  }

  async confirm(
    escrowAddr: PublicKey, tenantKeypair: Keypair,
    workerTokenAccount: PublicKey, feeTokenAccount: PublicKey,
    escrowTokenAccount: PublicKey,
  ): Promise<string> {
    const ix = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: escrowAddr, isSigner: false, isWritable: true },
        { pubkey: tenantKeypair.publicKey, isSigner: true, isWritable: false },
        { pubkey: workerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: feeTokenAccount, isSigner: false, isWritable: true },
        { pubkey: escrowTokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(DISCRIMINATORS.confirm),
    });
    return this.sendAsFeePayer(new Transaction().add(ix), tenantKeypair);
  }

  async refund(
    escrowAddr: PublicKey, workerKeypair: Keypair,
    tenantTokenAccount: PublicKey, escrowTokenAccount: PublicKey,
  ): Promise<string> {
    const ix = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: escrowAddr, isSigner: false, isWritable: true },
        { pubkey: workerKeypair.publicKey, isSigner: true, isWritable: false },
        { pubkey: tenantTokenAccount, isSigner: false, isWritable: true },
        { pubkey: escrowTokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(DISCRIMINATORS.refund),
    });
    return this.sendAsFeePayer(new Transaction().add(ix), workerKeypair);
  }

  async getOrCreateTokenAccount(owner: PublicKey): Promise<PublicKey> {
    const ata = await getOrCreateAssociatedTokenAccount(
      this.conn, this.adminKeypair, this.tokenMint, owner,
    );
    return ata.address;
  }

  async getTokenBalance(owner: PublicKey): Promise<number> {
    const ata = getAssociatedTokenAddressSync(this.tokenMint, owner);
    const account = await getAccount(this.conn, ata);
    return Number(account.amount);
  }

  async tryGetTokenBalance(owner: PublicKey): Promise<{ balance: number; error?: string }> {
    try {
      const balance = await this.getTokenBalance(owner);
      return { balance };
    } catch (e) {
      return { balance: 0, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async createAta(owner: PublicKey): Promise<PublicKey> {
    const ata = await getOrCreateAssociatedTokenAccount(
      this.conn, this.adminKeypair, this.tokenMint, owner,
    );
    return ata.address;
  }

  async transferUsdc(to: PublicKey, rawAmount: bigint): Promise<string> {
    const mint = this.tokenMint;
    const fromAta = await getOrCreateAssociatedTokenAccount(
      this.conn, this.adminKeypair, mint, this.adminKeypair.publicKey,
    );
    const toAta = await getOrCreateAssociatedTokenAccount(
      this.conn, this.adminKeypair, mint, to,
    );
    const ix = createTransferInstruction(
      fromAta.address, toAta.address, this.adminKeypair.publicKey, rawAmount,
    );
    const tx = new Transaction().add(ix);
    return this.sendAsAdmin(tx);
  }

  get adminPubkey(): PublicKey { return this.adminKeypair.publicKey; }

  async escrowTokenAccount(escrowPda: PublicKey): Promise<PublicKey> {
    const addr = await getAssociatedTokenAddress(this.tokenMint, escrowPda, true);
    await getOrCreateAssociatedTokenAccount(this.conn, this.adminKeypair, this.tokenMint, escrowPda, true);
    return addr;
  }

  private u64(v: number): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(v));
    return buf;
  }
}
