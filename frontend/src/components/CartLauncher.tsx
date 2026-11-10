import { ShoppingCart } from "lucide-react";

type Props = { count: number; onClick: () => void };

export function CartLauncher({ count, onClick }: Props) {
    return (
        <button
            className="cart-launcher"
            onClick={onClick}
            aria-label={`打开购物车，${count}件商品`}
            title="购物车"
        >
            <ShoppingCart aria-hidden="true" />
            <span className="cart-count" aria-live="polite">
                {count > 99 ? "99+" : count}
            </span>
        </button>
    );
}
