import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ShoppingBag, Star } from "lucide-react";
import { addCartItem } from "../api/cart";
import { getErrorMessage } from "../api/client";
import { getProduct } from "../api/products";
import { formatPrice } from "../types";
import { useSessionStore } from "../stores/session";

export function ProductPage() {
    const { id = "" } = useParams();
    const queryClient = useQueryClient();
    const user = useSessionStore((state) => state.user);
    const product = useQuery({
        queryKey: ["product", id],
        queryFn: () => getProduct(id),
    });
    const add = useMutation({
        mutationFn: () => addCartItem(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
    });
    if (product.isPending)
        return <main className="loading-state">正在加载商品…</main>;
    if (product.isError)
        return (
            <main className="empty-state">
                <strong>无法加载商品</strong>
                <span>{getErrorMessage(product.error)}</span>
                <Link className="secondary-button" to="/">
                    返回首页
                </Link>
            </main>
        );
    const item = product.data;
    return (
        <main className="mx-auto max-w-7xl px-5 pb-16">
            <nav className="breadcrumbs">
                <Link to="/">首页</Link>
                <span>/</span>
                <span>{item.category}</span>
                <span>/</span>
                <strong>{item.name}</strong>
            </nav>
            <section className="product-detail">
                <div className="detail-image">
                    {item.image_url ? (
                        <img src={item.image_url} alt={item.name} />
                    ) : (
                        <div className="product-placeholder detail-placeholder">
                            <span>{item.brand}</span>
                            <strong>{item.category}</strong>
                        </div>
                    )}
                </div>
                <div className="detail-copy">
                    <p className="eyebrow">
                        {item.brand} · {item.category}
                    </p>
                    <h1>{item.name}</h1>
                    <p className="detail-description">{item.description}</p>
                    <div className="detail-price">
                        {formatPrice(item.price)}
                    </div>
                    <div className="stock-line">
                        {item.stock > 0
                            ? `现货 · 库存 ${item.stock} 件`
                            : "暂时售罄"}
                    </div>
                    <button
                        className="primary-button detail-add"
                        disabled={item.stock <= 0 || add.isPending}
                        onClick={() => {
                            if (!user) {
                                window.dispatchEvent(new Event("open-login-dialog"));
                                return;
                            }
                            add.mutate();
                        }}
                    >
                        <ShoppingBag
                            data-icon="inline-start"
                            aria-hidden="true"
                        />
                        {item.stock <= 0
                            ? "已售完"
                            : add.isPending
                              ? "正在加入…"
                              : "加入购物车"}
                    </button>
                    {add.isError ? (
                        <p
                            className="mt-3 text-sm text-destructive"
                            role="alert"
                        >
                            {getErrorMessage(add.error)}
                        </p>
                    ) : null}
                    <div className="spec-section">
                        <h2>商品特性</h2>
                        <dl>
                            {Object.entries(item.specs).map(
                                ([label, value]) => (
                                    <div key={label}>
                                        <dt>{label}</dt>
                                        <dd>{value}</dd>
                                    </div>
                                ),
                            )}
                        </dl>
                    </div>
                </div>
            </section>
            <section className="reviews-section">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">CUSTOMER NOTES</p>
                        <h2>商品评价</h2>
                    </div>
                    <span>{item.reviews.length} 条评价</span>
                </div>
                {item.reviews.length ? (
                    <div className="review-list">
                        {item.reviews.map((review) => (
                            <article className="review-row" key={review.id}>
                                <div className="review-meta">
                                    <strong>{review.user_display_name}</strong>
                                    <span>
                                        <Star aria-hidden="true" />{" "}
                                        {review.rating}.0
                                    </span>
                                    <time>
                                        {review.created_at.slice(0, 10)}
                                    </time>
                                </div>
                                <p>{review.content}</p>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">暂时没有评价。</div>
                )}
            </section>
        </main>
    );
}
