import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdmissionsService, RequiredDocument } from '../admissions.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../../shared/nebras/nb-stat-card.component';
import { NbDataTableComponent, NbColumn } from '../../../shared/nebras/nb-data-table.component';
import { ADM_PAGE_STYLES, DOC_STATUS_TEXT, docStatusKind, pickList } from '../shared/admissions.shared';

/**
 * التحقق من المستندات — مراجعة واعتماد/رفض مستندات المتقدمين.
 * بيانات حقيقية: admissions/documents (PATCH verification_status).
 */
@Component({
  selector: 'app-admissions-documents',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent, NbDataTableComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="التحقق من المستندات والوثائق"
        subtitle="مراجعة المستندات المرفوعة مع طلبات الالتحاق واعتمادها أو رفضها."
      >
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
      </nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="إجمالي المستندات" [value]="documents().length"></nb-stat-card>
        <nb-stat-card label="قيد المراجعة" [value]="countBy('pending')" [valueKind]="countBy('pending') ? 'warning' : 'default'"></nb-stat-card>
        <nb-stat-card label="تم التحقق" [value]="countBy('verified')" valueKind="success"></nb-stat-card>
        <nb-stat-card label="مرفوضة" [value]="countBy('rejected')" [valueKind]="countBy('rejected') ? 'danger' : 'default'"></nb-stat-card>
      </div>

      <div class="filter-bar">
        <div class="search">
          <input type="text" [(ngModel)]="search" (input)="tick()" aria-label="البحث في المستندات" placeholder="البحث باسم المستند…" />
        </div>
        <div class="field">
          <label>حالة التحقق</label>
          <select [(ngModel)]="statusFilter" (change)="tick()">
            <option value="">الكل</option>
            <option value="pending">قيد المراجعة</option>
            <option value="verified">تم التحقق</option>
            <option value="rejected">مرفوض</option>
          </select>
        </div>
      </div>

      <nb-panel [flush]="true">
        <nb-data-table [columns]="columns" [rows]="filtered()" emptyText="لا توجد مستندات مطابقة.">
          <ng-template #cell let-row let-col="col" let-value="value">
            @switch (col.key) {
              @case ('verification_status') {
                <span [class]="'nb-badge-' + statusKind(row.verification_status)">{{ statusText(row.verification_status) }}</span>
              }
              @case ('actions') {
                <span class="row-actions">
                  @if (row.verification_status !== 'verified') {
                    <button class="nb-btn-primary sm" (click)="setStatus(row, 'verified')">تحقّق</button>
                  }
                  @if (row.verification_status !== 'rejected') {
                    <button class="nb-btn-danger sm" (click)="setStatus(row, 'rejected')">رفض</button>
                  }
                </span>
              }
              @default { {{ value }} }
            }
          </ng-template>
        </nb-data-table>
      </nb-panel>
    </div>
  `,
  styles: [ADM_PAGE_STYLES],
})
export class AdmissionsDocumentsComponent implements OnInit {
  private readonly service = inject(AdmissionsService);

  readonly documents = signal<RequiredDocument[]>([]);
  search = '';
  statusFilter = '';
  private readonly filterTick = signal(0);

  readonly columns: NbColumn[] = [
    { key: 'document_name', label: 'اسم المستند', fr: 2 },
    { key: 'verification_status', label: 'حالة التحقق', fr: 1 },
    { key: 'actions', label: 'إجراءات', fr: 1.2 },
  ];

  readonly filtered = computed(() => {
    this.filterTick();
    const q = this.search.trim().toLowerCase();
    return this.documents().filter((d) => {
      if (this.statusFilter && d.verification_status !== this.statusFilter) return false;
      if (q && !(d.document_name || '').toLowerCase().includes(q)) return false;
      return true;
    });
  });

  statusText = (s: string) => DOC_STATUS_TEXT[s] || s;
  statusKind = docStatusKind;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.service.getDocuments().subscribe((res) => this.documents.set(pickList<RequiredDocument>(res)));
  }

  tick(): void {
    this.filterTick.update((n) => n + 1);
  }

  countBy(status: string): number {
    return this.documents().filter((d) => d.verification_status === status).length;
  }

  setStatus(row: Record<string, any>, status: string): void {
    this.service.updateDocument(row['id'], { verification_status: status }).subscribe(() => this.load());
  }
}
