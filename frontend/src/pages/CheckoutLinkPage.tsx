import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ShieldCheck } from "lucide-react";
import { useParams } from "react-router-dom";
import { getCheckoutByToken, payCheckoutByToken } from "../api/assistant";
import { getErrorMessage } from "../api/client";
import { formatPrice } from "../types";

export function CheckoutLinkPage() {
  const { token = "" } = useParams();
  const client = useQueryClient();
  const order = useQuery({
    queryKey: ["checkout-token-order", token],
    queryFn: () => getCheckoutByToken(token),
    retry: false,
  });
  const pay = useMutation({
    mutationFn: () => payCheckoutByToken(token),
    onSuccess: (updated) =>
      client.setQueryData(["checkout-token-order", token], updated),
  });
  if (order.isPending)
    return <main className="loading-state">正在读取订单…</main>;
  if (order.isError)
    return (
      <main className="empty-state">
        <strong>支付链接不可用</strong>
        <span>{getErrorMessage(order.error)}</span>
      </main>
    );
  if (order.data.status === "paid_pending_shipment")
    return (
      <main className="payment-page">
        <div className="payment-mark">
          <Check />
        </div>
        <h1>支付成功</h1>
      </main>
    );
  return (
    <main className="payment-page">
      <div className="payment-mark">
        <ShieldCheck />
      </div>
      <p className="eyebrow">SECURE CHECKOUT</p>
      <h1>确认订单并付款</h1>
      <p className="muted-copy">订单编号 {order.data.id.slice(0, 12)}</p>
      <div className="payment-amount">
        {formatPrice(order.data.payable_amount)}
      </div>
      {pay.isError ? (
        <p className="text-destructive" role="alert">
          {getErrorMessage(pay.error)}
        </p>
      ) : null}
      <button
        className="primary-button payment-button"
        disabled={pay.isPending}
        onClick={() => pay.mutate()}
      >
        {pay.isPending ? (
          "正在处理…"
        ) : (
          <>
            <Check data-icon="inline-start" aria-hidden="true" />
            完成支付
          </>
        )}
      </button>
    </main>
  );
}
