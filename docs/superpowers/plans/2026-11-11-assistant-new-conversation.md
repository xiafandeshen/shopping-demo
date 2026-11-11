# AI 助手新开对话 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 支持创建新的助手会话并仅显示当前会话。

**Architecture:** 后端为会话增加可寻址 ID，新增创建接口，消息读写按 ID 进行并兼容旧客户端。前端保存当前会话 ID，标题栏确认后创建新会话并切换。

**Tech Stack:** FastAPI, SQLAlchemy, React, React Query, Vitest.

## Global Constraints

- 所有对话使用简体中文。
- 不删除历史会话、订单或购物车数据。
- 修改后运行项目已有验证命令。

### Task 1: 后端会话 API

**Files:** `backend/app/routers/assistant.py`, `backend/app/schemas.py`, `backend/tests/test_orders.py`

- 新增会话 ID 字段与创建会话响应模型。
- 新增 `POST /api/assistant/conversations` 创建空会话。
- `GET /conversation` 返回最新会话 ID；`POST /message` 接受可选 conversation_id，并将消息写入指定会话。
- 补充测试：创建两个会话后消息互不混淆，旧会话仍保留。

### Task 2: 前端会话切换

**Files:** `frontend/src/api/assistant.ts`, `frontend/src/components/AssistantChat.tsx`

- 增加创建会话 API。
- 保存当前 conversation_id，发送消息时传递该 ID。
- 标题栏增加“新开对话”按钮，确认后创建新会话并替换消息列表；失败时保留原状态。

### Task 3: 前端测试与格式化

**Files:** `frontend/src/components/AssistantChat.test.tsx`

- 覆盖确认取消不创建会话、确认后切换新会话、发送消息携带当前 ID。
- 使用 `pnpm exec prettier --write` 格式化修改文件并运行前端测试。
