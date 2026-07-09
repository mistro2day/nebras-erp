import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentsService } from '../students.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

@Component({
  selector: 'app-student-create',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent],
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
        subtitle="إضافة الطلاب إلى العام الأكاديمي، إما عن طريق ربط طلب قبول مقبول أو التسجيل اليدوي المباشر."
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
                  <span>📍 {{ app.nationality }}</span>
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
        </nb-panel>

        <!-- تفاصيل المتقدم والتأكيد -->
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
                    <span class="field-label">رقم الهوية الوطنية / الإقامة:</span>
                    <span class="field-value">{{ a.national_id }}</span>
                  </div>
                  <div class="detail-field">
                    <span class="field-label">رقم جواز السفر:</span>
                    <span class="field-value">{{ a.passport_number || '—' }}</span>
                  </div>
                  <div class="detail-field">
                    <span class="field-label">المدرسة السابقة:</span>
                    <span class="field-value">{{ a.previous_school || '—' }}</span>
                  </div>
                </div>
              </div>

              <div class="form-actions">
                <button class="nb-btn-secondary" (click)="cancelSelection()">إلغاء التحديد</button>
                <button class="nb-btn-primary" (click)="registerStudent()">إكمال تسجيل الطالب وتوليد الرقم الأكاديمي ✓</button>
              </div>
            </nb-panel>
          </div>
        }
      </div>

      <!-- نموذج التسجيل اليدوي للطلاب -->
      <div class="registration-manual-layout" *ngIf="regMode() === 'manual'" @fadeSlide>
        <nb-panel title="بيانات الطالب الشخصية والطبية" subtitle="أدخل كافة بيانات الطالب يدوياً ليتم توليد رقمه الأكاديمي وحفظه فوراً.">
          <form (submit)="submitManualStudent($event)" class="manual-form">
            <!-- تبويبات النموذج اليدوي -->
            <div class="form-tabs">
              <button type="button" [class.active]="activeFormTab() === 'personal'" (click)="activeFormTab.set('personal')">البيانات الشخصية</button>
              <button type="button" [class.active]="activeFormTab() === 'medical'" (click)="activeFormTab.set('medical')">الملف الطبي</button>
            </div>

            <!-- تبويب البيانات الشخصية -->
            <div class="tab-panel-content" *ngIf="activeFormTab() === 'personal'">
              <div class="form-grid">
                <div class="field">
                  <label>الاسم بالعربي (مطلوب)</label>
                  <input type="text" [(ngModel)]="personalForm.arabic_name" name="arabic_name" required placeholder="مثال: أحمد محمد علي" />
                </div>
                <div class="field">
                  <label>الاسم بالإنجليزي</label>
                  <input type="text" [(ngModel)]="personalForm.english_name" name="english_name" placeholder="مثال: Ahmed Mohamed Ali" />
                </div>
                <div class="field">
                  <label>الجنس</label>
                  <select [(ngModel)]="personalForm.gender" name="gender">
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <div class="field">
                  <label>تاريخ الميلاد</label>
                  <input type="date" [(ngModel)]="personalForm.date_of_birth" name="date_of_birth" required />
                </div>
                <div class="field">
                  <label>الجنسية</label>
                  <input type="text" [(ngModel)]="personalForm.nationality" name="nationality" placeholder="سوداني، سعودي..." />
                </div>
                <div class="field">
                  <label>رقم الهوية الوطنية / الإقامة</label>
                  <input type="text" [(ngModel)]="personalForm.national_id" name="national_id" placeholder="10 أرقام" />
                </div>
                <div class="field">
                  <label>رقم جواز السفر</label>
                  <input type="text" [(ngModel)]="personalForm.passport" name="passport" />
                </div>
                <div class="field">
                  <label>الديانة</label>
                  <input type="text" [(ngModel)]="personalForm.religion" name="religion" placeholder="مسلم، مسيحي..." />
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
              </div>
            </div>

            <!-- تبويب الملف الطبي -->
            <div class="tab-panel-content" *ngIf="activeFormTab() === 'medical'">
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
                  <label>الأدية الموصوفة</label>
                  <input type="text" [(ngModel)]="medicalForm.medicationInput" name="medication" placeholder="أدوية يحتاجها الطالب بانتظام" />
                </div>
                <div class="field">
                  <label>طبيب الأسرة المفضل</label>
                  <input type="text" [(ngModel)]="medicalForm.doctor" name="doctor" />
                </div>
                <div class="field full-width">
                  <label>ملاحظات طبية أخرى</label>
                  <textarea [(ngModel)]="medicalForm.medical_notes" name="medical_notes" rows="3"></textarea>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="nb-btn-secondary" (click)="cancel()">إلغاء</button>
              <button type="submit" class="nb-btn-primary" [disabled]="submitting()">
                {{ submitting() ? 'جارٍ تسجيل الطالب…' : 'حفظ وتسجيل الطالب يدوياً ✓' }}
              </button>
            </div>
          </form>
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

      /* نموذج التسجيل اليدوي */
      .manual-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .form-tabs {
        display: flex;
        gap: 10px;
        border-bottom: 1px solid var(--nb-border-soft);
        padding-bottom: 8px;
      }
      .form-tabs button {
        background: transparent;
        border: none;
        font-family: var(--nb-font-family);
        font-size: 13px;
        font-weight: 600;
        color: var(--nb-text-muted);
        padding: 6px 12px;
        cursor: pointer;
        position: relative;
      }
      .form-tabs button.active {
        color: var(--nb-primary-600);
      }
      .form-tabs button.active::after {
        content: '';
        position: absolute;
        bottom: -9px; left: 0; right: 0;
        height: 2px;
        background: var(--nb-primary-600);
      }
      
      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }
      
      .field { display: flex; flex-direction: column; gap: 5px; }
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
      .nb-btn-secondary:hover {
        background: var(--nb-border-soft);
      }
    `
  ]
})
export class StudentCreateComponent implements OnInit {
  private studentsService = inject(StudentsService);
  private router = inject(Router);
  private http = inject(HttpClient);

  regMode = signal<'admission' | 'manual'>('admission');
  activeFormTab = signal<'personal' | 'medical'>('personal');
  applicants = signal<any[]>([]);
  selectedApplicant = signal<any | null>(null);
  submitting = signal(false);

  // حقول النموذج اليدوي
  personalForm = {
    arabic_name: '',
    english_name: '',
    gender: 'male',
    date_of_birth: '',
    nationality: 'سوداني',
    national_id: '',
    passport: '',
    religion: '',
    blood_group: '',
  };

  medicalForm = {
    allergiesInput: '',
    chronicDiseasesInput: '',
    medicationInput: '',
    doctor: '',
    medical_notes: '',
  };

  ngOnInit() {
    this.loadAcceptedApplicants();
  }

  loadAcceptedApplicants() {
    this.http.get<any>('/api/v1/admissions/applicants/?status=accepted').subscribe(res => {
      if (res && res.success) {
        const data = res.data?.results || res.data || [];
        this.applicants.set(data);
      }
    });
  }

  setMode(mode: 'admission' | 'manual') {
    this.regMode.set(mode);
    this.selectedApplicant.set(null);
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
  }

  registerStudent() {
    const applicant = this.selectedApplicant();
    if (!applicant) return;

    this.submitting.set(true);
    this.studentsService.createStudentFromApplicant(applicant.id).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res && res.success) {
          this.router.navigate(['/students/details', res.data.id]);
        }
      },
      error: () => this.submitting.set(false)
    });
  }

  submitManualStudent(event: Event) {
    event.preventDefault();
    if (!this.personalForm.arabic_name || !this.personalForm.date_of_birth) {
      alert('يرجى ملء الحقول المطلوبة (الاسم بالعربي وتاريخ الميلاد)');
      return;
    }

    this.submitting.set(true);

    // تجهيز مصفوفات الحساسية والأمراض المزمنة
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
        ...this.personalForm,
        languages: ['العربية']
      },
      medical_profile: {
        allergies,
        chronic_diseases,
        medication,
        doctor: this.medicalForm.doctor,
        medical_notes: this.medicalForm.medical_notes
      }
    };

    this.studentsService.createStudent(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res && res.success) {
          this.router.navigate(['/students/details', res.data.id]);
        }
      },
      error: () => {
        this.submitting.set(false);
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