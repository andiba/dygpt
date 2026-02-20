// ============================================
// DYGPT Data Models
// ============================================

// Department / Mandant
export interface Department {
  id: string;              // crypto.randomUUID()
  name: string;            // z.B. "Marketing", "HR", "Produktentwicklung"
  baseUrl: string;         // Backend-URL
  tenant: string;          // Backend Tenant-Name
  apiKey: string;          // x-api-key für diese Abteilung
  embeddingModel: string;  // Embedding-Model für neue Search Indices
  createdAt: string;       // ISO 8601
}

export interface DocumentPool {
  name: string;
  systemPool?: boolean;
  totalDocumentsCount?: number;
  totalDocumentsSize?: number;
}

export interface SearchIndex {
  name: string;
  documentPool: string;
  type: string;
  status?: string;
  health?: string;
  languageTags?: string[];
  embeddingModel?: string;
  embeddingEngine?: string;
  totalDocumentsCount?: number;
  totalSegmentsCount?: number;
  totalSegmentsSize?: number;
  lastIndexingDate?: string;
}

export interface Promptlet {
  name: string;
  role: 'SYSTEM' | 'USER' | 'ASSISTANT';
  parameters?: PromptletParameter[];
  languages: PromptletLanguage[];
}

export interface PromptletLanguage {
  languageTag: string;
  defaultLanguage?: boolean;
  prompt: string;
}

export interface PromptletParameter {
  name: string;
  type: 'BOOLEAN' | 'STRING' | 'FILE' | 'NUMBER' | 'LIST_OF_STRINGS' | 'LIST_OF_FILES';
  required?: boolean;
}

export interface Chatbot {
  name: string;
  documentPool?: string;
  promptletNames?: string[];
  toolProvidersEnabled?: string[];
  creationDate?: string;
  creationUser?: UserId;
  lastModificationDate?: string;
  lastModificationUser?: UserId;
}

export interface Conversation {
  id: string;
  totalInputTokensUsed?: number;
  totalOutputTokensUsed?: number;
  creationDate?: string;
  creationUser?: UserId;
  lastModificationDate?: string;
}

export interface Document {
  name: string;
  documentPool: string;
  metadata?: Record<string, any>;
  size?: number;
  creationDate?: string;
  status?: 'INDEXED' | 'INDEXING' | 'PENDING' | 'ERROR';
}

export interface UserId {
  name?: string;
}

// GPT is our frontend model that combines all backend entities
export interface GPT {
  name: string;
  displayName: string;
  description: string;
  systemPrompt: string;
  language: string;
  icon: string;
  color: string;
  documentPoolName: string;
  searchIndexName: string;
  promptletName: string;
  chatbotName: string;
  documentsCount?: number;
  conversationsCount?: number;
  creationDate?: string;
  visibility: 'all' | 'team' | 'private';
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sources?: string[];
  isStreaming?: boolean;
}

// Wizard state
export interface GptWizardState {
  step: number;
  name: string;
  displayName: string;
  description: string;
  systemPrompt: string;
  language: string;
  icon: string;
  color: string;
  visibility: 'all' | 'team' | 'private';
  files: File[];
}
