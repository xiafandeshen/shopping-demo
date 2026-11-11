import { type FormEvent, useEffect, useRef, useState } from "react";
import { LoaderCircle, Send, Sparkles, X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getConversation,
  sendAssistantMessage,
  createConversation,
  type AssistantMessage,
} from "../api/assistant";
import { getErrorMessage } from "../api/client";
import { useSessionStore } from "../stores/session";

export function AssistantChat({
  open,
  onClose,
  onLogin,
}: {
  open: boolean;
  onClose: () => void;
  onLogin: () => void;
}) {
  const user = useSessionStore((state) => state.user);
  const conversation = useQuery({
    queryKey: ["assistant-conversation"],
    queryFn: getConversation,
    enabled: open && !!user,
    retry: false,
  });
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [conversationId, setConversationId] = useState<number>();
  const [draft, setDraft] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setMessages(conversation.data?.messages ?? []);
    setConversationId(conversation.data?.conversation_id ?? undefined);
  }, [conversation.data]);
  useEffect(
    () => bottom.current?.scrollIntoView({ behavior: "smooth" }),
    [messages],
  );
  const send = useMutation({
    mutationFn: (message: string) =>
      sendAssistantMessage(message, conversationId),
    onSuccess: (data) => {
      setMessages(data.messages);
      if (data.checkout_url)
        setMessages((current) => [
          ...current.slice(0, -1),
          { role: "assistant", content: `${data.reply}\n${data.checkout_url}` },
        ]);
    },
  });
  const newConversation = useMutation({
    mutationFn: createConversation,
    onSuccess: (data) => {
      setConversationId(data.conversation_id ?? undefined);
      setMessages([]);
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || send.isPending) return;
    setMessages((current) => [...current, { role: "user", content: message }]);
    setDraft("");
    send.mutate(message);
  }
  if (!open) return null;
  return (
    <section className="assistant-chat" aria-label="AI购物助手">
      {messages.length > 0 ? (
        <button
          className="assistant-new"
          onClick={() => {
            if (
              window.confirm(
                "确定新开对话吗？当前对话会保留，但窗口将切换到新对话。",
              )
            )
              newConversation.mutate();
          }}
          disabled={newConversation.isPending}
        >
          新开对话
        </button>
      ) : null}
      <header className="assistant-chat-header">
        <div className="assistant-title">
          <Sparkles aria-hidden="true" />
          <strong>AI购物助手</strong>
        </div>
        <div className="assistant-promo">使用购物助手进行购物享95折</div>
        <button
          className="assistant-close"
          aria-label="关闭对话框"
          onClick={onClose}
        >
          <X />
        </button>
      </header>
      {!user ? (
        <div className="assistant-login">
          <Sparkles />
          <strong>使用AI购物助手前，需要完成登录</strong>
          <button className="primary-button" onClick={onLogin}>
            登录后开始
          </button>
        </div>
      ) : (
        <>
          <div className="assistant-messages" aria-live="polite">
            {conversation.isPending ? (
              <p className="assistant-empty">正在加载最近对话…</p>
            ) : null}
            {!conversation.isPending && messages.length === 0 ? (
              <p className="assistant-empty">有什么可以帮助您？</p>
            ) : null}
            {messages.map((message, index) => (
              <div
                key={`${index}-${message.role}`}
                className={`assistant-message assistant-message-${message.role}`}
              >
                {message.content
                  // Do not include sentence-closing punctuation in the href.
                  .split(/(https?:\/\/[^\s)]+)/g)
                  .map((part, partIndex) =>
                    part.startsWith("http") ? (
                      <a
                        key={partIndex}
                        href={part}
                        target="_blank"
                        rel="noreferrer"
                      >
                        打开支付链接
                      </a>
                    ) : (
                      part
                    ),
                  )}
              </div>
            ))}
            {send.isPending ? (
              <div className="assistant-thinking">
                <LoaderCircle className="assistant-spinner" />
                正在为您挑选…
              </div>
            ) : null}
            {send.isError ? (
              <p className="assistant-error" role="alert">
                {getErrorMessage(send.error)}
              </p>
            ) : null}
            <div ref={bottom} />
          </div>
          <form className="assistant-input" onSubmit={submit}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="描述您想找的商品…"
              aria-label="发送消息"
              rows={2}
            />
            <button
              className="primary-button"
              disabled={send.isPending || !draft.trim()}
              aria-label="发送"
            >
              <Send />
            </button>
          </form>
        </>
      )}
    </section>
  );
}
