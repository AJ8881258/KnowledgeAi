# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

KnowFlow AI — an intelligent knowledge base Q&A platform (RAG-based). Currently **frontend-only** with all data hardcoded as mock data. No backend, no API layer, no real authentication (login uses hardcoded `admin`/`admin`). UI language is Chinese (Simplified) with English for navigation labels.

## Commands

```bash
pnpm dev        # Start Vite dev server (host 0.0.0.0)
pnpm build      # TypeScript check + Vite production build (tsc -b && vite build)
pnpm lint       # ESLint
pnpm preview    # Preview production build
```

No test runner is configured. Adding shadcn components: `pnpm dlx shadcn@latest add <component>`.

## Architecture

**Stack**: React 19 + TypeScript 6 + Vite 8 + Tailwind CSS v4 + React Router 7 + Zustand (placeholder) + shadcn/radix-sera UI + Lucide icons + Sonner toasts.

**Package manager**: pnpm. **Path alias**: `@/*` → `./src/*`.

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

- `src/components/ui/` — shadcn-generated primitives (radix-sera style, cva variants, `data-slot` attributes). Generated with base color "taupe". Export both component and variants (e.g., `Button, buttonVariants`).
- `src/pages/` — Each page is a **single large file** containing inline types, mock data arrays, helper functions, and sub-components. `KnowledgeBases.tsx` is 2100+ lines.
- `src/components/` — Shared layout components (`MainHeader`, `slider-layout`, `slider-sidebar`) using kebab-case filenames.
- `src/store/` — Zustand store is a placeholder (`bear` example). All real state uses `useState` in page components.
- `src/assets/icon/` — Custom iconfont.cn font alongside Lucide React.

### Conventions

- **File naming**: `kebab-case.tsx` for UI/shared components, `PascalCase.tsx` for pages.
- **Exports**: Pages use `export default`; UI components use named exports.
- **Types**: Defined as `type` aliases (not interfaces), placed at top of page files.
- **Styling**: Tailwind v4 via `@tailwindcss/vite` plugin (not PostCSS). CSS variables use oklch color space. Theme colors defined in `src/index.css`. Use `cn()` from `@/lib/utils` for className merging.
- **Icons**: Use Lucide React for standard icons. Custom iconfont icons available via the iconfont CSS class names.
- **Responsive**: `useIsMobile()` hook (768px breakpoint) in `src/hooks/use-mobile.ts`. Fluid typography uses `clamp()`.
- **Toasts**: Sonner `<Toaster />` mounted in `main.tsx`.

### Planned Backend (not yet implemented)

Documented in `plan/KnowFlow-AI-Project-Plan.md` (Chinese). Java Spring Boot microservices: auth, knowledge base, document processing, RAG, and chat services with PostgreSQL/pgvector.
