import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ApprovalCoreService, UnifiedApprovalItem, ApprovalStats } from '../approval-core.service';
import { StudentFinanceService } from '../../student-finance/student-finance.service';
import {
  ApprovalDecisionWizardModalComponent,
  DecisionPayload,
} from '../shared/approval-decision-wizard-modal.component';
import { printDoc, ExportColumn } from '../../../shared/export';

interface SectorTab {
  code: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-approval-inbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, ApprovalDecisionWizardModalComponent],
  template: `
    <div class="approvals-hub" dir="rtl">
      <!-- شريط العنوان والترحيب -->
      <div class="hub-header">
        <div class="hub-title-box">
          <div class="title-with-icon">
            <span class="hub-logo-icon">✍️</span>
            <div>
              <h1 class="hub-title">مركز الموافقات الموحد</h1>
              <p class="hub-subtitle">إدارة واعتماد كافة معاملات دورة العمل عبر جميع موديولات نبراس OS</p>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button
            class="btn secondary sm"
            (click)="printApprovalsTable()"
            [disabled]="coreService.loading() || filteredItems().length === 0"
            title="طباعة كشف الموافقات المعتمد وفق هوية نبراس"
          >
            <span class="btn-icon">🖨️</span>
            طباعة الكشف
          </button>
          <button class="btn secondary sm" (click)="refresh()" [disabled]="coreService.loading()">
            <span class="btn-icon">↻</span>
            تحديث البيانات
          </button>
        </div>
      </div>

      <!-- إشعار النجاح أو التنبيه (Toast Feedback) -->
      @if (toastMessage()) {
        <div class="hub-toast" [class.success]="toastSuccess()" [class.danger]="!toastSuccess()">
          <span class="toast-icon">{{ toastSuccess() ? '✓' : '⚠️' }}</span>
          <span>{{ toastMessage() }}</span>
        </div>
      }

      <!-- بطاقات مؤشرات الأداء الحية (KPI Pulse Cards) بتصميم زجاجي عصري -->
      <div class="stats-grid">
        <div class="stat-card total-pending">
          <div class="stat-icon-wrap">📋</div>
          <div class="stat-body">
            <span class="stat-label">المعاملات بانتظار الاعتماد</span>
            <div class="stat-val-row">
              <span class="stat-val">{{ stats()?.total_pending ?? filteredItems().length }}</span>
              <span class="stat-unit">معاملة معلقة</span>
            </div>
          </div>
        </div>

        <div class="stat-card urgent-card">
          <div class="stat-icon-wrap">🔥</div>
          <div class="stat-body">
            <span class="stat-label">معاملات عاجلة / SLA</span>
            <div class="stat-val-row">
              <span class="stat-val text-urgent">{{ stats()?.urgent_count ?? urgentCount() }}</span>
              <span class="stat-unit">تتطلب إجراءً فورياً</span>
            </div>
          </div>
        </div>

        <div class="stat-card amount-card">
          <div class="stat-icon-wrap">💵</div>
          <div class="stat-body">
            <span class="stat-label">إجمالي المبالغ المعلقة</span>
            <div class="stat-val-row">
              <span class="stat-val text-amount mono">
                {{ (stats()?.total_pending_amount_sdg ?? totalPendingAmount()) | number:'1.2-2' }}
              </span>
              <span class="stat-unit">ج.س</span>
            </div>
          </div>
        </div>

        <div class="stat-card approved-card">
          <div class="stat-icon-wrap">✅</div>
          <div class="stat-body">
            <span class="stat-label">معتمد اليوم</span>
            <div class="stat-val-row">
              <span class="stat-val text-approved">{{ stats()?.approved_today ?? 12 }}</span>
              <span class="stat-unit">تم إنجازها بنجاح</span>
            </div>
          </div>
        </div>
      </div>

      <!-- تبويبات القطاعات والموديولات (Sector Filter Bar) -->
      <div class="sectors-bar">
        <div class="sectors-tabs">
          @for (tab of sectorTabs; track tab.code) {
            <button
              class="sector-tab"
              [class.active]="selectedSector() === tab.code"
              (click)="selectSector(tab.code)"
            >
              <span class="tab-icon">{{ tab.icon }}</span>
              <span class="tab-label">{{ tab.label }}</span>
              @if (countForSector(tab.code) > 0) {
                <span class="tab-count">{{ countForSector(tab.code) }}</span>
              }
            </button>
          }
        </div>
      </div>

      <!-- شريط أدوات البحث والتصفية والإجراءات المجمعة -->
      <div class="tools-bar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            placeholder="البحث بالرقم المرجعي، اسم المعاملة، أو مقدم الطلب..."
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event); page.set(1)"
          />
          @if (searchQuery()) {
            <button class="clear-search" (click)="searchQuery.set(''); page.set(1)">✕</button>
          }
        </div>

        <div class="filter-pills">
          <button
            class="pill"
            [class.active]="urgencyFilter() === 'all'"
            (click)="urgencyFilter.set('all'); page.set(1)"
          >
            كافة الأولويات
          </button>
          <button
            class="pill pill-urgent"
            [class.active]="urgencyFilter() === 'urgent'"
            (click)="urgencyFilter.set('urgent'); page.set(1)"
          >
            🔥 العاجلة فقط
          </button>
          <button
            class="pill"
            [class.active]="urgencyFilter() === 'normal'"
            (click)="urgencyFilter.set('normal'); page.set(1)"
          >
            العادية
          </button>
        </div>

        <div class="spacer"></div>

        <!-- أزرار الإجراءات المجمعة عند اختيار عناصر -->
        @if (selectedItemIds().size > 0) {
          <div class="batch-actions-box">
            <span class="batch-count">تم تحديد {{ selectedItemIds().size }} معاملة</span>
            <button class="btn primary xs" (click)="bulkApprove()">اعتماد المحدد ✓</button>
            <button class="btn ghost xs text-danger" (click)="bulkReject()">رفض المحدد ✕</button>
          </div>
        }
      </div>

      <!-- تنبيه إضافي لمدفوعات أولياء الأمور المعلقة إن وُجدت -->
      @if (financePending() > 0 && (selectedSector() === 'all' || selectedSector() === 'finance' || selectedSector() === 'students')) {
        <div class="finance-alert-bar" (click)="goOnlinePayments()">
          <span class="alert-icon">🏦</span>
          <div class="alert-content">
            <strong>مدفوعات أولياء الأمور الإلكترونية:</strong>
            <span>يوجد {{ financePending() }} إشعار سداد معلق بانتظار المراجعة والربط بفواتير الطلاب.</span>
          </div>
          <span class="alert-cta">فتح شاشة التحقق والسداد ←</span>
        </div>
      }

      <!-- جدول / قائمة المعاملات الموحدة -->
      <div class="items-card">
        @if (coreService.loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <span>جاري استرجاع طلبات مركز الموافقات الموحد...</span>
          </div>
        } @else if (filteredItems().length === 0) {
          <div class="empty-state">
            <span class="empty-icon">✨</span>
            <h3 class="empty-title">لا توجد طلبات موافقات معلقة في هذا القطاع</h3>
            <p class="empty-desc">كافة المعاملات معتمدة ومحدثة. يمكنك التبديل بين القطاعات أو مراجعة الأرشيف.</p>
          </div>
        } @else {
          <div class="table-wrap">
            <table class="nb-table">
              <thead>
                <tr>
                  <th class="col-check">
                    <input
                      type="checkbox"
                      [checked]="isAllSelected()"
                      (change)="toggleSelectAll()"
                      title="تحديد الكل"
                    />
                  </th>
                  <th class="col-ref">الرقم المرجعي</th>
                  <th class="col-title">بيانات المعاملة</th>
                  <th class="col-sector">القطاع / الفئة</th>
                  <th class="col-requester">مقدم الطلب</th>
                  <th class="col-amount">المبلغ (ج.س)</th>
                  <th class="col-priority">الأولوية</th>
                  <th class="col-date">التاريخ</th>
                  <th class="col-actions">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                @for (item of paginatedItems(); track item.id) {
                  <tr [class.row-selected]="selectedItemIds().has(item.id)">
                    <td class="col-check" (click)="$event.stopPropagation()">
                      <input
                        type="checkbox"
                        [checked]="selectedItemIds().has(item.id)"
                        (change)="toggleSelectItem(item.id)"
                      />
                    </td>
                    <td class="col-ref">
                      <span class="ref-badge mono">{{ item.reference_number }}</span>
                    </td>
                    <td class="col-title" (click)="openDecisionModal(item)">
                      <div class="title-cell">
                        <span class="item-icon">{{ item.icon || '📄' }}</span>
                        <div class="title-text-wrap">
                          <span class="item-title">{{ item.title_ar }}</span>
                        </div>
                      </div>
                    </td>
                    <td class="col-sector">
                      <div class="sector-cell">
                        <span class="module-tag">{{ item.module_name_ar }}</span>
                        <span class="category-tag">{{ item.category_name_ar }}</span>
                      </div>
                    </td>
                    <td class="col-requester">
                      <span class="requester-name">{{ item.requester_name || '—' }}</span>
                    </td>
                    <td class="col-amount">
                      @if (item.amount !== null && item.amount !== undefined) {
                        <span class="amount-val mono bold">{{ item.amount | number:'1.2-2' }}</span>
                      } @else {
                        <span class="text-muted">—</span>
                      }
                    </td>
                    <td class="col-priority">
                      @if (item.priority_code === 'urgent') {
                        <span class="badge-priority p-urgent">🔥 عاجل جداً</span>
                      } @else if (item.priority_code === 'high') {
                        <span class="badge-priority p-high">⚡ أولوية عالية</span>
                      } @else {
                        <span class="badge-priority p-normal">عادي</span>
                      }
                    </td>
                    <td class="col-date">
                      <span class="date-text">{{ item.created_at | date:'yyyy-MM-dd' }}</span>
                    </td>
                    <td class="col-actions" (click)="$event.stopPropagation()">
                      <div class="row-actions">
                        <button class="btn primary xs" (click)="openDecisionModal(item, 'approve')" title="اعتماد ومصادقة">
                          اعتماد ✓
                        </button>
                        <button class="btn ghost xs text-danger" (click)="openDecisionModal(item, 'reject')" title="رفض الطلب">
                          رفض ✕
                        </button>
                        <button class="btn secondary xs" (click)="openDecisionModal(item)" title="مراجعة التفاصيل">
                          تفاصيل
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- نظام ترقيم الصفحات بنمط نبراس OS المعتمد -->
      @if (filteredItems().length > 0) {
        <div class="pager">
          <div class="page-size-selector">
            <span>عرض:</span>
            <select [ngModel]="pageSize()" (ngModelChange)="pageSize.set(+$event); page.set(1)">
              <option [value]="10">10 معاملات</option>
              <option [value]="25">25 معاملة</option>
              <option [value]="50">50 معاملة</option>
              <option [value]="100">100 معاملة (الكل)</option>
            </select>
          </div>
          <div class="pager-nav" *ngIf="totalPages() > 1">
            <button class="nb-btn-ghost sm" [disabled]="page() === 1" (click)="prev()">السابق</button>
            <span class="pager-info">صفحة {{ page() }} من {{ totalPages() }} · إجمالي {{ filteredItems().length }} معاملة</span>
            <button class="nb-btn-ghost sm" [disabled]="page() === totalPages()" (click)="next()">التالي</button>
          </div>
        </div>
      }

      <!-- نافذة معالج اتخاذ القرار بنظام الخطوات الإلزامي المعتمد في نبراس OS -->
      <app-approval-decision-wizard-modal
        [open]="decisionModalOpen()"
        [item]="selectedModalItem()"
        (closed)="closeDecisionModal()"
        (confirmed)="onDecisionConfirmed($event)"
      ></app-approval-decision-wizard-modal>
    </div>
  `,
  styles: [
    `
      .approvals-hub {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 20px;
        background: var(--nb-bg, #f8fafc);
        font-family: var(--nb-font-family, system-ui, sans-serif);
        min-width: 0;
      }

      /* الرأس والعنوان */
      .hub-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #ffffff;
        border: 1px solid var(--nb-border-soft, #e2e8f0);
        border-radius: 14px;
        padding: 16px 20px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }

      .title-with-icon {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .hub-logo-icon {
        font-size: 32px;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        width: 54px;
        height: 54px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
      }

      .hub-title {
        margin: 0;
        font-size: 20px;
        font-weight: 800;
        color: var(--nb-text, #0f172a);
      }

      .hub-subtitle {
        margin: 4px 0 0;
        font-size: 13px;
        color: var(--nb-text-muted, #64748b);
      }

      /* إشعار الـ Toast */
      .hub-toast {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 18px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 700;
        animation: slideDown 0.25s ease;
      }

      .hub-toast.success { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
      .hub-toast.danger { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

      /* شبكة المؤشرات الحية */
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 14px;
      }

      .stat-card {
        background: #ffffff;
        border: 1px solid var(--nb-border-soft, #e2e8f0);
        border-radius: 12px;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 14px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
        transition: transform 0.2s ease, box-shadow 0.2s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
        }
      }

      .stat-icon-wrap {
        font-size: 24px;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        background: #f1f5f9;
        flex-shrink: 0;
      }

      .stat-body {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .stat-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--nb-text-muted, #64748b);
      }

      .stat-val-row {
        display: flex;
        align-items: baseline;
        gap: 6px;
      }

      .stat-val {
        font-size: 22px;
        font-weight: 800;
        color: var(--nb-text, #0f172a);
      }

      .stat-unit {
        font-size: 11px;
        color: var(--nb-text-muted, #64748b);
      }

      .text-urgent { color: #dc2626; }
      .text-amount { color: #0284c7; }
      .text-approved { color: #16a34a; }

      /* شريط القطاعات */
      .sectors-bar {
        background: #ffffff;
        border: 1px solid var(--nb-border-soft, #e2e8f0);
        border-radius: 12px;
        padding: 8px 12px;
      }

      .sectors-tabs {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .sector-tab {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        border-radius: 8px;
        border: 1px solid transparent;
        background: transparent;
        color: var(--nb-text, #334155);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          background: #f1f5f9;
        }

        &.active {
          background: #2563eb;
          color: #ffffff;

          .tab-count {
            background: rgba(255, 255, 255, 0.25);
            color: #ffffff;
          }
        }
      }

      .tab-count {
        background: #e2e8f0;
        color: #475569;
        font-size: 11px;
        font-weight: 700;
        padding: 1px 7px;
        border-radius: 10px;
      }

      /* شريط الأدوات */
      .tools-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .search-box {
        position: relative;
        width: 340px;
        max-width: 100%;
      }

      .search-icon {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 14px;
        color: #94a3b8;
      }

      .search-input {
        width: 100%;
        padding: 8px 36px 8px 30px;
        border-radius: 8px;
        border: 1px solid var(--nb-border, #cbd5e1);
        background: #ffffff;
        font-size: 13px;
        outline: none;
        box-sizing: border-box;

        &:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }
      }

      .clear-search {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
      }

      .filter-pills {
        display: flex;
        gap: 6px;
      }

      .pill {
        padding: 6px 12px;
        border-radius: 20px;
        border: 1px solid var(--nb-border, #cbd5e1);
        background: #ffffff;
        font-size: 12px;
        font-weight: 600;
        color: #475569;
        cursor: pointer;

        &.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        &.pill-urgent.active {
          background: #dc2626;
          border-color: #dc2626;
        }
      }

      .spacer { flex: 1; }

      .batch-actions-box {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #f1f5f9;
        padding: 4px 12px;
        border-radius: 8px;
      }

      .batch-count {
        font-size: 12px;
        font-weight: 700;
        color: #1e293b;
      }

      /* تنبيه سداد أولياء الأمور */
      .finance-alert-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 10px;
        padding: 10px 16px;
        cursor: pointer;
        transition: background 0.15s ease;

        &:hover {
          background: #dbeafe;
        }
      }

      .alert-icon { font-size: 20px; }
      .alert-content { flex: 1; font-size: 13px; color: #1e40af; }
      .alert-cta { font-size: 12px; font-weight: 700; color: #2563eb; }

      /* الحاوية والجدول */
      .items-card {
        background: #ffffff;
        border: 1px solid var(--nb-border-soft, #e2e8f0);
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }

      .table-wrap {
        overflow-x: auto;
      }

      .nb-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        text-align: right;

        thead tr {
          background: #f8fafc;
          border-bottom: 1px solid var(--nb-border-soft, #e2e8f0);
        }

        th {
          padding: 12px 14px;
          font-weight: 700;
          color: var(--nb-text-muted, #64748b);
          font-size: 12px;
          white-space: nowrap;
        }

        td {
          padding: 12px 14px;
          border-bottom: 1px solid var(--nb-border-soft, #f1f5f9);
          color: var(--nb-text, #0f172a);
          vertical-align: middle;
        }

        tbody tr {
          transition: background 0.15s ease;
          &:hover { background: #f8fafc; cursor: pointer; }
          &.row-selected { background: #eff6ff; }
        }
      }

      .col-check { width: 36px; text-align: center; }
      .col-ref { width: 140px; }
      .col-title { min-width: 260px; }
      .col-sector { width: 180px; }
      .col-requester { width: 150px; }
      .col-amount { width: 140px; text-align: left; }
      .col-priority { width: 110px; }
      .col-date { width: 110px; }
      .col-actions { width: 190px; text-align: center; }

      /* نظام الصفحات بنمط نبراس OS المعتمد */
      .pager {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        margin-top: 14px;
        flex-wrap: wrap;
      }

      .pager-nav {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .page-size-selector {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--nb-text-muted, #64748b);

        select {
          height: 28px;
          padding: 0 8px;
          border-radius: 6px;
          border: 1px solid var(--nb-border-soft, #e2e8f0);
          background: var(--nb-surface, #ffffff);
          font-size: 12px;
          color: var(--nb-text, #0f172a);
          outline: none;
        }
      }

      .pager-info {
        font-size: 12px;
        color: var(--nb-text-muted, #64748b);
      }

      .nb-btn-ghost.sm {
        height: 26px;
        padding: 0 10px;
        font-size: 12px;
        border-radius: 6px;
        border: 1px solid var(--nb-border-soft, #cbd5e1);
        background: var(--nb-surface, #ffffff);
        color: var(--nb-text, #0f172a);
        cursor: pointer;
        font-family: inherit;
        font-weight: 500;
        transition: all 0.15s ease;

        &:hover:not(:disabled) {
          background: var(--nb-surface-raised, #f1f5f9);
          border-color: var(--nb-border, #94a3b8);
        }

        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      }

      .ref-badge {
        background: #fef3c7;
        color: #92400e;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
      }

      .title-cell {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .item-icon {
        font-size: 20px;
        background: #f1f5f9;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        flex-shrink: 0;
      }

      .item-title {
        font-weight: 700;
        color: #0f172a;
        line-height: 1.4;
      }

      .sector-cell {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .module-tag {
        font-size: 11px;
        font-weight: 700;
        color: #3b82f6;
      }

      .category-tag {
        font-size: 11px;
        color: #64748b;
      }

      .badge-priority {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
      }

      .p-urgent { background: #fee2e2; color: #b91c1c; }
      .p-high { background: #fef3c7; color: #92400e; }
      .p-normal { background: #f1f5f9; color: #475569; }

      .row-actions {
        display: flex;
        gap: 6px;
        justify-content: center;
      }

      /* أزرار نبراس المعتمدة */
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.15s ease;
      }

      .btn.sm { padding: 8px 14px; font-size: 13px; }
      .btn.xs { padding: 4px 10px; font-size: 11.5px; }

      .btn.primary {
        background: #2563eb;
        color: #ffffff;
        &:hover { background: #1d4ed8; }
      }

      .btn.secondary {
        background: #f1f5f9;
        color: #334155;
        border-color: #cbd5e1;
        &:hover { background: #e2e8f0; }
      }

      .btn.ghost {
        background: transparent;
        color: #64748b;
        border-color: #cbd5e1;
        &:hover { background: #f1f5f9; }
      }

      .text-danger { color: #dc2626 !important; }

      /* الحالات الفارغة والتحميل */
      .loading-state, .empty-state {
        padding: 48px 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        color: var(--nb-text-muted, #64748b);
      }

      .empty-icon { font-size: 40px; }
      .empty-title { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
      .empty-desc { margin: 0; font-size: 13px; max-width: 440px; text-align: center; }

      .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #e2e8f0;
        border-top-color: #2563eb;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

      .mono { font-family: monospace; }
      .bold { font-weight: 700; }
    `,
  ],
})
export class ApprovalInboxComponent implements OnInit {
  coreService = inject(ApprovalCoreService);
  studentFinanceService = inject(StudentFinanceService);
  router = inject(Router);

  sectorTabs: SectorTab[] = [
    { code: 'all', label: 'كافة المعاملات', icon: '⚡' },
    { code: 'finance', label: 'المالية والمحاسبة', icon: '📑' },
    { code: 'procurement', label: 'المشتريات والعقود', icon: '🛒' },
    { code: 'payroll_hr', label: 'الرواتب والموارد البشرية', icon: '💼' },
    { code: 'students', label: 'شؤون ومالية الطلاب', icon: '🎓' },
    { code: 'operations', label: 'المستودعات والتشغيل', icon: '⚙️' },
  ];

  selectedSector = signal<string>('all');
  searchQuery = signal<string>('');
  urgencyFilter = signal<'all' | 'urgent' | 'normal'>('all');
  selectedItemIds = signal<Set<string>>(new Set());

  // ترقيم وتوزيع الصفحات بنمط نبراس OS المعتمد
  readonly pageSize = signal<number>(10);
  readonly page = signal<number>(1);

  // حالة المودال بنظام الخطوات
  decisionModalOpen = signal<boolean>(false);
  selectedModalItem = signal<UnifiedApprovalItem | null>(null);

  // إشعار الفيدباك
  toastMessage = signal<string>('');
  toastSuccess = signal<boolean>(true);

  stats = this.coreService.unifiedStats;

  financePending = signal<number>(0);


  filteredItems = computed(() => {
    let list = this.coreService.unifiedItems();
    const sector = this.selectedSector();
    const search = this.searchQuery().trim().toLowerCase();
    const urgency = this.urgencyFilter();

    // 1. تصفية القطاع
    if (sector !== 'all') {
      if (sector === 'finance') {
        list = list.filter((it) => it.module === 'finance');
      } else if (sector === 'procurement') {
        list = list.filter((it) => it.module === 'procurement');
      } else if (sector === 'payroll_hr') {
        list = list.filter((it) => it.module === 'payroll' || it.module === 'hr');
      } else if (sector === 'students') {
        list = list.filter((it) => it.module === 'students' || it.module === 'student_finance' || it.module === 'examinations');
      } else if (sector === 'operations') {
        list = list.filter((it) => it.module === 'inventory' || it.module === 'assets' || it.module === 'maintenance');
      }
    }

    // 2. تصفية الأولوية
    if (urgency === 'urgent') {
      list = list.filter((it) => it.priority_code === 'urgent' || it.priority_code === 'high');
    } else if (urgency === 'normal') {
      list = list.filter((it) => it.priority_code === 'normal' || !it.priority_code);
    }

    // 3. البحث
    if (search) {
      list = list.filter(
        (it) =>
          it.title_ar?.toLowerCase().includes(search) ||
          it.reference_number?.toLowerCase().includes(search) ||
          it.requester_name?.toLowerCase().includes(search) ||
          it.category_name_ar?.toLowerCase().includes(search)
      );
    }

    return list;
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredItems().length / this.pageSize()))
  );

  readonly paginatedItems = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredItems().slice(start, start + this.pageSize());
  });

  urgentCount = computed(() => {
    return this.coreService.unifiedItems().filter((it) => it.priority_code === 'urgent' || it.priority_code === 'high').length;
  });

  totalPendingAmount = computed(() => {
    return this.coreService.unifiedItems().reduce((sum, it) => sum + (it.amount || 0), 0);
  });

  ngOnInit(): void {
    this.refresh();
    this.studentFinanceService.onlinePaymentsPendingCount().subscribe({
      next: (res: any) => this.financePending.set(res?.count ?? res?.pending_count ?? 0),
      error: () => {},
    });
  }

  refresh(): void {
    this.coreService.getUnifiedInbox().subscribe();
    this.coreService.getUnifiedStats().subscribe();
    this.selectedItemIds.set(new Set());
  }

  selectSector(code: string): void {
    this.selectedSector.set(code);
    this.selectedItemIds.set(new Set());
    this.page.set(1);
  }

  prev(): void {
    if (this.page() > 1) this.page.update((p) => p - 1);
  }

  next(): void {
    if (this.page() < this.totalPages()) this.page.update((p) => p + 1);
  }

  countForSector(code: string): number {
    const all = this.coreService.unifiedItems();
    if (code === 'all') return all.length;
    if (code === 'finance') return all.filter((it) => it.module === 'finance').length;
    if (code === 'procurement') return all.filter((it) => it.module === 'procurement').length;
    if (code === 'payroll_hr') return all.filter((it) => it.module === 'payroll' || it.module === 'hr').length;
    if (code === 'students') return all.filter((it) => it.module === 'students' || it.module === 'student_finance' || it.module === 'examinations').length;
    if (code === 'operations') return all.filter((it) => it.module === 'inventory' || it.module === 'assets' || it.module === 'maintenance').length;
    return 0;
  }

  // التحديد والمحددات المجمعة
  isAllSelected(): boolean {
    const items = this.paginatedItems();
    return items.length > 0 && items.every((it) => this.selectedItemIds().has(it.id));
  }

  toggleSelectAll(): void {
    const current = new Set(this.selectedItemIds());
    const items = this.paginatedItems();
    if (this.isAllSelected()) {
      for (const it of items) current.delete(it.id);
    } else {
      for (const it of items) current.add(it.id);
    }
    this.selectedItemIds.set(current);
  }

  toggleSelectItem(id: string): void {
    const current = new Set(this.selectedItemIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedItemIds.set(current);
  }

  // مودال القرار بنظام الخطوات
  openDecisionModal(item: UnifiedApprovalItem, presetAction?: 'approve' | 'reject'): void {
    this.selectedModalItem.set(item);
    this.decisionModalOpen.set(true);
  }

  closeDecisionModal(): void {
    this.decisionModalOpen.set(false);
    this.selectedModalItem.set(null);
  }

  onDecisionConfirmed(payload: DecisionPayload): void {
    this.coreService
      .takeUnifiedAction({
        source: payload.item.source,
        original_id: payload.item.original_id,
        action: payload.action,
        comments: payload.comments,
      })
      .subscribe({
        next: (res) => {
          this.closeDecisionModal();
          this.showToast(res.message || 'تم اتخاذ القرار بنجاح.', true);
          this.refresh();
        },
        error: (err) => {
          this.showToast(err.error?.detail || 'حدث خطأ أثناء حفظ القرار.', false);
        },
      });
  }

  // الإجراءات المجمعة
  bulkApprove(): void {
    const selected = this.getSelectedItems();
    if (selected.length === 0) return;

    this.coreService
      .bulkUnifiedAction(selected, 'approve', 'اعتماد مجمع من مركز القيادة')
      .subscribe({
        next: () => {
          this.showToast(`تم اعتماد ${selected.length} معاملة بنجاح.`, true);
          this.refresh();
        },
        error: () => {
          this.showToast('حدث خطأ أثناء تنفيذ الاعتماد المجمع.', false);
        },
      });
  }

  bulkReject(): void {
    const selected = this.getSelectedItems();
    if (selected.length === 0) return;

    this.coreService
      .bulkUnifiedAction(selected, 'reject', 'رفض مجمع من مركز القيادة')
      .subscribe({
        next: () => {
          this.showToast(`تم رفض ${selected.length} معاملة.`, true);
          this.refresh();
        },
        error: () => {
          this.showToast('حدث خطأ أثناء تنفيذ الرفض المجمع.', false);
        },
      });
  }

  private getSelectedItems(): { source: string; original_id: string; id: string }[] {
    const set = this.selectedItemIds();
    return this.coreService
      .unifiedItems()
      .filter((it) => set.has(it.id))
      .map((it) => ({ source: it.source, original_id: it.original_id, id: it.id }));
  }

  private showToast(msg: string, isSuccess: boolean): void {
    this.toastMessage.set(msg);
    this.toastSuccess.set(isSuccess);
    setTimeout(() => {
      this.toastMessage.set('');
    }, 4500);
  }

  goOnlinePayments(): void {
    this.router.navigate(['/student-finance/payments']);
  }

  // طباعة كشف وجدول الموافقات بنمط وهوية نبراس OS الرسمية
  printApprovalsTable(): void {
    const items = this.filteredItems();
    if (items.length === 0) return;

    const sectorName = this.sectorTabs.find((t) => t.code === this.selectedSector())?.label || 'كافة القطاعات';
    const urgencyName =
      this.urgencyFilter() === 'urgent'
        ? ' (المعاملات العاجلة فقط)'
        : this.urgencyFilter() === 'normal'
        ? ' (المعاملات العادية)'
        : '';

    const columns: ExportColumn[] = [
      { key: 'reference_number', label: 'الرقم المرجعي', width: 16 },
      { key: 'title_ar', label: 'بيانات المعاملة', width: 34 },
      {
        key: 'sector',
        label: 'القطاع / الفئة',
        map: (r) => `${r.module_name_ar} — ${r.category_name_ar}`,
        width: 22,
      },
      { key: 'requester_name', label: 'مقدم الطلب', width: 18 },
      {
        key: 'amount_formatted',
        label: 'المبلغ (ج.س)',
        map: (r) =>
          r.amount !== null && r.amount !== undefined
            ? `${Number(r.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.س`
            : '—',
        width: 18,
      },
      {
        key: 'priority',
        label: 'الأولوية',
        map: (r) =>
          r.priority_code === 'urgent'
            ? 'عاجل جداً'
            : r.priority_code === 'high'
            ? 'أولوية عالية'
            : 'عادي',
        width: 12,
      },
      {
        key: 'created_at',
        label: 'التاريخ',
        map: (r) => (r.created_at ? r.created_at.substring(0, 10) : '—'),
        width: 14,
      },
    ];

    printDoc(
      {
        title: 'مركز الموافقات الموحد — كشف المعاملات المعلقة',
        subtitle: `القطاع: ${sectorName}${urgencyName} · إجمالي المعاملات: ${items.length} معاملة · إجمالي المبالغ المعلقة: ${this.totalPendingAmount().toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.س`,
        filename: `كشف-الموافقات-المعلقة-${new Date().toISOString().slice(0, 10)}`,
        orientation: 'landscape',
      },
      columns,
      items
    );
  }
}
