import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { trigger, transition, style, animate } from '@angular/animations';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStepperComponent } from '../../../shared/nebras/nb-stepper.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { NotificationService } from '../../../core/services/notification.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-employee-create',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbStepperComponent, NbDatepickerComponent],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="توظيف جديد"
        subtitle="إنشاء ملف موظف جديد وتخصيص البيانات الشخصية والوظيفية والمالية بنظام خطوات متكامل."
      >
        <button class="nb-btn-secondary" (click)="cancel()">رجوع للوحة التحكم</button>
      </nb-page-header>

      <!-- شريط الخطوات الموحد لنظام نبراس -->
      <nb-panel class="stepper-wrapper">
        <nb-stepper [steps]="steps" [current]="currentStep()"></nb-stepper>
      </nb-panel>

      <form (submit)="onSubmit($event)" class="wizard-form animate-fade">
        
        <!-- الخطوة 1: البيانات الشخصية -->
        @if (currentStep() === 1) {
          <div class="step-content" @fadeSlide>
            <nb-panel title="الخطوة الأولى: البيانات الشخصية" subtitle="أدخل المعلومات الشخصية للموظف الجديد.">
              <div class="form-grid">
                <div class="field req">
                  <label>الاسم الكامل باللغة العربية</label>
                  <input type="text" [(ngModel)]="form.full_name_ar" name="full_name_ar" required placeholder="الاسم ثلاثي أو رباعي بالعربية" />
                </div>
                <div class="field">
                  <label>الاسم الكامل باللغة الإنجليزية</label>
                  <input type="text" [(ngModel)]="form.full_name_en" name="full_name_en" placeholder="Full name in English" />
                </div>
                <div class="field req">
                  <label>الجنس</label>
                  <select [(ngModel)]="form.gender" name="gender" required>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <div class="field req">
                  <label>الجنسية</label>
                  <input type="text" [(ngModel)]="form.nationality" name="nationality" required placeholder="مثال: سوداني، سعودي" />
                </div>
                <div class="field req">
                  <label>تاريخ الميلاد</label>
                  <nb-datepicker [(value)]="form.date_of_birth" placeholder="اختر تاريخ الميلاد"></nb-datepicker>
                </div>
                <div class="field">
                  <label>الديانة</label>
                  <input type="text" [(ngModel)]="form.religion" name="religion" placeholder="مثال: muslim, christian" />
                </div>
                <div class="field">
                  <label>الحالة الاجتماعية</label>
                  <select [(ngModel)]="form.marital_status" name="marital_status">
                    <option value="">غير محدد</option>
                    <option value="single">أعزب / عزباء</option>
                    <option value="married">متزوج / متزوجة</option>
                    <option value="divorced">مطلق / مطلقة</option>
                    <option value="widowed">أرمل / أرملة</option>
                  </select>
                </div>
              </div>
            </nb-panel>
          </div>
        }

        <!-- الخطوة 2: بيانات الاتصال والهوية -->
        @if (currentStep() === 2) {
          <div class="step-content" @fadeSlide>
            <nb-panel title="الخطوة الثانية: بيانات الاتصال والرقم الوطني" subtitle="أدخل الرقم الوطني وعناوين الاتصال الفعالة.">
              <div class="form-grid">
                <div class="field req">
                  <label>الرقم الوطني</label>
                  <input type="text" [(ngModel)]="form.national_id" name="national_id" required placeholder="أدخل 10 أرقام" />
                </div>
                <div class="field">
                  <label>رقم جواز السفر</label>
                  <input type="text" [(ngModel)]="form.passport" name="passport" placeholder="رقم الجواز إن وجد" />
                </div>
                <div class="field req">
                  <label>البريد الإلكتروني للعمل</label>
                  <input type="email" [(ngModel)]="form.email" name="email" required placeholder="example@nebras.edu" />
                </div>
                <div class="field req">
                  <label>رقم الهاتف / الجوال</label>
                  <input type="text" [(ngModel)]="form.mobile" name="mobile" required placeholder="09xxxxxxxx" />
                </div>
                <div class="field full-width">
                  <label>العنوان السكني بالكامل</label>
                  <input type="text" [(ngModel)]="form.address" name="address" placeholder="المدينة، الحي، الشارع، رقم المنزل" />
                </div>
              </div>
            </nb-panel>
          </div>
        }

        <!-- الخطوة 3: التفاصيل الوظيفية والمالية -->
        @if (currentStep() === 3) {
          <div class="step-content" @fadeSlide>
            <nb-panel title="الخطوة الثالثة: التفاصيل الوظيفية والمالية" subtitle="أدخل المسمى الوظيفي والقسم وقيم الراتب للتعاقد.">
              <div class="form-grid">
                <div class="field req">
                  <label>القسم الإداري</label>
                  <select [(ngModel)]="form.department" name="department" required>
                    <option value="التعليم والإشراف">التعليم والإشراف</option>
                    <option value="الإدارة المالية">الإدارة المالية</option>
                    <option value="تقنية المعلومات">تقنية المعلومات</option>
                    <option value="الموارد البشرية">الموارد البشرية</option>
                  </select>
                </div>
                <div class="field req">
                  <label>المسمى الوظيفي</label>
                  <input type="text" [(ngModel)]="form.position" name="position" required placeholder="مثال: معلم لغة عربية، محاسب" />
                </div>
                <div class="field req">
                  <label>نوع التوظيف</label>
                  <select [(ngModel)]="form.employment_type" name="employment_type" required>
                    <option value="Full-time">دوام كامل</option>
                    <option value="Part-time">دوام جزئي</option>
                    <option value="Contract">عقد مؤقت</option>
                  </select>
                </div>
                <div class="field req">
                  <label>الراتب الأساسي (ج.س)</label>
                  <input type="number" [(ngModel)]="form.salary" name="salary" required />
                </div>
                <div class="field">
                  <label>البدلات الإضافية (ج.س)</label>
                  <input type="number" [(ngModel)]="form.allowance" name="allowance" />
                </div>
                <div class="field req">
                  <label>تاريخ التعيين والالتحاق</label>
                  <nb-datepicker [(value)]="form.joining_date" placeholder="اختر تاريخ التعيين"></nb-datepicker>
                </div>
              </div>
            </nb-panel>
          </div>
        }

        <!-- أزرار التحكم بالخطوات -->
        <div class="form-actions">
          @if (currentStep() > 1) {
            <button type="button" class="nb-btn-secondary" (click)="prevStep()" [disabled]="submitting()">السابق</button>
          }
          <div class="spacer"></div>
          @if (currentStep() < 3) {
            <button type="button" class="nb-btn-primary" (click)="nextStep()">التالي</button>
          } @else {
            <button type="submit" class="nb-btn-primary" [disabled]="submitting()">
              {{ submitting() ? 'جارٍ الحفظ والتوظيف…' : 'إكمال التوظيف وحفظ الملف ✓' }}
            </button>
          }
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-background); font-family: var(--nb-font-family); }
    .stepper-wrapper { margin-bottom: 20px; }
    .wizard-form { display: flex; flex-direction: column; gap: 20px; max-width: 900px; margin: 0 auto; }
    
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      padding: 8px 4px;
    }
    
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field.full-width { grid-column: 1 / -1; }
    
    .field label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .field input, .field select {
      height: 38px;
      padding: 0 12px;
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius);
      font-family: var(--nb-font-family);
      font-size: 13px;
      background: var(--nb-surface);
      color: var(--nb-text);
      outline: none;
      transition: border-color 0.2s;
    }
    .field input:focus, .field select:focus {
      border-color: var(--nb-primary-600);
      box-shadow: 0 0 0 3px var(--nb-primary-50);
    }
    
    .field.req label::after {
      content: ' *';
      color: var(--nb-danger, #ff3b30);
    }

    .form-actions {
      display: flex;
      gap: 12px;
      align-items: center;
      border-top: 1px solid var(--nb-border-soft);
      padding-top: 18px;
      margin-top: 8px;
    }
    .spacer { flex: 1; }

    .nb-btn-primary, .nb-btn-secondary {
      height: 38px;
      padding: 0 20px;
      font-family: var(--nb-font-family);
      font-size: 13px;
      font-weight: 600;
      border-radius: var(--nb-radius);
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .nb-btn-primary {
      background: var(--nb-primary-600);
      color: white;
    }
    .nb-btn-primary:hover:not(:disabled) {
      background: var(--nb-primary-700);
    }
    .nb-btn-secondary {
      background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border);
      color: var(--nb-text);
    }
    .nb-btn-secondary:hover:not(:disabled) {
      background: var(--nb-border-soft);
    }
    .nb-btn-primary:disabled, .nb-btn-secondary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .animate-fade { animation: fadeIn 0.25s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class EmployeeCreateComponent {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly notify = inject(NotificationService);

  readonly steps = ['البيانات الشخصية', 'بيانات الاتصال والرقم الوطني', 'التفاصيل الوظيفية والمالية'];
  readonly currentStep = signal(1);
  readonly submitting = signal(false);

  form = {
    full_name_ar: '',
    full_name_en: '',
    gender: 'male',
    nationality: 'سوداني',
    date_of_birth: '',
    religion: '',
    marital_status: '',
    national_id: '',
    passport: '',
    email: '',
    mobile: '',
    address: '',
    department: 'التعليم والإشراف',
    position: '',
    employment_type: 'Full-time',
    salary: 250000,
    allowance: 50000,
    joining_date: new Date().toISOString().split('T')[0]
  };

  nextStep() {
    if (this.currentStep() === 1) {
      if (!this.form.full_name_ar || !this.form.gender || !this.form.nationality || !this.form.date_of_birth) {
        this.notify.error('يرجى تعبئة كافة الحقول المطلوبة للخطوة الأولى.');
        return;
      }
    } else if (this.currentStep() === 2) {
      if (!this.form.national_id || !this.form.email || !this.form.mobile) {
        this.notify.error('يرجى تعبئة كافة الحقول المطلوبة للخطوة الثانية.');
        return;
      }
    }
    this.currentStep.update(s => s + 1);
  }

  prevStep() {
    this.currentStep.update(s => s - 1);
  }

  cancel() {
    this.router.navigate(['/hr']);
  }

  onSubmit(event: Event) {
    event.preventDefault();
    if (!this.form.department || !this.form.position || !this.form.joining_date) {
      this.notify.error('يرجى تعبئة كافة الحقول المطلوبة للخطوة الثالثة.');
      return;
    }

    this.submitting.set(true);

    const payload = {
      ...this.form,
      status: 'active'
    };

    this.http.post<any>(`${environment.apiUrl}employees/employees/`, payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res && res.success) {
          this.notify.success('تم توظيف وتسجيل الموظف الجديد في قاعدة البيانات بنجاح.');
          this.router.navigate(['/hr']);
        } else {
          this.notify.error(res?.message || 'حدث خطأ أثناء حفظ بيانات الموظف.');
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.notify.error('فشل الاتصال بالخادم لحفظ بيانات الموظف.');
      }
    });
  }
}
