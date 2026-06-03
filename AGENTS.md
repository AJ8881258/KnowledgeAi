# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

KnowFlow AI is an intelligent knowledge base Q&A platform (RAG-based). The project started as frontend-only with hardcoded mock data, but the backend is now under active development. Frontend work should progressively integrate real backend APIs through an axios-based HTTP stack. Do not assume mock data, missing APIs, or hardcoded authentication are final behavior. UI language is Chinese (Simplified) with English for navigation labels.

## Commands

```bash
cd .
docker compose up -d  # Start local PostgreSQL from the repository root

cd frontend
pnpm dev        # Start Vite dev server (host 0.0.0.0)
pnpm build      # TypeScript check + Vite production build (tsc -b && vite build)
pnpm lint       # ESLint
pnpm preview    # Preview production build

cd ../backend
.\mvnw.cmd spring-boot:run
.\mvnw.cmd test
```

Run Docker Compose commands only from the repository root; root `compose.yaml` manages the local PostgreSQL container only. Run frontend pnpm commands only from `frontend/`. Run backend Maven commands only from `backend/`. The repository root is a coordination workspace and intentionally does not contain a Node package. No frontend test runner is configured. Adding shadcn components: run `pnpm dlx shadcn@latest add <component>` from `frontend/`.

## Development And Verification Requirements

- Stage planning source of truth:
  - Keep `doc/` low-noise. The only core project documents are `doc/STAGE_PLAN.md`, `doc/PROJECT.md`, `doc/API.md`, `doc/FRONTEND_TASK.md`, and `doc/BACKEND_TASK.md`.
  - `doc/STAGE_PLAN.md` is the authoritative stage plan, current stage, next stage, and acceptance criteria.
  - `doc/PROJECT.md` is the project overview, tech stack, architecture summary, local commands, and current status.
  - `doc/API.md` is the API contract source of truth.
  - Before starting a stage, run a stage kickoff check: read `doc/STAGE_PLAN.md`, `doc/PROJECT.md`, `doc/API.md`, the relevant task file, check `git status`, and verify the previous stage is committed or intentionally left in progress.
  - After completing a stage, update `doc/STAGE_PLAN.md`, `doc/PROJECT.md`, `doc/API.md` when interfaces changed, and the relevant frontend/backend task files.
  - Frontend and backend implementation tasks use the stable task files `doc/FRONTEND_TASK.md` and `doc/BACKEND_TASK.md`. The documentation/planning coordinator updates these files for the current stage before implementation begins.
  - Documentation synchronization is handled by the documentation/planning coordinator. Frontend and backend implementation agents should follow the stable task files and should not independently rewrite stage planning unless the user explicitly asks.
  - Project development should prefer a team-orchestration workflow. One main conversation acts as the project manager/coordinator: it runs the stage kickoff check, reviews the plan, splits work into non-overlapping tasks, dispatches Codex background Thread/worktree jobs or `AGENT_TEAM` workers, reviews their output, integrates changes, runs final verification, and reports concise results.
  - The main conversation is the long-lived project manager/coordinator thread. User requirements should be discussed with the main conversation; it owns git operations, planning, dispatching Codex background Thread/worktree tasks, review, integration, final verification, thread cleanup, and concise reporting. The coordinator should not default to direct business-code implementation when a scoped worker thread can safely own the change.
  - When dispatching implementation, review, debugging, or documentation tasks to Codex Threads or `AGENT_TEAM`, use the same model family as the coordinator/main conversation when the platform exposes model choice, and set thinking/reasoning level to the highest available level, such as `xhigh` / 最高级, unless the user explicitly asks to reduce cost or reasoning depth. Do not hardcode a future or unavailable model name in worker prompts. Worker prompts must define role, objective, allowed scope, forbidden scope, required verification, expected handoff format, and the rule that they must not overwrite or revert others' work.
  - Coordinated frontend/backend development should not default to one long implementation conversation. For complex stages, multi-subsystem changes, or work likely to accumulate excessive WindowsContext in one conversation, split implementation into multiple Codex background threads/worktrees or `AGENT_TEAM` tasks with non-overlapping ownership, then integrate and verify the results in the coordinator thread. Do not default to writing long handoff prompts for the user to copy into separate frontend/backend conversations; create or coordinate the needed agents/threads yourself, integrate their work, and report concise progress/results to the user.
  - Any future change to project rules, collaboration rules, verification rules, frontend/backend workflow, or stage workflow must be synchronized into `AGENTS.md` immediately. If the rule affects planning, APIs, project status, or implementation tasks, also update the relevant core doc files in `doc/`; do not keep rule changes only in chat history.
- Backend development is in progress. When implementing frontend features, prefer real API integration over extending mock-only behavior when a backend endpoint or contract exists.
- Use axios for frontend-to-backend requests. Follow any existing axios client, API module, interceptor, error handling, and response typing patterns before adding new ones.
- Before implementing a new feature or changing an existing one, inspect the nearest existing implementation and shared project primitives first. At minimum, check `frontend/src/api/`, `frontend/src/store/`, related page components, and `doc/API.md` when the change involves server data, authentication, persisted state, or shared UI behavior.
- Do not introduce direct `fetch` calls for frontend API requests unless there is a specific technical reason that axios cannot satisfy. Use the shared `http` client from `frontend/src/api/http.ts`, add endpoint wrappers under `frontend/src/api/`, and keep request/response types next to those wrappers.
- Do not introduce ad hoc component-level `localStorage` access for feature state. For shared, cross-route, or persisted frontend state, use a Zustand store under `frontend/src/store/` with `persist` when persistence is required. Direct `localStorage` access should stay inside low-level adapters/helpers only, such as legacy mock-auth compatibility code.
- Treat existing mock data, hardcoded auth, direct `localStorage`, and local-only page state as legacy migration areas unless the task is explicitly to maintain that mock behavior. Do not copy those patterns into new backend-integrated features.
- 涉及模型供应商、Base URL、API Key、Authorization header 或其他敏感配置的功能时，后端必须按 `doc/API.md` 契约做加密保存、脱敏返回和错误脱敏；前端不得把 API Key 存入组件级 `localStorage`、不得明文回显已保存 Key，也不得在 toast、日志或错误详情中暴露密钥。
- Verify changes one by one against real behavior where possible: run the relevant command, inspect the actual route/component/API response, and confirm the specific behavior changed.
- Because of context window limits, final development acceptance is performed by a human. Agents should provide concise manual verification steps instead of trying to exhaustively re-check the whole application in context.
- Frontend verification may use `browser-use`, Browser, Chrome, Playwright, screenshots, or other browser-based tools when the user explicitly requests browser acceptance, or when the coordinator dispatches a dedicated verification/review thread. Keep implementation threads focused on code-level checks unless their assignment includes browser validation, and report browser steps/results concisely.
- Do not read, inspect, or analyze unrelated images/screenshots. For assigned UI/browser verification, screenshots and DOM/browser state may be used as evidence; prefer DOM text, network responses, logs, and browser state where sufficient.

## User Workflow Preferences

- 后端开发现在默认由 Agent 正常直接实现，可以修改后端业务代码、测试代码和必要配置，并运行相关验证命令；不再默认进入“后端学习/教学代码”模式。只有当用户明确说“后端不要直接修改”、“告诉我，我去做”、“不要编辑文件”或明确要求教学讲解时，除了 `doc/` 文档文件以外，其他文件才只给步骤、代码片段、文件路径和解释，不直接修改文件或运行命令。
- 如果用户把当前会话定义为“文档/规划/指挥/交接会话”，当前会话只能同步 `doc/` 核心文档、`AGENTS.md` 规则和前后端任务书，不得继续修改 `frontend/src/`、`backend/` 等业务代码。即使计划里包含前后端修复，也应写入 `doc/FRONTEND_TASK.md`、`doc/BACKEND_TASK.md`；后续需要实际开发时，推荐采用团队编排模式：主对话担任项目经理/协调者，负责审核计划、拆分任务、下发 Codex 后台 Thread/worktree 或 `AGENT_TEAM`、集成结果和最终验证。复杂阶段、多子系统任务或容易让单条对话积累过多 WindowsContext 的任务，优先拆分到多个 Codex 后台 Thread/worktree 或 `AGENT_TEAM` 子任务，并由协调者负责约束范围、集成、验证和汇总，不再默认要求用户把前端/后端提示复制到新会话。协调者下发 Thread 或 `AGENT_TEAM` 任务时，必须把 worker 思考/推理等级设为可用最高级（例如 `xhigh` / 最高级），除非用户明确要求降低成本或降低思考等级。
- 用户说“收尾”时，默认含义是：检查当前功能是否完成、同步开发文档、同步 `AGENTS.md` 项目规则、更新下一步路线、生成下一轮对话交接提示。不要默认继续开发新功能。
- `do.md` 是用户直接下发给 Agent 的本地任务清单，不属于项目文档，也不应进入 git 提交；当用户说“看 do.md 去修复/新增功能”时，先读取 `do.md` 并把其中内容当作当前任务输入。完成并验证清单内任务后，清空 `do.md` 内容，避免旧任务在后续阶段被重复执行。
- 用户说“实施计划”或明确要求实现时，才可以修改文件；但如果同一句或近期上下文出现“不要编辑文件/不要运行命令”，以后者为准。
- 后端 Agent 必须先阅读 `doc/BACKEND_TASK.md`，再按项目现有 Spring Boot/MyBatis/Flyway/Security 结构直接实现任务；不要只输出教学代码，除非用户明确要求只讲解或只给代码片段。
- 后端新增或修改功能代码时，必须写有价值的业务注释或 JavaDoc，说明“实现了什么功能、有哪些关键参数、参数含义是什么、与旧逻辑的区别是什么”。重点覆盖新增字段、DTO、接口方法、请求参数、响应字段、Service 分支、事务删除、配置读取、加密/脱敏、权限校验、状态流转、RAG 参数应用、异步任务和定时/统计逻辑；不要给 import、基础注解、getter/setter 写噪声注释。
- 后端代码注释要帮助用户快速理解改动，不追求逐行解释。公共 API、DTO、配置项和复杂私有 helper 优先使用简短 JavaDoc；方法内部只在业务分支、边界条件或安全处理不直观时加行内注释。
- 后端实现完成后默认运行相关后端验证命令，至少优先运行 `cd backend && .\mvnw.cmd test`；如果无法运行，要说明原因和可替代验证方式。
- 前端开发默认由协调者创建的前端 Agent 按 `doc/FRONTEND_TASK.md` 执行。前端项目位于 `frontend/`，前端源码路径统一写作 `frontend/src/`，前端验证命令必须先进入 `frontend/` 后运行。前端 UI 修改应遵守 shadcn/radix-sera、Lucide、现有 Tailwind 风格，并参考 `$ui-ux-pro-max` 的专业 UI 检查项。
- 当前端验收需要真实页面行为时，协调者可以下发专门的 Codex Thread/worktree、`AGENT_TEAM` 任务，或在本线程使用 `browser-use`、Browser、Chrome、Playwright、截图等浏览器工具做 UI/视觉验收；实现线程如果没有被明确分配浏览器验收任务，仍以 `cd frontend && pnpm build`、目标 ESLint、类型检查等代码级验证为主。
- 以后只要用户调整项目规则、协作规则、验收规则、前后端开发规则或阶段推进规则，必须立刻同步到 `AGENTS.md`；如果该规则影响阶段计划、接口、项目状态或任务书，还必须同步 `doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md`、`doc/FRONTEND_TASK.md`、`doc/BACKEND_TASK.md` 中相关文件，不能只停留在聊天记录里。
- 以后如果任务涉及 `/Settings` 页面里的“邮箱”、“模型配置”、“RAG 参数”、“删除账号/删除数据”等功能点，必须先提醒用户这些功能是否需要接入后端，并确认实现范围；不要默认把 Settings 里的展示项当成已生效功能，也不要静默新增假保存或 mock-only 设置。
- 后端或前端功能完成后，协调者负责整合 `AGENT_TEAM` 结果并只同步核心文档：`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md`、`doc/FRONTEND_TASK.md`、`doc/BACKEND_TASK.md`，必要时同步 `AGENTS.md`。

## Architecture

**Stack**: React 19 + TypeScript 6 + Vite 8 + Tailwind CSS v4 + React Router 7 + axios + Zustand + shadcn/radix-sera UI + Lucide icons + Sonner toasts.

**Package manager**: pnpm. **Path alias**: `@/*` -> `./src/*` inside `frontend/`.

The frontend package lives in `frontend/`; the alias is relative to that package, so `@/*` points to `frontend/src/*`.

### Routing (`frontend/src/main.tsx`)

All main routes are wrapped by `SliderLayout` (sidebar + header + `<Outlet/>`):

| Path | Component | Notes |
|---|---|---|
| `/` | DashboardPage | Stats, recent KBs, recent chats |
| `/KnowledgeBases` | KnowledgeBases | Card/list view with search |
| `/KnowledgeBases/:id` | KnowledgeBases | KB detail + chat view |
| `/Documents` | Documents | Document table with details panel |
| `/Documents/:id` | Documents | Filtered by KB |
| `/Chat` | Chat | 3-column RAG chat interface |
| `/Settings` | Settings | Sidebar navigation + sections |
| `/login` | LoginPage | Standalone, no layout wrapper |

Route-to-title mapping is defined in `headerMap` inside `slider-layout.tsx`.

### Key Directories

- `frontend/src/components/ui/` - shadcn-generated primitives (radix-sera style, cva variants, `data-slot` attributes). Generated with base color "taupe". Export both component and variants (e.g., `Button, buttonVariants`).
- `frontend/src/pages/` - Route-level page entry files. Keep these focused on route composition and page-level data flow rather than large inline UI implementations.
- `frontend/src/components/` - Shared layout components and extracted page components. Page-specific UI is grouped by feature, for example `frontend/src/components/documents/`, `frontend/src/components/knowledge-bases/`, `frontend/src/components/chat-page/`, `frontend/src/components/login/`, `frontend/src/components/settings/`, and `frontend/src/components/dashboard/`.
- `frontend/src/store/` - Zustand store is a placeholder (`bear` example). Most current state uses `useState` in page components.
- `frontend/src/assets/icon/` - Custom iconfont.cn font alongside Lucide React.

### Conventions

- **File naming**: `kebab-case.tsx` for UI/shared components, `PascalCase.tsx` for pages.
- **Exports**: Pages use `export default`; UI components use named exports.
- **Types**: Defined as `type` aliases (not interfaces). API request/response types should live next to their API wrapper under `frontend/src/api/`; component-only types can live near the component that owns them.
- **Styling**: Tailwind v4 via `@tailwindcss/vite` plugin (not PostCSS). CSS variables use oklch color space. Theme colors defined in `frontend/src/index.css`. Use `cn()` from `@/lib/utils` for className merging.
- **Icons**: Use Lucide React for standard icons. Custom iconfont icons available via the iconfont CSS class names.
- **Responsive**: `useIsMobile()` hook (768px breakpoint) in `frontend/src/hooks/use-mobile.ts`. Fluid typography uses `clamp()`.
- **Toasts**: Sonner `<Toaster />` mounted in `main.tsx`.

### Frontend Data And State Patterns

- **API calls**: Use `frontend/src/api/http.ts` and endpoint modules in `frontend/src/api/`. New frontend requests should be expressed as typed functions, for example `login()` in `frontend/src/api/auth.ts`, rather than calling HTTP clients directly from deeply nested UI handlers.
- **Axios errors**: Follow the existing axios error handling style (`isAxiosError` where needed) and surface user-facing errors through the established UI/toast patterns.
- **Zustand**: Use Zustand for state that is reused across components/routes, needs persistence, or represents a feature-level domain model. Keep purely local UI state, such as an open dialog flag or a transient input value, in component `useState`.
- **Persistence**: Prefer Zustand `persist` or a dedicated helper module over direct component-level `window.localStorage` calls. If legacy code already uses direct storage, avoid expanding that pattern while migrating new behavior.
- **Implementation checklist**: Before adding state or data fetching, search for an existing API wrapper, store, helper, or page-level pattern. If none exists, create the smallest shared abstraction in the appropriate directory instead of embedding new infrastructure inside a page component.
- **Page component structure**: Prefer extracting repeated or bulky UI from route pages into `frontend/src/components/<feature>/`. Route pages should coordinate data and compose components; feature components should own local presentation details.

### Backend

Backend development is now active. Project documentation is split under `doc/`; start with `doc/STAGE_PLAN.md`, `doc/PROJECT.md`, and use `doc/API.md` as the source of truth for current and planned API contracts.

Current auth status:

- Backend auth APIs implemented: login, register, reset password.
- Frontend Login page uses real backend APIs through `frontend/src/api/auth.ts`.
- Auth session is stored in `frontend/src/store/auth.ts`.
- Axios attaches `Authorization` in `frontend/src/api/http.ts`.
- `frontend/src/lib/mock-auth.ts` is now a compatibility layer; do not extend mock-only auth patterns.
