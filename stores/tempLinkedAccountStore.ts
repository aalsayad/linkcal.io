// src/stores/tempLinkedAccountStore.ts
import { create } from "zustand";

interface TempLinkedAccount {
  refreshToken: string;
  email: string;
  provider: string;
}

interface TempLinkedAccountState {
  tempLinkedAccount: TempLinkedAccount | null;
  setTempLinkedAccount: (account: TempLinkedAccount) => void;
  clearTempLinkedAccount: () => void;
}

export const useTempLinkedAccountStore = create<TempLinkedAccountState>(
  (set) => ({
    tempLinkedAccount: null,
    setTempLinkedAccount: (account) => set({ tempLinkedAccount: account }),
    clearTempLinkedAccount: () => set({ tempLinkedAccount: null }),
  })
);
