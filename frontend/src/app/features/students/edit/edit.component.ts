import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentsService } from '../students.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';

interface ProfileForm {
  arabic_name: string; english_name: string; gender: string; date_of_birth: string;
  nationality: string; national_id: string; passport: string; religion: string;
  blood_group: string; special_needs: string; learning_difficulty: string;
  talented_program: string; notes: string;
}

/**
 * تعديل ملف الطالب — نموذج عامل (Nebras OS).
 * يحمّل الطالب الحقيقي ويحدّث حقول البروفايل عبر PUT students/students/:id/ { profile }.
 */
@Component({
  selector: 'app-student-edit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NbPageHeaderComponent, NbPanelComponent, NbDatepickerComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        [title]="'تعديل ملف: ' + (form().arabic_name || 'طالب')"
        subtitle="تحديث البيانات الشخصية والوطنية والاحتياجات الخاصة للطالب."
      >
        <button class="nb-btn-ghost" (click)="cancel()">إلغاء</button>
        <button class="nb-btn-primary" (click)="save()" [disabled]="saving()">
          {{ saving() ? 'جارٍ الحفظ…' : 'حفظ التعديلات' }}
        </button>
      </nb-page-header>

      @if (loaded()) {
        <nb-panel title="البيانات الشخصية">
          <div class="form-grid">
            <div class="field"><label>الاسم بالعربية</label><input [(ngModel)]="model.arabic_name" /></div>
            <div class="field"><label>الاسم بالإنجليزية</label><input [(ngModel)]="model.english_name" /></div>
            <div class="field">
              <label>الجنس</label>
              <select [(ngModel)]="model.gender">
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
            <div class="field"><label>تاريخ الميلاد</label><nb-datepicker [(value)]="model.date_of_birth" ariaLabel="تاريخ الميلاد"></nb-datepicker></div>
            <div class="field"><label>الجنسية</label><input [(ngModel)]="model.nationality" /></div>
            <div class="field"><label>الهوية الوطنية / الإقامة</label><input [(ngModel)]="model.national_id" /></div>
            <div class="field"><label>رقم الجواز</label><input [(ngModel)]="model.passport" /></div>
            <div class="field"><label>الديانة</label><input [(ngModel)]="model.religion" /></div>
            <div class="field"><label>فصيلة الدم</label><input [(ngModel)]="model.blood_group" /></div>
          </div>
        </nb-panel>

        <nb-panel title="الاحتياجات والبرامج الخاصة">
          <div class="form-grid">
            <div class="field"><label>ذوي الاحتياجات الخاصة</label><input [(ngModel)]="model.special_needs" /></div>
            <div class="field"><label>صعوبات التعلم</label><input [(ngModel)]="model.learning_difficulty" /></div>
            <div class="field"><label>برامج الموهوبين</label><input [(ngModel)]="model.talented_program" /></div>
            <div class="field wide"><label>ملاحظات</label><textarea rows="3" [(ngModel)]="model.notes"></textarea></div>
          </div>
        </nb-panel>

        @if (error()) { <div class="err">{{ error() }}</div> }
      } @else {
        <div class="loading">جارٍ تحميل بيانات الطالب…</div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    nb-panel { display: block; margin-bottom: 16px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 5px; }
    .field.wide { grid-column: 1 / -1; }
    .field label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .field input, .field select, .field textarea {
      height: 34px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text);
      background: var(--nb-surface); outline: none;
    }
    .field textarea { height: auto; padding: 8px 10px; resize: vertical; }
    .field input:focus, .field select:focus, .field textarea:focus { border-color: var(--nb-primary-400); box-shadow: var(--nb-focus-ring); }
    .err { color: var(--nb-danger); font-size: 13px; margin-top: 8px; }
    .loading { text-align: center; padding: 40px; color: var(--nb-text-muted); font-size: 13px; }
  `]
})
export class StudentEditComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private studentsService = inject(StudentsService);

  private id = '';
  readonly loaded = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  model: ProfileForm = {
    arabic_name: '', english_name: '', gender: 'male', date_of_birth: '', nationality: '',
    national_id: '', passport: '', religion: '', blood_group: '',
    special_needs: '', learning_difficulty: '', talented_program: '', notes: '',
  };

  // للعرض في العنوان فقط
  form = signal<{ arabic_name: string }>({ arabic_name: '' });

  ngOnInit(): void {
    this.id = this.route.snapshot.params['id'];
    this.studentsService.getStudentById(this.id).subscribe((res) => {
      const p = (res?.data?.profile) ?? this.studentsService.selectedStudent().profile ?? {};
      (Object.keys(this.model) as (keyof ProfileForm)[]).forEach((k) => {
        if (p[k] !== undefined && p[k] !== null) this.model[k] = p[k];
      });
      this.form.set({ arabic_name: this.model.arabic_name });
      this.loaded.set(true);
    });
  }

  save(): void {
    this.saving.set(true);
    this.error.set(null);
    this.studentsService.updateStudent(this.id, { profile: { ...this.model } }).subscribe({
      next: () => { this.saving.set(false); this.router.navigate(['/students/details', this.id]); },
      error: (e) => { this.saving.set(false); this.error.set(e?.error?.error?.message || 'تعذّر حفظ التعديلات. تحقّق من الحقول والصلاحيات.'); },
    });
  }

  cancel(): void {
    this.router.navigate(['/students/details', this.id]);
  }
}
