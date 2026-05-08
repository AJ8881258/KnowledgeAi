// store.ts
import { create } from "zustand";
// Persisting store data
import { persist, createJSONStorage } from "zustand/middleware";

// Define types for state & actions
interface BearState {
  bears: number;
  feed: (food: number) => void;
}

// Create store using the curried form of `create`
export const useBearStore = create<BearState>()(
  persist(
    (set) => ({
      bears: 2,
      feed: (bears) => set(() => ({ bears })),
    }),
    {
      name: "bear",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
