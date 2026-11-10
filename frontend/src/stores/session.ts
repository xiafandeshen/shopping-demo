import { create } from "zustand";
import type { SessionUser } from "../types";

type SessionState = {
    user: SessionUser | null;
    setUser: (user: SessionUser | null) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
    user: null,
    setUser: (user) => set({ user }),
}));
