import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api';
import { GptOrchestrator } from '../../../services/gpt-orchestrator';
import { GPT } from '../../../models';

@Component({
  selector: 'app-document-manager',
  imports: [RouterLink],
  templateUrl: './document-manager.html',
  styleUrl: './document-manager.scss',
})
export class DocumentManager implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private orchestrator = inject(GptOrchestrator);
  private cdr = inject(ChangeDetectorRef);

  gpt: GPT | null = null;
  documents: any[] = [];
  isLoading = false;
  isUploading = false;
  uploadProgress = '';

  ngOnInit() {
    const name = this.route.snapshot.params['name'];
    this.gpt = this.orchestrator.getGpt(name) || null;
    if (this.gpt) {
      this.loadDocuments();
    }
  }

  loadDocuments() {
    if (!this.gpt) return;
    this.isLoading = true;
    console.log(`[DocManager] Loading documents for pool: ${this.gpt.documentPoolName}`);
    this.api.listDocuments(this.gpt.documentPoolName).subscribe({
      next: (data: any) => {
        console.log(`[DocManager] Response:`, data);
        let docs: any[] = [];
        if (Array.isArray(data)) {
          docs = data;
        } else if (data && Array.isArray(data.content)) {
          docs = data.content;
        } else if (data && typeof data === 'object') {
          for (const key of Object.keys(data)) {
            if (Array.isArray(data[key])) {
              docs = data[key];
              console.log(`[DocManager] Found docs in response.${key}`);
              break;
            }
          }
        }
        this.documents = docs;
        this.isLoading = false;
        console.log(`[DocManager] ${docs.length} documents loaded`, docs.length > 0 ? docs[0] : 'empty');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(`[DocManager] Error loading documents:`, err);
        this.documents = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && this.gpt) {
      this.uploadFiles(Array.from(input.files));
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files && this.gpt) {
      this.uploadFiles(Array.from(event.dataTransfer.files));
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  async uploadFiles(files: File[]) {
    if (!this.gpt) return;
    this.isUploading = true;
    this.uploadProgress = `${files.length} Datei(en) werden hochgeladen...`;

    this.api.uploadDocuments(this.gpt.documentPoolName, files).subscribe({
      next: () => {
        this.isUploading = false;
        this.uploadProgress = '';
        this.loadDocuments();
        // Update doc count
        if (this.gpt) {
          this.gpt.documentsCount = (this.gpt.documentsCount || 0) + files.length;
          this.orchestrator.saveGpt(this.gpt);
        }
      },
      error: (err) => {
        this.isUploading = false;
        this.uploadProgress = '';
        alert('Fehler beim Upload: ' + (err.message || 'Unbekannter Fehler'));
      }
    });
  }

  deleteDocument(doc: any) {
    if (confirm(`Dokument "${doc.name}" wirklich löschen?`)) {
      this.api.deleteDocument(doc.name).subscribe({
        next: () => {
          this.loadDocuments();
          if (this.gpt) {
            this.gpt.documentsCount = Math.max(0, (this.gpt.documentsCount || 0) - 1);
            this.orchestrator.saveGpt(this.gpt);
          }
        },
        error: () => alert('Fehler beim Löschen')
      });
    }
  }

  reindex() {
    if (!this.gpt) return;
    this.api.reindex(this.gpt.searchIndexName).subscribe({
      next: () => alert('Re-Indexierung gestartet!'),
      error: () => alert('Fehler bei Re-Indexierung')
    });
  }

  formatSize(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
}
