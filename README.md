# 购物网站演示

React + FastAPI + SQLite 的购物流程演示，包含商品浏览、搜索、详情、固定账号登录、购物车、地址、下单、演示支付和订单管理。

## 启动

后端：需要安装python环境 和 uv

```bash
cd backend
uv sync
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

启动仅创建数据库表，不自动写入数据。首次使用请先执行下方初始化命令。

前端：

```bash
cd frontend
pnpm install
pnpm run dev
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
pnpm test
pnpm run build
```

## 演示范围

初始化数据包含 30 件商品和 54 条评价；查询和布局支持每页 20 项及桌面五列。支付为演示操作；库存锁定记录请求并全部返回成功，未执行实际库存扣减。AI 助手暂不开放。数据库表定义见 `backend/app/models.py`。

## 初始化数据

在项目根目录执行：

```bash
cd backend
uv run python scripts/init_data.py
```

每次运行都会清空 `backend/shopping.db` 中所有业务表的数据（包括用户、地址、购物车、订单和库存锁），再写入 30 件商品、54 条评价及 `demo` 演示账号。P008 库存按约定设为 `0`，其余商品及评价内容保留。清空与写入在同一事务内执行，失败自动回滚。建议停止后端服务后执行，初始化后需要重新登录。

可指定其他数据库（同样会清空目标数据库的业务数据）：

```bash
uv run python scripts/init_data.py --database-url sqlite:////tmp/shopping-demo.db
```
