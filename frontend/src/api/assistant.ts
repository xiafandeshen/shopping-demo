import { api } from "./client";

export type AssistantMessage = { role: "user" | "assistant"; content: string };
export type AssistantResponse = {
  reply: string;
  messages: AssistantMessage[];
  checkout_url?: string | null;
};

export const getConversation = async () =>
  (await api.get("/assistant/conversation")).data as AssistantResponse;
export const sendAssistantMessage = async (message: string) =>
  (await api.post("/assistant/message", { message })).data as AssistantResponse;
export const getCheckoutByToken = async (token: string) =>
  (await api.get(`/assistant/checkout/${token}`)).data;
export const payCheckoutByToken = async (token: string) =>
  (await api.post(`/assistant/checkout/${token}/pay`)).data;
