import { api } from "./client";
import type { Cart, CartItem } from "../types";

export const getCart = async () => (await api.get("/cart")).data as Cart;
export const addCartItem = async (product_id: string, quantity = 1) =>
    (await api.post("/cart/items", { product_id, quantity })).data as CartItem;
export const updateCartQuantity = async (id: number, quantity: number) =>
    (await api.patch(`/cart/items/${id}`, { quantity })).data as CartItem;
export const updateCartSelection = async (id: number, selected: boolean) =>
    (await api.patch(`/cart/items/${id}/selection`, { selected }))
        .data as CartItem;
export const removeCartItem = async (id: number) =>
    api.delete(`/cart/items/${id}`);
