import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ApprovalEscalationService } from '../approval-escalation.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

/**
 * مركز التصعيد — لغة تصميم Nebras OS.
 * المنطق والخدمات والحوارات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-escalation-center',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatTabsModule, MatDialogModule, LoadingSpinnerComponent, EmptyStateComponent, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="مركز التصعيد"
        subtitle="متابعة التصعيدات النشطة وطلبات الاعتماد المتجاوزة لمهلة اتفاقية مستوى الخدمة"
      >
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
      </nb-page-header>

      <app-loading-spinner [isLoading]="escalationService.loading()"></app-loading-spinner>

      <nb-panel [flush]="true">
        <mat-tab-group class="nb-tabs">
          <mat-tab label="التصعيدات النشطة ({{ escalationService.escalations().length }})">
            @if (escalationService.escalations().length > 0) {
              <div class="tbl">
                <div class="tbl-head es"><span>الطلب</span><span>مُصعَّد إلى</span><span>المستوى</span><span>السبب</span><span></span></div>
                @for (row of escalationService.escalations(); track row.id) {
                  <div class="tbl-row es">
                    <span><a class="link" (click)="openRequest(row.request)">{{ row.request }}</a></span>
                    <span>{{ row.escalated_to_id }}</span>
                    <span>{{ row.escalation_level }}</span>
                    <span>{{ row.reason }}</span>
                    <span><button class="nb-btn-secondary sm" (click)="resolve(row.id)">حل التصعيد</button></span>
                  </div>
                }
              </div>
            }
            @if (!escalationService.loading() && escalationService.escalations().length === 0) {
              <app-empty-state icon="trending_up" title="لا توجد تصعيدات نشطة" description="جميع طلبات الاعتماد ضمن المسار الطبيعي."></app-empty-state>
            }
          </mat-tab>

          <mat-tab label="متجاوزة المهلة ({{ escalationService.overdueRequests().length }})">
            @if (escalationService.overdueRequests().length > 0) {
              <div class="tbl">
                <div class="tbl-head ov"><span>الطلب</span><span>الموعد النهائي</span></div>
                @for (row of escalationService.overdueRequests(); track row.id) {
                  <div class="tbl-row ov">
                    <span><a class="link" (click)="openRequest(row.request)">{{ row.request }}</a></span>
                    <span>{{ row.due_at | date:'medium' }}</span>
                  </div>
                }
              </div>
            }
            @if (!escalationService.loading() && escalationService.overdueRequests().length === 0) {
              <app-empty-state icon="schedule" title="لا توجد طلبات متجاوزة للمهلة" description="جميع الطلبات ضمن المهلة المحددة."></app-empty-state>
            }
          </mat-tab>
        </mat-tab-group>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .nb-tabs { padding: 4px 8px 8px; }
    .tbl { display: flex; flex-direction: column; padding-top: 8px; }
    .tbl-head, .tbl-row { display: grid; gap: 8px; padding: 9px 16px; align-items: center; }
    .tbl-head.es, .tbl-row.es { grid-template-columns: 1.4fr 1.2fr 0.8fr 1.6fr 1fr; }
    .tbl-head.ov, .tbl-row.ov { grid-template-columns: 2fr 1.5fr; }
    .tbl-head { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); padding: 8px 16px; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text); }
    .tbl-row:last-child { border-bottom: none; }
    .tbl-row:hover { background: var(--nb-surface-raised); }
    .link { color: var(--nb-primary-600); cursor: pointer; text-decoration: underline; }
    .nb-btn-secondary.sm { height: 26px; padding: 0 12px; font-size: 12px; }
  `]
})
export class EscalationCenterComponent implements OnInit {
  escalationService = inject(ApprovalEscalationService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  columns = ['request', 'escalated_to_id', 'level', 'reason', 'actions'];

  ngOnInit() { this.load(); }

  load() {
    this.escalationService.getActiveEscalations().subscribe();
    this.escalationService.getOverdueRequests().subscribe();
  }

  openRequest(requestId: string) {
    this.router.navigate(['/approvals/requests', requestId]);
  }

  resolve(id: string) {
    const data: ConfirmDialogData = { title: 'حل التصعيد', message: 'هل تم التعامل مع هذا التصعيد؟', color: 'primary' };
    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((confirmed) => {
      if (confirmed) this.escalationService.resolveEscalation(id).subscribe(() => this.load());
    });
  }
}
