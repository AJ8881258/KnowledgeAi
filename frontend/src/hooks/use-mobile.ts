import * as React from "react";

// shadcn 默认用 768px 作为移动端和桌面端的分界点，
// 和 Tailwind 的 md 断点一致：小于 768px 视为移动端。
const MOBILE_BREAKPOINT = 768;
const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function getIsMobileSnapshot() {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

function subscribeToMobileChange(onStoreChange: () => void) {
  const mql = window.matchMedia(MOBILE_MEDIA_QUERY);

  mql.addEventListener("change", onStoreChange);

  return () => mql.removeEventListener("change", onStoreChange);
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribeToMobileChange,
    getIsMobileSnapshot,
    getServerSnapshot,
  );
}
