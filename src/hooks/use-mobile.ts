import * as React from "react";

// shadcn 默认用 768px 作为移动端和桌面端的分界点，
// 和 Tailwind 的 md 断点一致：小于 768px 视为移动端。
const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // 初始值用 undefined，表示组件第一次渲染时还不知道屏幕宽度。
  // useEffect 会在浏览器端执行后再写入真正的 true/false。
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    // matchMedia 用来监听媒体查询变化。
    // 这里监听的是 max-width: 767px，也就是小于 md 断点的屏幕。
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    // 每次窗口跨过断点时，重新根据当前 window.innerWidth 更新状态。
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    mql.addEventListener("change", onChange);

    // 组件挂载后先主动判断一次，避免必须等到窗口尺寸变化才有值。
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    // 组件卸载时移除监听，避免重复监听或内存泄漏。
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // 把 undefined 转成 false，方便组件里直接用 if (isMobile) 判断。
  return !!isMobile;
}
