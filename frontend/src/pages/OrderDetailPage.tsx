import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { getOrder } from "../api/orders";
import { OrderActions } from "../components/OrderActions";
import { formatPrice, ORDER_STATUS_LABELS } from "../types";

export function OrderDetailPage() {
    const { id = "" } = useParams();
    const order = useQuery({
        queryKey: ["order", id],
        queryFn: () => getOrder(id),
        retry: false,
    });
    if (order.isPending)
        return <main className="loading-state">正在加载订单详情…</main>;
    if (order.isError)
        return (
            <main className="empty-state">
                <strong>订单不存在</strong>
                <span>{getErrorMessage(order.error)}</span>
                <Link className="secondary-button" to="/orders">
                    返回订单列表
                </Link>
            </main>
        );
    const data = order.data;
    return (
        <main className="mx-auto max-w-5xl px-5 pb-16">
            <header className="page-title">
                <p className="eyebrow">ORDER DETAIL</p>
                <h1>订单详情</h1>
                <p>订单编号 {data.id}</p>
            </header>
            <section className="detail-section">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">ORDER STATUS</p>
                        <h2>
                            {ORDER_STATUS_LABELS[data.status] ?? data.status}
                        </h2>
                    </div>
                </div>
                <OrderActions order={data} showDetailLink={false} />
            </section>
            <section className="detail-section">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">DELIVERY</p>
                        <h2>收货信息</h2>
                    </div>
                </div>
                <div className="snapshot-address">
                    <strong>
                        {data.address_snapshot.recipient}
                        <span>{data.address_snapshot.phone}</span>
                    </strong>
                    <p>
                        {data.address_snapshot.region}{" "}
                        {data.address_snapshot.detail}
                    </p>
                </div>
            </section>
            <section className="detail-section">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">ITEMS</p>
                        <h2>订单商品</h2>
                    </div>
                </div>
                <div className="checkout-items">
                    {data.items.map((item) => (
                        <div className="checkout-item" key={item.product_id}>
                            <div className="cart-thumb">
                                {item.image_url ? (
                                    <img src={item.image_url} alt="" />
                                ) : (
                                    <span aria-hidden="true">物</span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <strong>{item.product_name}</strong>
                                <span>数量：{item.quantity}</span>
                            </div>
                            <strong>
                                {formatPrice(item.unit_price * item.quantity)}
                            </strong>
                        </div>
                    ))}
                </div>
            </section>
            <section className="detail-section">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">PAYMENT SUMMARY</p>
                        <h2>订单金额</h2>
                    </div>
                </div>
                <div className="amount-lines">
                    <div>
                        <span>商品总额</span>
                        <strong>{formatPrice(data.subtotal)}</strong>
                    </div>
                    {data.discount_amount ? (
                        <div className="discount-line">
                            <span>优惠金额</span>
                            <strong>
                                - {formatPrice(data.discount_amount)}
                            </strong>
                        </div>
                    ) : null}
                    <div>
                        <span>运费</span>
                        <strong>{formatPrice(data.shipping_amount)}</strong>
                    </div>
                    <div className="amount-payable">
                        <span>实付款</span>
                        <strong>{formatPrice(data.payable_amount)}</strong>
                    </div>
                </div>
            </section>
        </main>
    );
}
