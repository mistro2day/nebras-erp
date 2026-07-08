import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { StudentsService } from '../students.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import {
  ConfirmDialogComponent, ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';

/**
 * قائمة الطلاب — وحدة عاملة كاملة (Nebras OS).
 * بحث + تصفية حالة (خادمية)، ترقيم صفحات، تصدير CSV، وإجراءات صف حقيقية:
 * عرض / تعديل / أرشفة — كلها مربوطة بمسارات ونقاط نهاية حقيقية.
 */
@Component({
  selector: 'app-students-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="قائمة الطلاب"
        subtitle="البحث المتقدم، الفرز، والتوزيع الأكاديمي للطلاب مع إجراءات إدارة الملفات."
      >
        <button class="nb-btn-secondary" (click)="exportCsv()" [disabled]="exporting()">
          {{ exporting() ? 'جارٍ التصدير…' : 'تصدير CSV' }}
        </button>
        <button class="nb-btn-primary" (click)="goCreate()">إضافة طالب جديد</button>
      </nb-page-header>

      <div class="filter-bar">
        <div class="search">
          <input type="text" [(ngModel)]="searchQuery" (input)="onFilterChange()"
                 aria-label="البحث عن طالب"
                 placeholder="البحث برقم الطالب، الاسم، رقم الهوية أو الهاتف…" />
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
          @if (loading()) {
            <div class="tbl-empty">جارٍ تحميل الطلاب…</div>
          } @else {
            @for (element of paged(); track element.id) {
              <div class="tbl-row">
                <span class="mono">{{ element.student_number }}</span>
                <span class="strong">{{ element.profile?.arabic_name || '—' }}</span>
                <span>{{ element.profile?.gender === 'male' ? 'ذكر' : element.profile?.gender === 'female' ? 'أنثى' : '—' }}</span>
                <span>{{ element.profile?.nationality || '—' }}</span>
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
          }
        </div>
      </nb-panel>

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
      .filter-bar { display: flex; gap: 12px; align-items: flex-end; margin-bottom: 16px; flex-wrap: wrap; }
      .search { flex: 1; min-width: 260px; height: 34px; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius); display: flex; align-items: center; padding: 0 12px; }
      .search input { flex: 1; border: none; background: transparent; outline: none; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); }
      .search input::placeholder { color: var(--nb-text-faint); }
      .field { display: flex; flex-direction: column; gap: 5px; }
      .field label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
      .field select { height: 34px; min-width: 180px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; }
      .tbl { display: flex; flex-direction: column; }
      .tbl-head, .tbl-row { display: grid; grid-template-columns: 1.2fr 1.8fr 0.7fr 1fr 1fr 1.6fr; gap: 8px; padding: 9px 16px; align-items: center; }
      .tbl-head { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); padding: 8px 16px; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
      .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text); }
      .tbl-row:last-child { border-bottom: none; }
      .tbl-row:hover { background: var(--nb-surface-raised); }
      .strong { font-weight: 600; }
      .mono { font-variant-numeric: tabular-nums; color: var(--nb-text-secondary); }
      .row-actions { display: flex; gap: 6px; flex-wrap: wrap; }
      .tbl-empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
      .nb-btn-ghost.sm, .nb-btn-secondary.sm, .nb-btn-danger.sm { height: 26px; padding: 0 12px; font-size: 12px; }
      .pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 14px; }
      .pager-info { font-size: 12px; color: var(--nb-text-muted); }
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

  searchQuery = '';
  statusFilter = '';

  private readonly pageSize = 10;
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
    this.studentsService.bulkExport(params).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'students_export.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false),
    });
  }
}
