import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LogIn, LogOut, PackageSearch } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, login, logout } from "../api/session";
import { getErrorMessage } from "../api/client";
import { useSessionStore } from "../stores/session";

export function SiteHeader() {
  const queryClient = useQueryClient();
  const { user, setUser } = useSessionStore();
  const [loginOpen, setLoginOpen] = useState(false);
  const [error, setError] = useState("");
  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: getMe,
    retry: false,
    staleTime: 60_000,
    enabled: !user,
  });
  const currentUser = user ?? sessionQuery.data ?? null;
  useEffect(() => {
    const openLogin = () => setLoginOpen(true);
    window.addEventListener("open-login-dialog", openLogin);
    return () => window.removeEventListener("open-login-dialog", openLogin);
  }, []);

  async function handleLogin() {
    setError("");
    try {
      const loggedIn = await login();
      setUser(loggedIn);
      await queryClient.invalidateQueries();
      setLoginOpen(false);
    } catch (loginError) {
      setError(getErrorMessage(loginError));
    }
  }

  async function handleLogout() {
    try {
      await logout();
      setUser(null);
      queryClient.clear();
    } catch (logoutError) {
      setError(getErrorMessage(logoutError));
    }
  }

  return (
    <>
      <div className="border-b border-border bg-white">
        <div className="mx-auto flex min-h-12 max-w-7xl items-center justify-between gap-4 px-5 text-sm">
          <Link
            to="/"
            className="flex items-center gap-2 font-semibold text-primary"
          >
            <PackageSearch aria-hidden="true" />
            拾物商城
          </Link>
          {currentUser ? (
            <div className="flex flex-wrap items-center justify-end gap-4 text-muted-foreground">
              <span>欢迎您，{currentUser.display_name}</span>
              <Link className="hover:text-primary" to="/orders">
                我的订单
              </Link>
              <button
                className="inline-flex items-center gap-1 hover:text-primary"
                onClick={handleLogout}
              >
                <LogOut aria-hidden="true" />
                退出
              </button>
            </div>
          ) : (
            <button
              className="inline-flex items-center gap-2 text-primary"
              onClick={() => setLoginOpen(true)}
            >
              <LogIn aria-hidden="true" />
              登录
            </button>
          )}
        </div>
      </div>
      {loginOpen ? (
        <div
          className="overlay"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setLoginOpen(false)
          }
        >
          <section
            className="dialog-panel max-w-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
          >
            <button
              className="dialog-close"
              aria-label="关闭登录弹框"
              onClick={() => setLoginOpen(false)}
            >
              ×
            </button>
            <p className="eyebrow">WELCOME BACK</p>
            <h2 id="login-title" className="text-2xl font-semibold">
              登录拾物
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              使用固定演示账号进入商城。
            </p>
            {error ? (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <button
              className="primary-button mt-6 w-full"
              onClick={handleLogin}
            >
              演示账号登录
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
