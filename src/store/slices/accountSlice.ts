import { createSlice } from "@reduxjs/toolkit";

export type AccountType = "tl" | "freelance";

const STORAGE_KEY = "rentme_account_type";

function load(): AccountType {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "tl" || stored === "freelance") return stored;
  } catch {}
  return "tl";
}

function save(type: AccountType) {
  try {
    localStorage.setItem(STORAGE_KEY, type);
  } catch {}
}

export interface AccountState {
  type: AccountType;
}

const initialState: AccountState = {
  type: load(),
};

const accountSlice = createSlice({
  name: "account",
  initialState,
  reducers: {
    switchToFreelance(state) {
      state.type = "freelance";
      save("freelance");
    },
    switchToTl(state) {
      state.type = "tl";
      save("tl");
    },
  },
});

export const { switchToFreelance, switchToTl } = accountSlice.actions;
export default accountSlice.reducer;
