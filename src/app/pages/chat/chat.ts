import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../services/api';
import { GptOrchestrator } from '../../services/gpt-orchestrator';
import { GPT, ChatMessage } from '../../models';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

@Component({
  selector: 'app-chat',
  imports: [FormsModule, RouterLink, DatePipe, MarkdownPipe],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat implements OnInit, OnDestroy, AfterViewChecked {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private orchestrator = inject(GptOrchestrator);
  private cdr = inject(ChangeDetectorRef);
  private location = inject(Location);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  currentGpt: GPT | null = null;
  gpts: GPT[] = [];
  messages: ChatMessage[] = [];
  currentMessage = '';
  conversationId: string | null = null;
  isLoading = false;
  shouldScroll = false;

  // Index status
  indexStatus: string | null = null;
  indexReady = false;
  indexCheckInterval: any = null;

  ngOnInit() {
    this.gpts = this.orchestrator.getGpts();

    this.route.params.subscribe(params => {
      const botName = params['botName'];
      const convId = params['conversationId'] || null;

      // Skip if nothing changed (e.g. replaceUrl after creating conversation)
      if (botName === this.currentGpt?.chatbotName && convId === this.conversationId) return;

      if (botName) {
        const gpt = this.gpts.find(g => g.chatbotName === botName) || null;
        this.currentGpt = gpt;
        if (gpt) {
          this.messages = [];
          this.conversationId = null;
          this.indexReady = false;
          this.indexStatus = null;

          if (convId) {
            // Load existing conversation
            this.conversationId = convId;
            this.loadConversationHistory(botName, convId);
          } else {
            this.addBotMessage(`Hallo! Ich bin **${gpt.displayName}**. ${gpt.description || 'Wie kann ich dir helfen?'}`);
          }
          this.checkIndexStatus();
        }
      }
    });
  }

  ngOnDestroy() {
    this.stopIndexPolling();
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  selectGpt(gpt: GPT) {
    this.router.navigate(['/chat', gpt.chatbotName]);
  }

  /** Check if the search index is ready */
  private checkIndexStatus() {
    if (!this.currentGpt) return;

    this.stopIndexPolling();

    const checkOnce = () => {
      if (!this.currentGpt) return;
      this.api.getSearchIndex(this.currentGpt.searchIndexName).subscribe({
        next: (index) => {
          // Backend uses "health" field: HEALTHY, UNKNOWN, UNHEALTHY, etc.
          const health = (index.health || index.status || '').toUpperCase();
          this.indexStatus = health;
          console.log('[Chat] Index health:', health || '(empty)');

          if (health === 'HEALTHY') {
            this.indexReady = true;
            this.stopIndexPolling();
          } else {
            // Any other value (UNKNOWN, INDEXING, UNHEALTHY, etc.) → Banner + Polling
            this.indexReady = false;
            if (!this.indexCheckInterval) {
              this.indexCheckInterval = setInterval(checkOnce, 5000);
            }
          }
        },
        error: (err) => {
          console.warn('[Chat] Could not check index status:', err);
          // If we can't check, assume it's ready so chat isn't blocked
          this.indexReady = true;
          this.stopIndexPolling();
        }
      });
    };

    checkOnce();
  }

  private stopIndexPolling() {
    if (this.indexCheckInterval) {
      clearInterval(this.indexCheckInterval);
      this.indexCheckInterval = null;
    }
  }

  get isIndexing(): boolean {
    return !this.indexReady && this.indexStatus !== null;
  }

  async sendMessage() {
    if (!this.currentMessage.trim() || !this.currentGpt || this.isLoading) return;

    const userMsg = this.currentMessage.trim();
    this.currentMessage = '';
    this.messages.push({
      role: 'user',
      content: userMsg,
      timestamp: new Date()
    });
    this.shouldScroll = true;
    this.isLoading = true;

    const t0 = performance.now();
    console.log(`[Chat] ▶ sendMessage gestartet`);

    try {
      // Create conversation if needed
      if (!this.conversationId) {
        console.log(`[Chat] ⏳ createConversation...`);
        const tConv = performance.now();
        const conv = await new Promise<any>((resolve, reject) => {
          this.api.createConversation(this.currentGpt!.chatbotName).subscribe({
            next: resolve,
            error: reject
          });
        });
        this.conversationId = conv.id;
        console.log(`[Chat] ✅ createConversation: ${((performance.now() - tConv) / 1000).toFixed(1)}s → id=${conv.id}`);
        // Update URL to include conversationId (without triggering route change)
        this.location.replaceState(`/chat/${this.currentGpt!.chatbotName}/${conv.id}`);
      }

      // Send message
      console.log(`[Chat] ⏳ chat API call...`);
      const tChat = performance.now();
      const response = await new Promise<string>((resolve, reject) => {
        this.api.chat(this.currentGpt!.chatbotName, this.conversationId!, userMsg).subscribe({
          next: resolve,
          error: reject
        });
      });
      console.log(`[Chat] ✅ chat API: ${((performance.now() - tChat) / 1000).toFixed(1)}s (${response.length} chars)`);

      this.addBotMessage(response);
      // Notify sidebar to refresh conversation list
      this.api.notifyConversationUpdated(this.currentGpt!.chatbotName);
    } catch (error: any) {
      console.error(`[Chat] ❌ Fehler nach ${((performance.now() - t0) / 1000).toFixed(1)}s:`, error);
      this.addBotMessage(`❌ Fehler: ${error.message || 'Verbindungsfehler. Bitte prüfe die Einstellungen.'}`);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
      console.log(`[Chat] ■ sendMessage gesamt: ${((performance.now() - t0) / 1000).toFixed(1)}s`);
    }
  }

  private loadConversationHistory(botName: string, conversationId: string) {
    this.isLoading = true;
    console.log(`[Chat] ⏳ Loading conversation history: ${conversationId}`);

    this.api.getConversationMessages(botName, conversationId).subscribe({
      next: (msgs: any[]) => {
        console.log(`[Chat] ✅ Loaded ${msgs.length} messages`);
        this.messages = [];
        for (const msg of msgs) {
          const role = (msg.role || '').toUpperCase();
          if (role === 'USER') {
            this.messages.push({
              role: 'user',
              content: msg.text || msg.content || '',
              timestamp: msg.creationDate ? new Date(msg.creationDate) : new Date()
            });
          } else if (role === 'ASSISTANT') {
            this.messages.push({
              role: 'assistant',
              content: msg.text || msg.content || '',
              timestamp: msg.creationDate ? new Date(msg.creationDate) : new Date()
            });
          }
        }
        this.shouldScroll = true;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[Chat] Failed to load conversation history:', err);
        this.addBotMessage(`Hallo! Ich bin **${this.currentGpt!.displayName}**. ${this.currentGpt!.description || 'Wie kann ich dir helfen?'}`);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private addBotMessage(content: string) {
    this.messages.push({
      role: 'assistant',
      content,
      timestamp: new Date()
    });
    this.shouldScroll = true;
  }

  private scrollToBottom() {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch (e) {}
  }

  goHome() {
    this.router.navigate(['/chat']);
  }

  goToDepartments() {
    this.router.navigate(['/departments']);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
