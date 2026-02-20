import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'chat',
    pathMatch: 'full'
  },
  {
    path: 'chat',
    loadComponent: () => import('./pages/chat/chat').then(m => m.Chat)
  },
  {
    path: 'chat/:botName',
    loadComponent: () => import('./pages/chat/chat').then(m => m.Chat)
  },
  {
    path: 'chat/:botName/:conversationId',
    loadComponent: () => import('./pages/chat/chat').then(m => m.Chat)
  },
  {
    path: 'admin',
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
    loadComponent: () => import('./pages/settings/settings').then(m => m.Settings)
  }
];
