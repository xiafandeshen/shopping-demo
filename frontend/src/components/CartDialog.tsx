import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import {
    getCart,
    removeCartItem,
    updateCartQuantity,
    updateCartSelection,
} from "../api/cart";
import { getErrorMessage } from "../api/client";
import { formatPrice } from "../types";

type Props = { open: boolean; onClose: () => void };

export function CartDialog({ open, onClose }: Props) {
    const queryClient = useQueryClient();
    const cart = useQuery({
        queryKey: ["cart"],
        queryFn: getCart,
        enabled: open,
        retry: false,
    });
    const mutation = useMutation({
        mutationFn: async (action: () => Promise<unknown>) => action(),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
    });
    const selectedTotal =
        cart.data?.items
            .filter((item) => item.selected)
            .reduce((sum, item) => sum + item.line_total, 0) ?? 0;

    if (!open) return null;
    return (
        <div
            className="overlay"
            role="presentation"
            onMouseDown={(event) =>
                event.target === event.currentTarget && onClose()
            }
        >
            <section
                className="dialog-panel cart-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cart-title"
            >
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <div>
                        <p className="eyebrow">YOUR SELECTION</p>
                        <h2 id="cart-title" className="text-xl font-semibold">
                            购物车
                        </h2>
                    </div>
                    <button
                        className="icon-action"
                        aria-label="关闭购物车"
                        onClick={onClose}
                    >
                        <X aria-hidden="true" />
                    </button>
                </div>
                {cart.isPending ? (
                    <p className="py-12 text-center text-muted-foreground">
                        正在读取购物车…
                    </p>
                ) : null}
                {cart.isError ? (
                    <div className="empty-state">
                        <strong>购物车暂时无法读取</strong>
                        <span>{getErrorMessage(cart.error)}</span>
                        <button
                            className="secondary-button"
                            onClick={() => cart.refetch()}
                        >
                            重试
                        </button>
                    </div>
                ) : null}
                {cart.data?.items.length === 0 ? (
                    <div className="empty-state py-14">
                        <ShoppingBag aria-hidden="true" />
                        <strong>购物车还是空的</strong>
                        <span>挑选几件喜欢的商品吧。</span>
                        <button className="secondary-button" onClick={onClose}>
                            继续逛逛
                        </button>
                    </div>
                ) : null}
                {cart.data?.items.length ? (
                    <>
                        <div className="cart-lines">
                            {cart.data.items.map((item) => (
                                <div className="cart-line" key={item.id}>
                                    <input
                                        type="checkbox"
                                        checked={item.selected}
                                        aria-label={`选择${item.product_name}`}
                                        onChange={(event) =>
                                            mutation.mutate(() =>
                                                updateCartSelection(
                                                    item.id,
                                                    event.target.checked,
                                                ),
                                            )
                                        }
                                    />
                                    <div className="cart-thumb">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt="" />
                                        ) : (
                                            <ShoppingBag aria-hidden="true" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <strong className="line-clamp-2">
                                            {item.product_name}
                                        </strong>
                                        <span className="mt-1 block text-sm text-muted-foreground">
                                            {formatPrice(item.unit_price)}
                                        </span>
                                    </div>
                                    <div className="quantity-control">
                                        <button
                                            aria-label="减少数量"
                                            disabled={
                                                item.quantity <= 1 ||
                                                mutation.isPending
                                            }
                                            onClick={() =>
                                                mutation.mutate(() =>
                                                    updateCartQuantity(
                                                        item.id,
                                                        item.quantity - 1,
                                                    ),
                                                )
                                            }
                                        >
                                            <Minus aria-hidden="true" />
                                        </button>
                                        <span>{item.quantity}</span>
                                        <button
                                            aria-label="增加数量"
                                            disabled={mutation.isPending}
                                            onClick={() =>
                                                mutation.mutate(() =>
                                                    updateCartQuantity(
                                                        item.id,
                                                        item.quantity + 1,
                                                    ),
                                                )
                                            }
                                        >
                                            <Plus aria-hidden="true" />
                                        </button>
                                    </div>
                                    <button
                                        className="icon-action danger-action"
                                        aria-label={`移除${item.product_name}`}
                                        onClick={() =>
                                            mutation.mutate(() =>
                                                removeCartItem(item.id),
                                            )
                                        }
                                    >
                                        <Trash2 aria-hidden="true" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {mutation.isError ? (
                            <p
                                className="text-sm text-destructive"
                                role="alert"
                            >
                                {getErrorMessage(mutation.error)}
                            </p>
                        ) : null}
                        <div className="mt-auto border-t border-border pt-4">
                            <div className="mb-4 flex justify-between">
                                <span className="text-muted-foreground">
                                    已选商品小计
                                </span>
                                <strong>{formatPrice(selectedTotal)}</strong>
                            </div>
                            <Link
                                className={`primary-button w-full ${selectedTotal === 0 ? "pointer-events-none opacity-50" : ""}`}
                                to="/checkout"
                                onClick={onClose}
                            >
                                确认订单
                            </Link>
                        </div>
                    </>
                ) : null}
            </section>
        </div>
    );
}
