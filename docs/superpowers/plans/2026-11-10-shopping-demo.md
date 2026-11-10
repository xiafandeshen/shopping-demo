# 购物网站实施计划

> **面向执行者：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 子技能，按任务逐项实施。使用 `- [ ]` 格式跟踪步骤。

**目标：** 构建可运行的购物网站演示，覆盖商品发现、购物车、下单、支付和订单管理，并提供 FastAPI/SQLite 后端。

**架构：** 后端通过 `/api/` 接口管理商品、购物车、库存锁定、地址和订单。React 前端采用页面级路由和共享会话/购物车组件，React Query 管理服务端数据，Zustand 仅存放临时客户端状态。订单保存地址、商品及金额快照，避免历史订单随商品信息变化。

**技术栈：** React 19、TypeScript、Vite 8、shadcn/ui、Tailwind CSS 4、Zustand 5、React Router DOM 7、Axios、TanStack Query 5、React Hook Form、Zod 4、FastAPI、Python 3.11+、SQLAlchemy 2.0、SQLite、uv、pnpm。

## 全局约束

- 不读取或修改任何 `.env` 文件。
- 缩进使用四个空格；代码、标识符、命令及日志使用英文。
- Python 项目命令使用 `uv run`，前端项目命令使用 `pnpm`。
- 前端使用 shadcn/ui，并遵循项目表单、输入框、按钮、间距和语义化颜色规范。
- API 调用统一放在 `/api/` 下；所有异步界面操作都提供加载和错误状态。
- 表单使用 React Hook Form 与 Zod 校验；后端功能和前端组件均需有测试。
- 不实现真实注册、第三方支付、生产级认证、实际库存扣减或 AI 助手行为。

---

## 文件职责

### 后端

- `backend/pyproject.toml`、`backend/uv.lock`：FastAPI、SQLAlchemy、测试与代码检查依赖。
- `backend/app/main.py`：应用工厂、CORS/开发环境设置、路由注册、启动初始化。
- `backend/app/database.py`：SQLite 引擎、会话工厂、依赖注入和元数据初始化。
- `backend/app/models.py`：用户、商品、评价、地址、购物车、库存锁、订单和订单项模型。
- `backend/app/schemas.py`：Pydantic 请求/响应模型及枚举。
- `backend/app/seed.py`：幂等的 P001 商品和固定演示用户种子数据。
- `backend/app/dependencies.py`：当前演示用户依赖和数据库依赖。
- `backend/app/routers/products.py`：推荐列表、搜索及商品详情接口。
- `backend/app/routers/session.py`：固定账号登录、当前用户和退出接口。
- `backend/app/routers/addresses.py`：当前用户地址列表和新增接口。
- `backend/app/routers/cart.py`：购物车读取、添加/数量锁定、选择和移除接口。
- `backend/app/services/pricing.py`：商品小计、优惠、AI 折扣、运费和应付金额计算。
- `backend/app/routers/orders.py`：订单创建/列表/详情、状态操作和演示支付接口。
- `backend/tests/conftest.py`：隔离 SQLite 测试应用和客户端夹具。
- `backend/tests/test_products.py`、`test_session.py`、`test_cart.py`、`test_orders.py`：接口和金额规则测试。

### 前端

- `frontend/package.json`、`frontend/pnpm-lock.yaml`：应用脚本和依赖。
- `frontend/vite.config.ts`、`frontend/tsconfig*.json`、`frontend/components.json`：Vite、TypeScript 和 shadcn 配置。
- `frontend/src/main.tsx`、`frontend/src/App.tsx`：应用 Provider 和路由表。
- `frontend/src/api/client.ts`、`frontend/src/api/*.ts`：Axios 客户端和类型化 API 函数。
- `frontend/src/types.ts`：共享 API 领域类型。
- `frontend/src/stores/session.ts`：登录用户状态。
- `frontend/src/components/SiteHeader.tsx`：登录状态栏和页面链接。
- `frontend/src/components/LoginDialog.tsx`：固定演示账号登录弹框。
- `frontend/src/components/ProductCard.tsx`：可复用商品卡片和加购动画。
- `frontend/src/components/ProductGrid.tsx`：宽屏五列商品网格。
- `frontend/src/components/CartDialog.tsx`、`CartLauncher.tsx`：共享购物车弹框和固定入口。
- `frontend/src/components/AddressForm.tsx`：确认订单页复用的地址表单。
- `frontend/src/components/OrderActions.tsx`：共享订单状态操作控件。
- `frontend/src/pages/HomePage.tsx`：首页搜索横幅和推荐前 20 商品。
- `frontend/src/pages/SearchPage.tsx`：保留搜索词的分页结果页。
- `frontend/src/pages/ProductPage.tsx`：商品详情与评价。
- `frontend/src/pages/CheckoutPage.tsx`：地址选择、订单商品、金额明细和创建订单。
- `frontend/src/pages/PaymentPage.tsx`：待支付或已关闭订单状态及演示支付。
- `frontend/src/pages/OrdersPage.tsx`：订单列表和空状态。
- `frontend/src/pages/OrderDetailPage.tsx`：订单状态、地址、商品、金额和操作。
- `frontend/src/index.css`：Tailwind 导入和设计令牌。
- `frontend/src/components/ProductCard.test.tsx`、`frontend/src/pages/CheckoutPage.test.tsx`：重点组件/流程测试。

## 后端任务

### 任务 1：后端骨架与数据库测试夹具

**文件：** 创建上方列出的后端包配置、应用和数据库模块；添加 `backend/tests/conftest.py`。

- [ ] 使用 `uv` 添加 FastAPI、SQLAlchemy、Pydantic、pytest 和 HTTPX 依赖；配置测试、格式化和代码检查命令。
- [ ] 创建 `create_app(database_url: str | None = None)`，允许测试注入内存 SQLite 地址。
- [ ] 创建 SQLAlchemy 引擎和会话工具，启用 SQLite 外键，并提供 `get_db` 依赖。
- [ ] 添加测试，断言 `GET /health` 返回 `{"status":"ok"}`；从仓库根目录运行 `uv run pytest backend/tests -q`，并配置项目目录。
- [ ] 验证不同测试间的数据库状态互相隔离。

### 任务 2：模型、数据结构和种子数据

**文件：** `backend/app/models.py`、`schemas.py`、`seed.py` 及模型/种子数据测试。

- [ ] 定义 `User`、`Product`、`Review`、`Address`、`CartItem`、`InventoryLock`、`Order` 和 `OrderItem`，添加外键、索引、唯一约束以及数量/金额非负检查。
- [ ] 商品规格使用 JSON 存储；订单地址、商品和价格快照使用明确字段或 JSON 快照字段存储。
- [ ] 定义英文订单状态值：`pending_payment`、`paid_pending_shipment`、`shipped`、`received`、`completed`、`cancelled`、`expired`、`returning`、`returned`。
- [ ] 写入固定演示用户和 P001 种子数据：价格 1890、库存 35、毛利率 0.42、推荐分 82、用户提供的规格和三条评价；保证重复执行不产生重复记录。
- [ ] 测试重复初始化后仍只有一条 P001、一名演示用户和三条评价。

### 任务 3：商品发现与演示会话接口

**文件：** `backend/app/routers/products.py`、`session.py`、`dependencies.py`、`main.py`、`backend/tests/test_products.py`、`test_session.py`。

- [ ] 实现 `GET /api/products/recommended?limit=20`，按推荐分降序、商品 ID 升序稳定排序。
- [ ] 实现 `GET /api/products?q=<term>&page=1&page_size=20`，不区分大小写地匹配名称、品牌、类别和描述，并返回总数。
- [ ] 实现 `GET /api/products/{product_id}`，返回商品、规格和评价。
- [ ] 为固定演示用户实现 `POST /api/session/login`、`GET /api/session/me`、`POST /api/session/logout`；通过 HTTP-only Cookie 保存简单演示会话令牌，并保护需登录接口。
- [ ] 测试排序、分页边界、无结果、详情 404、登录、当前用户、退出及未授权访问。

### 任务 4：地址、购物车与库存锁定接口

**文件：** `backend/app/routers/addresses.py`、`cart.py`、`dependencies.py`、`schemas.py`、`backend/tests/test_cart.py`。

- [ ] 实现登录用户的地址列表和新增接口；校验收件人、电话、地区、详细地址必填；设置默认地址时清除该用户其他默认标记。
- [ ] 实现购物车读取、添加和数量变更接口；创建或更新用户购物车项，并记录带过期时间的有效库存锁。
- [ ] 演示阶段接受全部锁定请求；保留结构化 `409 inventory_insufficient` 响应，供未来库存不足分支使用。
- [ ] 实现购物车项选择和移除；返回商品摘要、数量、选中状态和行金额。
- [ ] 测试空购物车、添加、增量、选择、移除、库存锁记录和所有权校验。

### 任务 5：金额计算和订单生命周期接口

**文件：** `backend/app/services/pricing.py`、`backend/app/routers/orders.py`、`backend/tests/test_orders.py`。

- [ ] 实现纯函数 `calculate_totals(items, source)`，使用整数货币计算：商品总额；总额大于等于 1000 时减 100 一次；来源为 `ai` 时对减免后的金额再打 95 折；总额达到 999 时免运费，否则运费 100；应付金额为折后金额加运费。
- [ ] 实现订单创建：仅从选中的购物车项和当前用户地址创建，保存快照，移除已转订单的购物车项，并返回订单 ID 和金额。
- [ ] 实现登录用户的订单列表/详情及状态操作：待付款 -> 已取消；已付款待发货 -> 已取消；已发货 -> 退货中或已收货；退货中 -> 已发货；已收货 -> 已完成。
- [ ] 仅允许待付款订单演示支付，支付后转为已付款待发货；重复支付和非法状态迁移返回 409。
- [ ] 测试 999/1000 金额边界、AI 折扣顺序、运费、订单快照、所有权、允许的状态迁移、非法迁移和重复支付。

## 前端任务

### 任务 6：前端骨架、设计令牌、API 客户端和路由

**文件：** 文件职责列表中的前端配置和应用入口文件。

- [ ] 使用 `pnpm` 添加 React 19、Vite 8、TypeScript、shadcn/ui、Tailwind 4、Zustand、Router 7、Axios、TanStack Query 5、RHF、Zod、Vitest 和 Testing Library 依赖。
- [ ] 配置 Vite 将 `/api` 代理到本地 FastAPI 服务，并配置 dev、build、lint、test 脚本。
- [ ] 配置 Tailwind v4 和 shadcn 组件工具；使用语义令牌定义克制的电商配色和系统无衬线字体。
- [ ] 创建带 Cookie 凭证和类型化错误提取的 `api/client.ts`；配置 QueryClient。
- [ ] 添加路由：`/`、`/search`、`/products/:id`、`/checkout`、`/payment/:id`、`/orders`、`/orders/:id`，并添加未找到页面。
- [ ] 在添加页面行为前运行 `pnpm run build` 和 `pnpm run lint`。

### 任务 7：共享登录栏和商品浏览

**文件：** `types.ts`、`api/products.ts`、`api/session.ts`、`stores/session.ts`、`SiteHeader.tsx`、`LoginDialog.tsx`、`ProductCard.tsx`、`ProductGrid.tsx`、`HomePage.tsx`、`SearchPage.tsx`、`ProductPage.tsx`。

- [ ] 定义商品、评价和会话响应类型，以及推荐、搜索、详情查询逻辑。
- [ ] 实现登录状态栏和固定演示账号弹框；支持退出登录，并将“我的订单”导航至 `/orders`。
- [ ] 实现可复用商品卡片，包含图片占位回退、名称/描述/价格、售罄状态、详情链接和加购动画触发。
- [ ] 实现响应式网格：宽屏桌面五列，平板和手机减少列数。
- [ ] 实现首页搜索横幅与前 20 推荐商品；搜索词去空格后非空时跳转 `/search?q=`。
- [ ] 实现保留查询词的搜索结果页，每页 20 项，并处理加载、错误和空状态。
- [ ] 实现详情页规格和评价展示；商品不存在时显示可恢复的未找到状态。
- [ ] 添加组件测试，覆盖售罄展示、详情导航和搜索提交。

### 任务 8：共享购物车和地址流程

**文件：** `api/cart.ts`、`api/addresses.ts`、`CartDialog.tsx`、`CartLauncher.tsx`、`AddressForm.tsx` 及商品卡片集成。

- [ ] 实现类型化购物车/地址 API 函数，并在变更后刷新相关查询缓存。
- [ ] 实现共享购物车弹框，包含空状态、选中框、数量控件、移除操作、商品小计；未选商品时禁用结算按钮。
- [ ] 实现右下角固定购物车入口和商品数量，提供无障碍标签；挂载到首页、搜索和商品详情页。
- [ ] 将加购及数量变更连接至库存锁定接口；展示请求中状态和可重试的行内错误。
- [ ] 实现带可见标签、RHF/Zod 校验、加载和服务端错误状态的地址表单。
- [ ] 测试购物车空/选中/未选状态和地址校验。

### 任务 9：确认订单、支付和订单管理

**文件：** `api/orders.ts`、`CheckoutPage.tsx`、`PaymentPage.tsx`、`OrdersPage.tsx`、`OrderDetailPage.tsx`、`OrderActions.tsx`。

- [ ] 添加类型化订单 API 调用，并将英文状态/来源映射为中文标签。
- [ ] 实现确认订单页：地址选择、新增地址弹框、选中购物车商品、金额明细、加载/错误状态和创建订单操作。
- [ ] 除明确传入 `source=ai` 外，来源默认为 `normal`；优惠和运费逐项展示。
- [ ] 实现支付页，仅允许待付款订单支付；支付完成后导航到订单详情；关闭状态显示提示并在 3 秒后返回首页。
- [ ] 实现订单列表的空/加载/错误状态，展示日期、缩略图、应付金额、状态和状态对应操作。
- [ ] 实现共享 `OrderActions` 状态规则和订单详情页，展示地址/商品/金额快照；操作后刷新列表和详情查询。
- [ ] 测试确认订单金额展示，以及待付款、已发货、退货中、已完成等状态的按钮可见性。

## 集成与验证

### 任务 10：本地端到端冒烟测试与最终检查

- [ ] 在 `backend/` 下运行后端测试：`uv run pytest`。
- [ ] 在 `frontend/` 下运行前端测试、代码检查和生产构建：`pnpm test`、`pnpm run lint`、`pnpm run build`。
- [ ] 启动前后端开发服务器，在浏览器验证首页、搜索、详情、登录、购物车增删、确认订单、演示支付、订单操作和空状态。
- [ ] 确认 API 错误能在界面中恢复，页面不依赖不可用的外部资源。
- [ ] 在 `README.md` 中记录准确启动命令和已知限制。
