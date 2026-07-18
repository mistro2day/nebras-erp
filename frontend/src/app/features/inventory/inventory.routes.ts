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
    path: 'warehouses/:id',
    loadComponent: () => import('./warehouses/warehouse-detail.component').then((m) => m.WarehouseDetailComponent),
  },
  {
    path: 'movements',
    loadComponent: () => import('./movements/stock-movements.component').then((m) => m.StockMovementsComponent),
  },
  {
    path: 'receipts',
    loadComponent: () => import('./receipts/goods-receipts.component').then((m) => m.GoodsReceiptsComponent),
  },
  {
    path: 'receipts/new/:id',
    loadComponent: () => import('./receipts/receive-po.component').then((m) => m.ReceivePoComponent),
  },
  {
    path: 'issues',
    loadComponent: () => import('./issues/goods-issues.component').then((m) => m.GoodsIssuesComponent),
  },
  {
    path: 'transfers',
    loadComponent: () => import('./transfers/transfers.component').then((m) => m.InventoryTransfersComponent),
  },
  {
    path: 'counts',
    loadComponent: () => import('./counts/stock-counts.component').then((m) => m.StockCountsComponent),
  },
  {
    path: 'setup',
    loadComponent: () => import('./setup/inventory-setup.component').then((m) => m.InventorySetupComponent),
  },
];
