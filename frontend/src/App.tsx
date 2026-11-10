import { useState } from "react";
import {
    QueryClient,
    QueryClientProvider,
    useQuery,
} from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { getCart } from "./api/cart";
import { CartDialog } from "./components/CartDialog";
import { CartLauncher } from "./components/CartLauncher";
import { SiteHeader } from "./components/SiteHeader";
import { CheckoutPage } from "./pages/CheckoutPage";
import { HomePage } from "./pages/HomePage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { OrdersPage } from "./pages/OrdersPage";
import { PaymentPage } from "./pages/PaymentPage";
import { ProductPage } from "./pages/ProductPage";
import { SearchPage } from "./pages/SearchPage";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        mutations: { retry: false },
    },
});

function Storefront() {
    const [cartOpen, setCartOpen] = useState(false);
    const cart = useQuery({
        queryKey: ["cart"],
        queryFn: getCart,
        retry: false,
    });
    const count = cart.data?.total_quantity ?? 0;
    return (
        <>
            <SiteHeader />
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/products/:id" element={<ProductPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/payment/:id" element={<PaymentPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:id" element={<OrderDetailPage />} />
                <Route
                    path="*"
                    element={
                        <main className="empty-state">
                            <strong>页面不存在</strong>
                            <a className="primary-button" href="/">
                                返回首页
                            </a>
                        </main>
                    }
                />
            </Routes>
            <CartLauncher count={count} onClick={() => setCartOpen(true)} />
            <CartDialog open={cartOpen} onClose={() => setCartOpen(false)} />
            <footer className="site-footer">
                <span>拾物商城</span>
                <span>认真挑选，让日常更好一点。</span>
            </footer>
        </>
    );
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Storefront />
            </BrowserRouter>
        </QueryClientProvider>
    );
}
