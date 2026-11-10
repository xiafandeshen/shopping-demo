import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CheckoutPage } from "./CheckoutPage";

describe("CheckoutPage", () => {
    it("requires a signed-in user", async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={["/checkout"]}>
                    <Routes>
                        <Route path="/checkout" element={<CheckoutPage />} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>,
        );
        expect(await screen.findByText("请先登录")).toBeInTheDocument();
    });
});
