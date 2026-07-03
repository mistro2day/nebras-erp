import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { StudentsService, Student } from '../students.service';

@Component({
  selector: 'app-student-details',
  standalone: true,
  imports: [CommonModule, MatTabsModule, MatCardModule, MatIconModule, MatButtonModule, MatDividerModule],
  template: `
    <div class="details-container" dir="rtl" *ngIf="student()">
      <!-- Header Summary Card -->
      <mat-card class="summary-card animate-fade-in">
        <mat-card-content class="summary-content">
          <div class="avatar-section">
            <div class="avatar-placeholder">
              <mat-icon>person</mat-icon>
            </div>
            <div class="basic-info">
              <h2>{{ student().profile?.arabic_name }}</h2>
              <p class="eng-name">{{ student().profile?.english_name }}</p>
              <div class="badge-row">
                <span class="badge" [ngClass]="student().status">{{ student().status }}</span>
                <span class="num-badge">رقم الطالب: {{ student().student_number }}</span>
              </div>
            </div>
          </div>
          
          <div class="quick-stats">
            <div class="stat-item">
              <span class="label">الجنسية</span>
              <span class="val">{{ student().profile?.nationality }}</span>
            </div>
            <div class="stat-item">
              <span class="label">الجنس</span>
              <span class="val">{{ student().profile?.gender === 'male' ? 'ذكر' : 'أنثى' }}</span>
            </div>
            <div class="stat-item">
              <span class="label">تاريخ الميلاد</span>
              <span class="val">{{ student().profile?.date_of_birth }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Detailed Tabs -->
      <div class="tabs-card animate-slide-up">
        <mat-tab-group>
          <!-- 1. Profile Details -->
          <mat-tab label="الملف الشخصي">
            <div class="tab-content">
              <h3>البيانات الشخصية والوطنية</h3>
              <div class="info-grid">
                <div class="info-item"><strong>الهوية الوطنية / الإقامة:</strong> {{ student().profile?.national_id || 'غير متوفر' }}</div>
                <div class="info-item"><strong>رقم جواز السفر:</strong> {{ student().profile?.passport || 'غير متوفر' }}</div>
                <div class="info-item"><strong>الديانة:</strong> {{ student().profile?.religion || 'غير متوفر' }}</div>
                <div class="info-item"><strong>فصيلة الدم:</strong> {{ student().profile?.blood_group || 'غير متوفر' }}</div>
                <div class="info-item"><strong>اللغات المفضلة:</strong> {{ student().profile?.languages?.join(', ') || 'العربية' }}</div>
              </div>
              
              <mat-divider></mat-divider>
              
              <h3>الاحتياجات والبرامج الخاصة</h3>
              <div class="info-grid">
                <div class="info-item"><strong>ذوي الاحتياجات الخاصة:</strong> {{ student().profile?.special_needs || 'لا يوجد' }}</div>
                <div class="info-item"><strong>صعوبات التعلم:</strong> {{ student().profile?.learning_difficulty || 'لا يوجد' }}</div>
                <div class="info-item"><strong>برامج الموهوبين:</strong> {{ student().profile?.talented_program || 'لا يوجد' }}</div>
              </div>
            </div>
          </mat-tab>

          <!-- 2. Medical Profile -->
          <mat-tab label="الملف الطبي">
            <div class="tab-content">
              <h3>الوضع الصحي والاحتياطات الطبية</h3>
              <div class="info-grid" *ngIf="student().medical_profile">
                <div class="info-item"><strong>الحساسية:</strong> {{ student().medical_profile.allergies?.join(', ') || 'لا يوجد' }}</div>
                <div class="info-item"><strong>الأمراض المزمنة:</strong> {{ student().medical_profile.chronic_diseases?.join(', ') || 'لا يوجد' }}</div>
                <div class="info-item"><strong>الأدوية الموصوفة:</strong> {{ student().medical_profile.medication?.join(', ') || 'لا يوجد' }}</div>
                <div class="info-item"><strong>طبيب الأسرة المفضل:</strong> {{ student().medical_profile.doctor || 'غير متوفر' }}</div>
              </div>
              
              <mat-divider></mat-divider>
              
              <h3>الاتصال الطبي في الطوارئ</h3>
              <div class="emergency-box" *ngIf="student().medical_profile?.emergency_medical_contact">
                <p><strong>اسم جهة الاتصال:</strong> {{ student().medical_profile.emergency_medical_contact.name || 'غير متوفر' }}</p>
                <p><strong>رقم الهاتف:</strong> {{ student().medical_profile.emergency_medical_contact.phone || 'غير متوفر' }}</p>
              </div>
            </div>
          </mat-tab>

          <!-- 3. Family relations -->
          <mat-tab label="شؤون العائلة">
            <div class="tab-content">
              <h3>أولياء الأمور والمرافقين</h3>
              <div class="family-list">
                <div class="family-item" *ngFor="let member of student().family_relations">
                  <div class="member-header">
                    <h4>{{ member.full_name }}</h4>
                    <span class="rel-badge">{{ member.relationship }}</span>
                  </div>
                  <div class="member-details">
                    <p><strong>الهاتف:</strong> {{ member.phone }}</p>
                    <p><strong>البريد الإلكتروني:</strong> {{ member.email || 'غير متوفر' }}</p>
                    <p><strong>الهوية الوطنية:</strong> {{ member.national_id || 'غير متوفر' }}</p>
                  </div>
                </div>
                <div class="no-data" *ngIf="student().family_relations?.length === 0">
                  <p>لم يتم تسجيل أفراد العائلة بعد.</p>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- 4. Academic Timeline & History -->
          <mat-tab label="الخط الزمني للأنشطة">
            <div class="tab-content">
              <h3>سجل أنشطة دورة حياة الطالب</h3>
              <div class="timeline">
                <div class="timeline-event" *ngFor="let event of timeline()">
                  <div class="event-icon">
                    <mat-icon *ngIf="event.type === 'status_change'">sync</mat-icon>
                    <mat-icon *ngIf="event.type === 'promotion'">arrow_upward</mat-icon>
                    <mat-icon *ngIf="event.type === 'document_upload'">cloud_upload</mat-icon>
                  </div>
                  <div class="event-details">
                    <div class="event-header">
                      <h4>{{ event.title }}</h4>
                      <span class="event-date">{{ event.date | date:'medium' }}</span>
                    </div>
                    <p class="event-comment">{{ event.comments }}</p>
                  </div>
                </div>
                <div class="no-data" *ngIf="timeline().length === 0">
                  <p>لا يوجد سجل أنشطة مسجل للطالب حالياً.</p>
                </div>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    </div>
  `,
  styles: [`
    .details-container {
      padding: 2rem;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #f8fafc;
      min-height: 100vh;
      font-family: 'Outfit', 'Cairo', sans-serif;
    }

    .summary-card {
      background: rgba(30, 41, 59, 0.7) !important;
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 16px !important;
      color: #f8fafc !important;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .summary-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 2rem;
    }

    .avatar-section {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .avatar-placeholder {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(129, 140, 248, 0.15);
      color: #818cf8;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(129, 140, 248, 0.3);
    }

    .avatar-placeholder mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
    }

    .basic-info h2 {
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0;
    }

    .eng-name {
      color: #94a3b8;
      margin: 0.25rem 0 0.75rem 0;
    }

    .badge-row {
      display: flex;
      gap: 0.75rem;
    }

    .badge {
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: capitalize;
    }

    .badge.active { background: rgba(16, 185, 129, 0.2); color: #10b981; }
    .badge.registered { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
    
    .num-badge {
      background: rgba(255, 255, 255, 0.08);
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      color: #cbd5e1;
    }

    .quick-stats {
      display: flex;
      gap: 2rem;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .stat-item .label {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .stat-item .val {
      font-size: 1.1rem;
      font-weight: 600;
      color: #f8fafc;
      margin-top: 0.25rem;
    }

    .tabs-card {
      background: rgba(30, 41, 59, 0.5);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1.5rem;
    }

    ::ng-deep .mat-mdc-tab-group {
      --mdc-tab-indicator-active-indicator-color: #818cf8;
      --mat-tab-header-active-label-text-color: #818cf8;
      --mat-tab-header-inactive-label-text-color: #94a3b8;
    }

    .tab-content {
      padding: 2rem 1rem;
    }

    .tab-content h3 {
      color: #818cf8;
      font-size: 1.2rem;
      margin-top: 0;
      margin-bottom: 1.5rem;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .info-item {
      background: rgba(15, 23, 42, 0.3);
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.03);
    }

    .info-item strong {
      color: #94a3b8;
      display: block;
      margin-bottom: 4px;
    }

    mat-divider {
      background-color: rgba(255, 255, 255, 0.08) !important;
      margin: 2rem 0 !important;
    }

    .family-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .family-item {
      background: rgba(15, 23, 42, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 1.5rem;
    }

    .member-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 0.5rem;
    }

    .member-header h4 {
      margin: 0;
      font-size: 1.1rem;
    }

    .rel-badge {
      background: rgba(129, 140, 248, 0.15);
      color: #818cf8;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .member-details p {
      margin: 0.5rem 0;
      color: #cbd5e1;
    }

    .timeline {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      position: relative;
      padding-right: 2rem;
    }

    .timeline::before {
      content: '';
      position: absolute;
      right: 9px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: rgba(129, 140, 248, 0.2);
    }

    .timeline-event {
      display: flex;
      gap: 1.5rem;
      position: relative;
    }

    .event-icon {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #818cf8;
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      right: -29px;
      top: 4px;
      border: 4px solid #0f172a;
      color: white;
    }

    .event-icon mat-icon {
      font-size: 10px;
      width: 10px;
      height: 10px;
    }

    .event-details {
      background: rgba(15, 23, 42, 0.3);
      padding: 1.25rem;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      flex: 1;
    }

    .event-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .event-header h4 {
      margin: 0;
      font-size: 1rem;
      color: #f8fafc;
    }

    .event-date {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .event-comment {
      margin: 0;
      color: #cbd5e1;
    }

    .no-data {
      text-align: center;
      padding: 3rem;
      color: #94a3b8;
    }

    .animate-fade-in { animation: fadeIn 0.8s ease-out; }
    .animate-slide-up { animation: slideUp 0.8s ease-out; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class StudentDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private studentsService = inject(StudentsService);

  student = this.studentsService.selectedStudent;
  timeline = signal<any[]>([]);

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.studentsService.getStudentById(id).subscribe();
        this.studentsService.getTimeline(id).subscribe(res => {
          if (res && res.success) {
            this.timeline.set(res.data);
          }
        });
      }
    });
  }
}