// Sidebar
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

// Avatar
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MyAvatar from "@/assets/mypic.jpg";

// Button
import { Button } from "@/components/ui/button";

// Card
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Progress
import { Progress } from "@/components/ui/progress";
// Field
import { Field, FieldLabel } from "@/components/ui/field";

const navList = [
  {
    icon: "iconfont icon-home",
    text: "Dashboard",
    isActivity: true,
  },
  {
    icon: "iconfont icon-category",
    text: "Knowledge Bases",
    isActivity: false,
  },
  {
    icon: "iconfont icon-file",
    text: "Documents",
    isActivity: false,
  },
  {
    icon: "iconfont icon-chat",
    text: "Chat",
    isActivity: false,
  },
  {
    icon: "iconfont icon-setting",
    text: "Settings",
    isActivity: false,
  },
];

export function AppSidebar() {
  // 状态管理
  const { state } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      {/* Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex min-h-16 items-center justify-center px-2 font-bold lg:min-h-20">
              <Avatar className="mr-0 size-[clamp(2.25rem,3vw,3rem)] shrink-0 cursor-pointer transition-all duration-200 hover:scale-120">
                <AvatarImage src={MyAvatar} />
                <AvatarFallback>Avatar</AvatarFallback>
              </Avatar>

              <span
                className={`selection:bg-sky-300 selection:text-white
                   ml-2 min-w-0 truncate whitespace-nowrap
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
                variant="ghost"
                className={`flex h-[clamp(2.25rem,3vw,2.75rem)] w-full min-w-0 justify-start gap-2 rounded-[5px] px-3 text-gray-600 hover:text-black group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 ${state === "expanded" ? "" : "p-0"}`}
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
      <SidebarFooter>
        <Card
          size="sm"
          className={`rounded-2xl selection:bg-sky-300 selection:text-white ${state === "expanded" ? "" : "hidden"}`}
        >
          <CardHeader>
            <CardTitle className="truncate text-[clamp(0.875rem,1.1vw,1.125rem)]">当前套餐</CardTitle>
            <CardDescription className="truncate text-[clamp(0.75rem,0.8vw,0.875rem)]">
              到期时间:2026-04-27
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field className="w-full max-w-sm">
              <FieldLabel htmlFor="progress-upload">
                <span className="truncate text-[clamp(0.75rem,1vw,0.875rem)]">使用情况</span>
                <span className="ml-auto shrink-0 text-[clamp(0.75rem,0.8vw,0.875rem)]">66%</span>
              </FieldLabel>
              <Progress value={66} id="progress-upload" />
            </Field>
          </CardContent>
        </Card>
        <Card
          className={`flex size-9 items-center justify-center rounded-full p-0 selection:bg-sky-300 selection:text-white ${state === "expanded" ? "hidden" : ""}`}
        >
          <span className="text-xs font-semibold leading-none">66</span>
        </Card>
      </SidebarFooter>
    </Sidebar>
  );
}
