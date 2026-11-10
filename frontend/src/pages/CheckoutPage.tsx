import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AddressForm } from "../components/AddressForm";
import { getAddresses } from "../api/addresses";
import { getCart } from "../api/cart";
import { getErrorMessage } from "../api/client";
import { createOrder } from "../api/orders";
import { getMe } from "../api/session";
import { formatPrice } from "../types";
import type { Address } from "../types";

export function CheckoutPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
    const [addingAddress, setAddingAddress] = useState(false);
    const me = useQuery({
        queryKey: ["session"],
        queryFn: getMe,
        retry: false,
    });
    const addresses = useQuery({
        queryKey: ["addresses"],
        queryFn: getAddresses,
        enabled: me.isSuccess,
        retry: false,
    });
    const cart = useQuery({
        queryKey: ["cart"],
        queryFn: getCart,
        enabled: me.isSuccess,
        retry: false,
    });
    const selectedItems =
        cart.data?.items.filter((item) => item.selected) ?? [];
    const subtotal = selectedItems.reduce(
        (sum, item) => sum + item.line_total,
        0,
    );
    const thresholdDiscount = subtotal >= 1000 ? 100 : 0;
    const source = searchParams.get("source") === "ai" ? "ai" : "normal";
    const aiDiscount =
        source === "ai"
            ? subtotal -
              thresholdDiscount -
              Math.floor(((subtotal - thresholdDiscount) * 95) / 100)
            : 0;
    const shipping = subtotal >= 999 ? 0 : 100;
    const create = useMutation({
        mutationFn: () =>
            createOrder(
                selectedAddress ??
                    addresses.data?.find((address) => address.is_default)?.id ??
                    addresses.data?.[0]?.id ??
                    0,
                source,
            ),
        onSuccess: async (order) => {
            await queryClient.invalidateQueries({ queryKey: ["cart"] });
            navigate(`/payment/${order.id}`);
        },
    });
    const activeAddressId =
        selectedAddress ??
        addresses.data?.find((address) => address.is_default)?.id ??
        addresses.data?.[0]?.id ??
        null;

    function addressCreated(address: Address) {
        queryClient.setQueryData<Address[]>(["addresses"], (current = []) => [
            address,
            ...current,
        ]);
        setSelectedAddress(address.id);
        setAddingAddress(false);
    }

    if (me.isPending)
        return <main className="loading-state">正在确认登录状态…</main>;
    if (me.isError)
        return (
            <main className="empty-state">
                <strong>请先登录</strong>
                <span>登录后才能确认订单。</span>
                <button
                    className="primary-button"
                    onClick={() => navigate("/?login=1")}
                >
                    返回登录
                </button>
            </main>
        );
    if (cart.isError || addresses.isError)
        return (
            <main className="empty-state">
                <strong>订单信息加载失败</strong>
                <span>{getErrorMessage(cart.error ?? addresses.error)}</span>
                <button
                    className="secondary-button"
                    onClick={() => {
                        cart.refetch();
                        addresses.refetch();
                    }}
                >
                    重试
                </button>
            </main>
        );

    return (
        <main className="mx-auto max-w-5xl px-5 pb-16">
            <div className="checkout-title">
                <p className="eyebrow">CHECKOUT</p>
                <h1>确认订单</h1>
                <div className="step-track">
                    <span className="current">01 商品与地址</span>
                    <i />
                    <span>02 完成付款</span>
                    <i />
                    <span>03 订单完成</span>
                </div>
            </div>
            <section className="checkout-section">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">DELIVERY</p>
                        <h2>收货信息</h2>
                    </div>
                    <button
                        className="text-button"
                        onClick={() => setAddingAddress((value) => !value)}
                    >
                        {addingAddress ? "收起" : "+ 新增收货信息"}
                    </button>
                </div>
                {addingAddress ? (
                    <AddressForm
                        onCreated={addressCreated}
                        onCancel={() => setAddingAddress(false)}
                    />
                ) : null}
                {!addingAddress && addresses.data?.length ? (
                    <div className="address-list">
                        {addresses.data.map((address) => (
                            <label
                                className={`address-option ${activeAddressId === address.id ? "address-selected" : ""}`}
                                key={address.id}
                            >
                                <input
                                    type="radio"
                                    name="address"
                                    checked={activeAddressId === address.id}
                                    onChange={() =>
                                        setSelectedAddress(address.id)
                                    }
                                />
                                <div>
                                    <strong>
                                        {address.recipient}
                                        <span>{address.phone}</span>
                                    </strong>
                                    <p>
                                        {address.region} {address.detail}
                                    </p>
                                </div>
                                {address.is_default ? (
                                    <span className="tag">默认</span>
                                ) : null}
                            </label>
                        ))}
                    </div>
                ) : null}
                {!addingAddress && !addresses.data?.length ? (
                    <div className="empty-address">
                        <strong>还没有收货地址</strong>
                        <span>新增收货信息后即可继续下单。</span>
                        <button
                            className="primary-button"
                            onClick={() => setAddingAddress(true)}
                        >
                            新增收货信息
                        </button>
                    </div>
                ) : null}
            </section>
            <section className="checkout-section">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">ORDER ITEMS</p>
                        <h2>本次购买</h2>
                    </div>
                    <span>{selectedItems.length} 件商品</span>
                </div>
                {selectedItems.length ? (
                    <div className="checkout-items">
                        {selectedItems.map((item) => (
                            <div className="checkout-item" key={item.id}>
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
                                <strong>{formatPrice(item.line_total)}</strong>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-address">
                        <strong>没有选中的商品</strong>
                        <span>请返回购物车选择商品。</span>
                        <button
                            className="secondary-button"
                            onClick={() => navigate("/")}
                        >
                            继续选购
                        </button>
                    </div>
                )}
            </section>
            <section className="checkout-section total-section">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">AMOUNT DUE</p>
                        <h2>订单金额</h2>
                    </div>
                </div>
                <div className="amount-lines">
                    <div>
                        <span>商品总额</span>
                        <strong>{formatPrice(subtotal)}</strong>
                    </div>
                    {thresholdDiscount ? (
                        <div className="discount-line">
                            <span>满额优惠</span>
                            <strong>- {formatPrice(thresholdDiscount)}</strong>
                        </div>
                    ) : null}
                    {source === "ai" ? (
                        <div className="discount-line">
                            <span>AI 来源折扣 95 折</span>
                            <strong>- {formatPrice(aiDiscount)}</strong>
                        </div>
                    ) : null}
                    <div>
                        <span>
                            运费 {shipping === 0 ? "（满 999 免运费）" : ""}
                        </span>
                        <strong>{formatPrice(shipping)}</strong>
                    </div>
                    <div className="amount-payable">
                        <span>应付金额</span>
                        <strong>
                            {formatPrice(
                                subtotal -
                                    thresholdDiscount -
                                    aiDiscount +
                                    shipping,
                            )}
                        </strong>
                    </div>
                </div>
                {create.isError ? (
                    <p className="mt-4 text-sm text-destructive" role="alert">
                        {getErrorMessage(create.error)}
                    </p>
                ) : null}
                <div className="checkout-submit">
                    <button
                        className="primary-button"
                        disabled={
                            !activeAddressId ||
                            !selectedItems.length ||
                            create.isPending
                        }
                        onClick={() => create.mutate()}
                    >
                        {create.isPending ? "正在创建订单…" : "确认订单"}
                    </button>
                </div>
            </section>
        </main>
    );
}
