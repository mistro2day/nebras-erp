import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportColumn } from './export.types';
import { exportCsv, exportExcel, exportPdf, printDoc } from './export.functions';

/**
 * قائمة تصدير موحّدة (Excel / PDF / CSV / طباعة) — لغة تصميم نبراس، عربية RTL.
 * تُوضع في ترويسة أي صفحة: <nb-export-menu [columns]="cols" [rows]="data" title="…" />
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
      <button class="nb-exp-btn" (click)="doCsv()" title="تصدير CSV">CSV</button>
      <button class="nb-exp-btn" (click)="doPrint()" title="طباعة"><span class="ico">🖨️</span> طباعة</button>
    </div>
  `,
  styles: [`
    .nb-exp { display: inline-flex; gap: 6px; }
    .nb-exp-btn { display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 12px;
      font-family: var(--nb-font-family); font-size: 12px; font-weight: 600; cursor: pointer;
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius); background: var(--nb-surface-raised); color: var(--nb-text); }
    .nb-exp-btn:hover:not(:disabled) { border-color: var(--nb-primary-400); color: var(--nb-primary-700); }
    .nb-exp-btn:disabled { opacity: .55; cursor: not-allowed; }
    .nb-exp-btn .ico { font-size: 13px; line-height: 1; }
    .nb-exp-btn.xl { color: #157347; } .nb-exp-btn.xl:hover:not(:disabled) { border-color: #157347; }
    .nb-exp-btn.pdf { color: #C0392B; } .nb-exp-btn.pdf:hover:not(:disabled) { border-color: #C0392B; }
  `],
})
export class NbExportMenuComponent {
  @Input({ required: true }) columns: ExportColumn[] = [];
  @Input({ required: true }) rows: any[] = [];
  @Input({ required: true }) title = '';
  @Input() subtitle?: string;
  @Input() filename?: string;

  readonly busy = signal(false);

  private meta() { return { title: this.title, subtitle: this.subtitle, filename: this.filename }; }

  doCsv() { exportCsv(this.meta(), this.columns, this.rows); }
  doPrint() { printDoc(this.meta(), this.columns, this.rows); }
  async doExcel() { this.busy.set(true); try { await exportExcel(this.meta(), this.columns, this.rows); } finally { this.busy.set(false); } }
  async doPdf() { this.busy.set(true); try { await exportPdf(this.meta(), this.columns, this.rows); } finally { this.busy.set(false); } }
}
