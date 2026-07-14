import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentService } from './parent.service';

/**
 * سجل طلبات السداد لولي الأمر مع حالتها (معلّق/معتمد/مرفوض).
 */
@Component({
  selector: 'app-parent-payments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <section class="wrap" dir="rtl">
      <h1>مدفوعاتي</h1>
      <p class="sub">تابع حالة طلبات سداد الرسوم التي أرسلتها.</p>

      @if (loading()) {
        <div class="sk" *ngFor="let i of [1,2,3]"></div>
      } @else if (items().length === 0) {
        <div class="empty"><span>🧾</span><strong>لا توجد طلبات سداد بعد</strong>
          <p>ابدأ السداد من ملف أحد أبنائك.</p></div>
      } @else {
        @for (p of items(); track p.id) {
          <div class="pay">
            <div class="top">
              <strong>{{ p.amount | number:'1.0-2' }}</strong>
              <span class="badge" [attr.data-s]="p.status">{{ statusText(p.status) }}</span>
            </div>
            <div class="meta">
              <span>{{ p.student_name || 'طالب' }}</span>
              <span>{{ p.bank_name }} · مرجع {{ p.transfer_reference }}</span>
              <span>{{ p.transfer_date }}</span>
            </div>
            @if (p.status === 'rejected' && p.rejection_reason) {
              <div class="reason">سبب الرفض: {{ p.rejection_reason }}</div>
            }
          </div>
        }
      }
    </section>
  `,
  styles: [`
    :host { --p:#3F51B5; --muted:#6b7280; --line:#eceef5; font-family:'Cairo','Segoe UI',sans-serif; }
    h1 { margin:6px 0 2px; font-size:22px; font-weight:800; color:#1f2937; }
    .sub { margin:0 0 16px; font-size:13px; color:var(--muted); }
    .pay { background:#fff; border:1px solid var(--line); border-radius:16px; padding:14px 16px; margin-bottom:12px; }
    .top { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
    .top strong { font-size:18px; font-weight:800; color:#1f2937; }
    .badge { font-size:11.5px; font-weight:700; padding:5px 12px; border-radius:999px; background:#fef3c7; color:#92400e; }
    .badge[data-s="approved"] { background:#dcfce7; color:#166534; }
    .badge[data-s="rejected"] { background:#fee2e2; color:#991b1b; }
    .meta { display:flex; flex-direction:column; gap:2px; font-size:12.5px; color:var(--muted); }
    .reason { margin-top:8px; background:#fef2f2; border-radius:8px; padding:8px 10px; font-size:12.5px; color:#991b1b; }
    .empty { text-align:center; padding:48px 20px; color:var(--muted); }
    .empty span { font-size:42px; display:block; margin-bottom:10px; }
    .empty strong { display:block; color:#1f2937; font-size:15px; margin-bottom:4px; }
    .empty p { margin:0; font-size:13px; }
    .sk { height:88px; border-radius:16px; margin-bottom:12px;
      background:linear-gradient(90deg,#eef0f6,#f7f8fc,#eef0f6); background-size:200% 100%; animation:sh 1.2s infinite; }
    @keyframes sh { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  `]
})
export class ParentPaymentsComponent implements OnInit {
  private parent = inject(ParentService);
  readonly items = signal<any[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.parent.listMyPayments().subscribe({
      next: (res) => { this.items.set(res?.results || res?.data || res || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusText(s: string): string {
    const map: Record<string, string> = { pending:'قيد المراجعة', approved:'معتمد', rejected:'مرفوض' };
    return map[s] || s;
  }
}
