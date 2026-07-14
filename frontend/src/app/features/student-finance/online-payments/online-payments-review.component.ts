import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentFinanceService } from '../student-finance.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';

/**
 * مراجعة مدفوعات أولياء الأمور — يستعرض المحاسب طلبات التحويل البنكي المعلّقة،
 * يفتح صورة الإيصال، ثم يعتمد الطلب (يولّد إيصال قبض ويخصم المستحق) أو يرفضه بسبب.
 */
@Component({
  selector: 'app-online-payments-review',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="مراجعة مدفوعات أولياء الأمور"
        subtitle="طلبات السداد عبر التحويل البنكي بانتظار الاعتماد أو الرفض.">
      </nb-page-header>

      <div class="filters">
        <button [class.on]="filter()==='pending'" (click)="setFilter('pending')">
          المعلّقة @if (pendingCount()) { <span class="cnt">{{ pendingCount() }}</span> }
        </button>
        <button [class.on]="filter()==='approved'" (click)="setFilter('approved')">المعتمدة</button>
        <button [class.on]="filter()==='rejected'" (click)="setFilter('rejected')">المرفوضة</button>
        <button [class.on]="filter()===''" (click)="setFilter('')">الكل</button>
      </div>

      @if (loading()) {
        <div class="nb-card sk" *ngFor="let i of [1,2,3]"></div>
      } @else if (items().length === 0) {
        <div class="nb-card empty">لا توجد طلبات في هذا التصنيف.</div>
      } @else {
        <div class="grid">
          @for (p of items(); track p.id) {
            <div class="nb-card req">
              <div class="req-top">
                <div>
                  <strong class="amt">{{ p.amount | number:'1.2-2' }}</strong>
                  <span class="stu">{{ p.student_name || 'طالب' }}</span>
                </div>
                <span class="badge" [attr.data-s]="p.status">{{ statusText(p.status) }}</span>
              </div>
              <div class="req-kv"><span>البنك</span><b>{{ p.bank_name }}</b></div>
              <div class="req-kv"><span>الرقم المرجعي</span><b>{{ p.transfer_reference }}</b></div>
              <div class="req-kv"><span>تاريخ التحويل</span><b>{{ p.transfer_date }}</b></div>
              @if (p.sender_name) { <div class="req-kv"><span>المُحوِّل</span><b>{{ p.sender_name }}</b></div> }
              @if (p.note) { <div class="note">📝 {{ p.note }}</div> }

              @if (p.receipt_url) {
                <a class="view-receipt" [href]="p.receipt_url" target="_blank">📎 عرض إيصال التحويل</a>
              }

              @if (p.status === 'pending') {
                @if (rejectingId() === p.id) {
                  <div class="reject-box">
                    <textarea [(ngModel)]="rejectReason" rows="2" placeholder="سبب الرفض (يظهر لولي الأمر)"></textarea>
                    <div class="rbtns">
                      <button class="danger" [disabled]="busyId()===p.id" (click)="confirmReject(p)">تأكيد الرفض</button>
                      <button class="ghost" (click)="rejectingId.set(null)">إلغاء</button>
                    </div>
                  </div>
                } @else {
                  <div class="actions">
                    <button class="approve" [disabled]="busyId()===p.id" (click)="approve(p)">
                      {{ busyId()===p.id ? 'جارٍ…' : '✓ اعتماد وخصم المستحق' }}
                    </button>
                    <button class="reject" (click)="startReject(p)">✕ رفض</button>
                  </div>
                }
              } @else if (p.status === 'rejected' && p.rejection_reason) {
                <div class="reason">سبب الرفض: {{ p.rejection_reason }}</div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex:1; padding:20px; overflow-y:auto; }
    .filters { display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap; }
    .filters button { background:var(--nb-surface-raised,#eef0f6); border:1px solid var(--nb-border-soft,#e5e7eb);
      padding:8px 16px; border-radius:999px; font-family:inherit; font-size:13px; font-weight:700;
      color:var(--nb-text-secondary,#6b7280); cursor:pointer; }
    .filters button.on { background:var(--nb-primary-600,#3F51B5); color:#fff; border-color:transparent; }
    .cnt { background:#fff; color:var(--nb-primary-700,#303F9F); border-radius:999px; padding:0 7px; font-size:11px; margin-inline-start:4px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:14px; }
    .req { padding:16px; }
    .req-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:12px; }
    .amt { font-size:22px; font-weight:800; color:var(--nb-text,#1f2937); display:block; }
    .stu { font-size:13px; color:var(--nb-text-muted,#6b7280); }
    .badge { font-size:11.5px; font-weight:700; padding:5px 12px; border-radius:999px; background:#fef3c7; color:#92400e; }
    .badge[data-s="approved"] { background:#dcfce7; color:#166534; }
    .badge[data-s="rejected"] { background:#fee2e2; color:#991b1b; }
    .req-kv { display:flex; justify-content:space-between; padding:7px 0; font-size:13px; border-bottom:1px solid var(--nb-border-soft,#eee); }
    .req-kv span { color:var(--nb-text-muted,#6b7280); } .req-kv b { color:var(--nb-text,#1f2937); font-weight:700; }
    .note { margin-top:8px; font-size:12.5px; color:var(--nb-text-secondary,#555); background:#f8fafc; padding:8px 10px; border-radius:8px; }
    .view-receipt { display:block; text-align:center; margin-top:12px; padding:10px; border-radius:10px;
      background:var(--nb-primary-50,#eef0fa); color:var(--nb-primary-700,#303F9F); text-decoration:none; font-weight:700; font-size:13px; }
    .actions { display:flex; gap:8px; margin-top:14px; }
    .approve { flex:1; background:#16a34a; color:#fff; border:none; padding:11px; border-radius:10px; font-family:inherit; font-weight:800; font-size:13.5px; cursor:pointer; }
    .approve:disabled { opacity:.6; }
    .reject { background:#fff; border:1px solid #fecaca; color:#dc2626; padding:11px 16px; border-radius:10px; font-family:inherit; font-weight:800; font-size:13.5px; cursor:pointer; }
    .reject-box { margin-top:14px; }
    .reject-box textarea { width:100%; box-sizing:border-box; font-family:inherit; font-size:13px; padding:10px; border:1px solid var(--nb-border-soft,#e5e7eb); border-radius:10px; }
    .rbtns { display:flex; gap:8px; margin-top:8px; }
    .danger { flex:1; background:#dc2626; color:#fff; border:none; padding:10px; border-radius:10px; font-family:inherit; font-weight:800; cursor:pointer; }
    .ghost { background:none; border:none; color:var(--nb-text-muted,#6b7280); font-family:inherit; font-weight:700; cursor:pointer; }
    .reason { margin-top:12px; background:#fef2f2; border-radius:8px; padding:8px 10px; font-size:12.5px; color:#991b1b; }
    .empty { text-align:center; padding:40px; color:var(--nb-text-muted,#6b7280); }
    .sk { height:220px; background:linear-gradient(90deg,#eef0f6,#f7f8fc,#eef0f6); background-size:200% 100%; animation:sh 1.2s infinite; }
    @keyframes sh { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  `]
})
export class OnlinePaymentsReviewComponent implements OnInit {
  private sf = inject(StudentFinanceService);

  readonly items = signal<any[]>([]);
  readonly loading = signal(true);
  readonly filter = signal<string>('pending');
  readonly busyId = signal<string | null>(null);
  readonly rejectingId = signal<string | null>(null);
  rejectReason = '';

  readonly pendingCount = computed(() =>
    this.filter() === 'pending' ? this.items().length : this._pending());
  private _pending = signal(0);

  ngOnInit(): void { this.load(); }

  setFilter(f: string): void { this.filter.set(f); this.load(); }

  load(): void {
    this.loading.set(true);
    const params: any = { page_size: 100 };
    if (this.filter()) params.status = this.filter();
    this.sf.listOnlinePayments(params).subscribe({
      next: (res) => {
        const data = (res as any)?.data || (res as any)?.results || res || [];
        this.items.set(data);
        if (this.filter() === 'pending') this._pending.set(data.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  approve(p: any): void {
    this.busyId.set(p.id);
    this.sf.approveOnlinePayment(p.id).subscribe({
      next: () => { this.busyId.set(null); this.load(); },
      error: () => this.busyId.set(null),
    });
  }

  startReject(p: any): void { this.rejectingId.set(p.id); this.rejectReason = ''; }

  confirmReject(p: any): void {
    if (!this.rejectReason.trim()) return;
    this.busyId.set(p.id);
    this.sf.rejectOnlinePayment(p.id, this.rejectReason.trim()).subscribe({
      next: () => { this.busyId.set(null); this.rejectingId.set(null); this.load(); },
      error: () => this.busyId.set(null),
    });
  }

  statusText(s: string): string {
    const map: Record<string, string> = { pending: 'قيد المراجعة', approved: 'معتمد', rejected: 'مرفوض' };
    return map[s] || s;
  }
}
