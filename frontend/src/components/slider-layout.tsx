// Sidebar
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/slider-sidebar";
import { useEffect } from "react";
import { isAxiosError } from "axios";
// Router
import { Outlet, useLocation } from "react-router";
import { Navigate } from "react-router";
// tool
import { getCurrentUser } from "@/api/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthStore } from "@/store/auth";

// components
import MainHeader from "@/components/MainHeader";

const headerMap: Record<string, HeaderConfig> = {
  "/": {
    title: "首页",
    description: "查看真实数据状态和核心演示流程",
  },
  "/KnowledgeBases": {
    title: "知识库",
    description: "管理你的知识库和数据源",
  },
  "/Documents": {
    title: "文档",
    description: "查看和管理上传的文档",
  },
  "/Jobs": {
    title: "任务中心",
    description: "查看、筛选和处理全局文档后台任务",
  },
  "/Chat": {
    title: "聊天",
    description: "正式知识库问答入口",
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
  const authSession = useAuthStore((state) => state.session);
  const syncCurrentUser = useAuthStore((state) => state.syncCurrentUser);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    if (!authSession?.accessToken) {
      return;
    }

    void getCurrentUser()
      .then(syncCurrentUser)
      .catch((error: unknown) => {
        if (isAxiosError(error) && error.response?.status === 401) {
          clearSession();
        }
      });
  }, [authSession?.accessToken, clearSession, syncCurrentUser]);

  if (!authSession) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const headerPath = location.pathname.startsWith("/KnowledgeBases")
    ? "/KnowledgeBases"
    : location.pathname.startsWith("/Chat")
      ? "/Chat"
      : location.pathname.startsWith("/Jobs")
        ? "/Jobs"
        : location.pathname.startsWith("/Settings")
          ? "/Settings"
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
