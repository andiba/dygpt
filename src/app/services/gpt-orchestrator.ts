import { Injectable } from '@angular/core';
import { ApiService } from './api';
import { firstValueFrom } from 'rxjs';
import { GPT, GptWizardState } from '../models';

@Injectable({ providedIn: 'root' })
export class GptOrchestrator {
  private readonly STORAGE_KEY = 'dygpt_gpts';

  constructor(private api: ApiService) {}

  /**
   * Creates a complete GPT by orchestrating 4 API calls:
   * 1. Document Pool
   * 2. Search Index
   * 3. Promptlet (System Prompt)
   * 4. Chatbot
   */
  async createGpt(wizard: GptWizardState): Promise<GPT> {
    const safeName = this.sanitizeName(wizard.name);

    // Step 1: Create Document Pool
    const poolName = `pool_${safeName}`;
    console.log('[GPT Orchestrator] Step 1: Creating Document Pool:', poolName);
    try {
      await firstValueFrom(this.api.createDocumentPool(poolName));
      console.log('[GPT Orchestrator] Document Pool created successfully');
    } catch (err: any) {
      if (this.isAlreadyExistsError(err)) {
        console.log('[GPT Orchestrator] Document Pool already exists, reusing:', poolName);
      } else {
        console.error('[GPT Orchestrator] Document Pool creation failed:', err);
        console.error('[GPT Orchestrator] Error body:', JSON.stringify(err?.error));
        const errMsg = err?.error?.message || err?.error?.detail || err?.error?.title || err?.message || JSON.stringify(err?.error || err);
        throw new Error(`Fehler beim Erstellen des Document Pools: ${errMsg}`);
      }
    }

    // Step 2: Create Search Index
    const indexName = `index_${safeName}`;
    console.log('[GPT Orchestrator] Step 2: Creating Search Index:', indexName);
    try {
      await firstValueFrom(this.api.createSearchIndex({
        name: indexName,
        documentPool: poolName,
        type: 'vector',
        languageTags: [wizard.language],
        embeddingModel: this.api.getConfig().embeddingModel,
      }));
      console.log('[GPT Orchestrator] Search Index created successfully');
    } catch (err: any) {
      if (this.isAlreadyExistsError(err)) {
        console.log('[GPT Orchestrator] Search Index already exists, reusing:', indexName);
      } else {
        console.error('[GPT Orchestrator] Search Index creation failed:', err);
        console.error('[GPT Orchestrator] Error body:', JSON.stringify(err?.error));
        const errMsg = err?.error?.message || err?.error?.detail || err?.error?.title || err?.message || JSON.stringify(err?.error || err);
        throw new Error(`Fehler beim Erstellen des Search Index: ${errMsg}`);
      }
    }

    // Step 3: Create Promptlet
    const promptletName = `prompt_${safeName}`;
    console.log('[GPT Orchestrator] Step 3: Creating Promptlet:', promptletName);
    try {
      await firstValueFrom(this.api.createPromptlet({
        name: promptletName,
        role: 'SYSTEM',
        languages: [{
          languageTag: wizard.language,
          defaultLanguage: true,
          prompt: wizard.systemPrompt
        }]
      }));
      console.log('[GPT Orchestrator] Promptlet created successfully');
    } catch (err: any) {
      if (this.isAlreadyExistsError(err)) {
        console.log('[GPT Orchestrator] Promptlet already exists, reusing:', promptletName);
      } else {
        console.error('[GPT Orchestrator] Promptlet creation failed:', err);
        console.error('[GPT Orchestrator] Error body:', JSON.stringify(err?.error));
        const errMsg = err?.error?.message || err?.error?.detail || err?.error?.title || err?.message || JSON.stringify(err?.error || err);
        throw new Error(`Fehler beim Erstellen des Promptlets: ${errMsg}`);
      }
    }

    // Step 4: Create Chatbot
    const chatbotName = `bot_${safeName}`;
    console.log('[GPT Orchestrator] Step 4: Creating Chatbot:', chatbotName);
    try {
      await firstValueFrom(this.api.createChatbot({
        name: chatbotName,
        documentPool: poolName,
        promptletNames: [promptletName],
        toolProvidersEnabled: ['semantic_search'],
      }));
      console.log('[GPT Orchestrator] Chatbot created successfully');
    } catch (err: any) {
      if (this.isAlreadyExistsError(err)) {
        console.log('[GPT Orchestrator] Chatbot already exists, reusing:', chatbotName);
      } else {
        console.error('[GPT Orchestrator] Chatbot creation failed:', err);
        console.error('[GPT Orchestrator] Error body:', JSON.stringify(err?.error));
        const errMsg = err?.error?.message || err?.error?.detail || err?.error?.title || err?.message || JSON.stringify(err?.error || err);
        throw new Error(`Fehler beim Erstellen des Chatbots: ${errMsg}`);
      }
    }

    // Build GPT model
    const gpt: GPT = {
      name: safeName,
      displayName: wizard.displayName,
      description: wizard.description,
      systemPrompt: wizard.systemPrompt,
      language: wizard.language,
      icon: wizard.icon,
      color: wizard.color,
      documentPoolName: poolName,
      searchIndexName: indexName,
      promptletName: promptletName,
      chatbotName: chatbotName,
      documentsCount: 0,
      conversationsCount: 0,
      creationDate: new Date().toISOString(),
      visibility: wizard.visibility
    };

    // Save to local storage (frontend metadata)
    this.saveGpt(gpt);

    // Upload files if provided
    if (wizard.files.length > 0) {
      console.log('[GPT Orchestrator] Uploading', wizard.files.length, 'files to', poolName);
      try {
        await firstValueFrom(this.api.uploadDocuments(poolName, wizard.files));
        gpt.documentsCount = wizard.files.length;
        this.saveGpt(gpt);
        console.log('[GPT Orchestrator] Files uploaded successfully');
      } catch (err: any) {
        console.error('[GPT Orchestrator] File upload failed:', err);
        // Don't throw here - GPT was created, just document upload failed
      }

      // Trigger reindex after upload
      console.log('[GPT Orchestrator] Triggering reindex for', indexName);
      try {
        await firstValueFrom(this.api.reindex(indexName));
        console.log('[GPT Orchestrator] Reindex triggered successfully');
      } catch (err: any) {
        console.error('[GPT Orchestrator] Reindex failed:', err);
      }
    }

    console.log('[GPT Orchestrator] GPT created successfully:', gpt.displayName);
    return gpt;
  }

  /**
   * Delete a GPT and all associated resources
   */
  async deleteGpt(gpt: GPT): Promise<void> {
    console.log('[GPT Orchestrator] Deleting GPT:', gpt.displayName);
    try { await firstValueFrom(this.api.deleteChatbot(gpt.chatbotName)); } catch (e) {}
    try { await firstValueFrom(this.api.deletePromptlet(gpt.promptletName)); } catch (e) {}
    try { await firstValueFrom(this.api.deleteSearchIndex(gpt.searchIndexName)); } catch (e) {}
    try { await firstValueFrom(this.api.deleteDocumentPool(gpt.documentPoolName)); } catch (e) {}
    this.removeGpt(gpt.name);
    console.log('[GPT Orchestrator] GPT deleted');
  }

  // Local storage management for GPT metadata
  getGpts(): GPT[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  getGpt(name: string): GPT | undefined {
    return this.getGpts().find(g => g.name === name);
  }

  saveGpt(gpt: GPT): void {
    const gpts = this.getGpts().filter(g => g.name !== gpt.name);
    gpts.push(gpt);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(gpts));
  }

  removeGpt(name: string): void {
    const gpts = this.getGpts().filter(g => g.name !== name);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(gpts));
  }

  private sanitizeName(name: string): string {
    return name.toLowerCase()
      .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  }

  private isAlreadyExistsError(err: any): boolean {
    const status = err?.status || err?.error?.status;
    const message = (err?.error?.message || '').toLowerCase();
    return status === 422 || status === 409 || message.includes('already exists');
  }
}
