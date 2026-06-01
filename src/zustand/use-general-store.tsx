
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface GeneralTypes<T extends object> {
  zusState: T;
  zusUpdateState: <K extends keyof T>(key: K, value: T[K]) => void;
}

// Usage example:
// const { zusState, zusUpdateState } = useGeneralStore((state) => ({ zusState: state.zusState, zusUpdateState: state.zusUpdateState }));
// zusUpdateState("key", "value")

export const useGeneralStore = create<GeneralTypes<Record<string, unknown>>>()(
  devtools((set) => ({
    zusState: {},
    zusUpdateState: (key, value) =>
      set(
        (state) => ({
          zusState: {
            ...state.zusState,
            [key]: value,
          },
        }),
        false, // Prevent re-running devtools action if no change
        `zusUpdateState: ${String(key)}` // Custom action name in DevTools
      ),
  }))
);

