# 购物网站演示

React + FastAPI + SQLite 的购物流程演示，包含商品浏览、搜索、详情、固定账号登录、购物车、地址、下单、演示支付和订单管理。

## 启动

后端：

```bash
cd backend
uv sync
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

首次启动自动创建 SQLite 数据库并写入用户提供的 P001 商品和三条评价。

前端：

```bash
cd frontend
pnpm install
NAPI_RS_FORCE_WASI=true pnpm run dev
```

访问 http://localhost:5173。点击顶部登录，再点击演示账号登录，无需密码。前端将 `/api` 请求代理到端口 8000。

## 验证

```bash
cd backend
uv run pytest -q
```

```bash
cd frontend
pnpm run lint
NAPI_RS_FORCE_WASI=true pnpm test
NAPI_RS_FORCE_WASI=true pnpm run build
```

当前机器运行 Rolldown 原生绑定会触发 SIGILL，因此使用官方 WASM 绑定；常规机器可尝试不设置该变量。

## 演示范围

当前种子数据只有用户提供的一个商品，因此首页最多显示一项；查询和布局支持每页 20 项及桌面五列。支付为演示操作；库存锁定记录请求并全部返回成功，未执行实际库存扣减。AI 助手暂不开放。数据库表定义见 `backend/app/models.py`。
