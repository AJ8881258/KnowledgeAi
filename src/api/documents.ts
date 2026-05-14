import { http } from "@/api/http";

export type DocumentStatus = "UPLOADED" | "PROCESSING" | "INDEXED" | "FAILED";

export type DocumentResponse = {
  id: number;
  knowledgeBaseId: number;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  status: DocumentStatus;
  errorMessage: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  chunkCount: number;
};

export type DocumentChunkResponse = {
  chunkIndex: number;
  content: string;
  charCount: number;
  createdAt: string;
};

export async function getKnowledgeBaseDocuments(
  knowledgeBaseId: number | string,
) {
  const response = await http.get<DocumentResponse[]>(
    `/knowledge-bases/${knowledgeBaseId}/documents`,
  );

  return response.data;
}

export async function uploadKnowledgeBaseDocument(
  knowledgeBaseId: number | string,
  file: File,
) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await http.post<DocumentResponse>(
    `/knowledge-bases/${knowledgeBaseId}/documents`,
    formData,
  );

  return response.data;
}

export async function getDocument(documentId: number | string) {
  const response = await http.get<DocumentResponse>(`/documents/${documentId}`);

  return response.data;
}

export async function getDocumentChunks(documentId: number | string) {
  const response = await http.get<DocumentChunkResponse[]>(
    `/documents/${documentId}/chunks`,
  );

  return response.data;
}

export async function deleteDocument(documentId: number | string) {
  await http.delete(`/documents/${documentId}`);
}
