import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ParentService, ChildSummary } from './parent.service';

/**
 * الصفحة الرئيسية لولي الأمر — الأبناء هم البطل.
 * بطاقة لكل ابن تُبرز اسمه وصفّه ورصيده المستحق، وتفتح ملفه الكامل.
 */
@Component({
  selector: 'app-parent-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <section class="wrap" dir="rtl">
      <div class="head">
        <h1>أبنائي</h1>
        <p>تابع كل تفاصيل أبنائك الدراسية والمالية في مكان واحد.</p>
      </div>

      @if (loading()) {
        <div class="skeleton" *ngFor="let i of [1,2]"></div>
      } @else if (children().length === 0) {
        <div class="empty">
          <span class="e-ic">🎒</span>
          <strong>لا يوجد أبناء مرتبطون بحسابك بعد</strong>
          <p>تواصل مع إدارة المدرسة لربط أبنائك بحسابك.</p>
        </div>
      } @else {
        <div class="total-strip" *ngIf="totalOutstanding() > 0">
          <span>إجمالي المستحقات على أبنائك</span>
          <strong>{{ totalOutstanding() | number:'1.0-2' }}</strong>
        </div>

        @for (child of children(); track child.student_id) {
          <button class="child" (click)="open(child)">
            <div class="ava" [class.f]="child.gender === 'female'">{{ initial(child.name) }}</div>
            <div class="info">
              <strong>{{ child.name }}</strong>
              <span class="meta">{{ child.grade_level || 'طالب' }} · {{ child.student_number }}</span>
              <span class="status" [attr.data-s]="child.status">{{ statusText(child.status) }}</span>
            </div>
            <div class="fees" [class.due]="child.outstanding_balance > 0">
              @if (child.outstanding_balance > 0) {
                <span class="f-label">متبقٍ</span>
                <span class="f-val">{{ child.outstanding_balance | number:'1.0-2' }}</span>
              } @else {
                <span class="paid">مسدّد ✓</span>
              }
            </div>
            <span class="chev">‹</span>
          </button>
        }
      }
    </section>
  `,
  styles: [`
    :host { --p:#3F51B5; --accent:#F59E0B; --danger:#dc2626; --ok:#16a34a;
      --card:#fff; --muted:#6b7280; --line:#eceef5; font-family:'Cairo','Segoe UI',sans-serif; }
    .head h1 { margin:6px 0 2px; font-size:22px; font-weight:800; color:#1f2937; }
    .head p { margin:0 0 16px; font-size:13px; color:var(--muted); }
    .total-strip {
      display:flex; align-items:center; justify-content:space-between;
      background:linear-gradient(135deg,#fff7 ,#fff); border:1px solid #fde9c8;
      background:#fffaf0; border-radius:14px; padding:12px 16px; margin-bottom:14px;
    }
    .total-strip span { font-size:13px; color:#92400e; font-weight:600; }
    .total-strip strong { font-size:18px; color:var(--accent); font-weight:800; }
    .child {
      width:100%; text-align:right; display:flex; align-items:center; gap:14px;
      background:var(--card); border:1px solid var(--line); border-radius:18px;
      padding:14px 16px; margin-bottom:12px; cursor:pointer; font-family:inherit;
      transition:transform .12s, box-shadow .12s;
    }
    .child:hover { transform:translateY(-2px); box-shadow:0 8px 22px rgba(48,63,159,0.1); }
    .ava {
      width:52px; height:52px; border-radius:16px; flex-shrink:0;
      background:linear-gradient(135deg,#3F51B5,#5C6BC0); color:#fff;
      display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:800;
    }
    .ava.f { background:linear-gradient(135deg,#ec4899,#f472b6); }
    .info { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
    .info strong { font-size:15.5px; font-weight:700; color:#1f2937; }
    .info .meta { font-size:12px; color:var(--muted); }
    .status { font-size:11px; font-weight:700; color:var(--ok); margin-top:2px; }
    .status[data-s="suspended"], .status[data-s="withdrawn"] { color:var(--danger); }
    .fees { text-align:center; display:flex; flex-direction:column; }
    .fees .f-label { font-size:10px; color:var(--muted); }
    .fees .f-val { font-size:15px; font-weight:800; color:#1f2937; }
    .fees.due .f-val { color:var(--danger); }
    .fees .paid { font-size:12px; font-weight:700; color:var(--ok); }
    .chev { color:#c7cbd6; font-size:24px; transform:scaleX(-1); }
    .skeleton { height:82px; border-radius:18px; margin-bottom:12px;
      background:linear-gradient(90deg,#eef0f6,#f7f8fc,#eef0f6); background-size:200% 100%;
      animation:sh 1.2s infinite; }
    @keyframes sh { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    .empty { text-align:center; padding:48px 20px; color:var(--muted); }
    .empty .e-ic { font-size:44px; display:block; margin-bottom:10px; }
    .empty strong { display:block; color:#1f2937; font-size:15px; margin-bottom:4px; }
    .empty p { margin:0; font-size:13px; }
  `]
})
export class ParentHomeComponent implements OnInit {
  private parent = inject(ParentService);
  private router = inject(Router);

  readonly children = this.parent.children;
  readonly loading = this.parent.loadingChildren;
  readonly totalOutstanding = computed(() =>
    this.children().reduce((s, c) => s + (Number(c.outstanding_balance) || 0), 0));

  ngOnInit(): void {
    this.parent.loadChildren().subscribe();
  }

  open(child: ChildSummary): void {
    this.router.navigate(['/parent/child', child.student_id]);
  }

  initial(name: string): string {
    return (name || '؟').trim().charAt(0);
  }

  statusText(status: string): string {
    const map: Record<string, string> = {
      active: 'نشط', registered: 'مسجّل', enrolled: 'مقيّد', suspended: 'موقوف',
      graduated: 'متخرج', withdrawn: 'منسحب',
    };
    return map[status] || status || '—';
  }
}
