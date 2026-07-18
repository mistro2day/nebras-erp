import { Routes } from '@angular/router';

export const INVENTORY_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./inventory-dashboard.component').then((m) => m.InventoryDashboardComponent),
  },
  {
    path: 'items',
    loadComponent: () => import('./items/inventory-items.component').then((m) => m.InventoryItemsComponent),
  },
  {
    path: 'warehouses',
    loadComponent: () => import('./warehouses/warehouses.component').then((m) => m.WarehousesComponent),
  },
  {
    path: 'movements',
    loadComponent: () => import('./movements/stock-movements.component').then((m) => m.StockMovementsComponent),
  },
  {
    path: 'receipts',
    loadComponent: () => import('./receipts/goods-receipts.component').then((m) => m.GoodsReceiptsComponent),
  },
];
