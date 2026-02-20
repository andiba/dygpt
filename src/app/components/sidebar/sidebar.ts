import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { GptOrchestrator } from '../../services/gpt-orchestrator';
import { ApiService } from '../../services/api';
import { TenantService } from '../../services/tenant.service';
import { GPT, Conversation, Department } from '../../models';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class SidebarComponent implements OnInit, OnDestroy {
  private orchestrator = inject(GptOrchestrator);
  private api = inject(ApiService);
  private tenantService = inject(TenantService);
  private router = inject(Router);
  private location = inject(Location);
  private cdr = inject(ChangeDetectorRef);
  private convUpdateSub?: Subscription;
  private routerSub?: Subscription;
  private deptSub?: Subscription;

  conversations = new Map<string, Conversation[]>();
  expanded = new Set<string>();
  formattedDates = new Map<string, string>();
  conversationCounts = new Map<string, number>();
  firstPrompts = new Map<string, string>();
  activeBotName = '';
  activeConversationId = '';

  // Department switcher
  departments: Department[] = [];
  activeDepartment: Department | null = null;
  showDeptDropdown = false;

  get gpts(): GPT[] {
    return this.orchestrator.getGpts();
  }

  ngOnInit() {
    // Subscribe to department changes
    this.deptSub = this.tenantService.departmentChanged$.subscribe(dept => {
      this.activeDepartment = dept;
      this.departments = this.tenantService.getDepartments();
      if (dept) {
        this.reloadAllData();
      }
      this.cdr.detectChanges();
    });

    // Re-load conversations when a message is sent (so updated conversation jumps to top)
    this.convUpdateSub = this.api.conversationUpdated$.subscribe(botName => {
      console.log(`[Sidebar] conversationUpdated → reloading ${botName}`);
      // Also refresh active route (Location.replaceState doesn't trigger NavigationEnd)
      this.updateActiveRoute(this.location.path());
      this.cdr.detectChanges();
      this.loadConversations(botName);
    });

    // Track active route to highlight current conversation
    this.updateActiveRoute(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => this.updateActiveRoute(e.urlAfterRedirects));
  }

  ngOnDestroy() {
    this.convUpdateSub?.unsubscribe();
    this.routerSub?.unsubscribe();
    this.deptSub?.unsubscribe();
  }

  // ── Department Switcher ──

  switchDepartment(dept: Department) {
    this.showDeptDropdown = false;
    this.tenantService.setActiveDepartment(dept.id);
    this.router.navigate(['/chat']);
  }

  goToDepartments() {
    this.showDeptDropdown = false;
    this.router.navigate(['/departments']);
  }

  private reloadAllData() {
    // Clear all cached data
    this.conversations.clear();
    this.expanded.clear();
    this.formattedDates.clear();
    this.conversationCounts.clear();
    this.firstPrompts.clear();

    // Reload GPTs and conversations for new department
    for (const gpt of this.gpts) {
      this.loadConversations(gpt.chatbotName);
    }
  }

  private updateActiveRoute(url: string) {
    // Parse /chat/:botName/:conversationId from URL
    const match = url.match(/\/chat\/([^/]+)(?:\/([^/?]+))?/);
    this.activeBotName = match?.[1] || '';
    this.activeConversationId = match?.[2] || '';
  }

  isActiveConversation(botName: string, convId: string): boolean {
    return this.activeBotName === botName && this.activeConversationId === convId;
  }

  isActiveBot(botName: string): boolean {
    return this.activeBotName === botName && !this.activeConversationId;
  }

  loadConversations(botName: string) {
    this.api.listConversations(botName).subscribe({
      next: (response: any) => {
        console.log(`[Sidebar] listConversations(${botName}) response:`, response);
        // Handle both array and object responses
        let convs: Conversation[] = [];
        if (Array.isArray(response)) {
          convs = response;
        } else if (response && Array.isArray(response.conversations)) {
          convs = response.conversations;
        } else if (response && Array.isArray(response.content)) {
          convs = response.content;
        } else if (response && typeof response === 'object') {
          // Try to find any array in the response
          for (const key of Object.keys(response)) {
            if (Array.isArray(response[key])) {
              convs = response[key];
              console.log(`[Sidebar] Found conversations in response.${key}`);
              break;
            }
          }
        }
        // Sort by lastModificationDate or creationDate, newest first
        const sorted = convs.sort((a: any, b: any) => {
          const dateA = a.lastModificationDate || a.creationDate || '';
          const dateB = b.lastModificationDate || b.creationDate || '';
          return dateB.localeCompare(dateA);
        });
        this.conversations.set(botName, sorted);
        this.conversationCounts.set(botName, sorted.length);
        // Pre-compute formatted dates to avoid NG0100
        for (const conv of sorted) {
          this.formattedDates.set(conv.id, this.formatDate(conv.lastModificationDate || conv.creationDate));
        }
        // Load first prompts only for visible conversations (max 3)
        const visible = this.expanded.has(botName) ? sorted : sorted.slice(0, 3);
        for (const conv of visible) {
          if (!this.firstPrompts.has(conv.id)) {
            this.loadFirstPrompt(botName, conv.id);
          }
        }
        console.log(`[Sidebar] ${botName}: ${sorted.length} conversations loaded`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn(`[Sidebar] Could not load conversations for ${botName}:`, err);
        this.conversations.set(botName, []);
        this.conversationCounts.set(botName, 0);
        this.cdr.detectChanges();
      }
    });
  }

  getConversations(botName: string): Conversation[] {
    return this.conversations.get(botName) || [];
  }

  getVisibleConversations(botName: string): Conversation[] {
    const all = this.getConversations(botName);
    if (this.expanded.has(botName)) return all;
    return all.slice(0, 3);
  }

  hasMoreConversations(botName: string): boolean {
    return this.getConversations(botName).length > 3;
  }

  toggleExpand(botName: string) {
    if (this.expanded.has(botName)) {
      this.expanded.delete(botName);
    } else {
      this.expanded.add(botName);
      // Load first prompts for newly visible conversations
      const all = this.getConversations(botName);
      for (const conv of all) {
        if (!this.firstPrompts.has(conv.id)) {
          this.loadFirstPrompt(botName, conv.id);
        }
      }
    }
  }

  isExpanded(botName: string): boolean {
    return this.expanded.has(botName);
  }

  navigateToChat(botName: string) {
    this.router.navigate(['/chat', botName]);
  }

  openConversation(botName: string, conversationId: string) {
    this.router.navigate(['/chat', botName, conversationId]);
  }

  getConversationCount(botName: string): number {
    return this.conversationCounts.get(botName) || 0;
  }

  getFormattedDate(convId: string): string {
    return this.formattedDates.get(convId) || '';
  }

  getFirstPrompt(convId: string): string {
    return this.firstPrompts.get(convId) || '';
  }

  private loadFirstPrompt(botName: string, convId: string) {
    this.api.getConversationMessages(botName, convId).subscribe({
      next: (messages: any) => {
        // Handle array or object response
        let msgs: any[] = [];
        if (Array.isArray(messages)) {
          msgs = messages;
        } else if (messages && Array.isArray(messages.content)) {
          msgs = messages.content;
        }
        // Find first user message
        const firstUserMsg = msgs.find((m: any) => m.role === 'USER' || m.role === 'user');
        if (firstUserMsg) {
          const text = firstUserMsg.content || firstUserMsg.text || '';
          this.firstPrompts.set(convId, text);
          this.cdr.detectChanges();
        }
      },
      error: () => {
        // Mark as attempted so we don't retry on failed conversations
        this.firstPrompts.set(convId, '');
      }
    });
  }

  private formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  }
}
