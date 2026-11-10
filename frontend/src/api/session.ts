import { api } from "./client";
import type { SessionUser } from "../types";

export const getMe = async () =>
    (await api.get("/session/me")).data as SessionUser;
export const login = async () =>
    (await api.post("/session/login", { login_id: "demo" }))
        .data as SessionUser;
export const logout = async () => api.post("/session/logout");
