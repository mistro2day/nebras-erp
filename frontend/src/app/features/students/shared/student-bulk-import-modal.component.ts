import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, Output,
  computed, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { StudentsService } from '../students.service';

export interface RowPreview {
  row_number: number;
  data: any;
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}

@Component({
  selector: 'app-student-bulk-import-modal',
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <div>
                <h3 class="title">رفع كشوفات الطلاب دفعة واحدة</h3>
                <p class="subtitle">استيراد كشوفات الطلاب عبر نموذج إكسل الرسمي وتسكينهم وتوليد أرقامهم الأكاديمية.</p>
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
              <span class="step-label">رفع الملف</span>
            </div>

            <div class="step-item" [class.active]="currentStep() === 3" [class.completed]="currentStep() > 3" (click)="canJumpToStep(3) ? currentStep.set(3) : null">
              <div class="step-circle">
                @if (currentStep() > 3) { <span>✓</span> } @else { <span>3</span> }
              </div>
              <span class="step-label">المعاينة والتحقق</span>
            </div>

            <div class="step-item" [class.active]="currentStep() === 4" [class.completed]="currentStep() === 4">
              <div class="step-circle">
                <span>4</span>
              </div>
              <span class="step-label">اكتمال الاستيراد</span>
            </div>
          </nav>

          <!-- Modal Body Content -->
          <div class="modal-body-content">

            <!-- STEP 1: تحميل النموذج -->
            @if (currentStep() === 1) {
              <div class="step-pane" @stepTransition>
                <div class="guide-banner">
                  <div class="banner-icon">💡</div>
                  <div class="banner-text">
                    <strong>إرشادات استيراد الكشوفات بنجاح:</strong>
                    <p>قم بتنزيل النموذج الرسمي المعتمد، واملأ بيانات الطلاب وأولياء أمورهم. يحتوي النموذج على ورقة إضافية بأسماء الصفوف والشعب المعتمدة في مدرستكم لتفادي أخطاء الإدخال.</p>
                  </div>
                </div>

                <div class="template-action-card">
                  <div class="template-card-graphic">
                    <div class="excel-icon-box">
                      <span class="xls-tag">XLSX</span>
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="8" y1="13" x2="16" y2="13"></line>
                        <line x1="8" y1="17" x2="16" y2="17"></line>
                      </svg>
                    </div>
                  </div>
                  <div class="template-card-info">
                    <h4>نموذج كشف الطلاب الأكاديمي الموحد</h4>
                    <p>ملف إكسل منسق وجاهز للتعبئة (RTL)، يدعم الهوية السودانية والحقول الإلزامية وأرقام الهواتف وبيانات الطوارئ.</p>
                    <div class="template-specs">
                      <span class="spec-chip">✓ اتجاه عربي (RTL)</span>
                      <span class="spec-chip">✓ قائمة صفوف وشعب مدرستك</span>
                      <span class="spec-chip">✓ أمثلة توضيحية واقعية</span>
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
                  <span class="footer-note">هل لديك ملف معبأ بالفعل؟ يمكنك المتابعة للخطوة التالية مباشرة.</span>
                  <button class="nb-btn-primary" (click)="goToStep(2)">
                    المتابعة لرفع الملف ←
                  </button>
                </div>
              </div>
            }

            <!-- STEP 2: رفع الملف والسحب والإفلات -->
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
                      <h4>اسحب وأفلت ملف الكشف هنا، أو تصفح من جهازك</h4>
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

                <!-- Live Progress Bar (شريط التقدم التفاعلي للتحليل) -->
                @if (validating()) {
                  <div class="progress-section" @stepTransition>
                    <div class="progress-info-row">
                      <span class="progress-status-text">{{ progressStatusText() }}</span>
                      <span class="progress-percentage mono">{{ progressPercent() }}%</span>
                    </div>
                    <div class="progress-track-wrapper">
                      <div class="progress-bar-animated" [style.width.%]="progressPercent()"></div>
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
                      <span class="spinner-sm"></span> جارٍ فحص البيانات…
                    } @else {
                      فحص ومعاينة البيانات ←
                    }
                  </button>
                </div>
              </div>
            }

            <!-- STEP 3: المعاينة الذكية والتحقق المسبق -->
            @if (currentStep() === 3) {
              <div class="step-pane preview-pane" @stepTransition>
                
                <!-- إحصائيات المعاينة السريعة -->
                <div class="preview-metrics-bar">
                  <div class="metric-chip total">
                    <span class="m-label">إجمالي السجلات:</span>
                    <span class="m-val mono">{{ previewRows().length }}</span>
                  </div>
                  <div class="metric-chip valid">
                    <span class="m-label">جاهزة للاستيراد:</span>
                    <span class="m-val mono">{{ validRowCount() }}</span>
                  </div>
                  <div class="metric-chip error" *ngIf="errorRowCount() > 0">
                    <span class="m-label">تحتاج مراجعة:</span>
                    <span class="m-val mono">{{ errorRowCount() }}</span>
                  </div>

                  <!-- فلتر العرض -->
                  <div class="preview-filter-pills">
                    <button [class.active]="filterMode() === 'all'" (click)="filterMode.set('all')">الكل ({{ previewRows().length }})</button>
                    <button [class.active]="filterMode() === 'valid'" (click)="filterMode.set('valid')">السليمة فقط ({{ validRowCount() }})</button>
                    <button [class.active]="filterMode() === 'error'" (click)="filterMode.set('error')">الأخطاء ({{ errorRowCount() }})</button>
                  </div>
                </div>

                @if (errorRowCount() > 0) {
                  <div class="notice-box warn">
                    <span class="icon">⚠️</span>
                    <span>تم رصد ملاحظات في بعض الأسطر. يمكنك حذف الأسطر غير الصالحة بالضغط على (🗑️)، أو استيراد السجلات السليمة فقط وسيقوم النظام بتخطي الأسطر المعيبة.</span>
                  </div>
                }

                <!-- جدول المعاينة الذكي -->
                <div class="preview-table-container">
                  <table class="preview-tbl">
                    <thead>
                      <tr>
                        <th style="width: 50px;">السطر</th>
                        <th>اسم الطالب رباعي</th>
                        <th>الجنس</th>
                        <th>الميلاد</th>
                        <th>الصف الدراسي</th>
                        <th>الشعبة</th>
                        <th>ولي الأمر / الهاتف</th>
                        <th>حالة التدقيق</th>
                        <th style="width: 50px;">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (r of filteredPreviewRows(); track r.row_number) {
                        <tr [class.row-invalid]="!r.is_valid">
                          <td class="mono center-cell">{{ r.row_number }}</td>
                          <td class="strong">{{ r.data.arabic_name || '—' }}</td>
                          <td>{{ r.data.gender === 'male' ? 'ذكر' : r.data.gender === 'female' ? 'أنثى' : (r.data.gender || '—') }}</td>
                          <td class="mono">{{ r.data.date_of_birth || '—' }}</td>
                          <td>
                            <span class="badge-grade">{{ r.data.matched_grade_name || r.data.grade_name || '—' }}</span>
                          </td>
                          <td>{{ r.data.section_name || '—' }}</td>
                          <td>
                            <div class="guardian-info">
                              <span>{{ r.data.guardian_name || '—' }}</span>
                              <span class="phone mono" *ngIf="r.data.guardian_phone">📞 {{ r.data.guardian_phone }}</span>
                            </div>
                          </td>
                          <td>
                            @if (r.is_valid) {
                              <span class="status-tag valid">
                                <span class="dot"></span> سليم وجاهز
                              </span>
                            } @else {
                              <div class="status-tag invalid" [title]="r.errors.join('\n')">
                                <span class="dot"></span> {{ r.errors[0] }}
                              </div>
                            }
                            @if (r.warnings.length > 0) {
                              <div class="warn-pill" [title]="r.warnings.join('\n')">
                                ⚠️ {{ r.warnings[0] }}
                              </div>
                            }
                          </td>
                          <td class="center-cell">
                            <button class="row-del-btn" (click)="excludeRow(r.row_number)" title="استثناء هذا السطر من الاستيراد">
                              🗑️
                            </button>
                          </td>
                        </tr>
                      }
                      @if (filteredPreviewRows().length === 0) {
                        <tr>
                          <td colspan="9" class="empty-cell">لا توجد سجلات تطابق الفلتر المحدد.</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <!-- Live Progress Bar (شريط التقدم أثناء الاستيراد الفعلي) -->
                @if (importing()) {
                  <div class="progress-section" @stepTransition>
                    <div class="progress-info-row">
                      <span class="progress-status-text">جارٍ تسجيل وحفظ الطلاب وتسكينهم في الفصول وتوليد الأرقام الأكاديمية…</span>
                      <span class="progress-percentage mono">{{ importProgressPercent() }}%</span>
                    </div>
                    <div class="progress-track-wrapper">
                      <div class="progress-bar-animated import" [style.width.%]="importProgressPercent()"></div>
                    </div>
                  </div>
                }

                @if (importErrorMsg()) {
                  <div class="alert-error-box">
                    <span class="icon">⚠️</span>
                    <span>{{ importErrorMsg() }}</span>
                  </div>
                }

                <div class="step-footer">
                  <button class="nb-btn-secondary" (click)="goToStep(2)" [disabled]="importing()">→ تغيير الملف</button>
                  <button 
                    class="nb-btn-success" 
                    [disabled]="validRowCount() === 0 || importing()" 
                    (click)="executeFinalImport()"
                  >
                    @if (importing()) {
                      <span class="spinner-sm"></span> جارٍ الاستيراد…
                    } @else {
                      ✓ اعتماد واستيراد ({{ validRowCount() }}) طالب
                    }
                  </button>
                </div>
              </div>
            }

            <!-- STEP 4: التقرير الختامي والنجاح -->
            @if (currentStep() === 4) {
              <div class="step-pane success-pane" @stepTransition>
                <div class="success-hero">
                  <div class="success-icon-wrap">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h3>تم استيراد وتسجيل الطلاب بنجاح!</h3>
                  <p class="success-sub">تم إدراج الطلاب في قاعدة البيانات، وتسكينهم في فصولهم، وتوليد أرقامهم الأكاديمية الرسمية.</p>

                  <div class="success-stats-badge">
                    <span class="count mono">{{ finalReport()?.imported_count || 0 }}</span>
                    <span class="label">طالب تم تسجيلهم وتفعيل ملفاتهم</span>
                  </div>
                </div>

                @if (finalReport()?.students?.length > 0) {
                  <div class="imported-samples-list">
                    <h5>عينة من الطلاب المسجلين حديثاً:</h5>
                    <div class="sample-chips">
                      @for (std of finalReport()?.students?.slice(0, 10); track std.id) {
                        <div class="sample-chip">
                          <span class="std-name">{{ std.name }}</span>
                          <span class="std-num mono">{{ std.student_number }}</span>
                          <span class="std-grd" *ngIf="std.grade">{{ std.grade }}</span>
                        </div>
                      }
                      @if ((finalReport()?.students?.length || 0) > 10) {
                        <div class="sample-chip more">
                          + {{ (finalReport()?.students?.length || 0) - 10 }} طالب آخرين…
                        </div>
                      }
                    </div>
                  </div>
                }

                <div class="step-footer center-footer">
                  <button class="nb-btn-primary lg" (click)="finishAndClose()">
                    إغلاق والعودة لقائمة الطلاب
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
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      z-index: 2100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .bulk-modal-container {
      background: #FFFFFF;
      width: 100%;
      max-width: 980px;
      height: 85vh;
      max-height: 820px;
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(15, 118, 110, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: inherit;
    }

    /* Modal Header */
    .modal-header {
      padding: 20px 24px;
      background: linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 100%);
      border-bottom: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .title-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .icon-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #CCFBF1;
      color: #0F766E;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .title {
      font-size: 18px;
      font-weight: 700;
      color: #0F172A;
      margin: 0;
    }

    .subtitle {
      font-size: 13px;
      color: #64748B;
      margin: 2px 0 0;
    }

    .close-btn {
      background: #F1F5F9;
      border: none;
      color: #64748B;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .close-btn:hover {
      background: #E2E8F0;
      color: #0F172A;
    }

    /* Stepper Header */
    .stepper-nav {
      position: relative;
      padding: 16px 36px;
      background: #FAFAFA;
      border-bottom: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .stepper-track {
      position: absolute;
      top: 32px;
      right: 60px;
      left: 60px;
      height: 3px;
      background: #E2E8F0;
      z-index: 1;
    }

    .stepper-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #0F766E, #14B8A6);
      transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .step-item {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      cursor: default;
    }

    .step-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 2px solid #CBD5E1;
      color: #64748B;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.25s;
    }

    .step-item.active .step-circle {
      border-color: #0F766E;
      background: #0F766E;
      color: #FFFFFF;
      box-shadow: 0 0 0 4px #CCFBF1;
    }

    .step-item.completed .step-circle {
      border-color: #0D9488;
      background: #0D9488;
      color: #FFFFFF;
    }

    .step-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748B;
    }

    .step-item.active .step-label {
      color: #0F766E;
      font-weight: 700;
    }

    /* Modal Body */
    .modal-body-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
    }

    .step-pane {
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 20px;
    }

    /* Guide Banner */
    .guide-banner {
      background: #F0FDFA;
      border: 1px solid #CCFBF1;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      gap: 14px;
      align-items: flex-start;
    }

    .banner-icon { font-size: 22px; }
    .banner-text strong { display: block; color: #0F766E; margin-bottom: 4px; font-size: 14px; }
    .banner-text p { margin: 0; color: #334155; font-size: 13px; line-height: 1.5; }

    /* Template Card */
    .template-action-card {
      background: #FFFFFF;
      border: 1.5px solid #E2E8F0;
      border-radius: 16px;
      padding: 22px;
      display: flex;
      align-items: center;
      gap: 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
      transition: all 0.2s;
    }
    .template-action-card:hover {
      border-color: #0F766E;
      box-shadow: 0 8px 24px rgba(15, 118, 110, 0.08);
    }

    .excel-icon-box {
      width: 72px;
      height: 72px;
      background: #ECFDF5;
      color: #059669;
      border: 1.5px solid #A7F3D0;
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .xls-tag {
      position: absolute;
      bottom: 6px;
      font-size: 9px;
      font-weight: 800;
      background: #059669;
      color: white;
      padding: 1px 5px;
      border-radius: 4px;
    }

    .template-card-info { flex: 1; }
    .template-card-info h4 { margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #0F172A; }
    .template-card-info p { margin: 0 0 10px; font-size: 13px; color: #64748B; }

    .template-specs { display: flex; gap: 10px; flex-wrap: wrap; }
    .spec-chip {
      background: #F1F5F9;
      color: #475569;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .nb-btn-download {
      background: #0F766E;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .nb-btn-download:hover { background: #0D9488; }

    /* Dropzone */
    .dropzone-area {
      border: 2px dashed #CBD5E1;
      background: #F8FAFC;
      border-radius: 18px;
      padding: 36px 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.25s;
    }
    .dropzone-area:hover, .dropzone-area.drag-over {
      border-color: #0F766E;
      background: #F0FDFA;
      transform: scale(1.005);
    }
    .dropzone-area.has-file {
      border-style: solid;
      border-color: #10B981;
      background: #ECFDF5;
    }

    .upload-icon-pulse {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #E2E8F0;
      color: #0F766E;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      transition: transform 0.2s;
    }
    .dropzone-area:hover .upload-icon-pulse {
      transform: translateY(-3px);
      background: #CCFBF1;
    }

    .dropzone-placeholder h4 { margin: 0 0 6px; font-size: 15px; color: #1E293B; font-weight: 700; }
    .dropzone-placeholder p { margin: 0 0 14px; font-size: 13px; color: #64748B; }

    .file-pick-btn {
      display: inline-block;
      background: white;
      border: 1px solid #CBD5E1;
      padding: 7px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
    }

    .selected-file-card {
      display: flex;
      align-items: center;
      gap: 14px;
      background: white;
      padding: 14px 20px;
      border-radius: 12px;
      max-width: 440px;
      margin: 0 auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #A7F3D0;
    }

    .file-icon-green {
      color: #059669;
    }

    .file-meta { flex: 1; text-align: right; }
    .file-name { display: block; font-weight: 700; font-size: 14px; color: #0F172A; word-break: break-all; }
    .file-size { font-size: 12px; color: #64748B; }

    .remove-file-btn {
      background: #FEE2E2;
      border: none;
      color: #DC2626;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      font-size: 13px;
      cursor: pointer;
    }

    /* Live Progress Bar */
    .progress-section {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .progress-info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }

    .progress-status-text {
      color: #0F766E;
      font-weight: 600;
    }

    .progress-percentage {
      font-weight: 700;
      color: #0F172A;
    }

    .progress-track-wrapper {
      height: 8px;
      background: #E2E8F0;
      border-radius: 999px;
      overflow: hidden;
      position: relative;
    }

    .progress-bar-animated {
      height: 100%;
      background: linear-gradient(90deg, #0F766E 0%, #14B8A6 60%, #059669 100%);
      border-radius: 999px;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 0 8px rgba(20, 184, 166, 0.5);
    }
    .progress-bar-animated.import {
      background: linear-gradient(90deg, #059669 0%, #10B981 100%);
    }

    /* Step 3: Preview */
    .preview-metrics-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      background: #F8FAFC;
      padding: 10px 14px;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
    }

    .metric-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 8px;
    }
    .metric-chip.total { background: #E2E8F0; color: #334155; }
    .metric-chip.valid { background: #ECFDF5; color: #059669; }
    .metric-chip.error { background: #FFE4E6; color: #E11D48; }

    .preview-filter-pills {
      margin-right: auto;
      display: flex;
      gap: 6px;
    }
    .preview-filter-pills button {
      background: white;
      border: 1px solid #CBD5E1;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      color: #64748B;
      cursor: pointer;
    }
    .preview-filter-pills button.active {
      background: #0F766E;
      color: white;
      border-color: #0F766E;
    }

    .notice-box {
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .notice-box.warn {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      color: #B45309;
    }

    .preview-table-container {
      flex: 1;
      min-height: 250px;
      max-height: 380px;
      overflow: auto;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      background: white;
    }

    .preview-tbl {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: right;
    }
    .preview-tbl th {
      background: #F8FAFC;
      color: #475569;
      font-weight: 700;
      padding: 10px 12px;
      border-bottom: 2px solid #E2E8F0;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .preview-tbl td {
      padding: 8px 12px;
      border-bottom: 1px solid #F1F5F9;
      color: #1E293B;
    }
    .preview-tbl tr.row-invalid {
      background: #FFF1F2;
    }

    .mono { font-family: monospace; }
    .center-cell { text-align: center; }
    .strong { font-weight: 700; }

    .badge-grade {
      background: #F0FDFA;
      color: #0F766E;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 12px;
    }

    .guardian-info { display: flex; flex-direction: column; font-size: 12px; }
    .guardian-info .phone { color: #64748B; }

    .status-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .status-tag.valid { background: #ECFDF5; color: #059669; }
    .status-tag.invalid { background: #FFE4E6; color: #E11D48; }
    .status-tag .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

    .warn-pill {
      font-size: 10px;
      color: #D97706;
      margin-top: 2px;
    }

    .row-del-btn {
      background: none;
      border: none;
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.2s;
    }
    .row-del-btn:hover { opacity: 1; }

    .empty-cell {
      text-align: center;
      padding: 30px !important;
      color: #94A3B8;
    }

    /* Success Step */
    .success-pane {
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 20px 0;
    }

    .success-hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .success-icon-wrap {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #ECFDF5;
      color: #059669;
      border: 3px solid #A7F3D0;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
      animation: popIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .success-hero h3 { margin: 0; font-size: 22px; font-weight: 800; color: #0F172A; }
    .success-sub { margin: 0; color: #64748B; font-size: 14px; max-width: 500px; }

    .success-stats-badge {
      background: #F0FDFA;
      border: 1px solid #99F6E4;
      border-radius: 12px;
      padding: 10px 24px;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 8px;
    }
    .success-stats-badge .count {
      font-size: 24px;
      font-weight: 800;
      color: #0F766E;
    }
    .success-stats-badge .label {
      font-size: 13px;
      font-weight: 600;
      color: #115E59;
    }

    .imported-samples-list {
      width: 100%;
      max-width: 650px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 14px;
      padding: 14px;
      text-align: right;
    }
    .imported-samples-list h5 {
      margin: 0 0 10px;
      font-size: 13px;
      color: #475569;
    }
    .sample-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .sample-chip {
      background: white;
      border: 1px solid #CBD5E1;
      padding: 6px 12px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .sample-chip .std-name { font-weight: 700; color: #0F172A; }
    .sample-chip .std-num { color: #0F766E; font-weight: 600; }
    .sample-chip .std-grd { background: #F1F5F9; color: #475569; padding: 1px 6px; border-radius: 4px; font-size: 11px; }
    .sample-chip.more { background: #F1F5F9; color: #64748B; font-weight: 600; }

    /* Step Footer Actions */
    .step-footer {
      margin-top: auto;
      padding-top: 14px;
      border-top: 1px solid #F1F5F9;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .step-footer.center-footer { justify-content: center; }

    .footer-note { font-size: 12px; color: #94A3B8; }

    .nb-btn-primary, .nb-btn-secondary, .nb-btn-success {
      padding: 10px 20px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .nb-btn-primary { background: #0F766E; color: white; border: none; }
    .nb-btn-primary:hover:not(:disabled) { background: #0D9488; }
    .nb-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .nb-btn-secondary { background: white; color: #475569; border: 1px solid #CBD5E1; }
    .nb-btn-secondary:hover:not(:disabled) { background: #F8FAFC; }

    .nb-btn-success { background: #059669; color: white; border: none; }
    .nb-btn-success:hover:not(:disabled) { background: #047857; }
    .nb-btn-success:disabled { opacity: 0.5; cursor: not-allowed; }

    .nb-btn-primary.lg { padding: 12px 28px; font-size: 15px; }

    .alert-error-box {
      background: #FEF2F2;
      border: 1px solid #FECDD3;
      color: #BE123C;
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: white;
      border-radius: 50%;
      display: inline-block;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes popIn { 0% { transform: scale(0.6); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
  `]
})
export class StudentBulkImportModalComponent {
  private studentsService = inject(StudentsService);

  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() importedSuccess = new EventEmitter<number>();

  currentStep = signal<number>(1);
  isDragging = signal<boolean>(false);
  selectedFile = signal<File | null>(null);

  downloading = signal<boolean>(false);
  validating = signal<boolean>(false);
  importing = signal<boolean>(false);

  progressPercent = signal<number>(0);
  progressStatusText = signal<string>('');
  importProgressPercent = signal<number>(0);

  validationErrorMsg = signal<string>('');
  importErrorMsg = signal<string>('');

  previewRows = signal<RowPreview[]>([]);
  filterMode = signal<'all' | 'valid' | 'error'>('all');
  finalReport = signal<any | null>(null);

  readonly stepProgressPercent = computed(() => {
    return ((this.currentStep() - 1) / 3) * 100;
  });

  readonly validRowCount = computed(() => {
    return this.previewRows().filter(r => r.is_valid).length;
  });

  readonly errorRowCount = computed(() => {
    return this.previewRows().filter(r => !r.is_valid).length;
  });

  readonly filteredPreviewRows = computed(() => {
    const mode = this.filterMode();
    const rows = this.previewRows();
    if (mode === 'valid') return rows.filter(r => r.is_valid);
    if (mode === 'error') return rows.filter(r => !r.is_valid);
    return rows;
  });

  canJumpToStep(target: number): boolean {
    if (target === 1) return true;
    if (target === 2) return true;
    if (target === 3) return this.previewRows().length > 0;
    if (target === 4) return !!this.finalReport();
    return false;
  }

  goToStep(step: number): void {
    this.currentStep.set(step);
  }

  onBackdropClick(event: MouseEvent): void {
    if (!this.importing()) {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.resetState();
    this.closed.emit();
  }

  resetState(): void {
    this.currentStep.set(1);
    this.selectedFile.set(null);
    this.previewRows.set([]);
    this.validationErrorMsg.set('');
    this.importErrorMsg.set('');
    this.finalReport.set(null);
    this.progressPercent.set(0);
    this.importProgressPercent.set(0);
  }

  downloadTemplate(): void {
    this.downloading.set(true);
    this.studentsService.downloadImportTemplate().subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `كشف_الطلاب_نموذج_نبراس_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.downloading.set(false);
      },
      error: () => {
        this.downloading.set(false);
      }
    });
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);
  }

  onFileDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      this.handleFile(e.dataTransfer.files[0]);
    }
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File): void {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      this.validationErrorMsg.set('صيغة الملف غير مدعومة. يرجى اختيار ملف إكسل (.xlsx / .xls) أو ملف .csv.');
      return;
    }
    this.validationErrorMsg.set('');
    this.selectedFile.set(file);
  }

  clearSelectedFile(e: MouseEvent): void {
    e.stopPropagation();
    this.selectedFile.set(null);
    this.validationErrorMsg.set('');
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  }

  analyzeAndValidateFile(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.validating.set(true);
    this.validationErrorMsg.set('');
    this.progressPercent.set(15);
    this.progressStatusText.set('قراءة مصنف الإكسل وفك ترميز الأسطر…');

    // محاكاة مراحل الفحص البصري التفاعلي لشريط التقدم
    setTimeout(() => {
      this.progressPercent.set(45);
      this.progressStatusText.set('التحقق من صحة الأسماء وأرقام الهواتف السودانية…');
    }, 250);

    setTimeout(() => {
      this.progressPercent.set(75);
      this.progressStatusText.set('مطابقة الصفوف والشعب مع قاعدة البيانات…');
    }, 550);

    this.studentsService.validateBulkImport(file).subscribe({
      next: (res: any) => {
        this.progressPercent.set(100);
        this.progressStatusText.set('اكتمل فحص الملف بنجاح!');
        setTimeout(() => {
          this.validating.set(false);
          const data = res?.data || res;
          this.previewRows.set(data.rows || []);
          this.currentStep.set(3);
        }, 200);
      },
      error: (err: any) => {
        this.validating.set(false);
        this.progressPercent.set(0);
        const msg = err?.error?.message || err?.message || 'تعذر فحص الملف المرفوع. يرجى التأكد من صحة التنسيق.';
        this.validationErrorMsg.set(msg);
      }
    });
  }

  excludeRow(rowNum: number): void {
    this.previewRows.update(rows => rows.filter(r => r.row_number !== rowNum));
  }

  executeFinalImport(): void {
    const validRows = this.previewRows().filter(r => r.is_valid).map(r => r.data);
    if (validRows.length === 0) {
      this.importErrorMsg.set('لا توجد سجلات صالحة للاستيراد.');
      return;
    }

    this.importing.set(true);
    this.importErrorMsg.set('');
    this.importProgressPercent.set(20);

    const timer = setInterval(() => {
      this.importProgressPercent.update(p => (p < 85 ? p + 15 : p));
    }, 200);

    this.studentsService.executeBulkImport({ rows: validRows }).subscribe({
      next: (res: any) => {
        clearInterval(timer);
        this.importProgressPercent.set(100);
        setTimeout(() => {
          this.importing.set(false);
          const result = res?.data || res;
          this.finalReport.set(result);
          this.currentStep.set(4);
          this.importedSuccess.emit(result.imported_count || validRows.length);
        }, 250);
      },
      error: (err: any) => {
        clearInterval(timer);
        this.importing.set(false);
        const msg = err?.error?.message || err?.message || 'حدث خطأ أثناء حفظ الطلاب في قاعدة البيانات.';
        this.importErrorMsg.set(msg);
      }
    });
  }

  finishAndClose(): void {
    this.closeModal();
  }
}
