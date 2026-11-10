import { api } from "./client";
import type { Address } from "../types";

export type AddressInput = Omit<Address, "id">;
export const getAddresses = async () =>
    (await api.get("/addresses")).data as Address[];
export const createAddress = async (input: AddressInput) =>
    (await api.post("/addresses", input)).data as Address;
