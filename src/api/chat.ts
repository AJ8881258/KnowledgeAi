import { http } from "@/api/http";

export type ChatSessionResponse = {
  id: number;
  knowledgeBaseId: number;
  title: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessageSourceResponse = {
  documentId: number;
  documentName: string;
  chunkId: number;
  chunkIndex: number;
  content: string;
  score: number;
};

export type ChatMessageResponse = {
  id: number;
  sessionId: number;
  role: "USER" | "ASSISTANT";
  content: string;
  sources: ChatMessageSourceResponse[];
  createdAt: string;
};

export type CreateChatSessionRequest = {
  title?: string;
};

export type UpdateChatSessionRequest = {
  title?: string;
  pinned?: boolean;
};

export type SendChatMessageRequest = {
  content: string;
  limit?: number;
};

export type SendChatMessageResponse = {
  message: ChatMessageResponse;
};

export async function createKnowledgeBaseChatSession(
  knowledgeBaseId: number | string,
  request: CreateChatSessionRequest,
) {
  const response = await http.post<ChatSessionResponse>(
    `/knowledge-bases/${knowledgeBaseId}/chat/sessions`,
    request,
  );

  return response.data;
}

export async function getKnowledgeBaseChatSessions(
  knowledgeBaseId: number | string,
) {
  const response = await http.get<ChatSessionResponse[]>(
    `/knowledge-bases/${knowledgeBaseId}/chat/sessions`,
  );

  return response.data;
}

export async function getChatSessionMessages(sessionId: number | string) {
  const response = await http.get<ChatMessageResponse[]>(
    `/chat/sessions/${sessionId}/messages`,
  );

  return response.data;
}

export async function updateChatSession(
  sessionId: number | string,
  request: UpdateChatSessionRequest,
) {
  const response = await http.patch<ChatSessionResponse>(
    `/chat/sessions/${sessionId}`,
    request,
  );

  return response.data;
}

export async function deleteChatSession(sessionId: number | string) {
  await http.delete(`/chat/sessions/${sessionId}`);
}

export async function sendChatSessionMessage(
  sessionId: number | string,
  request: SendChatMessageRequest,
) {
  const response = await http.post<SendChatMessageResponse>(
    `/chat/sessions/${sessionId}/messages`,
    request,
  );

  return response.data;
}
