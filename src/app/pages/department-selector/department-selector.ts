import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TenantService } from '../../services/tenant.service';
import { Department } from '../../models';

@Component({
  selector: 'app-department-selector',
  imports: [FormsModule],
  templateUrl: './department-selector.html',
  styleUrl: './department-selector.scss',
})
export class DepartmentSelector implements OnInit {
  private tenantService = inject(TenantService);
  private router = inject(Router);

  departments: Department[] = [];
  showSetupForm = false;

  // Setup form data
  newDept = {
    name: '',
    baseUrl: 'https://master-docufy-ai.dev.tp-platform.de',
    tenant: '',
    apiKey: '',
    embeddingModel: 'intfloat/multilingual-e5-large'
  };

  embeddingModels = [
    { value: 'intfloat/multilingual-e5-large', label: 'Multilingual E5 Large (empfohlen)' },
    { value: 'intfloat/multilingual-e5-small', label: 'Multilingual E5 Small' },
    { value: 'sentence-transformers/all-MiniLM-L6-v2', label: 'MiniLM L6 v2' }
  ];

  ngOnInit() {
    this.departments = this.tenantService.getDepartments();
  }

  selectDepartment(dept: Department) {
    this.tenantService.setActiveDepartment(dept.id);
    this.router.navigate(['/chat']);
  }

  toggleSetupForm() {
    this.showSetupForm = !this.showSetupForm;
    if (this.showSetupForm) {
      this.newDept.name = '';
      this.newDept.tenant = '';
      this.newDept.apiKey = '';
    }
  }

  onNameChange() {
    // Auto-generate tenant name from department name
    if (this.newDept.name) {
      this.newDept.tenant = this.newDept.name.toLowerCase()
        .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    }
  }

  setupDepartment() {
    if (!this.newDept.name || !this.newDept.tenant || !this.newDept.apiKey) return;

    const dept: Department = {
      id: crypto.randomUUID(),
      name: this.newDept.name,
      baseUrl: this.newDept.baseUrl,
      tenant: this.newDept.tenant,
      apiKey: this.newDept.apiKey,
      embeddingModel: this.newDept.embeddingModel,
      createdAt: new Date().toISOString()
    };

    this.tenantService.addDepartment(dept);
    this.departments = this.tenantService.getDepartments();
    this.showSetupForm = false;

    console.log(`[DepartmentSelector] Department setup: ${dept.name} (${dept.tenant})`);

    // Navigate directly to chat
    this.router.navigate(['/chat']);
  }

  deleteDepartment(event: Event, dept: Department) {
    event.stopPropagation();
    if (!confirm(`Abteilung "${dept.name}" wirklich entfernen? Alle lokalen DYGPT-Daten dieser Abteilung gehen verloren.`)) return;
    this.tenantService.removeDepartment(dept.id);
    this.departments = this.tenantService.getDepartments();
  }
}
