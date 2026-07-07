import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ApprovalDelegationService } from '../approval-delegation.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { DelegationDialogComponent, DelegationDialogResult } from '../request-detail/delegation-dialog.component';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

/**
 * مركز التفويض — لغة تصميم Nebras OS.
 * المنطق والخدمات والحوارات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-delegation-center',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatDialogModule, LoadingSpinnerComponent, EmptyStateComponent, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="مركز التفويض"
        subtitle="إدارة تفويضات الاعتماد الصادرة منك أو الموجهة إليك"
      >
        <button class="nb-btn-primary" (click)="createDelegation()">تفويض جديد</button>
      </nb-page-header>

      <app-loading-spinner [isLoading]="delegationService.loading()"></app-loading-spinner>

      @if (delegationService.delegations().length > 0) {
        <nb-panel [flush]="true">
          <div class="tbl">
            <div class="tbl-head"><span>مفوَّض إلى</span><span>البداية</span><span>النهاية</span><span>الحالة</span><span></span></div>
            @for (row of delegationService.delegations(); track row.id) {
              <div class="tbl-row">
                <span>{{ row.delegate_to_id }}</span>
                <span>{{ row.start_date | date:'short' }}</span>
                <span>{{ row.end_date | date:'short' }}</span>
                <span><span [class]="row.is_active ? 'nb-badge-success' : 'nb-badge-neutral'">{{ row.is_active ? 'نشط' : 'غير نشط' }}</span></span>
                <span>
                  @if (row.is_active) { <button class="nb-btn-danger sm" (click)="deactivate(row.id)">إلغاء</button> }
                </span>
              </div>
            }
          </div>
        </nb-panel>
      }

      @if (!delegationService.loading() && delegationService.delegations().length === 0) {
        <app-empty-state icon="forward" title="لا توجد تفويضات" description="لم تقم بإنشاء أي تفويض اعتماد بعد."></app-empty-state>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row { display: grid; grid-template-columns: 1.6fr 1.2fr 1.2fr 1fr 0.8fr; gap: 8px; padding: 9px 16px; align-items: center; }
    .tbl-head { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); padding: 8px 16px; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text); }
    .tbl-row:last-child { border-bottom: none; }
    .tbl-row:hover { background: var(--nb-surface-raised); }
    .nb-btn-danger.sm { height: 26px; padding: 0 12px; font-size: 12px; }
  `]
})
export class DelegationCenterComponent implements OnInit {
  delegationService = inject(ApprovalDelegationService);
  private dialog = inject(MatDialog);

  columns = ['delegate_to_id', 'start_date', 'end_date', 'status', 'actions'];

  ngOnInit() { this.load(); }
  load() { this.delegationService.getMyDelegations().subscribe(); }

  createDelegation() {
    this.dialog.open(DelegationDialogComponent).afterClosed().subscribe((result: DelegationDialogResult | undefined) => {
      if (result) {
        this.delegationService.createDelegation({
          delegate_to_id: result.delegate_to_id, start_date: result.start_date,
          end_date: result.end_date, reason: result.reason,
        }).subscribe(() => this.load());
      }
    });
  }

  deactivate(id: string) {
    const data: ConfirmDialogData = { title: 'إلغاء التفويض', message: 'هل تريد إلغاء هذا التفويض؟', color: 'warn' };
    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((confirmed) => {
      if (confirmed) this.delegationService.deactivateDelegation(id).subscribe(() => this.load());
    });
  }
}
