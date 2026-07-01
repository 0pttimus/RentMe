import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getMe, logout as apiLogout, type AuthUser } from "@/lib/api/client";
import {
  clearClientSession,
  clearClientSessionIfMarker,
  getClientSessionMarker,
  hasClientSession,
} from "@/lib/auth/session";

export interface AuthState {
  user: AuthUser | null;
  loaded: boolean;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  loaded: false,
  loading: false,
};

export const fetchCurrentUser = createAsyncThunk("auth/fetchCurrentUser", async () => {
  const sessionMarker = getClientSessionMarker();
  if (!hasClientSession()) return { user: null, sessionMarker };
  const res = await getMe();
  return { user: res.data?.user ?? null, sessionMarker };
});

export const signOut = createAsyncThunk("auth/signOut", async () => {
  await apiLogout();
  clearClientSession();
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: { payload: AuthUser | null }) {
      state.user = action.payload;
      state.loaded = true;
    },
    clearUser(state) {
      state.user = null;
      state.loaded = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        if (!action.payload.user) clearClientSessionIfMarker(action.payload.sessionMarker);
        state.user = action.payload.user;
        state.loaded = true;
        state.loading = false;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.loaded = true;
        state.loading = false;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;
