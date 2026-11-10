import axios from "axios";

export const api = axios.create({
    baseURL: "/api",
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
});

export function getErrorMessage(error: unknown) {
    if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        if (typeof detail === "string") return detail;
        if (error.code === "ERR_NETWORK")
            return "无法连接服务，请确认后端已启动。";
    }
    return "操作失败，请稍后重试。";
}
