import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { StudentsService } from '../students.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-student-create',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule],
  template: `
    <div class="create-container" dir="rtl">
      <header class="create-header animate-fade-in">
        <div class="header-info">
          <h1>تسجيل طالب جديد</h1>
          <p>تسجيل الطلاب الجدد وتوزيعهم الأكاديمي بناءً على قائمة المقبولين من قسم القبول والتسجيل</p>
        </div>
      </header>

      <mat-card class="form-card animate-slide-up">
        <mat-card-header>
          <mat-card-title>اختيار طلب قبول مقبول</mat-card-title>
          <mat-card-subtitle>تنص قواعد العمل على ضرورة تسجيل الطالب بناءً على طلب مقبول قادم من نظام القبول والتسجيل.</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="form-content">
          <mat-form-field appearance="outline">
            <mat-label>طلب الالتحاق المقبول</mat-label>
            <mat-select (selectionChange)="onApplicantSelected($event.value)">
              <mat-option *ngFor="let applicant of applicants()" [value]="applicant.id">
                {{ applicant.arabic_full_name }} ({{ applicant.application_number }})
              </mat-option>
            </mat-select>
          </mat-form-field>

          <div class="applicant-preview" *ngIf="selectedApplicant()">
            <h3>بيانات طلب الالتحاق</h3>
            <div class="preview-grid">
              <div class="preview-item"><strong>الاسم بالكامل:</strong> {{ selectedApplicant().arabic_full_name }}</div>
              <div class="preview-item"><strong>الجنس:</strong> {{ selectedApplicant().gender === 'male' ? 'ذكر' : 'أنثى' }}</div>
              <div class="preview-item"><strong>تاريخ الميلاد:</strong> {{ selectedApplicant().date_of_birth }}</div>
              <div class="preview-item"><strong>الجنسية:</strong> {{ selectedApplicant().nationality }}</div>
              <div class="preview-item"><strong>رقم الهوية الوطنية:</strong> {{ selectedApplicant().national_id }}</div>
            </div>

            <div class="form-actions">
              <button mat-flat-button color="primary" (click)="registerStudent()">
                <mat-icon>how_to_reg</mat-icon> إكمال عملية التسجيل وتوليد الرقم الأكاديمي
              </button>
              <button mat-button (click)="cancel()">إلغاء</button>
            </div>
          </div>

          <div class="no-applicants" *ngIf="applicants().length === 0">
            <mat-icon>info</mat-icon>
            <p>لا توجد طلبات قبول معتمدة ومقبولة غير مسجلة حالياً.</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .create-container {
      padding: 2rem;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #f8fafc;
      min-height: 100vh;
      font-family: 'Outfit', 'Cairo', sans-serif;
    }

    .create-header {
      margin-bottom: 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 1.5rem;
    }

    .create-header h1 {
      font-size: 2.25rem;
      font-weight: 800;
      background: linear-gradient(to left, #818cf8, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }

    .create-header p {
      color: #94a3b8;
      margin: 0.5rem 0 0 0;
    }

    .form-card {
      background: rgba(30, 41, 59, 0.5) !important;
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 16px !important;
      color: #f8fafc !important;
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }

    .form-content {
      margin-top: 1.5rem;
    }

    .applicant-preview {
      margin-top: 2rem;
      padding: 1.5rem;
      background: rgba(15, 23, 42, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      animation: fadeIn 0.5s ease-out;
    }

    .applicant-preview h3 {
      color: #818cf8;
      margin-top: 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 0.5rem;
    }

    .preview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .preview-item strong {
      color: #94a3b8;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    .no-applicants {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem;
      color: #94a3b8;
    }

    .no-applicants mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 1rem;
    }

    .animate-fade-in { animation: fadeIn 0.8s ease-out; }
    .animate-slide-up { animation: slideUp 0.8s ease-out; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
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