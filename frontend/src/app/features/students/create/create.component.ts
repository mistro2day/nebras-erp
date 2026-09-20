import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentsService } from '../students.service';
import { AdmissionsService } from '../../admissions/admissions.service';
import { Router } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RegistrationFinanceFormComponent, FinancialConfig } from '../shared/registration-finance-form.component';

import { NbStepperComponent } from '../../../shared/nebras/nb-stepper.component';

@Component({
  selector: 'app-student-create',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatSnackBarModule, NbPageHeaderComponent, NbPanelComponent, NbDatepickerComponent, NbLoadingComponent, NbStepperComponent, RegistrationFinanceFormComponent],
  animations: [
    trigger('listAnimation', [
      transition('* <=> *', [
        query(':enter', [
          style({ opacity: 0, transform: 'scale(0.95)' }),
          stagger('40ms', [
            animate('250ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, height: 0, transform: 'translateY(15px)' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, height: '*', transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, height: 0, transform: 'translateY(15px)' }))
      ])
    ])
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="تسجيل طالب جديد"
        subtitle="إضافة الطلاب إلى العام الأكاديمي، إما عن طريق ربط طلب قبول مقبول أو التسجيل اليدوي المباشر مع تحديد الفوترة والسداد."
      >
        <button class="nb-btn-secondary" (click)="cancel()">رجوع للقائمة</button>
      </nb-page-header>

      <!-- تبديل وضعية التسجيل -->
      <div class="mode-selector-bar">
        <button 
          [class.active]="regMode() === 'admission'" 
          (click)="setMode('admission')"
        >
          📁 ربط طلب قبول معتمد
        </button>
        <button 
          [class.active]="regMode() === 'manual'" 
          (click)="setMode('manual')"
        >
          ✏️ تسجيل طالب يدوياً بالكامل
        </button>
      </div>

      <div class="registration-wizard-layout" *ngIf="regMode() === 'admission'" @fadeSlide>
        <!-- قسم اختيار الطلب المقبول -->
        <nb-panel 
          title="طلبات القبول المعتمدة المقبولة"
          subtitle="اختر أحد طلبات الالتحاق المقبولة أدناه لإتمام تسجيله وتوليد رقمه المدرسي الجديد."
        >
          @if (loadingApplicants()) {
            <nb-loading message="جاري تحميل طلبات القبول المعتمدة..."></nb-loading>
          } @else {
            <div class="applicants-selection-grid" [@listAnimation]="applicants().length">
              @for (app of applicants(); track app.id) {
                <div 
                  class="applicant-select-card" 
                  [class.selected]="selectedApplicant()?.id === app.id"
                  (click)="onApplicantSelected(app.id)"
                >
                  <div class="app-card-header">
                    <span class="app-num">{{ app.application_number }}</span>
                    <span class="badge success">مقبول</span>
                  </div>
                  <h4 class="app-name">{{ app.arabic_full_name }}</h4>
                  <div class="app-meta">
                    <span>🚻 {{ app.gender === 'male' ? 'ذكر' : 'أنثى' }}</span>
                    <span class="grade-tag" *ngIf="app.grade_name || app.applying_grade?.name">📚 {{ app.grade_name || app.applying_grade?.name || 'الصف' }}</span>
                    <span class="phone-tag" *ngIf="app.guardian_phone || app.guardians?.[0]?.phone">📞 {{ app.guardian_phone || app.guardians?.[0]?.phone }}</span>
                  </div>
                </div>
              }
              @if (applicants().length === 0) {
                <div class="no-applicants-box">
                  <div class="icon">✨</div>
                  <h4>لا توجد طلبات قبول معلقة</h4>
                  <p>تم إتمام تسجيل كافة طلبات المتقدمين المقبولين حالياً.</p>
                </div>
              }
            </div>
          }
        </nb-panel>

        <!-- تفاصيل المتقدم والتأكيد والفوترة -->
        @if (selectedApplicant(); as a) {
          <div class="applicant-confirm-panel" @fadeSlide>
            <nb-panel [title]="'تأكيد إكمال ملف التسجيل: ' + a.arabic_full_name">
              <div class="preview-layout">
                <div class="detail-avatar-container">
                  <div class="detail-avatar" [class]="a.gender">
                    {{ getInitials(a.arabic_full_name) }}
                  </div>
                </div>
                
                <div class="details-grid">
                  <div class="detail-field">
                    <span class="field-label">الاسم الكامل (عربي):</span>
                    <span class="field-value font-bold">{{ a.arabic_full_name }}</span>
                  </div>
                  <div class="detail-field">
                    <span class="field-label">الاسم الكامل (إنجليزي):</span>
                    <span class="field-value">{{ a.english_full_name || '—' }}</span>
                  </div>
                  <div class="detail-field">
                    <span class="field-label">الجنس:</span>
                    <span class="field-value">{{ a.gender === 'male' ? 'ذكر' : 'أنثى' }}</span>
                  </div>
                  <div class="detail-field">
                    <span class="field-label">تاريخ الميلاد:</span>
                    <span class="field-value">{{ a.date_of_birth }}</span>
                  </div>
                  <div class="detail-field">
                    <span class="field-label">الجنسية:</span>
                    <span class="field-value">{{ a.nationality }}</span>
                  </div>
                  <div class="detail-field">
                     <span class="field-label">الرقم الوطني / الجواز:</span>
                    <span class="field-value">{{ a.national_id }}</span>
                  </div>
                </div>
              </div>

              <!-- بطاقة التوزيع الأكاديمي واختيار الفصل الدراسي -->
              <div class="academic-distribution-card">
                <div class="distribution-header">
                  <span class="dist-icon">🏫</span>
                  <div>
                    <h4 class="dist-title">التسكين الأكاديمي وتوزيع الفصل</h4>
                    <p class="dist-sub">حدد الفصل الدراسي لتسكين الطالب فور إكمال تسجيله.</p>
                  </div>
                </div>

                <div class="distribution-controls">
                  <div class="field">
                    <label>الصف الدراسي المسجل</label>
                    <div class="field-badge-value">
                      📚 {{ a.grade_name || 'الصف المسجل بالطلب' }}
                    </div>
                  </div>

                  <div class="field">
                    <label>الفرع المدرسي (تحديد تلقائي)</label>
                    <div class="branch-badge-auto">
                      <span class="branch-icon">{{ a.gender === 'male' ? '👦' : '👧' }}</span>
                      <span class="branch-text">{{ selectedBranchName() }}</span>
                      <span class="auto-badge">تلقائي (بحسب الجنس: {{ a.gender === 'male' ? 'ذكر' : 'أنثى' }})</span>
                    </div>
                  </div>

                  <div class="field">
                    <label>الفصل الدراسي (توزيع فوري)</label>
                    <select [ngModel]="selectedSectionId()" (ngModelChange)="selectedSectionId.set($event)" class="section-select-control">
                      <option value="">{{ availableSections().length > 0 ? '-- اختر الفصل لتسكين الطالب --' : '-- لا توجد فصول معرفة لهذا الصف حالياً --' }}</option>
                      @for (sec of availableSections(); track sec.id) {
                        <option [value]="sec.id">
                          {{ sec.name }} (السعة: {{ sec.capacity }} · المقاعد الشاغرة: {{ sec.available_seats !== undefined ? sec.available_seats : (sec.capacity - (sec.occupied_seats || 0)) }})
                        </option>
                      }
                    </select>
                  </div>
                </div>
              </div>

              <!-- قسم الرسوم والأقساط والإيصال الفوري عند التسجيل -->
              <div class="finance-step-wrapper">
                <app-registration-finance-form (configChange)="financialConfig.set($event)"></app-registration-finance-form>
              </div>

              <div class="form-actions">
                <button class="nb-btn-secondary" (click)="cancelSelection()">إلغاء التحديد</button>
                <button class="nb-btn-primary" (click)="registerStudent()" [disabled]="submitting()">
                  {{ submitting() ? 'جارٍ تسجيل الطالب والفوترة…' : 'إكمال تسجيل الطالب وإصدار السندات ✓' }}
                </button>
              </div>
            </nb-panel>
          </div>
        }
      </div>

      <!-- نموذج التسجيل اليدوي للطلاب بنظام الخطوات المعتمد المطابق لاستمارة القبول -->
      <div class="registration-manual-layout" *ngIf="regMode() === 'manual'" @fadeSlide>
        <nb-panel title="تسجيل طالب يدوياً — ملف متكامل" subtitle="معالج تسجيل الطالب خطوة بخطوة مطابق لاستمارة القبول والتسجيل الرسمية بالمدرسة مع ربط ولي الأمر والملف الصحي والرسوم.">
          
          <!-- مؤشر الخطوات المعتمد -->
          <div class="wizard-stepper-wrap">
            <nb-stepper [steps]="manualSteps" [current]="manualStep()"></nb-stepper>
          </div>

          <div class="manual-form">
            <!-- 1) البيانات الشخصية للتلميذ والأكاديمية والأشقاء -->
            <div class="step-content" *ngIf="manualStep() === 1" @fadeSlide>
              <div class="step-title-box">
                <span class="step-badge">الخطوة الأولى</span>
                <h3>أ / البيانات الشخصية للتلميذ والتسكين الأكاديمي</h3>
              </div>

              <div class="form-grid">
                <div class="field wide-2">
                  <label>اسم التلميذ رباعياً (عربي) <span class="required-star">*</span></label>
                  <input type="text" [(ngModel)]="personalForm.arabic_name" name="arabic_name" required placeholder="مثال: أحمد محمد عبد الرحمن علي" />
                </div>
                <div class="field">
                  <label>اسم التلميذ (إنجليزي)</label>
                  <input type="text" [(ngModel)]="personalForm.english_name" name="english_name" placeholder="Ahmed Mohamed Ali" />
                </div>
                <div class="field">
                  <label>الجنس <span class="required-star">*</span></label>
                  <select [ngModel]="personalForm.gender" (ngModelChange)="onGenderChange($event)" name="gender">
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <div class="field">
                  <label>الفرع المدرسي المستهدف</label>
                  <div class="branch-pill-manual">
                    <span class="branch-icon">{{ personalForm.gender === 'male' ? '👦' : '👧' }}</span>
                    <span class="branch-name">{{ selectedBranchName() }}</span>
                    <span class="auto-tag">تلقائي بحسب الجنس</span>
                  </div>
                </div>
                <div class="field">
                  <label>تاريخ الميلاد <span class="required-star">*</span></label>
                  <nb-datepicker [(value)]="personalForm.date_of_birth" placeholder="اختر تاريخ الميلاد"></nb-datepicker>
                </div>
                <div class="field">
                  <label>مكان الميلاد</label>
                  <input type="text" [(ngModel)]="personalForm.birth_place" name="birth_place" placeholder="الخرطوم / أم درمان / ..." />
                </div>
                <div class="field">
                  <label>الجنسية <span class="required-star">*</span></label>
                  <input type="text" [(ngModel)]="personalForm.nationality" name="nationality" placeholder="سوداني" />
                </div>
                <div class="field">
                  <label>الرقم الوطني <span class="required-star">*</span></label>
                  <input type="text" [(ngModel)]="personalForm.national_id" name="national_id" placeholder="11 رقم للطلاب السودانيين" />
                </div>
                <div class="field">
                  <label>رقم جواز السفر (لغير السودانيين)</label>
                  <input type="text" [(ngModel)]="personalForm.passport" name="passport" placeholder="رقم الجواز إن وجد" />
                </div>
                <div class="field">
                  <label>الديانة</label>
                  <input type="text" [(ngModel)]="personalForm.religion" name="religion" placeholder="مسلم" />
                </div>
                <div class="field">
                  <label>فصيلة الدم</label>
                  <select [(ngModel)]="personalForm.blood_group" name="blood_group">
                    <option value="">غير معروف</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div class="field">
                  <label>الصف الدراسي <span class="required-star">*</span></label>
                  <select [ngModel]="manualAcademic.grade_id" (ngModelChange)="onManualGradeChange($event)" name="manual_grade" required>
                    <option value="">-- اختر الصف الدراسي --</option>
                    @for (g of grades(); track g.id) {
                      <option [value]="g.id">{{ g.name }}</option>
                    }
                  </select>
                </div>
                <div class="field">
                  <label>الفصل الدراسي (اختياري)</label>
                  <select [(ngModel)]="manualAcademic.section_id" name="manual_section" [disabled]="!manualAcademic.grade_id">
                    <option value="">{{ manualAvailableSections().length > 0 ? '-- اختر الفصل (اختياري) --' : (manualAcademic.grade_id ? '-- لا توجد فصول معرفة لهذا الصف --' : '-- اختر الصف أولاً --') }}</option>
                    @for (s of manualAvailableSections(); track s.id) {
                      <option [value]="s.id">{{ s.name }} (السعة: {{ s.capacity }})</option>
                    }
                  </select>
                </div>
              </div>

              <!-- قسم الأشقاء بالمدرسة -->
              <div class="inner-sub-card">
                <div class="sub-head">الأشقاء المسجلين في المدرسة</div>
                <div class="form-grid">
                  <div class="field full-width">
                    <label class="chk-label">
                      <input type="checkbox" [(ngModel)]="personalForm.has_siblings" name="has_siblings" />
                      <span>هل للتلميذ أشقاء مسجلين بمدارس المورد؟</span>
                    </label>
                  </div>
                  @if (personalForm.has_siblings) {
                    <div class="field">
                      <label>القسم</label>
                      <select [(ngModel)]="personalForm.siblings_section" name="siblings_section">
                        <option value="إبتدائي">إبتدائي</option>
                        <option value="متوسط">متوسط</option>
                        <option value="ثانوي">ثانوي</option>
                      </select>
                    </div>
                    <div class="field">
                      <label>عددهم</label>
                      <input type="number" min="1" max="10" [(ngModel)]="personalForm.siblings_count" name="siblings_count" />
                    </div>
                    <div class="field wide-2">
                      <label>تفاصيل الأشقاء (الاسم / الرقم الوطني / الصف)</label>
                      <input type="text" [(ngModel)]="personalForm.siblings_details" name="siblings_details" placeholder="مثال: خالد محمد (الصف الرابع)، سارة محمد (الصف الثاني)" />
                    </div>
                  }
                </div>
              </div>

              <div class="form-actions">
                <button type="button" class="nb-btn-secondary" (click)="cancel()">إلغاء</button>
                <button type="button" class="nb-btn-primary" (click)="goToNextStep(2)">
                  التالي: بيانات ولي الأمر والبديل ←
                </button>
              </div>
            </div>

            <!-- 2) بيانات ولي الأمر والشخص البديل للطوارئ -->
            <div class="step-content" *ngIf="manualStep() === 2" @fadeSlide>
              <div class="step-title-box">
                <span class="step-badge">الخطوة الثانية</span>
                <h3>بيانات ولي الأمر والشخص البديل للطوارئ</h3>
              </div>

              <div class="inner-sub-card">
                <div class="sub-head">بيانات ولي الأمر الرئيسي</div>
                <div class="form-grid">
                  <div class="field">
                    <label>صلة القرابة <span class="required-star">*</span></label>
                    <select [(ngModel)]="guardianForm.relationship" name="guardian_rel">
                      <option value="father">أب</option>
                      <option value="mother">أم</option>
                      <option value="guardian">ولي أمر</option>
                      <option value="sponsor">كفيل</option>
                    </select>
                  </div>
                  <div class="field wide-2">
                    <label>اسم ولي الأمر رباعياً <span class="required-star">*</span></label>
                    <input type="text" [(ngModel)]="guardianForm.full_name" name="guardian_name" required placeholder="اسم ولي الأمر كاملاً" />
                  </div>
                  <div class="field">
                    <label>الرقم الوطني لولي الأمر</label>
                    <input type="text" [(ngModel)]="guardianForm.national_id" name="guardian_nid" placeholder="الرقم الوطني لولي الأمر" />
                  </div>
                  <div class="field">
                    <label>رقم هاتف ولي الأمر (1) <span class="required-star">*</span></label>
                    <input type="tel" [(ngModel)]="guardianForm.phone" name="guardian_phone" required placeholder="09xxxxxxx" />
                  </div>
                  <div class="field">
                    <label>رقم هاتف ولي الأمر (2)</label>
                    <input type="tel" [(ngModel)]="guardianForm.phone2" name="guardian_phone2" placeholder="01xxxxxxx" />
                  </div>
                  <div class="field wide-2">
                    <label>رقم واتساب المتابعة المدرسية <span class="required-star">*</span></label>
                    <div class="phone-with-country">
                      <select [(ngModel)]="whatsappCountryCode" name="whatsapp_country_code" (change)="updateFullWhatsappNumber()" class="country-select">
                        @for (c of waCountries; track c.code) {
                          <option [value]="c.code">{{ c.name }} ({{ c.code }})</option>
                        }
                      </select>
                      <input type="text" [(ngModel)]="whatsappBody" name="whatsapp_body" (input)="updateFullWhatsappNumber()" [placeholder]="'مثال: ' + selectedWaCountry().sample" class="phone-body" dir="ltr" />
                    </div>
                    @if (whatsappError()) {
                      <span class="val-err">{{ whatsappError() }}</span>
                    } @else if (guardianForm.whatsapp_phone) {
                      <span class="val-ok">✓ الرقم الدولي المعتمد للواتساب: <b dir="ltr">{{ guardianForm.whatsapp_phone }}</b></span>
                    }
                  </div>
                  <div class="field">
                    <label>المهنة / الوظيفة</label>
                    <input type="text" [(ngModel)]="guardianForm.occupation" name="guardian_job" placeholder="المهنة أو الوظيفة" />
                  </div>
                  <div class="field wide-2">
                    <label>عنوان عمل ولي الأمر</label>
                    <input type="text" [(ngModel)]="guardianForm.work_address" name="guardian_work" placeholder="اسم الجهة أو عنوان العمل" />
                  </div>
                  <div class="field wide-2">
                    <label>السكن / المنطقة والحي</label>
                    <input type="text" [(ngModel)]="guardianForm.address" name="guardian_addr" placeholder="المنطقة - الحي - الشارع" />
                  </div>
                  <div class="field">
                    <label>رقم المنزل / العمارة</label>
                    <input type="text" [(ngModel)]="guardianForm.building_number" name="guardian_building" placeholder="رقم المنزل أو الشقة" />
                  </div>
                  <div class="field">
                    <label>البريد الإلكتروني</label>
                    <input type="email" [(ngModel)]="guardianForm.email" name="guardian_email" placeholder="example@domain.com" />
                  </div>
                  <div class="field wide-2">
                    <label>هاتف والدة التلميذ (أو من ينوب عنها)</label>
                    <input type="tel" [(ngModel)]="guardianForm.mother_phone" name="mother_phone" placeholder="هاتف الأم: 09xxxxxxx" />
                  </div>
                </div>
              </div>

              <!-- الشخص البديل للطوارئ -->
              <div class="inner-sub-card alert-card">
                <div class="sub-head warn-title">الشخص البديل في حالة الطوارئ وعدم الوصول لولي الأمر</div>
                <div class="form-grid">
                  <div class="field wide-2">
                    <label>اسم الشخص البديل</label>
                    <input type="text" [(ngModel)]="guardianForm.emergency_contact_name" name="em_name" placeholder="الاسم الكامل للشخص البديل" />
                  </div>
                  <div class="field">
                    <label>صلة القرابة</label>
                    <input type="text" [(ngModel)]="guardianForm.emergency_contact_relation" name="em_rel" placeholder="عم / خال / جد..." />
                  </div>
                  <div class="field">
                    <label>رقم هاتف البديل</label>
                    <input type="tel" [(ngModel)]="guardianForm.emergency_contact_phone" name="em_phone" placeholder="09xxxxxxx" />
                  </div>
                  <div class="field wide-2">
                    <label>عنوان البديل</label>
                    <input type="text" [(ngModel)]="guardianForm.emergency_contact_address" name="em_addr" placeholder="عنوان السكن للشخص البديل" />
                  </div>
                </div>
              </div>

              <div class="form-actions">
                <button type="button" class="nb-btn-secondary" (click)="manualStep.set(1)">→ السابق: البيانات الشخصية</button>
                <button type="button" class="nb-btn-primary" (click)="goToNextStep(3)">التالي: الملف الصحي والترحيل ←</button>
              </div>
            </div>

            <!-- 3) الملف الصحي والاجتماعي والترحيل -->
            <div class="step-content" *ngIf="manualStep() === 3" @fadeSlide>
              <div class="step-title-box">
                <span class="step-badge">الخطوة الثالثة</span>
                <h3>الملف الصحي والاجتماعي وخدمات الترحيل</h3>
              </div>

              <div class="inner-sub-card">
                <div class="sub-head">الملف الطبي والصحي للطالب (العيادة المدرسية)</div>
                <div class="form-grid">
                  <div class="field full-width">
                    <label>الحساسية (افصل بينها بفاصلة)</label>
                    <input type="text" [(ngModel)]="medicalForm.allergiesInput" name="allergies" placeholder="مثال: البنسلين، الفول السوداني" />
                  </div>
                  <div class="field full-width">
                    <label>الأمراض المزمنة (افصل بينها بفاصلة)</label>
                    <input type="text" [(ngModel)]="medicalForm.chronicDiseasesInput" name="chronic_diseases" placeholder="مثال: الربو، السكري" />
                  </div>
                  <div class="field full-width">
                    <label>الأدوية الموصوفة بانتظام</label>
                    <input type="text" [(ngModel)]="medicalForm.medicationInput" name="medication" placeholder="أدوية يحتاجها الطالب بانتظام" />
                  </div>
                  <div class="field">
                    <label>طبيب الأسرة المفضل</label>
                    <input type="text" [(ngModel)]="medicalForm.doctor" name="doctor" placeholder="اسم الطبيب أو المركز" />
                  </div>
                  <div class="field full-width">
                    <label>ملاحظات طبية أو توجيهات للعيادة</label>
                    <textarea [(ngModel)]="medicalForm.medical_notes" name="medical_notes" rows="2" placeholder="أي إرشادات خاصة بالطالب..."></textarea>
                  </div>
                </div>
              </div>

              <div class="inner-sub-card">
                <div class="sub-head">الحالة الاجتماعية ووسيلة الترحيل والاعتماد الأكاديمي</div>
                <div class="form-grid">
                  <div class="field">
                    <label>التلميذ يقيم مع</label>
                    <select [(ngModel)]="personalForm.resides_with" name="resides_with">
                      <option value="parents">الأم والأب</option>
                      <option value="father">الأب</option>
                      <option value="mother">الأم</option>
                      <option value="other">أخرى (أقارب / كفيل)</option>
                    </select>
                  </div>
                  <div class="field">
                    <label>وسيلة ترحيل التلميذ</label>
                    <select [(ngModel)]="personalForm.transport_mode" name="transport_mode">
                      <option value="school">ترحيل المدرسة الرسمي</option>
                      <option value="private">ترحيل خاص</option>
                      <option value="public">المواصلات العامة</option>
                      <option value="walking">الأقدام</option>
                    </select>
                  </div>
                  <div class="field">
                    <label>يعتمد التلميذ في المذاكرة على</label>
                    <select [(ngModel)]="personalForm.study_dependence" name="study_dependence">
                      <option value="self">نفسه</option>
                      <option value="other">غيره (مدرس / ولي الأمر / دروس خاصة)</option>
                    </select>
                  </div>
                  <div class="field full-width">
                    <label>المدرسة أو الروضة السابقة</label>
                    <input type="text" [(ngModel)]="personalForm.previous_school" name="previous_school" placeholder="اسم المدرسة أو الروضة السابقة إن وجد" />
                  </div>
                </div>
              </div>

              <div class="form-actions">
                <button type="button" class="nb-btn-secondary" (click)="manualStep.set(2)">→ السابق: ولي الأمر</button>
                <button type="button" class="nb-btn-primary" (click)="goToNextStep(4)">التالي: الرسوم والأقساط ←</button>
              </div>
            </div>

            <!-- 4) الرسوم والأقساط والسداد الفوري -->
            <div class="step-content" *ngIf="manualStep() === 4" @fadeSlide>
              <div class="step-title-box">
                <span class="step-badge">الخطوة الرابعة</span>
                <h3>الرسوم الدراسية وخطة الأقساط والسداد الفوري</h3>
              </div>

              <div class="finance-form-wrapper">
                <app-registration-finance-form (configChange)="financialConfig.set($event)"></app-registration-finance-form>
              </div>

              <div class="form-actions">
                <button type="button" class="nb-btn-secondary" (click)="manualStep.set(3)">→ السابق: الملف الصحي والترحيل</button>
                <button type="button" class="nb-btn-primary" (click)="goToNextStep(5)">التالي: مراجعة البيانات والاعتماد ←</button>
              </div>
            </div>

            <!-- 5) المراجعة الشاملة والاعتماد النهائي -->
            <div class="step-content" *ngIf="manualStep() === 5" @fadeSlide>
              <div class="step-title-box">
                <span class="step-badge">الخطوة الخامسة والأخيرة</span>
                <h3>مراجعة ملخص الملف والاعتماد النهائي</h3>
              </div>

              <div class="review-card">
                <div class="sub-head">ملخص بيانات الطالب قبل التسجيل الرسمي</div>
                <div class="rev-grid">
                  <div><span>اسم التلميذ:</span><b>{{ personalForm.arabic_name || '—' }}</b></div>
                  <div><span>الجنس والفرع:</span><b>{{ personalForm.gender === 'male' ? 'ذكر' : 'أنثى' }} · {{ selectedBranchName() }}</b></div>
                  <div><span>تاريخ الميلاد:</span><b>{{ personalForm.date_of_birth || '—' }}</b></div>
                  <div><span>الرقم الوطني:</span><b>{{ personalForm.national_id || '—' }}</b></div>
                  <div><span>الصف الدراسي:</span><b>{{ selectedGradeName() }}</b></div>
                  <div><span>الفصل الدراسي:</span><b>{{ selectedSectionName() }}</b></div>
                  <div><span>ولي الأمر:</span><b>{{ guardianForm.full_name || '—' }} ({{ relationshipLabel(guardianForm.relationship) }})</b></div>
                  <div><span>هاتف ولي الأمر:</span><b>{{ guardianForm.phone || '—' }}</b></div>
                  <div><span>واتساب المتابعة:</span><b dir="ltr">{{ guardianForm.whatsapp_phone || '—' }}</b></div>
                  <div><span>السكن والحي:</span><b>{{ guardianForm.address || '—' }} {{ guardianForm.building_number ? '(مبنى: ' + guardianForm.building_number + ')' : '' }}</b></div>
                  <div><span>البديل للطوارئ:</span><b>{{ guardianForm.emergency_contact_name || '—' }} {{ guardianForm.emergency_contact_phone ? '(' + guardianForm.emergency_contact_phone + ')' : '' }}</b></div>
                  <div><span>وسيلة الترحيل:</span><b>{{ transportLabel(personalForm.transport_mode) }}</b></div>
                </div>
              </div>

              <div class="form-actions">
                <button type="button" class="nb-btn-secondary" (click)="manualStep.set(4)">→ السابق: الرسوم والأقساط</button>
                <button type="button" class="nb-btn-primary btn-save-final" (click)="submitManualStudent()" [disabled]="submitting()">
                  {{ submitting() ? 'جارٍ حفظ واعتماد ملف الطالب…' : '✓ حفظ واعتماد تسجيل الطالب يدوياً' }}
                </button>
              </div>
            </div>
          </div>
        </nb-panel>
      </div>
    </div>
  `,
  styles: [
    `
      .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
      
      .mode-selector-bar {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        background: var(--nb-surface-raised);
        border: 1px solid var(--nb-border-soft);
        border-radius: var(--nb-radius-card);
        padding: 6px;
      }
      .mode-selector-bar button {
        flex: 1;
        height: 38px;
        background: transparent;
        border: none;
        border-radius: var(--nb-radius);
        font-family: var(--nb-font-family);
        font-size: 13.5px;
        font-weight: 600;
        color: var(--nb-text-secondary);
        cursor: pointer;
        transition: all 0.2s;
      }
      .mode-selector-bar button.active {
        background: var(--nb-surface);
        color: var(--nb-primary-600);
        box-shadow: 0 2px 6px rgba(0,0,0,0.05);
      }

      .registration-wizard-layout, .registration-manual-layout {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      .applicants-selection-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 14px;
        min-height: 100px;
      }
      
      .applicant-select-card {
        background: var(--nb-surface);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card);
        padding: 14px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        box-shadow: 0 1px 4px rgba(0,0,0,0.01);
      }
      .applicant-select-card:hover {
        border-color: var(--nb-primary-400);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.04);
      }
      .applicant-select-card.selected {
        border-color: var(--nb-primary-600);
        background: var(--nb-primary-50);
        box-shadow: 0 4px 12px rgba(0, 122, 255, 0.08);
      }
      .applicant-select-card.selected::after {
        content: '✓';
        position: absolute;
        top: 10px;
        left: 10px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--nb-primary-600);
        color: white;
        font-size: 10px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .app-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }
      .app-num {
        font-size: 11px;
        color: var(--nb-text-muted);
        font-family: monospace;
      }
      .badge {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: 600;
      }
      .badge.success {
        background: #e2f9e6;
        color: #1e7e34;
      }
      
      .app-name {
        margin: 4px 0 0;
        font-size: 13.5px;
        font-weight: 700;
        color: var(--nb-text);
      }
      .app-meta {
        display: flex;
        gap: 12px;
        font-size: 11.5px;
        color: var(--nb-text-secondary);
        border-top: 1px dashed var(--nb-border-soft);
        padding-top: 6px;
        margin-top: 4px;
      }
      
      .no-applicants-box {
        grid-column: 1 / -1;
        text-align: center;
        padding: 40px 20px;
        color: var(--nb-text-muted);
      }
      .no-applicants-box .icon {
        font-size: 36px;
        margin-bottom: 10px;
      }
      .no-applicants-box h4 {
        margin: 0 0 6px;
        font-size: 14px;
        font-weight: 700;
        color: var(--nb-text);
      }
      .no-applicants-box p {
        margin: 0;
        font-size: 12px;
      }

      /* تأكيد التسجيل بالتفصيل */
      .preview-layout {
        display: flex;
        gap: 24px;
        align-items: flex-start;
        margin-bottom: 20px;
      }
      
      .detail-avatar-container {
        flex-shrink: 0;
      }
      .detail-avatar {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        font-weight: 700;
        color: white;
      }
      .detail-avatar.male { background: linear-gradient(135deg, #007aff, #0056b3); }
      .detail-avatar.female { background: linear-gradient(135deg, #af52de, #7d26cd); }
      
      .details-grid {
        flex: 1;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px 20px;
      }
      .detail-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .field-label {
        font-size: 11.5px;
        color: var(--nb-text-muted);
      }
      .field-value {
        font-size: 13.5px;
        color: var(--nb-text);
      }
      .font-bold { font-weight: 700; }

      /* معالج التسجيل اليدوي بنظام الخطوات المعتمد */
      .manual-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .wizard-stepper-wrap {
        margin-bottom: 24px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--nb-border-soft);
      }
      .step-title-box {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid var(--nb-primary-50, #eff6ff);
      }
      .step-badge {
        background: var(--nb-primary-600);
        color: white;
        font-size: 11px;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 20px;
      }
      .step-title-box h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: var(--nb-text);
      }

      .inner-sub-card {
        background: var(--nb-surface-raised, #f8fafc);
        border: 1px solid var(--nb-border-soft, #e2e8f0);
        border-radius: var(--nb-radius-card, 12px);
        padding: 18px 20px;
        margin-top: 16px;
      }
      .inner-sub-card.alert-card {
        background: #fffbeb;
        border-color: #fde68a;
      }
      .sub-head {
        font-size: 13.5px;
        font-weight: 700;
        color: var(--nb-text);
        margin-bottom: 14px;
      }
      .sub-head.warn-title {
        color: #b45309;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }
      
      .field { display: flex; flex-direction: column; gap: 5px; }
      .field.wide-2 { grid-column: span 2; }
      @media (max-width: 640px) { .field.wide-2 { grid-column: 1 / -1; } }
      .field.full-width { grid-column: 1 / -1; }
      .field label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
      .field input, .field select, .field textarea {
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius);
        padding: 0 10px;
        font-family: var(--nb-font-family);
        font-size: 13px;
        color: var(--nb-text);
        background: var(--nb-surface);
        outline: none;
      }
      .field input, .field select { height: 36px; }
      .field textarea { padding: 10px; }
      .chk-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }
      .chk-label input {
        width: 17px;
        height: 17px;
        accent-color: var(--nb-primary-600);
        cursor: pointer;
      }

      /* رقم الواتساب مع ماسك الدولة الذكي */
      .phone-with-country {
        display: grid;
        grid-template-columns: 170px 1fr;
        gap: 8px;
        direction: ltr;
      }
      @media (max-width: 520px) { .phone-with-country { grid-template-columns: 1fr; } }
      .country-select {
        height: 36px;
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius);
        padding: 0 8px;
        font-size: 12.5px;
        font-weight: 700;
        background: var(--nb-surface);
        outline: none;
      }
      .phone-body {
        height: 36px;
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius);
        padding: 0 12px;
        font-size: 13px;
        outline: none;
        direction: ltr;
        text-align: left;
      }
      .val-err { font-size: 11px; color: #ef4444; font-weight: 600; margin-top: 3px; }
      .val-ok { font-size: 11px; color: #16a34a; font-weight: 600; margin-top: 3px; }

      /* بطاقة المراجعة النهائية */
      .review-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px;
      }
      .rev-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 10px;
      }
      .rev-grid > div {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .rev-grid span { font-size: 11px; color: #64748b; }
      .rev-grid b { font-size: 13px; color: #0f172a; }

      .btn-save-final {
        background: #16a34a !important;
        font-size: 14px !important;
        padding: 0 24px !important;
      }
      .btn-save-final:hover {
        background: #15803d !important;
      }
      
      .form-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        border-top: 1px solid var(--nb-border-soft);
        padding-top: 16px;
      }
      .nb-btn-primary, .nb-btn-secondary {
        height: 38px;
        padding: 0 16px;
        font-family: var(--nb-font-family);
        font-size: 13px;
        font-weight: 600;
        border-radius: var(--nb-radius);
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
      .nb-btn-secondary {
        background: var(--nb-surface-raised);
        border: 1px solid var(--nb-border);
        color: var(--nb-text);
      }
      .academic-distribution-card {
        background: var(--nb-surface-raised);
        border: 1px solid var(--nb-border-soft);
        border-radius: var(--nb-radius-card);
        padding: 16px;
        margin: 16px 0;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .distribution-header {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .dist-icon {
        font-size: 22px;
        background: var(--nb-surface);
        border: 1px solid var(--nb-border-soft);
        width: 42px;
        height: 42px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .dist-title {
        margin: 0 0 2px;
        font-size: 14px;
        font-weight: 700;
        color: var(--nb-text);
      }
      .dist-sub {
        margin: 0;
        font-size: 12px;
        color: var(--nb-text-muted);
      }
      .distribution-controls {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 14px;
        background: var(--nb-surface);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius);
        padding: 12px 16px;
      }
      .branch-badge-auto {
        height: 36px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 12px;
        background: rgba(16, 185, 129, 0.08);
        border: 1px solid rgba(16, 185, 129, 0.25);
        border-radius: var(--nb-radius);
        font-weight: 700;
        font-size: 13px;
        color: #065f46;
      }
      .auto-badge {
        font-size: 11px;
        background: #10b981;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 600;
        margin-right: auto;
      }
      .branch-pill-manual {
        height: 36px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 12px;
        background: var(--nb-surface-raised);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius);
        font-size: 13px;
        font-weight: 700;
        color: var(--nb-primary-700);
      }
      .branch-pill-manual .auto-tag {
        font-size: 10.5px;
        background: rgba(37, 99, 235, 0.1);
        color: var(--nb-primary-600);
        padding: 2px 7px;
        border-radius: 10px;
        margin-right: auto;
      }
      .field-separator {
        border-top: 1px dashed var(--nb-border);
        margin: 10px 0 5px;
        padding-top: 10px;
      }
      .sep-title {
        font-size: 12.5px;
        font-weight: 700;
        color: var(--nb-text-secondary);
      }
      .required-star {
        color: #ef4444;
        font-weight: 700;
        margin-inline-start: 2px;
      }
      .field-badge-value {
        height: 36px;
        display: flex;
        align-items: center;
        padding: 0 12px;
        background: var(--nb-surface-raised);
        border: 1px solid var(--nb-border-soft);
        border-radius: var(--nb-radius);
        font-weight: 600;
        font-size: 13px;
        color: var(--nb-primary-600);
      }
      .section-select-control {
        height: 36px;
        width: 100%;
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius);
        padding: 0 12px;
        font-family: var(--nb-font-family);
        font-size: 13px;
        color: var(--nb-text);
        background: var(--nb-surface);
        outline: none;
        cursor: pointer;
      }
      .section-select-control:focus {
        border-color: var(--nb-primary-500);
        box-shadow: 0 0 0 3px var(--nb-primary-100);
      }

      .nb-btn-secondary:hover {
        background: var(--nb-border-soft);
      }
    `
  ]
})
export class StudentCreateComponent implements OnInit {
  private studentsService = inject(StudentsService);
  private admissionsService = inject(AdmissionsService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  regMode = signal<'admission' | 'manual'>('admission');
  manualStep = signal<number>(1);
  readonly manualSteps = ['التلميذ والأكاديمية', 'ولي الأمر والبديل', 'الملف الصحي والترحيل', 'الرسوم والأقساط', 'المراجعة والاعتماد'];
  applicants = signal<any[]>([]);
  loadingApplicants = signal<boolean>(false);
  selectedApplicant = signal<any | null>(null);
  availableSections = signal<any[]>([]);
  selectedSectionId = signal<string>('');
  submitting = signal(false);
  errorMessage = signal('');
  financialConfig = signal<FinancialConfig | null>(null);

  // الفروع والتسكين الأكاديمي
  branches = signal<any[]>([]);
  selectedBranchId = signal<string>('');
  grades = signal<any[]>([]);

  // اسم الفرع المحدد تلقائياً بناءً على جنس الطالب
  selectedBranchName = computed(() => {
    const id = this.selectedBranchId();
    const branch = this.branches().find(b => b.id === id);
    if (branch) {
      return branch.name_ar || branch.name;
    }
    const gender = this.regMode() === 'admission' 
      ? (this.selectedApplicant()?.gender || 'male')
      : (this.personalForm.gender || 'male');
    return gender === 'male' ? 'فرع البنين' : 'فرع البنات';
  });

  // التسكين الأكاديمي للنموذج اليدوي
  manualAcademic = {
    grade_id: '',
    section_id: '',
  };
  manualAvailableSections = signal<any[]>([]);

  // حقول النموذج اليدوي - الخطوة 1 والاجتماعية
  personalForm = {
    arabic_name: '',
    english_name: '',
    gender: 'male',
    date_of_birth: '',
    birth_place: '',
    nationality: 'سوداني',
    national_id: '',
    passport: '',
    religion: 'مسلم',
    blood_group: '',
    has_siblings: false,
    siblings_section: 'إبتدائي',
    siblings_count: 1,
    siblings_details: '',
    resides_with: 'parents',
    transport_mode: 'school',
    study_dependence: 'self',
    previous_school: '',
  };

  // حقول ولي الأمر والشخص البديل للطوارئ - الخطوة 2
  guardianForm = {
    relationship: 'father',
    full_name: '',
    national_id: '',
    phone: '',
    phone2: '',
    whatsapp_phone: '',
    occupation: '',
    work_address: '',
    address: '',
    building_number: '',
    email: '',
    mother_phone: '',
    emergency_contact_name: '',
    emergency_contact_relation: 'عم',
    emergency_contact_phone: '',
    emergency_contact_address: '',
  };

  // الدول المدعومة لرقم الواتساب: [أدنى، أقصى] عدد خانات الرقم الوطني + مثال
  readonly waCountries = [
    { code: '+249', name: '🇸🇩 السودان', len: [9, 9], sample: '9XXXXXXXX' },
    { code: '+966', name: '🇸🇦 السعودية', len: [9, 9], sample: '5XXXXXXXX' },
    { code: '+20',  name: '🇪🇬 مصر', len: [10, 10], sample: '1XXXXXXXXX' },
    { code: '+971', name: '🇦🇪 الإمارات', len: [9, 9], sample: '5XXXXXXXX' },
    { code: '+974', name: '🇶🇦 قطر', len: [8, 8], sample: '3XXXXXXX' },
    { code: '+968', name: '🇴🇲 عُمان', len: [8, 8], sample: '9XXXXXXX' },
    { code: '+965', name: '🇰🇼 الكويت', len: [8, 8], sample: '5XXXXXXX' },
    { code: '+973', name: '🇧🇭 البحرين', len: [8, 8], sample: '3XXXXXXX' },
    { code: '+962', name: '🇯🇴 الأردن', len: [9, 9], sample: '7XXXXXXXX' },
    { code: '+90',  name: '🇹🇷 تركيا', len: [10, 10], sample: '5XXXXXXXXX' },
    { code: '+44',  name: '🇬🇧 المملكة المتحدة', len: [10, 10], sample: '7XXXXXXXXX' },
    { code: '+1',   name: '🇺🇸 أمريكا / كندا', len: [10, 10], sample: 'XXXXXXXXXX' },
  ];
  whatsappCountryCode = '+249';
  whatsappBody = '';
  readonly whatsappError = signal('');

  selectedWaCountry() {
    return this.waCountries.find((c) => c.code === this.whatsappCountryCode) || this.waCountries[0];
  }

  updateFullWhatsappNumber(): void {
    const country = this.selectedWaCountry();
    const [min, max] = country.len;

    let cleaned = (this.whatsappBody || '').replace(/\D/g, '');
    const codeDigits = country.code.replace(/\D/g, '');
    if (cleaned.startsWith(codeDigits)) cleaned = cleaned.slice(codeDigits.length);
    cleaned = cleaned.replace(/^0+/, '');
    if (cleaned.length > max) cleaned = cleaned.slice(0, max);
    if (cleaned !== this.whatsappBody) this.whatsappBody = cleaned;

    if (!cleaned) {
      this.guardianForm.whatsapp_phone = '';
      this.whatsappError.set('');
      return;
    }

    if (cleaned.length < min || cleaned.length > max) {
      const lenText = min === max ? `${min}` : `${min}–${max}`;
      this.whatsappError.set(`رقم ${country.name} يجب أن يكون ${lenText} خانة (مثال: ${country.sample}) بدون صفر البداية ولا رمز الدولة.`);
      this.guardianForm.whatsapp_phone = '';
      return;
    }

    this.whatsappError.set('');
    this.guardianForm.whatsapp_phone = `${this.whatsappCountryCode}${cleaned}`;
  }

  // الخطوة 3: الملف الصحي
  medicalForm = {
    allergiesInput: '',
    chronicDiseasesInput: '',
    medicationInput: '',
    doctor: '',
    medical_notes: '',
  };

  selectedGradeName(): string {
    const g = this.grades().find(gr => gr.id === this.manualAcademic.grade_id);
    return g ? g.name : '—';
  }

  selectedSectionName(): string {
    const s = this.manualAvailableSections().find(sec => sec.id === this.manualAcademic.section_id);
    return s ? s.name : 'غير محدد (اختياري)';
  }

  relationshipLabel(rel: string): string {
    const map: Record<string, string> = {
      father: 'أب',
      mother: 'أم',
      guardian: 'ولي أمر',
      sponsor: 'كفيل',
      sibling: 'شقيق'
    };
    return map[rel] || rel || 'ولي أمر';
  }

  transportLabel(mode: string): string {
    const map: Record<string, string> = {
      school: 'ترحيل المدرسة الرسمي',
      private: 'ترحيل خاص',
      public: 'المواصلات العامة',
      walking: 'الأقدام'
    };
    return map[mode] || mode || '—';
  }

  ngOnInit() {
    this.loadBranches();
    this.loadAcceptedApplicants();
    this.loadGrades();
  }

  loadBranches() {
    this.studentsService.getBranches().subscribe({
      next: (res) => {
        const list = res?.data?.results || res?.data || res || [];
        this.branches.set(Array.isArray(list) ? list : []);
        const currentGender = this.selectedApplicant()?.gender || this.personalForm.gender || 'male';
        this.autoSelectBranch(currentGender);
      },
      error: () => {}
    });
  }

  loadGrades() {
    this.admissionsService.getGrades().subscribe({
      next: (res) => {
        const list = res?.data?.results || res?.data || res || [];
        this.grades.set(Array.isArray(list) ? list : []);
      },
      error: () => {}
    });
  }

  /**
   * التحديد التلقائي لفرع البنين للذكور وفرع البنات للإناث
   */
  autoSelectBranch(gender: string) {
    const list = this.branches();
    if (!list || list.length === 0) return;
    const isMale = gender === 'male';
    const targetType = isMale ? 'boys' : 'girls';
    const targetCode = isMale ? 'BR-BOYS' : 'BR-GIRLS';
    const targetWord = isMale ? 'بنين' : 'بنات';

    const matched = list.find((b: any) => 
      b.school_gender_type === targetType ||
      (b.code && b.code.toUpperCase().includes(targetCode)) ||
      (b.name_ar && b.name_ar.includes(targetWord)) ||
      (b.name && b.name.includes(targetWord))
    ) || list[0];

    if (matched) {
      this.selectedBranchId.set(matched.id);
    }
  }

  onGenderChange(newGender: string) {
    this.personalForm.gender = newGender;
    this.autoSelectBranch(newGender);
  }

  onManualGradeChange(gradeId: string) {
    this.manualAcademic.grade_id = gradeId;
    this.manualAcademic.section_id = '';
    if (!gradeId) {
      this.manualAvailableSections.set([]);
      return;
    }
    this.admissionsService.getSections(gradeId).subscribe({
      next: (res) => {
        let secs = res?.data?.results || res?.data || res || [];
        if (Array.isArray(secs)) {
          secs = secs.filter((s: any) => s.grade === gradeId || s.grade_id === gradeId || s.grade?.id === gradeId);
        }
        this.manualAvailableSections.set(secs as any[]);
      }
    });
  }

  loadAcceptedApplicants() {
    this.loadingApplicants.set(true);
    this.admissionsService.getApplicants({ status: 'accepted', page_size: 100 }).subscribe({
      next: (res) => {
        this.loadingApplicants.set(false);
        if (res && res.success) {
          const data = res.data?.results || res.data || [];
          this.applicants.set((data as any[]).filter(a => a.status === 'accepted'));
        }
      },
      error: () => this.loadingApplicants.set(false)
    });
  }

  setMode(mode: 'admission' | 'manual') {
    this.regMode.set(mode);
    this.selectedApplicant.set(null);
    this.selectedSectionId.set('');
    this.availableSections.set([]);
    this.manualStep.set(1);
    if (mode === 'manual') {
      this.autoSelectBranch(this.personalForm.gender || 'male');
    }
  }

  goToNextStep(step: number) {
    if (step === 2) {
      if (!this.personalForm.arabic_name?.trim() || !this.personalForm.date_of_birth) {
        this.snack.open('يرجى ملء الحقول الإلزامية: الاسم بالعربي وتاريخ الميلاد', 'إغلاق', { duration: 4000 });
        return;
      }
      if (!this.manualAcademic.grade_id) {
        this.snack.open('يرجى اختيار الصف الدراسي أولاً (حقل إجباري)', 'إغلاق', { duration: 4000 });
        return;
      }
    }
    if (step === 3) {
      if (!this.guardianForm.full_name?.trim() || !this.guardianForm.phone?.trim()) {
        this.snack.open('يرجى ملء اسم ولي الأمر ورقم هاتفه (حقول إلزامية)', 'إغلاق', { duration: 4000 });
        return;
      }
      if (this.whatsappError()) {
        this.snack.open('يرجى تصحيح رقم الواتساب قبل المتابعة', 'إغلاق', { duration: 4000 });
        return;
      }
    }
    this.manualStep.set(step);
  }

  getInitials(name?: string): string {
    if (!name) return 'ط';
    const clean = name.trim().split(/\s+/);
    if (clean.length > 1) {
      return `${clean[0].charAt(0)} ${clean[1].charAt(0)}`;
    }
    return clean[0].substring(0, 2);
  }

  onApplicantSelected(id: string) {
    const applicant = this.applicants().find(a => a.id === id);
    this.selectedApplicant.set(applicant || null);
    if (applicant) {
      this.autoSelectBranch(applicant.gender || 'male');
      this.selectedSectionId.set(applicant.applying_section_id || '');
      const gradeId = applicant.applying_grade_id || applicant.grade_id;
      this.admissionsService.getSections(gradeId).subscribe({
        next: (res) => {
          let secs = res?.data?.results || res?.data || res || [];
          if (Array.isArray(secs) && gradeId) {
            secs = secs.filter((s: any) => s.grade === gradeId || s.grade_id === gradeId || s.grade?.id === gradeId);
          }
          this.availableSections.set(secs as any[]);
        }
      });
    } else {
      this.availableSections.set([]);
      this.selectedSectionId.set('');
    }
  }

  registerStudent() {
    const applicant = this.selectedApplicant();
    if (!applicant) return;

    const gradeId = applicant.applying_grade_id || applicant.grade_id;
    if (!gradeId) {
      this.snack.open('طلب القبول لا يحتوي على صف دراسي، يجب تحديد الصف أولاً لتسجيل الطالب.', 'إغلاق', { duration: 5000 });
      return;
    }

    this.submitting.set(true);
    const config = {
      ...(this.financialConfig() || {}),
      branch_id: this.selectedBranchId() || null,
      section_id: this.selectedSectionId() || null
    };

    this.studentsService.createStudentFromApplicant(applicant.id, config as any).subscribe({
      next: (res) => {
        this.submitting.set(false);
        const studentId = res?.data?.id || res?.id;
        if (studentId) {
          this.snack.open('تم تسجيل الطالب وتسكينه في الفرع والفصل بنجاح!', 'إغلاق', { duration: 5000 });
          this.router.navigate(['/students/details', studentId]);
        } else {
          this.snack.open('تم تسجيل الطالب بنجاح.', 'إغلاق', { duration: 4000 });
          this.router.navigate(['/students/list']);
        }
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err?.error?.error?.message || err?.error?.message || err?.error?.detail || 'تعذّر تسجيل الطالب. تحقق من أن الطالب ليس مسجلاً مسبقاً.';
        this.snack.open(msg, 'إغلاق', { duration: 6000 });
      }
    });
  }

  submitManualStudent(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    if (!this.personalForm.arabic_name?.trim() || !this.personalForm.date_of_birth) {
      this.errorMessage.set('يرجى ملء الحقول المطلوبة (الاسم بالعربي وتاريخ الميلاد)');
      this.snack.open('يرجى ملء الحقول المطلوبة (الاسم بالعربي وتاريخ الميلاد)', 'إغلاق', { duration: 4000 });
      this.manualStep.set(1);
      return;
    }

    if (!this.manualAcademic.grade_id) {
      this.errorMessage.set('اختيار الصف الدراسي إجباري لتسجيل وتسكين الطالب في النظام.');
      this.snack.open('يرجى اختيار الصف الدراسي أولاً (حقل إجباري لتسجيل الطالب)', 'إغلاق', { duration: 5000 });
      this.manualStep.set(1);
      return;
    }

    this.submitting.set(true);

    const allergies = this.medicalForm.allergiesInput
      ? this.medicalForm.allergiesInput.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const chronic_diseases = this.medicalForm.chronicDiseasesInput
      ? this.medicalForm.chronicDiseasesInput.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const medication = this.medicalForm.medicationInput
      ? this.medicalForm.medicationInput.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const payload = {
      profile: {
        arabic_name: this.personalForm.arabic_name,
        english_name: this.personalForm.english_name || '',
        gender: this.personalForm.gender || 'male',
        date_of_birth: this.personalForm.date_of_birth,
        nationality: this.personalForm.nationality || 'سوداني',
        national_id: this.personalForm.national_id || '',
        passport: this.personalForm.passport || '',
        religion: this.personalForm.religion || 'مسلم',
        blood_group: this.personalForm.blood_group || '',
        notes: [
          this.personalForm.birth_place ? `مكان الميلاد: ${this.personalForm.birth_place}` : '',
          this.personalForm.resides_with ? `يقيم مع: ${this.personalForm.resides_with}` : '',
          this.personalForm.transport_mode ? `وسيلة الترحيل: ${this.transportLabel(this.personalForm.transport_mode)}` : '',
          this.personalForm.study_dependence ? `المذاكرة: ${this.personalForm.study_dependence}` : '',
          this.personalForm.previous_school ? `المدرسة السابقة: ${this.personalForm.previous_school}` : '',
          this.personalForm.has_siblings ? `الأشقاء بالمدرسة: ${this.personalForm.siblings_count} (${this.personalForm.siblings_section}) - ${this.personalForm.siblings_details}` : ''
        ].filter(Boolean).join(' | '),
        languages: ['العربية']
      },
      guardian: {
        relationship: this.guardianForm.relationship || 'guardian',
        full_name: this.guardianForm.full_name || '',
        national_id: this.guardianForm.national_id || '',
        phone: this.guardianForm.phone || '',
        phone2: this.guardianForm.phone2 || '',
        whatsapp_phone: this.guardianForm.whatsapp_phone || this.guardianForm.phone || '',
        occupation: this.guardianForm.occupation || '',
        work_address: this.guardianForm.work_address || '',
        email: this.guardianForm.email || '',
        mother_phone: this.guardianForm.mother_phone || '',
      },
      emergency_contact: {
        name: this.guardianForm.emergency_contact_name || '',
        relationship: this.guardianForm.emergency_contact_relation || 'عم',
        phone: this.guardianForm.emergency_contact_phone || '',
        address: this.guardianForm.emergency_contact_address || ''
      },
      address: {
        address_line1: this.guardianForm.address || 'السكن والحي',
        building_number: this.guardianForm.building_number || '',
        city: 'الخرطوم',
        country: 'السودان'
      },
      medical_profile: {
        allergies,
        chronic_diseases,
        medication,
        doctor: this.medicalForm.doctor,
        medical_notes: this.medicalForm.medical_notes
      },
      academic_data: {
        branch_id: this.selectedBranchId() || null,
        grade_id: this.manualAcademic.grade_id || null,
        section_id: this.manualAcademic.section_id || null
      },
      financial_config: {
        ...(this.financialConfig() || {}),
        branch_id: this.selectedBranchId() || null
      }
    };

    this.studentsService.createStudent(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        const studentId = res?.data?.id || res?.id;
        if (studentId) {
          this.snack.open('تم حفظ وتسجيل الطالب يدوياً وتسكينه في الفرع بنجاح!', 'إغلاق', { duration: 5000 });
          this.router.navigate(['/students/details', studentId]);
        } else {
          this.snack.open('تم حفظ الطالب بنجاح.', 'إغلاق', { duration: 4000 });
          this.router.navigate(['/students/list']);
        }
      },
      error: (err) => {
        this.submitting.set(false);
        let msg = err?.error?.error?.message || err?.error?.message || err?.error?.detail;
        if (!msg && err?.error && typeof err.error === 'object') {
          const firstKey = Object.keys(err.error)[0];
          if (firstKey) {
            const val = err.error[firstKey];
            msg = Array.isArray(val) ? `${firstKey}: ${val.join(' ')}` : `${firstKey}: ${val}`;
          }
        }
        this.snack.open(msg || 'تعذّر حفظ الطالب. تحقق من صحة الحقول.', 'إغلاق', { duration: 6000 });
      }
    });
  }

  cancelSelection() {
    this.selectedApplicant.set(null);
  }

  cancel() {
    this.router.navigate(['/students/list']);
  }
}