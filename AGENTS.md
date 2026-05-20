# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

KnowFlow AI is an intelligent knowledge base Q&A platform (RAG-based). The project started as frontend-only with hardcoded mock data, but the backend is now under active development. Frontend work should progressively integrate real backend APIs through an axios-based HTTP stack. Do not assume mock data, missing APIs, or hardcoded authentication are final behavior. UI language is Chinese (Simplified) with English for navigation labels.

## Commands

```bash
pnpm dev        # Start Vite dev server (host 0.0.0.0)
pnpm build      # TypeScript check + Vite production build (tsc -b && vite build)
pnpm lint       # ESLint
pnpm preview    # Preview production build
```

No test runner is configured. Adding shadcn components: `pnpm dlx shadcn@latest add <component>`.

## Development And Verification Requirements

- Stage planning source of truth:
  - Keep `doc/` low-noise. The only core project documents are `doc/STAGE_PLAN.md`, `doc/PROJECT.md`, `doc/API.md`, `doc/FRONTEND_TASK.md`, and `doc/BACKEND_TASK.md`.
  - `doc/STAGE_PLAN.md` is the authoritative stage plan, current stage, next stage, and acceptance criteria.
  - `doc/PROJECT.md` is the project overview, tech stack, architecture summary, local commands, and current status.
  - `doc/API.md` is the API contract source of truth.
  - Before starting a stage, run a stage kickoff check: read `doc/STAGE_PLAN.md`, `doc/PROJECT.md`, `doc/API.md`, the relevant task file, check `git status`, and verify the previous stage is committed or intentionally left in progress.
  - After completing a stage, update `doc/STAGE_PLAN.md`, `doc/PROJECT.md`, `doc/API.md` when interfaces changed, and the relevant frontend/backend task files.
  - Frontend and backend implementation tasks use the stable task files `doc/FRONTEND_TASK.md` and `doc/BACKEND_TASK.md`. The documentation/planning session updates these files for the current stage before implementation sessions begin.
  - Documentation synchronization is handled by the documentation/planning session. Frontend and backend implementation sessions should follow the stable task files and should not independently rewrite stage planning unless the user explicitly asks.
- Backend development is in progress. When implementing frontend features, prefer real API integration over extending mock-only behavior when a backend endpoint or contract exists.
- Use axios for frontend-to-backend requests. Follow any existing axios client, API module, interceptor, error handling, and response typing patterns before adding new ones.
- Before implementing a new feature or changing an existing one, inspect the nearest existing implementation and shared project primitives first. At minimum, check `src/api/`, `src/store/`, related page components, and `doc/API.md` when the change involves server data, authentication, persisted state, or shared UI behavior.
- Do not introduce direct `fetch` calls for frontend API requests unless there is a specific technical reason that axios cannot satisfy. Use the shared `http` client from `src/api/http.ts`, add endpoint wrappers under `src/api/`, and keep request/response types next to those wrappers.
- Do not introduce ad hoc component-level `localStorage` access for feature state. For shared, cross-route, or persisted frontend state, use a Zustand store under `src/store/` with `persist` when persistence is required. Direct `localStorage` access should stay inside low-level adapters/helpers only, such as legacy mock-auth compatibility code.
- Treat existing mock data, hardcoded auth, direct `localStorage`, and local-only page state as legacy migration areas unless the task is explicitly to maintain that mock behavior. Do not copy those patterns into new backend-integrated features.
- Verify changes one by one against real behavior where possible: run the relevant command, inspect the actual route/component/API response, and confirm the specific behavior changed.
- Because of context window limits, final development acceptance is performed by a human. Agents should provide concise manual verification steps instead of trying to exhaustively re-check the whole application in context.
- Frontend implementation sessions must not proactively use Chrome, Browser, Playwright, screenshots, or other browser-based visual acceptance tools unless the user explicitly asks for browser acceptance with tools such as `@chrome` or `@浏览器`. Run code-level checks such as `pnpm build`, targeted ESLint, and type checks when relevant; leave browser/UI acceptance to the user by default.
- Do not read, inspect, or analyze images/screenshots unless the user explicitly asks for image analysis. Prefer code, logs, terminal output, DOM text, network responses, and browser state for verification.

## User Workflow Preferences

- 用户是初学者，后端开发经常希望自己手动完成。遇到用户意图“后端不要直接修改”、“告诉我，我去做”、“不要编辑文件”时，除了/doc文档下文档文件意外，其他文件必须只给核心步骤、代码片段、文件路径和解释，不要直接修改文件或运行命令。
- 用户说“收尾”时，默认含义是：检查当前功能是否完成、同步开发文档、同步 `AGENTS.md` 项目规则、更新下一步路线、生成下一轮对话交接提示。不要默认继续开发新功能。
- 用户说“实施计划”或明确要求实现时，才可以修改文件；但如果同一句或近期上下文出现“不要编辑文件/不要运行命令”，以后者为准。
- 后端学习阶段不要过度教学；默认给实现顺序、文件清单、文件相对路径、除导入部分包以外的完整代码、关键注释和测试命令。关键注释应解释权限校验、状态流转、事务边界、切片/检索等关键逻辑，不要逐个解释基础注解、getter/setter 或 import。
- 后端开发默认由用户在单独后端会话中练习实现。除非用户在该会话明确要求，否则不要直接修改后端业务代码；只提供实现顺序、文件清单、文件相对路径、除导入部分包以外的完整代码、关键注释和测试命令。后端会话必须先阅读 `doc/BACKEND_TASK.md`。
- 前端开发默认由单独前端会话按 `doc/FRONTEND_TASK.md` 执行。前端 UI 修改应遵守 shadcn/radix-sera、Lucide、现有 Tailwind 风格，并参考 `$ui-ux-pro-max` 的专业 UI 检查项。
- 除非用户明确要求使用 `@chrome`、`@浏览器`、Playwright、截图或其他浏览器工具做验收，否则前端会话不要主动打开浏览器做 UI/视觉验收；默认只跑 `pnpm build`、目标 ESLint、类型检查等代码级验证，并把浏览器验收步骤交给用户。
- 后端或前端功能完成后，文档只同步核心文档：`doc/STAGE_PLAN.md`、`doc/PROJECT.md`、`doc/API.md`、`doc/FRONTEND_TASK.md`、`doc/BACKEND_TASK.md`，必要时同步 `AGENTS.md`。

## Architecture

**Stack**: React 19 + TypeScript 6 + Vite 8 + Tailwind CSS v4 + React Router 7 + axios + Zustand + shadcn/radix-sera UI + Lucide icons + Sonner toasts.

**Package manager**: pnpm. **Path alias**: `@/*` -> `./src/*`.

### Routing (`src/main.tsx`)

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

- `src/components/ui/` - shadcn-generated primitives (radix-sera style, cva variants, `data-slot` attributes). Generated with base color "taupe". Export both component and variants (e.g., `Button, buttonVariants`).
- `src/pages/` - Route-level page entry files. Keep these focused on route composition and page-level data flow rather than large inline UI implementations.
- `src/components/` - Shared layout components and extracted page components. Page-specific UI is grouped by feature, for example `src/components/documents/`, `src/components/knowledge-bases/`, `src/components/chat-page/`, `src/components/login/`, `src/components/settings/`, and `src/components/dashboard/`.
- `src/store/` - Zustand store is a placeholder (`bear` example). Most current state uses `useState` in page components.
- `src/assets/icon/` - Custom iconfont.cn font alongside Lucide React.

### Conventions

- **File naming**: `kebab-case.tsx` for UI/shared components, `PascalCase.tsx` for pages.
- **Exports**: Pages use `export default`; UI components use named exports.
- **Types**: Defined as `type` aliases (not interfaces). API request/response types should live next to their API wrapper under `src/api/`; component-only types can live near the component that owns them.
- **Styling**: Tailwind v4 via `@tailwindcss/vite` plugin (not PostCSS). CSS variables use oklch color space. Theme colors defined in `src/index.css`. Use `cn()` from `@/lib/utils` for className merging.
- **Icons**: Use Lucide React for standard icons. Custom iconfont icons available via the iconfont CSS class names.
- **Responsive**: `useIsMobile()` hook (768px breakpoint) in `src/hooks/use-mobile.ts`. Fluid typography uses `clamp()`.
- **Toasts**: Sonner `<Toaster />` mounted in `main.tsx`.

### Frontend Data And State Patterns

- **API calls**: Use `src/api/http.ts` and endpoint modules in `src/api/`. New frontend requests should be expressed as typed functions, for example `login()` in `src/api/auth.ts`, rather than calling HTTP clients directly from deeply nested UI handlers.
- **Axios errors**: Follow the existing axios error handling style (`isAxiosError` where needed) and surface user-facing errors through the established UI/toast patterns.
- **Zustand**: Use Zustand for state that is reused across components/routes, needs persistence, or represents a feature-level domain model. Keep purely local UI state, such as an open dialog flag or a transient input value, in component `useState`.
- **Persistence**: Prefer Zustand `persist` or a dedicated helper module over direct component-level `window.localStorage` calls. If legacy code already uses direct storage, avoid expanding that pattern while migrating new behavior.
- **Implementation checklist**: Before adding state or data fetching, search for an existing API wrapper, store, helper, or page-level pattern. If none exists, create the smallest shared abstraction in the appropriate directory instead of embedding new infrastructure inside a page component.
- **Page component structure**: Prefer extracting repeated or bulky UI from route pages into `src/components/<feature>/`. Route pages should coordinate data and compose components; feature components should own local presentation details.

### Backend

Backend development is now active. Project documentation is split under `doc/`; start with `doc/STAGE_PLAN.md`, `doc/PROJECT.md`, and use `doc/API.md` as the source of truth for current and planned API contracts.

Current auth status:

- Backend auth APIs implemented: login, register, reset password.
- Frontend Login page uses real backend APIs through `src/api/auth.ts`.
- Auth session is stored in `src/store/auth.ts`.
- Axios attaches `Authorization` in `src/api/http.ts`.
- `src/lib/mock-auth.ts` is now a compatibility layer; do not extend mock-only auth patterns.
