import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ParentService, ChildDetail } from './parent.service';

type Tab = 'profile' | 'finance' | 'academics' | 'health';

/**
 * ملف الابن الكامل لولي الأمر — تبويبات: الملف، المالية، الأكاديمي، الصحة.
 * زر بارز للانتقال إلى سداد الرسوم عند وجود مستحقات.
 */
@Component({
  selector: 'app-parent-child',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="wrap" dir="rtl">
      <button class="back" (click)="back()">‹ رجوع لأبنائي</button>

      @if (loading()) {
        <div class="sk hero"></div><div class="sk"></div><div class="sk"></div>
      } @else if (child(); as c) {
        <div class="hero">
          <div class="ava" [class.f]="c.profile['gender'] === 'female'">{{ initial(c.profile['name']) }}</div>
          <h1>{{ c.profile['name'] }}</h1>
          <span class="sub">{{ c.grade_level || 'طالب' }} · {{ c.student_number }}</span>
          @if (c.finance.outstanding_balance > 0) {
            <div class="due-banner">
              <div>
                <span class="l">الرسوم المتبقية</span>
                <span class="v">{{ c.finance.outstanding_balance | number:'1.0-2' }}</span>
              </div>
              <a class="pay-btn" [routerLink]="['/parent/pay', c.student_id]">سدّد الآن</a>
            </div>
          } @else {
            <div class="ok-banner">✓ لا توجد رسوم مستحقة حالياً</div>
          }
        </div>

        <div class="tabs">
          <button [class.on]="tab()==='profile'" (click)="tab.set('profile')">الملف</button>
          <button [class.on]="tab()==='finance'" (click)="tab.set('finance')">المالية</button>
          <button [class.on]="tab()==='academics'" (click)="tab.set('academics')">الأكاديمي</button>
          <button [class.on]="tab()==='health'" (click)="tab.set('health')">الصحة</button>
        </div>

        @switch (tab()) {
          @case ('profile') {
            <div class="card">
              <div class="kv"><span>الاسم بالإنجليزية</span><b>{{ c.profile['english_name'] || '—' }}</b></div>
              <div class="kv"><span>الجنس</span><b>{{ c.profile['gender']==='male'?'ذكر':c.profile['gender']==='female'?'أنثى':'—' }}</b></div>
              <div class="kv"><span>تاريخ الميلاد</span><b>{{ c.profile['date_of_birth'] || '—' }}</b></div>
              <div class="kv"><span>الجنسية</span><b>{{ c.profile['nationality'] || '—' }}</b></div>
              <div class="kv"><span>الرقم الوطني</span><b>{{ c.profile['national_id'] || '—' }}</b></div>
              <div class="kv"><span>فصيلة الدم</span><b>{{ c.profile['blood_group'] || '—' }}</b></div>
            </div>
            @if (c.family_relations.length) {
              <h3 class="sec">جهات التواصل</h3>
              <div class="card">
                @for (r of c.family_relations; track r.id) {
                  <div class="kv"><span>{{ relText(r.relationship) }} — {{ r.full_name }}</span><b>{{ r.phone || '—' }}</b></div>
                }
              </div>
            }
          }
          @case ('finance') {
            <div class="fin-stats">
              <div class="fs"><span>المستحق</span><b class="dg">{{ c.finance.outstanding_balance | number:'1.0-2' }}</b></div>
              <div class="fs"><span>رصيد دائن</span><b>{{ c.finance.credit_balance | number:'1.0-2' }}</b></div>
            </div>
            <h3 class="sec">الفواتير</h3>
            @if (c.finance.invoices.length) {
              <div class="card list">
                @for (inv of c.finance.invoices; track inv.id) {
                  <div class="row">
                    <div><b>{{ inv.invoice_number }}</b><span class="m">استحقاق {{ inv.due_date }}</span></div>
                    <div class="amt" [class.dg]="inv.outstanding_amount>0">
                      {{ inv.outstanding_amount>0 ? (inv.outstanding_amount | number:'1.0-2') : 'مسدّدة' }}
                    </div>
                  </div>
                }
              </div>
            } @else { <p class="none">لا توجد فواتير.</p> }

            <h3 class="sec">سجل المدفوعات</h3>
            @if (c.finance.online_payments.length) {
              <div class="card list">
                @for (p of c.finance.online_payments; track p.id) {
                  <div class="row">
                    <div><b>{{ p.amount | number:'1.0-2' }}</b><span class="m">{{ p.bank_name }} · {{ p.transfer_reference }}</span></div>
                    <span class="badge" [attr.data-s]="p.status">{{ payStatus(p.status) }}</span>
                  </div>
                }
              </div>
            } @else { <p class="none">لا توجد طلبات سداد بعد.</p> }
          }
          @case ('academics') {
            <div class="soon"><span>📚</span><p>سيظهر هنا الجدول الدراسي والدرجات والحضور قريباً.</p></div>
          }
          @case ('health') {
            <div class="soon"><span>🩺</span><p>سيظهر هنا الملف الصحي والتنبيهات الطبية قريباً.</p></div>
          }
        }
      } @else {
        <div class="soon"><span>⚠️</span><p>تعذّر تحميل بيانات الطالب.</p></div>
      }
    </section>
  `,
  styles: [`
    :host { --p:#3F51B5; --accent:#F59E0B; --danger:#dc2626; --ok:#16a34a;
      --muted:#6b7280; --line:#eceef5; font-family:'Cairo','Segoe UI',sans-serif; }
    .back { background:none; border:none; color:var(--p); font-family:inherit; font-weight:700;
      font-size:14px; cursor:pointer; padding:6px 0 12px; }
    .hero { text-align:center; background:#fff; border:1px solid var(--line); border-radius:20px;
      padding:22px 18px; margin-bottom:14px; }
    .ava { width:70px; height:70px; border-radius:20px; margin:0 auto 12px;
      background:linear-gradient(135deg,#3F51B5,#5C6BC0); color:#fff; display:flex;
      align-items:center; justify-content:center; font-size:30px; font-weight:800; }
    .ava.f { background:linear-gradient(135deg,#ec4899,#f472b6); }
    .hero h1 { margin:0 0 2px; font-size:20px; font-weight:800; color:#1f2937; }
    .hero .sub { font-size:13px; color:var(--muted); }
    .due-banner { display:flex; align-items:center; justify-content:space-between;
      background:#fff5f5; border:1px solid #fecaca; border-radius:14px; padding:12px 14px; margin-top:16px; }
    .due-banner .l { display:block; font-size:11px; color:#991b1b; }
    .due-banner .v { font-size:19px; font-weight:800; color:var(--danger); }
    .pay-btn { background:linear-gradient(135deg,#F59E0B,#f6a723); color:#fff; text-decoration:none;
      font-weight:800; font-size:14px; padding:11px 22px; border-radius:12px; }
    .ok-banner { margin-top:16px; background:#f0fdf4; border:1px solid #bbf7d0; color:#166534;
      border-radius:12px; padding:11px; font-weight:700; font-size:14px; }
    .tabs { display:flex; gap:6px; background:#eef0f6; padding:5px; border-radius:14px; margin-bottom:14px; }
    .tabs button { flex:1; border:none; background:none; padding:9px 4px; border-radius:10px;
      font-family:inherit; font-size:13px; font-weight:700; color:var(--muted); cursor:pointer; }
    .tabs button.on { background:#fff; color:var(--p); box-shadow:0 2px 8px rgba(48,63,159,0.1); }
    .card { background:#fff; border:1px solid var(--line); border-radius:16px; padding:6px 16px; margin-bottom:14px; }
    .kv { display:flex; justify-content:space-between; padding:11px 0; border-bottom:1px solid var(--line); font-size:13.5px; }
    .kv:last-child { border-bottom:none; }
    .kv span { color:var(--muted); } .kv b { color:#1f2937; font-weight:700; }
    .sec { font-size:14px; font-weight:800; color:#1f2937; margin:6px 2px 8px; }
    .fin-stats { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:6px; }
    .fs { background:#fff; border:1px solid var(--line); border-radius:14px; padding:14px; text-align:center; }
    .fs span { font-size:12px; color:var(--muted); display:block; }
    .fs b { font-size:18px; font-weight:800; color:#1f2937; } .fs b.dg { color:var(--danger); }
    .list .row { display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--line); }
    .list .row:last-child { border-bottom:none; }
    .row b { display:block; font-size:14px; color:#1f2937; } .row .m { font-size:11.5px; color:var(--muted); }
    .amt { font-weight:800; color:var(--ok); font-size:14px; } .amt.dg { color:var(--danger); }
    .badge { font-size:11.5px; font-weight:700; padding:4px 10px; border-radius:999px; background:#fef3c7; color:#92400e; }
    .badge[data-s="approved"] { background:#dcfce7; color:#166534; }
    .badge[data-s="rejected"] { background:#fee2e2; color:#991b1b; }
    .none { color:var(--muted); font-size:13px; text-align:center; padding:14px; }
    .soon { text-align:center; padding:40px 20px; color:var(--muted); }
    .soon span { font-size:40px; display:block; margin-bottom:8px; }
    .soon p { margin:0; font-size:13.5px; }
    .sk { height:70px; border-radius:16px; margin-bottom:12px;
      background:linear-gradient(90deg,#eef0f6,#f7f8fc,#eef0f6); background-size:200% 100%; animation:sh 1.2s infinite; }
    .sk.hero { height:160px; }
    @keyframes sh { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  `]
})
export class ParentChildComponent implements OnInit {
  private parent = inject(ParentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly child = signal<ChildDetail | null>(null);
  readonly loading = signal(true);
  readonly tab = signal<Tab>('profile');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.parent.getChild(id).subscribe({
      next: (c) => { this.child.set(c); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  back(): void { this.router.navigate(['/parent/home']); }
  initial(name: string): string { return (name || '؟').trim().charAt(0); }

  relText(r: string): string {
    const map: Record<string, string> = { father:'أب', mother:'أم', guardian:'ولي أمر', sponsor:'كفيل', sibling:'شقيق' };
    return map[r] || r;
  }
  payStatus(s: string): string {
    const map: Record<string, string> = { pending:'قيد المراجعة', approved:'معتمد', rejected:'مرفوض' };
    return map[s] || s;
  }
}
