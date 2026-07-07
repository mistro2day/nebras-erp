import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StudentsService } from '../students.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

/**
 * قائمة الطلاب — لغة تصميم Nebras OS (القسم 1d: جدول مؤسسي، شارات حالة، حقول بحث).
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-students-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="قائمة الطلاب"
        subtitle="عرض تفصيلي وسجل البحث المتقدم والفرز والتوزيع الأكاديمي للطلاب"
      >
        <button class="nb-btn-primary" (click)="navigateToCreate()">إضافة طالب جديد</button>
      </nb-page-header>

      <!-- شريط التصفية -->
      <div class="filter-bar">
        <div class="search">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (input)="onFilterChange()"
            placeholder="البحث برقم الطالب، الاسم، رقم الهوية أو الهاتف…"
          />
        </div>
        <div class="field">
          <label>حالة الطالب</label>
          <select [(ngModel)]="statusFilter" (change)="onFilterChange()">
            <option value="">الكل</option>
            <option value="registered">مسجل</option>
            <option value="active">نشط</option>
            <option value="suspended">موقوف</option>
            <option value="graduated">متخرج</option>
            <option value="withdrawn">منسحب</option>
          </select>
        </div>
      </div>

      <!-- الجدول -->
      <nb-panel [flush]="true">
        <div class="tbl">
          <div class="tbl-head">
            <span>الرقم الأكاديمي</span>
            <span>الاسم العربي</span>
            <span>الجنس</span>
            <span>الجنسية</span>
            <span>الحالة</span>
            <span>إجراءات</span>
          </div>
          @for (element of students(); track element.id) {
            <div class="tbl-row">
              <span>{{ element.student_number }}</span>
              <span class="strong">{{ element.profile?.arabic_name }}</span>
              <span>{{ element.profile?.gender === 'male' ? 'ذكر' : 'أنثى' }}</span>
              <span>{{ element.profile?.nationality }}</span>
              <span>
                <span [class]="statusBadge(element.status)">{{ statusText(element.status) }}</span>
              </span>
              <span>
                <button class="nb-btn-ghost sm" (click)="viewDetails(element.id)">عرض</button>
              </span>
            </div>
          }
          @if (students().length === 0) {
            <div class="tbl-empty">لا يوجد طلاب يطابقون خيارات البحث.</div>
          }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [
    `
      .page {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        min-width: 0;
      }

      .filter-bar {
        display: flex;
        gap: 12px;
        align-items: flex-end;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }

      .search {
        flex: 1;
        min-width: 260px;
        height: 34px;
        background: var(--nb-surface);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius);
        display: flex;
        align-items: center;
        padding: 0 12px;

        input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-family: var(--nb-font-family);
          font-size: 13px;
          color: var(--nb-text);

          &::placeholder { color: var(--nb-text-faint); }
        }
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 5px;

        label { font-size: 12px; font-weight: 600; color: var(--nb-text); }

        select {
          height: 34px;
          min-width: 180px;
          border: 1px solid var(--nb-border);
          border-radius: var(--nb-radius);
          padding: 0 10px;
          font-family: var(--nb-font-family);
          font-size: 13px;
          color: var(--nb-text);
          background: var(--nb-surface);
          outline: none;
        }
      }

      /* جدول */
      .tbl { display: flex; flex-direction: column; }
      .tbl-head,
      .tbl-row {
        display: grid;
        grid-template-columns: 1.2fr 1.8fr 0.8fr 1fr 1fr 0.8fr;
        gap: 8px;
        padding: 9px 16px;
        align-items: center;
      }
      .tbl-head {
        background: var(--nb-surface-raised);
        border-bottom: 1px solid var(--nb-border-soft);
        padding: 8px 16px;
        font-size: 11px;
        font-weight: 700;
        color: var(--nb-text-muted);
      }
      .tbl-row {
        border-bottom: 1px solid var(--nb-border-row);
        font-size: 13px;
        color: var(--nb-text);
      }
      .tbl-row:last-child { border-bottom: none; }
      .tbl-row:hover { background: var(--nb-surface-raised); }
      .strong { font-weight: 600; }
      .tbl-empty {
        padding: 28px 16px;
        text-align: center;
        font-size: 13px;
        color: var(--nb-text-muted);
      }

      .nb-btn-ghost.sm {
        height: 26px;
        padding: 0 12px;
        font-size: 12px;
      }
    `,
  ],
})
export class StudentsListComponent implements OnInit {
  private readonly studentsService = inject(StudentsService);
  private readonly router = inject(Router);

  readonly students = this.studentsService.students;

  searchQuery = '';
  statusFilter = '';

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    const params: Record<string, string> = {};
    if (this.searchQuery) params['search'] = this.searchQuery;
    if (this.statusFilter) params['status'] = this.statusFilter;
    this.studentsService.getStudents(params).subscribe();
  }

  onFilterChange(): void {
    this.loadStudents();
  }

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      active: 'nb-badge-success',
      registered: 'nb-badge-info',
      suspended: 'nb-badge-danger',
      graduated: 'nb-badge-ai',
      withdrawn: 'nb-badge-neutral',
    };
    return map[status] || 'nb-badge-neutral';
  }

  statusText(status: string): string {
    const map: Record<string, string> = {
      active: 'نشط',
      registered: 'مسجل',
      suspended: 'موقوف',
      graduated: 'متخرج',
      withdrawn: 'منسحب',
    };
    return map[status] || status;
  }

  viewDetails(id: string): void {
    this.router.navigate([`/features/students/details/${id}`]);
  }

  navigateToCreate(): void {
    this.router.navigate(['/features/students/create']);
  }
}
