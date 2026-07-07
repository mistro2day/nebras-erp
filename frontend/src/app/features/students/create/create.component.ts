import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { StudentsService } from '../students.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

/**
 * تسجيل طالب جديد — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-student-create',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="تسجيل طالب جديد"
        subtitle="تسجيل الطلاب الجدد وتوزيعهم الأكاديمي بناءً على قائمة المقبولين من قسم القبول والتسجيل"
      ></nb-page-header>

      <nb-panel
        title="اختيار طلب قبول مقبول"
        subtitle="تنص قواعد العمل على ضرورة تسجيل الطالب بناءً على طلب مقبول قادم من نظام القبول والتسجيل."
      >
        <div class="form-body">
          <div class="field">
            <label>طلب الالتحاق المقبول</label>
            <select (change)="onApplicantSelected($any($event.target).value)">
              <option value="">— اختر طلباً —</option>
              @for (applicant of applicants(); track applicant.id) {
                <option [value]="applicant.id">{{ applicant.arabic_full_name }} ({{ applicant.application_number }})</option>
              }
            </select>
          </div>

          @if (selectedApplicant(); as a) {
            <div class="applicant-preview">
              <h3>بيانات طلب الالتحاق</h3>
              <div class="preview-grid">
                <div class="preview-item"><strong>الاسم بالكامل:</strong> {{ a.arabic_full_name }}</div>
                <div class="preview-item"><strong>الجنس:</strong> {{ a.gender === 'male' ? 'ذكر' : 'أنثى' }}</div>
                <div class="preview-item"><strong>تاريخ الميلاد:</strong> {{ a.date_of_birth }}</div>
                <div class="preview-item"><strong>الجنسية:</strong> {{ a.nationality }}</div>
                <div class="preview-item"><strong>رقم الهوية الوطنية:</strong> {{ a.national_id }}</div>
              </div>
              <div class="form-actions">
                <button class="nb-btn-secondary" (click)="cancel()">إلغاء</button>
                <button class="nb-btn-primary" (click)="registerStudent()">إكمال التسجيل وتوليد الرقم الأكاديمي</button>
              </div>
            </div>
          }

          @if (applicants().length === 0) {
            <div class="no-applicants">لا توجد طلبات قبول معتمدة ومقبولة غير مسجلة حالياً.</div>
          }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .form-body { display: flex; flex-direction: column; gap: 16px; max-width: 800px; }
    .field { display: flex; flex-direction: column; gap: 5px; max-width: 480px; }
    .field label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .field select {
      height: 34px;
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius);
      padding: 0 10px;
      font-family: var(--nb-font-family);
      font-size: 13px;
      color: var(--nb-text);
      background: var(--nb-surface);
      outline: none;
    }
    .applicant-preview {
      padding: 16px;
      background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border-soft);
      border-radius: var(--nb-radius-card);
    }
    .applicant-preview h3 { color: var(--nb-primary-600); margin: 0 0 12px; font-size: 14px; font-weight: 700; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 8px; }
    .preview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 16px; font-size: 13px; color: var(--nb-text); }
    .preview-item strong { color: var(--nb-text-muted); font-weight: 600; }
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; }
    .no-applicants { text-align: center; padding: 28px; color: var(--nb-text-muted); font-size: 13px; }
  `]
})
export class StudentCreateComponent implements OnInit {
  private studentsService = inject(StudentsService);
  private router = inject(Router);
  private http = inject(HttpClient);

  applicants = signal<any[]>([]);
  selectedApplicant = signal<any | null>(null);

  ngOnInit() {
    this.loadAcceptedApplicants();
  }

  loadAcceptedApplicants() {
    // جلب طلبات الالتحاق المقبولة من موديول Admissions
    this.http.get<any>('/api/v1/admissions/applicants/?status=accepted').subscribe(res => {
      if (res && res.success) {
        this.applicants.set(res.data);
      }
    });
  }

  onApplicantSelected(id: string) {
    const applicant = this.applicants().find(a => a.id === id);
    this.selectedApplicant.set(applicant || null);
  }

  registerStudent() {
    const applicant = this.selectedApplicant();
    if (!applicant) return;

    this.studentsService.createStudentFromApplicant(applicant.id).subscribe(res => {
      if (res && res.success) {
        this.router.navigate([`/features/students/details/${res.data.id}`]);
      }
    });
  }

  cancel() {
    this.router.navigate(['/features/students/list']);
  }
}