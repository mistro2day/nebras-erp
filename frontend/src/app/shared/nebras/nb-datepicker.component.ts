import {
  ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener,
  Input, Output, computed, inject, signal,
} from '@angular/core';

interface DayCell { day: number; iso: string; inMonth: boolean; today: boolean; selected: boolean; disabled: boolean; }

/**
 * منتقي تاريخ (Date Picker) — لغة تصميم Nebras OS، بديل متوافق عن input[type=date].
 * حقل للقراءة فقط بأيقونة تقويم يفتح لوحة شهرية منسّقة (أسماء عربية، RTL).
 * يُصدِر القيمة بصيغة ISO (yyyy-MM-dd). ثنائي الاتجاه عبر [(value)].
 * الحالة الداخلية على signals لضمان تحديث العرض فورًا عند الاختيار.
 */
@Component({
  selector: 'nb-datepicker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dp" [class.open]="open()">
      <button type="button" class="dp-field" (click)="toggle($event)" [attr.aria-expanded]="open()"
              [attr.aria-label]="ariaLabel || 'اختيار تاريخ'" [disabled]="disabled">
        <svg class="cal-ico" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
             stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4" />
        </svg>
        <span class="dp-value" [class.placeholder]="!val()">{{ val() || (placeholder || 'اختر التاريخ') }}</span>
        @if (val() && !disabled) {
          <span class="dp-clear" role="button" aria-label="مسح التاريخ" (click)="clear($event)">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </span>
        }
      </button>

    @if (open()) {
         <div class="dp-pop" role="dialog" aria-label="تقويم" (click)="$event.stopPropagation()" [style.top.px]="posTop()" [style.left.px]="posLeft()">
          <div class="dp-head">
            <button type="button" class="nav" (click)="prevMonth()" aria-label="الشهر السابق">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
            <div class="dp-title">
              <select class="mon" [value]="viewMonth()" (change)="setMonth($event)" aria-label="الشهر">
                @for (m of monthNames; track $index) { <option [value]="$index">{{ m }}</option> }
              </select>
              <select class="yr" [value]="viewYear()" (change)="setYear($event)" aria-label="السنة">
                @for (y of yearRange(); track y) { <option [value]="y">{{ y }}</option> }
              </select>
            </div>
            <button type="button" class="nav" (click)="nextMonth()" aria-label="الشهر التالي">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
          </div>

          <div class="dp-weekdays">
            @for (w of weekdayNames; track w) { <span>{{ w }}</span> }
          </div>

          <div class="dp-grid">
            @for (cell of cells(); track cell.iso) {
              <button type="button" class="day"
                      [class.out]="!cell.inMonth" [class.today]="cell.today"
                      [class.sel]="cell.selected" [disabled]="cell.disabled"
                      (click)="pick(cell)">{{ cell.day }}</button>
            }
          </div>

          <div class="dp-foot">
            <button type="button" class="foot-btn" (click)="pickToday()">اليوم</button>
            <button type="button" class="foot-btn" (click)="close()">إغلاق</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .dp { position: relative; }
    .dp-field { display: flex; align-items: center; gap: 8px; width: 100%; height: 40px; padding: 0 10px;
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius); background: var(--nb-surface);
      color: var(--nb-text); font-family: var(--nb-font-family); font-size: 13px; cursor: pointer; text-align: start;
      transition: border-color 150ms ease, box-shadow 150ms ease; }
    .dp-field:hover:not(:disabled) { border-color: var(--nb-text-faint); }
    .dp.open .dp-field, .dp-field:focus-visible { border-color: var(--nb-primary-600); box-shadow: var(--nb-focus-ring); outline: none; }
    .dp-field:disabled { opacity: 0.55; cursor: not-allowed; }
    .cal-ico { color: var(--nb-text-muted); flex-shrink: 0; }
    .dp-value { flex: 1; font-variant-numeric: tabular-nums; }
    .dp-value.placeholder { color: var(--nb-text-faint); }
    .dp-clear { display: inline-flex; color: var(--nb-text-muted); border-radius: 50%; padding: 2px; }
    .dp-clear:hover { background: var(--nb-surface-raised); color: var(--nb-danger); }

    .dp-pop { position: fixed; z-index: 9999; width: 288px;
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      box-shadow: 0 12px 32px rgba(16,24,40,0.16); padding: 12px; transform-origin: top;
      animation: dpIn 160ms cubic-bezier(0.2, 0, 0, 1); }
    @keyframes dpIn { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .dp-pop { animation: none; } }

    .dp-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .nav { width: 30px; height: 30px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); background: var(--nb-surface);
      color: var(--nb-text-secondary); display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .nav:hover { background: var(--nb-surface-raised); color: var(--nb-primary-600); }
    .dp-title { flex: 1; display: flex; gap: 6px; }
    .mon, .yr { height: 30px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); background: var(--nb-surface);
      color: var(--nb-text); font-family: var(--nb-font-family); font-size: 12px; font-weight: 600; padding: 0 6px; outline: none; cursor: pointer; }
    .mon { flex: 1; } .yr { width: 78px; }
    .dp-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 4px; }
    .dp-weekdays span { text-align: center; font-size: 10px; font-weight: 700; color: var(--nb-text-faint); padding: 4px 0; }
    .dp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
    .day { height: 34px; border: none; background: transparent; border-radius: var(--nb-radius); font-family: var(--nb-font-family);
      font-size: 12.5px; color: var(--nb-text); cursor: pointer; font-variant-numeric: tabular-nums;
      transition: background 120ms ease, color 120ms ease; }
    .day:hover:not(:disabled):not(.sel) { background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .day.out { color: var(--nb-text-faint); }
    .day.today { box-shadow: inset 0 0 0 1px var(--nb-primary-600); font-weight: 700; }
    .day.sel { background: var(--nb-primary-600); color: var(--nb-on-primary); font-weight: 700; }
    .day:disabled { opacity: 0.3; cursor: not-allowed; }
    .dp-foot { display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--nb-border-soft); }
    .foot-btn { background: transparent; border: none; color: var(--nb-primary-600); font-family: var(--nb-font-family); font-size: 12px; font-weight: 600; cursor: pointer; padding: 4px 8px; border-radius: var(--nb-radius); }
    .foot-btn:hover { background: var(--nb-primary-50); }
  `],
})
export class NbDatepickerComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  /** الحالة الداخلية للقيمة (signal) — تُبقي العرض متزامنًا. */
  protected readonly val = signal<string>('');

  @Input()
  set value(v: string | null | undefined) { this.val.set(v ?? ''); }
  get value(): string { return this.val(); }

  @Output() valueChange = new EventEmitter<string>();
  @Input() placeholder = '';
  @Input() ariaLabel = '';
  @Input() disabled = false;
  @Input() min?: string;
  @Input() max?: string;

  readonly monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  readonly weekdayNames = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  readonly open = signal(false);
  private readonly today = new Date();
  readonly viewYear = signal(this.today.getFullYear());
  readonly viewMonth = signal(this.today.getMonth());
  private readonly _posTop = signal<number | null>(null);
  private readonly _posLeft = signal<number | null>(null);
  readonly posTop = this._posTop.asReadonly();
  readonly posLeft = this._posLeft.asReadonly();

  readonly yearRange = computed(() => {
    const base = this.viewYear();
    const start = Math.min(base - 80, this.today.getFullYear() - 80);
    const end = Math.max(base + 5, this.today.getFullYear() + 5);
    const arr: number[] = [];
    for (let y = end; y >= start; y--) arr.push(y);
    return arr;
  });

  readonly cells = computed<DayCell[]>(() => {
    const y = this.viewYear(), m = this.viewMonth();
    const first = new Date(y, m, 1);
    const startOffset = first.getDay(); // 0=الأحد
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const sel = this.val();
    const todayIso = this.iso(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    const out: DayCell[] = [];
    for (let i = startOffset - 1; i >= 0; i--) out.push(this.cell(y, m - 1, prevDays - i, false, sel, todayIso));
    for (let d = 1; d <= daysInMonth; d++) out.push(this.cell(y, m, d, true, sel, todayIso));
    while (out.length % 7 !== 0) {
      const idx = out.length - (startOffset + daysInMonth) + 1;
      out.push(this.cell(y, m + 1, idx, false, sel, todayIso));
    }
    return out;
  });

  private cell(y: number, m: number, d: number, inMonth: boolean, sel: string, todayIso: string): DayCell {
    const date = new Date(y, m, d);
    const iso = this.iso(date.getFullYear(), date.getMonth(), date.getDate());
    return {
      day: date.getDate(), iso, inMonth,
      today: iso === todayIso, selected: iso === sel,
      disabled: (!!this.min && iso < this.min) || (!!this.max && iso > this.max),
    };
  }

  private iso(y: number, m: number, d: number): string {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  toggle(e: Event): void {
    e.stopPropagation();
    if (this.disabled) return;
    const willOpen = !this.open();
    this.open.set(willOpen);
    if (willOpen) { this.syncView(); this.syncPosition(); }
  }
  close(): void { this.open.set(false); }

  private syncPosition(): void {
    const btn = this.host.nativeElement.querySelector('.dp-field') as HTMLElement;
    if (btn) {
      const r = btn.getBoundingClientRect();
      this._posTop.set(r.bottom + 6);
      this._posLeft.set(r.left);
    }
  }

  private syncView(): void {
    const v = this.val();
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y, m] = v.split('-').map(Number);
      this.viewYear.set(y); this.viewMonth.set(m - 1);
    } else {
      this.viewYear.set(this.today.getFullYear());
      this.viewMonth.set(this.today.getMonth());
    }
  }

  prevMonth(): void { const m = this.viewMonth(); if (m === 0) { this.viewMonth.set(11); this.viewYear.update((y) => y - 1); } else this.viewMonth.set(m - 1); }
  nextMonth(): void { const m = this.viewMonth(); if (m === 11) { this.viewMonth.set(0); this.viewYear.update((y) => y + 1); } else this.viewMonth.set(m + 1); }
  setMonth(e: Event): void { this.viewMonth.set(+(e.target as HTMLSelectElement).value); }
  setYear(e: Event): void { this.viewYear.set(+(e.target as HTMLSelectElement).value); }

  pick(cell: DayCell): void {
    if (cell.disabled) return;
    this.val.set(cell.iso);
    this.valueChange.emit(cell.iso);
    this.close();
  }

  pickToday(): void {
    const iso = this.iso(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
    if ((this.min && iso < this.min) || (this.max && iso > this.max)) return;
    this.val.set(iso); this.valueChange.emit(iso); this.close();
  }

  clear(e: Event): void { e.stopPropagation(); this.val.set(''); this.valueChange.emit(''); }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.close();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { if (this.open()) this.close(); }
}
