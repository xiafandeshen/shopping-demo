import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, ShieldCheck } from "lucide-react";
import { getErrorMessage } from "../api/client";
import { getCheckoutByToken, payCheckoutByToken } from "../api/assistant";
import { getOrder, payOrder } from "../api/orders";
import { formatPrice, ORDER_STATUS_LABELS } from "../types";

export function PaymentPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const order = useQuery({
    queryKey: ["order", id],
    queryFn: () => (token ? getCheckoutByToken(token) : getOrder(id)),
    retry: false,
  });
  const pay = useMutation({
    mutationFn: () => (token ? payCheckoutByToken(token) : payOrder(id)),
    onSuccess: async (updated) => {
      queryClient.setQueryData(["order", id], updated);
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (token) {
        queryClient.setQueryData(["checkout-token-order", token], updated);
      } else {
        navigate(`/orders/${id}`);
      }
    },
  });
  const closed = order.data && order.data.status !== "pending_payment";
  useEffect(() => {
    if (!closed) return;
    const timer = window.setTimeout(() => navigate("/"), 3000);
    return () => window.clearTimeout(timer);
  }, [closed, navigate]);
  if (order.isPending)
    return <main className="loading-state">正在读取订单…</main>;
  if (order.isError)
    return (
      <main className="empty-state">
        <strong>订单不可用</strong>
        <span>{getErrorMessage(order.error)}</span>
        <Link className="secondary-button" to="/orders">
          返回我的订单
        </Link>
      </main>
    );
  return (
    <main className="payment-page">
      <div className="payment-mark">
        <ShieldCheck aria-hidden="true" />
      </div>
      <p className="eyebrow">SECURE CHECKOUT</p>
      {closed ? (
        <>
          <h1>订单已关闭</h1>
          <p className="muted-copy">
            当前状态：
            {ORDER_STATUS_LABELS[order.data.status] ?? order.data.status}
            。3 秒后返回首页。
          </p>
          <Link className="secondary-button" to="/">
            返回首页
          </Link>
        </>
      ) : (
        <>
          <h1>确认是本人的订单并付款</h1>
          <div className="payment-amount">
            {formatPrice(order.data.payable_amount)}
          </div>
          <p className="muted-copy">订单编号 {order.data.id.slice(0, 12)}</p>
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
        </>
      )}
    </main>
  );
}
