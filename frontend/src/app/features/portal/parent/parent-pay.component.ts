import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ParentService, ChildDetail } from './parent.service';

/**
 * معالج سداد الرسوم عبر التحويل البنكي (بنك الخرطوم / تطبيق بنكك).
 *
 * خطوتان: (1) تعليمات التحويل إلى حساب المدرسة، (2) تأكيد التحويل بإدخال
 * الرقم المرجعي والمبلغ وإرفاق صورة الإيصال. يبقى الطلب معلّقاً حتى يعتمده المحاسب.
 */
@Component({
  selector: 'app-parent-pay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="wrap" dir="rtl">
      <button class="back" (click)="back()">‹ رجوع</button>
      <h1>سداد الرسوم</h1>

      @if (done()) {
        <div class="success">
          <div class="tick">✓</div>
          <h2>تم استلام طلب السداد</h2>
          <p>طلبك الآن قيد مراجعة المحاسبة. سنُشعرك فور اعتماده. شكراً لك.</p>
          <button class="primary" (click)="back()">العودة لملف الابن</button>
        </div>
      } @else {
        <!-- الخطوة 1: تعليمات التحويل -->
        <div class="steps">
          <span class="step" [class.on]="step()>=1">1 التحويل</span>
          <span class="line"></span>
          <span class="step" [class.on]="step()>=2">2 تأكيد الإيصال</span>
        </div>

        @if (step() === 1) {
          <div class="bank-card">
            <div class="bank-head">
              <span class="bico">🏦</span>
              <div><strong>بنك الخرطوم</strong><span>حوّل المبلغ عبر تطبيق «بنكك» أو أي فرع</span></div>
            </div>
            <div class="bank-kv"><span>اسم الحساب</span><b>{{ schoolAccountName }}</b></div>
            <div class="bank-kv">
              <span>رقم الحساب (BBAN)</span>
              <b class="copyable" (click)="copy(schoolAccount)">{{ schoolAccount }} ⧉</b>
            </div>
            @if (childData(); as c) {
              <div class="bank-kv due"><span>المبلغ المتبقّي</span><b>{{ c.finance.outstanding_balance | number:'1.0-2' }}</b></div>
            }
          </div>
          <div class="hint">
            💡 بعد إتمام التحويل عبر «بنكك»، ستحصل على إيصال يحمل رقماً مرجعياً.
            التقط صورة له وأرفقها في الخطوة التالية.
          </div>
          <button class="primary" (click)="step.set(2)">أتممت التحويل — التالي</button>
        }

        <!-- الخطوة 2: تأكيد الإيصال -->
        @if (step() === 2) {
          <form class="form" (ngSubmit)="submit()">
            <label>المبلغ المُحوّل <span>*</span>
              <input type="number" min="1" step="0.01" [(ngModel)]="amount" name="amount" required
                     placeholder="مثال: 1500" />
            </label>
            <label>الرقم المرجعي للتحويل <span>*</span>
              <input type="text" [(ngModel)]="reference" name="reference" required
                     placeholder="الرقم الظاهر في إيصال بنكك" />
            </label>
            <label>تاريخ التحويل <span>*</span>
              <input type="date" [(ngModel)]="transferDate" name="transferDate" required [max]="today" />
            </label>
            <label>اسم صاحب الحساب المُحوِّل
              <input type="text" [(ngModel)]="senderName" name="senderName" placeholder="اختياري" />
            </label>
            <label>صورة الإيصال <span>*</span>
              <input type="file" accept="image/*,application/pdf" (change)="onFile($event)" name="file" required />
            </label>
            @if (fileName()) { <span class="file-ok">📎 {{ fileName() }}</span> }
            <label>ملاحظة
              <textarea [(ngModel)]="note" name="note" rows="2" placeholder="اختياري"></textarea>
            </label>

            @if (error()) { <div class="err">{{ error() }}</div> }

            <button class="primary" type="submit" [disabled]="submitting()">
              {{ submitting() ? 'جارٍ الإرسال…' : 'إرسال طلب السداد' }}
            </button>
            <button class="ghost" type="button" (click)="step.set(1)">رجوع لتعليمات التحويل</button>
          </form>
        }
      }
    </section>
  `,
  styles: [`
    :host { --p:#3F51B5; --accent:#F59E0B; --danger:#dc2626; --ok:#16a34a;
      --muted:#6b7280; --line:#e5e7eb; font-family:'Cairo','Segoe UI',sans-serif; }
    .back { background:none; border:none; color:var(--p); font-family:inherit; font-weight:700;
      font-size:14px; cursor:pointer; padding:6px 0; }
    h1 { margin:2px 0 16px; font-size:21px; font-weight:800; color:#1f2937; }
    .steps { display:flex; align-items:center; gap:8px; margin-bottom:16px; }
    .step { font-size:12.5px; font-weight:700; color:var(--muted); background:#eef0f6;
      padding:7px 12px; border-radius:999px; }
    .step.on { background:var(--p); color:#fff; }
    .line { flex:1; height:2px; background:var(--line); }
    .bank-card { background:#fff; border:1px solid var(--line); border-radius:18px; padding:16px; margin-bottom:14px; }
    .bank-head { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
    .bico { font-size:30px; }
    .bank-head strong { display:block; font-size:16px; color:#1f2937; font-weight:800; }
    .bank-head span { font-size:12px; color:var(--muted); }
    .bank-kv { display:flex; justify-content:space-between; padding:11px 0; border-bottom:1px solid var(--line); font-size:14px; }
    .bank-kv:last-child { border-bottom:none; } .bank-kv span { color:var(--muted); }
    .bank-kv b { color:#1f2937; font-weight:700; } .bank-kv.due b { color:var(--danger); font-size:16px; }
    .copyable { cursor:pointer; color:var(--p); }
    .hint { background:#fffaf0; border:1px solid #fde9c8; color:#92400e; border-radius:12px;
      padding:12px 14px; font-size:13px; line-height:1.8; margin-bottom:16px; }
    .form { display:flex; flex-direction:column; gap:14px; }
    label { display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:700; color:#374151; }
    label span { color:var(--danger); }
    input, textarea { font-family:inherit; font-size:14px; padding:11px 12px; border:1px solid var(--line);
      border-radius:12px; background:#fff; color:#1f2937; }
    input:focus, textarea:focus { outline:none; border-color:var(--p); box-shadow:0 0 0 3px rgba(63,81,181,0.12); }
    .file-ok { font-size:12.5px; color:var(--ok); font-weight:700; margin-top:-6px; }
    .err { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; border-radius:10px; padding:10px 12px; font-size:13px; }
    .primary { background:linear-gradient(135deg,#3F51B5,#303F9F); color:#fff; border:none;
      padding:14px; border-radius:14px; font-family:inherit; font-size:15px; font-weight:800; cursor:pointer; }
    .primary:disabled { opacity:.6; cursor:default; }
    .ghost { background:none; border:none; color:var(--muted); font-family:inherit; font-weight:700;
      font-size:13px; cursor:pointer; padding:4px; }
    .success { text-align:center; padding:40px 20px; }
    .tick { width:70px; height:70px; border-radius:50%; background:var(--ok); color:#fff; font-size:36px;
      display:flex; align-items:center; justify-content:center; margin:0 auto 16px; }
    .success h2 { margin:0 0 8px; font-size:19px; color:#1f2937; font-weight:800; }
    .success p { margin:0 0 20px; font-size:14px; color:var(--muted); line-height:1.8; }
  `]
})
export class ParentPayComponent implements OnInit {
  private parent = inject(ParentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // بيانات حساب المدرسة البنكي (يمكن جعلها ديناميكية لاحقاً من الإعدادات)
  readonly schoolAccountName = 'منصة نبراس التعليمية';
  readonly schoolAccount = '1234567890123456';
  readonly today = new Date().toISOString().slice(0, 10);

  readonly childData = signal<ChildDetail | null>(null);
  readonly step = signal(1);
  readonly submitting = signal(false);
  readonly done = signal(false);
  readonly error = signal('');
  readonly fileName = signal('');

  private studentId = '';
  private file: File | null = null;

  amount: number | null = null;
  reference = '';
  transferDate = this.today;
  senderName = '';
  note = '';

  ngOnInit(): void {
    this.studentId = this.route.snapshot.paramMap.get('id')!;
    this.parent.getChild(this.studentId).subscribe({
      next: (c) => {
        this.childData.set(c);
        if (c.finance.outstanding_balance > 0) this.amount = c.finance.outstanding_balance;
      },
    });
  }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.file = input.files?.[0] || null;
    this.fileName.set(this.file?.name || '');
  }

  submit(): void {
    this.error.set('');
    const acc = this.childData()?.finance.billing_account_id;
    if (!acc) { this.error.set('لا يوجد حساب مالي لهذا الطالب.'); return; }
    if (!this.amount || this.amount <= 0) { this.error.set('أدخل مبلغاً صحيحاً.'); return; }
    if (!this.reference.trim()) { this.error.set('أدخل الرقم المرجعي للتحويل.'); return; }
    if (!this.file) { this.error.set('أرفق صورة إيصال التحويل.'); return; }

    const fd = new FormData();
    fd.append('student_billing_account', acc);
    fd.append('amount', String(this.amount));
    fd.append('transfer_reference', this.reference.trim());
    fd.append('transfer_date', this.transferDate);
    fd.append('bank_name', 'بنك الخرطوم');
    if (this.senderName.trim()) fd.append('sender_name', this.senderName.trim());
    if (this.note.trim()) fd.append('note', this.note.trim());
    fd.append('receipt_attachment', this.file);

    this.submitting.set(true);
    this.parent.submitPayment(fd).subscribe({
      next: () => { this.submitting.set(false); this.done.set(true); },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.error || err?.error?.detail || 'تعذّر إرسال الطلب. حاول مرة أخرى.');
      },
    });
  }

  copy(text: string): void {
    navigator.clipboard?.writeText(text);
  }

  back(): void { this.router.navigate(['/parent/child', this.studentId]); }
}
