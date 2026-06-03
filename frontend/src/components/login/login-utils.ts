export function getRedirectPath(state: unknown) {
  if (typeof state !== "object" || state === null || !("from" in state)) {
    return "/";
  }

  const from = (state as { from?: unknown }).from;

  return typeof from === "string" && from.startsWith("/") ? from : "/";
}

export function getErrorResponseMessage(data: unknown) {
  if (typeof data === "string") {
    return data;
  }

  if (typeof data !== "object" || data === null) {
    return "";
  }

  const errorData = data as {
    detail?: unknown;
    error?: unknown;
    message?: unknown;
  };

  for (const value of [
    errorData.message,
    errorData.detail,
    errorData.error,
  ]) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return "";
}
