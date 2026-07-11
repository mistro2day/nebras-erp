import { Routes } from '@angular/router';

/**
 * مسارات النظام المالي (Finance & General Ledger)
 * بنية متعددة الصفحات على غرار Odoo Accounting و Microsoft Dynamics 365 Finance،
 * حيث تمثل لوحة التحكم مساحة العمل الرئيسية وتتفرع منها صفحات مستقلة لكل عملية محاسبية.
 */
export const FINANCE_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./finance-dashboard.component').then((m) => m.FinanceDashboardComponent),
  },
  {
    path: 'coa',
    loadComponent: () => import('./coa/chart-of-accounts.component').then((m) => m.ChartOfAccountsComponent),
  },
  {
    path: 'journals',
    loadComponent: () => import('./journals/journal-entries.component').then((m) => m.JournalEntriesComponent),
  },
  {
    path: 'ledger',
    loadComponent: () => import('./ledger/general-ledger.component').then((m) => m.GeneralLedgerComponent),
  },
  {
    path: 'vouchers',
    loadComponent: () => import('./vouchers/vouchers.component').then((m) => m.VouchersComponent),
  },
  {
    path: 'banking',
    loadComponent: () => import('./banking/banking.component').then((m) => m.BankingComponent),
  },
  {
    path: 'cost-centers',
    loadComponent: () => import('./cost-centers/cost-centers.component').then((m) => m.CostCentersComponent),
  },
  {
    path: 'budgets',
    loadComponent: () => import('./budgets/budgets.component').then((m) => m.BudgetsComponent),
  },
  {
    path: 'taxes',
    loadComponent: () => import('./taxes/taxes.component').then((m) => m.TaxesComponent),
  },
  {
    path: 'currencies',
    loadComponent: () => import('./currencies/currencies.component').then((m) => m.CurrenciesComponent),
  },
  {
    path: 'fiscal',
    loadComponent: () => import('./fiscal/fiscal-periods.component').then((m) => m.FiscalPeriodsComponent),
  },
  {
    path: 'setup',
    loadComponent: () => import('./setup/finance-setup.component').then((m) => m.FinanceSetupComponent),
  },
];
