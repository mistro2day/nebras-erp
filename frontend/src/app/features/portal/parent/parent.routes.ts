import { Routes } from '@angular/router';
import { ParentShellComponent } from './parent-shell.component';

/**
 * مسارات بوابة ولي الأمر ضمن قشرتها المستقلة (هاتف أولاً).
 */
export const PARENT_ROUTES: Routes = [
  {
    path: '',
    component: ParentShellComponent,
    children: [
      { path: 'home', loadComponent: () => import('./parent-home.component').then(m => m.ParentHomeComponent) },
      { path: 'child/:id', loadComponent: () => import('./parent-child.component').then(m => m.ParentChildComponent) },
      { path: 'pay/:id', loadComponent: () => import('./parent-pay.component').then(m => m.ParentPayComponent) },
      { path: 'payments', loadComponent: () => import('./parent-payments.component').then(m => m.ParentPaymentsComponent) },
      { path: 'messages', loadComponent: () => import('./parent-messages.component').then(m => m.ParentMessagesComponent) },
      { path: 'profile', loadComponent: () => import('./parent-profile.component').then(m => m.ParentProfileComponent) },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
];
