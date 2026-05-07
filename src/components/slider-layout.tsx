// Sidebar
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/slider-sidebar";
// Router
import { Outlet, useLocation } from "react-router";
// tool
import { useIsMobile } from "@/hooks/use-mobile";

// components
import MainHeader from "@/components/MainHeader";

const headerMap: Record<string, HeaderConfig> = {
  "/": {
    title: "首页",
    description: "管理资料、索引状态和最近访问等",
  },
  "/KnowledgeBases": {
    title: "知识库",
    description: "管理你的知识库和数据源",
  },
  "/Documents": {
    title: "文档",
    description: "查看和管理上传的文档",
  },
  "/Chat": {
    title: "聊天",
    description: "和知识库进行对话",
  },
  "/Settings": {
    title: "设置",
    description: "管理账号、模型和系统偏好",
  },
};

// typescript
type HeaderConfig = {
  title: string;
  description: string;
};

export default function Layout() {
  // state manager
  const isMobile = useIsMobile();
  const location = useLocation();
  const headerPath = location.pathname.startsWith("/KnowledgeBases")
    ? "/KnowledgeBases"
    : location.pathname.startsWith("/Chat")
      ? "/Chat"
      : location.pathname;
  const header = headerMap[headerPath] ?? {
    title: "页面",
    description: "管理你的页面",
  };
  return (
    <div>
      <SidebarProvider className="selection:bg-sky-300 selection:text-white  ">
        <AppSidebar />
        <main className="w-full m-1 pr-3  ">
          <MainHeader title={header.title} desc={header.description} />
          {isMobile && (
            <SidebarTrigger className="fixed right-4 bottom-4 z-40 border bg-background shadow-md" />
          )}
          <Outlet />
        </main>
      </SidebarProvider>
    </div>
  );
}
