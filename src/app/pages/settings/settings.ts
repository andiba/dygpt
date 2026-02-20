import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { TenantService } from '../../services/tenant.service';
import { Department } from '../../models';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, RouterLink],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class Settings implements OnInit, OnDestroy {
  private tenantService = inject(TenantService);
  private router = inject(Router);
  private deptSub?: Subscription;

  // Editable fields
  deptName = '';
  embeddingModel = '';

  // Readonly fields (from active department)
  baseUrl = '';
  tenant = '';
  apiKey = '';

  saveSuccess = false;
  activeDepartment: Department | null = null;

  embeddingModels = [
    { value: 'intfloat/multilingual-e5-large', label: 'Multilingual E5 Large', desc: 'Beste Qualität für mehrsprachige Inhalte (empfohlen)' },
    { value: 'intfloat/multilingual-e5-small', label: 'Multilingual E5 Small', desc: 'Schneller, etwas geringere Qualität' },
    { value: 'sentence-transformers/all-MiniLM-L6-v2', label: 'MiniLM L6 v2', desc: 'Schnell, optimiert für englische Texte' },
  ];

  ngOnInit() {
    this.deptSub = this.tenantService.departmentChanged$.subscribe(dept => {
      this.activeDepartment = dept;
      if (dept) {
        this.deptName = dept.name;
        this.embeddingModel = dept.embeddingModel;
        this.baseUrl = dept.baseUrl;
        this.tenant = dept.tenant;
        this.apiKey = dept.apiKey;
      }
    });
  }

  ngOnDestroy() {
    this.deptSub?.unsubscribe();
  }

  get maskedApiKey(): string {
    if (!this.apiKey) return '';
    if (this.apiKey.length <= 8) return '••••••••';
    return this.apiKey.substring(0, 4) + '••••••••' + this.apiKey.substring(this.apiKey.length - 4);
  }

  save() {
    if (!this.activeDepartment) return;

    const updated: Department = {
      ...this.activeDepartment,
      name: this.deptName,
      embeddingModel: this.embeddingModel
    };
    this.tenantService.updateDepartment(updated);
    this.saveSuccess = true;
    setTimeout(() => this.saveSuccess = false, 3000);
  }

  saveAndGo() {
    this.save();
    this.router.navigate(['/admin']);
  }

  goToDepartments() {
    this.router.navigate(['/departments']);
  }
}
