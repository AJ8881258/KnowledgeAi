// ReactHooks
import { useState } from "react";

// Router
import { useNavigate } from "react-router";

// tools
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

// Button
import { Button } from "@/components/ui/button";
// Input
import { Input } from "@/components/ui/input";
// Popover
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
// Avatar
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MyAvatar from "@/assets/mypic.jpg";

// field
import { Field } from "@/components/ui/field";

// typescript
type MainHeaderProps = {
  title: string;
  desc: string;
};

const MainHeader = ({ title, desc }: MainHeaderProps) => {
  // state manager
  const [isUserPopoverOpen, setIsUserPopoverOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  return (
    <>
      <div className=" w-full h-18  border-b-2 border-gray-200 flex items-center  justify-between ">
        <div>
          <div className="text-[clamp(1.125rem,1.5vw,1.5rem)]">{title}</div>
          <div className="text-[clamp(0.575rem,.9vw,1.125rem)] text-gray-500">
            {desc}
          </div>
        </div>
        <div
          className={cn(
            "flex gap-5 text-[clamp(0.875rem,1.25vw,1.25rem)] items-center",
            isMobile && "gap-2",
          )}
        >
          <Field orientation="horizontal" className="flex justify-end">
            <Input
              type="search"
              placeholder="Search..."
              className={cn(
                "text-[clamp(0.875rem,1.25vw,1.25rem)] ",
                isMobile && "w-[70%]",
              )}
            />
            {!isMobile && (
              <Button
                variant="outline"
                size="icon-xs"
                aria-label="Submit"
                className=" rounded-3xl border-0"
              >
                <span className="iconfont text-gray-600 text-[clamp(1.25rem,1.5vw,1.5rem)] icon-search"></span>
              </Button>
            )}
          </Field>
          {!isMobile && (
            <div className="flex items-center cursor-pointer">
              <span className="iconfont icon-news-filling "></span>
            </div>
          )}
          {!isMobile && (
            <Popover
              open={isUserPopoverOpen}
              onOpenChange={setIsUserPopoverOpen}
            >
              <PopoverTrigger asChild>
                <div className="items-center flex">
                  <span>WuLong</span>
                  <span
                    className={cn(
                      "iconfont icon-arrow transform transition-transform duration-200 text-gray-600 text-[clamp(1.25rem,1.5vw,1.5rem)]",
                      isUserPopoverOpen ? "rotate-90" : "rotate-0",
                    )}
                  ></span>
                </div>
              </PopoverTrigger>
              <PopoverContent align="center" className="w-48 gap-2">
                <PopoverHeader>
                  <PopoverTitle>Title</PopoverTitle>
                  <PopoverDescription>Fast Via</PopoverDescription>
                </PopoverHeader>
                <Field className="gap-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/Profile")}
                  >
                    个人资料
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/Settings")}
                  >
                    账号设置
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/Models")}
                  >
                    模型与 API 设置
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/Documentation")}
                  >
                    使用文档
                  </Button>
                </Field>
              </PopoverContent>
            </Popover>
          )}
          {/* User*/}

          {/* avatar */}
          {!isMobile ? (
            <Avatar
              className="mr-0 size-[clamp(2.25rem,3vw,3rem)] shrink-0 cursor-pointer 
                transition-all duration-200 hover:scale-120 group-data-[collapsible=icon]:hidden"
            >
              <AvatarImage src={MyAvatar} />
              <AvatarFallback>Avatar</AvatarFallback>
            </Avatar>
          ) : (
            <Popover
              open={isUserPopoverOpen}
              onOpenChange={setIsUserPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Avatar
                  className="mr-0 size-[clamp(2.25rem,3vw,3rem)] shrink-0 cursor-pointer 
                transition-all duration-200 hover:scale-120 group-data-[collapsible=icon]:hidden"
                >
                  <AvatarImage src={MyAvatar} />
                  <AvatarFallback>Avatar</AvatarFallback>
                </Avatar>
              </PopoverTrigger>
              <PopoverContent align="center" className="w-48 gap-2">
                <PopoverHeader>
                  <PopoverTitle>Title</PopoverTitle>
                  <PopoverDescription>Fast Via</PopoverDescription>
                </PopoverHeader>
                <Field className="gap-0">
                  <Button variant="ghost" size="sm">
                    个人资料
                  </Button>
                  <Button variant="ghost" size="sm">
                    账号设置
                  </Button>
                  <Button variant="ghost" size="sm">
                    模型与 API 设置
                  </Button>
                  <Button variant="ghost" size="sm">
                    使用文档
                  </Button>
                </Field>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </>
  );
};

export default MainHeader;
