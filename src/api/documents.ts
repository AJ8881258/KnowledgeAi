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
  charCount?: number;
  averageChunkLength?: number;
  minChunkLength?: number;
  maxChunkLength?: number;
  qualityWarnings?: string[];
  summary?: string | null;
  summaryUpdatedAt?: string | null;
};

export type DocumentChunkResponse = {
  chunkIndex: number;
  content: string;
  charCount: number;
  createdAt: string;
};

export type SearchDocumentsRequest = {
  query: string;
  limit?: number;
};

export type SearchResultResponse = {
  chunkId: number;
  documentId: number;
  documentName: string;
  chunkIndex: number;
  content: string;
  score: number;
};

export type SearchDocumentsResponse = {
  query: string;
  results: SearchResultResponse[];
};

export type DocumentQualityResponse = {
  documentId: number;
  status: DocumentStatus;
  chunkCount: number;
  charCount: number;
  averageChunkLength: number;
  minChunkLength?: number;
  maxChunkLength?: number;
  qualityWarnings: string[];
  updatedAt: string;
};

export type GenerateDocumentSummaryRequest = {
  maxLength?: number;
};

export type DocumentSummaryResponse = {
  documentId: number;
  summary: string;
  updatedAt: string;
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

export async function reprocessDocument(documentId: number | string) {
  const response = await http.post<DocumentResponse>(
    `/documents/${documentId}/reprocess`,
  );

  return response.data;
}

export async function getDocumentQuality(documentId: number | string) {
  const response = await http.get<DocumentQualityResponse>(
    `/documents/${documentId}/quality`,
  );

  return response.data;
}

export async function generateDocumentSummary(
  documentId: number | string,
  request: GenerateDocumentSummaryRequest = {},
) {
  const response = await http.post<DocumentSummaryResponse>(
    `/documents/${documentId}/summary`,
    request,
  );

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

export async function searchKnowledgeBaseDocuments(
  knowledgeBaseId: number | string,
  request: SearchDocumentsRequest,
) {
  const response = await http.post<SearchDocumentsResponse>(
    `/knowledge-bases/${knowledgeBaseId}/search`,
    request,
  );

  return response.data;
}
