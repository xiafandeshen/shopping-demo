import { useEffect, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { addCartItem } from "../api/cart";
import { getErrorMessage } from "../api/client";
import { searchProducts } from "../api/products";
import { ProductGrid } from "../components/ProductGrid";
import { useSessionStore } from "../stores/session";

export function SearchPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const user = useSessionStore((state) => state.user);
    const term = searchParams.get("q")?.trim() ?? "";
    const currentPage = Math.max(1, Number(searchParams.get("page") ?? 1));
    const [input, setInput] = useState(term);
    useEffect(() => setInput(term), [term]);
    const results = useQuery({
        queryKey: ["search", term, currentPage],
        queryFn: () => searchProducts(term, currentPage),
        enabled: Boolean(term),
    });
    const add = useMutation({
        mutationFn: (id: string) => addCartItem(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
    });
    function submit() {
        const value = input.trim();
        if (value) navigate(`/search?q=${encodeURIComponent(value)}`);
    }
    const pages = Math.max(1, Math.ceil((results.data?.total ?? 0) / 20));

    return (
        <main className="mx-auto max-w-7xl px-5 pb-16">
            <section className="search-heading">
                <p className="eyebrow">FIND YOUR NEXT FAVORITE</p>
                <h1>搜索好物</h1>
                <div className="search-box compact-search">
                    <Search aria-hidden="true" />
                    <input
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={(event) => event.key === "Enter" && submit()}
                        placeholder="商品名称、品牌或类别"
                        aria-label="搜索商品"
                    />
                    <button className="primary-button" onClick={submit}>
                        搜索
                    </button>
                    <button
                        className="assistant-button"
                        title="AI购物助手暂未开放"
                        disabled
                    >
                        <Sparkles aria-hidden="true" />
                        AI购物助手
                    </button>
                </div>
            </section>
            <section className="page-section">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">SEARCH RESULTS</p>
                        <h2>
                            {term ? `“${term}” 的搜索结果` : "请输入搜索内容"}
                        </h2>
                    </div>
                    <span>
                        {results.data ? `共 ${results.data.total} 件商品` : ""}
                    </span>
                </div>
                {results.isPending && term ? (
                    <div className="loading-state">正在搜索…</div>
                ) : null}
                {results.isError ? (
                    <div className="empty-state">
                        <strong>搜索暂时失败</strong>
                        <span>{getErrorMessage(results.error)}</span>
                        <button
                            className="secondary-button"
                            onClick={() => results.refetch()}
                        >
                            重试
                        </button>
                    </div>
                ) : null}
                {results.data ? (
                    <ProductGrid
                        products={results.data.items}
                        onAdd={async (id) => {
                            if (!user) {
                                window.dispatchEvent(new Event("open-login-dialog"));
                                return;
                            }
                            await add.mutateAsync(id);
                        }}
                    />
                ) : null}
                {results.data && pages > 1 ? (
                    <nav className="pagination" aria-label="搜索结果分页">
                        <button
                            disabled={currentPage <= 1}
                            onClick={() =>
                                navigate(
                                    `/search?q=${encodeURIComponent(term)}&page=${currentPage - 1}`,
                                )
                            }
                        >
                            上一页
                        </button>
                        <span>
                            第 {currentPage} / {pages} 页
                        </span>
                        <button
                            disabled={currentPage >= pages}
                            onClick={() =>
                                navigate(
                                    `/search?q=${encodeURIComponent(term)}&page=${currentPage + 1}`,
                                )
                            }
                        >
                            下一页
                        </button>
                    </nav>
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
