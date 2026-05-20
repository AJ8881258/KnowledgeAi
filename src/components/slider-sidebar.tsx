import { useLocation, useNavigate } from "react-router";

// Sidebar
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

// Avatar
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MyAvatar from "@/assets/mypic.jpg";

// Button
import { Button } from "@/components/ui/button";

// Card
import { Card, CardContent } from "@/components/ui/card";

const navList = [
  {
    route: "/",
    icon: "iconfont icon-home",
    text: "Dashboard",
    isActivity: true,
  },
  {
    route: "/KnowledgeBases",
    icon: "iconfont icon-category",
    text: "Knowledge Bases",
    isActivity: false,
  },
  {
    route: "/Documents",
    icon: "iconfont icon-file",
    text: "Documents",
    isActivity: false,
  },
  {
    route: "/Chat",
    icon: "iconfont icon-chat",
    text: "Chat",
    isActivity: false,
  },
  {
    route: "/Settings",
    icon: "iconfont icon-setting",
    text: "Settings",
    isActivity: false,
  },
];

export function AppSidebar() {
  // 状态管理
  const { state, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const handleNavigate = (route: string) => {
    navigate(route);
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  const isNavActive = (route: string) =>
    route === "/"
      ? location.pathname === route
      : location.pathname === route || location.pathname.startsWith(`${route}/`);

  return (
    <Sidebar collapsible="icon">
      {/* Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex gap-2 flex-col itemcenters- justify-start  font-bold ">
              <div className="flex w-full h-full items-end justify-between">
                <Avatar
                  onClick={() => handleNavigate("/")}
                  className="mr-0 size-[clamp(2.25rem,3vw,3rem)] shrink-0 cursor-pointer 
                transition-all duration-200 hover:scale-120 group-data-[collapsible=icon]:hidden"
                >
                  <AvatarImage src={MyAvatar} />
                  <AvatarFallback>Avatar</AvatarFallback>
                </Avatar>
                <SidebarTrigger className="" />
              </div>
              <span
                className={`selection:bg-sky-300 selection:text-white
                    min-w-0 truncate whitespace-nowrap
                   text-[clamp(1.125rem,1.5vw,1.5rem)]
                   transition-all duration-200
                   group-data-[collapsible=icon]:hidden
                   `}
              >
                KnowFlow AI
              </span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      {/* Header */}

      <SidebarContent>
        {navList.map((item) => {
          return (
            <SidebarGroup key={item.text} className="px-2 py-1">
              <Button
                onClick={() => handleNavigate(item.route)}
                variant="ghost"
                className={`flex h-[clamp(2.25rem,3vw,2.75rem)] w-full min-w-0 justify-start 
                  gap-2 rounded-[5px] px-3 text-gray-600  
                  group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center
                  group-data-[collapsible=icon]:p-0 ${state === "expanded" ? "" : "p-0"}
                  ${isNavActive(item.route) ? "bg-sky-300 text-white hover:bg-sky-400 hover:text-white" : ""}
                  `}
              >
                <span
                  className={`shrink-0 text-[clamp(1rem,1.2vw,1.25rem)] ${item.icon}`}
                ></span>
                <span
                  className={`mr-2.5 min-w-0 truncate whitespace-nowrap text-[clamp(0.75rem,0.8vw,0.875rem)] ${state === "expanded" ? "" : "hidden"}`}
                >
                  {item.text}
                </span>
              </Button>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="">
        <Card
          size="sm"
          className={`rounded-[8px] border-slate-200 bg-slate-50 shadow-none ${state === "expanded" ? "" : "hidden"}`}
        >
          <CardContent className="p-3">
            <p className="text-xs font-medium text-slate-700">MVP 本地开发</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              数据来自当前后端接口
            </p>
          </CardContent>
        </Card>
        <Card
          className={`flex size-9 items-center justify-center rounded-full p-0 ${state === "expanded" ? "hidden" : ""}`}
        >
          <span className="text-[10px] font-semibold leading-none">MVP</span>
        </Card>
      </SidebarFooter>
    </Sidebar>
  );
}
