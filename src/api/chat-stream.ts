import {
  type ChatMessageResponse,
  type ChatMessageSourceResponse,
  type ChatSessionResponse,
  type SendChatMessageRequest,
} from "@/api/chat";
import { useAuthStore } from "@/store/auth";

export type ChatStreamEventType =
  | "session"
  | "user_message"
  | "assistant_message"
  | "delta"
  | "sources"
  | "done"
  | "error";

export type ChatStreamDeltaPayload = {
  id?: number;
  messageId?: number;
  sessionId?: number;
  delta?: string;
  content?: string;
  createdAt?: string;
};

export type ChatStreamSourcesPayload = {
  messageId?: number;
  assistantMessageId?: number;
  sources?: ChatMessageSourceResponse[];
};

export type ChatStreamDonePayload = {
  session?: ChatSessionResponse;
  message?: ChatMessageResponse;
  assistantMessage?: ChatMessageResponse;
};

export type ChatStreamErrorPayload = {
  message?: string;
};

export type ChatStreamPayloadMap = {
  session: ChatSessionResponse;
  user_message: ChatMessageResponse;
  assistant_message: ChatMessageResponse;
  delta: ChatStreamDeltaPayload;
  sources: ChatStreamSourcesPayload | ChatMessageSourceResponse[];
  done: ChatStreamDonePayload | null;
  error: ChatStreamErrorPayload | string;
};

export type ChatStreamEvent =
  | { type: "session"; data: ChatStreamPayloadMap["session"] }
  | { type: "user_message"; data: ChatStreamPayloadMap["user_message"] }
  | {
      type: "assistant_message";
      data: ChatStreamPayloadMap["assistant_message"];
    }
  | { type: "delta"; data: ChatStreamPayloadMap["delta"] }
  | { type: "sources"; data: ChatStreamPayloadMap["sources"] }
  | { type: "done"; data: ChatStreamPayloadMap["done"] }
  | { type: "error"; data: ChatStreamPayloadMap["error"] };

type StreamCallbacks = {
  onEvent: (event: ChatStreamEvent) => void;
};

type RawSseEvent = {
  event: string;
  data: string;
};

const CHAT_STREAM_EVENT_TYPES = new Set<ChatStreamEventType>([
  "session",
  "user_message",
  "assistant_message",
  "delta",
  "sources",
  "done",
  "error",
]);

function getAuthHeader() {
  const session = useAuthStore.getState().session;

  if (!session?.accessToken) {
    return "";
  }

  return `${session.tokenType || "Bearer"} ${session.accessToken}`;
}

function parseSsePayload(data: string) {
  const trimmedData = data.trim();

  if (!trimmedData || trimmedData === "[DONE]") {
    return null;
  }

  try {
    return JSON.parse(trimmedData) as unknown;
  } catch {
    return trimmedData;
  }
}

function emitSseEvent(
  rawEvent: RawSseEvent,
  callbacks: StreamCallbacks,
) {
  const normalizedType = rawEvent.event.trim() || "message";

  if (!CHAT_STREAM_EVENT_TYPES.has(normalizedType as ChatStreamEventType)) {
    return;
  }

  callbacks.onEvent({
    type: normalizedType as ChatStreamEventType,
    data: parseSsePayload(rawEvent.data),
  } as ChatStreamEvent);
}

function parseSseChunk(
  chunk: string,
  pendingEvent: RawSseEvent,
  callbacks: StreamCallbacks,
) {
  for (const line of chunk.split(/\r?\n/)) {
    if (!line) {
      if (pendingEvent.event || pendingEvent.data) {
        emitSseEvent(pendingEvent, callbacks);
        pendingEvent.event = "";
        pendingEvent.data = "";
      }
      continue;
    }

    if (line.startsWith(":")) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
    const value =
      separatorIndex === -1
        ? ""
        : line.slice(separatorIndex + 1).replace(/^ /, "");

    if (field === "event") {
      pendingEvent.event = value;
    } else if (field === "data") {
      pendingEvent.data = pendingEvent.data
        ? `${pendingEvent.data}\n${value}`
        : value;
    }
  }
}

function getResponseErrorMessage(response: Response) {
  return `流式问答请求失败：HTTP ${response.status}`;
}

export async function streamChatSessionMessage(
  sessionId: number | string,
  request: SendChatMessageRequest,
  callbacks: StreamCallbacks,
  options: { signal?: AbortSignal } = {},
) {
  const authHeader = getAuthHeader();
  const response = await fetch(`/api/chat/sessions/${sessionId}/messages/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(request),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(getResponseErrorMessage(response));
  }

  if (!response.body) {
    throw new Error("浏览器没有返回可读取的流式响应。");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const pendingEvent: RawSseEvent = { event: "", data: "" };
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        parseSseChunk(`${part}\n`, pendingEvent, callbacks);
      }
    }

    buffer += decoder.decode();
    if (buffer) {
      parseSseChunk(`${buffer}\n`, pendingEvent, callbacks);
    }
    if (pendingEvent.event || pendingEvent.data) {
      emitSseEvent(pendingEvent, callbacks);
    }
  } finally {
    reader.releaseLock();
  }
}
