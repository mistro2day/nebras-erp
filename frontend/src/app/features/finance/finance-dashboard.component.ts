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
          <mat-icon>verified_user</mat-icon>
          <span>حالة النظام: <strong>{{ stats().fiscal_status || 'مستقر ونشط' }}</strong></span>
        </div>
      </header>

      <!-- KPI Widgets Grid -->
      <div class="kpi-grid">
        <div class="kpi-card assets">
          <div class="header">
            <h3>إجمالي الأصول</h3>
            <mat-icon>account_balance</mat-icon>
          </div>
          <p class="value">{{ stats().total_assets | number:'1.2-2' }} ر.س</p>
          <span class="subtext">السيولة النقدية + الأصول الثابتة</span>
        </div>

        <div class="kpi-card liabilities">
          <div class="header">
            <h3>الالتزامات والخصوم</h3>
            <mat-icon>trending_down</mat-icon>
          </div>
          <p class="value">{{ stats().total_liabilities | number:'1.2-2' }} ر.س</p>
          <span class="subtext">المستحقات + الديون قصيرة الأجل</span>
        </div>

        <div class="kpi-card revenue">
          <div class="header">
            <h3>الإيرادات الإجمالية</h3>
            <mat-icon>trending_up</mat-icon>
          </div>
          <p class="value">{{ stats().revenue | number:'1.2-2' }} ر.س</p>
          <span class="subtext">مقبوضات الرسوم والمصادر الأخرى</span>
        </div>

        <div class="kpi-card expenses">
          <div class="header">
            <h3>المصروفات التشغيلية</h3>
            <mat-icon>payments</mat-icon>
          </div>
          <p class="value">{{ stats().expenses | number:'1.2-2' }} ر.س</p>
          <span class="subtext">المرتبات والمصاريف الإدارية</span>
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
              <mat-icon>warning</mat-icon>
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
                <mat-icon [ngClass]="p.status">lock</mat-icon>
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
      padding: 2rem;
      font-family: 'Cairo', sans-serif;
      background: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
    }
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 1.5rem;
    }
    .dashboard-header h1 {
      font-size: 2.2rem;
      font-weight: 800;
      background: linear-gradient(to left, #3b82f6, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }
    .dashboard-header p { color: #94a3b8; margin: 6px 0 0; }
    .fiscal-status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(59, 130, 246, 0.12);
      color: #60a5fa;
      padding: 8px 16px;
      border-radius: 12px;
      border: 1px solid rgba(59, 130, 246, 0.2);
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .kpi-card {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }
    .kpi-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.2);
    }
    .kpi-card .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      color: #94a3b8;
    }
    .kpi-card h3 { font-size: 0.85rem; margin: 0; }
    .kpi-card .value { font-size: 1.8rem; font-weight: bold; margin: 0 0 8px 0; }
    .kpi-card .subtext { font-size: 0.75rem; color: #64748b; }

    .kpi-card.assets { border-right: 4px solid #3b82f6; }
    .kpi-card.assets mat-icon { color: #3b82f6; }
    .kpi-card.liabilities { border-right: 4px solid #ef4444; }
    .kpi-card.liabilities mat-icon { color: #ef4444; }
    .kpi-card.revenue { border-right: 4px solid #10b981; }
    .kpi-card.revenue mat-icon { color: #10b981; }
    .kpi-card.expenses { border-right: 4px solid #f59e0b; }
    .kpi-card.expenses mat-icon { color: #f59e0b; }

    /* Secondary Grid */
    .secondary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }
    .stat-box {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1.5rem;
    }
    .stat-box h4 { margin: 0 0 1rem 0; font-size: 0.95rem; color: #94a3b8; }
    .progress-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #cbd5e1;
      margin-bottom: 8px;
    }
    .alert-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .alert-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      padding: 8px 12px;
      border-radius: 8px;
    }
    .alert-item.warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .alert-item.info { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }

    /* Tabs */
    .finance-tabs {
      background: #1e293b;
      border-radius: 16px;
      padding: 1.5rem;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .tab-content { padding: 2rem 0 1rem 0; }
    .coa-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .coa-controls h2 { margin: 0; font-size: 1.2rem; }

    .finance-table {
      width: 100%;
      background: #1e293b;
      color: #f8fafc;
    }
    .mat-mdc-header-cell {
      color: #94a3b8 !important;
      font-weight: bold;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    }
    .mat-mdc-cell {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      color: #cbd5e1 !important;
      padding: 12px 16px !important;
    }
    .en-name { color: #64748b; font-size: 0.85rem; margin-right: 8px; }

    /* Panels & Forms */
    .add-account-panel, .journal-editor-panel {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .form-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .form-actions {
      display: flex;
      gap: 12px;
    }

    /* Badges */
    .type-badge {
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
    }
    .type-badge.debit { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .type-badge.credit { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .status-badge {
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
    }
    .status-badge.active, .status-badge.posted { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .status-badge.draft { background: rgba(148, 163, 184, 0.15); color: #cbd5e1; }
    .status-badge.approved { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .status-badge.reversed { background: rgba(239, 68, 68, 0.15); color: #f87171; }

    /* Journal Editor */
    .journal-line-row {
      display: flex;
      gap: 1rem;
      align-items: center;
      margin-bottom: 8px;
    }
    .editor-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
    }
    .balance-summary {
      font-size: 0.9rem;
      color: #94a3b8;
    }
    .balance-summary.balanced { color: #34d399; }
    .balance-summary.unbalanced { color: #f87171; }

    /* Ledger & Filters */
    .ledger-filters {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .debit-text { color: #60a5fa; font-weight: 500; }
    .credit-text { color: #34d399; font-weight: 500; }

    /* Periods Grid */
    .periods-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }
    .period-card {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
    }
    .period-card mat-icon { font-size: 32px; width: 32px; height: 32px; }
    .period-card mat-icon.open { color: #34d399; }
    .period-card mat-icon.closed { color: #f87171; }
    .period-card .status { font-size: 0.8rem; font-weight: bold; }
    .period-card .status.open { color: #34d399; }
    .period-card .status.closed { color: #f87171; }
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
