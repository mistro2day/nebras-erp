import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { trigger, transition, style, animate } from '@angular/animations';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NotificationService } from '../../../core/services/notification.service';
import { environment } from '../../../../environments/environment';

interface ReferenceInput {
  ref_name: string;
  ref_phone: string;
}

interface DependentInput {
  full_name: string;
  academic_stage: string;
  grade_level: string;
  discount_percentage: number;
  notes: string;
}

interface PriorExpInput {
  school_name: string;
  time_period: string;
}

@Component({
  selector: 'app-employee-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NbPageHeaderComponent,
    NbPanelComponent
  ],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="استمارة توظيف وعقد معلم 2026م" subtitle="إدخال واستكمال بيانات المعلم والموظف كاملة وفق عقد 2026م واللائحة التنظيمية والمالية والأكاديمية المرفقة.">
        <button class="nb-btn-secondary" (click)="cancel()">رجوع للوحة الموارد البشرية</button>
      </nb-page-header>

      <!-- مؤشر الخطوات العصري المكون من 6 مراحل -->
      <div class="stepper-wrapper">
        <div class="stepper-bar">
          <div 
            class="step-item" 
            *ngFor="let stepName of steps; let i = index"
            [class.active]="currentStep() === i + 1"
            [class.completed]="currentStep() > i + 1"
          >
            <div class="step-badge">
              <span *ngIf="currentStep() <= i + 1">{{ i + 1 }}</span>
              <span *ngIf="currentStep() > i + 1">✓</span>
            </div>
            <span class="step-label">{{ stepName }}</span>
          </div>
        </div>
      </div>

      <form (submit)="onSubmit($event)" class="wizard-form">

        <!-- الخطوة 1: البيانات الشخصية والعنوان السكني -->
        @if (currentStep() === 1) {
          <div class="step-content" @fadeSlide>
            <nb-panel title="الخطوة الأولى: البيانات الشخصية والسكنية" subtitle="أدخل اسم المعلم رباعياً، الرقم الوطني، وتفاصيل السكن">
              <div class="form-grid">
                <div class="field req">
                  <label>الاسم رباعياً بالعربية</label>
                  <input type="text" [(ngModel)]="form.full_name_ar" name="full_name_ar" required placeholder="مثال: أحمد عبد الله علي الهادي" />
                </div>
                <div class="field">
                  <label>اللقب العلمي / الإداري</label>
                  <input type="text" [(ngModel)]="form.title_surname" name="title_surname" placeholder="مثال: أستاذ / دكتور" />
                </div>
                <div class="field req">
                  <label>الجنس</label>
                  <select [(ngModel)]="form.gender" name="gender" required>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <div class="field">
                  <label>الرقم الوطني / الهوية</label>
                  <input type="text" [(ngModel)]="form.national_id" name="national_id" placeholder="112000XXXXXX" />
                </div>
                <div class="field">
                  <label>الحالة الاجتماعية</label>
                  <select [(ngModel)]="form.marital_status" name="marital_status">
                    <option value="single">أعزب / عزباء</option>
                    <option value="married">متزوج / متزوجة</option>
                    <option value="other">غير ذلك</option>
                  </select>
                </div>
                <div class="field">
                  <label>عدد الأبناء</label>
                  <input type="number" [(ngModel)]="form.children_count" name="children_count" min="0" />
                </div>
                <div class="field req">
                  <label>المدينة / الولاية</label>
                  <input type="text" [(ngModel)]="form.city" name="city" required placeholder="الخرطوم، أم درمان، بحري" />
                </div>
                <div class="field req">
                  <label>الحي السكني</label>
                  <input type="text" [(ngModel)]="form.neighborhood" name="neighborhood" required placeholder="اسم الحي" />
                </div>
                <div class="field">
                  <label>رقم المربع</label>
                  <input type="text" [(ngModel)]="form.square_number" name="square_number" placeholder="مربع 5" />
                </div>
                <div class="field">
                  <label>رقم المنزل</label>
                  <input type="text" [(ngModel)]="form.house_number" name="house_number" placeholder="منزل 12" />
                </div>
                <div class="field full-width">
                  <label>اسم أقرب معلم بارز صديق أو قريب بالمدرسة</label>
                  <input type="text" [(ngModel)]="form.prominent_teacher_friend" name="prominent_teacher_friend" placeholder="معلم معروف بالمنظومة للتعرف" />
                </div>
              </div>
            </nb-panel>
          </div>
        }

        <!-- الخطوة 2: الاتصال والواتساب الدولي والمعرفين -->
        @if (currentStep() === 2) {
          <div class="step-content" @fadeSlide>
            <nb-panel title="الخطوة الثانية: وسائل الاتصال والواتساب والجاهزية" subtitle="تقييد أرقام الهواتف والواتساب الدولي والمعرفين من الكادر">
              <div class="form-grid">
                <div class="field req">
                  <label>رقم الهاتف الرئيسي (1)</label>
                  <input type="tel" [(ngModel)]="form.phone_1" name="phone_1" required placeholder="09XXXXXXX" />
                </div>
                
                <!-- حقل الواتساب المطور مع تقييد المفتاح الدولي E.164 -->
                <div class="field req full-width">
                  <label>رقم الواتساب الدولي المعتمد <span class="lbl-sub">(E.164 لإرسال الرسائل الفورية)</span></label>
                  <div class="phone-with-country">
                    <select class="country-select" [(ngModel)]="whatsappCountryCode" name="wa_country" (change)="onWhatsappCountryChange()">
                      <option *ngFor="let c of waCountries" [value]="c.code">{{ c.name }} ({{ c.code }})</option>
                    </select>
                    <input 
                      type="tel" 
                      class="phone-body" 
                      [(ngModel)]="whatsappBody" 
                      name="wa_body" 
                      (input)="updateFullWhatsappNumber()"
                      [placeholder]="selectedWaCountry().sample"
                    />
                  </div>
                  @if (whatsappError()) {
                    <div class="val-err">⚠️ {{ whatsappError() }}</div>
                  } @else if (form.whatsapp_number) {
                    <div class="val-ok">✓ رقم الواتساب الدولي المعتمد: <b>{{ form.whatsapp_number }}</b></div>
                  }
                </div>

                <div class="field">
                  <label>رقم هاتف ثانٍ (2)</label>
                  <input type="tel" [(ngModel)]="form.phone_2" name="phone_2" placeholder="01XXXXXXX" />
                </div>
                <div class="field">
                  <label>رقم هاتف الطوارئ</label>
                  <input type="tel" [(ngModel)]="form.emergency_phone_other" name="emergency_phone_other" placeholder="09XXXXXXX" />
                </div>
                <div class="field">
                  <label>صلة قرابة رقم الطوارئ</label>
                  <input type="text" [(ngModel)]="form.emergency_kinship" name="emergency_kinship" placeholder="أخ، شقيق، زوجة" />
                </div>
              </div>

              <!-- المعرفون والمراجع من معلمي المنظومة -->
              <div class="sub-section">
                <h4>👥 المعرفون والمراجع من معالم المنظومة:</h4>
                <div class="dynamic-rows" *ngFor="let ref of references(); let idx = index">
                  <div class="row-inputs">
                    <input type="text" [(ngModel)]="ref.ref_name" [name]="'ref_name_' + idx" placeholder="اسم المعلم المرجع" />
                    <input type="text" [(ngModel)]="ref.ref_phone" [name]="'ref_phone_' + idx" placeholder="رقم الهاتف" />
                    <button type="button" class="btn-remove" (click)="removeReference(idx)">✕</button>
                  </div>
                </div>
                <button type="button" class="btn-add" (click)="addReference()">+ إضافة معلم مرجع</button>
              </div>
            </nb-panel>
          </div>
        }

        <!-- الخطوة 3: المؤهل الأساسي والتكليف الأكاديمي -->
        @if (currentStep() === 3) {
          <div class="step-content" @fadeSlide>
            <nb-panel title="الخطوة الثالثة: المؤهل والتكليف الأكاديمي والأنصبة" subtitle="تفاصيل المؤهل العلمي والمواد الثلاث والتكليفات.">
              <div class="form-grid align-top">
                <div class="field req">
                  <label>الجامعة / المعهد</label>
                  <input type="text" [(ngModel)]="form.university_institute" name="university_institute" required placeholder="جامعة الخرطوم، السودان" />
                </div>
                <div class="field req">
                  <label>الكلية</label>
                  <input type="text" [(ngModel)]="form.faculty" name="faculty" required placeholder="كلية الآداب، العلوم، التربية" />
                </div>
                <div class="field req">
                  <label>التخصص الدقيق</label>
                  <input type="text" [(ngModel)]="form.specialization" name="specialization" required placeholder="اللغة العربية، الرياضيات، الفيزياء" />
                </div>
                <div class="field req">
                  <label>المادة الأولى التي يتم تدريسها (1)</label>
                  <input type="text" [(ngModel)]="form.teaching_subject_1" name="teaching_subject_1" required placeholder="المادة الأساسية" />
                </div>
                <div class="field">
                  <label>المادة الثانية (2)</label>
                  <input type="text" [(ngModel)]="form.teaching_subject_2" name="teaching_subject_2" placeholder="مادة فرعية إن وجدت" />
                </div>
                <div class="field">
                  <label>المادة الثالثة (3)</label>
                  <input type="text" [(ngModel)]="form.teaching_subject_3" name="teaching_subject_3" placeholder="مادة إضافة" />
                </div>
                <div class="field">
                  <label>نصاب الحصص الأسبوعي (جدول الإسناد)</label>
                  <input type="number" [(ngModel)]="form.weekly_lesson_quota" name="weekly_lesson_quota" />
                  <span class="hint">النصاب الرسمي المعتمد 23 حصة أسبوعياً</span>
                </div>
                <div class="field">
                  <label>الإعفاء من النوبتجية (Duty)</label>
                  <select [(ngModel)]="form.duty_exempt" name="duty_exempt">
                    <option [ngValue]="true">نعم - معفى من النوبتجية بعد 23 حصة</option>
                    <option [ngValue]="false">لا - غير معفى</option>
                  </select>
                  <span class="hint">وفق لائحة 2026م</span>
                </div>
                <div class="field full-width">
                  <label>أي مهام أخرى أو أنشطة أكاديمية وإشرافية</label>
                  <textarea [(ngModel)]="form.other_tasks_activities" name="other_tasks_activities" rows="2" placeholder="رئيس شعبة، مشرف طابور صباحي، أنشطة ثقافية"></textarea>
                </div>
              </div>
            </nb-panel>
          </div>
        }

        <!-- الخطوة 4: أبناء المعلم بالمورد ورعايتهم مالياً -->
        @if (currentStep() === 4) {
          <div class="step-content" @fadeSlide>
            <nb-panel title="الخطوة الرابعة: تسجيل أبناء المعلم وتخفيض الرسوم" subtitle="إدخال الأبناء بالمدرسة واحتساب نسب التخفيض المالية التلقائية.">
              
              <div class="info-alert">
                <b>💡 لائحة خصم الرسوم لأبناء العاملين:</b>
                تلميذ واحد = خصم 50% | تلميذان = خصم 30% لكل منهما | 3 تلاميذ = خصم 25% | 4 تلاميذ = إعفاء 1 وتخفيض 20% | 5 تلاميذ = إعفاء 2 تلاميذ.
              </div>

              <div class="dependents-list">
                <div class="dep-card" *ngFor="let dep of dependents(); let idx = index">
                  <div class="card-head">
                    <span>طفل / تلميذ رقم {{ idx + 1 }}</span>
                    <button type="button" class="btn-del" (click)="removeDependent(idx)">حذف</button>
                  </div>
                  <div class="form-grid">
                    <div class="field req">
                      <label>اسم التلميذ رباعياً</label>
                      <input type="text" [(ngModel)]="dep.full_name" [name]="'dep_name_' + idx" placeholder="الاسم كامل" />
                    </div>
                    <div class="field req">
                      <label>المرحلة الدراسية</label>
                      <select [(ngModel)]="dep.academic_stage" [name]="'dep_stage_' + idx">
                        <option value="المرحلة الابتدائية">المرحلة الابتدائية</option>
                        <option value="المرحلة المتوسطة">المرحلة المتوسطة</option>
                        <option value="المرحلة الثانوية">المرحلة الثانوية</option>
                      </select>
                    </div>
                    <div class="field req">
                      <label>الصف الدراسي</label>
                      <input type="text" [(ngModel)]="dep.grade_level" [name]="'dep_grade_' + idx" placeholder="الصف الرابع، الثاني" />
                    </div>
                    <div class="field">
                      <label>نسبة الخصم المستحقة %</label>
                      <input type="number" [(ngModel)]="dep.discount_percentage" [name]="'dep_disc_' + idx" />
                    </div>
                  </div>
                </div>
              </div>
              <button type="button" class="btn-add-dep" (click)="addDependent()">+ إضافة ابن/ابنة بالمدرسة</button>
            </nb-panel>
          </div>
        }

        <!-- الخطوة 5: الخبرات السابقة والتكليف -->
        @if (currentStep() === 5) {
          <div class="step-content" @fadeSlide>
            <nb-panel title="الخطوة الخامسة: الخبرات المدرسية السابقة" subtitle="سجل آخر المدارس والمؤسسات التي عمل بها الموظف.">
              <div class="experiences-list">
                <div class="exp-card" *ngFor="let exp of priorExperiences(); let idx = index">
                  <div class="form-grid">
                    <div class="field req">
                      <label>اسم المدرسة / المؤسسة السابقة</label>
                      <input type="text" [(ngModel)]="exp.school_name" [name]="'exp_school_' + idx" placeholder="اسم المدرسة السابقة" />
                    </div>
                    <div class="field req">
                      <label>الفترة الزمنية والتاريخ</label>
                      <input type="text" [(ngModel)]="exp.time_period" [name]="'exp_time_' + idx" placeholder="مثال: 2018 - 2021" />
                    </div>
                  </div>
                  <button type="button" class="btn-del-exp" (click)="removeExperience(idx)">إزالة الخبرة</button>
                </div>
              </div>
              <button type="button" class="btn-add" (click)="addExperience()">+ إضافة خبرة مدرسية سابقة</button>
            </nb-panel>
          </div>
        }

        <!-- الخطوة 6: العقد والمالية والاعتمادات الرسمية -->
        @if (currentStep() === 6) {
          <div class="step-content" @fadeSlide>
            <nb-panel title="الخطوة السادسة: الهيكل المالي والاعتمادات الرسمية" subtitle="تفكيك الراتب الشهري والإقرار باللائحة العامة لعقد 2026م.">
              
              <div class="form-grid">
                <div class="field req">
                  <label>الراتب الأساسي (ج.س)</label>
                  <input type="number" [(ngModel)]="form.basic_salary" name="basic_salary" (input)="recalculateSalary()" />
                </div>
                <div class="field">
                  <label>بدل ترحيل (ج.س)</label>
                  <input type="number" [(ngModel)]="form.transport_allowance" name="transport_allowance" (input)="recalculateSalary()" />
                </div>
                <div class="field">
                  <label>بدل اتصال وانترنت (ج.س)</label>
                  <input type="number" [(ngModel)]="form.communication_allowance" name="communication_allowance" (input)="recalculateSalary()" />
                </div>
                <div class="field">
                  <label>بدل تمثيل (ج.س)</label>
                  <input type="number" [(ngModel)]="form.representation_allowance" name="representation_allowance" (input)="recalculateSalary()" />
                </div>
                <div class="field">
                  <label>الخصومات الإدارية والمالية (ج.س)</label>
                  <input type="number" [(ngModel)]="form.deductions" name="deductions" (input)="recalculateSalary()" />
                </div>
                <div class="field net-box">
                  <label>المستحق صرفه صافياً (ج.س)</label>
                  <input type="number" [(ngModel)]="form.net_payable" name="net_payable" readonly />
                </div>
              </div>

              <div class="bylaw-agreement">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="form.agreed_to_bylaws" name="agreed_to_bylaws" required />
                  <span><b>أقر أنا والمعلم بتعهد واطلاع تام على كافة بنود لائحة العمل العامة بالمدرسة (31 بنداً) والالتزام التام بها.</b></span>
                </label>
              </div>

            </nb-panel>
          </div>
        }

        <!-- أزرار المعالج والإجراءات -->
        <div class="wizard-actions">
          <button type="button" class="nb-btn-secondary" (click)="prevStep()" [disabled]="currentStep() === 1">
            السابق
          </button>
          
          @if (currentStep() < 6) {
            <button type="button" class="nb-btn-primary" (click)="nextStep()">
              التالي ←
            </button>
          } @else {
            <button type="submit" class="nb-btn-success" [disabled]="saving() || whatsappError() !== ''">
              {{ saving() ? 'جارٍ حفظ واستخراج العقد…' : 'حفظ واستخراج عقد معلم 2026م الرسمي' }}
            </button>
          }
        </div>

      </form>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 1200px; margin: 0 auto; font-family: var(--nb-font-family); }
    .stepper-wrapper { margin-bottom: 24px; }
    .stepper-bar { display: flex; justify-content: space-between; position: relative; background: #fff; padding: 16px 24px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .step-item { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; position: relative; opacity: 0.5; }
    .step-item.active, .step-item.completed { opacity: 1; }
    .step-badge { width: 32px; height: 32px; border-radius: 50%; background: #e2e8f0; color: #475569; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
    .step-item.active .step-badge { background: #2563eb; color: #fff; }
    .step-item.completed .step-badge { background: #16a34a; color: #fff; }
    .step-label { font-size: 12px; font-weight: 600; color: #1e293b; text-align: center; }

    .wizard-form { display: flex; flex-direction: column; gap: 24px; }
    
    .form-grid {
      display: grid; grid-template-columns: repeat(2, 1fr);
      gap: 18px 20px; margin-top: 12px; align-items: start;
    }
    @media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
    
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 0.9rem; font-weight: 700; color: #334155; }
    .field.req label::after { content: ' *'; color: #ef4444; }
    .lbl-sub { font-size: 11px; font-weight: 500; color: #64748b; }
    
    .field input, .field select, .field textarea {
      padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px;
      font-size: 0.95rem; outline: none; transition: border-color 0.2s; box-sizing: border-box; width: 100%;
      height: 42px; background: #fff;
    }
    .field textarea { height: auto; }
    .field input:focus, .field select:focus, .field textarea:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
    .field.full-width { grid-column: 1 / -1; }
    .hint { font-size: 0.8rem; color: #64748b; margin-top: 2px; }
    
    /* أنماط حقل الواتساب المطور مع مفتاح الدولة */
    .phone-with-country { display: grid; grid-template-columns: 180px 1fr; gap: 8px; direction: ltr; margin-top: 4px; }
    @media (max-width: 520px) { .phone-with-country { grid-template-columns: 1fr; } }
    .country-select { height: 42px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 8px; font-size: 13.5px; font-weight: 700; font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", system-ui, sans-serif; background: #f8fafc; color: #0f172a; outline: none; }
    .phone-body { height: 42px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 12px; font-size: 13.5px; color: #0f172a; outline: none; direction: ltr; text-align: left; }
    .val-err { font-size: 11.5px; color: #ef4444; font-weight: 600; margin-top: 3px; }
    .val-ok { font-size: 11.5px; color: #16a34a; font-weight: 600; margin-top: 3px; }
    .val-ok b { direction: ltr; display: inline-block; letter-spacing: 0.5px; }

    .net-box input { background: #dcfce7; color: #166534; font-weight: 800; font-size: 1.1rem; border-color: #86efac; }
    .info-alert { background: #e0f2fe; color: #0369a1; padding: 12px 16px; border-radius: 8px; font-size: 0.9rem; line-height: 1.5; margin-bottom: 16px; }
    .bylaw-agreement { margin-top: 20px; background: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 8px; }
    .checkbox-label { display: flex; align-items: center; gap: 10px; cursor: pointer; color: #92400e; }

    .sub-section { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    .dynamic-rows { margin-bottom: 8px; }
    .row-inputs { display: flex; gap: 10px; }
    .btn-add, .btn-add-dep { background: #e2e8f0; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; margin-top: 8px; }
    .btn-remove, .btn-del, .btn-del-exp { background: #fee2e2; color: #991b1b; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; }

    .wizard-actions { display: flex; justify-content: space-between; gap: 12px; margin-top: 16px; }
    .nb-btn-primary { background: #2563eb; color: #fff; border: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; cursor: pointer; }
    .nb-btn-secondary { background: #94a3b8; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; }
    .nb-btn-success { background: #16a34a; color: #fff; border: none; padding: 12px 32px; border-radius: 8px; font-weight: 800; cursor: pointer; }
  `]
})
export class EmployeeCreateComponent {
  private http = inject(HttpClient);
  private router = inject(Router);
  private notify = inject(NotificationService);

  currentStep = signal(1);
  saving = signal(false);

  steps = [
    '1. الشخصية والعنوان',
    '2. الاتصال والمعرفين',
    '3. المؤهل والتكليف',
    '4. الأبناء والتخفيض',
    '5. الخبرات السابقة',
    '6. المالية والعقد'
  ];

  // الدول المدعومة لرقم الواتساب E.164 لدعم إرسال الرسائل والإشعارات
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

  selectedWaCountry(): { code: string; name: string; len: number[]; sample: string } {
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
      this.whatsappError.set('رقم الواتساب مطلوب للإشعار الفوري.');
      this.form.whatsapp_number = '';
      return;
    }

    if (cleaned.length < min || cleaned.length > max) {
      this.whatsappError.set(`رقم الواتساب لدولة ${country.name} يجب أن يتكون من ${min} أرقام بعد مفتاح الدولة.`);
      this.form.whatsapp_number = '';
      return;
    }

    this.whatsappError.set('');
    this.form.whatsapp_number = `${country.code}${cleaned}`;
  }

  onWhatsappCountryChange(): void {
    this.updateFullWhatsappNumber();
  }

  form = {
    full_name_ar: '',
    title_surname: '',
    gender: 'male',
    national_id: '',
    marital_status: 'single',
    children_count: 0,
    city: 'الخرطوم',
    neighborhood: '',
    square_number: '',
    house_number: '',
    prominent_teacher_friend: '',
    phone_1: '',
    phone_2: '',
    phone_3: '',
    whatsapp_number: '',
    emergency_phone_other: '',
    emergency_kinship: '',
    university_institute: '',
    faculty: '',
    specialization: '',
    teaching_subject_1: '',
    teaching_subject_2: '',
    teaching_subject_3: '',
    weekly_lesson_quota: 23,
    duty_exempt: true,
    other_tasks_activities: '',
    department: 'التعليم والإشراف',
    position: 'معلم',
    basic_salary: 200000,
    transport_allowance: 80000,
    communication_allowance: 40000,
    representation_allowance: 30000,
    deductions: 0,
    net_payable: 350000,
    agreed_to_bylaws: true
  };

  references = signal<ReferenceInput[]>([
    { ref_name: '', ref_phone: '' }
  ]);

  dependents = signal<DependentInput[]>([
    { full_name: '', academic_stage: 'المرحلة الابتدائية', grade_level: '', discount_percentage: 50, notes: '' }
  ]);

  priorExperiences = signal<PriorExpInput[]>([
    { school_name: '', time_period: '' }
  ]);

  recalculateSalary() {
    const basic = Number(this.form.basic_salary) || 0;
    const trans = Number(this.form.transport_allowance) || 0;
    const comm = Number(this.form.communication_allowance) || 0;
    const rep = Number(this.form.representation_allowance) || 0;
    const ded = Number(this.form.deductions) || 0;
    this.form.net_payable = (basic + trans + comm + rep) - ded;
  }

  addReference() {
    this.references.update(list => [...list, { ref_name: '', ref_phone: '' }]);
  }
  removeReference(idx: number) {
    this.references.update(list => list.filter((_, i) => i !== idx));
  }

  addDependent() {
    const count = this.dependents().length + 1;
    let disc = 50;
    if (count === 2) disc = 30;
    if (count === 3) disc = 25;
    if (count >= 4) disc = 100;
    this.dependents.update(list => [...list, { full_name: '', academic_stage: 'المرحلة الابتدائية', grade_level: '', discount_percentage: disc, notes: '' }]);
  }
  removeDependent(idx: number) {
    this.dependents.update(list => list.filter((_, i) => i !== idx));
  }

  addExperience() {
    this.priorExperiences.update(list => [...list, { school_name: '', time_period: '' }]);
  }
  removeExperience(idx: number) {
    this.priorExperiences.update(list => list.filter((_, i) => i !== idx));
  }

  nextStep() {
    if (this.currentStep() === 2 && this.whatsappError()) {
      this.notify.error('يرجى تصحيح رقم الواتساب قبل المتابعة.');
      return;
    }
    if (this.currentStep() < 6) this.currentStep.update(s => s + 1);
  }
  prevStep() {
    if (this.currentStep() > 1) this.currentStep.update(s => s - 1);
  }

  cancel() {
    this.router.navigate(['/hr']);
  }

  private cleanApiUrl(endpoint: string): string {
    const base = environment.apiUrl.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    if (base.endsWith('/v1') && cleanEndpoint.startsWith('v1/')) {
      return `${base.replace(/\/v1$/, '')}/${cleanEndpoint}`;
    }
    return `${base}/${cleanEndpoint}`;
  }

  onSubmit(e: Event) {
    e.preventDefault();
    if (this.whatsappError()) {
      this.notify.error('يرجى تصحيح رقم الواتساب الدولي.');
      return;
    }

    this.saving.set(true);

    const payload = {
      ...this.form,
      mobile: this.form.phone_1 || '',
      references: this.references().filter(r => r.ref_name.trim()),
      dependents: this.dependents().filter(d => d.full_name.trim()),
      prior_experiences: this.priorExperiences().filter(p => p.school_name.trim())
    };

    const url = this.cleanApiUrl('v1/employees/employees/');
    this.http.post(url, payload).subscribe({
      next: (res: any) => {
        this.saving.set(false);
        this.notify.success('تمت إضافة المعلم وصياغة عقد 2026م بنجاح.');
        this.router.navigate(['/hr']);
      },
      error: (err) => {
        this.saving.set(false);
        this.notify.error(err.error?.message || 'حدث خطأ أثناء إضافة الموظف. يرجى التحقق من البيانات.');
      }
    });
  }
}
