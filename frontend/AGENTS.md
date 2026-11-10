# 项目规范

## 项目介绍

本项目是 购物商城的前端页面。

## 技术栈

- 前端框架：React 19 + TypeScript
- 构建工具：Vite 8
- UI 组件库：shadcn/ui（必须使用）
- 样式方案：Tailwind CSS 4 + cn() 工具函数
- 状态管理：Zustand 5
- 路由：React Router DOM 7
- HTTP 请求：axios + TanStack React Query 5
- 表单方案：react-hook-form + zod 4
- 包管理器：pnpm

## shadcn/ui 核心规则

1. **表单布局**：使用 `FieldGroup` + `Field`，禁止用 `div` + 手动间距
2. **输入组**：带图标的输入框使用 `InputGroup` + `InputGroupInput`
3. **间距**：使用 `gap-*`（如 `flex gap-4`），禁止 `space-y-*`
4. **颜色**：使用语义化类名（`bg-primary`、`text-muted-foreground`），禁止硬编码颜色
5. **按钮图标**：使用 `data-icon="inline-start"` 属性，不手动添加尺寸类
6. **相等尺寸**：使用 `size-*` 代替 `w-* h-*`（如 `size-10`）
7. **条件类名**：使用 `cn()` 函数，禁止手动拼接字符串
8. **验证状态**：表单字段用 `data-invalid` + `aria-invalid`

## 代码规范

- 使用函数组件 + Hooks，禁止类组件
- 所有异步请求必须包含 loading 和 error 状态
- 表单必须使用 react-hook-form + zod 校验
- API 请求放在 `/api/` 下
- 需要对组件写单元测试

## 常用命令

- `pnpm run dev` — 启动开发服务器（端口 5173）
- `pnpm run build` — 生产构建（tsc + vite build）
- `pnpm run lint` — ESLint 检查

## 相关页面

商城首页
搜索列表页
商品详情页
确认订单页
订单完成页

全局弹窗：登录弹窗、购物车弹窗、AI助手弹窗
