import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  TemplateRef,
  contentChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

export interface NbColumn {
  key: string;
  label: string;
  /** عرض العمود بوحدات fr (افتراضي 1) */
  fr?: number;
  align?: 'start' | 'end';
}

/**
 * جدول مؤسسي — رأس رمادي فاتح، صفوف بحد سفلي ناعم، تحويم رمادي (الشاشة 1a/1c/1d).
 * يستقبل الأعمدة والصفوف، مع قالب خلية اختياري لتخصيص العرض.
 */
@Component({
  selector: 'nb-data-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  template: `
    <div class="nb-dt">
      <div class="nb-dt-head" [style.grid-template-columns]="gridCols">
        @for (col of columns; track col.key) {
          <span [style.text-align]="col.align ?? 'start'">{{ col.label }}</span>
        }
      </div>
      @for (row of rows; track $index) {
        <div class="nb-dt-row" [style.grid-template-columns]="gridCols" (click)="rowClick.emit(row)">
          @for (col of columns; track col.key) {
            <span [style.text-align]="col.align ?? 'start'">
              @if (cellTpl()) {
                <ng-container
                  [ngTemplateOutlet]="cellTpl()!"
                  [ngTemplateOutletContext]="{ $implicit: row, col: col, value: row[col.key] }"
                ></ng-container>
              } @else {
                {{ row[col.key] }}
              }
            </span>
          }
        </div>
      }
      @if (rows.length === 0) {
        <div class="nb-dt-empty">{{ emptyText }}</div>
      }
    </div>
  `,
  styles: [
    `
      .nb-dt {
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .nb-dt-head,
      .nb-dt-row {
        display: grid;
        gap: 8px;
        padding: 9px 16px;
        align-items: center;
      }
      .nb-dt-head {
        background: var(--nb-surface-raised);
        border-bottom: 1px solid var(--nb-border-soft);
        padding: 8px 16px;
        font-size: 11px;
        font-weight: 700;
        color: var(--nb-text-muted);
      }
      .nb-dt-row {
        border-bottom: 1px solid var(--nb-border-row);
        font-size: 13px;
        color: var(--nb-text);
      }
      .nb-dt-row:last-child { border-bottom: none; }
      .nb-dt-row:hover { background: var(--nb-surface-raised); }
      .nb-dt-empty {
        padding: 28px 16px;
        text-align: center;
        font-size: 13px;
        color: var(--nb-text-muted);
      }
    `,
  ],
})
export class NbDataTableComponent {
  @Input({ required: true }) columns: NbColumn[] = [];
  @Input({ required: true }) rows: Record<string, any>[] = [];
  @Input() emptyText = 'لا توجد بيانات';

  @Output() rowClick = new EventEmitter<Record<string, any>>();

  readonly cellTpl = contentChild<TemplateRef<unknown>>('cell');

  get gridCols(): string {
    return this.columns.map((c) => `${c.fr ?? 1}fr`).join(' ');
  }
}
