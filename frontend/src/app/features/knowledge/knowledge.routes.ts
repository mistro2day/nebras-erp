import { Routes } from '@angular/router';

export const KNOWLEDGE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./knowledge-base.component').then((m) => m.KnowledgeBaseComponent),
  },
];
