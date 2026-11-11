import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { SiteHeader } from "./SiteHeader";
import { AssistantChat } from "./AssistantChat";
import { useSessionStore } from "../stores/session";
import { getMe } from "../api/session";

vi.mock("../api/session", () => ({
    getMe: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
}));
vi.mock("../api/assistant", () => ({
    getConversation: vi.fn().mockResolvedValue({ messages: [] }),
    createConversation: vi.fn(),
    sendAssistantMessage: vi.fn(),
}));

describe("session recovery", () => {
    beforeEach(() => {
        useSessionStore.setState({ user: null });
        Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
            configurable: true,
            value: vi.fn(),
        });
    });

    afterEach(() => {
        cleanup();
        useSessionStore.setState({ user: null });
        vi.restoreAllMocks();
    });

    function renderSession() {
        const client = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        render(
            <QueryClientProvider client={client}>
                <MemoryRouter>
                    <SiteHeader />
                    <AssistantChat open onClose={() => {}} onLogin={() => {}} />
                </MemoryRouter>
            </QueryClientProvider>,
        );
    }

    it("shares the recovered session with the shopping assistant", async () => {
        vi.mocked(getMe).mockResolvedValue({ id: 1, display_name: "Demo" });
        renderSession();

        expect(await screen.findByText("欢迎您，Demo")).toBeInTheDocument();
        expect(await screen.findByLabelText("发送消息")).toBeInTheDocument();
        expect(screen.queryByText("登录后开始")).not.toBeInTheDocument();
        expect(useSessionStore.getState().user?.id).toBe(1);
    });

    it("keeps the login prompt when session recovery fails", async () => {
        vi.mocked(getMe).mockRejectedValue(new Error("Unauthorized"));
        renderSession();

        await waitFor(() => expect(getMe).toHaveBeenCalled());
        expect(screen.getByText("登录后开始")).toBeInTheDocument();
        expect(screen.queryByLabelText("发送消息")).not.toBeInTheDocument();
    });
});
