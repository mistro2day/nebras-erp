import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ApprovalCoreService, InboxItem } from '../approval-core.service';
import { StudentFinanceService } from '../../student-finance/student-finance.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';

interface FilterChip {
  code: string | null;
  label: string;
}

/**
 * مركز الموافقات — قائمة الطلبات (لوح القائمة من الشاشة 1c في تصدير Nebras OS.html)
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-approval-inbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule],
  template: `
    <div class="ac-page" dir="rtl">
      <!-- رأس القائمة -->
      <div class="ac-head">
        <div class="ac-title-row">
          <span class="ac-title">مركز الموافقات</span>
          <span class="nb-count-danger">{{ coreService.inboxItems().length }}</span>
          <div class="spacer"></div>
          <button class="ac-sort" (click)="load()">⌥ فرز</button>
        </div>
        <div class="ac-filters">
          @for (chip of filterChips; track chip.label) {
            <button
              class="ac-chip"
              [class.active]="activeFilter() === chip.code"
              (click)="activeFilter.set(chip.code)"
            >
              {{ chip.label }}
            </button>
          }
        </div>
      </div>

      <!-- ربط مدفوعات أولياء الأمور المالية (تظهر مع تصفية المالية أو الكل) -->
      @if (financePending() > 0 && (activeFilter() === 'FINANCE' || activeFilter() === null)) {
        <button class="ac-finance-link" (click)="goOnlinePayments()">
          🏦 {{ financePending() }} طلب سداد من أولياء الأمور بانتظار المراجعة
          <span class="fl-cta">فتح المراجعة ←</span>
        </button>
      }

      <!-- القائمة -->
      <div class="ac-list">
        @for (item of filteredItems(); track item.id) {
          <div class="ac-item" [class.selected]="selectedId() === item.item_id">
            <div class="ac-item-body" (click)="openRequest(item)">
              <div class="ac-item-top">
                <span class="ac-item-title">{{ item.title_ar || item.title_en }}</span>
                @if (badgeFor(item); as b) {
                  <span [class]="b.cls">{{ b.label }}</span>
                }
              </div>
              <span class="ac-item-desc">{{ descFor(item) }}</span>
              <span class="ac-item-meta">{{ metaFor(item) }}</span>
            </div>
            <div class="ac-item-actions">
              <button class="ac-icon" [class.on]="item.is_starred" (click)="toggleStar(item)" title="تمييز بنجمة">
                {{ item.is_starred ? '★' : '☆' }}
              </button>
              <button class="row-btn primary" (click)="quickApprove(item)">اعتماد</button>
              <button class="row-btn" (click)="quickReject(item)">رفض</button>
              <button class="ac-icon" (click)="archive(item)" title="أرشفة">⌦</button>
            </div>
          </div>
        }

        @if (filteredItems().length === 0 && !coreService.loading()) {
          <div class="ac-empty">لا توجد طلبات مطابقة في مركز الموافقات.</div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        flex: 1;
        display: flex;
        min-width: 0;
        min-height: 0;
      }

      .spacer { flex: 1; }

      .ac-page {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
        background: var(--nb-surface-raised);
        overflow: hidden;
      }

      /* ---------- الرأس ---------- */
      .ac-head {
        padding: 12px 14px 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        border-bottom: 1px solid var(--nb-border-soft);
      }

      .ac-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .ac-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--nb-text);
      }

      .ac-sort {
        border: none;
        background: transparent;
        font-family: var(--nb-font-family);
        font-size: 12px;
        color: var(--nb-text-muted);
        cursor: pointer;
      }

      .ac-filters {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .ac-chip {
        font-family: var(--nb-font-family);
        font-size: 11px;
        font-weight: 600;
        color: var(--nb-text-secondary);
        border: 1px solid var(--nb-border);
        background: var(--nb-surface);
        padding: 3px 10px;
        border-radius: var(--nb-radius-pill);
        cursor: pointer;

        &.active {
          background: var(--nb-primary-600);
          border-color: var(--nb-primary-600);
          color: var(--nb-on-primary);
        }
      }

      /* ---------- القائمة ---------- */
      .ac-list {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }

      .ac-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border-top: 1px solid #e9ebf2;
        background: var(--nb-surface-raised);

        &:hover { background: #f1f3f9; }

        &.selected {
          background: var(--nb-surface);
          border-right: 3px solid var(--nb-primary-600);
        }
      }

      .ac-item-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
        cursor: pointer;
      }

      .ac-item-top {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .ac-item-title {
        flex: 1;
        font-size: 13px;
        font-weight: 600;
        color: var(--nb-text);
      }

      .ac-item-desc {
        font-size: 12px;
        color: var(--nb-text-secondary);
      }

      .ac-item-meta {
        font-size: 11px;
        color: var(--nb-text-faint);
      }

      /* شارات القائمة — حشو 1px 7px كما في التصدير */
      .ac-list [class^='nb-badge-'] {
        font-size: 10px;
        font-weight: 700;
        padding: 1px 7px;
      }

      .ac-item-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .ac-icon {
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 14px;
        color: var(--nb-text-muted);
        padding: 2px 4px;
        line-height: 1;

        &.on { color: var(--nb-warning); }

        &:focus-visible {
          outline: none;
          box-shadow: var(--nb-focus-ring);
          border-radius: var(--nb-radius-sm);
        }
      }

      .row-btn {
        height: 26px;
        padding: 0 10px;
        border: 1px solid var(--nb-border);
        background: var(--nb-surface);
        color: var(--nb-text-secondary);
        border-radius: var(--nb-radius);
        display: inline-flex;
        align-items: center;
        font-family: var(--nb-font-family);
        font-size: 12px;
        cursor: pointer;

        &.primary {
          padding: 0 12px;
          background: var(--nb-primary-600);
          border-color: var(--nb-primary-600);
          color: var(--nb-on-primary);
          font-weight: 600;
        }

        &:focus-visible {
          outline: none;
          box-shadow: var(--nb-focus-ring);
        }
      }

      .ac-empty {
        padding: 32px 16px;
        text-align: center;
        font-size: 13px;
        color: var(--nb-text-muted);
      }
      .ac-finance-link {
        width: 100%; display: flex; align-items: center; gap: 8px; cursor: pointer;
        background: linear-gradient(135deg, #fffaf0, #fff); border: 1px solid #fde9c8;
        border-inline-start: 3px solid #F59E0B; border-radius: var(--nb-radius);
        padding: 12px 14px; margin: 0 0 10px; font-family: inherit; font-size: 13px;
        font-weight: 700; color: #92400e; text-align: start;
      }
      .ac-finance-link:hover { background: #fff7ea; }
      .ac-finance-link .fl-cta { margin-inline-start: auto; color: #b45309; font-weight: 800; }
    `,
  ],
})
export class ApprovalInboxComponent implements OnInit {
  readonly coreService = inject(ApprovalCoreService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  private readonly sfService = inject(StudentFinanceService);
  readonly activeFilter = signal<string | null>(null);
  readonly selectedId = signal<string | null>(null);
  readonly financePending = signal<number>(0);

  readonly filterChips: FilterChip[] = [
    { code: null, label: 'الكل' },
    { code: 'URGENT', label: 'عاجلة' },
    { code: 'FINANCE', label: 'مالية' },
    { code: 'HR', label: 'HR' },
  ];

  readonly filteredItems = computed(() => {
    const filter = this.activeFilter();
    const items = this.coreService.inboxItems();
    if (!filter) return items;
    if (filter === 'URGENT') return items.filter((i) => i.priority_code === 'URGENT');
    // تصفية حسب النوع/الفئة عبر رمز الأولوية أو النوع
    return items.filter((i) => (i.item_type || '').toUpperCase().includes(filter));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.coreService.getMyInboxItems().subscribe();
    this.sfService.onlinePaymentsPendingCount().subscribe({
      next: (r: any) => this.financePending.set(r?.data?.pending ?? r?.pending ?? 0),
      error: () => {},
    });
  }

  goOnlinePayments(): void {
    this.router.navigateByUrl('/student-finance/online-payments');
  }

  openRequest(item: InboxItem): void {
    this.selectedId.set(item.item_id);
    this.router.navigate(['/approvals/requests', item.item_id]);
  }

  badgeFor(item: InboxItem): { label: string; cls: string } | null {
    const code = (item.priority_code || '').toUpperCase();
    if (code === 'URGENT') return { label: 'عاجل', cls: 'nb-badge-danger' };
    if (code === 'HIGH' || code === 'REVIEW') return { label: 'مراجعة', cls: 'nb-badge-warning' };
    if (item.status === 'pending') return { label: 'جديد', cls: 'nb-badge-info' };
    return null;
  }

  descFor(item: InboxItem): string {
    return item.title_en || item.item_type || '';
  }

  metaFor(item: InboxItem): string {
    return `${item.item_type} · ${this.statusText(item.status)}`;
  }

  private statusText(status: string): string {
    const map: Record<string, string> = {
      pending: 'قيد الانتظار',
      approved: 'معتمد',
      rejected: 'مرفوض',
      read: 'مقروء',
      archived: 'مؤرشف',
    };
    return map[status] || status;
  }

  toggleStar(item: InboxItem): void {
    this.coreService.toggleStar(item.id).subscribe(() => this.load());
  }

  archive(item: InboxItem): void {
    this.coreService.archiveItem(item.id).subscribe(() => this.load());
  }

  quickApprove(item: InboxItem): void {
    this.confirmAndDecide(item, 'approve', 'اعتماد الطلب', 'هل أنت متأكد من اعتماد هذا الطلب؟', 'primary');
  }

  quickReject(item: InboxItem): void {
    this.confirmAndDecide(item, 'reject', 'رفض الطلب', 'هل أنت متأكد من رفض هذا الطلب؟', 'warn');
  }

  private confirmAndDecide(
    item: InboxItem,
    action: 'approve' | 'reject',
    title: string,
    message: string,
    color: 'primary' | 'warn'
  ): void {
    const data: ConfirmDialogData = { title, message, color };
    this.dialog
      .open(ConfirmDialogComponent, { data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.coreService.makeDecision(item.item_id, action).subscribe(() => this.load());
        }
      });
  }
}
