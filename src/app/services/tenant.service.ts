import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Department } from '../models';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly DEPARTMENTS_KEY = 'dygpt_departments';
  private readonly ACTIVE_KEY = 'dygpt_active_department';

  private activeDepartmentSubject = new BehaviorSubject<Department | null>(null);

  /** Emits whenever the active department changes */
  departmentChanged$ = this.activeDepartmentSubject.asObservable();

  constructor() {
    this.migrateV1Data();
    this.restoreActiveDepartment();
  }

  // ── Read ──

  getDepartments(): Department[] {
    const data = localStorage.getItem(this.DEPARTMENTS_KEY);
    return data ? JSON.parse(data) : [];
  }

  getActiveDepartment(): Department | null {
    return this.activeDepartmentSubject.value;
  }

  hasAnyDepartment(): boolean {
    return this.getDepartments().length > 0;
  }

  isActiveDepartment(id: string): boolean {
    return this.activeDepartmentSubject.value?.id === id;
  }

  // ── Write ──

  setActiveDepartment(id: string): void {
    const dept = this.getDepartments().find(d => d.id === id) || null;
    localStorage.setItem(this.ACTIVE_KEY, id);
    this.activeDepartmentSubject.next(dept);
    console.log(`[TenantService] Active department: ${dept?.name || 'none'}`);
  }

  addDepartment(dept: Department): void {
    const departments = this.getDepartments();
    departments.push(dept);
    this.saveDepartments(departments);
    this.setActiveDepartment(dept.id);
  }

  updateDepartment(dept: Department): void {
    const departments = this.getDepartments().map(d => d.id === dept.id ? dept : d);
    this.saveDepartments(departments);
    // If this is the active department, re-emit so subscribers get the updated config
    if (this.isActiveDepartment(dept.id)) {
      this.activeDepartmentSubject.next(dept);
    }
  }

  removeDepartment(id: string): void {
    const departments = this.getDepartments().filter(d => d.id !== id);
    this.saveDepartments(departments);
    // Clean up GPTs for this department
    localStorage.removeItem(`dygpt_gpts_${id}`);
    // If this was the active department, clear or switch
    if (this.isActiveDepartment(id)) {
      if (departments.length > 0) {
        this.setActiveDepartment(departments[0].id);
      } else {
        localStorage.removeItem(this.ACTIVE_KEY);
        this.activeDepartmentSubject.next(null);
      }
    }
  }

  // ── Private ──

  private saveDepartments(departments: Department[]): void {
    localStorage.setItem(this.DEPARTMENTS_KEY, JSON.stringify(departments));
  }

  private restoreActiveDepartment(): void {
    const activeId = localStorage.getItem(this.ACTIVE_KEY);
    if (activeId) {
      const dept = this.getDepartments().find(d => d.id === activeId);
      if (dept) {
        this.activeDepartmentSubject.next(dept);
        console.log(`[TenantService] Restored active department: ${dept.name}`);
        return;
      }
    }
    // No active department — check if there are any departments
    const departments = this.getDepartments();
    if (departments.length > 0) {
      this.setActiveDepartment(departments[0].id);
    }
  }

  /**
   * Migrate V1 single-tenant data to department model.
   * Reads old `dygpt_config` + `dygpt_gpts` keys,
   * creates the first department, and cleans up old keys.
   */
  private migrateV1Data(): void {
    const existingConfig = localStorage.getItem('dygpt_config');
    const alreadyMigrated = localStorage.getItem(this.DEPARTMENTS_KEY);

    if (!existingConfig || alreadyMigrated) return;

    try {
      const config = JSON.parse(existingConfig);
      const dept: Department = {
        id: crypto.randomUUID(),
        name: config.tenant || 'Standard',
        baseUrl: config.baseUrl || 'https://master-docufy-ai.dev.tp-platform.de',
        tenant: config.tenant || 'default',
        apiKey: config.apiKey || '',
        embeddingModel: config.embeddingModel || 'intfloat/multilingual-e5-large',
        createdAt: new Date().toISOString()
      };

      // Save department
      this.saveDepartments([dept]);
      localStorage.setItem(this.ACTIVE_KEY, dept.id);

      // Migrate GPTs to department-scoped key
      const existingGpts = localStorage.getItem('dygpt_gpts');
      if (existingGpts) {
        localStorage.setItem(`dygpt_gpts_${dept.id}`, existingGpts);
      }

      // Clean up old keys
      localStorage.removeItem('dygpt_config');
      localStorage.removeItem('dygpt_gpts');

      console.log(`[TenantService] Migrated V1 data to department: ${dept.name}`);
    } catch (e) {
      console.error('[TenantService] Migration failed:', e);
    }
  }
}
