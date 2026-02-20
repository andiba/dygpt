import { Routes } from '@angular/router';
import { departmentGuard } from './guards/department.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'departments',
    pathMatch: 'full'
  },
  {
    path: 'departments',
    loadComponent: () => import('./pages/department-selector/department-selector').then(m => m.DepartmentSelector)
  },
  {
    path: 'chat',
    canActivate: [departmentGuard],
    loadComponent: () => import('./pages/chat/chat').then(m => m.Chat)
  },
  {
    path: 'chat/:botName',
    canActivate: [departmentGuard],
    loadComponent: () => import('./pages/chat/chat').then(m => m.Chat)
  },
  {
    path: 'chat/:botName/:conversationId',
    canActivate: [departmentGuard],
    loadComponent: () => import('./pages/chat/chat').then(m => m.Chat)
  },
  {
    path: 'admin',
    canActivate: [departmentGuard],
    loadComponent: () => import('./pages/admin/admin').then(m => m.Admin),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/admin/gpt-list/gpt-list').then(m => m.GptList)
      },
      {
        path: 'new',
        loadComponent: () => import('./pages/admin/gpt-wizard/gpt-wizard').then(m => m.GptWizard)
      },
      {
        path: ':name',
        loadComponent: () => import('./pages/admin/gpt-detail/gpt-detail').then(m => m.GptDetail)
      },
      {
        path: ':name/documents',
        loadComponent: () => import('./pages/admin/document-manager/document-manager').then(m => m.DocumentManager)
      }
    ]
  },
  {
    path: 'settings',
    canActivate: [departmentGuard],
    loadComponent: () => import('./pages/settings/settings').then(m => m.Settings)
  }
];
