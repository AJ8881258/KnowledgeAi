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
// Progress
import { Progress } from "@/components/ui/progress";
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
const recentKnowledgeBases = [
  {
    name: "前端面试资料库",
    desc: "React、浏览器、工程化",
    docs: 12,
    updatedAt: "今天 14:20",
    icon: "icon-book",
    bgColor: "bg-blue-100",
    textColor: "text-blue-600",
  },
  {
    name: "项目 README 知识库",
    desc: "项目文档与技术方案",
    docs: 6,
    updatedAt: "昨天 21:10",
    icon: "icon-file",
    bgColor: "bg-indigo-100",
    textColor: "text-indigo-600",
  },
  {
    name: "Java 后端学习库",
    desc: "Spring Boot、MyBatis",
    docs: 10,
    updatedAt: "4 月 28 日",
    icon: "icon-category",
    bgColor: "bg-green-100",
    textColor: "text-green-600",
  },
];
const recentDocuments = [
  {
    name: "React 性能优化.md",
    kb: "前端面试资料库",
    status: "ready",
  },
  {
    name: "Spring Boot 登录流程.txt",
    kb: "Java 后端学习库",
    status: "processing",
  },
  {
    name: "RAG 项目计划.md",
    kb: "项目 README 知识库",
    status: "ready",
  },
];
const recentChats = [
  {
    title: "React diff 原理是什么？",
    kb: "前端面试资料库",
    time: "10 分钟前",
  },
  {
    title: "JWT 和 Session 有什么区别？",
    kb: "Java 后端学习库",
    time: "今天 11:30",
  },
  {
    title: "RAG 如何减少幻觉？",
    kb: "项目 README 知识库",
    time: "昨天",
  },
];
const indexTasks = [
  {
    name: "React 性能优化.md",
    status: "ready",
    progress: 100,
  },
  {
    name: "Spring Boot 登录流程.txt",
    status: "processing",
    progress: 68,
  },
  {
    name: "RAG 项目计划.md",
    status: "ready",
    progress: 100,
  },
];

const DashboardPage = () => {
  const isMobile = useIsMobile();
  const knowledgeBaseNames = recentKnowledgeBases.map((item) => item.name);

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
          <div className="flex flex-col gap-5 lg:flex-row">
            <div className="flex-7 flex min-w-0 flex-col gap-3">
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
                      items={knowledgeBaseNames}
                      defaultValue={knowledgeBaseNames[0]}
                      autoHighlight
                    >
                      <ComboboxInput
                        placeholder="选择知识库"
                        showClear
                      />
                      <ComboboxContent>
                        <ComboboxEmpty>没有找到知识库</ComboboxEmpty>
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
              <div className="flex w-full flex-col gap-3 xl:flex-row">
                <Card className="flex-1 gap-5 rounded-xl p-0 py-5">
                  <CardHeader className="px-5">
                    <CardTitle>最近使用的知识库</CardTitle>
                    <CardAction>
                      <Button variant="outline" className="rounded-xl p-2">
                        查看全部
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 px-5">
                    {recentKnowledgeBases.map((item) => (
                      <div
                        key={item.name}
                        className="flex min-w-0 cursor-pointer items-center gap-3 rounded-lg border border-gray-100 p-4 hover:bg-gray-50"
                      >
                        <span
                          className={cn(
                            "iconfont flex size-10 shrink-0 items-center justify-center rounded-lg",
                            item.icon,
                            item.bgColor,
                            item.textColor,
                          )}
                        ></span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">
                            {item.name}
                          </div>
                          <div className="truncate text-xs text-gray-500">
                            {item.desc}
                          </div>
                        </div>
                        <div className="shrink-0 text-right text-xs text-gray-500">
                          <div>{item.docs} 篇</div>
                          <div>{item.updatedAt}</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="flex-1 gap-5 rounded-xl p-0 py-5">
                  <CardHeader className="px-5">
                    <CardTitle>最近上传文档</CardTitle>
                    <CardAction>
                      <Button variant="outline" className="rounded-xl p-2">
                        上传文档
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 px-5">
                    {recentDocuments.map((item) => (
                      <div
                        key={item.name}
                        className="flex min-w-0 cursor-pointer items-center gap-3 rounded-lg border border-gray-100 p-4 hover:bg-gray-50"
                      >
                        <span className="iconfont icon-file flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"></span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">
                            {item.name}
                          </div>
                          <div className="truncate text-xs text-gray-500">
                            {item.kb}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-1 text-xs",
                            item.status === "ready"
                              ? "bg-green-100 text-green-600"
                              : "bg-amber-100 text-amber-600",
                          )}
                        >
                          {item.status === "ready" ? "已完成" : "处理中"}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="flex-3 flex flex-col gap-4">
              <Card className="gap-4 rounded-xl p-0 py-5">
                <CardHeader className="px-5">
                  <CardTitle>最近会话</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 px-5">
                  {recentChats.map((item) => (
                    <div
                      key={item.title}
                      className="flex min-w-0 cursor-pointer flex-col gap-1 rounded-lg border border-gray-100 p-4 hover:bg-gray-50"
                    >
                      <div className="truncate text-sm font-semibold">
                        {item.title}
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
                        <span className="min-w-0 truncate">{item.kb}</span>
                        <span className="shrink-0">{item.time}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="gap-4 rounded-xl p-0 py-5">
                <CardHeader className="px-5">
                  <CardTitle>索引状态</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 px-5">
                  {indexTasks.map((item) => (
                    <div
                      key={item.name}
                      className="flex cursor-pointer flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 truncate text-sm font-semibold">
                          {item.name}
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-xs",
                            item.status === "ready"
                              ? "text-green-600"
                              : "text-amber-600",
                          )}
                        >
                          {item.status === "ready" ? "ready" : "processing"}
                        </span>
                      </div>
                      <Progress value={item.progress} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default DashboardPage;
