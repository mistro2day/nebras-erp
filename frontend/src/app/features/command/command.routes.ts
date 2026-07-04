import { Routes } from '@angular/router';

export const COMMAND_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'palette',
    pathMatch: 'full'
  },
  {
    path: 'palette',
    loadComponent: () => import('./command-palette/command-palette.component').then(m => m.CommandPaletteComponent)
  }
];
