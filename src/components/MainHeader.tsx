// ReactHooks
import { useEffect, useState } from "react";

// Router
import { useNavigate } from "react-router";

// tools
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  clearMockAuthSession,
} from "@/lib/mock-auth";
import { useChatStatusStore } from "@/store/chat-status";
import { useAuthStore } from "@/store/auth";

// AlertDialog
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// Button
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// DropdownMenu
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// typescript
type MainHeaderProps = {
  title: string;
  desc: string;
};

const MainHeader = ({ title, desc }: MainHeaderProps) => {
  // state manager
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);
  const displayName = session?.displayName || session?.username || "User";
  const avatarUrl = session?.avatarUrl ?? null;
  const avatarFallback = (displayName || "U").slice(0, 1).toUpperCase();
  const unreadCount = useChatStatusStore((state) => state.unreadCount);
  const refreshUnreadCount = useChatStatusStore(
    (state) => state.refreshUnreadCount,
  );
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  const handleLogout = () => {
    clearMockAuthSession();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <div className="flex h-18 w-full items-center justify-between border-b-2 border-gray-200 pl-2">
        <div className="min-w-0">
          <div className="truncate text-[clamp(1.125rem,1.5vw,1.5rem)]">
            {title}
          </div>
          <div className="truncate text-[clamp(0.575rem,.9vw,1.125rem)] text-gray-500">
            {desc}
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-5 text-[clamp(0.875rem,1.25vw,1.25rem)]",
            isMobile && "gap-2",
          )}
        >
          {!isMobile && (
            <button
              type="button"
              className="relative flex size-9 cursor-pointer items-center justify-center rounded-[6px] text-slate-600 transition-colors hover:bg-slate-100"
              aria-label={`未读会话 ${unreadCount} 个`}
              onClick={() => navigate("/Chat")}
            >
              <span className="iconfont icon-news-filling text-[clamp(1rem,1.5vw,1.3rem)] transition-all duration-300 hover:-translate-y-0.5"></span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-4 text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          )}
          <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex min-w-0 items-center gap-2 px-2 text-[clamp(0.875rem,1.25vw,1.25rem)]"
              >
                <Avatar size="sm">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={`${displayName} 头像`} />
                  ) : null}
                  <AvatarFallback>{avatarFallback}</AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 items-center gap-1">
                  <span className="max-w-24 truncate">{displayName}</span>
                  <span className="shrink-0">Workspace</span>
                </span>
                <span
                  className={cn(
                    "iconfont icon-arrow text-[clamp(1.25rem,1.5vw,1.5rem)] text-gray-600 transition-transform duration-200",
                    userMenuOpen ? "rotate-90" : "rotate-0",
                  )}
                ></span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => navigate("/Settings")}>
                  个人资料
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(event) => {
                    event.preventDefault();
                    setUserMenuOpen(false);
                    setLogoutDialogOpen(true);
                  }}
                >
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent className="rounded-[8px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-sans text-lg normal-case tracking-normal">
              确认退出登录？
            </AlertDialogTitle>
            <AlertDialogDescription>
              确认后会清除当前登录状态，并返回登录页。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction type="button" onClick={handleLogout}>
              确认退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MainHeader;
