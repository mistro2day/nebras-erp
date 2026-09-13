import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { StudentsService } from '../students.service';
import { OrganizationService } from '../../organization/organization.service';
import { AdmissionsService } from '../../admissions/admissions.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import {
  ConfirmDialogComponent, ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { pickList } from '../../admissions/shared/admissions.shared';

import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { SendMessageModalComponent } from '../../communications/components/send-message-modal.component';
import { StudentBulkImportModalComponent } from '../shared/student-bulk-import-modal.component';

@Component({
  selector: 'app-students-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, MatDialogModule, NbPageHeaderComponent,
    NbPanelComponent, NbLoadingComponent, SendMessageModalComponent,
    StudentBulkImportModalComponent
  ],
  animations: [
    trigger('listAnimation', [
      transition('* <=> *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(12px)' }),
          stagger('35ms', [
            animate('320ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-8px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  template: `
    <div class="page" dir="rtl">
      <!-- ترويسة الصفحة الاحترافية مع إجراءات سريعة -->
      <nb-page-header
        title="قائمة وسجل الطلاب"
        subtitle="البحث المتقدم، التوزيع الأكاديمي، فرز البنين والبنات، وتحديث الإحصائيات اللحظية وفق المعروض."
      >
        <div class="header-actions">
          <span *ngIf="refreshing()" class="refresh-pill">🔄 تحديث في الخلفية...</span>
          <button class="nb-btn-secondary" (click)="showBulkImportModal.set(true)">
            📥 استيراد كشف إكسل
          </button>
          <button class="nb-btn-secondary" (click)="exportCsv()" [disabled]="exporting()">
            {{ exporting() ? 'جارٍ التصدير…' : '📊 تصدير البيانات (CSV)' }}
          </button>
          <button class="nb-btn-primary" (click)="goCreate()">
            <span>➕ إضافة طالب جديد</span>
          </button>
        </div>
      </nb-page-header>

      <!-- مؤشرات سريعة للطلاب مع تحديث لحظي ديناميكي وفق المعروض -->
      <div class="stats-grid">
        <!-- كرت إجمالي المعروضين -->
        <div class="metric-card total">
          <div class="metric-header">
            <span class="label">إجمالي الطلاب المعروضين</span>
            <span class="metric-icon">👥</span>
          </div>
          <div class="metric-body">
            <span class="value">{{ currentFilteredCount() }}</span>
            <span class="sub-badge" *ngIf="totalSystemStudents() > 0">
              {{ filteredPercentageOfTotal() }}% من المنظومة ({{ totalSystemStudents() }} طالب)
            </span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill primary" [style.width.%]="filteredPercentageOfTotal()"></div>
          </div>
        </div>

        <!-- كرت البنين -->
        <div class="metric-card boys" [class.filtered-target]="genderFilter() === 'male'">
          <div class="metric-header">
            <span class="label">الطلاب (بنين)</span>
            <span class="metric-icon male-icon">👦</span>
          </div>
          <div class="metric-body">
            <span class="value male-val">{{ filteredBoysCount() }}</span>
            <span class="sub-badge male-badge">
              {{ filteredBoysPercentage() }}% من المعروض
            </span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill male" [style.width.%]="filteredBoysPercentage()"></div>
          </div>
        </div>

        <!-- كرت البنات -->
        <div class="metric-card girls" [class.filtered-target]="genderFilter() === 'female'">
          <div class="metric-header">
            <span class="label">الطالبات (بنات)</span>
            <span class="metric-icon female-icon">👧</span>
          </div>
          <div class="metric-body">
            <span class="value female-val">{{ filteredGirlsCount() }}</span>
            <span class="sub-badge female-badge">
              {{ filteredGirlsPercentage() }}% من المعروض
            </span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill female" [style.width.%]="filteredGirlsPercentage()"></div>
          </div>
        </div>

        <!-- كرت الطلاب النشطين -->
        <div class="metric-card active-students">
          <div class="metric-header">
            <span class="label">النشطين دراسياً</span>
            <span class="metric-icon success-icon">🟢</span>
          </div>
          <div class="metric-body">
            <span class="value success-val">{{ filteredActiveCount() }}</span>
            <span class="sub-badge success-badge">
              {{ filteredActivePercentage() }}% قيد نشط
            </span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill success" [style.width.%]="filteredActivePercentage()"></div>
          </div>
        </div>
      </div>

      <!-- لوحة التحكم بالفلاتر والفرز المتقدم وفق معايير Nebras OS -->
      <div class="filter-toolbar-card">
        <!-- الصف الأول: شرائح الفرز السريعة للجنس + البحث السريع + مفتاح العرض -->
        <div class="toolbar-primary-row">
          <!-- أزرار شرائح فرز الجنس السريعة -->
          <div class="gender-segmented-control" aria-label="فرز حسب الجنس">
            <button
              type="button"
              class="segment-btn"
              [class.active]="genderFilter() === 'all'"
              (click)="setGenderFilter('all')"
              title="عرض جميع الطلاب والطالبات"
            >
              <span class="segment-icon">👥</span>
              <span class="segment-label">الكل</span>
              <span class="segment-counter">{{ students().length }}</span>
            </button>

            <button
              type="button"
              class="segment-btn male"
              [class.active]="genderFilter() === 'male'"
              (click)="setGenderFilter('male')"
              title="فرز بنين فقط"
            >
              <span class="segment-icon">👦</span>
              <span class="segment-label">البنين</span>
              <span class="segment-counter">{{ totalBoysCount() }}</span>
            </button>

            <button
              type="button"
              class="segment-btn female"
              [class.active]="genderFilter() === 'female'"
              (click)="setGenderFilter('female')"
              title="فرز بنات فقط"
            >
              <span class="segment-icon">👧</span>
              <span class="segment-label">البنات</span>
              <span class="segment-counter">{{ totalGirlsCount() }}</span>
            </button>
          </div>

          <!-- مربع البحث الذكي الفوري -->
          <div class="smart-search-box">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              [ngModel]="searchQuery()"
              (ngModelChange)="onSearchChange($event)"
              aria-label="البحث عن طالب"
              placeholder="البحث برقم الطالب، الاسم، رقم الهوية، أو هاتف ولي الأمر..."
            />
            <button
              *ngIf="searchQuery()"
              type="button"
              class="clear-input-btn"
              (click)="clearSearch()"
              title="مسح البحث"
            >
              ✕
            </button>
          </div>

          <!-- مفتاح تبديل مظهر العرض (جدول / شبكة) -->
          <div class="view-toggle">
            <button
              type="button"
              [class.active]="viewMode() === 'table'"
              (click)="viewMode.set('table')"
              title="عرض كجدول بيانات تفصيلي"
            >
              <span class="icon">☰</span>
              <span class="text">جدول البيانات</span>
            </button>
            <button
              type="button"
              [class.active]="viewMode() === 'grid'"
              (click)="viewMode.set('grid')"
              title="عرض كبطاقات شبكية"
            >
              <span class="icon">▤</span>
              <span class="text">العرض الشبكي</span>
            </button>
          </div>
        </div>

        <!-- الصف الثاني: القوائم المنسدلة الدقيقة (الصف، الفصل، الحالة، الفرع، وزر مسح الفلاتر) -->
        <div class="toolbar-secondary-row">
          <!-- فلتر الصف الدراسي -->
          <div class="filter-field">
            <label>📚 الصف الدراسي</label>
            <select [ngModel]="gradeFilter()" (ngModelChange)="onGradeChange($event)">
              <option value="">جميع الصفوف الدراسية</option>
              @for (g of grades(); track g.id) {
                <option [value]="g.id">{{ g.name }}</option>
              }
            </select>
          </div>

          <!-- فلتر الفصل الدراسي (بدلاً من الشعبة) -->
          <div class="filter-field">
            <label>🏫 الفصل الدراسي</label>
            <select
              [ngModel]="sectionFilter()"
              (ngModelChange)="onSectionChange($event)"
              [disabled]="loadingSections() || (!gradeFilter() && sections().length === 0)"
            >
              <option value="">
                {{ loadingSections() ? 'جارٍ تحميل الفصول...' : (gradeFilter() ? 'جميع فصول الصف' : 'اختر الصف أولاً') }}
              </option>
              @for (sec of sections(); track sec.id) {
                <option [value]="sec.id">{{ sec.name }}</option>
              }
            </select>
          </div>

          <!-- فلتر حالة الطالب -->
          <div class="filter-field">
            <label>📋 حالة القيد</label>
            <select [ngModel]="statusFilter()" (ngModelChange)="onStatusChange($event)">
              <option value="">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="registered">مسجل</option>
              <option value="suspended">موقوف</option>
              <option value="graduated">متخرج</option>
              <option value="withdrawn">منسحب</option>
            </select>
          </div>

          <!-- فلتر الفرع / المدرسة -->
          <div class="filter-field">
            <label>🏢 الفرع / المدرسة</label>
            <select [ngModel]="branchFilter()" (ngModelChange)="onBranchChange($event)">
              <option value="">كل الفروع المدرسية</option>
              @for (b of branches(); track b.id) {
                <option [value]="b.id">{{ b.name_ar || b.name }}</option>
              }
            </select>
          </div>

          <!-- زر إعادة الضبط ومسح كافة الفلاتر -->
          <div class="filter-actions">
            <button
              *ngIf="hasActiveFilters()"
              type="button"
              class="nb-btn-ghost reset-btn"
              (click)="resetFilters()"
              title="إلغاء وتفريغ كافة معايير الفلترة"
            >
              <span>↺ مسح الفلاتر</span>
            </button>
          </div>
        </div>

        <!-- شريط الفلاتر النشطة التفاعلي -->
        <div class="active-filters-bar" *ngIf="hasActiveFilters()">
          <span class="active-filters-label">الفلاتر المطبقة حالياً:</span>
          
          <span class="active-chip" *ngIf="genderFilter() !== 'all'">
            الجنس: {{ genderFilter() === 'male' ? 'البنين 👦' : 'البنات 👧' }}
            <button type="button" (click)="setGenderFilter('all')">✕</button>
          </span>

          <span class="active-chip" *ngIf="selectedGradeName()">
            الصف: {{ selectedGradeName() }}
            <button type="button" (click)="onGradeChange('')">✕</button>
          </span>

          <span class="active-chip" *ngIf="selectedSectionName()">
            الفصل: {{ selectedSectionName() }}
            <button type="button" (click)="onSectionChange('')">✕</button>
          </span>

          <span class="active-chip" *ngIf="statusFilter()">
            الحالة: {{ statusText(statusFilter()) }}
            <button type="button" (click)="onStatusChange('')">✕</button>
          </span>

          <span class="active-chip" *ngIf="selectedBranchName()">
            الفرع: {{ selectedBranchName() }}
            <button type="button" (click)="onBranchChange('')">✕</button>
          </span>

          <span class="active-chip" *ngIf="searchQuery()">
            بحث: "{{ searchQuery() }}"
            <button type="button" (click)="clearSearch()">✕</button>
          </span>

          <span class="results-count-badge">
            عرض {{ paged().length }} من {{ currentFilteredCount() }} طالب مطابِق
          </span>
        </div>
      </div>

      <!-- تنبيه أخطاء الشبكة والاتصال -->
      @if (errorMessage()) {
        <div class="network-error-banner" @fadeSlide>
          <div class="err-text">
            <span>⚠️ {{ errorMessage() }}</span>
          </div>
          <button class="nb-btn-secondary sm" (click)="loadStudents()">إعادة المحاولة</button>
        </div>
      }

      <!-- محتوى القائمة (تحميل / جدول / شبكة) -->
      @if (loading()) {
        <nb-loading message="جاري تحميل سجلات الطلاب..."></nb-loading>
      } @else {
        <!-- 1. عرض جدول البيانات الاحترافي -->
        <div *ngIf="viewMode() === 'table'" @fadeSlide>
          <nb-panel [flush]="true">
            <div class="tbl">
              <div class="tbl-head">
                <span class="col-id">الرقم الأكاديمي</span>
                <span class="col-student">اسم الطالب</span>
                <span class="col-grade">الصف الدراسي</span>
                <span class="col-section">اسم الفصل</span>
                <span class="col-branch">الفرع / المدرسة</span>
                <span class="col-gender">الجنس</span>
                <span class="col-guardian">ولي الأمر / الهاتف</span>
                <span class="col-status">الحالة</span>
                <span class="col-actions">إجراءات سريعة</span>
              </div>

              @for (element of paged(); track element.id) {
                <div class="tbl-row clickable" (click)="viewDetails(element.id)">
                  <!-- الرقم الأكاديمي -->
                  <span class="mono bold col-id">{{ element.student_number }}</span>

                  <!-- اسم الطالب مع أفاتار مخصص للجنس -->
                  <div class="student-cell col-student">
                    <div class="mini-avatar" [class.male]="element.profile?.gender === 'male'" [class.female]="element.profile?.gender === 'female'">
                      {{ element.profile?.gender === 'male' ? '👦' : '👧' }}
                    </div>
                    <div class="name-box">
                      <span class="strong student-ar-name">{{ element.profile?.arabic_name || '—' }}</span>
                      <span class="sub-text" *ngIf="element.profile?.english_name">{{ element.profile?.english_name }}</span>
                    </div>
                  </div>

                  <!-- الصف الدراسي -->
                  <div class="col-grade">
                    <span class="grade-badge">
                      {{ element.grade_name || element.enrollments?.[0]?.grade_name || '—' }}
                    </span>
                  </div>

                  <!-- اسم الفصل (بدلاً من الشعبة) -->
                  <div class="col-section">
                    <span class="section-badge">
                      {{ element.section_name || element.enrollments?.[0]?.section_name || '—' }}
                    </span>
                  </div>

                  <!-- الفرع / المدرسة -->
                  <span class="branch-text col-branch">
                    {{ element.branch_name || element.enrollments?.[0]?.branch_name || '—' }}
                  </span>

                  <!-- الجنس -->
                  <div class="col-gender">
                    <span class="gender-pill" [class.male]="element.profile?.gender === 'male'" [class.female]="element.profile?.gender === 'female'">
                      {{ element.profile?.gender === 'male' ? 'بنين' : element.profile?.gender === 'female' ? 'بنات' : '—' }}
                    </span>
                  </div>

                  <!-- ولي الأمر والهاتف -->
                  <div class="guardian-cell col-guardian">
                    <span class="g-name">{{ element.guardian_name || element.family_relations?.[0]?.full_name || '—' }}</span>
                    <span class="g-phone mono" *ngIf="element.guardian_phone || element.family_relations?.[0]?.phone">
                      📞 {{ element.guardian_phone || element.family_relations?.[0]?.phone }}
                    </span>
                  </div>

                  <!-- حالة الطالب -->
                  <div class="col-status">
                    <span [class]="statusBadge(element.status)">{{ statusText(element.status) }}</span>
                  </div>

                  <!-- الإجراءات السريعة -->
                  <div class="row-actions col-actions" (click)="$event.stopPropagation()">
                    <button class="nb-btn-ghost sm icon-btn" (click)="openMessageModal(element)" title="مراسلة سريعة عبر واتساب/SMS">💬</button>
                    <button class="nb-btn-ghost sm icon-btn" (click)="viewDetails(element.id)" title="عرض الملف الكامل">👁️</button>
                    <button class="nb-btn-secondary sm icon-btn" (click)="edit(element.id)" title="تعديل بيانات الطالب وصفه">✏️</button>
                    <button class="nb-btn-danger sm icon-btn" (click)="archive(element)" title="أرشفة السجل">🗑️</button>
                  </div>
                </div>
              }

              <!-- حالة عدم وجود نتائج -->
              @if (filteredStudents().length === 0) {
                <div class="empty-state-box">
                  <div class="empty-state-icon">🔍</div>
                  <h4>لم يتم العثور على أي طالب يطابق معايير الفرز</h4>
                  <p>جرب تغيير خيارات الفلترة المطبقة (الصف، الفصل، الجنس، أو البحث) لعرض الطلاب.</p>
                  <button type="button" class="nb-btn-secondary" (click)="resetFilters()">
                    ↺ إعادة ضبط وتفريغ الفلاتر
                  </button>
                </div>
              }
            </div>
          </nb-panel>
        </div>

        <!-- 2. العرض الشبكي الاحترافي للبطاقات الذكية -->
        <div *ngIf="viewMode() === 'grid'" [@listAnimation]="paged().length" class="student-cards-grid">
          @for (student of paged(); track student.id) {
            <div class="student-card" (click)="viewDetails(student.id)">
              <div class="card-status-accent" [class]="student.status"></div>
              
              <!-- أفاتار مع شارة الجنس الدائرية -->
              <div class="student-avatar-container">
                <div class="student-avatar" [class.male]="student.profile?.gender === 'male'" [class.female]="student.profile?.gender === 'female'">
                  {{ getInitials(student.profile?.arabic_name) }}
                </div>
                <span class="gender-mini-tag" [class.male]="student.profile?.gender === 'male'" [class.female]="student.profile?.gender === 'female'">
                  {{ student.profile?.gender === 'male' ? '👦 بنين' : '👧 بنات' }}
                </span>
              </div>
              
              <div class="student-info">
                <h3 class="student-name">{{ student.profile?.arabic_name || 'طالب نبراس' }}</h3>
                <span class="student-id mono">{{ student.student_number }}</span>
                
                <!-- شارات الصف والفصل والفرع المدمجة -->
                <div class="card-badges-row">
                  <span class="grade-badge sm" *ngIf="student.grade_name || student.enrollments?.[0]?.grade_name">
                    📚 {{ student.grade_name || student.enrollments?.[0]?.grade_name }}
                  </span>
                  <span class="section-badge sm" *ngIf="student.section_name || student.enrollments?.[0]?.section_name">
                    🏫 {{ student.section_name || student.enrollments?.[0]?.section_name }}
                  </span>
                </div>

                <div class="meta-row">
                  <span class="meta-item" *ngIf="student.guardian_phone || student.family_relations?.[0]?.phone">
                    📞 {{ student.guardian_phone || student.family_relations?.[0]?.phone }}
                  </span>
                  <span class="meta-item" *ngIf="student.branch_name || student.enrollments?.[0]?.branch_name">
                    🏢 {{ student.branch_name || student.enrollments?.[0]?.branch_name }}
                  </span>
                </div>
              </div>
              
              <div class="card-footer">
                <span [class]="statusBadge(student.status)">{{ statusText(student.status) }}</span>
                <div class="card-actions" (click)="$event.stopPropagation()">
                  <button class="action-icon-btn" title="مراسلة" (click)="openMessageModal(student)">💬</button>
                  <button class="action-icon-btn" title="عرض التفاصيل" (click)="viewDetails(student.id)">👁️</button>
                  <button class="action-icon-btn" title="تعديل" (click)="edit(student.id)">✏️</button>
                  <button class="action-icon-btn danger" title="أرشفة" (click)="archive(student)">🗑️</button>
                </div>
              </div>
            </div>
          }

          <!-- حالة عدم وجود نتائج في العرض الشبكي -->
          @if (filteredStudents().length === 0) {
            <div class="empty-state-box grid-span">
              <div class="empty-state-icon">🔍</div>
              <h4>لم يتم العثور على أي طالب</h4>
              <p>يرجى التحقق من خيارات الفلترة المطبقة أو مسحها لإظهار الطلاب المسجلين.</p>
              <button type="button" class="nb-btn-secondary" (click)="resetFilters()">
                ↺ إعادة ضبط وتفريغ الفلاتر
              </button>
            </div>
          }
        </div>
      }

      <!-- شريط الترقيم والانتقال بين الصفحات -->
      @if (filteredStudents().length > 0) {
        <div class="pager">
          <div class="page-size-selector">
            <span>عرض في الصفحة:</span>
            <select [ngModel]="pageSize()" (ngModelChange)="pageSize.set($event); page.set(1)">
              <option [value]="25">25 طالب</option>
              <option [value]="50">50 طالب</option>
              <option [value]="100">100 طالب</option>
              <option [value]="200">200 طالب (الكل)</option>
            </select>
          </div>
          <div class="pager-nav" *ngIf="totalPages() > 1">
            <button class="nb-btn-ghost sm" [disabled]="page() === 1" (click)="prev()">السابق</button>
            <span class="pager-info">صفحة {{ page() }} من {{ totalPages() }} · إجمالي {{ filteredStudents().length }} طالب معروض</span>
            <button class="nb-btn-ghost sm" [disabled]="page() === totalPages()" (click)="next()">التالي</button>
          </div>
        </div>
      }

      <!-- مودال المراسلة السريعة -->
      <app-send-message-modal
        [(open)]="showMsgModal"
        [recipientName]="selectedStudent()?.profile?.arabic_name || ''"
        [recipientPhone]="selectedStudent()?.family_relations?.[0]?.phone || ''"
        [contextVariables]="{ 
          student_number: selectedStudent()?.student_number,
          student_name: selectedStudent()?.profile?.arabic_name,
          guardian_name: selectedStudent()?.family_relations?.[0]?.guardian?.arabic_name || 'ولي الأمر',
          guardian_phone: selectedStudent()?.family_relations?.[0]?.phone || '',
          grade: selectedStudent()?.enrollments?.[0]?.grade_name || '',
          section: selectedStudent()?.enrollments?.[0]?.section_name || '',
          academic_year: selectedStudent()?.enrollments?.[0]?.academic_year_name || '',
          date: (selectedStudent() ? todayDate : '')
        }"
        [allowedCategories]="['attendance', 'general']"
      ></app-send-message-modal>

      <!-- مودال استيراد كشف إكسل -->
      <app-student-bulk-import-modal
        [open]="showBulkImportModal()"
        (closed)="onBulkImportClosed()"
        (importedSuccess)="onBulkImportSuccess($event)"
      ></app-student-bulk-import-modal>
    </div>
  `,
  styles: [
    `
      .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
      .header-actions { display: flex; gap: 8px; align-items: center; }
      
      /* بطاقات المؤشرات والإحصاءات الحركية الفاخرة */
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 14px;
        margin-bottom: 18px;
      }
      .metric-card {
        background: var(--nb-surface);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card, 12px);
        padding: 16px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      }
      .metric-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.06);
      }
      .metric-card.filtered-target {
        border-color: var(--nb-primary-400, #7986CB);
        background: linear-gradient(180deg, var(--nb-surface) 0%, var(--nb-primary-50, #f8faff) 100%);
      }
      .metric-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }
      .metric-header .label {
        font-size: 12.5px;
        font-weight: 600;
        color: var(--nb-text-muted);
      }
      .metric-icon {
        font-size: 16px;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: var(--nb-surface-raised);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .metric-body {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }
      .metric-card .value {
        font-size: 26px;
        font-weight: 800;
        color: var(--nb-text);
        line-height: 1.1;
        font-variant-numeric: tabular-nums;
      }
      .metric-card .value.male-val { color: #1d4ed8; }
      .metric-card .value.female-val { color: #9333ea; }
      .metric-card .value.success-val { color: var(--nb-success, #1E8E3E); }

      .sub-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 20px;
        background: var(--nb-surface-raised);
        color: var(--nb-text-muted);
      }
      .sub-badge.male-badge { background: #eff6ff; color: #1d4ed8; }
      .sub-badge.female-badge { background: #faf5ff; color: #9333ea; }
      .sub-badge.success-badge { background: #ecfdf5; color: #059669; }

      .progress-bar-container {
        height: 5px;
        background: var(--nb-surface-raised, #f1f3f7);
        border-radius: 4px;
        overflow: hidden;
      }
      .progress-bar-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .progress-bar-fill.primary { background: linear-gradient(90deg, #3F51B5, #5C6BC0); }
      .progress-bar-fill.male { background: linear-gradient(90deg, #2563eb, #60a5fa); }
      .progress-bar-fill.female { background: linear-gradient(90deg, #9333ea, #c084fc); }
      .progress-bar-fill.success { background: linear-gradient(90deg, #059669, #34d399); }

      /* كرت لوحة التحكم بالفلاتر والفرز المطور */
      .filter-toolbar-card {
        background: var(--nb-surface);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card, 12px);
        padding: 14px 16px;
        margin-bottom: 16px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.03);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      /* الصف الأول: شرائح الجنس + مربع البحث + مفتاح العرض */
      .toolbar-primary-row {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
      }

      /* شرائح الجنس السريعة */
      .gender-segmented-control {
        display: inline-flex;
        background: var(--nb-surface-raised, #f3f4f8);
        border: 1px solid var(--nb-border-soft);
        border-radius: 10px;
        padding: 3px;
        gap: 2px;
      }
      .segment-btn {
        background: transparent;
        border: none;
        border-radius: 8px;
        padding: 6px 14px;
        font-family: var(--nb-font-family);
        font-size: 12.5px;
        font-weight: 600;
        color: var(--nb-text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s ease;
      }
      .segment-btn:hover {
        color: var(--nb-text);
        background: rgba(0,0,0,0.03);
      }
      .segment-btn.active {
        background: var(--nb-surface);
        color: var(--nb-primary-700, #303F9F);
        box-shadow: 0 2px 5px rgba(0,0,0,0.08);
      }
      .segment-btn.male.active {
        color: #1d4ed8;
      }
      .segment-btn.female.active {
        color: #9333ea;
      }
      .segment-counter {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 1px 7px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
        background: rgba(0,0,0,0.06);
        color: inherit;
      }
      .segment-btn.active .segment-counter {
        background: var(--nb-primary-50, #EEF0FA);
      }
      .segment-btn.male.active .segment-counter {
        background: #eff6ff;
      }
      .segment-btn.female.active .segment-counter {
        background: #faf5ff;
      }

      /* مربع البحث الذكي */
      .smart-search-box {
        flex: 1;
        min-width: 260px;
        height: 38px;
        background: var(--nb-surface);
        border: 1px solid var(--nb-border);
        border-radius: 8px;
        display: flex;
        align-items: center;
        padding: 0 12px;
        gap: 8px;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .smart-search-box:focus-within {
        border-color: var(--nb-primary-500);
        box-shadow: 0 0 0 3px var(--nb-primary-100, #e8eaf6);
      }
      .smart-search-box .search-icon {
        font-size: 13px;
        color: var(--nb-text-muted);
      }
      .smart-search-box input {
        flex: 1;
        border: none;
        background: transparent;
        outline: none;
        font-family: var(--nb-font-family);
        font-size: 13px;
        color: var(--nb-text);
      }
      .smart-search-box input::placeholder {
        color: var(--nb-text-faint);
      }
      .clear-input-btn {
        background: transparent;
        border: none;
        color: var(--nb-text-muted);
        cursor: pointer;
        font-size: 12px;
        padding: 2px 6px;
        border-radius: 50%;
      }
      .clear-input-btn:hover {
        background: var(--nb-surface-raised);
        color: var(--nb-text);
      }

      /* مفتاح تبديل العرض */
      .view-toggle {
        display: flex;
        background: var(--nb-surface-raised);
        border: 1px solid var(--nb-border-soft);
        border-radius: 8px;
        padding: 2px;
        height: 38px;
        align-items: center;
      }
      .view-toggle button {
        background: transparent;
        border: none;
        border-radius: 6px;
        font-family: var(--nb-font-family);
        font-size: 12px;
        font-weight: 600;
        color: var(--nb-text-secondary);
        padding: 5px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        height: 32px;
        transition: all 0.2s;
      }
      .view-toggle button.active {
        background: var(--nb-surface);
        color: var(--nb-primary-600);
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      }

      /* الصف الثاني: القوائم المنسدلة */
      .toolbar-secondary-row {
        display: flex;
        gap: 12px;
        align-items: flex-end;
        flex-wrap: wrap;
        border-top: 1px dashed var(--nb-border-soft);
        padding-top: 10px;
      }
      .filter-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
        min-width: 160px;
      }
      .filter-field label {
        font-size: 11.5px;
        font-weight: 700;
        color: var(--nb-text-secondary);
      }
      .filter-field select {
        height: 36px;
        width: 100%;
        border: 1px solid var(--nb-border);
        border-radius: 8px;
        padding: 0 10px;
        font-family: var(--nb-font-family);
        font-size: 12.5px;
        color: var(--nb-text);
        background: var(--nb-surface);
        outline: none;
        transition: border-color 0.2s ease;
      }
      .filter-field select:focus {
        border-color: var(--nb-primary-500);
      }
      .filter-field select:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        background: var(--nb-surface-raised);
      }

      .filter-actions {
        display: flex;
        align-items: center;
        height: 36px;
      }
      .reset-btn {
        height: 36px;
        font-size: 12px;
        font-weight: 600;
        color: var(--nb-danger, #d32f2f);
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        padding: 0 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s ease;
      }
      .reset-btn:hover {
        background: #fee2e2;
        border-color: #fca5a5;
      }

      /* شريط الفلاتر النشطة */
      .active-filters-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        padding-top: 8px;
        border-top: 1px solid var(--nb-border-soft);
        font-size: 12px;
      }
      .active-filters-label {
        font-weight: 600;
        color: var(--nb-text-muted);
      }
      .active-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 10px;
        background: var(--nb-primary-50, #eef0fa);
        border: 1px solid var(--nb-primary-200, #c5cae9);
        border-radius: 16px;
        color: var(--nb-primary-800, #2c387e);
        font-size: 11.5px;
        font-weight: 600;
      }
      .active-chip button {
        background: transparent;
        border: none;
        color: var(--nb-primary-600);
        cursor: pointer;
        font-size: 11px;
        font-weight: 700;
        padding: 0;
        margin: 0;
      }
      .results-count-badge {
        margin-right: auto;
        font-size: 11.5px;
        font-weight: 700;
        color: var(--nb-text-secondary);
        background: var(--nb-surface-raised);
        border: 1px solid var(--nb-border-soft);
        padding: 2px 10px;
        border-radius: 12px;
      }

      .network-error-banner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #fff8e6;
        color: #8a6300;
        border: 1px solid #ffd57e;
        border-radius: var(--nb-radius);
        padding: 10px 16px;
        margin-bottom: 16px;
        font-size: 13px;
      }
      .network-error-banner .err-text { display: flex; align-items: center; gap: 8px; font-weight: 500; }
      .refresh-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 11.5px;
        font-weight: 600;
        color: var(--nb-primary-700);
        background: var(--nb-primary-50);
        border: 1px solid var(--nb-primary-200);
        padding: 4px 12px;
        border-radius: 20px;
      }

      /* جدول البيانات الاحترافي */
      .tbl { display: flex; flex-direction: column; overflow-x: auto; min-width: 1050px; }
      .tbl-head, .tbl-row {
        display: grid;
        grid-template-columns: 1fr 1.6fr 1.1fr 1fr 1fr 0.8fr 1.3fr 0.8fr 1.4fr;
        gap: 10px;
        padding: 10px 16px;
        align-items: center;
      }
      .tbl-head {
        background: var(--nb-surface-raised);
        border-bottom: 1px solid var(--nb-border-soft);
        font-size: 11.5px;
        font-weight: 700;
        color: var(--nb-text-muted);
      }
      .tbl-row {
        border-bottom: 1px solid var(--nb-border-row, #f1f2f6);
        font-size: 13px;
        color: var(--nb-text);
        transition: background 0.15s ease;
      }
      .tbl-row.clickable { cursor: pointer; }
      .tbl-row:hover { background: var(--nb-surface-raised); }
      .tbl-row:last-child { border-bottom: none; }

      .student-cell {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .mini-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #f1f3f7;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        flex-shrink: 0;
      }
      .mini-avatar.male { background: #e0edff; }
      .mini-avatar.female { background: #fae8ff; }
      
      .name-box {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .student-ar-name { font-size: 13px; font-weight: 700; color: var(--nb-text); }
      .sub-text { font-size: 11px; color: var(--nb-text-muted); }
      .mono { font-variant-numeric: tabular-nums; font-family: monospace; }
      .bold { font-weight: 700; color: var(--nb-primary-700); }

      .grade-badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 12px;
        background: var(--nb-surface-raised);
        border: 1px solid var(--nb-border-soft);
        font-size: 12px;
        font-weight: 600;
        color: var(--nb-text);
        width: fit-content;
      }
      .section-badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 12px;
        background: var(--nb-primary-50, #eef5ff);
        border: 1px solid var(--nb-primary-200, #cce3ff);
        color: var(--nb-primary-700, #0056b3);
        font-size: 12px;
        font-weight: 700;
        width: fit-content;
      }
      .grade-badge.sm, .section-badge.sm { font-size: 11px; padding: 2px 8px; }

      .gender-pill {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11.5px;
        font-weight: 600;
      }
      .gender-pill.male { background: #eff6ff; color: #1d4ed8; }
      .gender-pill.female { background: #faf5ff; color: #9333ea; }

      .branch-text { font-size: 12px; color: var(--nb-text-secondary); }
      .guardian-cell { display: flex; flex-direction: column; gap: 2px; }
      .guardian-cell .g-name { font-weight: 600; font-size: 12px; }
      .guardian-cell .g-phone { font-size: 11px; color: var(--nb-text-muted); }
      
      .row-actions { display: flex; gap: 4px; align-items: center; }
      .icon-btn { width: 28px; height: 28px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; }

      /* شارات حالة القيد */
      .nb-badge-success { background: #e6f4ea; color: #137333; font-weight: 600; font-size: 11.5px; padding: 3px 8px; border-radius: 6px; }
      .nb-badge-info { background: #e8f0fe; color: #1a73e8; font-weight: 600; font-size: 11.5px; padding: 3px 8px; border-radius: 6px; }
      .nb-badge-danger { background: #fce8e6; color: #c5221f; font-weight: 600; font-size: 11.5px; padding: 3px 8px; border-radius: 6px; }
      .nb-badge-ai { background: #f3e8fd; color: #7b1fa2; font-weight: 600; font-size: 11.5px; padding: 3px 8px; border-radius: 6px; }
      .nb-badge-neutral { background: #f1f3f4; color: #5f6368; font-weight: 600; font-size: 11.5px; padding: 3px 8px; border-radius: 6px; }

      /* العرض الشبكي المطوّر للبطاقات */
      .student-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 16px;
        margin-bottom: 20px;
      }
      .student-card {
        background: var(--nb-surface);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card, 12px);
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
        box-shadow: 0 10px 20px rgba(0,0,0,0.07);
        border-color: var(--nb-primary-300);
      }
      .card-status-accent {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 4px;
        background: var(--nb-border-soft);
      }
      .card-status-accent.active { background: var(--nb-success, #1E8E3E); }
      .card-status-accent.registered { background: #1a73e8; }
      .card-status-accent.suspended { background: #c5221f; }
      
      .student-avatar-container {
        margin: 10px 0 6px;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      }
      .student-avatar {
        width: 62px;
        height: 62px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 19px;
        font-weight: 700;
        color: white;
        background: var(--nb-primary-500);
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      }
      .student-avatar.male { background: linear-gradient(135deg, #1e40af, #3b82f6); }
      .student-avatar.female { background: linear-gradient(135deg, #7e22ce, #c084fc); }
      
      .gender-mini-tag {
        font-size: 10.5px;
        font-weight: 700;
        padding: 1px 8px;
        border-radius: 10px;
      }
      .gender-mini-tag.male { background: #eff6ff; color: #1d4ed8; }
      .gender-mini-tag.female { background: #faf5ff; color: #9333ea; }

      .student-info { width: 100%; margin-top: 4px; }
      .student-name {
        font-size: 14.5px;
        font-weight: 700;
        color: var(--nb-text);
        margin: 0 0 3px;
      }
      .student-id {
        font-size: 12px;
        color: var(--nb-text-muted);
        display: block;
        margin-bottom: 8px;
      }
      .card-badges-row {
        display: flex;
        justify-content: center;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 8px;
      }
      .meta-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: center;
        margin: 8px 0 0;
        width: 100%;
        border-top: 1px dashed var(--nb-border-soft);
        padding-top: 8px;
      }
      .meta-item { font-size: 11.5px; color: var(--nb-text-secondary); }

      .card-footer {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 12px;
        padding-top: 8px;
        border-top: 1px solid var(--nb-border-soft);
      }
      .card-actions { display: flex; gap: 4px; }
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
        background: #fee2e2;
        border-color: #fca5a5;
      }

      /* صندوق الحالة الفارغة عند عدم العثور على نتائج */
      .empty-state-box {
        padding: 48px 20px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        width: 100%;
      }
      .empty-state-box.grid-span { grid-column: 1 / -1; }
      .empty-state-icon { font-size: 42px; opacity: 0.6; }
      .empty-state-box h4 { margin: 0; font-size: 16px; font-weight: 700; color: var(--nb-text); }
      .empty-state-box p { margin: 0; font-size: 13px; color: var(--nb-text-muted); max-width: 420px; }

      .pager { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 14px; flex-wrap: wrap; }
      .pager-nav { display: flex; align-items: center; gap: 10px; }
      .page-size-selector { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--nb-text-muted); }
      .page-size-selector select { height: 28px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--nb-border-soft); background: var(--nb-surface); font-size: 12px; color: var(--nb-text); }
      .pager-info { font-size: 12px; color: var(--nb-text-muted); }
    `,
  ],
})
export class StudentsListComponent implements OnInit {
  private readonly studentsService = inject(StudentsService);
  private readonly orgService = inject(OrganizationService);
  private readonly admissionsService = inject(AdmissionsService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  todayDate = new Date().toLocaleDateString('ar-EG');

  readonly students = this.studentsService.students;
  readonly loading = this.studentsService.loading;
  readonly refreshing = this.studentsService.refreshing;
  readonly errorMessage = this.studentsService.errorMessage;
  readonly exporting = signal(false);
  readonly viewMode = signal<'grid' | 'table'>('table');

  // فلاتر البحث والفرز المتطورة
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('');
  readonly branchFilter = signal<string>('');
  readonly genderFilter = signal<'all' | 'male' | 'female'>('all');
  readonly gradeFilter = signal<string>('');
  readonly sectionFilter = signal<string>('');

  // بيانات الخيارات المحملة من الخادم
  readonly branches = signal<any[]>([]);
  readonly grades = signal<any[]>([]);
  readonly sections = signal<any[]>([]);
  readonly loadingSections = signal<boolean>(false);

  // إجمالي الطلاب في المنظومة
  readonly totalSystemStudents = computed(() => this.students().length);

  /**
   * الطلاب المفلترون محلياً وفورياً (Zero-lag) بحسب جميع المعايير النشطة.
   */
  readonly filteredStudents = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const st = this.statusFilter();
    const bf = this.branchFilter();
    const gf = this.genderFilter();
    const grId = this.gradeFilter();
    const secId = this.sectionFilter();

    const allGrades = this.grades();
    const selectedGradeObj = grId ? allGrades.find(g => String(g.id) === String(grId)) : null;
    const selectedGradeName = selectedGradeObj ? selectedGradeObj.name : null;

    const allSections = this.sections();
    const selectedSecObj = secId ? allSections.find(s => String(s.id) === String(secId)) : null;
    const selectedSecName = selectedSecObj ? selectedSecObj.name : null;

    return this.students().filter(student => {
      // 1. فرز الجنس (بنين / بنات / الكل)
      if (gf !== 'all') {
        if (student.profile?.gender !== gf) return false;
      }

      // 2. فرز حالة القيد
      if (st) {
        if (student.status !== st) return false;
      }

      // 3. فرز الفرع / المدرسة
      if (bf) {
        const branchMatch = (student.enrollments || []).some((e: any) => String(e.branch_id) === String(bf)) ||
                            (student.branch_name && this.branches().find(b => String(b.id) === String(bf))?.name === student.branch_name);
        if (!branchMatch) return false;
      }

      // 4. فرز الصف الدراسي
      if (grId) {
        const gradeMatch = (student.enrollments || []).some((e: any) =>
          String(e.grade_id) === String(grId) || (selectedGradeName && e.grade_name === selectedGradeName)
        ) || (selectedGradeName && (student.grade_name === selectedGradeName || student.enrollments?.[0]?.grade_name === selectedGradeName));
        if (!gradeMatch) return false;
      }

      // 5. فرز الفصل الدراسي
      if (secId) {
        const sectionMatch = (student.enrollments || []).some((e: any) =>
          String(e.section_id) === String(secId) || (selectedSecName && e.section_name === selectedSecName)
        ) || (selectedSecName && (student.section_name === selectedSecName || student.enrollments?.[0]?.section_name === selectedSecName));
        if (!sectionMatch) return false;
      }

      // 6. البحث النصي الفوري
      if (q) {
        const arName = (student.profile?.arabic_name || '').toLowerCase();
        const enName = (student.profile?.english_name || '').toLowerCase();
        const stdNum = (student.student_number || '').toLowerCase();
        const natId = (student.profile?.national_id || '').toLowerCase();
        const gName = (student.guardian_name || student.family_relations?.[0]?.full_name || '').toLowerCase();
        const gPhone = (student.guardian_phone || student.family_relations?.[0]?.phone || '').toLowerCase();

        const matches = arName.includes(q) || enName.includes(q) || stdNum.includes(q) ||
                        natId.includes(q) || gName.includes(q) || gPhone.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  });

  // ---- حسابات بطاقات الإحصاء التفاعلية المتحدثة ديناميكياً وفق المعروض ----

  /** عدد الطلاب المعروضين حالياً */
  readonly currentFilteredCount = computed(() => this.filteredStudents().length);

  /** نسبة المعروضين من الإجمالي العام */
  readonly filteredPercentageOfTotal = computed(() => {
    const total = this.totalSystemStudents();
    return total > 0 ? Math.round((this.currentFilteredCount() / total) * 100) : 0;
  });

  /** عدد البنين في القائمة المعروضة */
  readonly filteredBoysCount = computed(() => {
    return this.filteredStudents().filter(s => s.profile?.gender === 'male').length;
  });

  /** نسبة البنين من المعروضين */
  readonly filteredBoysPercentage = computed(() => {
    const count = this.currentFilteredCount();
    return count > 0 ? Math.round((this.filteredBoysCount() / count) * 100) : 0;
  });

  /** عدد البنات في القائمة المعروضة */
  readonly filteredGirlsCount = computed(() => {
    return this.filteredStudents().filter(s => s.profile?.gender === 'female').length;
  });

  /** نسبة البنات من المعروضين */
  readonly filteredGirlsPercentage = computed(() => {
    const count = this.currentFilteredCount();
    return count > 0 ? Math.round((this.filteredGirlsCount() / count) * 100) : 0;
  });

  /** عدد النشطين في القائمة المعروضة */
  readonly filteredActiveCount = computed(() => {
    return this.filteredStudents().filter(s => s.status === 'active').length;
  });

  /** نسبة النشطين من المعروضين */
  readonly filteredActivePercentage = computed(() => {
    const count = this.currentFilteredCount();
    return count > 0 ? Math.round((this.filteredActiveCount() / count) * 100) : 0;
  });

  /** إجمالي عدد البنين العام (لكافة الطلاب) */
  readonly totalBoysCount = computed(() => {
    return this.students().filter(s => s.profile?.gender === 'male').length;
  });

  /** إجمالي عدد البنات العام (لكافة الطلاب) */
  readonly totalGirlsCount = computed(() => {
    return this.students().filter(s => s.profile?.gender === 'female').length;
  });

  // فلاتر نشطة ومسميات
  readonly hasActiveFilters = computed(() => {
    return !!(
      this.searchQuery().trim() ||
      this.statusFilter() ||
      this.branchFilter() ||
      this.genderFilter() !== 'all' ||
      this.gradeFilter() ||
      this.sectionFilter()
    );
  });

  readonly selectedGradeName = computed(() => {
    const gid = this.gradeFilter();
    if (!gid) return null;
    return this.grades().find(g => String(g.id) === String(gid))?.name || null;
  });

  readonly selectedSectionName = computed(() => {
    const sid = this.sectionFilter();
    if (!sid) return null;
    return this.sections().find(s => String(s.id) === String(sid))?.name || null;
  });

  readonly selectedBranchName = computed(() => {
    const bid = this.branchFilter();
    if (!bid) return null;
    const b = this.branches().find(br => String(br.id) === String(bid));
    return b ? (b.name_ar || b.name) : null;
  });

  // الترقيم والتصفح
  readonly pageSize = signal(25);
  readonly page = signal(1);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredStudents().length / this.pageSize())));
  readonly paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredStudents().slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.loadStudents();
    this.loadBranches();
    this.loadGrades();
  }

  private loadBranches(): void {
    this.orgService.getBranches().subscribe({
      next: (res) => this.branches.set((res?.data ?? res ?? []) as any[]),
    });
  }

  private loadGrades(): void {
    this.admissionsService.getGrades().subscribe({
      next: (res) => {
        const list = pickList(res).map((g: any) => ({ id: String(g.id), name: g.name }));
        this.grades.set(list);
      }
    });
  }

  onGradeChange(gradeId: string): void {
    this.gradeFilter.set(gradeId);
    this.sectionFilter.set('');
    this.sections.set([]);
    this.page.set(1);

    if (gradeId) {
      this.loadingSections.set(true);
      this.admissionsService.getSections(gradeId).subscribe({
        next: (res) => {
          const list = pickList(res).map((s: any) => ({ id: String(s.id), name: s.name }));
          this.sections.set(list);
          this.loadingSections.set(false);
        },
        error: () => {
          this.sections.set([]);
          this.loadingSections.set(false);
        }
      });
    }

    this.fetchFromServer();
  }

  onSectionChange(sectionId: string): void {
    this.sectionFilter.set(sectionId);
    this.page.set(1);
    this.fetchFromServer();
  }

  onBranchChange(id: string): void {
    this.branchFilter.set(id);
    this.page.set(1);
    this.fetchFromServer();
  }

  onStatusChange(status: string): void {
    this.statusFilter.set(status);
    this.page.set(1);
    this.fetchFromServer();
  }

  setGenderFilter(gender: 'all' | 'male' | 'female'): void {
    this.genderFilter.set(gender);
    this.page.set(1);
    this.fetchFromServer();
  }

  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.page.set(1);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.page.set(1);
    this.fetchFromServer();
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('');
    this.branchFilter.set('');
    this.genderFilter.set('all');
    this.gradeFilter.set('');
    this.sectionFilter.set('');
    this.sections.set([]);
    this.page.set(1);
    this.loadStudents();
  }

  loadStudents(): void {
    this.page.set(1);
    this.fetchFromServer();
  }

  private fetchFromServer(): void {
    const params: Record<string, string> = {};
    if (this.searchQuery().trim()) params['search'] = this.searchQuery().trim();
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.genderFilter() !== 'all') params['gender'] = this.genderFilter();
    if (this.gradeFilter()) params['grade_id'] = this.gradeFilter();
    if (this.sectionFilter()) params['section_id'] = this.sectionFilter();
    if (this.branchFilter()) params['branch_id'] = this.branchFilter();

    this.studentsService.getStudents(params).subscribe();
  }

  showMsgModal = false;
  selectedStudent = signal<any | null>(null);
  showBulkImportModal = signal<boolean>(false);

  onBulkImportSuccess(count: number): void {
    this.showBulkImportModal.set(false);
    this.page.set(1);
    this.loadStudents();
  }

  onBulkImportClosed(): void {
    this.showBulkImportModal.set(false);
    this.loadStudents();
  }

  openMessageModal(student: any) {
    this.selectedStudent.set(student);
    this.showMsgModal = true;
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
    const list = this.filteredStudents();
    if (!list.length) {
      this.exporting.set(false);
      return;
    }
    
    let csv = '\uFEFFالرقم الأكاديمي,الاسم,الصف الدراسي,اسم الفصل,الفرع,الجنس,الجنسية,الحالة\n';
    for (const s of list) {
      const grade = s.grade_name || s.enrollments?.[0]?.grade_name || '';
      const sec = s.section_name || s.enrollments?.[0]?.section_name || '';
      const branch = s.branch_name || s.enrollments?.[0]?.branch_name || '';
      const genderStr = s.profile?.gender === 'male' ? 'ذكر' : s.profile?.gender === 'female' ? 'أنثى' : '';
      csv += `"${s.student_number}","${s.profile?.arabic_name || ''}","${grade}","${sec}","${branch}","${genderStr}","${s.profile?.nationality || 'سوداني'}","${this.statusText(s.status)}"\n`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.exporting.set(false);
  }
}
