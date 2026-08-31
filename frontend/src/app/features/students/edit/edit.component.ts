import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { StudentsService } from '../students.service';
import { StudentFinanceService } from '../../student-finance/student-finance.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { RegistrationFinanceFormComponent, FinancialConfig } from '../shared/registration-finance-form.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-student-edit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatDialogModule, MatSnackBarModule, NbPageHeaderComponent, NbPanelComponent, NbDatepickerComponent, NbLoadingComponent, RegistrationFinanceFormComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        [title]="'تعديل ملف: ' + (formTitle() || 'طالب')"
        subtitle="تعديل شامل لكافة حقول ملف الطالب الشخصية والأكاديمية والمالية والطبية."
      >
        <button class="nb-btn-danger" (click)="confirmDeleteStudent()">🗑️ حذف الطالب</button>
        <button class="nb-btn-ghost" (click)="cancel()">إلغاء</button>
        <button class="nb-btn-primary" (click)="save()" [disabled]="saving()">
          {{ saving() ? 'جارٍ الحفظ…' : 'حفظ التعديلات ✓' }}
        </button>
      </nb-page-header>

      @if (loaded()) {
        <!-- تبويبات النموذج التعديلي الشامل -->
        <div class="form-tabs">
          <button type="button" [class.active]="activeTab() === 'personal'" (click)="activeTab.set('personal')">👤 البيانات الشخصية والبرامج</button>
          <button type="button" [class.active]="activeTab() === 'academic'" (click)="activeTab.set('academic')">🎓 الحالة الأكاديمية</button>
          <button type="button" [class.active]="activeTab() === 'financial'" (click)="activeTab.set('financial')">💳 البيانات المالية والأقساط</button>
          <button type="button" [class.active]="activeTab() === 'medical'" (click)="activeTab.set('medical')">🏥 الملف الطبي</button>
          <button type="button" [class.active]="activeTab() === 'guardians'" (click)="activeTab.set('guardians')">👥 أولياء الأمور والروابط</button>
        </div>

        <!-- تبويب 1: البيانات الشخصية والبرامج الخاصة -->
        <div *ngIf="activeTab() === 'personal'" class="tab-panel">
          <nb-panel title="البيانات الشخصية الأساسية">
            <div class="form-grid">
              <div class="field"><label>الاسم بالعربية (مطلوب)</label><input [(ngModel)]="personalForm.arabic_name" required /></div>
              <div class="field"><label>الاسم بالإنجليزية</label><input [(ngModel)]="personalForm.english_name" /></div>
              <div class="field">
                <label>الجنس</label>
                <select [(ngModel)]="personalForm.gender">
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>
              <div class="field"><label>تاريخ الميلاد</label><nb-datepicker [(value)]="personalForm.date_of_birth" ariaLabel="تاريخ الميلاد"></nb-datepicker></div>
              <div class="field"><label>الجنسية</label><input [(ngModel)]="personalForm.nationality" /></div>
              <div class="field"><label>الرقم الوطني / الجواز</label><input [(ngModel)]="personalForm.national_id" /></div>
              <div class="field"><label>رقم الجواز</label><input [(ngModel)]="personalForm.passport" /></div>
              <div class="field"><label>الديانة</label><input [(ngModel)]="personalForm.religion" /></div>
              <div class="field">
                <label>فصيلة الدم</label>
                <select [(ngModel)]="personalForm.blood_group">
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
          </nb-panel>

          <nb-panel title="الاحتياجات والبرامج الخاصة">
            <div class="form-grid">
              <div class="field"><label>ذوي الاحتياجات الخاصة</label><input [(ngModel)]="personalForm.special_needs" /></div>
              <div class="field"><label>صعوبات التعلم</label><input [(ngModel)]="personalForm.learning_difficulty" /></div>
              <div class="field"><label>برامج الموهوبين</label><input [(ngModel)]="personalForm.talented_program" /></div>
              <div class="field wide"><label>ملاحظات عامة</label><textarea rows="3" [(ngModel)]="personalForm.notes"></textarea></div>
            </div>
          </nb-panel>
        </div>

        <!-- تبويب 2: الحالة الأكاديمية -->
        <div *ngIf="activeTab() === 'academic'" class="tab-panel">
          <nb-panel title="إدارة حالة الطالب في النظام">
            <div class="form-grid">
              <div class="field">
                <label>حالة الطالب الحالية</label>
                <select [(ngModel)]="studentStatus">
                  <option value="active">نشط</option>
                  <option value="registered">مسجل (جديد)</option>
                  <option value="suspended">موقوف مؤقتاً</option>
                  <option value="graduated">متخرج</option>
                  <option value="withdrawn">منسحب</option>
                  <option value="archived">مؤرشف</option>
                </select>
              </div>
            </div>
          </nb-panel>
        </div>

        <!-- تبويب 3: البيانات المالية والأقساط -->
        <div *ngIf="activeTab() === 'financial'" class="tab-panel">
          <app-registration-finance-form
            [config]="existingFinancialConfig()"
            (configChange)="financialConfig.set($event)"
          ></app-registration-finance-form>
        </div>

        <!-- تبويب 4: الملف الطبي للعيادة -->
        <div *ngIf="activeTab() === 'medical'" class="tab-panel">
          <nb-panel title="الملف الطبي الخاص بالعيادة المدرسية">
            <div class="form-grid">
              <div class="field wide">
                <label>الحساسية (افصل بينها بفاصلة)</label>
                <input [(ngModel)]="medicalForm.allergiesInput" placeholder="مثال: البنسلين، الغبار، البيض" />
              </div>
              <div class="field wide">
                <label>الأمراض المزمنة (افصل بينها بفاصلة)</label>
                <input [(ngModel)]="medicalForm.chronicDiseasesInput" placeholder="مثال: الربو، السكري" />
              </div>
              <div class="field wide">
                <label>الأدوية المنتظمة (افصل بينها بفاصلة)</label>
                <input [(ngModel)]="medicalForm.medicationInput" placeholder="أدوية يتم تناولها بانتظام" />
              </div>
              <div class="field">
                <label>طبيب الأسرة المفضل</label>
                <input [(ngModel)]="medicalForm.doctor" />
              </div>
              <div class="field wide">
                <label>ملاحظات طبية خاصة</label>
                <textarea rows="3" [(ngModel)]="medicalForm.medical_notes"></textarea>
              </div>
            </div>
          </nb-panel>
        </div>

        <!-- تبويب 5: أولياء الأمور والروابط العائلية -->
        <div *ngIf="activeTab() === 'guardians'" class="tab-panel">
          <nb-panel title="أولياء الأمور المرتبطين بملف الطالب">
            <div class="relations-list">
              <div *ngFor="let rel of familyRelations()" class="relation-card">
                <div class="relation-header">
                  <span class="rel-tag">{{ getRelationTypeName(rel.relationship) }}</span>
                  <div class="rel-actions">
                    <button type="button" class="nb-btn-ghost sm" (click)="editRelation(rel)">✏️ تعديل</button>
                    <button type="button" class="nb-btn-danger sm" (click)="deleteRelation(rel.id)">🗑️ حذف</button>
                  </div>
                </div>
                <div class="relation-body">
                  <div class="rel-info-item"><strong>الاسم الكامل:</strong> {{ rel.full_name }}</div>
                  <div class="rel-info-item"><strong>الهاتف:</strong> {{ rel.phone }}</div>
                  <div class="rel-info-item"><strong>البريد الإلكتروني:</strong> {{ rel.email || '—' }}</div>
                  <div class="rel-info-item"><strong>الرقم الوطني / الجواز:</strong> {{ rel.national_id || '—' }}</div>
                  <div class="rel-info-item"><strong>المهنة والوظيفة:</strong> {{ rel.occupation || '—' }}</div>
                  <div class="rel-info-item"><strong>جهة اتصال طوارئ:</strong> {{ rel.emergency_contact ? 'نعم 🚨' : 'لا' }}</div>
                </div>
                <div class="relation-footer">
                  <div class="portal-status">
                    <span class="status-indicator" [class.active]="rel.is_portal_active"></span>
                    <span class="status-text">{{ rel.is_portal_active ? 'حساب البوابة مفعل ونشط' : 'حساب البوابة غير مفعل' }}</span>
                  </div>
                  <span class="portal-hint">لتفعيل حساب البوابة استخدم شاشة عرض ملف الطالب</span>
                </div>
              </div>

              <div *ngIf="familyRelations().length === 0" class="no-relations">
                لا يوجد أولياء أمور مسجلين لهذا الطالب حالياً.
              </div>
            </div>

            <div class="add-relation-btn-wrapper">
              <button type="button" class="nb-btn-primary" (click)="addNewRelation()">
                ➕ إضافة ولي أمر / صلة قرابة جديدة
              </button>
            </div>
          </nb-panel>

          <!-- نموذج إضافة/تعديل ولي أمر -->
          <nb-panel *ngIf="showRelationForm()" [title]="relationForm.id ? 'تعديل بيانات ولي الأمر' : 'إضافة ولي أمر جديد'">
            <form (submit)="saveRelationForm($event)">
              <div class="form-grid">
                <div class="field">
                  <label>نوع صلة القرابة</label>
                  <select [(ngModel)]="relationForm.relationship" name="relationship" required>
                    <option value="father">أب</option>
                    <option value="mother">أم</option>
                    <option value="guardian">ولي أمر</option>
                    <option value="sponsor">كفيل</option>
                    <option value="sibling">شقيق</option>
                  </select>
                </div>
                <div class="field">
                  <label>الاسم الكامل لولي الأمر (مطلوب)</label>
                  <input type="text" [(ngModel)]="relationForm.full_name" name="full_name" required />
                </div>
                <div class="field">
                  <label>رقم الهاتف (مطلوب)</label>
                  <input type="text" [(ngModel)]="relationForm.phone" name="phone" required />
                </div>
                <div class="field">
                  <label>البريد الإلكتروني (لتفعيل الحساب)</label>
                  <input type="email" [(ngModel)]="relationForm.email" name="email" />
                </div>
                <div class="field">
                  <label>الرقم الوطني أو رقم الجواز</label>
                  <input type="text" [(ngModel)]="relationForm.national_id" name="national_id" />
                </div>
                <div class="field">
                  <label>المهنة / الوظيفة</label>
                  <input type="text" [(ngModel)]="relationForm.occupation" name="occupation" />
                </div>
                <div class="field">
                  <label>جهة العمل</label>
                  <input type="text" [(ngModel)]="relationForm.employer" name="employer" />
                </div>
                <div class="field checkbox-field">
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="relationForm.emergency_contact" name="emergency_contact" />
                    <span>جهة اتصال للطوارئ 🚨</span>
                  </label>
                </div>
              </div>
              <div class="form-actions relation-form-actions">
                <button type="button" class="nb-btn-secondary sm" (click)="showRelationForm.set(false)">إلغاء</button>
                <button type="submit" class="nb-btn-primary sm">حفظ بيانات ولي الأمر</button>
              </div>
            </form>
          </nb-panel>
        </div>

        @if (error()) { <div class="err">{{ error() }}</div> }
      } @else {
        <nb-loading message="جارٍ تحميل بيانات الطالب..."></nb-loading>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    
    .form-tabs {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--nb-border-soft);
      padding-bottom: 8px;
    }
    .form-tabs button {
      background: transparent;
      border: none;
      font-family: var(--nb-font-family);
      font-size: 13.5px;
      font-weight: 600;
      color: var(--nb-text-muted);
      padding: 8px 16px;
      cursor: pointer;
      position: relative;
      transition: all 0.2s;
    }
    .form-tabs button.active {
      color: var(--nb-primary-600);
    }
    .form-tabs button.active::after {
      content: '';
      position: absolute;
      bottom: -9px; left: 0; right: 0;
      height: 3px;
      background: var(--nb-primary-600);
      border-radius: 3px 3px 0 0;
    }

    nb-panel { display: block; margin-bottom: 16px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 5px; }
    .field.wide { grid-column: 1 / -1; }
    .field label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .field input, .field select, .field textarea {
      height: 36px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text);
      background: var(--nb-surface); outline: none;
    }
    .field textarea { height: auto; padding: 8px 10px; resize: vertical; }
    .field input:focus, .field select:focus, .field textarea:focus { border-color: var(--nb-primary-400); box-shadow: var(--nb-focus-ring); }
    
    .err { color: var(--nb-danger); font-size: 13px; margin-top: 8px; }

    .relations-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .relation-card {
      background: var(--nb-surface); border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius-card);
      padding: 16px; display: flex; flex-direction: column; gap: 12px; transition: all 0.2s;
    }
    .relation-card:hover { border-color: var(--nb-primary-300); box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .relation-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 8px; }
    .rel-tag { background: var(--nb-primary-50); color: var(--nb-primary-700); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
    .rel-actions { display: flex; gap: 6px; }
    .relation-body { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--nb-text); }
    .rel-info-item strong { color: var(--nb-text-muted); margin-left: 5px; }
    .relation-footer {
      display: flex; justify-content: space-between; align-items: center; margin-top: auto;
      border-top: 1px solid var(--nb-border-soft); padding-top: 10px; gap: 10px;
    }
    .portal-status { display: flex; align-items: center; gap: 6px; }
    .status-indicator { width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; }
    .status-indicator.active { background: var(--nb-success, #10b981); box-shadow: 0 0 6px var(--nb-success); }
    .status-text { font-size: 12px; color: var(--nb-text-muted); font-weight: 500; }
    .add-relation-btn-wrapper { display: flex; justify-content: flex-end; margin-top: 12px; }
    
    .checkbox-field { display: flex; align-items: center; justify-content: flex-start; height: 100%; margin-top: 20px; }
    .checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; }
    .checkbox-label input { width: 16px; height: 16px; cursor: pointer; }
    .relation-form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; border-top: 1px solid var(--nb-border-soft); padding-top: 12px; }
    .nb-btn-danger { background: #dc3545; color: white; border: none; padding: 0 14px; height: 38px; border-radius: var(--nb-radius); font-weight: 600; cursor: pointer; }
    .nb-btn-danger:hover { background: #c82333; }
  `]
})
export class StudentEditComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private studentsService = inject(StudentsService);
  private financeService = inject(StudentFinanceService);

  private id = '';
  readonly loaded = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly activeTab = signal<'personal' | 'academic' | 'financial' | 'medical' | 'guardians'>('personal');
  readonly familyRelations = signal<any[]>([]);
  readonly showRelationForm = signal(false);

  financialConfig = signal<FinancialConfig | null>(null);
  existingFinancialConfig = signal<FinancialConfig | null>(null);

  relationForm = {
    id: '',
    relationship: 'guardian',
    full_name: '',
    phone: '',
    email: '',
    national_id: '',
    occupation: '',
    employer: '',
    emergency_contact: false,
  };

  personalForm = {
    arabic_name: '', english_name: '', gender: 'male', date_of_birth: '', nationality: '',
    national_id: '', passport: '', religion: '', blood_group: '',
    special_needs: '', learning_difficulty: '', talented_program: '', notes: '',
  };

  studentStatus = 'active';

  medicalForm = {
    allergiesInput: '',
    chronicDiseasesInput: '',
    medicationInput: '',
    doctor: '',
    medical_notes: '',
  };

  formTitle = signal<string>('');

  ngOnInit(): void {
    this.id = this.route.snapshot.params['id'];
    this.studentsService.getStudentById(this.id).subscribe((res) => {
      if (res && res.success) {
        const student = res.data;
        const p = student.profile || {};
        const med = student.medical_profile || {};

        (Object.keys(this.personalForm) as (keyof typeof this.personalForm)[]).forEach((k) => {
          if (p[k] !== undefined && p[k] !== null) this.personalForm[k] = p[k];
        });

        this.studentStatus = student.status || 'active';

        this.medicalForm.allergiesInput = (med.allergies || []).join(', ');
        this.medicalForm.chronicDiseasesInput = (med.chronic_diseases || []).join(', ');
        this.medicalForm.medicationInput = (med.medication || []).join(', ');
        this.medicalForm.doctor = med.doctor || '';
        this.medicalForm.medical_notes = med.medical_notes || '';

        this.familyRelations.set(student.family_relations || []);
        this.formTitle.set(this.personalForm.arabic_name);
        this.loaded.set(true);

        this.loadStudentFinance();
      }
    });
  }

  loadStudentFinance() {
    this.financeService.invoicesForAccount(this.id).subscribe(res => {
      const invs = (res?.data as any)?.results || res?.data || [];
      if (invs.length > 0) {
        const inv = invs[0];
        const regItem = (inv.items || []).find((i: any) => i.description?.includes('تسجيل'));
        const tuiItem = (inv.items || []).find((i: any) => i.description?.includes('دراسي'));
        const regAmt = regItem ? Number(regItem.amount) : 150000;
        const tuiAmt = tuiItem ? Number(tuiItem.amount) : 1200000;
        const discAmt = (inv.discounts || []).reduce((acc: number, d: any) => acc + Number(d.amount), 0);

        this.existingFinancialConfig.set({
          registration_fee: regAmt,
          tuition_fee: tuiAmt,
          discount_amount: discAmt,
          discount_reason: (inv.discounts || [])[0]?.discount_reason || '',
          custom_fee_items: [],
          installment_plan: {
            plan_type: 'custom',
            installments: []
          },
          initial_payment: {
            is_paid: false,
            amount: 0,
            payment_method_id: ''
          }
        });
      }
    });
  }

  save(): void {
    this.saving.set(true);
    this.error.set(null);

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
      profile: { ...this.personalForm },
      status: this.studentStatus,
      medical_profile: {
        allergies,
        chronic_diseases,
        medication,
        doctor: this.medicalForm.doctor,
        medical_notes: this.medicalForm.medical_notes
      },
      financial_config: this.financialConfig()
    };

    this.studentsService.updateStudent(this.id, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open('تم حفظ تعديلات الطالب بنجاح', 'إغلاق', { duration: 4000 });
        this.router.navigate(['/students/details', this.id]);
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(e?.error?.error?.message || 'تعذّر حفظ التعديلات. تحقّق من الحقول والصلاحيات.');
      },
    });
  }

  confirmDeleteStudent(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'تأكيد حذف الطالب',
        message: `هل أنت متأكد من حذف الطالب «${this.personalForm.arabic_name}» نهائياً؟ سيتم نقل السجل للبيانات المحذوفة.`,
        confirmText: 'حذف الطالب',
        color: 'warn',
      },
    });

    ref.afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.studentsService.deleteStudent(this.id).subscribe({
        next: () => {
          this.snack.open('تم حذف الطالب بنجاح', 'إغلاق', { duration: 5000 });
          this.router.navigate(['/students/list']);
        },
        error: (err) => {
          this.snack.open(err?.error?.message || 'تعذّر حذف الطالب. حاول مجددًا.', 'إغلاق', { duration: 5000 });
        }
      });
    });
  }

  cancel(): void {
    this.router.navigate(['/students/details', this.id]);
  }

  getRelationTypeName(rel: string): string {
    const types: Record<string, string> = {
      father: 'أب',
      mother: 'أم',
      guardian: 'ولي أمر',
      sponsor: 'كفيل',
      sibling: 'شقيق',
    };
    return types[rel] || rel;
  }

  addNewRelation(): void {
    this.relationForm = {
      id: '',
      relationship: 'guardian',
      full_name: '',
      phone: '',
      email: '',
      national_id: '',
      occupation: '',
      employer: '',
      emergency_contact: false,
    };
    this.showRelationForm.set(true);
  }

  editRelation(rel: any): void {
    this.relationForm = { ...rel };
    this.showRelationForm.set(true);
  }

  saveRelationForm(e: Event): void {
    e.preventDefault();
    (this.studentsService as any).saveRelation(this.id, this.relationForm).subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.showRelationForm.set(false);
          this.reloadRelations();
        }
      },
      error: (err: any) => {
        this.error.set(err?.error?.error?.message || 'تعذّر حفظ بيانات ولي الأمر.');
      }
    });
  }

  deleteRelation(relationId: string): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'تأكيد الحذف',
        message: 'هل أنت متأكد من حذف ولي الأمر هذا؟',
        confirmText: 'حذف',
        color: 'warn'
      }
    });

    ref.afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      (this.studentsService as any).deleteRelation(this.id, relationId).subscribe({
        next: () => {
          this.reloadRelations();
        }
      });
    });
  }

  private reloadRelations(): void {
    this.studentsService.getStudentById(this.id).subscribe((res) => {
      if (res && res.success) {
        this.familyRelations.set(res.data.family_relations || []);
      }
    });
  }
}
