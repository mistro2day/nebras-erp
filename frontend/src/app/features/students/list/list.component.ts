import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { StudentsService } from '../students.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import {
  ConfirmDialogComponent, ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { pickList } from '../../admissions/shared/admissions.shared';

import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

@Component({
  selector: 'app-students-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatDialogModule, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  animations: [
    trigger('listAnimation', [
      transition('* <=> *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(15px)' }),
          stagger('40ms', [
            animate('350ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="قائمة الطلاب"
        subtitle="البحث المتقدم والتوزيع الأكاديمي للطلاب مع ميزات العرض الشبكي وجدول البيانات."
      >
        <div class="header-actions">
          <button class="nb-btn-secondary" (click)="exportCsv()" [disabled]="exporting()">
            {{ exporting() ? 'جارٍ التصدير…' : 'تصدير CSV' }}
          </button>
          <button class="nb-btn-primary" (click)="goCreate()">إضافة طالب جديد</button>
        </div>
      </nb-page-header>

      <!-- مؤشرات سريعة للطلاب مع أشرطة تقدم حركية -->
      <div class="stats-grid">
        <div class="metric-card">
          <span class="label">إجمالي الطلاب المسجلين</span>
          <span class="value">{{ students().length }}</span>
          <div class="progress-bar-container">
            <div class="progress-bar-fill active" [style.width.%]="100"></div>
          </div>
        </div>
        <div class="metric-card">
          <span class="label">الطلاب النشطين</span>
          <span class="value success">{{ countByStatus('active') }}</span>
          <div class="progress-bar-container">
            <div class="progress-bar-fill success" [style.width.%]="percentOf('active')"></div>
          </div>
        </div>
        <div class="metric-card">
          <span class="label">الحسابات الموقوفة</span>
          <span class="value danger">{{ countByStatus('suspended') }}</span>
          <div class="progress-bar-container">
            <div class="progress-bar-fill danger" [style.width.%]="percentOf('suspended')"></div>
          </div>
        </div>
        <div class="metric-card">
          <span class="label">الخريجين والمنسحبين</span>
          <span class="value info">{{ countByStatus('graduated') + countByStatus('withdrawn') }}</span>
          <div class="progress-bar-container">
            <div class="progress-bar-fill info" [style.width.%]="percentOf('graduated') + percentOf('withdrawn')"></div>
          </div>
        </div>
      </div>

      <!-- أدوات الفرز وعرض التخطيط -->
      <div class="filter-bar">
        <div class="search">
          <input type="text" [(ngModel)]="searchQuery" (input)="onFilterChange()"
                 aria-label="البحث عن طالب"
                 placeholder="البحث برقم الطالب، الاسم، رقم الهوية..." />
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
        
        <!-- تبديل مظهر العرض -->
        <div class="view-toggle">
          <button [class.active]="viewMode() === 'grid'" (click)="viewMode.set('grid')">
            <span class="icon">▤</span> العرض الشبكي
          </button>
          <button [class.active]="viewMode() === 'table'" (click)="viewMode.set('table')">
            <span class="icon">☰</span> جدول البيانات
          </button>
        </div>
      </div>

      @if (loading()) {
        <nb-loading message="جاري تحميل الطلاب..."></nb-loading>
      } @else {
        <!-- عرض الجدول التقليدي -->
        <div *ngIf="viewMode() === 'table'" @fadeSlide>
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
              @for (element of paged(); track element.id) {
                <div class="tbl-row">
                  <span class="mono">{{ element.student_number }}</span>
                  <span class="strong">{{ element.profile.arabic_name || '—' }}</span>
                  <span>{{ element.profile.gender === 'male' ? 'ذكر' : element.profile.gender === 'female' ? 'أنثى' : '—' }}</span>
                  <span>{{ element.profile.nationality || '—' }}</span>
                  <span><span [class]="statusBadge(element.status)">{{ statusText(element.status) }}</span></span>
                  <span class="row-actions">
                    <button class="nb-btn-ghost sm" (click)="viewDetails(element.id)">عرض</button>
                    <button class="nb-btn-secondary sm" (click)="edit(element.id)">تعديل</button>
                    <button class="nb-btn-danger sm" (click)="archive(element)">أرشفة</button>
                  </span>
                </div>
              }
              @if (students().length === 0) {
                <div class="tbl-empty">لا يوجد طلاب يطابقون خيارات البحث.</div>
              }
            </div>
          </nb-panel>
        </div>

        <!-- عرض البطاقات الشبكي الاحترافي مع الأنيميشن المذهل -->
        <div *ngIf="viewMode() === 'grid'" [@listAnimation]="paged().length" class="student-cards-grid">
          @for (student of paged(); track student.id) {
            <div class="student-card" (click)="viewDetails(student.id)">
              <div class="card-status-accent" [class]="student.status"></div>
              
              <div class="student-avatar-container">
                <div class="student-avatar" [class]="student.profile.gender">
                  {{ getInitials(student.profile.arabic_name) }}
                </div>
              </div>
              
              <div class="student-info">
                <h3 class="student-name">{{ student.profile.arabic_name || 'طالب نبراس' }}</h3>
                <span class="student-id">{{ student.student_number }}</span>
                
                <div class="meta-row">
                  <span class="meta-item">📍 {{ student.profile.nationality || 'سوداني' }}</span>
                  <span class="meta-item">🚻 {{ student.profile.gender === 'male' ? 'ذكر' : 'أنثى' }}</span>
                </div>
              </div>
              
              <div class="card-footer">
                <span [class]="statusBadge(student.status)">{{ statusText(student.status) }}</span>
                <div class="card-actions" (click)="$event.stopPropagation()">
                  <button class="action-icon-btn" title="تعديل" (click)="edit(student.id)">✏️</button>
                  <button class="action-icon-btn danger" title="أرشفة" (click)="archive(student)">🗑️</button>
                </div>
              </div>
            </div>
          }
          @if (students().length === 0) {
            <div class="grid-empty-state">لا يوجد طلاب مطبقين للبحث.</div>
          }
        </div>
      }

      @if (totalPages() > 1) {
        <div class="pager">
          <button class="nb-btn-ghost sm" [disabled]="page() === 1" (click)="prev()">السابق</button>
          <span class="pager-info">صفحة {{ page() }} من {{ totalPages() }} · {{ students().length }} طالب</span>
          <button class="nb-btn-ghost sm" [disabled]="page() === totalPages()" (click)="next()">التالي</button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
      .header-actions { display: flex; gap: 8px; }
      
      /* أشرطة مؤشرات وإنجاز الطلاب */
      .metric-card {
        background: var(--nb-surface);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card);
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        position: relative;
      }
      .metric-card .label { font-size: 12px; color: var(--nb-text-muted); }
      .metric-card .value { font-size: 24px; font-weight: 700; color: var(--nb-text); }
      .metric-card .value.success { color: var(--nb-success); }
      .metric-card .value.danger { color: var(--nb-danger); }
      .metric-card .value.info { color: var(--nb-info); }
      
      .progress-bar-container {
        height: 4px;
        background: var(--nb-surface-raised);
        border-radius: 2px;
        overflow: hidden;
        margin-top: 4px;
      }
      .progress-bar-fill {
        height: 100%;
        background: var(--nb-primary-500);
        border-radius: 2px;
        transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .progress-bar-fill.success { background: var(--nb-success); }
      .progress-bar-fill.danger { background: var(--nb-danger); }
      .progress-bar-fill.info { background: var(--nb-info); }

      .filter-bar { display: flex; gap: 12px; align-items: flex-end; margin-bottom: 16px; flex-wrap: wrap; }
      .search { flex: 1; min-width: 260px; height: 34px; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius); display: flex; align-items: center; padding: 0 12px; }
      .search input { flex: 1; border: none; background: transparent; outline: none; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); }
      .search input::placeholder { color: var(--nb-text-faint); }
      
      .field { display: flex; flex-direction: column; gap: 5px; }
      .field label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
      .field select { height: 34px; min-width: 180px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; }
      
      .view-toggle {
        display: flex;
        background: var(--nb-surface-raised);
        border: 1px solid var(--nb-border-soft);
        border-radius: var(--nb-radius);
        padding: 2px;
        height: 34px;
        align-items: center;
      }
      .view-toggle button {
        background: transparent;
        border: none;
        border-radius: var(--nb-radius-small, 4px);
        font-family: var(--nb-font-family);
        font-size: 12px;
        font-weight: 600;
        color: var(--nb-text-secondary);
        padding: 5px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        height: 28px;
        transition: all 0.2s;
      }
      .view-toggle button.active {
        background: var(--nb-surface);
        color: var(--nb-primary-600);
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      }

      /* العرض الشبكي المتقدم */
      .student-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 16px;
        margin-bottom: 20px;
      }
      .student-card {
        background: var(--nb-surface);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card);
        overflow: hidden;
        position: relative;
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 6px rgba(0,0,0,0.02);
      }
      .student-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 16px rgba(0,0,0,0.06);
        border-color: var(--nb-primary-300);
      }
      .card-status-accent {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 4px;
        background: var(--nb-border-soft);
      }
      .card-status-accent.active { background: var(--nb-success); }
      .card-status-accent.registered { background: var(--nb-info); }
      .card-status-accent.suspended { background: var(--nb-danger); }
      
      .student-avatar-container {
        margin: 12px 0;
        position: relative;
      }
      .student-avatar {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: 700;
        color: white;
        background: var(--nb-primary-500);
      }
      .student-avatar.male { background: linear-gradient(135deg, #007aff, #0056b3); }
      .student-avatar.female { background: linear-gradient(135deg, #af52de, #7d26cd); }
      
      .student-name {
        font-size: 14px;
        font-weight: 700;
        color: var(--nb-text);
        margin: 0 0 4px;
      }
      .student-id {
        font-size: 12px;
        color: var(--nb-text-muted);
        font-family: monospace;
      }
      .meta-row {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin: 12px 0 0;
        width: 100%;
        border-top: 1px dashed var(--nb-border-soft);
        padding-top: 10px;
      }
      .meta-item {
        font-size: 12px;
        color: var(--nb-text-secondary);
      }
      .card-footer {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 14px;
      }
      .card-actions {
        display: flex;
        gap: 6px;
      }
      .action-icon-btn {
        background: var(--nb-surface-raised);
        border: 1px solid var(--nb-border-soft);
        border-radius: var(--nb-radius);
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .action-icon-btn:hover {
        background: var(--nb-primary-50);
        border-color: var(--nb-primary-300);
      }
      .action-icon-btn.danger:hover {
        background: var(--nb-danger-50);
        border-color: var(--nb-danger-300);
      }

      /* جدول تقليدي */
      .tbl { display: flex; flex-direction: column; }
      .tbl-head, .tbl-row { display: grid; grid-template-columns: 1.2fr 1.8fr 0.7fr 1fr 1fr 1.6fr; gap: 8px; padding: 9px 16px; align-items: center; }
      .tbl-head { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); padding: 8px 16px; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
      .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text); }
      .tbl-row:last-child { border-bottom: none; }
      .tbl-row:hover { background: var(--nb-surface-raised); }
      .strong { font-weight: 600; }
      .mono { font-variant-numeric: tabular-nums; color: var(--nb-text-secondary); }
      .row-actions { display: flex; gap: 6px; flex-wrap: wrap; }
      .tbl-empty, .grid-empty-state { padding: 40px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); width: 100%; grid-column: 1 / -1; }
      .nb-btn-ghost.sm, .nb-btn-secondary.sm, .nb-btn-danger.sm { height: 26px; padding: 0 12px; font-size: 12px; }
      
      .pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 14px; }
      .pager-info { font-size: 12px; color: var(--nb-text-muted); }
      
      .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px; }
    `,
  ],
})
export class StudentsListComponent implements OnInit {
  private readonly studentsService = inject(StudentsService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly students = this.studentsService.students;
  readonly loading = this.studentsService.loading;
  readonly exporting = signal(false);
  readonly viewMode = signal<'grid' | 'table'>('grid');

  searchQuery = '';
  statusFilter = '';

  private readonly pageSize = 12;
  readonly page = signal(1);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.students().length / this.pageSize)));
  readonly paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.students().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    const params: Record<string, string> = {};
    if (this.searchQuery) params['search'] = this.searchQuery;
    if (this.statusFilter) params['status'] = this.statusFilter;
    this.page.set(1);
    this.studentsService.getStudents(params).subscribe();
  }

  onFilterChange(): void {
    this.loadStudents();
  }

  countByStatus(status: string): number {
    return this.students().filter(s => s.status === status).length;
  }

  percentOf(status: string): number {
    const total = this.students().length;
    if (!total) return 0;
    return Math.round((this.countByStatus(status) / total) * 100);
  }

  getInitials(name?: string): string {
    if (!name) return 'ط';
    const clean = name.trim().split(/\s+/);
    if (clean.length > 1) {
      return `${clean[0].charAt(0)} ${clean[1].charAt(0)}`;
    }
    return clean[0].substring(0, 2);
  }

  prev(): void { if (this.page() > 1) this.page.update((p) => p - 1); }
  next(): void { if (this.page() < this.totalPages()) this.page.update((p) => p + 1); }

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      active: 'nb-badge-success', registered: 'nb-badge-info', suspended: 'nb-badge-danger',
      graduated: 'nb-badge-ai', withdrawn: 'nb-badge-neutral', archived: 'nb-badge-neutral',
    };
    return map[status] || 'nb-badge-neutral';
  }

  statusText(status: string): string {
    const map: Record<string, string> = {
      active: 'نشط', registered: 'مسجل', suspended: 'موقوف',
      graduated: 'متخرج', withdrawn: 'منسحب', archived: 'مؤرشف',
    };
    return map[status] || status;
  }

  viewDetails(id: string): void { this.router.navigate(['/students/details', id]); }
  edit(id: string): void { this.router.navigate(['/students/edit', id]); }
  goCreate(): void { this.router.navigate(['/students/create']); }

  archive(student: { id: string; profile?: { arabic_name?: string } }): void {
    const data: ConfirmDialogData = {
      title: 'أرشفة الطالب',
      message: `سيتم أرشفة ملف الطالب «${student.profile?.arabic_name || student.id}». يمكن استعادته لاحقاً.`,
      color: 'warn',
    };
    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((ok) => {
      if (ok) {
        this.studentsService.archiveStudent(student.id, 'أرشفة يدوية من قائمة الطلاب').subscribe({
          next: () => this.loadStudents(),
        });
      }
    });
  }

  exportCsv(): void {
    this.exporting.set(true);
    const params: Record<string, string> = {};
    if (this.searchQuery) params['search'] = this.searchQuery;
    if (this.statusFilter) params['status'] = this.statusFilter;
    
    this.studentsService.getStudents(params).subscribe({
      next: (res: any) => {
        const list = pickList(res);
        if (!list.length) {
          this.exporting.set(false);
          return;
        }
        
        let csv = '\uFEFFالرقم الأكاديمي,الاسم,الجنس,الجنسية,الحالة\n';
        for (const s of list) {
          csv += `"${s.student_number}","${s.profile?.arabic_name || ''}","${s.profile?.gender === 'male' ? 'ذكر' : 'أنثى'}","${s.profile?.nationality || ''}","${this.statusText(s.status)}"\n`;
        }
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false)
    });
  }
}
