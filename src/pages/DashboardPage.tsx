// Button
import { Button } from "@/components/ui/button";
// Card

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Combobox
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
// tool
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const DashpageList = [
  {
    title: "知识库",
    number: 4,
    icon: "icon-book",
    compareUp: "up",
    compare: "10%",
    bgColor: "bg-blue-100",
    textColor: "text-blue-600",
  },
  {
    title: "文档",
    number: 28,
    icon: "icon-file",
    compareUp: "up",
    compare: "12%",
    bgColor: "bg-green-100",
    textColor: "text-green-600",
  },
  {
    title: "文本片段",
    number: 124,
    icon: "icon-floor",
    compareUp: "up",
    compare: "27%",
    bgColor: "bg-indigo-100",
    textColor: "text-indigo-600",
  },
  {
    title: "本月问答",
    number: 86,
    icon: "icon-chat1",
    compareUp: "up",
    compare: "27%",
    bgColor: "bg-amber-100",
    textColor: "text-amber-600",
  },
];
const QuestionList = [
  "事件循环是什么？",
  "React 的diff原理是什么？",
  "如何优化首屏加載性能?",
  "常见的XSS攻击方式有哪些?",
];

const DashboardPage = () => {
  const isMobile = useIsMobile();
  const frameworks = ["Next.js", "SvelteKit", "Nuxt.js", "Remix", "Astro"];

  return (
    <>
      <div className="m-2 w-full">
        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-wrap">
          {DashpageList.map((item) => {
            return (
              <Card
                className={cn(
                  "w-full gap-3 p-0  sm:p-4 rounded-xl hover:translate-y-0.5 hover:shadow-lg transition-all duration-300",
                  isMobile ? "pt-4 pb-4" : "",
                )}
                key={item.title}
              >
                <CardContent
                  className={cn(
                    "flex flex-row gap-4 p-0 sm:p-2",
                    isMobile ? "pl-5" : "",
                  )}
                >
                  <span
                    className={cn(
                      "iconfont text-[clamp(1.5rem,1.5vw,2.25rem)] w-12 h-12 flex justify-center items-center p-2 rounded-lg",
                      item.icon,
                      item.bgColor,
                      item.textColor,
                    )}
                  ></span>
                  <div className="flex flex-col justify-center items-start">
                    <span className="text-[16px] ">{item.title}</span>
                    <span className="text-[clamp(1.25rem,1.3vw,1.7rem)] font-bold">
                      {item.number}
                    </span>
                  </div>
                </CardContent>
                <CardContent
                  className={cn("flex gap-3", isMobile ? "pl-5" : "")}
                >
                  <span className="text-gray-500 flex items-center justify-center">
                    较上月
                  </span>
                  <p
                    className={cn(
                      "text-[clamp(1rem,1vw,2rem)]",
                      item.compareUp === "up"
                        ? "text-green-600"
                        : "text-red-600",
                    )}
                  >
                    {item.compare}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Panel */}
        <div className="mt-3">
          <div className="flex gap-5">
            <div className="flex-7 flex gap-3 flex-col">
              <Card className="flex flex-col gap-3 rounded-xl p-3 xl:flex-row">
                <div className="flex flex-col gap-4  xl:border-r-2 border-gray-200 pb-3 xl:flex-4 border-0 xl:pr-6 xl:pb-0">
                  <div className="flex gap-4">
                    <div className="iconfont icon-chat  text-blue-500 bg-blue-100 p-1 rounded-xl text-4xl font-bold"></div>
                    <div className="flex justify-center items-center text-xl">
                      开始一次知识库问答
                    </div>
                  </div>
                  <div className="content">
                    <div className="text-xs text-gray-500">
                      选择知识库、提出你的问题，获取基于资料的准确回答
                    </div>
                    <Combobox
                      items={frameworks}
                      defaultValue={frameworks[0]}
                      autoHighlight
                    >
                      <ComboboxInput
                        placeholder="Select a framework"
                        showClear
                      />
                      <ComboboxContent>
                        <ComboboxEmpty>No items found.</ComboboxEmpty>
                        <ComboboxList>
                          {(item) => (
                            <ComboboxItem key={item} value={item}>
                              {item}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-3 xl:flex-6">
                  <div className="text-sm text-gray-500">试试这些问题</div>
                  <div className="flex min-w-0 flex-col gap-3 2xl:flex-row 2xl:items-end">
                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                      {QuestionList.map((item) => (
                        <Button
                          variant="outline"
                          className="min-w-0 justify-start overflow-hidden rounded-sm p-3 text-xs tracking-normal normal-case"
                          key={item}
                        >
                          <span className="block min-w-0 truncate">{item}</span>
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full hidden lg:block shrink-0 rounded-sm p-2 px-4 text-xs sm:w-fit 2xl:self-end"
                    >
                      进入问答
                    </Button>
                  </div>
                </div>
              </Card>
              <div className="w-full flex gap-3">
                <Card className="rounded-xl flex-1 ">
                  <CardHeader className="pl-3 pr-2">
                    <CardTitle>最近使用的知识库</CardTitle>
                    <CardAction>
                      <Button variant="outline" className="rounded-xl p-2">查看全部</Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent></CardContent>
                </Card>
                <Card className="rounded-xl flex-1">123</Card>
              </div>
            </div>
            <div className=" hidden lg:flex flex-3  gap-4 flex-col">
              <Card className="rounded-xl">123</Card>
              <Card className="rounded-xl">123</Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default DashboardPage;
