import { api } from "./client";
import type { ProductDetail, ProductPage } from "../types";

export const getRecommended = async () =>
    (await api.get("/products/recommended")).data as ProductPage["items"];
export const searchProducts = async (q: string, page: number) =>
    (await api.get("/products", { params: { q, page, page_size: 20 } }))
        .data as ProductPage;
export const getProduct = async (id: string) =>
    (await api.get(`/products/${id}`)).data as ProductDetail;
