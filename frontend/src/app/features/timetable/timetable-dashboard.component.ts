import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TenantService } from '../../core/services/tenant.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

/**
 * إدارة الجدول الأكاديمي والجدولة الذكية — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-timetable-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbPageHeaderComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="إدارة الجدول الأكاديمي والجدولة الذكية"
        [subtitle]="'توزيع الفصول الدراسية وحصص المعلمين لـ ' + (($any(tenantService).currentTenant())?.nameAr || 'نبراس ERP')"
      ></nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="الجداول المفعلة" [value]="timetablesCount()"></nb-stat-card>
        <nb-stat-card label="توزيع الحصص الأسبوعية" [value]="entriesCount()" valueKind="success"></nb-stat-card>
        <nb-stat-card label="نسبة إشغال القاعات" value="82" suffix="%" valueKind="info"></nb-stat-card>
        <nb-stat-card label="التعارضات النشطة" [value]="0"></nb-stat-card>
      </div>

      <h2 class="section-title">الجداول الدراسية النشطة</h2>
      <div class="cards-grid">
        @for (tt of timetables(); track tt.id) {
          <div class="nb-card tt-card">
            <div class="card-header">
              <span [class]="tt.status === 'published' ? 'nb-badge-success' : 'nb-badge-warning'">{{ tt.status === 'published' ? 'منشور' : 'مسودة' }}</span>
              <h3>{{ tt.name }}</h3>
            </div>
            <p class="meta-info">السنة الدراسية: {{ tt.academic_year }} | الفصل الدراسي: {{ tt.term }}</p>
            <div class="card-footer">
              <button class="nb-btn-secondary sm">عرض جدول الحصص</button>
            </div>
          </div>
        }
        @if (timetables().length === 0) {
          <div class="no-data">لا توجد جداول أكاديمية نشطة حالياً.</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .section-title { font-size: 14px; font-weight: 700; color: var(--nb-text); margin: 0 0 12px; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .tt-card { display: flex; flex-direction: column; gap: 10px; }
    .card-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .card-header h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .meta-info { font-size: 12px; color: var(--nb-text-muted); margin: 0; }
    .card-footer { display: flex; justify-content: flex-start; margin-top: 4px; }
    .nb-btn-secondary.sm { height: 26px; padding: 0 12px; font-size: 12px; }
    .no-data { grid-column: 1 / -1; text-align: center; padding: 28px; color: var(--nb-text-muted); font-size: 13px; }
  `]
})
export class TimetableDashboardComponent implements OnInit {
  tenantService = inject(TenantService);
  http = inject(HttpClient);

  timetables = signal<any[]>([]);
  timetablesCount = signal(0);
  entriesCount = signal(0);

  ngOnInit() {
    this.loadTimetableData();
  }

  loadTimetableData() {
    this.http.get<any>('/api/v1/timetable/timetables/').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.timetables.set(res.data);
          this.timetablesCount.set(res.data.length);
        }
      }
    });

    this.http.get<any>('/api/v1/timetable/entries/').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.entriesCount.set(res.data.length);
        }
      }
    });
  }
}
