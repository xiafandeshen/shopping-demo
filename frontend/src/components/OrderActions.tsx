import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { actOnOrder } from "../api/orders";
import { getErrorMessage } from "../api/client";
import type { Order } from "../types";

type Props = { order: Order; showDetailLink?: boolean };

export function OrderActions({ order, showDetailLink = true }: Props) {
    const queryClient = useQueryClient();
    const [notice, setNotice] = useState("");
    const action = useMutation({
        mutationFn: (value: string) => actOnOrder(order.id, value),
        onSuccess: async (updated, value) => {
            setNotice(
                value === "cancel" && order.status === "paid_pending_shipment"
                    ? "已取消订单，已支付金额会在 5 个工作日原路退回。"
                    : value === "return"
                      ? "5 個工作日內將安排工作人員上門取件。"
                      : "訂單狀態已更新。",
            );
            if (value === "return") window.alert("5 个工作日会有工作人员上门取件。");
            if (value === "cancel" && order.status === "paid_pending_shipment") window.alert("已取消订单，已支付金额会在5个工作日原路退回。");
            await queryClient.invalidateQueries({ queryKey: ["orders"] });
            await queryClient.invalidateQueries({
                queryKey: ["order", updated.id],
            });
        },
    });
    const detail = showDetailLink ? (
        <Link className="secondary-button" to={`/orders/${order.id}`}>
            查看详情
        </Link>
    ) : null;
    const button = (label: string, value: string, destructive = false) => (
        <button
            className={destructive ? "danger-button" : "secondary-button"}
            disabled={action.isPending}
            onClick={() => action.mutate(value)}
        >
            {label}
        </button>
    );
    let controls;
    switch (order.status) {
        case "pending_payment":
            controls = (
                <>
                    {button("取消订单", "cancel", true)}
                    <Link
                        className="primary-button"
                        to={`/payment/${order.id}`}
                    >
                        立即付款
                    </Link>
                    {detail}
                </>
            );
            break;
        case "paid_pending_shipment":
            controls = (
                <>
                    {button("取消订单", "cancel", true)}
                    {detail}
                </>
            );
            break;
        case "shipped":
            controls = (
                <>
                    {button("退货", "return", true)}
                    {button("已收货", "receive")} {detail}
                </>
            );
            break;
        case "returning":
            controls = (
                <>
                    {button("取消退货", "cancel_return")}
                    {detail}
                </>
            );
            break;
        default:
            controls = detail;
    }
    return (
        <div className="flex flex-wrap items-center gap-2">
            {controls}
            {action.isError ? (
                <span className="text-sm text-destructive" role="alert">
                    {getErrorMessage(action.error)}
                </span>
            ) : null}
            {notice ? (
                <span className="text-sm text-muted-foreground" role="status">
                    {notice}
                </span>
            ) : null}
        </div>
    );
}
