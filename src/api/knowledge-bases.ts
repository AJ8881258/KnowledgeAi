import { http } from "@/api/http";

export type KnowledgeBaseResponse = {
  id: number;
  name: string;
  description: string;
  status: string;
  featured: boolean;
  themeId: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateKnowledgeBaseRequest = {
  name: string;
  description: string;
  featured: boolean;
  themeId: string;
};

export type UpdateKnowledgeBaseRequest = {
  name: string;
  description: string;
  featured: boolean;
  themeId: string;
};

export async function getKnowledgeBases() {
  const response = await http.get<KnowledgeBaseResponse[]>("/knowledge-bases");

  return response.data;
}

export async function getKnowledgeBase(id: number | string) {
  const response = await http.get<KnowledgeBaseResponse>(
    `/knowledge-bases/${id}`,
  );

  return response.data;
}

export async function createKnowledgeBase(
  request: CreateKnowledgeBaseRequest,
) {
  const response = await http.post<KnowledgeBaseResponse>(
    "/knowledge-bases",
    request,
  );

  return response.data;
}

export async function updateKnowledgeBase(
  id: number | string,
  request: UpdateKnowledgeBaseRequest,
) {
  const response = await http.patch<KnowledgeBaseResponse>(
    `/knowledge-bases/${id}`,
    request,
  );

  return response.data;
}

export async function deleteKnowledgeBase(id: number | string) {
  await http.delete(`/knowledge-bases/${id}`);
}
