import { http } from "@/api/http";

export type KnowledgeBaseResponse = {
  id: number;
  name: string;
  description: string;
  status: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
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
