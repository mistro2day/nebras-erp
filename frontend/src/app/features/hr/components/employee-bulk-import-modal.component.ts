import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, Output,
  computed, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { trigger, transition, style, animate } from '@angular/animations';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../core/services/notification.service';

export interface EmployeeRowPreview {
  row_number: number;
  data: any;
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface HeaderMappingItem {
  col_idx: number;
  raw_title: string;
  field_id: string;
  field_label: string;
}

@Component({
  selector: 'app-employee-bulk-import-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  animations: [
    trigger('backdropFade', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('modalZoom', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' }),
        animate('250ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.97) translateY(8px)' }))
      ])
    ]),
    trigger('stepTransition', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(15px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ],
  template: `
    @if (open) {
      <div class="bulk-modal-backdrop" @backdropFade (click)="onBackdropClick($event)">
        <div class="bulk-modal-container" @modalZoom role="dialog" dir="rtl" (click)="$event.stopPropagation()">
          
          <!-- Modal Header -->
          <header class="modal-header">
            <div class="title-group">
              <div class="icon-badge">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div>
                <h3 class="title">استيراد كشوفات المعلمين والموظفين (Excel)</h3>
                <p class="subtitle">رفع وتدقيق كشوفات الكادر وتوليد عقود 2026م واللائحة المالية وتصفير التجريبيين.</p>
              </div>
            </div>
            <button class="close-btn" (click)="closeModal()" aria-label="إغلاق">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </header>

          <!-- Stepper Navigation -->
          <nav class="stepper-nav">
            <div class="stepper-track">
              <div class="stepper-progress-fill" [style.width.%]="stepProgressPercent()"></div>
            </div>

            <div class="step-item" [class.active]="currentStep() === 1" [class.completed]="currentStep() > 1" (click)="canJumpToStep(1) ? currentStep.set(1) : null">
              <div class="step-circle">
                @if (currentStep() > 1) { <span>✓</span> } @else { <span>1</span> }
              </div>
              <span class="step-label">تحميل النموذج</span>
            </div>

            <div class="step-item" [class.active]="currentStep() === 2" [class.completed]="currentStep() > 2" (click)="canJumpToStep(2) ? currentStep.set(2) : null">
              <div class="step-circle">
                @if (currentStep() > 2) { <span>✓</span> } @else { <span>2</span> }
              </div>
              <span class="step-label">رفع الكشف والهيدر</span>
            </div>

            <div class="step-item" [class.active]="currentStep() === 3" [class.completed]="currentStep() > 3" (click)="canJumpToStep(3) ? currentStep.set(3) : null">
              <div class="step-circle">
                @if (currentStep() > 3) { <span>✓</span> } @else { <span>3</span> }
              </div>
              <span class="step-label">المعاينة والتدقيق</span>
            </div>

            <div class="step-item" [class.active]="currentStep() === 4" [class.completed]="currentStep() === 4">
              <div class="step-circle">
                <span>4</span>
              </div>
              <span class="step-label">اكتمال الاعتماد</span>
            </div>
          </nav>

          <!-- نافذة تأكيد الخروج دون حفظ (Nebras Custom Confirmation Modal) -->
          @if (showExitConfirm()) {
            <div class="confirm-overlay" @backdropFade>
              <div class="confirm-box" @modalZoom>
                <div class="confirm-icon-warn">⚠️</div>
                <h4 class="confirm-title">تنبيه: لم تقم باعتماد حفظ الكادر بعد!</h4>
                <p class="confirm-desc">
                  أنت حالياً في مرحلة المعاينة، ولديك <strong>({{ validRowCount() }})</strong> موظف جاهز للتسجيل. إذا أغلقت النافذة الآن، فلن تُحفظ السجلات.
                </p>
                <div class="confirm-actions">
                  <button class="nb-btn-success" (click)="showExitConfirm.set(false); executeFinalImport()">
                    ✓ حفظ واعتماد الموظفين الآن
                  </button>
                  <button class="nb-btn-secondary" (click)="showExitConfirm.set(false)">
                    متابعة التدقيق
                  </button>
                  <button class="nb-btn-danger-ghost" (click)="closeModal(true)">
                    خروج دون حفظ
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- Modal Body Content -->
          <div class="modal-body-content">

            <!-- STEP 1: تحميل النموذج -->
            @if (currentStep() === 1) {
              <div class="step-pane" @stepTransition>
                <div class="guide-banner">
                  <div class="banner-icon">📜</div>
                  <div class="banner-text">
                    <strong>إرشادات استيراد كشف المعلمين والموظفين بنجاح:</strong>
                    <p>قم بتنزيل النموذج الرسمي المعتمد لعقد 2026م. يحتوي المصنف على ترويسة مدمجة للمجموعات، وقوائم منسدلة للجنس والنوبتجية، ودليل توضيحي لبنود اللائحة المالية وبدلات الترحيل والاتصال والتمثيل ونصاب الحصص (23 حصة).</p>
                  </div>
                </div>

                <div class="template-action-card">
                  <div class="template-card-graphic">
                    <div class="excel-icon-box">
                      <span class="xls-tag">2026</span>
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="8" y1="13" x2="16" y2="13"></line>
                        <line x1="8" y1="17" x2="16" y2="17"></line>
                      </svg>
                    </div>
                  </div>
                  <div class="template-card-info">
                    <h4>نموذج استمارة وعقد المعلم والموظف الموحد 2026م</h4>
                    <p>ملف إكسل منسق وجاهز للتعبئة، يشمل البيانات الشخصية والسكنية، بيانات الاتصال والمعرفين، التكليف الأكاديمي، الأبناء والخصومات، وسجل الخبرات والمالية بالجنيه السوداني (ج.س).</p>
                    <div class="template-specs">
                      <span class="spec-chip">✓ اتجاه عربي (RTL)</span>
                      <span class="spec-chip">✓ ترويسة هيدر مدمجة ملونة</span>
                      <span class="spec-chip">✓ مرونة تعديل خلايا الترويسة</span>
                      <span class="spec-chip">✓ أمثلة سودانية واقعية</span>
                    </div>
                  </div>
                  <div class="template-card-action">
                    <button class="nb-btn-download" (click)="downloadTemplate()" [disabled]="downloading()">
                      @if (downloading()) {
                        <span class="spinner-sm"></span> جارٍ التحميل…
                      } @else {
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        تحميل نموذج إكسل (.xlsx)
                      }
                    </button>
                  </div>
                </div>

                <div class="step-footer">
                  <span class="footer-note">هل لديك كشف معبأ بالفعل؟ يمكنك المتابعة للخطوة التالية مباشرة لرفعه ومطابقة الهيدر.</span>
                  <button class="nb-btn-primary" (click)="goToStep(2)">
                    المتابعة لرفع الملف ←
                  </button>
                </div>
              </div>
            }

            <!-- STEP 2: رفع الملف ومحرر مطابقة خلايا الهيدر -->
            @if (currentStep() === 2) {
              <div class="step-pane" @stepTransition>
                
                <div 
                  class="dropzone-area" 
                  [class.drag-over]="isDragging()"
                  [class.has-file]="!!selectedFile()"
                  (dragover)="onDragOver($event)"
                  (dragleave)="onDragLeave($event)"
                  (drop)="onFileDrop($event)"
                  (click)="fileInput.click()"
                >
                  <input #fileInput type="file" (change)="onFileSelected($event)" accept=".xlsx, .xls, .csv" style="display: none" />
                  
                  @if (!selectedFile()) {
                    <div class="dropzone-placeholder">
                      <div class="upload-icon-pulse">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                      </div>
                      <h4>اسحب وأفلت كشف الإكسل هنا، أو اضغط للاختيار من جهازك</h4>
                      <p>يدعم ملفات Microsoft Excel (.xlsx, .xls) وكشوفات CSV</p>
                      <span class="file-pick-btn">اختيار ملف من الحاسوب</span>
                    </div>
                  } @else {
                    <div class="selected-file-card" (click)="$event.stopPropagation()">
                      <div class="file-icon-green">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                      </div>
                      <div class="file-meta">
                        <span class="file-name">{{ selectedFile()?.name }}</span>
                        <span class="file-size">{{ formatFileSize(selectedFile()?.size || 0) }}</span>
                      </div>
                      <button class="remove-file-btn" (click)="clearSelectedFile($event)" title="تغيير الملف">✕</button>
                    </div>
                  }
                </div>

                <!-- Live Progress Bar -->
                @if (validating()) {
                  <div class="progress-section" @stepTransition>
                    <div class="progress-info-row">
                      <span class="progress-status-text">جارٍ تحليل خلايا الهيدر وفحص بيانات الكادر…</span>
                      <span class="progress-percentage mono">85%</span>
                    </div>
                    <div class="progress-track-wrapper">
                      <div class="progress-bar-animated" style="width: 85%"></div>
                    </div>
                  </div>
                }

                <!-- محرر مطابقة رؤوس الأعمدة (Header Mapping Editor) عند اكتشاف الهيدر -->
                @if (headerMapping().length > 0 && !validating()) {
                  <div class="header-editor-panel" @stepTransition>
                    <div class="header-editor-title">
                      <span class="icon">🔍</span>
                      <div>
                        <h4>مطابقة خلايا ترويسة الإكسل (Header Mapping)</h4>
                        <p>تم اكتشاف <strong>({{ headerMapping().length }})</strong> عموداً في ملفك. يمكنك تعديل تعيين أي رأس عمود إذا قمت بتغيير أسماء الخلايا في الإكسل:</p>
                      </div>
                    </div>

                    <div class="mapping-table-wrap">
                      <table class="mapping-tbl">
                        <thead>
                          <tr>
                            <th>رقم العمود</th>
                            <th>عنوان الخلية في الإكسل</th>
                            <th>الحقل المطابق في النظام</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (m of headerMapping(); track m.col_idx) {
                            <tr>
                              <td class="col-num mono">{{ m.col_idx }}</td>
                              <td class="excel-title"><b>{{ m.raw_title }}</b></td>
                              <td class="sys-field">
                                <select [(ngModel)]="m.field_id" class="map-select">
                                  @for (opt of availableFields; track opt.id) {
                                    <option [value]="opt.id">{{ opt.label }}</option>
                                  }
                                </select>
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                }

                @if (validationErrorMsg()) {
                  <div class="alert-error-box">
                    <span class="icon">⚠️</span>
                    <span>{{ validationErrorMsg() }}</span>
                  </div>
                }

                <div class="step-footer">
                  <button class="nb-btn-secondary" (click)="goToStep(1)">→ رجوع للنموذج</button>
                  <button 
                    class="nb-btn-primary" 
                    [disabled]="!selectedFile() || validating()" 
                    (click)="analyzeAndValidateFile()"
                  >
                    @if (validating()) {
                      <span class="spinner-sm"></span> جارٍ فحص الكشف…
                    } @else {
                      فحص ومعاينة الكشف ←
                    }
                  </button>
                </div>
              </div>
            }

            <!-- STEP 3: المعاينة الذكية وخيار تصفير التجريبيين -->
            @if (currentStep() === 3) {
              <div class="step-pane preview-pane" @stepTransition>
                
                <!-- شريط الحفظ السريع والتوجيه -->
                <div class="preview-action-banner">
                  <div class="banner-content-side">
                    <div class="banner-pulse-dot"></div>
                    <div>
                      <h4 class="banner-title">مرحلة المعاينة والتدقيق (لم يتم حفظ الكادر في النظام بعد)</h4>
                      <p class="banner-sub">
                        تم فحص الكشف بنجاح! لديك <strong>({{ validRowCount() }})</strong> موظف جاهز للاعتماد، وإجمالي رواتب مقدرة بـ <strong>({{ totalPayrollPreview() | number }} ج.س)</strong>.
                      </p>
                    </div>
                  </div>
                  <button 
                    class="nb-btn-success-prominent" 
                    [disabled]="validRowCount() === 0 || importing()" 
                    (click)="executeFinalImport()"
                  >
                    @if (importing()) {
                      <span class="spinner-sm"></span> جارٍ الحفظ في النظام…
                    } @else {
                      ✓ اعتماد وتسكين ({{ validRowCount() }}) موظف الآن
                    }
                  </button>
                </div>

                <!-- خيار تصفير واستبدال الموظفين التجريبيين الحاليين -->
                <div class="purge-mock-box" [class.active]="purgeMockEmployees()">
                  <label class="purge-checkbox-label">
                    <input type="checkbox" [(ngModel)]="purgeMockEmployees" />
                    <div class="purge-text">
                      <span class="purge-title">🧹 تصفير وحذف الموظفين التجريبيين الحاليين (قاعدة بيانات نظيفة)</span>
                      <span class="purge-desc">الموظفون الحاليون تجريبيون فقط. عند تفعيل هذا الخيار سيتم حذفهم أولاً بأمان وتسكين موظفي هذا الملف بدلاً منهم.</span>
                    </div>
                  </label>
                  @if (purgeMockEmployees()) {
                    <span class="purge-badge">سيتم استبدال التجريبيين</span>
                  }
                </div>

                <!-- إحصائيات المعاينة السريعة والفلترة -->
                <div class="preview-metrics-bar">
                  <div class="metric-chip total">
                    <span class="m-label">إجمالي السجلات:</span>
                    <span class="m-val mono">{{ previewRows().length }}</span>
                  </div>
                  <div class="metric-chip valid">
                    <span class="m-label">جاهزة للاعتماد:</span>
                    <span class="m-val mono">{{ validRowCount() }}</span>
                  </div>
                  <div class="metric-chip error" *ngIf="errorRowCount() > 0">
                    <span class="m-label">تحتاج مراجعة:</span>
                    <span class="m-val mono">{{ errorRowCount() }}</span>
                  </div>

                  <!-- فلتر العرض -->
                  <div class="preview-filter-pills">
                    <button [class.active]="filterMode() === 'all'" (click)="filterMode.set('all')">الكل ({{ previewRows().length }})</button>
                    <button [class.active]="filterMode() === 'valid'" (click)="filterMode.set('valid')">صالحة ({{ validRowCount() }})</button>
                    <button [class.active]="filterMode() === 'error'" (click)="filterMode.set('error')" *ngIf="errorRowCount() > 0">بها ملاحظات ({{ errorRowCount() }})</button>
                  </div>
                </div>

                <!-- المؤشرات المالية لكشف الرواتب -->
                <div class="finance-summary-bar">
                  <div class="fin-kpi-card fees">
                    <div class="kpi-icon">💵</div>
                    <div class="kpi-body">
                      <span class="kpi-title">إجمالي الرواتب الأساسية</span>
                      <span class="kpi-num mono">{{ totalBasicSalary() | number }} <span class="cur">ج.س</span></span>
                    </div>
                  </div>
                  <div class="fin-kpi-card paid">
                    <div class="kpi-icon">🚌</div>
                    <div class="kpi-body">
                      <span class="kpi-title">إجمالي البدلات (ترحيل/اتصال/تمثيل)</span>
                      <span class="kpi-num mono text-emerald">{{ totalAllowances() | number }} <span class="cur">ج.س</span></span>
                    </div>
                  </div>
                  <div class="fin-kpi-card rem">
                    <div class="kpi-icon">💰</div>
                    <div class="kpi-body">
                      <span class="kpi-title">صافي مسير الرواتب المستحق</span>
                      <span class="kpi-num mono text-amber">{{ totalPayrollPreview() | number }} <span class="cur">ج.س</span></span>
                    </div>
                  </div>
                </div>

                <!-- جدول المعاينة التفاعلي -->
                <div class="preview-table-container">
                  <table class="preview-tbl">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>المعلم / الموظف</th>
                        <th>الجنس والحالة</th>
                        <th>الهاتف والواتساب</th>
                        <th>المؤهل والتخصص</th>
                        <th>المادة والتكليف</th>
                        <th>نصاب الحصص</th>
                        <th>صافي المستحق</th>
                        <th>الأبناء والخبرات</th>
                        <th>الحالة والملاحظات</th>
                        <th>حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of filteredRows(); track row.row_number) {
                        <tr [class.row-error]="!row.is_valid">
                          <td class="mono text-muted">{{ row.row_number }}</td>
                          <td class="font-semibold">
                            <div>{{ row.data.full_name_ar }}</div>
                            <small class="text-muted">{{ row.data.title_surname || 'معلم' }} • {{ row.data.city || 'الخرطوم' }}</small>
                          </td>
                          <td>
                            <span>{{ row.data.gender === 'female' ? 'أنثى' : 'ذكر' }}</span>
                            <small class="text-muted d-block">{{ row.data.marital_status || '-' }}</small>
                          </td>
                          <td class="mono">
                            <div>{{ row.data.phone_1 }}</div>
                            <small class="text-emerald">{{ row.data.whatsapp_number }}</small>
                          </td>
                          <td>
                            <div>{{ row.data.specialization }}</div>
                            <small class="text-muted">{{ row.data.university_institute }}</small>
                          </td>
                          <td>
                            <span class="badge-sub">{{ row.data.teaching_subject_1 }}</span>
                          </td>
                          <td class="mono text-center">
                            <b>{{ row.data.weekly_lesson_quota }}</b> حصة
                            <small class="d-block text-muted">{{ row.data.duty_exempt ? 'معفى duty' : 'duty' }}</small>
                          </td>
                          <td class="mono text-emerald font-bold">
                            {{ row.data.net_payable | number }} ج.س
                          </td>
                          <td>
                            @if (row.data.dependent_name) {
                              <div class="dep-mini">👶 {{ row.data.dependent_name }} ({{ row.data.dependent_discount }}%)</div>
                            }
                            @if (row.data.prior_school_name) {
                              <small class="text-muted d-block">🏛️ {{ row.data.prior_school_name }}</small>
                            }
                          </td>
                          <td>
                            @if (row.is_valid) {
                              <span class="badge-valid">جاهز للاعتماد</span>
                            } @else {
                              <div class="errors-list">
                                @for (err of row.errors; track err) {
                                  <span class="err-tag">{{ err }}</span>
                                }
                              </div>
                            }
                          </td>
                          <td>
                            <button class="btn-del-row" (click)="deleteRow(row.row_number)" title="حذف هذا السطر">🗑️</button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <div class="step-footer">
                  <button class="nb-btn-secondary" (click)="goToStep(2)">→ تعديل الملف أو الهيدر</button>
                  <button 
                    class="nb-btn-success-prominent" 
                    [disabled]="validRowCount() === 0 || importing()" 
                    (click)="executeFinalImport()"
                  >
                    @if (importing()) {
                      <span class="spinner-sm"></span> جارٍ الحفظ في النظام…
                    } @else {
                      ✓ اعتماد وتسكين ({{ validRowCount() }}) موظف الآن
                    }
                  </button>
                </div>
              </div>
            }

            <!-- STEP 4: اكتمال الاستيراد والتسجيل الرسمي -->
            @if (currentStep() === 4) {
              <div class="step-pane success-pane" @stepTransition>
                <div class="success-celebrate-box">
                  <div class="success-icon-anim">✓</div>
                  <h3 class="success-title">تم استيراد واعتماد الكادر التعليمي بنجاح!</h3>
                  <p class="success-subtitle">
                    تم إنشاء وتسكين <strong>({{ importSummary()?.imported_count || validRowCount() }})</strong> موظف ومعلم، وتوثيق عقود 2026م الرسمية باللائحة المالية والأكاديمية.
                  </p>
                </div>

                <div class="success-metrics-card">
                  <div class="s-metric">
                    <span class="s-val">{{ importSummary()?.imported_count || validRowCount() }}</span>
                    <span class="s-lbl">المعلمون والموظفون المعتمدون</span>
                  </div>
                  <div class="s-metric">
                    <span class="s-val">{{ importSummary()?.dependents_count || 0 }}</span>
                    <span class="s-lbl">أبناء المعلمين بخصم اللائحة</span>
                  </div>
                  <div class="s-metric">
                    <span class="s-val">{{ importSummary()?.references_count || 0 }}</span>
                    <span class="s-lbl">المعرفون من الكادر</span>
                  </div>
                  <div class="s-metric">
                    <span class="s-val">{{ importSummary()?.experiences_count || 0 }}</span>
                    <span class="s-lbl">الخبرات السابقة الموثقة</span>
                  </div>
                </div>

                @if (importSummary()?.first_employee_number) {
                  <div class="emp-numbers-banner">
                    <span>التسلسل الوظيفي المولد:</span>
                    <strong class="mono">{{ importSummary()?.first_employee_number }}</strong>
                    <span>إلى</span>
                    <strong class="mono">{{ importSummary()?.last_employee_number }}</strong>
                  </div>
                }

                <div class="step-footer center-footer">
                  <button class="nb-btn-primary" (click)="finishAndClose()">
                    ✓ إنهاء وتحديث لوحة الموارد البشرية
                  </button>
                </div>
              </div>
            }

          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .bulk-modal-backdrop {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px); z-index: 1000;
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .bulk-modal-container {
      background: #ffffff; border-radius: 16px; width: 100%; max-width: 1080px;
      max-height: 90vh; display: flex; flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden;
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 18px 24px; border-bottom: 1px solid #e2e8f0; background: #f8fafc;
    }
    .title-group { display: flex; align-items: center; gap: 14px; }
    .icon-badge {
      width: 42px; height: 42px; border-radius: 10px; background: #0f766e;
      color: #fff; display: flex; align-items: center; justify-content: center;
    }
    .title { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0; }
    .subtitle { font-size: 12.5px; color: #64748b; margin: 2px 0 0; }
    .close-btn {
      background: transparent; border: none; font-size: 18px; color: #64748b;
      cursor: pointer; padding: 6px; border-radius: 6px;
    }
    .close-btn:hover { background: #e2e8f0; color: #0f172a; }

    /* Stepper */
    .stepper-nav {
      position: relative; display: flex; justify-content: space-between;
      padding: 16px 40px; background: #ffffff; border-bottom: 1px solid #e2e8f0;
    }
    .stepper-track {
      position: absolute; top: 32px; left: 60px; right: 60px; height: 3px;
      background: #e2e8f0; z-index: 1;
    }
    .stepper-progress-fill { height: 100%; background: #0f766e; transition: width 0.3s; }
    .step-item {
      position: relative; z-index: 2; display: flex; flex-direction: column;
      align-items: center; gap: 6px; cursor: default;
    }
    .step-circle {
      width: 32px; height: 32px; border-radius: 50%; background: #fff;
      border: 2px solid #cbd5e1; color: #64748b; font-weight: 700; font-size: 13px;
      display: flex; align-items: center; justify-content: center; transition: all 0.2s;
    }
    .step-item.active .step-circle { border-color: #0f766e; background: #0f766e; color: #fff; }
    .step-item.completed .step-circle { border-color: #0f766e; background: #ecfdf5; color: #0f766e; }
    .step-label { font-size: 12px; font-weight: 600; color: #64748b; }
    .step-item.active .step-label { color: #0f766e; font-weight: 700; }

    /* Modal Body */
    .modal-body-content { padding: 24px; overflow-y: auto; flex: 1; }
    .guide-banner {
      display: flex; gap: 14px; padding: 16px; background: #f0fdfa;
      border: 1px solid #ccfbf1; border-radius: 12px; margin-bottom: 20px;
    }
    .banner-icon { font-size: 28px; }
    .banner-text strong { display: block; color: #0f766e; margin-bottom: 4px; }
    .banner-text p { margin: 0; font-size: 13px; color: #334155; line-height: 1.5; }

    .template-action-card {
      display: flex; align-items: center; gap: 20px; padding: 20px;
      border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.03); margin-bottom: 24px;
    }
    .excel-icon-box {
      width: 72px; height: 72px; border-radius: 12px; background: #f0fdf4;
      border: 1px solid #bbf7d0; color: #16a34a; display: flex; flex-direction: column;
      align-items: center; justify-content: center; position: relative;
    }
    .xls-tag { font-size: 10px; font-weight: 800; color: #16a34a; margin-bottom: 2px; }
    .template-card-info { flex: 1; }
    .template-card-info h4 { margin: 0 0 4px; font-size: 16px; color: #0f172a; }
    .template-card-info p { margin: 0 0 10px; font-size: 12.5px; color: #64748b; }
    .template-specs { display: flex; gap: 8px; flex-wrap: wrap; }
    .spec-chip { font-size: 11px; font-weight: 600; background: #f1f5f9; color: #475569; padding: 3px 8px; border-radius: 6px; }

    .nb-btn-download {
      background: #0f766e; color: #fff; border: none; padding: 10px 18px;
      border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer;
      display: flex; align-items: center; gap: 8px; transition: background 0.15s;
    }
    .nb-btn-download:hover { background: #115e59; }

    /* Dropzone */
    .dropzone-area {
      border: 2px dashed #cbd5e1; border-radius: 12px; padding: 36px 20px;
      text-align: center; cursor: pointer; background: #f8fafc; transition: all 0.2s;
      margin-bottom: 20px;
    }
    .dropzone-area:hover, .dropzone-area.drag-over { border-color: #0f766e; background: #f0fdfa; }
    .upload-icon-pulse { color: #0f766e; margin-bottom: 12px; }
    .dropzone-placeholder h4 { margin: 0 0 6px; font-size: 15px; color: #0f172a; }
    .dropzone-placeholder p { margin: 0 0 14px; font-size: 12px; color: #64748b; }
    .file-pick-btn {
      display: inline-block; background: #ffffff; border: 1px solid #cbd5e1;
      padding: 6px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; color: #334155;
    }
    .selected-file-card {
      display: flex; align-items: center; gap: 14px; background: #fff;
      border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 20px; text-align: right;
    }
    .file-icon-green { color: #16a34a; }
    .file-meta { flex: 1; display: flex; flex-direction: column; }
    .file-name { font-weight: 700; font-size: 13.5px; color: #0f172a; }
    .file-size { font-size: 11px; color: #64748b; }
    .remove-file-btn {
      background: #f1f5f9; border: none; border-radius: 50%; width: 28px; height: 28px;
      cursor: pointer; font-weight: 700; color: #64748b;
    }

    /* Header Editor */
    .header-editor-panel {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 16px; margin-bottom: 20px;
    }
    .header-editor-title { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 12px; }
    .header-editor-title h4 { margin: 0 0 2px; font-size: 14px; color: #0f172a; }
    .header-editor-title p { margin: 0; font-size: 12px; color: #64748b; }
    .mapping-table-wrap { max-height: 220px; overflow-y: auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
    .mapping-tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
    .mapping-tbl th { background: #f1f5f9; padding: 8px 12px; text-align: right; font-weight: 700; color: #475569; }
    .mapping-tbl td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
    .col-num { font-weight: 700; color: #0f766e; }
    .map-select { width: 100%; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 11.5px; }

    /* Purge Mock Box */
    .purge-mock-box {
      background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px;
      padding: 14px 18px; margin-bottom: 18px; display: flex; justify-content: space-between;
      align-items: center; transition: all 0.2s;
    }
    .purge-mock-box.active { background: #fef2f2; border-color: #fecaca; }
    .purge-checkbox-label { display: flex; align-items: flex-start; gap: 12px; cursor: pointer; flex: 1; }
    .purge-checkbox-label input { width: 18px; height: 18px; margin-top: 2px; }
    .purge-title { display: block; font-weight: 700; font-size: 13.5px; color: #991b1b; }
    .purge-desc { display: block; font-size: 11.5px; color: #7f1d1d; margin-top: 2px; }
    .purge-badge { background: #fee2e2; color: #dc2626; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; }

    /* Preview UI */
    .preview-action-banner {
      display: flex; justify-content: space-between; align-items: center;
      background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 12px;
      padding: 14px 20px; margin-bottom: 16px;
    }
    .banner-content-side { display: flex; align-items: center; gap: 12px; }
    .banner-pulse-dot { width: 10px; height: 10px; border-radius: 50%; background: #0f766e; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
    .banner-title { margin: 0 0 2px; font-size: 14px; font-weight: 700; color: #0f766e; }
    .banner-sub { margin: 0; font-size: 12px; color: #334155; }

    .preview-metrics-bar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
    .metric-chip { background: #f1f5f9; padding: 6px 12px; border-radius: 8px; font-size: 12px; display: flex; gap: 6px; }
    .metric-chip.valid { background: #ecfdf5; color: #065f46; font-weight: 700; }
    .metric-chip.error { background: #fef2f2; color: #991b1b; }
    .preview-filter-pills { margin-right: auto; display: flex; gap: 6px; }
    .preview-filter-pills button {
      background: #f8fafc; border: 1px solid #cbd5e1; padding: 4px 10px;
      border-radius: 6px; font-size: 11.5px; cursor: pointer;
    }
    .preview-filter-pills button.active { background: #0f766e; color: #fff; border-color: #0f766e; font-weight: 700; }

    .finance-summary-bar {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px; margin-bottom: 18px;
    }
    .fin-kpi-card {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0;
    }
    .kpi-icon { font-size: 24px; }
    .kpi-body { display: flex; flex-direction: column; }
    .kpi-title { font-size: 11.5px; color: #64748b; }
    .kpi-num { font-size: 16px; font-weight: 800; color: #0f172a; }
    .cur { font-size: 11px; font-weight: 600; color: #64748b; }

    .preview-table-container {
      border: 1px solid #e2e8f0; border-radius: 10px; max-height: 380px;
      overflow-y: auto; margin-bottom: 20px;
    }
    .preview-tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .preview-tbl th {
      position: sticky; top: 0; background: #f8fafc; padding: 10px 12px;
      text-align: right; border-bottom: 2px solid #e2e8f0; font-weight: 700; color: #334155;
    }
    .preview-tbl td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .preview-tbl tr.row-error { background: #fff5f5; }
    .badge-sub { background: #f1f5f9; color: #334155; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .badge-valid { background: #ecfdf5; color: #065f46; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; }
    .err-tag { display: block; font-size: 10.5px; color: #dc2626; }
    .btn-del-row { background: transparent; border: none; cursor: pointer; font-size: 14px; opacity: 0.6; }
    .btn-del-row:hover { opacity: 1; }

    /* Success Step */
    .success-celebrate-box { text-align: center; padding: 30px 20px 20px; }
    .success-icon-anim {
      width: 64px; height: 64px; border-radius: 50%; background: #10b981; color: #fff;
      font-size: 32px; font-weight: 800; display: flex; align-items: center;
      justify-content: center; margin: 0 auto 16px; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
    }
    .success-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 6px; }
    .success-subtitle { font-size: 13.5px; color: #64748b; margin: 0; }

    .success-metrics-card {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;
      margin: 20px 0; text-align: center;
    }
    .s-metric { display: flex; flex-direction: column; }
    .s-val { font-size: 26px; font-weight: 800; color: #0f766e; }
    .s-lbl { font-size: 12px; color: #64748b; margin-top: 4px; }

    .emp-numbers-banner {
      background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;
      padding: 12px; text-align: center; font-size: 13px; color: #166534; display: flex;
      justify-content: center; gap: 8px; align-items: center; margin-bottom: 24px;
    }

    /* Common Footers & Buttons */
    .step-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 16px; border-top: 1px solid #e2e8f0; margin-top: 16px;
    }
    .center-footer { justify-content: center; }
    .footer-note { font-size: 12px; color: #64748b; }

    .nb-btn-primary {
      background: #0f766e; color: #fff; border: none; padding: 9px 20px;
      border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer;
    }
    .nb-btn-primary:hover:not(:disabled) { background: #115e59; }
    .nb-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .nb-btn-secondary {
      background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 9px 18px;
      border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer;
    }
    .nb-btn-success-prominent {
      background: #10b981; color: #fff; border: none; padding: 10px 22px;
      border-radius: 8px; font-weight: 800; font-size: 13.5px; cursor: pointer;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }
    .nb-btn-success-prominent:hover:not(:disabled) { background: #059669; }

    /* Custom Confirmation Modal */
    .confirm-overlay {
      position: absolute; inset: 0; background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(2px); z-index: 100; display: flex;
      align-items: center; justify-content: center; padding: 20px;
    }
    .confirm-box {
      background: #fff; border-radius: 14px; max-width: 440px; padding: 24px;
      text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
    }
    .confirm-icon-warn { font-size: 38px; margin-bottom: 12px; }
    .confirm-title { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 8px; }
    .confirm-desc { font-size: 13px; color: #475569; margin: 0 0 20px; line-height: 1.5; }
    .confirm-actions { display: flex; flex-direction: column; gap: 8px; }
    .nb-btn-success { background: #10b981; color: #fff; border: none; padding: 9px; border-radius: 8px; font-weight: 700; cursor: pointer; }
    .nb-btn-danger-ghost { background: transparent; color: #dc2626; border: none; font-size: 12px; font-weight: 600; cursor: pointer; padding: 6px; }

    .spinner-sm {
      display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%; border-top-color: #fff; animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .mono { font-variant-numeric: tabular-nums; font-family: monospace, sans-serif; }
    .text-emerald { color: #059669; }
    .text-amber { color: #d97706; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .d-block { display: block; }
    .dep-mini { font-size: 11px; background: #eff6ff; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; }
  `]
})
export class EmployeeBulkImportModalComponent {
  private readonly http = inject(HttpClient);
  private readonly notify = inject(NotificationService);

  @Input() open = false;
  @Output() close = new EventEmitter<boolean>();
  @Output() imported = new EventEmitter<any>();

  readonly currentStep = signal<number>(1);
  readonly selectedFile = signal<File | null>(null);
  readonly isDragging = signal<boolean>(false);
  readonly downloading = signal<boolean>(false);
  readonly validating = signal<boolean>(false);
  readonly importing = signal<boolean>(false);
  readonly showExitConfirm = signal<boolean>(false);
  readonly validationErrorMsg = signal<string>('');

  readonly headerMapping = signal<HeaderMappingItem[]>([]);
  readonly previewRows = signal<EmployeeRowPreview[]>([]);
  readonly filterMode = signal<'all' | 'valid' | 'error'>('all');
  readonly purgeMockEmployees = signal<boolean>(true); // الافتراضي هو تصفير التجريبيين كما طلب المستخدم
  readonly importSummary = signal<any>(null);

  readonly availableFields = [
    { id: 'full_name_ar', label: 'الاسم رباعياً بالعربية *' },
    { id: 'title_surname', label: 'اللقب العلمي / الإداري' },
    { id: 'gender', label: 'الجنس * (ذكر / أنثى)' },
    { id: 'national_id', label: 'الرقم الوطني / الهوية' },
    { id: 'marital_status', label: 'الحالة الاجتماعية' },
    { id: 'children_count', label: 'عدد الأبناء' },
    { id: 'city', label: 'المدينة / الولاية *' },
    { id: 'neighborhood', label: 'الحي السكني *' },
    { id: 'square_number', label: 'رقم المربع' },
    { id: 'house_number', label: 'رقم المنزل' },
    { id: 'gatekeeper_name', label: 'اسم البواب' },
    { id: 'prominent_teacher_friend', label: 'أقرب معلم بارز بالمدرسة' },
    { id: 'phone_1', label: 'الهاتف الأساسي (1) *' },
    { id: 'whatsapp_number', label: 'رقم الواتساب المعتمد *' },
    { id: 'phone_2', label: 'رقم هاتف ثانٍ (2)' },
    { id: 'emergency_phone_other', label: 'هاتف الطوارئ' },
    { id: 'emergency_kinship', label: 'صلة قرابة الطوارئ' },
    { id: 'email', label: 'البريد الإلكتروني' },
    { id: 'ref_name', label: 'اسم المعلم المرجع' },
    { id: 'ref_phone', label: 'هاتف المعلم المرجع' },
    { id: 'university_institute', label: 'الجامعة / المعهد *' },
    { id: 'faculty', label: 'الكلية *' },
    { id: 'specialization', label: 'التخصص الدقيق *' },
    { id: 'position', label: 'المسمى الوظيفي' },
    { id: 'department', label: 'القسم الإداري' },
    { id: 'teaching_subject_1', label: 'المادة المكلف بها (1) *' },
    { id: 'teaching_subject_2', label: 'المادة (2)' },
    { id: 'teaching_subject_3', label: 'المادة (3)' },
    { id: 'weekly_lesson_quota', label: 'نصاب الحصص الأسبوعي' },
    { id: 'duty_exempt', label: 'معفى من النوبتجية' },
    { id: 'other_tasks_activities', label: 'أنشطة ومهام إشرافية' },
    { id: 'dependent_name', label: 'اسم الابن/القريب بالمدرسة' },
    { id: 'dependent_relation', label: 'صلة القرابة للابن' },
    { id: 'dependent_stage_grade', label: 'المرحلة والصف للابن' },
    { id: 'dependent_discount', label: 'نسبة التخفيض %' },
    { id: 'prior_school_name', label: 'اسم المدرسة السابقة' },
    { id: 'prior_country', label: 'بلد الخبرة السابقة' },
    { id: 'prior_time_period', label: 'الفترة الزمنية للخبرة' },
    { id: 'basic_salary', label: 'الراتب الأساسي (ج.س) *' },
    { id: 'transport_allowance', label: 'بدل ترحيل (ج.س)' },
    { id: 'communication_allowance', label: 'بدل اتصال وانترنت (ج.س)' },
    { id: 'representation_allowance', label: 'بدل تمثيل (ج.س)' },
    { id: 'deductions', label: 'الخصومات (ج.س)' },
    { id: 'joining_date', label: 'تاريخ المباشرة' },
    { id: 'contract_start_date', label: 'تاريخ بداية العقد' },
    { id: 'contract_end_date', label: 'تاريخ نهاية العقد' },
  ];

  readonly stepProgressPercent = computed(() => ((this.currentStep() - 1) / 3) * 100);
  readonly validRowCount = computed(() => this.previewRows().filter(r => r.is_valid).length);
  readonly errorRowCount = computed(() => this.previewRows().filter(r => !r.is_valid).length);

  readonly filteredRows = computed(() => {
    const mode = this.filterMode();
    if (mode === 'valid') return this.previewRows().filter(r => r.is_valid);
    if (mode === 'error') return this.previewRows().filter(r => !r.is_valid);
    return this.previewRows();
  });

  readonly totalBasicSalary = computed(() => {
    return this.previewRows().reduce((acc, r) => acc + (Number(r.data.basic_salary) || 0), 0);
  });

  readonly totalAllowances = computed(() => {
    return this.previewRows().reduce((acc, r) => {
      const t = Number(r.data.transport_allowance) || 0;
      const c = Number(r.data.communication_allowance) || 0;
      const rp = Number(r.data.representation_allowance) || 0;
      return acc + t + c + rp;
    }, 0);
  });

  readonly totalPayrollPreview = computed(() => {
    return this.previewRows().reduce((acc, r) => acc + (Number(r.data.net_payable) || 0), 0);
  });

  private cleanApiUrl(endpoint: string): string {
    const base = environment.apiUrl.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    if (base.endsWith('/v1') && cleanEndpoint.startsWith('v1/')) {
      return `${base.replace(/\/v1$/, '')}/${cleanEndpoint}`;
    }
    return `${base}/${cleanEndpoint}`;
  }

  canJumpToStep(step: number): boolean {
    if (step === 1) return true;
    if (step === 2) return true;
    if (step === 3) return this.previewRows().length > 0;
    return false;
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= 4) {
      this.currentStep.set(step);
    }
  }

  downloadTemplate(): void {
    this.downloading.set(true);
    const url = this.cleanApiUrl('v1/employees/employees/download-template/');
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.downloading.set(false);
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = 'employee_roster_template_2026.xlsx';
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
        this.notify.success('تم تنزيل نموذج كشف المعلمين والموظفين الرسمي بنجاح.');
      },
      error: () => {
        this.downloading.set(false);
        this.notify.error('حدث خطأ أثناء تحميل نموذج الإكسل.');
      }
    });
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(false);
  }

  onFileDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      this.setFile(e.dataTransfer.files[0]);
    }
  }

  onFileSelected(e: Event): void {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.setFile(target.files[0]);
    }
  }

  setFile(file: File): void {
    this.selectedFile.set(file);
    this.validationErrorMsg.set('');
    // تحليل فوري لاستخراج الهيدر ومطابقته
    this.analyzeAndValidateFile();
  }

  clearSelectedFile(e: Event): void {
    e.stopPropagation();
    this.selectedFile.set(null);
    this.headerMapping.set([]);
    this.previewRows.set([]);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  analyzeAndValidateFile(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.validating.set(true);
    this.validationErrorMsg.set('');

    const formData = new FormData();
    formData.append('file', file);

    // إن وُجدت مطابقة مخصصة للهيدر
    if (this.headerMapping().length > 0) {
      const customMap: { [key: string]: string } = {};
      this.headerMapping().forEach(m => {
        customMap[m.raw_title] = m.field_id;
      });
      formData.append('header_mapping', JSON.stringify(customMap));
    }

    const url = this.cleanApiUrl('v1/employees/employees/validate-import/');
    this.http.post<any>(url, formData).subscribe({
      next: (res) => {
        this.validating.set(false);
        const data = res?.data || res;
        if (data.is_valid === false) {
          this.validationErrorMsg.set(data.error || 'الملف غير صالح.');
          return;
        }

        this.headerMapping.set(data.header_mapping || []);
        this.previewRows.set(data.rows || []);
        this.goToStep(3);
        this.notify.success(`تم فحص الكشف بنجاح: (${data.valid_count}) سجل صالح.`);
      },
      error: (err) => {
        this.validating.set(false);
        this.validationErrorMsg.set(err?.error?.message || 'تعذر فحص ملف الإكسل.');
      }
    });
  }

  deleteRow(rowNumber: number): void {
    this.previewRows.update(rows => rows.filter(r => r.row_number !== rowNumber));
  }

  executeFinalImport(): void {
    const validRows = this.previewRows().filter(r => r.is_valid).map(r => r.data);
    if (validRows.length === 0) {
      this.notify.warning('لا توجد سجلات صالحة للاستيراد.');
      return;
    }

    this.importing.set(true);
    const payload = {
      rows: validRows,
      purge_mock_employees: this.purgeMockEmployees()
    };

    const url = this.cleanApiUrl('v1/employees/employees/bulk-import/');
    this.http.post<any>(url, payload).subscribe({
      next: (res) => {
        this.importing.set(false);
        const summary = res?.data || res;
        this.importSummary.set(summary);
        this.goToStep(4);
        this.notify.success(res?.message || 'تم اعتماد واستيراد الكادر بنجاح.');
        this.imported.emit(summary);
      },
      error: (err) => {
        this.importing.set(false);
        this.notify.error(err?.error?.message || 'حدث خطأ أثناء اعتماد الموظفين.');
      }
    });
  }

  onBackdropClick(e: MouseEvent): void {
    if (this.currentStep() === 3 && this.validRowCount() > 0) {
      this.showExitConfirm.set(true);
    } else {
      this.closeModal();
    }
  }

  closeModal(force = false): void {
    if (!force && this.currentStep() === 3 && this.validRowCount() > 0) {
      this.showExitConfirm.set(true);
      return;
    }
    this.showExitConfirm.set(false);
    this.close.emit(false);
  }

  finishAndClose(): void {
    this.close.emit(true);
  }
}
