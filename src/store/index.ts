// store.ts
import { create } from "zustand";

// Define types for state & actions
interface BearState {
  bears: number;
  feed: (food: number) => void;
}

// Create store using the curried form of `create`
export const useBearStore = create<BearState>()((set) => ({
  bears: 2,
  feed: (bears) => set(() => ({ bears })),
}));
