export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ENVIRONMENT: string;
  ALLOWED_ORIGIN?: string;
  // Business config
  RESERVATION_DEPOSIT?: string;
  INSPECTION_HOURS?: string;
  FEE_BPS?: string;
  INITIAL_WALLET_BALANCE?: string;
  DEFAULT_TRUST_SCORE?: string;
  // Resend
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  // Termii SMS
  TERMII_API_KEY?: string;
  TERMII_SENDER_ID?: string;
  // Paystack
  PAYSTACK_SECRET_KEY?: string;
  // KYC (Smile Identity / YouVerify compatible webhook)
  KYC_API_KEY?: string;
  KYC_PARTNER_ID?: string;
  KYC_WEBHOOK_SECRET?: string;
  // OpenAI
  OPENAI_API_KEY?: string;
  // Wallet encryption (64 hex chars = 32 bytes)
  WALLET_ENCRYPTION_KEY?: string;
  // Solana
  SOLANA_RPC_URL?: string;
  SOLANA_ESCROW_PROGRAM_ID?: string;
  SOLANA_ADMIN_SECRET?: string;
  // Token
  TOKEN_MINT_ADDRESS?: string;
  FEE_COLLECTOR_ADDRESS?: string;
  // Push notifications (VAPID)
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_EMAIL?: string;
}