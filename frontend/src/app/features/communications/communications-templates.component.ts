import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommunicationsService, CommunicationTemplate } from './communications.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';

export interface SystemVariable {
  code: string;
  label: string;
  category: 'students' | 'guardians' | 'finance' | 'attendance' | 'admission' | 'academic' | 'transport' | 'general';
  category_name: string;
  sample_value: string;
  description: string;
}

@Component({
  selector: 'app-communications-templates',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="قوالب الرسائل والمتغيرات التلقائية (Message Templates & Dynamic Variables)"
        subtitle="إدارة قوالب الإشعار، وتنسيق محتوى الرسائل، وتطبيق متغيرات النظام التلقائية بالسودان."
      >
        <div class="header-actions">
          <button class="nb-btn-secondary" (click)="toggleGuideModal()">📖 الدليل الإرشادي وقاموس المتغيرات</button>
          <button class="nb-btn-primary" (click)="toggleModal()">+ إضافة قالب رسالة جديد</button>
        </div>
      </nb-page-header>

      <!-- شريط إرشادي سريع لقاموس المتغيرات -->
      <div class="quick-variables-bar">
        <div class="qv-title">
          <span>⚡ المتغيرات الشائعة (انقر للنسخ والإدراج):</span>
        </div>
        <div class="qv-chips">
          @for (v of popularVariables(); track v.code) {
            <button class="var-chip" (click)="insertVariableToForm(v.code)" title="{{ v.description }} (مثال: {{ v.sample_value }})">
              <code>{{ '{{' + v.code + '}}' }}</code>
              <small>{{ v.label }}</small>
            </button>
          }
          <button class="more-chip" (click)="toggleGuideModal()">+ استعراض جميع المتغيرات ({{ allVariables.length }})</button>
        </div>
      </div>

      <nb-panel>
        <div class="filter-bar">
          <div class="search-box">
            <input
              type="text"
              placeholder="بحث باسم القالب، الرمز، أو محتوى الرسالة..."
              [ngModel]="searchTerm()"
              (ngModelChange)="searchTerm.set($event)"
            />
          </div>
          <div class="category-tabs">
            <button class="cat-tab" [class.active]="selectedCategory() === 'all'" (click)="selectedCategory.set('all')">
              الكل ({{ safeTemplates().length }})
            </button>
            <button class="cat-tab" [class.active]="selectedCategory() === 'attendance'" (click)="selectedCategory.set('attendance')">
              الغياب والحضور
            </button>
            <button class="cat-tab" [class.active]="selectedCategory() === 'finance'" (click)="selectedCategory.set('finance')">
              المالية (ج.س)
            </button>
            <button class="cat-tab" [class.active]="selectedCategory() === 'admission'" (click)="selectedCategory.set('admission')">
              القبول والتسجيل
            </button>
          </div>
        </div>

        <div class="templates-grid">
          @for (t of filteredTemplates(); track t.id) {
            <div class="template-card">
              <div class="card-head">
                <div class="meta">
                  <span class="category-badge">{{ getCategoryName(t.category) }}</span>
                  <span class="code-badge">{{ t.code }}</span>
                </div>
                <span class="lang-tag">{{ t.language === 'ar' ? '🇸🇦 عربي' : '🇬🇧 English' }}</span>
              </div>

              <h4>{{ t.name }}</h4>
              @if (t.subject) {
                <div class="subject-line"><strong>موضوع البريد:</strong> {{ t.subject }}</div>
              }
              
              <div class="template-body-box">
                {{ t.body }}
              </div>

              <div class="card-footer">
                <span class="version-info">الإصدار v{{ t.version_count || 1 }}.0</span>
                <div class="actions">
                  <button class="action-btn" (click)="editTemplate(t)">تعديل القالب</button>
                  <button class="action-btn preview" (click)="openPreviewModal(t)">معاينة بالمتغيرات 👁️</button>
                </div>
              </div>
            </div>
          } @empty {
            <div class="empty-state">لا توجد قوالب تفي بشروط البحث. انقر على "إضافة قالب جديد" للإنشاء.</div>
          }
        </div>
      </nb-panel>

      <!-- Modal إضافة/تعديل قالب (Nebras OS Custom Modal) -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="toggleModal()">
          <div class="modal-card modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingTemplate ? 'تعديل قالب رسالة' : 'إنشاء قالب رسالة جديد' }}</h3>
              <button class="close-btn" (click)="toggleModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>اسم القالب *</label>
                  <input type="text" [(ngModel)]="formData.name" placeholder="مثال: إشعار غياب الطالب الفوري" />
                </div>
                <div class="form-group">
                  <label>رمز القالب (Code) *</label>
                  <input type="text" [(ngModel)]="formData.code" placeholder="STUDENT_ABSENCE_ALERT" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>التصنيف</label>
                  <select [(ngModel)]="formData.category">
                    <option value="attendance">الحضور والغياب</option>
                    <option value="finance">المالية والفواتير (ج.س)</option>
                    <option value="admission">القبول والتسجيل</option>
                    <option value="academic">الأكاديمي والدرجات</option>
                    <option value="transport">النقل والمواصلات</option>
                    <option value="general">عام</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>اللغة</label>
                  <select [(ngModel)]="formData.language">
                    <option value="ar">العربية (Arabic)</option>
                    <option value="en">الإنجليزية (English)</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>موضوع الرسالة (للبريد الإلكتروني)</label>
                <input type="text" [(ngModel)]="formData.subject" placeholder="مثال: تنبيه غياب الطالب {{ '{{student_name}}' }} عن طابور الصباح" />
              </div>

              <div class="form-group">
                <div class="label-with-hint">
                  <label>نص الرسالة والقالب *</label>
                  <span class="hint-text">استخدم المتغيرات بين قوسين مزدوجين مثل {{ '{{guardian_name}}' }}</span>
                </div>
                <textarea rows="5" id="templateBodyTextarea" [(ngModel)]="formData.body" placeholder="عزيزي ولي الأمر {{ '{{guardian_name}}' }}، نحيطكم علماً بغياب الطالب {{ '{{student_name}}' }}..."></textarea>
              </div>

              <!-- أدوات إدراج المتغيرات المباشرة -->
              <div class="insert-vars-panel">
                <span class="ins-title">إدراج متغير بنقرة واحدة:</span>
                <div class="ins-chips">
                  @for (v of popularVariables(); track v.code) {
                    <button class="ins-btn" (click)="appendVarToText(v.code)">
                      + {{ '{{' + v.code + '}}' }}
                    </button>
                  }
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="nb-btn-secondary" (click)="toggleModal()">إلغاء</button>
              <button class="nb-btn-primary" (click)="saveTemplate()">حفظ القالب</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal معاينة الرسالة بالمتغيرات الحقيقية (Real Live Interpolation) -->
      @if (previewTemplate()) {
        <div class="modal-backdrop" (click)="closePreviewModal()">
          <div class="modal-card modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>معاينة الرسالة بالمتغيرات الحقيقية: {{ previewTemplate()?.name }}</h3>
              <button class="close-btn" (click)="closePreviewModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="preview-mode-tabs">
                <button class="pv-tab" [class.active]="previewMode() === 'rendered'" (click)="previewMode.set('rendered')">
                  👁️ النص المفكك بالشكل النهائي لولي الأمر
                </button>
                <button class="pv-tab" [class.active]="previewMode() === 'raw'" (click)="previewMode.set('raw')">
                  ⚙️ النص الخام بالمتغيرات {{ '{{code}}' }}
                </button>
              </div>

              @if (previewMode() === 'rendered') {
                <div class="rendered-preview-box">
                  <div class="rp-header">
                    <div><strong>إلى:</strong> عثمان إبراهيم الكباشي (0912345678)</div>
                    <div><strong>الموضوع:</strong> {{ renderText(previewTemplate()?.subject) || 'إشعار مباشر من مدارس نبراس' }}</div>
                  </div>
                  <div class="rp-body">
                    {{ renderText(previewTemplate()?.body) }}
                  </div>
                </div>
              } @else {
                <div class="raw-preview-box">
                  <div class="pv-field"><strong>رمز القالب:</strong> <code>{{ previewTemplate()?.code }}</code></div>
                  <div class="pv-field"><strong>الموضوع الخام:</strong> {{ previewTemplate()?.subject || '—' }}</div>
                  <hr />
                  <div class="pv-content">{{ previewTemplate()?.body }}</div>
                </div>
              }
            </div>
            <div class="modal-footer">
              <button class="nb-btn-primary" (click)="closePreviewModal()">إغلاق المعاينة</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal الدليل الإرشادي وقاموس المتغيرات الكامل (Nebras OS Guide Modal) -->
      @if (showGuideModal()) {
        <div class="modal-backdrop" (click)="toggleGuideModal()">
          <div class="modal-card modal-xl" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h3>📖 الدليل الإرشادي وقاموس متغيرات النظام (System Variables Dictionary)</h3>
                <span class="sub-header-type">دليل شامل لربط قوالب الرسائل ببيانات قاعدة البيانات بالسودان</span>
              </div>
              <button class="close-btn" (click)="toggleGuideModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="guide-intro">
                <p>💡 <strong>طريقة العمل:</strong> يتم كتابة الرمز بين أقواس مزدوجة <code>{{ '{{رمز_المتغير}}' }}</code> داخل نص القالب. وعند الإرسال يحل المحرك التلقائي محل الرمز بالبيانات الفعلية الخاصة بالطالب أو ولي الأمر أو الفاتورة.</p>
              </div>

              <div class="vars-dictionary-table-wrapper">
                <table class="vars-table">
                  <thead>
                    <tr>
                      <th>رمز المتغير (Variable Code)</th>
                      <th>اسم المتغير</th>
                      <th>المجال (Domain)</th>
                      <th>القيمة التجريبية (Sample Value)</th>
                      <th>الوصف ومصدر البيانات</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (v of allVariables; track v.code) {
                      <tr>
                        <td>
                          <code class="var-code-tag" (click)="copyVariableCode(v.code)">{{ '{{' + v.code + '}}' }}</code>
                        </td>
                        <td><strong>{{ v.label }}</strong></td>
                        <td><span class="domain-tag">{{ v.category_name }}</span></td>
                        <td><span class="sample-val">{{ v.sample_value }}</span></td>
                        <td>{{ v.description }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
            <div class="modal-footer">
              <button class="nb-btn-primary" (click)="toggleGuideModal()">فهمت، إغلاق الدليل</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .header-actions { display: flex; gap: 10px; }
    .quick-variables-bar { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-lg, 10px); padding: 12px 16px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px; }
    .qv-title { font-size: 12.5px; font-weight: 700; color: var(--nb-text); }
    .qv-chips { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .var-chip { background: var(--nb-bg); border: 1px solid var(--nb-border-soft); padding: 4px 10px; border-radius: var(--nb-radius-sm); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 12px; transition: border-color 0.2s; }
    .var-chip:hover { border-color: var(--nb-primary-600); background: var(--nb-primary-50); }
    .var-chip code { font-family: monospace; font-weight: 700; color: var(--nb-primary-600); }
    .var-chip small { color: var(--nb-text-secondary); }
    .more-chip { background: transparent; border: 1px dashed var(--nb-primary-600); color: var(--nb-primary-600); padding: 4px 12px; border-radius: var(--nb-radius-sm); font-size: 12px; font-weight: 600; cursor: pointer; }

    .filter-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .search-box input { width: 280px; padding: 8px 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); font-size: 13px; outline: none; }
    .category-tabs { display: flex; gap: 6px; }
    .cat-tab { background: transparent; border: 1px solid var(--nb-border); padding: 6px 12px; border-radius: 999px; font-size: 12px; cursor: pointer; color: var(--nb-text-secondary); }
    .cat-tab.active { background: var(--nb-primary-600); color: white; border-color: var(--nb-primary-600); font-weight: 600; }

    .templates-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 14px; }
    .template-card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-lg, 10px); padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .card-head { display: flex; justify-content: space-between; align-items: center; }
    .meta { display: flex; gap: 6px; align-items: center; }
    .category-badge { background: var(--nb-primary-50); color: var(--nb-primary-600); font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: var(--nb-radius-sm); }
    .code-badge { font-family: monospace; font-size: 11px; color: var(--nb-text-muted); background: var(--nb-bg); padding: 2px 6px; border-radius: var(--nb-radius-sm); }
    .lang-tag { font-size: 11.5px; color: var(--nb-text-muted); }
    .template-card h4 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .subject-line { font-size: 12px; color: var(--nb-text-secondary); }
    .template-body-box { background: var(--nb-bg); border: 1px solid var(--nb-border-soft); padding: 10px 12px; border-radius: var(--nb-radius); font-size: 12.5px; color: var(--nb-text); line-height: 1.5; min-height: 60px; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--nb-border-soft); padding-top: 10px; }
    .version-info { font-size: 11px; color: var(--nb-text-muted); font-weight: 600; }
    .actions { display: flex; gap: 6px; }
    .action-btn { background: transparent; border: 1px solid var(--nb-border); padding: 4px 10px; border-radius: var(--nb-radius); font-size: 11.5px; cursor: pointer; color: var(--nb-text-secondary); }
    .action-btn.preview { color: var(--nb-primary-600); border-color: var(--nb-primary-600); font-weight: 600; }
    .empty-state { grid-column: 1 / -1; text-align: center; padding: 32px; color: var(--nb-text-muted); }

    /* Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-card { background: var(--nb-surface); width: 560px; max-width: 90vw; border-radius: var(--nb-radius-lg, 12px); box-shadow: 0 10px 25px rgba(0,0,0,0.15); overflow: hidden; }
    .modal-card.modal-lg { width: 680px; }
    .modal-card.modal-xl { width: 850px; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--nb-border-soft); }
    .modal-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .sub-header-type { font-size: 11.5px; color: var(--nb-text-muted); }
    .close-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--nb-text-muted); }
    .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; max-height: 75vh; overflow-y: auto; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .label-with-hint { display: flex; justify-content: space-between; align-items: center; }
    .hint-text { font-size: 11px; color: var(--nb-text-muted); }
    .form-group label { font-size: 12px; font-weight: 600; color: var(--nb-text-secondary); }
    .form-group input, .form-group select, .form-group textarea { padding: 8px 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); font-size: 13px; outline: none; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--nb-border-soft); background: var(--nb-bg); }

    /* Insert Panel */
    .insert-vars-panel { background: var(--nb-bg); border: 1px solid var(--nb-border-soft); padding: 10px 12px; border-radius: var(--nb-radius); display: flex; flex-direction: column; gap: 6px; }
    .ins-title { font-size: 11.5px; font-weight: 700; color: var(--nb-text); }
    .ins-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .ins-btn { font-family: monospace; font-size: 11.5px; background: var(--nb-surface); border: 1px solid var(--nb-border); padding: 3px 8px; border-radius: var(--nb-radius-sm); cursor: pointer; color: var(--nb-primary-600); font-weight: 600; }
    .ins-btn:hover { background: var(--nb-primary-600); color: white; }

    /* Preview Tabs */
    .preview-mode-tabs { display: flex; gap: 8px; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 8px; }
    .pv-tab { background: transparent; border: none; font-size: 13px; font-weight: 500; color: var(--nb-text-muted); cursor: pointer; padding: 4px 8px; }
    .pv-tab.active { color: var(--nb-primary-600); font-weight: 700; border-bottom: 2px solid var(--nb-primary-600); }
    
    .rendered-preview-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--nb-radius); padding: 16px; display: flex; flex-direction: column; gap: 12px; font-size: 13.5px; }
    .rp-header { display: flex; flex-direction: column; gap: 4px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; color: #334155; font-size: 12.5px; }
    .rp-body { color: #0f172a; line-height: 1.6; white-space: pre-wrap; font-size: 14px; }

    .raw-preview-box { background: var(--nb-bg); border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 14px; display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
    .pv-content { font-size: 13.5px; color: var(--nb-text); line-height: 1.6; background: var(--nb-surface); padding: 12px; border-radius: var(--nb-radius-sm); border: 1px solid var(--nb-border-soft); }

    /* Guide Table */
    .guide-intro { background: var(--nb-primary-50); border: 1px solid var(--nb-primary-100); padding: 12px; border-radius: var(--nb-radius); font-size: 13px; color: var(--nb-primary-800); }
    .guide-intro code { font-family: monospace; font-weight: 700; }
    .vars-dictionary-table-wrapper { overflow-x: auto; }
    .vars-table { width: 100%; border-collapse: collapse; text-align: right; font-size: 12.5px; }
    .vars-table th { background: var(--nb-bg); padding: 10px; border-bottom: 1px solid var(--nb-border); color: var(--nb-text-muted); font-weight: 600; }
    .vars-table td { padding: 10px; border-bottom: 1px solid var(--nb-border-soft); vertical-align: middle; }
    .var-code-tag { font-family: monospace; background: var(--nb-bg); padding: 3px 8px; border-radius: var(--nb-radius-sm); color: var(--nb-primary-600); font-weight: 700; cursor: pointer; border: 1px solid var(--nb-border-soft); }
    .domain-tag { background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .sample-val { color: #166534; font-weight: 600; font-size: 12px; }

    .nb-btn-primary { background: var(--nb-primary-600); color: white; border: none; padding: 8px 16px; border-radius: var(--nb-radius); font-size: 13px; font-weight: 600; cursor: pointer; }
    .nb-btn-secondary { background: var(--nb-surface); border: 1px solid var(--nb-border); color: var(--nb-text); padding: 8px 16px; border-radius: var(--nb-radius); font-size: 13px; cursor: pointer; }
  `]
})
export class CommunicationsTemplatesComponent {
  private commService = inject(CommunicationsService);

  templates = signal<CommunicationTemplate[]>([]);
  searchTerm = signal('');
  selectedCategory = signal<string>('all');
  showModal = signal(false);
  showGuideModal = signal(false);
  previewTemplate = signal<CommunicationTemplate | null>(null);
  previewMode = signal<'rendered' | 'raw'>('rendered');
  editingTemplate: CommunicationTemplate | null = null;

  formData: Partial<CommunicationTemplate> = {
    name: '',
    code: '',
    category: 'general',
    language: 'ar',
    subject: '',
    body: '',
  };

  // قائمة جميع متغيرات النظام المتاحة
  allVariables: SystemVariable[] = [
    // شؤون الطلاب
    { code: 'student_name', label: 'اسم الطالب الكامل', category: 'students', category_name: 'شؤون الطلاب', sample_value: 'خالد عثمان إبراهيم الكباشي', description: 'اسم الطالب الثلاثي أو الرباعي من قاعدة البيانات.' },
    { code: 'student_code', label: 'الرقم الأكاديمي للطالب', category: 'students', category_name: 'شؤون الطلاب', sample_value: 'STU-2026-0841', description: 'الرمز التعريف الموحد للطالب.' },
    { code: 'grade_level', label: 'الصف / المرحلة', category: 'students', category_name: 'شؤون الطلاب', sample_value: 'الصف العاشر الثانوية', description: 'المرحلة الدراسية المسجل بها الطالب.' },
    { code: 'classroom_name', label: 'اسم الفصل / الشعبة', category: 'students', category_name: 'شؤون الطلاب', sample_value: 'شعبة أ (العلوم)', description: 'الفصل الدراسي المقيد به الطالب.' },

    // أولياء الأمور
    { code: 'guardian_name', label: 'اسم ولي الأمر', category: 'guardians', category_name: 'أولياء الأمور', sample_value: 'عثمان إبراهيم الكباشي', description: 'اسم ولي الأمر أو الكفيل المباشر.' },
    { code: 'guardian_phone', label: 'هاتف ولي الأمر', category: 'guardians', category_name: 'أولياء الأمور', sample_value: '0912345678', description: 'رقم هاتف ولي الأمر السوداني المعتمد.' },

    // الشؤون المالية
    { code: 'invoice_number', label: 'رقم الفاتورة', category: 'finance', category_name: 'المالية (ج.س)', sample_value: 'INV-2026-4409', description: 'الرقم التسلسلي للفاتورة الدراسية.' },
    { code: 'amount', label: 'المبلغ المستحق (ج.س)', category: 'finance', category_name: 'المالية (ج.س)', sample_value: '120,000 ج.س', description: 'المبلغ المالي بالجنيه السوداني.' },
    { code: 'due_date', label: 'تاريخ الاستحقاق', category: 'finance', category_name: 'المالية (ج.س)', sample_value: '2026-07-25', description: 'أخر موعد لسداد القسط أو الفاتورة.' },
    { code: 'payment_method', label: 'وسيلة الدفع', category: 'finance', category_name: 'المالية (ج.س)', sample_value: 'تطبيق بنكك (Bankak)', description: 'طريقة السداد المعتمدة (بنكك / فوري).' },

    // الحضور والغياب
    { code: 'date', label: 'تاريخ الغياب / التنبيه', category: 'attendance', category_name: 'الحضور والغياب', sample_value: '2026-07-20', description: 'التاريخ الفعلي لتسجيل غياب الطالب.' },
    { code: 'session_name', label: 'الحصة الدراسية', category: 'attendance', category_name: 'الحضور والغياب', sample_value: 'طابور الصباح والحصة الأولى', description: 'اسم الحصة أو الفترة التي غاب فيها الطالب.' },

    // القبول والتسجيل
    { code: 'application_number', label: 'رقم طلب القبول', category: 'admission', category_name: 'القبول والتسجيل', sample_value: 'APP-9982', description: 'رقم طلب الالتحاق بالمدارس.' },
    { code: 'academic_year', label: 'العام الأكاديمي', category: 'admission', category_name: 'القبول والتسجيل', sample_value: '2026 / 2027 م', description: 'السنة الدراسية المستهدفة.' },
    { code: 'branch_name', label: 'اسم الفرع', category: 'admission', category_name: 'القبول والتسجيل', sample_value: 'فرع الخرطوم (الرياض)', description: 'الفرع أو المجمع التعليمي.' },

    // الأكاديمي والدرجات
    { code: 'subject_name', label: 'اسم المادة الدراسية', category: 'academic', category_name: 'الأكاديمي والامتحانات', sample_value: 'الرياضيات الإضافية', description: 'اسم المادة أو المقرر الدراسي.' },
    { code: 'score', label: 'الدرجة المحصلة', category: 'academic', category_name: 'الأكاديمي والامتحانات', sample_value: '94 / 100', description: 'درجة الطالب في الاختبار.' },

    // النقل والمواصلات
    { code: 'bus_number', label: 'رقم الحافلة', category: 'transport', category_name: 'النقل والمواصلات', sample_value: 'حافلة خط 08 (أم درمان)', description: 'رقم خط النقل المكتبي.' },

    // العام والمؤسسة
    { code: 'school_name', label: 'اسم المدرسة', category: 'general', category_name: 'عام والمؤسسة', sample_value: 'مدارس نبراس النموذجية بالسودان', description: 'الاسم الرسمي للمؤسسة التعليمية.' },
    { code: 'today_date', label: 'تاريخ اليوم الحالي', category: 'general', category_name: 'عام والمؤسسة', sample_value: new Date().toISOString().split('T')[0], description: 'التاريخ التلقائي لحظة الإرسال.' },
  ];

  popularVariables = computed(() => this.allVariables.slice(0, 6));

  constructor() {
    this.commService.getTemplates().subscribe((data) => {
      const arr = Array.isArray(data) ? data : (data as any)?.results || [];
      this.templates.set(arr);
    });
  }

  safeTemplates = computed(() => {
    const raw = this.templates();
    return Array.isArray(raw) ? raw : [];
  });

  filteredTemplates = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const cat = this.selectedCategory();
    return this.safeTemplates().filter((t) => {
      const matchSearch =
        !term ||
        (t.name || '').toLowerCase().includes(term) ||
        (t.code || '').toLowerCase().includes(term) ||
        (t.body || '').toLowerCase().includes(term);
      const matchCat = cat === 'all' || t.category === cat;
      return matchSearch && matchCat;
    });
  });

  getCategoryName(cat: string): string {
    const map: Record<string, string> = {
      attendance: 'الغياب والحضور',
      finance: 'الشؤون المالية',
      admission: 'القبول والتسجيل',
      academic: 'الأكاديمي والامتحانات',
      transport: 'النقل والمواصلات',
      general: 'عام',
    };
    return map[cat] || cat;
  }

  toggleModal(): void {
    this.editingTemplate = null;
    this.formData = { name: '', code: '', category: 'general', language: 'ar', subject: '', body: '' };
    this.showModal.update((v) => !v);
  }

  toggleGuideModal(): void {
    this.showGuideModal.update((v) => !v);
  }

  editTemplate(t: CommunicationTemplate): void {
    this.editingTemplate = t;
    this.formData = { ...t };
    this.showModal.set(true);
  }

  openPreviewModal(t: CommunicationTemplate): void {
    this.previewMode.set('rendered');
    this.previewTemplate.set(t);
  }

  closePreviewModal(): void {
    this.previewTemplate.set(null);
  }

  /**
   * محرك تفكيك المتغيرات التفاعلي (Live Interpolation Engine)
   */
  renderText(text?: string): string {
    if (!text) return '';
    let rendered = text;

    // استبدال كود كل متغير بقيمته التوضيحية التجريبية
    for (const v of this.allVariables) {
      const regex = new RegExp(`{{\\s*${v.code}\\s*}}`, 'g');
      rendered = rendered.replace(regex, v.sample_value);
    }
    return rendered;
  }

  insertVariableToForm(code: string): void {
    if (!this.showModal()) {
      this.toggleModal();
    }
    this.appendVarToText(code);
  }

  appendVarToText(code: string): void {
    const varTag = `{{${code}}}`;
    if (!this.formData.body) {
      this.formData.body = varTag;
    } else {
      this.formData.body += ` ${varTag}`;
    }
  }

  copyVariableCode(code: string): void {
    const tag = `{{${code}}}`;
    navigator.clipboard?.writeText(tag);
    this.appendVarToText(code);
  }

  saveTemplate(): void {
    if (!this.formData.name || !this.formData.code || !this.formData.body) return;
    if (this.editingTemplate) {
      this.templates.update((list) =>
        (Array.isArray(list) ? list : []).map((item) =>
          item.id === this.editingTemplate!.id ? ({ ...item, ...this.formData } as CommunicationTemplate) : item
        )
      );
    } else {
      const item: CommunicationTemplate = {
        id: String(Date.now()),
        name: this.formData.name || '',
        code: this.formData.code || '',
        category: this.formData.category || 'general',
        language: this.formData.language || 'ar',
        subject: this.formData.subject,
        body: this.formData.body || '',
        content_type: 'html',
        is_active: true,
        version_count: 1,
      };
      this.templates.update((list) => [item, ...(Array.isArray(list) ? list : [])]);
    }
    this.showModal.set(false);
  }
}
