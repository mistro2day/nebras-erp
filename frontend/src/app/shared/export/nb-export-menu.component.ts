import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportColumn } from './export.types';
import { exportExcel, exportPdf, printDoc } from './export.functions';

/**
 * قائمة تصدير موحّدة (Excel / PDF / طباعة) — لغة تصميم نبراس، عربية RTL.
 * تُوضع في ترويسة أي صفحة: <nb-export-menu [columns]="cols" [rows]="data" title="…" />
 * تعرض مؤشر تحميل بصري عالي الجودة أثناء عمليات التصدير الطويلة (PDF / Excel).
 */
@Component({
  selector: 'nb-export-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="nb-exp">
      <button class="nb-exp-btn xl" [disabled]="busy()" (click)="doExcel()" title="تصدير Excel">
        <span class="ico">▤</span> Excel
      </button>
      <button class="nb-exp-btn pdf" [disabled]="busy()" (click)="doPdf()" title="تصدير PDF">
        <span class="ico">▦</span> PDF
      </button>
      @if (showPrint) {
        <button class="nb-exp-btn" (click)="doPrint()" title="طباعة"><span class="ico">🖨️</span> طباعة</button>
      }
    </div>

    <!-- مؤشر تحميل بصري أثناء التصدير — نمط نبراس -->
    @if (busy()) {
      <div class="nb-export-overlay" (click)="$event.stopPropagation()">
        <div class="nb-export-card">
          <div class="export-spinner-wrap">
            <div class="export-ring"></div>
            <div class="export-icon">{{ exportIcon() }}</div>
          </div>
          <div class="export-title">{{ exportMessage() }}</div>
          <div class="export-sub">يُرجى الانتظار... يتم توليد المستند الرسمي بجودة عالية</div>
          <div class="export-progress">
            <div class="export-progress-bar"></div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .nb-exp { display: inline-flex; align-items: center; gap: 6px; }
    .nb-exp-btn { display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 12px;
      font-family: var(--nb-font-family); font-size: 12px; font-weight: 600; cursor: pointer;
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius); background: var(--nb-surface-raised); color: var(--nb-text);
      white-space: nowrap; transition: all 0.15s ease; }
    .nb-exp-btn:hover:not(:disabled) { border-color: var(--nb-primary-400); color: var(--nb-primary-700); }
    .nb-exp-btn:disabled { opacity: .55; cursor: not-allowed; }
    .nb-exp-btn .ico { font-size: 13px; line-height: 1; }
    .nb-exp-btn.xl { color: #157347; } .nb-exp-btn.xl:hover:not(:disabled) { border-color: #157347; }
    .nb-exp-btn.pdf { color: #C0392B; } .nb-exp-btn.pdf:hover:not(:disabled) { border-color: #C0392B; }

    /* ───── مؤثر التصدير البصري على نمط نبراس ───── */
    .nb-export-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      animation: nb-overlay-in 0.25s ease-out;
    }
    .nb-export-card {
      background: #ffffff;
      border-radius: 16px;
      padding: 36px 44px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      min-width: 320px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 87, 184, 0.08);
      animation: nb-card-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .export-spinner-wrap {
      position: relative;
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .export-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 3px solid rgba(0, 87, 184, 0.12);
      border-top-color: #0057B8;
      border-right-color: #2563eb;
      animation: nb-spin 0.9s linear infinite;
    }
    .export-icon {
      font-size: 26px;
      line-height: 1;
      animation: nb-pulse-icon 1.8s ease-in-out infinite;
    }
    .export-title {
      font-family: var(--nb-font-family);
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      text-align: center;
    }
    .export-sub {
      font-family: var(--nb-font-family);
      font-size: 12.5px;
      font-weight: 500;
      color: #64748b;
      text-align: center;
      animation: nb-text-pulse 1.5s ease-in-out infinite;
    }
    .export-progress {
      width: 100%;
      height: 4px;
      border-radius: 4px;
      background: #e2e8f0;
      overflow: hidden;
      margin-top: 4px;
    }
    .export-progress-bar {
      height: 100%;
      border-radius: 4px;
      background: linear-gradient(90deg, #0057B8, #2563eb, #60a5fa, #2563eb, #0057B8);
      background-size: 300% 100%;
      animation: nb-progress-flow 2s ease-in-out infinite;
    }

    @keyframes nb-overlay-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes nb-card-in {
      from { opacity: 0; transform: scale(0.92) translateY(12px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes nb-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes nb-pulse-icon {
      0%, 100% { transform: scale(1); opacity: 0.85; }
      50% { transform: scale(1.12); opacity: 1; }
    }
    @keyframes nb-text-pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
    @keyframes nb-progress-flow {
      0% { background-position: 100% 0; width: 30%; }
      50% { width: 80%; }
      100% { background-position: -100% 0; width: 30%; }
    }
  `],
})
export class NbExportMenuComponent {
  @Input({ required: true }) columns: ExportColumn[] = [];
  @Input({ required: true }) rows: any[] = [];
  @Input({ required: true }) title = '';
  @Input() subtitle?: string;
  @Input() filename?: string;
  @Input() showPrint = true;
  @Input() customPrint?: () => void;
  @Input() customPdf?: () => Promise<void> | void;

  readonly busy = signal(false);
  readonly exportMessage = signal('جاري تصدير التقرير...');
  readonly exportIcon = signal('📄');

  private meta() { return { title: this.title, subtitle: this.subtitle, filename: this.filename }; }

  doPrint() {
    if (this.customPrint) {
      this.customPrint();
      return;
    }
    printDoc(this.meta(), this.columns, this.rows);
  }

  async doExcel() {
    this.exportMessage.set('جاري تصدير ملف Excel...');
    this.exportIcon.set('📊');
    this.busy.set(true);
    try {
      await exportExcel(this.meta(), this.columns, this.rows);
    } finally {
      this.busy.set(false);
    }
  }

  async doPdf() {
    this.exportMessage.set('جاري تصدير ملف PDF الرسمي...');
    this.exportIcon.set('📑');
    this.busy.set(true);
    try {
      if (this.customPdf) {
        await this.customPdf();
      } else {
        await exportPdf(this.meta(), this.columns, this.rows);
      }
    } finally {
      this.busy.set(false);
    }
  }
}
