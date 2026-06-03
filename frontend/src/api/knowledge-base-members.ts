import { http } from "@/api/http";
import type { KnowledgeBaseAccessRole } from "@/api/knowledge-bases";

export type ManageableKnowledgeBaseRole = Exclude<
  KnowledgeBaseAccessRole,
  "OWNER"
>;

export type KnowledgeBaseMemberResponse = {
  id: number;
  userId: number;
  username: string;
  role: KnowledgeBaseAccessRole;
  createdAt: string;
  updatedAt: string;
};

export type AddKnowledgeBaseMemberRequest = {
  username: string;
  role: ManageableKnowledgeBaseRole;
};

export type UpdateKnowledgeBaseMemberRequest = {
  role: ManageableKnowledgeBaseRole;
};

export async function getKnowledgeBaseMembers(
  knowledgeBaseId: number | string,
) {
  const response = await http.get<KnowledgeBaseMemberResponse[]>(
    `/knowledge-bases/${knowledgeBaseId}/members`,
  );

  return response.data;
}

export async function addKnowledgeBaseMember(
  knowledgeBaseId: number | string,
  request: AddKnowledgeBaseMemberRequest,
) {
  const response = await http.post<KnowledgeBaseMemberResponse>(
    `/knowledge-bases/${knowledgeBaseId}/members`,
    request,
  );

  return response.data;
}

export async function updateKnowledgeBaseMember(
  knowledgeBaseId: number | string,
  memberId: number | string,
  request: UpdateKnowledgeBaseMemberRequest,
) {
  const response = await http.patch<KnowledgeBaseMemberResponse>(
    `/knowledge-bases/${knowledgeBaseId}/members/${memberId}`,
    request,
  );

  return response.data;
}

export async function deleteKnowledgeBaseMember(
  knowledgeBaseId: number | string,
  memberId: number | string,
) {
  await http.delete(`/knowledge-bases/${knowledgeBaseId}/members/${memberId}`);
}
