import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GptOrchestrator } from '../../../services/gpt-orchestrator';
import { ApiService } from '../../../services/api';
import { GPT } from '../../../models';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-gpt-detail',
  imports: [RouterLink, FormsModule, DatePipe],
  templateUrl: './gpt-detail.html',
  styleUrl: './gpt-detail.scss',
})
export class GptDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orchestrator = inject(GptOrchestrator);
  private api = inject(ApiService);

  gpt: GPT | null = null;
  editMode = false;
  saving = false;

  ngOnInit() {
    const name = this.route.snapshot.params['name'];
    this.gpt = this.orchestrator.getGpt(name) || null;
  }

  toggleEdit() {
    this.editMode = !this.editMode;
  }

  async save() {
    if (!this.gpt) return;
    this.saving = true;
    try {
      await new Promise<any>((resolve, reject) => {
        this.api.updatePromptlet(this.gpt!.promptletName, {
          role: 'SYSTEM',
          languages: [{
            languageTag: this.gpt!.language,
            defaultLanguage: true,
            prompt: this.gpt!.systemPrompt
          }]
        }).subscribe({ next: resolve, error: reject });
      });
      this.orchestrator.saveGpt(this.gpt);
      this.editMode = false;
    } catch (e) {
      alert('Fehler beim Speichern');
    } finally {
      this.saving = false;
    }
  }

  async deleteGpt() {
    if (!this.gpt) return;
    if (confirm(`DYGPT "${this.gpt.displayName}" wirklich löschen?`)) {
      await this.orchestrator.deleteGpt(this.gpt);
      this.router.navigate(['/admin']);
    }
  }

  openChat() {
    if (this.gpt) {
      this.router.navigate(['/chat', this.gpt.chatbotName]);
    }
  }
}
