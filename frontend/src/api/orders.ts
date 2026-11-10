import { api } from "./client";
import type { Order, OrderPage } from "../types";

export const createOrder = async (
    address_id: number,
    source: "normal" | "ai",
) => (await api.post("/orders", { address_id, source })).data as Order;
export const getOrders = async (page = 1) =>
    (await api.get("/orders", { params: { page } })).data as OrderPage;
export const getOrder = async (id: string) =>
    (await api.get(`/orders/${id}`)).data as Order;
export const payOrder = async (id: string) =>
    (await api.post(`/orders/${id}/pay`)).data as Order;
export const actOnOrder = async (id: string, action: string) =>
    (await api.post(`/orders/${id}/actions`, { action })).data as Order;
