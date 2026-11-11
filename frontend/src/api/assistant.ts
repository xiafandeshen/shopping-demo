import { api } from "./client";

export type AssistantMessage = { role: "user" | "assistant"; content: string };
export type AssistantResponse = {
  reply: string;
  messages: AssistantMessage[];
  checkout_url?: string | null;
  conversation_id?: number | null;
};

export const getConversation = async () =>
  (await api.get("/assistant/conversation")).data as AssistantResponse;
export const createConversation = async () =>
  (await api.post("/assistant/conversations")).data as AssistantResponse;
export const sendAssistantMessage = async (
  message: string,
  conversation_id?: number,
) =>
  (await api.post("/assistant/message", { message, conversation_id }))
    .data as AssistantResponse;
export const getCheckoutByToken = async (token: string) =>
  (await api.get(`/assistant/checkout/${token}`)).data;
export const payCheckoutByToken = async (token: string) =>
  (await api.post(`/assistant/checkout/${token}/pay`)).data;
