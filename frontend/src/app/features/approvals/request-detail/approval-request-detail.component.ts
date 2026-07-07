import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ApprovalCoreService } from '../approval-core.service';
import { ApprovalEscalationService } from '../approval-escalation.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { DelegationDialogComponent, DelegationDialogResult } from './delegation-dialog.component';
import { EscalationDialogComponent, EscalationDialogResult } from './escalation-dialog.component';

interface MetaCell {
  label: string;
  value: string;
  valueClass?: 'success';
}

interface WorkflowStep {
  title: string;
  caption: string;
  state: 'done' | 'current' | 'pending';
}

interface RelatedRecord {
  title: string;
  meta: string;
}

interface CommentView {
  author: string;
  when: string;
  body: string;
}

/**
 * تفاصيل طلب الاعتماد — لوح التفاصيل + لوحة الفحص من الشاشة 1c (تصدير Nebras OS.html)
 * كل الخدمات والمنطق والمسارات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-approval-request-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule],
  template: `
    <div class="rd-shell" dir="rtl">
      @if (coreService.selectedRequest(); as req) {
        <!-- لوح التفاصيل -->
        <div class="rd-detail">
          <div class="rd-content">
            <!-- رأس الطلب -->
            <div class="rd-head">
              <div class="rd-head-text">
                <div class="rd-title-row">
                  <span class="rd-title">{{ req.title_ar || req.title_en || 'طلب اعتماد' }}</span>
                  @if (headBadge(); as b) {
                    <span class="nb-badge-danger rd-head-badge">{{ b }}</span>
                  }
                </div>
                <span class="rd-subtitle">{{ subtitle(req) }}</span>
              </div>
              @if (req.status === 'pending') {
                <button class="rd-btn approve" (click)="approve()">اعتماد</button>
                <button class="rd-btn reject" (click)="reject()">رفض</button>
                <button class="rd-btn neutral" (click)="returnRequest()">إعادة للتعديل</button>
              } @else {
                <span class="nb-badge-neutral">{{ statusText(req.status) }}</span>
              }
            </div>

            <!-- شبكة البيانات -->
            @if (metaCells().length) {
              <div class="rd-meta-grid">
                @for (cell of metaCells(); track cell.label) {
                  <div class="rd-meta-cell">
                    <span class="rd-meta-label">{{ cell.label }}</span>
                    <span class="rd-meta-value" [class.success]="cell.valueClass === 'success'">{{ cell.value }}</span>
                  </div>
                }
              </div>
            }

            <!-- مسار الاعتماد -->
            @if (steps().length) {
              <div class="rd-timeline">
                <span class="rd-block-title">مسار الاعتماد</span>
                <div class="rd-steps">
                  @for (step of steps(); track step.title; let i = $index; let last = $last) {
                    <div class="rd-step">
                      <div class="rd-step-node" [class]="'rd-step-node ' + step.state">
                        {{ step.state === 'done' ? '✓' : i + 1 }}
                      </div>
                      <span class="rd-step-title" [class]="'rd-step-title ' + step.state">{{ step.title }}</span>
                      <span class="rd-step-caption" [class]="'rd-step-caption ' + step.state">{{ step.caption }}</span>
                    </div>
                    @if (!last) {
                      <div class="rd-step-line" [class.done]="step.state === 'done'"></div>
                    }
                  }
                </div>
              </div>
            }

            <!-- بنود الطلب -->
            @if (lineItems().length) {
              <div class="rd-lines">
                <div class="rd-lines-head">
                  <span>البند</span><span>الكمية</span><span>سعر الوحدة</span><span>الإجمالي</span>
                </div>
                @for (line of lineItems(); track $index) {
                  <div class="rd-lines-row">
                    <span>{{ line.name }}</span>
                    <span>{{ line.qty }}</span>
                    <span>{{ line.unit }}</span>
                    <span class="strong">{{ line.total }}</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- لوحة الفحص -->
        <aside class="rd-inspector">
          <div class="rd-inspector-head">
            <span class="rd-inspector-title">لوحة الفحص</span>
            <div class="spacer"></div>
            <span class="rd-inspector-collapse" (click)="goBack()">إخفاء ›</span>
          </div>
          <div class="rd-inspector-body">
            <!-- ملخص المساعد (بنية تصميمية — لا مصدر بيانات خلفي) -->
            <div class="rd-ai-card">
              <span class="rd-ai-label">✦ ملخص المساعد</span>
              <span class="rd-ai-text">{{ aiSummary() }}</span>
            </div>

            <!-- سجلات مرتبطة (مرفقات حية) -->
            @if (related().length) {
              <div class="rd-inspector-section">
                <span class="rd-section-label">سجلات مرتبطة</span>
                @for (rec of related(); track rec.title) {
                  <div class="rd-related-card">
                    <span class="rd-related-title">{{ rec.title }}</span>
                    <span class="rd-related-meta">{{ rec.meta }}</span>
                  </div>
                }
              </div>
            }

            <!-- التعليقات (حية) -->
            <div class="rd-inspector-section">
              <span class="rd-section-label">التعليقات ({{ comments().length }})</span>
              @for (c of comments(); track $index) {
                <div class="rd-comment-card">
                  <span class="rd-comment-meta">{{ c.author }} · {{ c.when }}</span>
                  <span class="rd-comment-body">{{ c.body }}</span>
                </div>
              }
              <input
                class="rd-comment-input"
                type="text"
                placeholder="إضافة تعليق…"
                [value]="draftComment()"
                (input)="draftComment.set($any($event.target).value)"
                (keyup.enter)="submitComment()"
              />
            </div>

            <!-- إجراءات إضافية -->
            @if (req.status === 'pending') {
              <div class="rd-inspector-actions">
                <button class="nb-btn-secondary" (click)="openDelegateDialog()">تفويض</button>
                <button class="nb-btn-secondary" (click)="openEscalateDialog()">تصعيد</button>
                <button class="nb-btn-ghost" (click)="cancelRequest()">إلغاء الطلب</button>
              </div>
            }
          </div>
        </aside>
      }
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

      .rd-shell {
        flex: 1;
        display: flex;
        min-width: 0;
        overflow: hidden;
      }

      /* ---------- لوح التفاصيل ---------- */
      .rd-detail {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
        border-left: 1px solid var(--nb-border);
      }

      .rd-content {
        flex: 1;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow-y: auto;
      }

      .rd-head {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .rd-head-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
      }

      .rd-title-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .rd-title {
        font-size: 18px;
        font-weight: 700;
        color: var(--nb-text);
      }

      .rd-head-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 9px;
      }

      .rd-subtitle {
        font-size: 13px;
        color: var(--nb-text-muted);
      }

      .rd-btn {
        height: 32px;
        padding: 0 16px;
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius);
        display: flex;
        align-items: center;
        font-family: var(--nb-font-family);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        background: var(--nb-surface);
        white-space: nowrap;

        &.approve {
          background: var(--nb-success);
          border-color: var(--nb-success);
          color: #fff;
        }
        &.reject { color: var(--nb-danger); }
        &.neutral { color: var(--nb-text-secondary); font-weight: 400; }

        &:focus-visible {
          outline: none;
          box-shadow: var(--nb-focus-ring);
        }
      }

      /* ---------- شبكة البيانات ---------- */
      .rd-meta-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1px;
        background: var(--nb-border);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card);
        overflow: hidden;
      }

      .rd-meta-cell {
        background: var(--nb-surface);
        padding: 10px 14px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .rd-meta-label {
        font-size: 11px;
        color: var(--nb-text-muted);
      }

      .rd-meta-value {
        font-size: 15px;
        font-weight: 700;
        color: var(--nb-text);

        &.success { color: var(--nb-success); }
      }

      /* ---------- مسار الاعتماد ---------- */
      .rd-timeline {
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card);
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .rd-block-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--nb-text);
      }

      .rd-steps {
        display: flex;
        align-items: center;
      }

      .rd-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        width: 170px;
      }

      .rd-step-node {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;

        &.done { background: var(--nb-success); color: #fff; }
        &.current {
          background: var(--nb-primary-600);
          color: #fff;
          font-size: 11px;
          box-shadow: 0 0 0 4px var(--nb-primary-100);
        }
        &.pending {
          background: var(--nb-surface);
          border: 2px solid var(--nb-border);
          color: var(--nb-text-faint);
          font-size: 11px;
        }
      }

      .rd-step-title {
        font-size: 12px;
        font-weight: 600;

        &.done { color: var(--nb-text); }
        &.current { color: var(--nb-primary-600); font-weight: 700; }
        &.pending { color: var(--nb-text-faint); }
      }

      .rd-step-caption {
        font-size: 11px;
        color: var(--nb-text-faint);

        &.current { color: var(--nb-warning); font-weight: 600; }
      }

      .rd-step-line {
        flex: 1;
        height: 2px;
        background: var(--nb-border);
        margin-bottom: 34px;

        &.done { background: var(--nb-success); }
      }

      /* ---------- بنود الطلب ---------- */
      .rd-lines {
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .rd-lines-head,
      .rd-lines-row {
        display: grid;
        grid-template-columns: 2fr 0.7fr 1fr 1fr;
        gap: 8px;
        padding: 9px 16px;
        font-size: 13px;
      }

      .rd-lines-head {
        background: var(--nb-surface-raised);
        border-bottom: 1px solid var(--nb-border-soft);
        padding: 8px 16px;
        font-size: 11px;
        font-weight: 700;
        color: var(--nb-text-muted);
      }

      .rd-lines-row {
        border-bottom: 1px solid var(--nb-border-row);
        color: var(--nb-text);

        &:last-child { border-bottom: none; }

        .strong { font-weight: 600; }
      }

      /* ---------- لوحة الفحص ---------- */
      .rd-inspector {
        width: 296px;
        flex-shrink: 0;
        background: var(--nb-surface-raised);
        display: flex;
        flex-direction: column;
      }

      .rd-inspector-head {
        padding: 14px 16px 10px;
        display: flex;
        align-items: center;
        gap: 8px;
        border-bottom: 1px solid #e9ebf2;
      }

      .rd-inspector-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--nb-text);
      }

      .rd-inspector-collapse {
        font-size: 11px;
        color: var(--nb-text-muted);
        cursor: pointer;
      }

      .rd-inspector-body {
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        overflow-y: auto;
      }

      .rd-ai-card {
        border: 1px solid var(--nb-primary-200);
        background: var(--nb-primary-50);
        border-radius: var(--nb-radius-card);
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .rd-ai-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--nb-primary-600);
      }

      .rd-ai-text {
        font-size: 12px;
        color: var(--nb-text);
        line-height: 1.65;
      }

      .rd-inspector-section {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .rd-section-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--nb-text-muted);
      }

      .rd-related-card,
      .rd-comment-card {
        background: var(--nb-surface);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius);
        padding: 8px 10px;
        display: flex;
        flex-direction: column;
        gap: 1px;
      }

      .rd-related-title {
        font-size: 12px;
        font-weight: 600;
        color: var(--nb-text);
      }

      .rd-related-meta,
      .rd-comment-meta {
        font-size: 11px;
        color: var(--nb-text-faint);
      }

      .rd-comment-card { gap: 2px; }

      .rd-comment-body {
        font-size: 12px;
        color: var(--nb-text);
        line-height: 1.5;
      }

      .rd-comment-input {
        height: 30px;
        background: var(--nb-surface);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius);
        padding: 0 10px;
        font-family: var(--nb-font-family);
        font-size: 12px;
        color: var(--nb-text);
        outline: none;

        &::placeholder { color: var(--nb-text-faint); }
        &:focus-visible { box-shadow: var(--nb-focus-ring); }
      }

      .rd-inspector-actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        padding-top: 4px;
      }
    `,
  ],
})
export class ApprovalRequestDetailComponent implements OnInit {
  readonly coreService = inject(ApprovalCoreService);
  private readonly escalationService = inject(ApprovalEscalationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  requestId = '';

  readonly metaCells = signal<MetaCell[]>([]);
  readonly steps = signal<WorkflowStep[]>([]);
  readonly lineItems = signal<{ name: string; qty: string; unit: string; total: string }[]>([]);
  readonly related = signal<RelatedRecord[]>([]);
  readonly comments = signal<CommentView[]>([]);
  readonly draftComment = signal('');
  private readonly slaViolated = signal(false);

  readonly headBadge = computed(() => (this.slaViolated() ? 'عاجل · يتجاوز SLA' : null));

  readonly aiSummary = computed(() => {
    const req = this.coreService.selectedRequest();
    return req
      ? `طلب ${req.title_ar || req.title_en} ضمن فئة ${req.category_name || req.category}. تتم مراجعته وفق مسار الاعتماد المعتمد للمؤسسة.`
      : '';
  });

  ngOnInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('id') || '';
    this.loadAll();
  }

  loadAll(): void {
    this.coreService.getRequest(this.requestId).subscribe((req) => this.buildMetaFromPayload(req.payload));

    this.coreService.getTimeline(this.requestId).subscribe((history) => {
      const done: WorkflowStep[] = history.map((h: any) => ({
        title: h.step_name || h.action_taken,
        caption: h.timestamp ? new Date(h.timestamp).toLocaleDateString('ar') : '',
        state: 'done',
      }));
      const req = this.coreService.selectedRequest();
      if (req?.status === 'pending' && req.current_step) {
        done.push({ title: req.current_step, caption: 'بانتظارك الآن', state: 'current' });
      }
      this.steps.set(done);
    });

    this.coreService.getComments(this.requestId).subscribe((data) => {
      this.comments.set(
        data.map((c: any) => ({
          author: c.user_id || 'مستخدم',
          when: c.created_at ? new Date(c.created_at).toLocaleDateString('ar') : '',
          body: c.comment,
        }))
      );
    });

    this.coreService.getAttachments(this.requestId).subscribe((data) => {
      this.related.set(
        data.map((a: any) => ({ title: a.title || 'مستند', meta: a.source || 'مرفق' }))
      );
    });

    this.coreService.getSlaStatus(this.requestId).subscribe({
      next: (sla: any) => this.slaViolated.set(!!sla.is_violated),
      error: () => this.slaViolated.set(false),
    });
  }

  /** بناء شبكة البيانات وبنود الطلب من حمولة الطلب الحية */
  private buildMetaFromPayload(payload: any): void {
    if (!payload || typeof payload !== 'object') {
      this.metaCells.set([]);
      this.lineItems.set([]);
      return;
    }
    const cells: MetaCell[] = [];
    for (const [key, val] of Object.entries(payload)) {
      if (key === 'line_items' || val === null || typeof val === 'object') continue;
      cells.push({ label: key, value: String(val) });
      if (cells.length >= 4) break;
    }
    this.metaCells.set(cells);

    const lines = Array.isArray(payload.line_items) ? payload.line_items : [];
    this.lineItems.set(
      lines.map((l: any) => ({
        name: l.name ?? '',
        qty: String(l.qty ?? ''),
        unit: String(l.unit_price ?? ''),
        total: String(l.total ?? ''),
      }))
    );
  }

  subtitle(req: any): string {
    const cat = req.category_name || req.category || '';
    const date = req.created_at ? new Date(req.created_at).toLocaleDateString('ar') : '';
    return `الفئة: ${cat} · قدّمه ${req.requester_id} · ${date}`;
  }

  statusText(status: string): string {
    const map: Record<string, string> = {
      pending: 'قيد الانتظار',
      approved: 'معتمد',
      rejected: 'مرفوض',
      returned: 'مُعاد للمراجعة',
      escalated: 'مُصعَّد',
      cancelled: 'ملغى',
      expired: 'منتهي الصلاحية',
    };
    return map[status] || status;
  }

  goBack(): void {
    this.router.navigate(['/approvals/inbox']);
  }

  approve(): void {
    this.confirmAndDecide('approve', 'اعتماد الطلب', 'هل أنت متأكد من اعتماد هذا الطلب؟', 'primary');
  }
  reject(): void {
    this.confirmAndDecide('reject', 'رفض الطلب', 'هل أنت متأكد من رفض هذا الطلب؟', 'warn');
  }
  returnRequest(): void {
    this.confirmAndDecide('return', 'إرجاع الطلب للمراجعة', 'سيتم إرجاع الطلب لمقدّمه لاستكمال المتطلبات.', 'accent');
  }

  private confirmAndDecide(
    action: 'approve' | 'reject' | 'return',
    title: string,
    message: string,
    color: 'primary' | 'warn' | 'accent'
  ): void {
    const data: ConfirmDialogData = { title, message, color };
    this.dialog
      .open(ConfirmDialogComponent, { data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.coreService.makeDecision(this.requestId, action).subscribe(() => this.loadAll());
        }
      });
  }

  cancelRequest(): void {
    const data: ConfirmDialogData = {
      title: 'إلغاء الطلب',
      message: 'هل تريد إلغاء طلب الاعتماد نهائياً؟',
      color: 'warn',
    };
    this.dialog
      .open(ConfirmDialogComponent, { data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) this.coreService.cancelRequest(this.requestId).subscribe(() => this.loadAll());
      });
  }

  openDelegateDialog(): void {
    this.dialog
      .open(DelegationDialogComponent, { data: { requestId: this.requestId } })
      .afterClosed()
      .subscribe((result: DelegationDialogResult | undefined) => {
        if (result) {
          this.coreService.bulkDelegate([this.requestId], result.delegate_to_id).subscribe(() => this.loadAll());
        }
      });
  }

  openEscalateDialog(): void {
    this.dialog
      .open(EscalationDialogComponent)
      .afterClosed()
      .subscribe((result: EscalationDialogResult | undefined) => {
        if (result) {
          this.escalationService
            .createEscalation({
              request: this.requestId,
              escalated_to_id: result.escalated_to_id,
              reason: result.reason,
            })
            .subscribe(() => this.loadAll());
        }
      });
  }

  submitComment(): void {
    const body = this.draftComment().trim();
    if (!body) return;
    this.coreService.addComment(this.requestId, body).subscribe(() => {
      this.draftComment.set('');
      this.loadAll();
    });
  }
}
