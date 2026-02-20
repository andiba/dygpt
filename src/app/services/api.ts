import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import {
  DocumentPool, SearchIndex, Promptlet, Chatbot,
  Conversation
} from '../models';

export interface DygptConfig {
  baseUrl: string;
  tenant: string;
  apiKey: string;
  embeddingModel: string;
}

const DEFAULT_EMBEDDING_MODEL = 'intfloat/multilingual-e5-large';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'https://master-docufy-ai.dev.tp-platform.de';
  private tenant = 'default';
  private apiKey = '';
  private embeddingModel = DEFAULT_EMBEDDING_MODEL;

  /** Emits the botName whenever a conversation is updated (new message sent) */
  private _conversationUpdated = new Subject<string>();
  conversationUpdated$ = this._conversationUpdated.asObservable();

  notifyConversationUpdated(botName: string) {
    this._conversationUpdated.next(botName);
  }

  constructor(private http: HttpClient) {
    const saved = localStorage.getItem('dygpt_config');
    if (saved) {
      const config = JSON.parse(saved);
      this.baseUrl = config.baseUrl || this.baseUrl;
      this.tenant = config.tenant || this.tenant;
      this.apiKey = config.apiKey || this.apiKey;
      this.embeddingModel = config.embeddingModel || DEFAULT_EMBEDDING_MODEL;
    }
  }

  configure(config: DygptConfig): void {
    this.baseUrl = config.baseUrl;
    this.tenant = config.tenant;
    this.apiKey = config.apiKey;
    this.embeddingModel = config.embeddingModel;
    localStorage.setItem('dygpt_config', JSON.stringify(config));
  }

  getConfig(): DygptConfig {
    return {
      baseUrl: this.baseUrl,
      tenant: this.tenant,
      apiKey: this.apiKey,
      embeddingModel: this.embeddingModel
    };
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  private get headers(): HttpHeaders {
    return new HttpHeaders({ 'x-api-key': this.apiKey });
  }

  private url(path: string): string {
    return `${this.baseUrl}/${this.tenant}/api${path}`;
  }

  // Document Pools
  listDocumentPools(): Observable<any> {
    return this.http.get(this.url('/documentpools'), { headers: this.headers });
  }

  createDocumentPool(name: string): Observable<DocumentPool> {
    return this.http.post<DocumentPool>(
      this.url('/documentpools'),
      { name, systemPool: false },
      { headers: this.headers.set('Content-Type', 'application/json') }
    );
  }

  deleteDocumentPool(name: string): Observable<void> {
    return this.http.delete<void>(this.url(`/documentpools/${name}`), { headers: this.headers });
  }

  // Search Indices
  listSearchIndexes(): Observable<any> {
    return this.http.get(this.url('/searchindices'), { headers: this.headers });
  }

  createSearchIndex(data: Partial<SearchIndex>): Observable<SearchIndex> {
    return this.http.post<SearchIndex>(
      this.url('/searchindices'), data,
      { headers: this.headers.set('Content-Type', 'application/json') }
    );
  }

  getSearchIndex(name: string): Observable<SearchIndex> {
    return this.http.get<SearchIndex>(this.url(`/searchindices/${name}`), { headers: this.headers });
  }

  deleteSearchIndex(name: string): Observable<void> {
    return this.http.delete<void>(this.url(`/searchindices/${name}`), { headers: this.headers });
  }

  reindex(name: string): Observable<any> {
    return this.http.post(this.url(`/searchindices/${name}/rebuild`), {}, { headers: this.headers });
  }

  // Promptlets
  listPromptlets(): Observable<any> {
    return this.http.get(this.url('/promptlets'), { headers: this.headers });
  }

  createPromptlet(data: Partial<Promptlet>): Observable<Promptlet> {
    return this.http.post<Promptlet>(
      this.url('/promptlets'), data,
      { headers: this.headers.set('Content-Type', 'application/json') }
    );
  }

  getPromptlet(name: string): Observable<Promptlet> {
    return this.http.get<Promptlet>(this.url(`/promptlets/${name}`), { headers: this.headers });
  }

  updatePromptlet(name: string, data: Partial<Promptlet>): Observable<Promptlet> {
    return this.http.put<Promptlet>(
      this.url(`/promptlets/${name}`), data,
      { headers: this.headers.set('Content-Type', 'application/json') }
    );
  }

  deletePromptlet(name: string): Observable<void> {
    return this.http.delete<void>(this.url(`/promptlets/${name}`), { headers: this.headers });
  }

  // Chatbots
  listChatbots(): Observable<any> {
    return this.http.get(this.url('/chatbots'), { headers: this.headers });
  }

  createChatbot(data: Partial<Chatbot>): Observable<Chatbot> {
    return this.http.post<Chatbot>(
      this.url('/chatbots'), data,
      { headers: this.headers.set('Content-Type', 'application/json') }
    );
  }

  getChatbot(name: string): Observable<Chatbot> {
    return this.http.get<Chatbot>(this.url(`/chatbots/${name}`), { headers: this.headers });
  }

  updateChatbot(name: string, data: Partial<Chatbot>): Observable<Chatbot> {
    return this.http.put<Chatbot>(
      this.url(`/chatbots/${name}`), data,
      { headers: this.headers.set('Content-Type', 'application/json') }
    );
  }

  deleteChatbot(name: string): Observable<void> {
    return this.http.delete<void>(this.url(`/chatbots/${name}`), { headers: this.headers });
  }

  // Conversations
  listConversations(chatbotName: string): Observable<any> {
    return this.http.get(this.url(`/chatbots/${chatbotName}/conversations`), { headers: this.headers });
  }

  createConversation(chatbotName: string): Observable<Conversation> {
    const formData = new FormData();
    formData.append('params', '{}');
    return this.http.post<Conversation>(
      this.url(`/chatbots/${chatbotName}/conversations`),
      formData,
      { headers: new HttpHeaders({ 'x-api-key': this.apiKey }) }
    );
  }

  deleteConversation(chatbotName: string, id: string): Observable<void> {
    return this.http.delete<void>(
      this.url(`/chatbots/${chatbotName}/conversations/${id}`),
      { headers: this.headers }
    );
  }

  getConversationMessages(chatbotName: string, conversationId: string): Observable<any[]> {
    return this.http.get<any[]>(
      this.url(`/chatbots/${chatbotName}/conversations/${conversationId}/messages`),
      { headers: this.headers }
    );
  }

  // Chat
  chat(chatbotName: string, conversationId: string, message: string): Observable<string> {
    const chatUrl = this.url(`/chatbots/${chatbotName}/conversations/${conversationId}/chat`);
    console.log(`[API] POST ${chatUrl}`);
    const t0 = performance.now();

    return new Observable(observer => {
      fetch(chatUrl, {
        method: 'POST',
        headers: { 'x-api-key': this.apiKey, 'Content-Type': 'text/plain' },
        body: message
      }).then(async response => {
        const tHeaders = performance.now();
        console.log(`[API] Response Headers nach ${((tHeaders - t0) / 1000).toFixed(1)}s – Status: ${response.status}`);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const raw = await response.text();
        const tBody = performance.now();
        console.log(`[API] Response Body nach ${((tBody - t0) / 1000).toFixed(1)}s – ${raw.length} chars (Body-Read: ${((tBody - tHeaders) / 1000).toFixed(1)}s)`);

        // Backend may return JSON with { role, text } or plain text
        let text = raw;
        try {
          const json = JSON.parse(raw);
          if (json.text) {
            text = json.text;
            console.log(`[API] JSON response parsed – role: ${json.role}, text: ${text.length} chars`);
          }
        } catch {
          // Not JSON, use raw text as-is
        }

        // Rewrite localhost doc links to actual backend URL
        const apiBase = this.url('');
        text = text.replace(/http:\/\/localhost:\d+\/docs\//g, `${apiBase}/docs/`);

        observer.next(text);
        observer.complete();
      }).catch(err => {
        console.error(`[API] Fehler nach ${((performance.now() - t0) / 1000).toFixed(1)}s:`, err);
        observer.error(err);
      });
    });
  }

  // Documents
  listDocuments(documentPool?: string): Observable<any> {
    let params = new HttpParams();
    if (documentPool) params = params.set('documentPool', documentPool);
    const fullUrl = this.url('/documents');
    console.log(`[API] listDocuments → GET ${fullUrl}?documentPool=${documentPool}`);
    return this.http.get(fullUrl, { headers: this.headers, params });
  }

  uploadDocuments(documentPool: string, files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    const metadataJson = JSON.stringify([{
      initialDocumentPools: [documentPool],
      additionalDocumentPools: [documentPool]
    }]);
    const metadataBlob = new Blob([metadataJson], { type: 'application/json' });
    formData.append('metadata', metadataBlob, 'metadata.json');
    return this.http.post(
      this.url('/documents'), formData,
      { headers: new HttpHeaders({ 'x-api-key': this.apiKey }) }
    );
  }

  deleteDocument(name: string): Observable<void> {
    return this.http.delete<void>(this.url(`/documents/${name}`), { headers: this.headers });
  }
}
