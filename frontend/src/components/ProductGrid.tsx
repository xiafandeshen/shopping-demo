import type { Product } from "../types";
import { ProductCard } from "./ProductCard";

type Props = { products: Product[]; onAdd: (id: string) => Promise<void> };

export function ProductGrid({ products, onAdd }: Props) {
    if (products.length === 0)
        return (
            <div className="empty-state">
                <strong>没有找到相关商品</strong>
                <span>换个关键词再试试。</span>
            </div>
        );
    return (
        <div className="product-grid">
            {products.map((product) => (
                <ProductCard key={product.id} product={product} onAdd={onAdd} />
            ))}
        </div>
    );
}
