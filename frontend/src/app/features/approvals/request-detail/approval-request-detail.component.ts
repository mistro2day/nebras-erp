import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ApprovalCoreService } from '../approval-core.service';
import { ApprovalEscalationService } from '../approval-escalation.service';
import { PriorityBadgeComponent } from '../shared/priority-badge.component';
import { SlaBadgeComponent } from '../shared/sla-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { TimelineWidgetComponent, TimelineEvent } from '../../../shared/components/timeline-widget/timeline-widget.component';
import { CommentWidgetComponent, CommentItem } from '../../../shared/components/comment-widget/comment-widget.component';
import { AttachmentViewerComponent, AttachmentItem } from '../../../shared/components/attachment-viewer/attachment-viewer.component';
import { DelegationDialogComponent, DelegationDialogResult } from './delegation-dialog.component';
import { EscalationDialogComponent, EscalationDialogResult } from './escalation-dialog.component';

@Component({
  selector: 'app-approval-request-detail',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTabsModule, MatDialogModule,
    PriorityBadgeComponent, SlaBadgeComponent, LoadingSpinnerComponent,
    TimelineWidgetComponent, CommentWidgetComponent, AttachmentViewerComponent,
  ],
  template: `
    <div class="detail-container" dir="rtl">
      <button mat-button (click)="goBack()"><mat-icon>arrow_forward</mat-icon> العودة إلى صندوق الوارد</button>

      <app-loading-spinner [isLoading]="coreService.loading()"></app-loading-spinner>

      <ng-container *ngIf="coreService.selectedRequest() as req">
        <mat-card class="approval-card">
          <div class="card-top">
            <div>
              <h1>{{ req.title_ar || req.title_en || 'طلب اعتماد' }}</h1>
              <p class="subtitle">الفئة: {{ req.category_name || req.category }} — مقدّم الطلب: {{ req.requester_id }}</p>
            </div>
            <div class="badges">
              <app-priority-badge [code]="req.priority_code"></app-priority-badge>
              <app-sla-badge [dueAt]="slaDueAt()" [isViolated]="slaViolated()"></app-sla-badge>
              <span class="status-chip" [ngClass]="req.status">{{ statusText(req.status) }}</span>
            </div>
          </div>

          <div class="progress-strip" *ngIf="req.current_step as step">
            <mat-icon>timeline</mat-icon>
            <span>المرحلة الحالية: {{ step }}</span>
          </div>

          <div class="quick-actions" *ngIf="req.status === 'pending'">
            <button mat-flat-button color="primary" (click)="approve()"><mat-icon>check_circle</mat-icon> اعتماد</button>
            <button mat-flat-button color="warn" (click)="reject()"><mat-icon>cancel</mat-icon> رفض</button>
            <button mat-stroked-button (click)="returnRequest()"><mat-icon>undo</mat-icon> إرجاع</button>
            <button mat-stroked-button (click)="openDelegateDialog()"><mat-icon>forward</mat-icon> تفويض</button>
            <button mat-stroked-button color="accent" (click)="openEscalateDialog()"><mat-icon>trending_up</mat-icon> تصعيد</button>
            <button mat-button (click)="cancelRequest()"><mat-icon>close</mat-icon> إلغاء الطلب</button>
          </div>
        </mat-card>

        <mat-tab-group class="detail-tabs">
          <mat-tab label="الخط الزمني">
            <app-timeline-widget [events]="timelineEvents()"></app-timeline-widget>
          </mat-tab>
          <mat-tab label="التعليقات">
            <app-comment-widget [items]="comments()" (onAddComment)="addComment($event)"></app-comment-widget>
          </mat-tab>
          <mat-tab label="المرفقات">
            <app-attachment-viewer [items]="attachments()"></app-attachment-viewer>
          </mat-tab>
        </mat-tab-group>
      </ng-container>
    </div>
  `,
  styles: [`
    .detail-container { padding: 2rem; background: #f8fafc; min-height: 100vh; }
    .approval-card { padding: 1.5rem; border-radius: 12px; margin: 1rem 0 1.5rem; }
    .card-top { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
    .card-top h1 { margin: 0; font-size: 1.4rem; color: #0f172a; }
    .subtitle { margin: 0.35rem 0 0; color: #64748b; font-size: 0.85rem; }
    .badges { display: flex; align-items: center; gap: 0.5rem; }
    .status-chip {
      padding: 0.2rem 0.65rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;
      background: #f1f5f9; color: #334155;
    }
    .status-chip.approved { background: #dcfce7; color: #15803d; }
    .status-chip.rejected { background: #fee2e2; color: #b91c1c; }
    .status-chip.pending { background: #fef3c7; color: #d97706; }
    .progress-strip {
      display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem; color: #6366f1; font-size: 0.85rem;
    }
    .quick-actions { display: flex; gap: 0.5rem; margin-top: 1.25rem; flex-wrap: wrap; }
    .detail-tabs { background: transparent; }
  `]
})
export class ApprovalRequestDetailComponent implements OnInit {
  coreService = inject(ApprovalCoreService);
  escalationService = inject(ApprovalEscalationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  requestId = '';
  timelineEvents = signal<TimelineEvent[]>([]);
  comments = signal<CommentItem[]>([]);
  attachments = signal<AttachmentItem[]>([]);
  slaDueAt = signal<string | null>(null);
  slaViolated = signal<boolean>(false);

  ngOnInit() {
    this.requestId = this.route.snapshot.paramMap.get('id') || '';
    this.loadAll();
  }

  loadAll() {
    this.coreService.getRequest(this.requestId).subscribe();

    this.coreService.getTimeline(this.requestId).subscribe((history) => {
      this.timelineEvents.set(history.map((h: any) => ({
        id: h.id, activity_type: h.action_taken, actor_name: h.user_id,
        description: h.step_name, created_at: h.timestamp,
      })));
    });

    this.coreService.getComments(this.requestId).subscribe((data) => {
      this.comments.set(data.map((c: any) => ({ id: c.id, body: c.comment, created_at: c.created_at })));
    });

    this.coreService.getAttachments(this.requestId).subscribe((data) => {
      this.attachments.set(data.map((a: any) => ({
        id: a.id, file_name: a.title || 'مستند', file_size: a.file_size_bytes || 0,
        mime_type: 'application/octet-stream', uploaded_at: a.created_at,
      })));
    });

    this.coreService.getSlaStatus(this.requestId).subscribe({
      next: (sla: any) => { this.slaDueAt.set(sla.due_at); this.slaViolated.set(sla.is_violated); },
      error: () => { this.slaDueAt.set(null); },
    });
  }

  goBack() {
    this.router.navigate(['/approvals/inbox']);
  }

  statusText(status: string): string {
    const map: Record<string, string> = {
      pending: 'قيد الانتظار', approved: 'معتمد', rejected: 'مرفوض',
      returned: 'مُعاد للمراجعة', escalated: 'مُصعَّد', cancelled: 'ملغى', expired: 'منتهي الصلاحية',
    };
    return map[status] || status;
  }

  approve() { this.confirmAndDecide('approve', 'اعتماد الطلب', 'هل أنت متأكد من اعتماد هذا الطلب؟', 'primary'); }
  reject() { this.confirmAndDecide('reject', 'رفض الطلب', 'هل أنت متأكد من رفض هذا الطلب؟', 'warn'); }
  returnRequest() { this.confirmAndDecide('return', 'إرجاع الطلب للمراجعة', 'سيتم إرجاع الطلب لمقدّمه لاستكمال المتطلبات.', 'accent'); }

  private confirmAndDecide(action: 'approve' | 'reject' | 'return', title: string, message: string, color: 'primary' | 'warn' | 'accent') {
    const data: ConfirmDialogData = { title, message, color };
    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.coreService.makeDecision(this.requestId, action).subscribe(() => this.loadAll());
      }
    });
  }

  cancelRequest() {
    const data: ConfirmDialogData = { title: 'إلغاء الطلب', message: 'هل تريد إلغاء طلب الاعتماد نهائياً؟', color: 'warn' };
    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((confirmed) => {
      if (confirmed) this.coreService.cancelRequest(this.requestId).subscribe(() => this.loadAll());
    });
  }

  openDelegateDialog() {
    this.dialog.open(DelegationDialogComponent, { data: { requestId: this.requestId } })
      .afterClosed().subscribe((result: DelegationDialogResult | undefined) => {
        if (result) {
          this.coreService.bulkDelegate([this.requestId], result.delegate_to_id).subscribe(() => this.loadAll());
        }
      });
  }

  openEscalateDialog() {
    this.dialog.open(EscalationDialogComponent).afterClosed().subscribe((result: EscalationDialogResult | undefined) => {
      if (result) {
        this.escalationService.createEscalation({
          request: this.requestId, escalated_to_id: result.escalated_to_id, reason: result.reason,
        }).subscribe(() => this.loadAll());
      }
    });
  }

  addComment(body: string) {
    this.coreService.addComment(this.requestId, body).subscribe(() => this.loadAll());
  }
}
