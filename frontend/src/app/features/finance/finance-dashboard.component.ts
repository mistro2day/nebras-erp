import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FinanceService } from './finance.service';

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule,
    MatTableModule, MatTabsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDialogModule, MatProgressBarModule
  ],
  template: `
    <div class="finance-dashboard" dir="rtl">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-info">
          <h1>المنصة المالية وإدارة دفتر الأستاذ العام</h1>
          <p>بوابة العمليات الحسابية المزدوجة، شجرة الحسابات، الموازنات التقديرية، والرقابة المالية للمؤسسة</p>
        </div>
        <div class="fiscal-status-badge">
          <span class="nb-dot success"></span>
          <span>حالة النظام: <strong>{{ stats().fiscal_status || 'مستقر ونشط' }}</strong></span>
        </div>
      </header>

      <!-- KPI Widgets Grid -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">إجمالي الأصول</span>
          <span class="kpi-value">{{ stats().total_assets | number:'1.2-2' }} <span class="kpi-unit">ر.س</span></span>
          <span class="kpi-sub">السيولة النقدية + الأصول الثابتة</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">الالتزامات والخصوم</span>
          <span class="kpi-value">{{ stats().total_liabilities | number:'1.2-2' }} <span class="kpi-unit">ر.س</span></span>
          <span class="kpi-sub">المستحقات + الديون قصيرة الأجل</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">الإيرادات الإجمالية</span>
          <span class="kpi-value">{{ stats().revenue | number:'1.2-2' }} <span class="kpi-unit">ر.س</span></span>
          <span class="kpi-sub">مقبوضات الرسوم والمصادر الأخرى</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">المصروفات التشغيلية</span>
          <span class="kpi-value">{{ stats().expenses | number:'1.2-2' }} <span class="kpi-unit">ر.س</span></span>
          <span class="kpi-sub">المرتبات والمصاريف الإدارية</span>
        </div>
      </div>

      <!-- Secondary Stats & Liquidity -->
      <div class="secondary-grid">
        <div class="stat-box">
          <h4>السيولة والخزائن</h4>
          <div class="progress-info">
            <span>الخزينة النقدية: {{ stats().cash_balance | number:'1.2-2' }} ر.س</span>
            <span>الحسابات البنكية: {{ stats().bank_balance | number:'1.2-2' }} ر.س</span>
          </div>
          <mat-progress-bar mode="determinate" [value]="40" color="primary"></mat-progress-bar>
        </div>

        <div class="stat-box">
          <h4>استهلاك الموازنة التقديرية</h4>
          <div class="progress-info">
            <span>المنفق: {{ stats().budget_consumed | number:'1.2-2' }} ر.س</span>
            <span>المرصود: {{ stats().budget_allocated | number:'1.2-2' }} ر.س</span>
          </div>
          <mat-progress-bar mode="determinate" [value]="stats().budget_utilization_rate || 0" color="accent"></mat-progress-bar>
        </div>

        <div class="stat-box alerts">
          <h4>التنبيهات المالية النشطة</h4>
          <div class="alert-list">
            <div class="alert-item" *ngFor="let alert of stats().alerts" [ngClass]="alert.type">
              <span class="nb-dot" [class.warning]="alert.type === 'warning'" [class.info]="alert.type === 'info'"></span>
              <span>{{ alert.message }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Tabs Group -->
      <mat-tab-group class="finance-tabs">
        <!-- Tab 1: Chart of Accounts (COA) -->
        <mat-tab label="شجرة الحسابات">
          <div class="tab-content">
            <div class="coa-controls">
              <h2>هيكل الحسابات المعتمد</h2>
              <button mat-flat-button color="primary" (click)="showAddAccount = !showAddAccount">
                <mat-icon>add</mat-icon> إضافة حساب جديد
              </button>
            </div>

            <!-- Add Account Panel -->
            <div class="add-account-panel" *ngIf="showAddAccount">
              <h3>إضافة حساب جديد في الشجرة</h3>
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>رمز الحساب</mat-label>
                  <input matInput [(ngModel)]="newAccount.code" placeholder="مثال: 1102" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>الاسم باللغة العربية</mat-label>
                  <input matInput [(ngModel)]="newAccount.name_ar" placeholder="مثال: بنك الراجحي" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>الاسم باللغة الإنجليزية</mat-label>
                  <input matInput [(ngModel)]="newAccount.name_en" placeholder="مثال: Al Rajhi Bank" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>نوع الحساب</mat-label>
                  <mat-select [(ngModel)]="newAccount.account_type">
                    <mat-option *ngFor="let type of accountTypes()" [value]="type.id">{{ type.name_ar }}</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>الحساب الأب (إن وجد)</mat-label>
                  <mat-select [(ngModel)]="newAccount.parent">
                    <mat-option [value]="null">حساب رئيسي</mat-option>
                    <mat-option *ngFor="let acc of coa()" [value]="acc.id">{{ acc.code }} - {{ acc.name_ar }}</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
              <div class="form-actions">
                <button mat-flat-button color="accent" (click)="saveAccount()">حفظ الحساب</button>
                <button mat-button (click)="showAddAccount = false">إلغاء</button>
              </div>
            </div>

            <!-- COA Table / Tree -->
            <table mat-table [dataSource]="coa()" class="mat-elevation-z8 finance-table">
              <ng-container matColumnDef="code">
                <th mat-header-cell *matHeaderCellDef>الرمز الحسابي</th>
                <td mat-cell *matCellDef="let element">{{ element.code }}</td>
              </ng-container>

              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>اسم الحساب (عربي / إنجليزي)</th>
                <td mat-cell *matCellDef="let element">
                  <strong>{{ element.name_ar }}</strong> <span class="en-name">({{ element.name_en }})</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="type">
                <th mat-header-cell *matHeaderCellDef>طبيعة الحساب</th>
                <td mat-cell *matCellDef="let element">
                  <span class="type-badge" [ngClass]="element.normal_balance">
                    {{ element.normal_balance === 'debit' ? 'مدين (Debit)' : 'دائن (Credit)' }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>الحالة</th>
                <td mat-cell *matCellDef="let element">
                  <span class="status-badge" [ngClass]="element.status">{{ element.status === 'active' ? 'نشط' : 'غير نشط' }}</span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="coaColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: coaColumns;"></tr>
            </table>
          </div>
        </mat-tab>

        <!-- Tab 2: Journal Entries (Editor & Approvals) -->
        <mat-tab label="قيود اليومية والاعتمادات">
          <div class="tab-content">
            <div class="coa-controls">
              <h2>قيود اليومية الدفترية</h2>
              <button mat-flat-button color="primary" (click)="toggleJournalEditor()">
                <mat-icon>post_add</mat-icon> إنشاء قيد يومية يدوي جديد
              </button>
            </div>

            <!-- Journal Editor Panel -->
            <div class="journal-editor-panel" *ngIf="showJournalEditor">
              <h3>محرر قيود اليومية الثنائية</h3>
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>رقم القيد</mat-label>
                  <input matInput [(ngModel)]="newJournal.entry_number" placeholder="مثال: JV-100" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>التاريخ</mat-label>
                  <input matInput type="date" [(ngModel)]="newJournal.date" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>الفترة المحاسبية</mat-label>
                  <mat-select [(ngModel)]="newJournal.accounting_period">
                    <mat-option *ngFor="let p of periods()" [value]="p.id">{{ p.name }}</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>الوصف / البيان</mat-label>
                  <input matInput [(ngModel)]="newJournal.description" />
                </mat-form-field>
              </div>

              <!-- Lines -->
              <h4>تفاصيل أسطر القيد الحسابي</h4>
              <div class="journal-line-row" *ngFor="let line of newJournal.lines; let i = index">
                <mat-form-field appearance="outline" style="width: 30%">
                  <mat-label>الحساب</mat-label>
                  <mat-select [(ngModel)]="line.account">
                    <mat-option *ngFor="let acc of coa()" [value]="acc.id">{{ acc.code }} - {{ acc.name_ar }}</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" style="width: 20%">
                  <mat-label>المدين (Debit)</mat-label>
                  <input matInput type="number" [(ngModel)]="line.debit" (ngModelChange)="checkBalance()" />
                </mat-form-field>
                <mat-form-field appearance="outline" style="width: 20%">
                  <mat-label>الدائن (Credit)</mat-label>
                  <input matInput type="number" [(ngModel)]="line.credit" (ngModelChange)="checkBalance()" />
                </mat-form-field>
                <mat-form-field appearance="outline" style="width: 20%">
                  <mat-label>مركز التكلفة</mat-label>
                  <mat-select [(ngModel)]="line.cost_center">
                    <mat-option *ngFor="let cc of costCenters()" [value]="cc.id">{{ cc.name_ar }}</mat-option>
                  </mat-select>
                </mat-form-field>
                <button mat-icon-button color="warn" (click)="removeJournalLine(i)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>

              <div class="editor-actions">
                <button mat-stroked-button (click)="addJournalLine()">
                  <mat-icon>add</mat-icon> إضافة سطر حسابي
                </button>
                <div class="balance-summary" [ngClass]="isBalanced ? 'balanced' : 'unbalanced'">
                  <span>إجمالي المدين: {{ totalDebit }} ر.س</span> | 
                  <span>إجمالي الدائن: {{ totalCredit }} ر.س</span> | 
                  <span>حالة القيد: <strong>{{ isBalanced ? 'متزن' : 'غير متزن' }}</strong></span>
                </div>
              </div>

              <div class="form-actions" style="margin-top: 1.5rem;">
                <button mat-flat-button color="accent" [disabled]="!isBalanced" (click)="saveJournal()">حفظ القيد كمسودة</button>
                <button mat-button (click)="showJournalEditor = false">إلغاء</button>
              </div>
            </div>

            <!-- Journals List Table -->
            <table mat-table [dataSource]="journals()" class="mat-elevation-z8 finance-table">
              <ng-container matColumnDef="number">
                <th mat-header-cell *matHeaderCellDef>رقم القيد</th>
                <td mat-cell *matCellDef="let element"><strong>{{ element.entry_number }}</strong></td>
              </ng-container>

              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>التاريخ</th>
                <td mat-cell *matCellDef="let element">{{ element.date }}</td>
              </ng-container>

              <ng-container matColumnDef="description">
                <th mat-header-cell *matHeaderCellDef>البيان / الوصف</th>
                <td mat-cell *matCellDef="let element">{{ element.description }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>الحالة</th>
                <td mat-cell *matCellDef="let element">
                  <span class="status-badge" [ngClass]="element.status">
                    {{ getStatusLabel(element.status) }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>إجراءات الترحيل والاعتماد</th>
                <td mat-cell *matCellDef="let element">
                  <div class="action-buttons">
                    <button mat-flat-button color="primary" *ngIf="element.status === 'draft'" (click)="approveJournal(element.id)">اعتماد</button>
                    <button mat-flat-button color="accent" *ngIf="element.status === 'approved'" (click)="postJournal(element.id)">ترحيل لدفتر الأستاذ</button>
                    <button mat-stroked-button color="warn" *ngIf="element.status === 'posted'" (click)="reverseJournal(element.id)">عكس القيد</button>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="journalColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: journalColumns;"></tr>
            </table>
          </div>
        </mat-tab>

        <!-- Tab 3: General Ledger (دفتر الأستاذ) -->
        <mat-tab label="دفتر الأستاذ العام">
          <div class="tab-content">
            <div class="ledger-filters">
              <mat-form-field appearance="outline">
                <mat-label>تصفية بحسب الحساب</mat-label>
                <mat-select [(ngModel)]="filterAccount" (selectionChange)="loadLedgerEntries()">
                  <mat-option [value]="''">جميع الحسابات</mat-option>
                  <mat-option *ngFor="let acc of coa()" [value]="acc.id">{{ acc.code }} - {{ acc.name_ar }}</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>مركز التكلفة</mat-label>
                <mat-select [(ngModel)]="filterCostCenter" (selectionChange)="loadLedgerEntries()">
                  <mat-option [value]="''">جميع المراكز</mat-option>
                  <mat-option *ngFor="let cc of costCenters()" [value]="cc.id">{{ cc.name_ar }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Ledger Table -->
            <table mat-table [dataSource]="ledgerEntries()" class="mat-elevation-z8 finance-table">
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>التاريخ</th>
                <td mat-cell *matCellDef="let element">{{ element.date }}</td>
              </ng-container>

              <ng-container matColumnDef="account">
                <th mat-header-cell *matHeaderCellDef>الحساب</th>
                <td mat-cell *matCellDef="let element">{{ element.account_code }} - {{ element.account_name }}</td>
              </ng-container>

              <ng-container matColumnDef="debit">
                <th mat-header-cell *matHeaderCellDef>المدين (Debit)</th>
                <td mat-cell *matCellDef="let element" class="debit-text">{{ element.debit > 0 ? (element.debit | number:'1.2-2') : '-' }}</td>
              </ng-container>

              <ng-container matColumnDef="credit">
                <th mat-header-cell *matHeaderCellDef>الدائن (Credit)</th>
                <td mat-cell *matCellDef="let element" class="credit-text">{{ element.credit > 0 ? (element.credit | number:'1.2-2') : '-' }}</td>
              </ng-container>

              <ng-container matColumnDef="balance">
                <th mat-header-cell *matHeaderCellDef>الرصيد التراكمي</th>
                <td mat-cell *matCellDef="let element"><strong>{{ element.balance_snapshot | number:'1.2-2' }} ر.س</strong></td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="ledgerColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: ledgerColumns;"></tr>
            </table>
          </div>
        </mat-tab>

        <!-- Tab 4: Fiscal Closings & Settings (إغلاق الفترات والسنوات) -->
        <mat-tab label="الفترات المالية والإغلاق">
          <div class="tab-content">
            <h2>إدارة إغلاق الفترات المحاسبية المقفلة</h2>
            <div class="periods-grid">
              <div class="period-card" *ngFor="let p of periods()">
                <span class="period-lock" [ngClass]="p.status">🔒</span>
                <div class="meta">
                  <h3>{{ p.name }}</h3>
                  <p>تاريخ البدء: {{ p.start_date }} - النهاية: {{ p.end_date }}</p>
                  <span class="status" [ngClass]="p.status">الحالة: {{ p.status === 'open' ? 'مفتوحة للتسجيل' : 'مغلقة ومقفلة' }}</span>
                </div>
                <button mat-flat-button color="warn" *ngIf="p.status === 'open'" (click)="closePeriod(p.id)">
                  إغلاق وقفل الفترة
                </button>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .finance-dashboard {
      flex: 1;
      padding: 20px;
      min-width: 0;
      overflow-y: auto;
      background: var(--nb-bg);
      color: var(--nb-text);
    }
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .dashboard-header h1 {
      font-size: 18px;
      font-weight: 700;
      color: var(--nb-text);
      margin: 0;
    }
    .dashboard-header p { color: var(--nb-text-muted); margin: 4px 0 0; font-size: 12px; }
    .fiscal-status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--nb-surface);
      color: var(--nb-text-secondary);
      font-size: 12px;
      padding: 7px 12px;
      border-radius: var(--nb-radius);
      border: 1px solid var(--nb-border);
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .kpi-card {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .kpi-label { font-size: 12px; color: var(--nb-text-muted); }
    .kpi-value { font-size: 20px; font-weight: 700; color: var(--nb-text); }
    .kpi-unit { font-size: 12px; font-weight: 500; color: var(--nb-text-muted); }
    .kpi-sub { font-size: 11px; color: var(--nb-text-faint); }

    /* Secondary Grid */
    .secondary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .stat-box {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 16px;
    }
    .stat-box h4 { margin: 0 0 12px 0; font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .progress-info {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--nb-text-secondary);
      margin-bottom: 8px;
    }
    .alert-list { display: flex; flex-direction: column; gap: 8px; }
    .alert-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--nb-text-secondary);
    }

    /* Tabs */
    .finance-tabs {
      background: var(--nb-surface);
      border-radius: var(--nb-radius-card);
      border: 1px solid var(--nb-border);
      padding: 8px 16px 16px;
    }
    .tab-content { padding: 16px 0 4px; }
    .coa-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .coa-controls h2 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-text); }

    .finance-table { width: 100%; background: var(--nb-surface); }
    ::ng-deep .finance-table .mat-mdc-header-cell {
      color: var(--nb-text-muted) !important;
      font-weight: 700;
      font-size: 11px;
      background: var(--nb-surface-raised);
      border-bottom: 1px solid var(--nb-border-soft) !important;
    }
    ::ng-deep .finance-table .mat-mdc-cell {
      border-bottom: 1px solid var(--nb-border-row) !important;
      color: var(--nb-text) !important;
      font-size: 13px;
      padding: 9px 16px !important;
    }
    ::ng-deep .finance-table .mat-mdc-row:hover .mat-mdc-cell { background: var(--nb-surface-raised); }
    .en-name { color: var(--nb-text-muted); font-size: 12px; margin-right: 8px; }

    /* Panels & Forms */
    .add-account-panel, .journal-editor-panel {
      background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 16px;
      margin-bottom: 16px;
    }
    .add-account-panel h3, .journal-editor-panel h3 { margin: 0 0 12px; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .journal-editor-panel h4 { font-size: 13px; font-weight: 700; color: var(--nb-text); margin: 12px 0 8px; }
    .form-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 12px;
    }
    .form-actions { display: flex; gap: 12px; }

    /* Badges */
    .type-badge, .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: var(--nb-radius-sm);
      font-size: 11px;
      font-weight: 600;
    }
    .type-badge.debit { background: var(--nb-info-bg); color: var(--nb-info); }
    .type-badge.credit { background: var(--nb-success-bg); color: var(--nb-success); }
    .status-badge.active, .status-badge.posted { background: var(--nb-success-bg); color: var(--nb-success); }
    .status-badge.draft { background: var(--nb-bg); color: var(--nb-text-secondary); }
    .status-badge.approved { background: var(--nb-info-bg); color: var(--nb-info); }
    .status-badge.reversed { background: var(--nb-danger-bg); color: var(--nb-danger); }

    /* Journal Editor */
    .journal-line-row { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; }
    .editor-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
    }
    .balance-summary { font-size: 13px; color: var(--nb-text-muted); }
    .balance-summary.balanced { color: var(--nb-success); }
    .balance-summary.unbalanced { color: var(--nb-danger); }

    /* Ledger & Filters */
    .ledger-filters { display: flex; gap: 16px; margin-bottom: 16px; }
    .debit-text { color: var(--nb-info); font-weight: 500; }
    .credit-text { color: var(--nb-success); font-weight: 500; }

    /* Periods Grid */
    .periods-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .period-card {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 10px;
    }
    .period-lock { font-size: 26px; }
    .period-card .meta h3 { font-size: 13px; font-weight: 700; color: var(--nb-text); margin: 0; }
    .period-card .meta p { font-size: 12px; color: var(--nb-text-muted); margin: 4px 0; }
    .period-card .status { font-size: 12px; font-weight: 700; }
    .period-card .status.open { color: var(--nb-success); }
    .period-card .status.closed { color: var(--nb-danger); }
  `]
})
export class FinanceDashboardComponent implements OnInit {
  private service = inject(FinanceService);

  stats = signal<any>({ alerts: [] });
  coa = signal<any[]>([]);
  journals = signal<any[]>([]);
  periods = signal<any[]>([]);
  costCenters = signal<any[]>([]);
  ledgerEntries = signal<any[]>([]);
  accountTypes = signal<any[]>([]);

  filterAccount = '';
  filterCostCenter = '';

  showAddAccount = false;
  showJournalEditor = false;

  newAccount = { code: '', name_ar: '', name_en: '', account_type: '', parent: null as string | null };
  newJournal = {
    entry_number: '',
    date: new Date().toISOString().split('T')[0],
    accounting_period: '',
    description: '',
    lines: [] as any[]
  };

  totalDebit = 0;
  totalCredit = 0;
  isBalanced = false;

  coaColumns = ['code', 'name', 'type', 'status'];
  journalColumns = ['number', 'date', 'description', 'status', 'actions'];
  ledgerColumns = ['date', 'account', 'debit', 'credit', 'balance'];

  ngOnInit() {
    this.loadDashboard();
    this.loadCOA();
    this.loadJournals();
    this.loadPeriods();
    this.loadCostCenters();
    this.loadLedgerEntries();
    
    this.service.getAccountTypes().subscribe(res => {
      if (res.success) this.accountTypes.set(res.data);
    });
  }

  loadDashboard() {
    this.service.getDashboardData().subscribe(res => {
      if (res.success) this.stats.set(res.data);
    });
  }

  loadCOA() {
    this.service.getCOA().subscribe(res => {
      if (res.success) this.coa.set(res.data);
    });
  }

  loadJournals() {
    this.service.getJournals().subscribe(res => {
      if (res.success) this.journals.set(res.data);
    });
  }

  loadPeriods() {
    this.service.getPeriods().subscribe(res => {
      if (res.success) this.periods.set(res.data);
    });
  }

  loadCostCenters() {
    this.service.getCostCenters().subscribe(res => {
      if (res.success) this.costCenters.set(res.data);
    });
  }

  loadLedgerEntries() {
    this.service.getLedgerEntries(this.filterAccount, this.filterCostCenter).subscribe(res => {
      if (res.success) this.ledgerEntries.set(res.data);
    });
  }

  saveAccount() {
    this.service.createAccount(this.newAccount).subscribe(res => {
      if (res.success) {
        this.loadCOA();
        this.showAddAccount = false;
        this.newAccount = { code: '', name_ar: '', name_en: '', account_type: '', parent: null };
      }
    });
  }

  toggleJournalEditor() {
    this.showJournalEditor = !this.showJournalEditor;
    if (this.showJournalEditor && this.newJournal.lines.length === 0) {
      this.addJournalLine();
      this.addJournalLine();
    }
  }

  addJournalLine() {
    this.newJournal.lines.push({ account: '', debit: 0, credit: 0, cost_center: null });
    this.checkBalance();
  }

  removeJournalLine(index: number) {
    this.newJournal.lines.splice(index, 1);
    this.checkBalance();
  }

  checkBalance() {
    this.totalDebit = this.newJournal.lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    this.totalCredit = this.newJournal.lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    this.isBalanced = this.totalDebit > 0 && Math.abs(this.totalDebit - this.totalCredit) < 0.01;
  }

  saveJournal() {
    const defaultCurrency = 'SAR'; // مثال للعملة الأساسية
    this.service.getCurrencies().subscribe(currRes => {
      const baseCurr = currRes.data?.find((c: any) => c.is_base) || currRes.data?.[0];
      const payload = {
        ...this.newJournal,
        currency: baseCurr?.id,
        exchange_rate: 1.0
      };
      this.service.createJournal(payload).subscribe(res => {
        if (res.success) {
          this.loadJournals();
          this.showJournalEditor = false;
          this.newJournal = {
            entry_number: '',
            date: new Date().toISOString().split('T')[0],
            accounting_period: '',
            description: '',
            lines: []
          };
          this.totalDebit = 0;
          this.totalCredit = 0;
          this.isBalanced = false;
        }
      });
    });
  }

  approveJournal(id: string) {
    this.service.approveJournal(id).subscribe(() => this.loadJournals());
  }

  postJournal(id: string) {
    this.service.postJournal(id).subscribe(() => {
      this.loadJournals();
      this.loadLedgerEntries();
      this.loadDashboard();
    });
  }

  reverseJournal(id: string) {
    this.service.reverseJournal(id).subscribe(() => {
      this.loadJournals();
      this.loadLedgerEntries();
      this.loadDashboard();
    });
  }

  closePeriod(id: string) {
    this.service.closePeriod(id).subscribe(() => this.loadPeriods());
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'draft': 'مسودة',
      'approved': 'معتمد',
      'posted': 'مرحل',
      'cancelled': 'ملغي',
      'reversed': 'معكوس'
    };
    return labels[status] || status;
  }
}
