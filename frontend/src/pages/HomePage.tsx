import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { addCartItem } from "../api/cart";
import { getRecommended } from "../api/products";
import { getErrorMessage } from "../api/client";
import { ProductGrid } from "../components/ProductGrid";
import { useSessionStore } from "../stores/session";

export function HomePage() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const products = useQuery({
    queryKey: ["recommended"],
    queryFn: getRecommended,
  });
  const add = useMutation({
    mutationFn: (id: string) => addCartItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });
  function search() {
    const value = query.trim();
    if (value) navigate(`/search?q=${encodeURIComponent(value)}`);
  }

  return (
    <main>
      <section className="home-banner">
        <div className="banner-content">
          <p className="eyebrow">GOOD THINGS, WELL CHOSEN</p>
          <h1>把日常，挑得更好。</h1>
          <p className="banner-copy">
            從真正用得上的好物開始，讓每次選擇都更踏實。
          </p>
          <div className="search-box">
            <Search aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && search()}
              placeholder="搜索商品、品牌或类别"
              aria-label="搜索商品"
            />
            <button className="primary-button" onClick={search}>
              搜索
            </button>
            <button
              className="assistant-button"
              title="打开AI购物助手"
              onClick={() =>
                window.dispatchEvent(new Event("open-assistant-chat"))
              }
            >
              <Sparkles aria-hidden="true" />
              AI购物助手
            </button>
          </div>
        </div>
      </section>
      <section className="page-section mx-auto max-w-7xl px-5">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CURATED FOR YOU</p>
            <h2>本周精选</h2>
          </div>
          <span>按推荐分值排序 · {products.data?.length ?? 20} 件好物</span>
        </div>
        {products.isPending ? (
          <div className="loading-state">正在为你挑选商品…</div>
        ) : null}
        {products.isError ? (
          <div className="empty-state">
            <strong>商品暂时无法加载</strong>
            <span>{getErrorMessage(products.error)}</span>
            <button
              className="secondary-button"
              onClick={() => products.refetch()}
            >
              重试
            </button>
          </div>
        ) : null}
        {products.data ? (
          <ProductGrid
            products={products.data}
            onAdd={async (id) => {
              if (!user) {
                window.dispatchEvent(new Event("open-login-dialog"));
                return;
              }
              await add.mutateAsync(id);
            }}
          />
        ) : null}
        {add.isError ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {getErrorMessage(add.error)}
          </p>
        ) : null}
      </section>
    </main>
  );
}
