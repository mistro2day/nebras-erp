import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProcurementService } from '../procurement.service';
import { NotificationService } from '../../../core/services/notification.service';

/**
 * لوح الترسية — يقارن عروض أسعار الموردين لطلب RFQ محدّد (السعر ومدة التوريد)
 * ويُرسي على العرض الأفضل، فيولّد أمر شراء مسودة. نمط مقارنة العروض في Odoo/D365.
 */
@Component({
  selector: 'app-rfq-award-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="panel" dir="rtl">
      <div class="panel-head">
        <h3>ترسية طلب عروض الأسعار — {{ rfqNumber() }}</h3>
        <button class="x" (click)="close.emit()" aria-label="إغلاق">✕</button>
      </div>

      @if (loading()) {
        <div class="muted">جارٍ تحميل العروض…</div>
      } @else if (quotes().length === 0) {
        <div class="empty">لم تصل عروض أسعار لهذا الطلب بعد.</div>
      } @else {
        <div class="q-head">
          <span>المورّد</span><span>المرجع</span><span class="ta-end">القيمة</span>
          <span class="ta-end">مدة التوريد</span><span class="ta-end">ترسية</span>
        </div>
        @for (q of quotes(); track q.id) {
          <div class="q-row" [class.best]="q.id === bestId()">
            <span class="who">
              {{ q.vendor_name || q.vendor?.name_ar || 'مورّد' }}
              @if (q.id === bestId()) { <span class="best-tag">الأفضل سعراً</span> }
            </span>
            <span class="mono muted">{{ q.quotation_reference || '—' }}</span>
            <span class="ta-end strong">{{ q.total_amount | number:'1.0-2' }}</span>
            <span class="ta-end muted">{{ q.lead_time_days }} يوم</span>
            <span class="ta-end">
              <button class="award" [disabled]="busy()" (click)="award(q)">ترسية</button>
            </span>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .panel { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 16px; margin-bottom: 16px; font-family: var(--nb-font-family); }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .panel-head h3 { margin: 0; font-size: 14px; font-weight: 800; color: var(--nb-text); }
    .x { background: none; border: none; font-size: 16px; color: var(--nb-text-muted); cursor: pointer; }
    .q-head, .q-row { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr 0.9fr; gap: 8px; align-items: center; padding: 9px 6px; }
    .q-head { font-size: 11px; font-weight: 700; color: var(--nb-text-muted); border-bottom: 1px solid var(--nb-border-soft); }
    .q-row { border-bottom: 1px solid var(--nb-border-soft); font-size: 13px; color: var(--nb-text); }
    .q-row.best { background: #f0fdf4; border-radius: 8px; }
    .who { display: flex; align-items: center; gap: 8px; font-weight: 600; }
    .best-tag { font-size: 10px; font-weight: 700; background: #16a34a; color: #fff; padding: 2px 7px; border-radius: 999px; }
    .ta-end { text-align: end; } .mono { font-variant-numeric: tabular-nums; } .muted { color: var(--nb-text-muted); } .strong { font-weight: 800; }
    .award { background: var(--nb-primary-600); color: #fff; border: none; border-radius: 8px; padding: 6px 14px;
      font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
    .award:disabled { opacity: .6; cursor: default; }
    .empty, .muted { padding: 18px 6px; font-size: 13px; color: var(--nb-text-muted); }
  `]
})
export class RfqAwardPanelComponent implements OnInit {
  readonly rfqId = input.required<string>();
  readonly rfqNumber = input<string>('');
  readonly awarded = output<void>();
  readonly close = output<void>();

  private svc = inject(ProcurementService);
  private notify = inject(NotificationService);

  readonly quotes = signal<any[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);

  readonly bestId = computed(() => {
    const list = this.quotes();
    if (!list.length) return null;
    return [...list].sort((a, b) => (Number(a.total_amount) || 0) - (Number(b.total_amount) || 0))[0].id;
  });

  ngOnInit() {
    this.svc.getQuotations().subscribe({
      next: (d: any) => {
        const all = Array.isArray(d) ? d : (d?.data ?? d?.results ?? []);
        this.quotes.set(all.filter((q: any) => String(q.rfq) === String(this.rfqId())));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  award(q: any) {
    this.busy.set(true);
    this.svc.compareAndAward({ rfq_id: this.rfqId(), vendor_id: q.vendor, quotation_id: q.id }).subscribe({
      next: (r: any) => {
        this.busy.set(false);
        this.notify.success(`تمت الترسية وتوليد أمر شراء ${r?.po_number || ''}.`);
        this.awarded.emit();
      },
      error: (e) => { this.busy.set(false); this.notify.error(e?.error?.error || 'تعذّرت الترسية.'); },
    });
  }
}
