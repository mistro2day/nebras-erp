import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdmissionsService, RequiredDocument } from '../admissions.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../../shared/nebras/nb-stat-card.component';
import { NbDataTableComponent, NbColumn } from '../../../shared/nebras/nb-data-table.component';
import { ADM_PAGE_STYLES, DOC_STATUS_TEXT, docStatusKind, pickList } from '../shared/admissions.shared';

/**
 * التحقق من المستندات والوثائق — مراجعة واعتماد/رفض مستندات المتقدمين مع واجهة تفاعلية متقدمة للمعاينة.
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
        <button class="nb-btn-secondary" (click)="load()">تحديث البيانات</button>
      </nb-page-header>

      <!-- شريط التقدم الفاخر لمراجعة المستندات -->
      <div class="progress-container">
        <div class="progress-header">
          <span class="progress-title">نسبة إنجاز تدقيق المستندات والوثائق</span>
          <span class="progress-percentage font-bold">{{ completionPercentage() }}%</span>
        </div>
        <div class="progress-bar-wrapper">
          <div class="progress-bar-fill" [style.width.%]="completionPercentage()">
            <div class="progress-bar-shine"></div>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <nb-stat-card label="إجمالي المستندات" [value]="documents().length"></nb-stat-card>
        <nb-stat-card label="قيد المراجعة" [value]="countBy('pending')" [valueKind]="countBy('pending') ? 'warning' : 'default'"></nb-stat-card>
        <nb-stat-card label="تم التحقق" [value]="countBy('verified')" valueKind="success"></nb-stat-card>
        <nb-stat-card label="مرفوضة" [value]="countBy('rejected')" [valueKind]="countBy('rejected') ? 'danger' : 'default'"></nb-stat-card>
      </div>

      <div class="filter-bar">
        <div class="search">
          <input type="text" [(ngModel)]="search" (input)="tick()" aria-label="البحث في المستندات" placeholder="البحث باسم الطالب أو المستند…" />
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

      <div class="content-split">
        <!-- جدول المستندات -->
        <div class="table-container">
          <nb-panel [flush]="true" title="قائمة المستندات والوثائق المستلمة">
            <nb-data-table 
              [columns]="columns" 
              [rows]="filtered()" 
              emptyText="لا توجد مستندات مطابقة."
              (rowClick)="selectDocument($event)"
            >
              <ng-template #cell let-row let-col="col" let-value="value">
                @switch (col.key) {
                  @case ('verification_status') {
                    <span [class]="'nb-badge-' + statusKind(row.verification_status)">{{ statusText(row.verification_status) }}</span>
                  }
                  @case ('actions') {
                    <span class="row-actions">
                      <button class="nb-btn-secondary sm" (click)="$event.stopPropagation(); selectDocument(row)">معاينة وتدقيق</button>
                    </span>
                  }
                  @default { {{ value }} }
                }
              </ng-template>
            </nb-data-table>
          </nb-panel>
        </div>

        <!-- لوحة المعاينة التفاعلية -->
        <div class="preview-panel" [class.active]="selectedDoc() !== null">
          @if (selectedDoc(); as doc) {
            <nb-panel [title]="doc.document_name">
              <div panel-actions>
                <button class="close-btn" (click)="closePreview()">×</button>
              </div>

              <div class="doc-meta-info">
                <div class="meta-row">
                  <span class="meta-label">اسم المتقدم:</span>
                  <span class="meta-value font-bold">{{ doc.applicant_name || 'غير محدد' }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">رقم الطلب:</span>
                  <span class="meta-value">{{ doc.application_number || 'غير محدد' }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">الحالة الحالية:</span>
                  <span [class]="'nb-badge-' + statusKind(doc.verification_status)">{{ statusText(doc.verification_status) }}</span>
                </div>
              </div>

              <!-- معاينة المستند المفتوح -->
              <div class="document-viewer">
                <div class="document-scanned-mock">
                  <div class="mock-header">
                    <span class="mock-dot"></span>
                    <span class="mock-dot"></span>
                    <span class="mock-dot"></span>
                    <span class="mock-title">معاينة المستند المرفق</span>
                  </div>
                  <div class="mock-body">
                    <div class="doc-icon">📄</div>
                    <div class="doc-name">{{ doc.document_name }}</div>
                    <div class="doc-desc">مستند بصيغة PDF / صورة ممسوحة ضوئياً</div>
                    <a class="download-link" href="#" (click)="$event.preventDefault()">
                      💾 تحميل الملف الأصلي (تحقق من Checksum)
                    </a>
                  </div>
                </div>
              </div>

              <!-- نموذج اتخاذ القرار والتحقق -->
              <div class="verification-form">
                @if (doc.verification_status === 'pending') {
                  <div class="action-section">
                    <label class="form-label">ملاحظات التدقيق / سبب الرفض (إجباري في حال الرفض):</label>
                    <textarea 
                      class="nb-textarea" 
                      [(ngModel)]="rejectionReason" 
                      placeholder="اكتب هنا ملاحظاتك أو سبب رفض الوثيقة..."
                    ></textarea>

                    <div class="form-actions">
                      <button class="nb-btn-primary" (click)="setStatus(doc, 'verified')">✓ اعتماد المستند</button>
                      <button class="nb-btn-danger" [disabled]="!rejectionReason.trim()" (click)="setStatus(doc, 'rejected')">✕ رفض المستند</button>
                    </div>
                  </div>
                } @else {
                  <div class="status-summary-box" [class]="doc.verification_status">
                    @if (doc.verification_status === 'verified') {
                      <div class="icon">✓</div>
                      <div>
                        <strong>تم اعتماد هذا المستند بنجاح.</strong>
                        <p class="text-xs">تمت مراجعة الوثيقة ومطابقتها للشروط الفنية المطلوبة.</p>
                      </div>
                    } @else {
                      <div class="icon">✕</div>
                      <div>
                        <strong>تم رفض هذا المستند.</strong>
                        @if (doc.rejection_reason) {
                          <p class="rejection-reason-text">السبب: {{ doc.rejection_reason }}</p>
                        }
                      </div>
                    }
                    <button class="nb-btn-secondary sm mt-3" (click)="resetStatus(doc)">إعادة المراجعة والتدقيق</button>
                  </div>
                }
              </div>
            </nb-panel>
          } @else {
            <div class="no-selection-placeholder">
              <div class="placeholder-icon">🔍</div>
              <h4>لم يتم اختيار أي مستند</h4>
              <p>اختر مستنداً من الجدول الجانبي لمعاينته وتدقيقه واتخاذ إجراء الاعتماد أو الرفض.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    ADM_PAGE_STYLES,
    `
      .progress-container {
        background: var(--nb-surface);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card);
        padding: 14px 16px;
        margin-bottom: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      }
      .progress-header {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: var(--nb-text);
      }
      .progress-title {
        font-weight: 600;
      }
      .progress-bar-wrapper {
        height: 8px;
        background: var(--nb-surface-raised);
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      }
      .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--nb-primary-500) 0%, var(--nb-primary-600) 100%);
        border-radius: 4px;
        transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }
      .progress-bar-shine {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.25) 50%,
          rgba(255, 255, 255, 0) 100%
        );
        animation: shine 2s infinite linear;
      }
      @keyframes shine {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }

      .content-split {
        display: flex;
        gap: 20px;
        align-items: flex-start;
      }
      .table-container {
        flex: 1;
        min-width: 0;
      }
      .preview-panel {
        width: 420px;
        flex-shrink: 0;
        position: sticky;
        top: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        color: var(--nb-text-muted);
        cursor: pointer;
        padding: 0 5px;
        line-height: 1;
      }
      .close-btn:hover {
        color: var(--nb-text);
      }
      .doc-meta-info {
        background: var(--nb-surface-raised);
        border: 1px solid var(--nb-border-soft);
        border-radius: var(--nb-radius);
        padding: 12px;
        margin-bottom: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .meta-row {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
      }
      .meta-label {
        color: var(--nb-text-muted);
      }
      .meta-value {
        color: var(--nb-text);
      }
      .font-bold {
        font-weight: 700;
      }
      .document-viewer {
        margin-bottom: 16px;
      }
      .document-scanned-mock {
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius);
        overflow: hidden;
        background: #fdfdfd;
        box-shadow: 0 4px 12px rgba(0,0,0,0.03);
      }
      .mock-header {
        background: #f1f2f6;
        border-bottom: 1px solid var(--nb-border-soft);
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .mock-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ddd;
      }
      .mock-header .mock-dot:nth-child(1) { background: #ff5f56; }
      .mock-header .mock-dot:nth-child(2) { background: #ffbd2e; }
      .mock-header .mock-dot:nth-child(3) { background: #27c93f; }
      .mock-title {
        font-size: 11px;
        font-weight: 600;
        color: var(--nb-text-muted);
        margin-right: auto;
      }
      .mock-body {
        padding: 30px 20px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
      }
      .doc-icon {
        font-size: 48px;
        animation: float 3s ease-in-out infinite;
      }
      .doc-name {
        font-size: 14px;
        font-weight: 700;
        color: var(--nb-text);
      }
      .doc-desc {
        font-size: 12px;
        color: var(--nb-text-muted);
      }
      .download-link {
        font-size: 12px;
        color: var(--nb-primary-600);
        text-decoration: none;
        margin-top: 5px;
        font-weight: 600;
      }
      .download-link:hover {
        text-decoration: underline;
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      .verification-form {
        border-top: 1px dashed var(--nb-border);
        padding-top: 16px;
      }
      .form-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--nb-text);
        display: block;
        margin-bottom: 8px;
      }
      .nb-textarea {
        width: 100%;
        height: 70px;
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius);
        padding: 8px 10px;
        font-family: var(--nb-font-family);
        font-size: 13px;
        color: var(--nb-text);
        background: var(--nb-surface);
        outline: none;
        resize: none;
        margin-bottom: 12px;
      }
      .nb-textarea:focus {
        border-color: var(--nb-primary-400);
      }
      .form-actions {
        display: flex;
        gap: 10px;
      }
      .form-actions button {
        flex: 1;
        height: 34px;
        border-radius: var(--nb-radius);
        font-family: var(--nb-font-family);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border: none;
      }
      .nb-btn-primary {
        background: var(--nb-primary-600);
        color: white;
      }
      .nb-btn-primary:hover {
        background: var(--nb-primary-700);
      }
      .nb-btn-danger {
        background: var(--nb-danger-600);
        color: white;
      }
      .nb-btn-danger:hover {
        background: var(--nb-danger-700);
      }
      .nb-btn-danger:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .status-summary-box {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        padding: 12px;
        border-radius: var(--nb-radius);
        font-size: 13px;
      }
      .status-summary-box.verified {
        background: var(--nb-success-50);
        border: 1px solid var(--nb-success-200);
        color: var(--nb-success-900);
      }
      .status-summary-box.rejected {
        background: var(--nb-danger-50);
        border: 1px solid var(--nb-danger-200);
        color: var(--nb-danger-900);
      }
      .status-summary-box .icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        flex-shrink: 0;
      }
      .status-summary-box.verified .icon {
        background: var(--nb-success-600);
        color: white;
      }
      .status-summary-box.rejected .icon {
        background: var(--nb-danger-600);
        color: white;
      }
      .rejection-reason-text {
        font-size: 12px;
        margin-top: 4px;
        opacity: 0.8;
      }
      .no-selection-placeholder {
        background: var(--nb-surface);
        border: 1px dashed var(--nb-border);
        border-radius: var(--nb-radius-card);
        padding: 60px 20px;
        text-align: center;
        color: var(--nb-text-muted);
      }
      .placeholder-icon {
        font-size: 40px;
        margin-bottom: 12px;
      }
      .no-selection-placeholder h4 {
        margin: 0 0 6px;
        font-size: 14px;
        font-weight: 700;
        color: var(--nb-text);
      }
      .no-selection-placeholder p {
        margin: 0;
        font-size: 12px;
        max-width: 280px;
        margin: 0 auto;
        line-height: 1.6;
      }
      .mt-3 { margin-top: 12px; }
      .text-xs { font-size: 11px; opacity: 0.8; }
    `,
  ],
})
export class AdmissionsDocumentsComponent implements OnInit {
  private readonly service = inject(AdmissionsService);

  readonly documents = signal<any[]>([]);
  readonly selectedDoc = signal<any | null>(null);
  rejectionReason = '';
  search = '';
  statusFilter = '';
  private readonly filterTick = signal(0);

  readonly columns: NbColumn[] = [
    { key: 'applicant_name', label: 'اسم المتقدم', fr: 1.8 },
    { key: 'application_number', label: 'رقم الطلب', fr: 1.2 },
    { key: 'document_name', label: 'اسم المستند', fr: 2 },
    { key: 'verification_status', label: 'حالة التحقق', fr: 1.2 },
    { key: 'actions', label: 'إجراءات', fr: 1.2 },
  ];

  readonly completionPercentage = computed(() => {
    const total = this.documents().length;
    if (!total) return 0;
    const processed = this.countBy('verified') + this.countBy('rejected');
    return Math.round((processed / total) * 100);
  });

  readonly filtered = computed(() => {
    this.filterTick();
    const q = this.search.trim().toLowerCase();
    return this.documents().filter((d) => {
      if (this.statusFilter && d.verification_status !== this.statusFilter) return false;
      if (q) {
        const name = (d.applicant_name || '').toLowerCase();
        const appNum = (d.application_number || '').toLowerCase();
        const docName = (d.document_name || '').toLowerCase();
        if (!name.includes(q) && !appNum.includes(q) && !docName.includes(q)) return false;
      }
      return true;
    });
  });

  statusText = (s: string) => DOC_STATUS_TEXT[s] || s;
  statusKind = docStatusKind;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.service.getDocuments().subscribe((res) => {
      const list = pickList<any>(res);
      this.documents.set(list);
      
      // تحديث المستند المحدد في حال كان مفتوحاً لتحديث حالته
      if (this.selectedDoc()) {
        const updated = list.find(d => d.id === this.selectedDoc().id);
        if (updated) {
          this.selectedDoc.set(updated);
        }
      }
    });
  }

  tick(): void {
    this.filterTick.update((n) => n + 1);
  }

  countBy(status: string): number {
    return this.documents().filter((d) => d.verification_status === status).length;
  }

  selectDocument(doc: any): void {
    this.selectedDoc.set(doc);
    this.rejectionReason = doc.rejection_reason || '';
  }

  closePreview(): void {
    this.selectedDoc.set(null);
    this.rejectionReason = '';
  }

  setStatus(doc: any, status: string): void {
    const patch: any = { verification_status: status };
    if (status === 'rejected') {
      patch.rejection_reason = this.reReasonVal();
    } else {
      patch.rejection_reason = '';
    }

    this.service.updateDocument(doc.id, patch).subscribe(() => {
      this.load();
      if (status === 'verified') {
        this.closePreview();
      }
    });
  }

  private reReasonVal(): string {
    return this.rejectionReason.trim();
  }

  resetStatus(doc: any): void {
    this.service.updateDocument(doc.id, { verification_status: 'pending', rejection_reason: '' }).subscribe(() => {
      this.load();
      this.rejectionReason = '';
    });
  }
}
