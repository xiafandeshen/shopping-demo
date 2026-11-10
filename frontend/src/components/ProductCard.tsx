import { cn } from "../lib/utils";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { formatPrice, type Product } from "../types";

type Props = { product: Product; onAdd: (id: string) => Promise<void> };

export function ProductCard({ product, onAdd }: Props) {
    const [adding, setAdding] = useState(false);
    const [added, setAdded] = useState(false);

    async function add() {
        setAdding(true);
        try {
            await onAdd(product.id);
            setAdded(true);
            window.setTimeout(() => setAdded(false), 1200);
        } catch {
            // The parent mutation renders the request error.
        } finally {
            setAdding(false);
        }
    }

    return (
        <article className={cn("product-card", added && "product-added")}>
            <Link
                to={`/products/${product.id}`}
                className="product-image-wrap"
                aria-label={`查看${product.name}`}
            >
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                    />
                ) : (
                    <div
                        className="product-placeholder"
                        aria-label="商品图片占位图"
                    >
                        <span>{product.brand}</span>
                        <strong>{product.category}</strong>
                    </div>
                )}
            </Link>
            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="min-h-16">
                    <Link
                        className="font-semibold leading-6 hover:text-primary"
                        to={`/products/${product.id}`}
                    >
                        {product.name}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                        {product.description}
                    </p>
                </div>
                <div className="mt-auto flex items-center justify-between gap-2">
                    <strong className="tabular-nums text-lg text-primary">
                        {formatPrice(product.price)}
                    </strong>
                    {product.stock <= 0 ? (
                        <span className="rounded-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
                            已售完
                        </span>
                    ) : (
                        <button
                            className="icon-action"
                            aria-label={`将${product.name}加入购物车`}
                            disabled={adding}
                            onClick={add}
                            title="加入购物车"
                        >
                            <ShoppingBag
                                data-icon="inline-start"
                                aria-hidden="true"
                            />
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}
