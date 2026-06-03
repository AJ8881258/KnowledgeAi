import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn 常用的 className 合并工具。
// clsx 负责按条件拼接 class，twMerge 负责合并冲突的 Tailwind 类。
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
