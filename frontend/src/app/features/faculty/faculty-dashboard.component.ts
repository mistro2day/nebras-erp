import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TeacherCardComponent, TeacherInfo } from '../../shared/components/teacher-card/teacher-card.component';
import { TenantService } from '../../core/services/tenant.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

/**
 * شؤون المعلمين — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-faculty-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TeacherCardComponent, NbPageHeaderComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="إدارة شؤون المعلمين وأعضاء هيئة التدريس"
        [subtitle]="'بوابة إدارة وتعيين المعلمين وأعضاء الهيئة الأكاديمية لـ ' + (($any(tenantService).currentTenant())?.nameAr || 'نبراس ERP')"
      ></nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="إجمالي الكادر الأكاديمي" [value]="teachers().length"></nb-stat-card>
        <nb-stat-card label="طلبات قيد المراجعة" [value]="getPendingCount()" [valueKind]="getPendingCount() ? 'warning' : 'default'"></nb-stat-card>
      </div>

      <h2 class="section-title">أعضاء هيئة التدريس النشطين</h2>
      <div class="cards-grid">
        @for (teacher of teachers(); track teacher.id) {
          <app-teacher-card [teacher]="teacher"></app-teacher-card>
        }
        @if (teachers().length === 0) {
          <div class="no-data">لا يوجد كادر أكاديمي مسجل حالياً في هذا الفرع.</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .section-title { font-size: 14px; font-weight: 700; color: var(--nb-text); margin: 0 0 12px; }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }
    .no-data {
      grid-column: 1 / -1;
      text-align: center;
      padding: 28px;
      color: var(--nb-text-muted);
      font-size: 13px;
    }
  `]
})
export class FacultyDashboardComponent implements OnInit {
  tenantService = inject(TenantService);
  http = inject(HttpClient);

  teachers = signal<TeacherInfo[]>([]);

  ngOnInit() {
    this.loadTeachers();
  }

  loadTeachers() {
    this.http.get<any>('/api/v1/faculty/members/').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.teachers.set(res.data);
        }
      }
    });
  }

  getPendingCount(): number {
    return this.teachers().filter(t => t.status === 'pending_review' || t.status === 'draft').length;
  }
}