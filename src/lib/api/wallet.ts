import { apiFetch } from "./client";

export function createWalletBackup(data: {
  passwordShare: string;
  otpShare2: string;
  otpRecoveryShare1: string;
}) {
  return apiFetch<{ success: boolean }>("/wallet/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function recoverWalletBackup() {
  return apiFetch<{
    passwordShare: string;
    otpShare2: string;
    otpRecoveryShare1: string;
    createdAt: string;
    updatedAt: string;
  }>("/wallet/recover");
}
