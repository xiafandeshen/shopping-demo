import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { getOrders } from "../api/orders";
import { OrderActions } from "../components/OrderActions";
import { formatPrice, ORDER_STATUS_LABELS } from "../types";

export function OrdersPage() {
    const orders = useQuery({
        queryKey: ["orders", 1],
        queryFn: () => getOrders(1),
        retry: false,
    });
    if (orders.isPending)
        return <main className="loading-state">正在加载订单…</main>;
    if (orders.isError)
        return (
            <main className="empty-state">
                <strong>订单暂时无法读取</strong>
                <span>{getErrorMessage(orders.error)}</span>
                <Link className="primary-button" to="/">
                    返回首页
                </Link>
            </main>
        );
    return (
        <main className="mx-auto max-w-7xl px-5 pb-16">
            <header className="page-title">
                <p className="eyebrow">YOUR PURCHASES</p>
                <h1>我的订单</h1>
                <p>查看進度、管理售後與付款。</p>
            </header>
            {orders.data.items.length === 0 ? (
                <div className="empty-state order-empty">
                    <strong>还没有订单</strong>
                    <span>喜欢的好物，稍后可以在这里找到。</span>
                    <Link className="primary-button" to="/">
                        去逛逛
                    </Link>
                </div>
            ) : (
                <div className="order-list">
                    {orders.data.items.map((order) => (
                        <article className="order-card" key={order.id}>
                            <header className="order-card-head">
                                <div>
                                    <span>订单日期</span>
                                    <strong>
                                        {new Date(
                                            order.created_at,
                                        ).toLocaleString("zh-CN")}
                                    </strong>
                                </div>
                                <div>
                                    <span>订单编号</span>
                                    <strong>{order.id.slice(0, 12)}</strong>
                                </div>
                                <span className="status-tag">
                                    {ORDER_STATUS_LABELS[order.status] ??
                                        order.status}
                                </span>
                            </header>
                            <div className="order-card-body">
                                <div className="order-product-strip">
                                    {order.items.slice(0, 4).map((item) => (
                                        <div
                                            className="order-product"
                                            key={item.product_id}
                                        >
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt=""
                                                />
                                            ) : (
                                                <span aria-hidden="true">
                                                    物
                                                </span>
                                            )}
                                            <strong>{item.product_name}</strong>
                                            <small>× {item.quantity}</small>
                                        </div>
                                    ))}
                                </div>
                                <div className="order-summary">
                                    <span>订单金额</span>
                                    <strong>
                                        {formatPrice(order.payable_amount)}
                                    </strong>
                                    <OrderActions order={order} />
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </main>
    );
}
