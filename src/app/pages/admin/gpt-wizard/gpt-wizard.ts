import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GptOrchestrator } from '../../../services/gpt-orchestrator';
import { GptWizardState } from '../../../models';

@Component({
  selector: 'app-gpt-wizard',
  imports: [FormsModule, RouterLink],
  templateUrl: './gpt-wizard.html',
  styleUrl: './gpt-wizard.scss',
})
export class GptWizard {
  private orchestrator = inject(GptOrchestrator);
  private router = inject(Router);

  currentStep = 1;
  totalSteps = 4;
  isCreating = false;
  error = '';

  wizard: GptWizardState = {
    step: 1,
    name: '',
    displayName: '',
    description: '',
    systemPrompt: '',
    language: 'de',
    icon: '🤖',
    color: '#dbeafe',
    visibility: 'all',
    files: []
  };

  availableIcons = ['🤖', '📚', '⚖️', '💻', '📊', '🔬', '🎓', '💡', '🏥', '🛠️', '📝', '🌍', '🎨', '🔒', '📋', '🗂️'];
  availableColors = ['#dbeafe', '#d1fae5', '#fef3c7', '#fce7f3', '#e0e7ff', '#f3e8ff', '#ccfbf1', '#fee2e2'];

  steps = [
    { num: 1, label: 'Grundlagen' },
    { num: 2, label: 'System-Prompt' },
    { num: 3, label: 'Dokumente' },
    { num: 4, label: 'Fertigstellen' }
  ];

  get canProceed(): boolean {
    switch (this.currentStep) {
      case 1: return !!this.wizard.displayName.trim();
      case 2: return !!this.wizard.systemPrompt.trim();
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  }

  next() {
    if (this.currentStep < this.totalSteps && this.canProceed) {
      this.currentStep++;
      // Auto-generate name from displayName
      if (this.currentStep === 2 && !this.wizard.name) {
        this.wizard.name = this.wizard.displayName;
      }
    }
  }

  prev() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  selectIcon(icon: string) {
    this.wizard.icon = icon;
  }

  selectColor(color: string) {
    this.wizard.color = color;
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.wizard.files = [...this.wizard.files, ...Array.from(input.files)];
    }
  }

  removeFile(index: number) {
    this.wizard.files.splice(index, 1);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      this.wizard.files = [...this.wizard.files, ...Array.from(event.dataTransfer.files)];
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  async create() {
    this.isCreating = true;
    this.error = '';

    try {
      const gpt = await this.orchestrator.createGpt(this.wizard);
      this.router.navigate(['/chat', gpt.chatbotName]);
    } catch (err: any) {
      this.error = err.message || 'Fehler beim Erstellen. Bitte prüfe die Verbindung.';
      this.isCreating = false;
    }
  }
}
