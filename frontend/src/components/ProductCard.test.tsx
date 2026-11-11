import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProductCard } from "./ProductCard";
import type { Product } from "../types";
import { useSessionStore } from "../stores/session";

const product: Product = {
    id: "P001",
    name: "Aero 無線藍牙耳機",
    brand: "Pulso",
    category: "3C 配件",
    price: 1890,
    stock: 35,
    margin_rate: 0.42,
    recommendation_score: 82,
    description: "輕巧入耳式設計。",
    specs: {},
    image_url: null,
};

describe("ProductCard", () => {
    it("shows sold out when inventory is empty", () => {
        render(
            <MemoryRouter>
                <ProductCard
                    product={{ ...product, stock: 0 }}
                    onAdd={vi.fn()}
                />
            </MemoryRouter>,
        );
        expect(screen.getByText("已售完")).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /加入购物车/ }),
        ).not.toBeInTheDocument();
    });

    it("adds a product when requested", () => {
        useSessionStore.getState().setUser({ id: 1, display_name: "Demo" });
        const onAdd = vi.fn().mockResolvedValue(undefined);
        render(
            <MemoryRouter>
                <ProductCard product={product} onAdd={onAdd} />
            </MemoryRouter>,
        );
        fireEvent.click(screen.getByRole("button", { name: /加入购物车/ }));
        expect(onAdd).toHaveBeenCalledWith("P001");
        useSessionStore.getState().setUser(null);
    });

    it("opens the login dialog instead of adding when signed out", () => {
        useSessionStore.getState().setUser(null);
        const onAdd = vi.fn().mockResolvedValue(undefined);
        const openLogin = vi.fn();
        window.addEventListener("open-login-dialog", openLogin);
        render(
            <MemoryRouter>
                <ProductCard product={product} onAdd={onAdd} />
            </MemoryRouter>,
        );
        fireEvent.click(screen.getByRole("button", { name: /加入购物车/ }));
        expect(openLogin).toHaveBeenCalledOnce();
        expect(onAdd).not.toHaveBeenCalled();
        window.removeEventListener("open-login-dialog", openLogin);
    });
});
