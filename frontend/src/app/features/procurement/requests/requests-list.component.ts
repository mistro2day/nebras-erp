import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ProcurementService } from '../procurement.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PrCreateFormComponent } from './pr-create-form.component';

/** طلبات الشراء — الواردة من الأقسام مع الأولوية والحالة والقيمة التقديرية. */
@Component({
  selector: 'app-procurement-requests',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatDialogModule, NbPageHeaderComponent, PrCreateFormComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="طلبات الشراء" subtitle="طلبات الشراء الواردة من الأقسام في مسار الاعتماد والتوريد.">
        <button class="btn ghost" (click)="load()">تحديث</button>
        <button class="btn primary" (click)="creating.set(!creating())">
          {{ creating() ? 'إغلاق' : '＋ طلب شراء جديد' }}
        </button>
      </nb-page-header>

      @if (creating()) {
        <app-pr-create-form (created)="onCreated()" (cancel)="creating.set(false)"></app-pr-create-form>
      }

      <div class="toolbar">
        <input class="search" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="بحث برقم الطلب…" />
        <div class="chips">
          <button [class.on]="filter()===''" (click)="filter.set('')">الكل</button>
          <button [class.on]="filter()==='pending_approval'" (click)="filter.set('pending_approval')">تحت المراجعة</button>
          <button [class.on]="filter()==='approved'" (click)="filter.set('approved')">معتمد</button>
          <button [class.on]="filter()==='rfq_created'" (click)="filter.set('rfq_created')">أُنشئ RFQ</button>
          <button [class.on]="filter()==='completed'" (click)="filter.set('completed')">مكتمل</button>
        </div>
      </div>

      <section class="card">
        <div class="row head">
          <span>رقم الطلب</span><span>القسم الطالب</span><span>التاريخ</span><span>الأولوية</span>
          <span class="ta-end">تقديري</span><span class="ta-end">الحالة</span><span class="ta-end">إجراء</span>
        </div>
        @if (loading()) {
          @for (i of [1,2,3,4]; track i) { <div class="sk"></div> }
        } @else {
          @for (r of filtered(); track r.id) {
            <div class="row">
              <span class="mono">{{ r.request_number || '—' }}</span>
              <span>{{ deptName(r.department_id) }}</span>
              <span class="muted">{{ r.date || '—' }}</span>
              <span><span class="pri" [attr.data-p]="r.priority">{{ priText(r.priority) }}</span></span>
              <span class="ta-end strong">{{ fmt(r.total_estimated_amount) }}</span>
              <span class="ta-end"><span class="badge" [attr.data-s]="r.status">{{ statusText(r.status) }}</span></span>
              <span class="ta-end actions">
                @if (r.status === 'pending_approval') {
                  <button class="act ok" [disabled]="busyId()===r.id" (click)="approve(r)">اعتماد</button>
                } @else if (r.status === 'approved') {
                  <button class="act pri-btn" [disabled]="busyId()===r.id" (click)="makeRfq(r)">توليد RFQ</button>
                } @else { <span class="dash">—</span> }
              </span>
            </div>
          }
          @if (filtered().length === 0) { <div class="empty">لا توجد طلبات شراء مطابقة.</div> }
        }
      </section>
    </div>
  `,
  styleUrl: '../shared/procurement-table.scss',
  styles: [`
    .row { grid-template-columns: 1.1fr 1.2fr 0.9fr 0.8fr 0.9fr 1fr 0.9fr; }
    .actions { display: flex; justify-content: flex-end; }
    .act { border: none; border-radius: 8px; padding: 6px 12px; font-family: inherit; font-size: 12px;
      font-weight: 700; cursor: pointer; }
    .act:disabled { opacity: .6; cursor: default; }
    .act.ok { background: #16a34a; color: #fff; }
    .act.pri-btn { background: var(--nb-primary-600); color: #fff; }
    .dash { color: var(--nb-text-muted); }
  `],
})
export class ProcurementRequestsComponent implements OnInit {
  private svc = inject(ProcurementService);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);
  private notify = inject(NotificationService);
  readonly all = signal<any[]>([]);
  readonly loading = signal(true);
  readonly busyId = signal<string | null>(null);
  readonly creating = signal(false);
  readonly q = signal('');
  readonly filter = signal('');

  onCreated() { this.creating.set(false); this.load(); }

  /** خريطة معرّف القسم → اسمه (الطلب يخزّن department_id فقط). */
  private readonly deptMap = signal<Record<string, string>>({});
  deptName(id: any): string { return this.deptMap()[String(id)] || '—'; }

  readonly filtered = computed(() => {
    const term = this.q().trim();
    const f = this.filter();
    return this.all().filter(r =>
      (!f || r.status === f) && (!term || (r.request_number || '').includes(term)));
  });

  ngOnInit() {
    this.load();
    // أسماء الأقسام لعرض الجهة الطالبة (مصدرها وحدة التنظيم عبر البيانات المرجعية)
    this.svc.getRequestReferenceData().subscribe({
      next: (res: any) => {
        const list = (res?.data ?? res ?? {}).departments || [];
        this.deptMap.set(Object.fromEntries(list.map((d: any) => [String(d.id), d.name])));
      },
      error: () => {},
    });
  }

  load() {
    this.loading.set(true);
    this.svc.getPurchaseRequests({ page_size: 200 }).subscribe({
      next: (d) => { this.all.set(Array.isArray(d) ? d : (d?.data ?? d?.results ?? [])); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  private confirm(data: ConfirmDialogData): Promise<boolean> {
    return new Promise(resolve =>
      this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe(ok => resolve(!!ok)));
  }

  async approve(r: any): Promise<void> {
    const ok = await this.confirm({
      title: 'اعتماد طلب الشراء',
      message: `سيتم اعتماد الطلب «${r.request_number}» والمتابعة به في مسار الشراء.`,
      confirmText: 'اعتماد', color: 'primary',
    });
    if (!ok) return;
    const approverId = this.auth.currentUser()?.id;
    this.busyId.set(r.id);
    this.svc.approvePurchaseRequest(r.id, { approver_id: approverId }).subscribe({
      next: () => { this.busyId.set(null); this.notify.success('تم اعتماد طلب الشراء.'); this.load(); },
      error: (e) => { this.busyId.set(null); this.notify.error(e?.error?.error || 'تعذّر اعتماد الطلب.'); },
    });
  }

  async makeRfq(r: any): Promise<void> {
    const ok = await this.confirm({
      title: 'توليد طلب عروض أسعار',
      message: `سيتم توليد RFQ من الطلب «${r.request_number}» بموعد نهائي بعد 7 أيام لاستقبال عروض الموردين.`,
      confirmText: 'توليد RFQ', color: 'primary',
    });
    if (!ok) return;
    const deadline = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS
    this.busyId.set(r.id);
    this.svc.createRFQ({ purchase_request_id: r.id, deadline, notes: '' }).subscribe({
      next: () => { this.busyId.set(null); this.notify.success('تم توليد طلب عروض الأسعار.'); this.load(); },
      error: (e) => { this.busyId.set(null); this.notify.error(e?.error?.error || 'تعذّر توليد RFQ.'); },
    });
  }

  fmt(v: any) { return (Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
  priText(p: string) { return ({ high: 'عاجل', medium: 'متوسط', low: 'منخفض' } as any)[p] || p || '—'; }
  statusText(s: string) {
    return ({ draft: 'مسودة', pending_approval: 'تحت المراجعة', approved: 'معتمد للشراء',
      rejected: 'مرفوض', rfq_created: 'أُنشئ RFQ', completed: 'مكتمل' } as any)[s] || s;
  }
}
