import type { CitationChip, ConversationItem, SourceItem, StatusMetric } from "./chat-types";

export const citations: CitationChip[] = [
  {
    label: "[1]",
    file: "javascript-event-loop.pdf",
    chunk: "#03",
  },
  {
    label: "[2]",
    file: "frontend-interview-notes.md",
    chunk: "#12",
  },
  {
    label: "[3]",
    file: "promise-guide.txt",
    chunk: "#07",
  },
];

export const initialConversations: ConversationItem[] = [
  {
    id: "abc",
    title: "事件循环是什么？",
    time: "10:21",
    updatedAt: "2026-05-07T10:21:00.000+08:00",
    sourceCount: 3,
    favorite: true,
    messages: [
      {
        id: "abc-user-1",
        role: "user",
        time: "10:21",
        content: "事件循环是什么？宏任务和微任务有什么区别？",
      },
      {
        id: "abc-assistant-1",
        role: "assistant",
        time: "10:21",
        content:
          "事件循环（Event Loop）是 JavaScript 在浏览器或 Node.js 环境中协调同步代码、异步任务和回调执行的核心机制。主线程先执行调用栈中的同步代码，随后清空微任务队列，再从宏任务队列中取出一个任务执行，并不断重复这个过程。\n\n微任务通常包括 Promise.then、queueMicrotask、MutationObserver 等，会在当前宏任务结束后立即执行。宏任务通常包括 setTimeout、setInterval、I/O、UI 渲染等，每次事件循环通常只取一个宏任务执行。\n\n常见误区是把 Promise 本身理解成微任务。真正进入微任务队列的是 then、catch、finally 注册的回调，而不是 Promise 构造函数里的同步代码。",
        citations,
      },
    ],
  },
  {
    id: "hooks-rules",
    title: "React Hooks 的规则",
    time: "昨天 22:15",
    updatedAt: "2026-05-06T22:15:00.000+08:00",
    sourceCount: 2,
    favorite: false,
    messages: [
      {
        id: "hooks-user-1",
        role: "user",
        time: "22:15",
        content: "React Hooks 为什么不能写在条件语句里？",
      },
      {
        id: "hooks-assistant-1",
        role: "assistant",
        time: "22:15",
        content:
          "Hooks 依赖稳定的调用顺序来关联每次渲染中的状态槽位。把 Hook 放进条件语句会导致不同渲染之间调用顺序不一致，React 无法可靠匹配 state、effect 等内部记录。",
        citations: citations.slice(0, 2),
      },
    ],
  },
  {
    id: "promise-async",
    title: "Promise 和 async/await",
    time: "昨天 16:40",
    updatedAt: "2026-05-06T16:40:00.000+08:00",
    sourceCount: 3,
    favorite: false,
    messages: [
      {
        id: "promise-user-1",
        role: "user",
        time: "16:40",
        content: "Promise 和 async/await 的关系是什么？",
      },
      {
        id: "promise-assistant-1",
        role: "assistant",
        time: "16:40",
        content:
          "async/await 是 Promise 的语法糖。async 函数总是返回 Promise，await 会暂停当前 async 函数的后续执行，等待 Promise settled 后再把后续逻辑放回微任务链路中继续执行。",
        citations: citations.slice(1),
      },
    ],
  },
  {
    id: "frontend-performance",
    title: "前端性能优化清单",
    time: "05-17 14:10",
    updatedAt: "2026-05-05T14:10:00.000+08:00",
    sourceCount: 4,
    favorite: false,
    messages: [
      {
        id: "perf-user-1",
        role: "user",
        time: "14:10",
        content: "整理一份前端性能优化面试清单。",
      },
    ],
  },
  {
    id: "react-rendering",
    title: "React 的渲染流程",
    time: "05-16 10:32",
    updatedAt: "2026-05-04T10:32:00.000+08:00",
    sourceCount: 3,
    favorite: true,
    messages: [
      {
        id: "render-user-1",
        role: "user",
        time: "10:32",
        content: "React 从 setState 到 DOM 更新发生了什么？",
      },
    ],
  },
  {
    id: "http-cache",
    title: "HTTP 缓存机制",
    time: "05-15 09:20",
    updatedAt: "2026-05-03T09:20:00.000+08:00",
    sourceCount: 2,
    favorite: false,
    messages: [
      {
        id: "cache-user-1",
        role: "user",
        time: "09:20",
        content: "强缓存和协商缓存怎么区分？",
      },
    ],
  },
];

export const sources: SourceItem[] = [
  {
    id: "event-loop-pdf-03",
    file: "javascript-event-loop.pdf",
    type: "pdf",
    chunk: "Chunk #03",
    page: "第 2 页",
    score: "0.92",
    excerpt:
      "事件循环（Event Loop）是 JavaScript 运行机制的核心。主线程负责执行同步代码，遇到异步任务时会将回调交给宿主环境，并在后续事件循环中调度执行。",
  },
  {
    id: "frontend-notes-12",
    file: "frontend-interview-notes.md",
    type: "md",
    chunk: "Chunk #12",
    page: "第 5 页",
    score: "0.88",
    excerpt:
      "宏任务包括 setTimeout、setInterval、I/O、UI 渲染等。微任务包括 Promise.then、MutationObserver、queueMicrotask 等，会在当前宏任务结束后优先清空。",
  },
  {
    id: "promise-guide-07",
    file: "promise-guide.txt",
    type: "txt",
    chunk: "Chunk #07",
    page: "第 3 页",
    score: "0.82",
    excerpt:
      "Promise 的 then/catch/finally 回调会被加入微任务队列。在当前宏任务执行完毕后，浏览器会优先清空微任务队列，再进入下一个宏任务。",
  },
];

export const statusMetrics: StatusMetric[] = [
  {
    label: "topK",
    value: "6",
  },
  {
    label: "相似度度量",
    value: "cosine",
  },
  {
    label: "Embedding",
    value: "text-embedding-3-small",
  },
];

export const fileTypeStyles: Record<SourceItem["type"], string> = {
  pdf: "bg-red-600 text-white",
  md: "bg-slate-900 text-white",
  txt: "bg-slate-700 text-white",
};
