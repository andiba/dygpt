import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { GptOrchestrator } from '../../../services/gpt-orchestrator';
import { GPT } from '../../../models';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-gpt-list',
  imports: [RouterLink, DatePipe],
  templateUrl: './gpt-list.html',
  styleUrl: './gpt-list.scss',
})
export class GptList {
  private orchestrator = inject(GptOrchestrator);
  private router = inject(Router);

  get gpts(): GPT[] {
    return this.orchestrator.getGpts();
  }

  openGpt(gpt: GPT) {
    this.router.navigate(['/admin', gpt.name]);
  }

  chatWith(gpt: GPT, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/chat', gpt.chatbotName]);
  }

  async deleteGpt(gpt: GPT, event: Event) {
    event.stopPropagation();
    if (confirm(`DYGPT "${gpt.displayName}" wirklich löschen? Alle Daten gehen verloren.`)) {
      await this.orchestrator.deleteGpt(gpt);
    }
  }
}
