export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  citations?: CitationChip[];
};

export type ConversationItem = {
  id: string;
  title: string;
  time: string;
  updatedAt: string;
  sourceCount: number;
  favorite: boolean;
  messages: ConversationMessage[];
};

export type SourceItem = {
  id: string;
  file: string;
  type: "pdf" | "md" | "txt";
  chunk: string;
  page: string;
  score: string;
  excerpt: string;
};

export type CitationChip = {
  label: string;
  file: string;
  chunk: string;
};

export type StatusMetric = {
  label: string;
  value: string;
};

export type SortDirection = "asc" | "desc";
