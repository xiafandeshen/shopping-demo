export type Product = {
    id: string;
    name: string;
    brand: string;
    category: string;
    price: number;
    stock: number;
    margin_rate: number;
    recommendation_score: number;
    description: string;
    specs: Record<string, string>;
    image_url: string | null;
};

export type Review = {
    id: number;
    user_display_name: string;
    rating: number;
    content: string;
    created_at: string;
};

export type ProductDetail = Product & { reviews: Review[] };
export type ProductPage = {
    items: Product[];
    page: number;
    page_size: number;
    total: number;
};
export type SessionUser = { id: number; display_name: string };
export type Address = {
    id: number;
    recipient: string;
    phone: string;
    region: string;
    detail: string;
    is_default: boolean;
};
export type CartItem = {
    id: number;
    product_id: string;
    product_name: string;
    image_url: string | null;
    unit_price: number;
    quantity: number;
    selected: boolean;
    line_total: number;
    stock: number;
};
export type Cart = { items: CartItem[]; total_quantity: number };
export type OrderItem = {
    product_id: string;
    product_name: string;
    image_url: string | null;
    unit_price: number;
    quantity: number;
};
export type Order = {
    id: string;
    status: string;
    source: string;
    address_snapshot: Record<string, string>;
    subtotal: number;
    discount_amount: number;
    shipping_amount: number;
    payable_amount: number;
    created_at: string;
    items: OrderItem[];
};
export type OrderPage = { items: Order[]; total: number };

export const ORDER_STATUS_LABELS: Record<string, string> = {
    pending_payment: "待付款",
    paid_pending_shipment: "已付款待发货",
    shipped: "已发货",
    received: "已收货",
    completed: "已完成",
    cancelled: "已取消",
    expired: "已失效",
    returning: "退货中",
    returned: "退货完成",
};

export const formatPrice = (amount: number) =>
    `NT$ ${amount.toLocaleString("zh-TW")}`;
