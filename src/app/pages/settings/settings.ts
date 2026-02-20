import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, DygptConfig } from '../../services/api';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class Settings {
  private api = inject(ApiService);
  private router = inject(Router);

  config: DygptConfig = this.api.getConfig();
  saveSuccess = false;

  embeddingModels = [
    { value: 'intfloat/multilingual-e5-large', label: 'Multilingual E5 Large', desc: 'Beste Qualität für mehrsprachige Inhalte (empfohlen)' },
    { value: 'intfloat/multilingual-e5-small', label: 'Multilingual E5 Small', desc: 'Schneller, etwas geringere Qualität' },
    { value: 'sentence-transformers/all-MiniLM-L6-v2', label: 'MiniLM L6 v2', desc: 'Schnell, optimiert für englische Texte' },
  ];

  save() {
    this.api.configure(this.config);
    this.saveSuccess = true;
    setTimeout(() => this.saveSuccess = false, 3000);
  }

  saveAndGo() {
    this.save();
    this.router.navigate(['/admin']);
  }
}
