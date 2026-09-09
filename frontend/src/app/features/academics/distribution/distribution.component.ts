import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { AcademicsService } from '../academics.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { NotificationService } from '../../../core/services/notification.service';
import { pickList } from '../shared/academics.shared';

export interface DistStudent {
  id: string;
  student_number: string;
  name: string;
  gender: string;
  status: string;
  gradeId: string | null;
  sectionId: string | null;
  isDraft?: boolean;
}

export interface DistSection {
  id: string;
  name: string;
  code: string;
  capacity: number;
  gender: 'male' | 'female' | 'mixed' | string;
  occupied_seats: number;
  available_seats: number;
  class_teacher_id?: string | null;
}

@Component({
  selector: 'app-academic-distribution',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    NbPageHeaderComponent,
    NbPanelComponent,
    NbLoadingComponent
  ],
  template: `
    <div class="distribution-page" dir="rtl">
      <!-- ترويسة الصفحة -->
      <nb-page-header
        title="توزيع الطلاب على الفصول"
        subtitle="لوحة تحكم ذكية لتسكين وتوزيع الطلاب بالسحب والإفلات والتوزيع الآلي المتوازن">
        <button class="nb-btn-secondary" (click)="reload()" [disabled]="!gradeId() || busy()">
          <span class="btn-icon">↻</span> تحديث
        </button>
        <button class="nb-btn-primary magic-btn" (click)="openAutoDistModal()"
          [disabled]="!gradeId() || sections().length === 0 || busy()">
          <span class="btn-icon">✨</span> توزيع آلي ذكي
        </button>
      </nb-page-header>

      <!-- شريط السياق والخيارات الأكاديمية -->
      <div class="context-bar">
        <div class="fld">
          <label>السنة الدراسية</label>
          <select [(ngModel)]="yearIdModel" (change)="onYearChange()">
            <option value="">اختر السنة…</option>
            @for (y of years(); track y.id) {
              <option [value]="y.id">{{ y.name }}{{ y.current_flag ? ' (الحالية)' : '' }}</option>
            }
          </select>
        </div>
        <div class="fld">
          <label>الصف الدراسي</label>
          <select [(ngModel)]="gradeIdModel" (change)="onGradeChange()">
            <option value="">اختر الصف…</option>
            @for (g of grades(); track g.id) {
              <option [value]="g.id">{{ g.name }}</option>
            }
          </select>
        </div>

        @if (gradeId()) {
          <!-- أدوات البحث والتصفية اللحظية -->
          <div class="filter-tools">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                placeholder="ابحث باسم الطالب أو رقم القيد..."
                [ngModel]="searchTerm()"
                (ngModelChange)="searchTerm.set($event)"
              />
              @if (searchTerm()) {
                <button class="clear-search" (click)="searchTerm.set('')">✕</button>
              }
            </div>

            <div class="gender-pills">
              <button
                class="pill-btn"
                [class.active]="genderFilter() === 'all'"
                (click)="genderFilter.set('all')">
                الكل ({{ gradeStudents().length }})
              </button>
              <button
                class="pill-btn male"
                [class.active]="genderFilter() === 'male'"
                (click)="genderFilter.set('male')">
                بنين ({{ countByGender('male') }})
              </button>
              <button
                class="pill-btn female"
                [class.active]="genderFilter() === 'female'"
                (click)="genderFilter.set('female')">
                بنات ({{ countByGender('female') }})
              </button>
            </div>
          </div>
        }
      </div>

      <!-- حالة عدم اختيار صف -->
      @if (!gradeId()) {
        <nb-panel>
          <div class="empty-state-card">
            <div class="icon-orb">📚</div>
            <h3>حدد السنة الدراسية والصف للبدء</h3>
            <p class="hint">اختر السنة والصف الدراسي من القائمة أعلاه لتحميل لوحة التسكين والشعب المتاحة.</p>
          </div>
        </nb-panel>
      } @else if (loading()) {
        <nb-loading message="جارٍ تجهيز لوحة التوزيع والتحقق من الفصول والطلاب…"></nb-loading>
      } @else {
        <!-- بطاقات المؤشرات الإحصائية اللحظية -->
        <div class="stats-ribbon">
          <div class="stat-card">
            <div class="stat-meta">
              <span class="stat-label">إجمالي طلاب الصف</span>
              <span class="stat-badge blue">{{ gradeStudents().length }}</span>
            </div>
            <div class="stat-progress">
              <div class="stat-fill blue" [style.width.%]="100"></div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-meta">
              <span class="stat-label">المسكَّنون في فصول</span>
              <span class="stat-badge green">{{ assignedStudents().length }} / {{ gradeStudents().length }}</span>
            </div>
            <div class="stat-progress">
              <div class="stat-fill green" [style.width.%]="occupancyPercent()"></div>
            </div>
          </div>

          <div class="stat-card" [class.alert-card]="unassigned().length > 0">
            <div class="stat-meta">
              <span class="stat-label">بانتظار التسكين</span>
              <span class="stat-badge" [class.amber]="unassigned().length > 0">{{ unassigned().length }}</span>
            </div>
            <div class="stat-progress">
              <div class="stat-fill" [class.amber]="unassigned().length > 0" [style.width.%]="unassignedPercent()"></div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-meta">
              <span class="stat-label">الفصول والشعب المتاحة</span>
              <span class="stat-badge purple">{{ sections().length }} شعب</span>
            </div>
            <div class="stat-details">
              <span>إجمالي السعة: <strong>{{ totalSectionsCapacity() }}</strong> مقعد</span>
            </div>
          </div>
        </div>

        @if (sections().length === 0) {
          <nb-panel>
            <div class="empty-state-card warning">
              <div class="icon-orb warning">⚠️</div>
              <h3>لا توجد فصول دراسية معرّفة لهذا الصف</h3>
              <p class="hint">يجب إضافة شعب وفصول دراسية للصف أولاً من شاشة الفصول الدراسية لتتمكن من تسكين الطلاب.</p>
            </div>
          </nb-panel>
        } @else {
          <!-- لوحة كانبان التفاعلية (السحب والإفلات) -->
          <div class="kanban-workspace">

            <!-- العمود الجانبي: حوض انتظار الطلاب غير المسكنين -->
            <div class="pool-column">
              <div class="column-header pool-head">
                <div class="header-main">
                  <div class="title-with-pill">
                    <span class="status-dot unassigned"></span>
                    <span class="column-title">غير المسكنين</span>
                    <span class="count-pill">{{ filteredUnassigned().length }}</span>
                  </div>
                  <div class="pool-actions">
                    <button class="text-action-btn" (click)="toggleSelectAllUnassigned()">
                      {{ isAllUnassignedSelected() ? 'إلغاء التحديد' : 'تحديد الكل' }}
                    </button>
                  </div>
                </div>

                @if (selectedIds().size > 0) {
                  <div class="batch-bar">
                    <span class="batch-count">{{ selectedIds().size }} محدد</span>
                    <div class="batch-controls">
                      <select #targetSelect (change)="moveSelectedToSection(targetSelect.value); targetSelect.value=''">
                        <option value="">نقل إلى شعبة…</option>
                        @for (sec of sections(); track sec.id) {
                          <option [value]="sec.id">{{ sec.name }} ({{ countInSection(sec.id) }}/{{ sec.capacity }})</option>
                        }
                      </select>
                      <button class="clear-btn" (click)="clearSelection()">إلغاء</button>
                    </div>
                  </div>
                }
              </div>

              <!-- منطقة الإسقاط الخاصة بحوض غير المسكنين -->
              <div
                id="pool-drop-list"
                cdkDropList
                [cdkDropListData]="filteredUnassigned()"
                [cdkDropListConnectedTo]="allDropListIds()"
                (cdkDropListDropped)="onDrop($event, null)"
                class="cards-container pool-container">

                @for (student of filteredUnassigned(); track student.id) {
                  <div
                    class="student-card"
                    [class.selected]="selectedIds().has(student.id)"
                    [class.is-draft]="student.isDraft"
                    [class.male]="student.gender === 'male'"
                    [class.female]="student.gender === 'female'"
                    cdkDrag
                    [cdkDragData]="student"
                    (click)="toggleSelect(student.id)">

                    <!-- مظهر المعاينة أثناء السحب الفعلي -->
                    <div *cdkDragPreview class="drag-preview-card">
                      <div class="avatar" [class]="student.gender">{{ getInitials(student.name) }}</div>
                      <div class="preview-info">
                        <span class="preview-name">{{ student.name }}</span>
                        @if (selectedIds().size > 1 && selectedIds().has(student.id)) {
                          <span class="bundle-badge">مع {{ selectedIds().size - 1 }} طلاب آخرين</span>
                        }
                      </div>
                    </div>

                    <!-- مكان الحجز أثناء السحب -->
                    <div *cdkDragPlaceholder class="drag-placeholder"></div>

                    <div class="card-avatar" [class]="student.gender">
                      {{ getInitials(student.name) }}
                    </div>
                    <div class="card-info">
                      <span class="student-name">{{ student.name }}</span>
                      <span class="student-meta">
                        <span class="student-num">{{ student.student_number || 'بدون رقم قيد' }}</span>
                        <span class="gender-tag" [class]="student.gender">
                          {{ student.gender === 'female' ? 'بنات' : 'بنين' }}
                        </span>
                      </span>
                    </div>

                    <div class="card-quick-actions" (click)="$event.stopPropagation()">
                      <button class="icon-action-btn" title="ترقية / تخطي صف" (click)="openPromote(student)">⇧</button>
                    </div>
                  </div>
                }

                @if (filteredUnassigned().length === 0) {
                  <div class="pool-empty-state">
                    @if (unassigned().length === 0) {
                      <div class="check-icon">✓</div>
                      <span>اكتمل التسكين! جميع طلاب الصف موزعون على الفصول.</span>
                    } @else {
                      <span>لا توجد نتائج مطابقة لبحثك في غير المسكنين.</span>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- أعمدة الفصول والشعب الدراسية -->
            <div class="sections-track">
              @for (sec of sections(); track sec.id) {
                <div class="section-column" [class.full-cap]="countInSection(sec.id) >= sec.capacity">
                  <div class="column-header section-head">
                    <div class="sec-title-row">
                      <div class="title-with-pill">
                        <span class="status-dot" [class]="sec.gender"></span>
                        <span class="column-title">{{ sec.name }}</span>
                        <span class="sec-code">{{ sec.code }}</span>
                      </div>
                      <div class="sec-actions">
                        <span class="gender-badge" [class]="sec.gender">{{ getGenderLabel(sec.gender) }}</span>
                        <button class="icon-action-btn print" title="طباعة كشف الفصل" (click)="openPrintRoster(sec)">🖨️</button>
                      </div>
                    </div>

                    <!-- شريط الطاقة الاستيعابية الحي -->
                    <div class="capacity-meter">
                      <div class="meter-info">
                        <span class="capacity-text">
                          <strong>{{ countInSection(sec.id) }}</strong> / {{ sec.capacity }} طالب
                        </span>
                        <span class="seats-left" [class.warning]="isNearCapacity(sec)" [class.over]="countInSection(sec.id) > sec.capacity">
                          {{ getCapacityText(sec) }}
                        </span>
                      </div>
                      <div class="meter-track">
                        <div
                          class="meter-fill"
                          [class.safe]="getSectionPercent(sec) < 85"
                          [class.warn]="getSectionPercent(sec) >= 85 && getSectionPercent(sec) <= 100"
                          [class.danger]="getSectionPercent(sec) > 100"
                          [style.width.%]="getSectionMeterWidth(sec)">
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- منطقة الإسقاط الخاصة بالشعبة -->
                  <div
                    [id]="'sec-drop-' + sec.id"
                    cdkDropList
                    [cdkDropListData]="studentsInSection(sec.id)"
                    [cdkDropListConnectedTo]="allDropListIds()"
                    (cdkDropListDropped)="onDrop($event, sec.id)"
                    class="cards-container section-container">

                    @for (student of studentsInSection(sec.id); track student.id) {
                      <div
                        class="student-card placed"
                        [class.is-draft]="student.isDraft"
                        [class.male]="student.gender === 'male'"
                        [class.female]="student.gender === 'female'"
                        cdkDrag
                        [cdkDragData]="student">

                        <div *cdkDragPreview class="drag-preview-card">
                          <div class="avatar" [class]="student.gender">{{ getInitials(student.name) }}</div>
                          <div class="preview-info">
                            <span class="preview-name">{{ student.name }}</span>
                          </div>
                        </div>

                        <div *cdkDragPlaceholder class="drag-placeholder"></div>

                        <div class="card-avatar" [class]="student.gender">
                          {{ getInitials(student.name) }}
                        </div>
                        <div class="card-info">
                          <div class="card-title-line">
                            <span class="student-name">{{ student.name }}</span>
                            @if (student.isDraft) {
                              <span class="draft-badge" title="تعديل بانتظار الحفظ">مسودة</span>
                            }
                          </div>
                          <span class="student-meta">
                            <span class="student-num">{{ student.student_number || 'بدون رقم قيد' }}</span>
                          </span>
                        </div>

                        <div class="card-quick-actions" (click)="$event.stopPropagation()">
                          <button class="icon-action-btn" title="نقل إلى فصل آخر" (click)="openTransfer(student)">⇄</button>
                        </div>
                      </div>
                    }

                    @if (studentsInSection(sec.id).length === 0) {
                      <div class="section-empty-state">
                        <span class="drop-hint">اسحب الطلاب وأفلتهم هنا</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- شريط الإجراءات العائم للمسودة (Draft Changes Dock) -->
      @if (pendingChangesCount() > 0) {
        <div class="draft-action-dock">
          <div class="dock-info">
            <span class="dock-icon">⚡</span>
            <div class="dock-text">
              <span class="dock-title">لديك {{ pendingChangesCount() }} تعديل قيد المسودة</span>
              <span class="dock-sub">لم يتم حفظ هذه التغييرات في قاعدة البيانات بعد.</span>
            </div>
          </div>
          <div class="dock-buttons">
            <button class="nb-btn-secondary dock-btn" (click)="resetDraft()" [disabled]="busy()">
              إلغاء والتراجع
            </button>
            <button class="nb-btn-primary dock-btn save-btn" (click)="saveDistribution()" [disabled]="busy()">
              <span class="btn-icon">💾</span> اعتماد وحفظ التوزيع
            </button>
          </div>
        </div>
      }

      <!-- مودال التوزيع الآلي الذكي (Smart Auto-Distribution Modal) -->
      @if (showAutoDistModal()) {
        <div class="nb-modal-backdrop" (click)="closeAutoDistModal()">
          <div class="nb-modal-box" (click)="$event.stopPropagation()">
            <div class="nb-modal-header">
              <div class="modal-title-wrap">
                <span class="modal-badge-icon">✨</span>
                <h3>التوزيع الآلي الذكي للطلاب</h3>
              </div>
              <button class="close-btn" (click)="closeAutoDistModal()">✕</button>
            </div>

            <div class="nb-modal-body">
              <p class="modal-desc">
                اختر معيار التوزيع المناسب لمدرستكم لتسكين
                <strong>{{ unassigned().length }} طالب</strong>
                على <strong>{{ sections().length }} شعب دراسية</strong> بنقرة زر واحدة.
              </p>

              <div class="form-group">
                <label class="form-label">معيار وخوارزمية التوزيع</label>
                <div class="strategy-options">
                  <label class="strategy-card" [class.active]="autoStrategy() === 'balanced'">
                    <input type="radio" name="strategy" [checked]="autoStrategy() === 'balanced'" (change)="autoStrategy.set('balanced')">
                    <div class="strategy-content">
                      <span class="strategy-title">⚖️ توزيع متوازن بالتساوي (موصى به)</span>
                      <span class="strategy-sub">موازنة عددية عادلة بين الفصول مع مراعاة الطاقة الاستيعابية.</span>
                    </div>
                  </label>

                  <label class="strategy-card" [class.active]="autoStrategy() === 'alphabetical'">
                    <input type="radio" name="strategy" [checked]="autoStrategy() === 'alphabetical'" (change)="autoStrategy.set('alphabetical')">
                    <div class="strategy-content">
                      <span class="strategy-title">🔤 توزيع أبجدي بالاسم العربي</span>
                      <span class="strategy-sub">ترتيب أسماء الطلاب أبجدياً وتوزيعهم بالتسلسل على الشعب.</span>
                    </div>
                  </label>

                  <label class="strategy-card" [class.active]="autoStrategy() === 'gender'">
                    <input type="radio" name="strategy" [checked]="autoStrategy() === 'gender'" (change)="autoStrategy.set('gender')">
                    <div class="strategy-content">
                      <span class="strategy-title">🚻 مراعاة النوع وفصل البنين/البنات</span>
                      <span class="strategy-sub">تسكين كل طالب في الشعبة المخصصة لنوعه، أو الموازنة في الشعب المشتركة.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div class="form-group options-group">
                <label class="checkbox-option">
                  <input type="checkbox" [(ngModel)]="autoPreserveExisting">
                  <span>الاحتفاظ بالطلاب المسكنين حالياً وتوزيع غير المسكنين فقط</span>
                </label>
                <label class="checkbox-option">
                  <input type="checkbox" [(ngModel)]="autoAllowOverflow">
                  <span>السماح بتجاوز السعة الاستيعابية في حال عدم كفاية المقاعد</span>
                </label>
              </div>
            </div>

            <div class="nb-modal-footer">
              <button class="nb-btn-secondary" (click)="closeAutoDistModal()">إلغاء</button>
              <button class="nb-btn-primary magic-btn" (click)="runAutoDistributionPreview()" [disabled]="busy()">
                تطبيق المعاينة الذكية
              </button>
            </div>
          </div>
        </div>
      }

      <!-- مودال طباعة وتصدير كشف الفصل الدراسي -->
      @if (printSection()) {
        <div class="nb-modal-backdrop" (click)="printSection.set(null)">
          <div class="nb-modal-box print-modal" (click)="$event.stopPropagation()">
            <div class="nb-modal-header no-print">
              <h3>كشف طلاب الفصل — {{ printSection()!.name }}</h3>
              <button class="close-btn" (click)="printSection.set(null)">✕</button>
            </div>

            <div class="print-roster-content" id="printable-roster">
              <div class="roster-header">
                <div class="rep-side">
                  <h4>جمهورية السودان</h4>
                  <h5>وزارة التربية والتعليم</h5>
                  <p>إدارة التعليم الثانوي والأساس</p>
                </div>
                <div class="rep-center">
                  <div class="logo-mark">نظام نبراس لإدارة المدارس</div>
                  <h2 class="roster-title">كشف طلاب الفصل الدراسي</h2>
                  <div class="roster-meta">
                    <span>الصف: <strong>{{ selectedGradeName() }}</strong></span>
                    <span>الشعبة: <strong>{{ printSection()!.name }}</strong></span>
                    <span>العام الدراسي: <strong>{{ selectedYearName() }}</strong></span>
                  </div>
                </div>
                <div class="rep-side end">
                  <p>تاريخ الاستخراج: {{ todayFormatted() }}</p>
                  <p>إجمالي الطلاب: {{ studentsInSection(printSection()!.id).length }}</p>
                  <p>رائد الفصل: _______________</p>
                </div>
              </div>

              <table class="roster-table">
                <thead>
                  <tr>
                    <th style="width: 45px;">م</th>
                    <th style="width: 140px;">رقم القيد</th>
                    <th>اسم الطالب رباعياً</th>
                    <th style="width: 80px;">النوع</th>
                    <th style="width: 120px;">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  @for (st of studentsInSection(printSection()!.id); track st.id; let i = $index) {
                    <tr>
                      <td class="text-center">{{ i + 1 }}</td>
                      <td class="mono text-center">{{ st.student_number || '—' }}</td>
                      <td class="font-bold">{{ st.name }}</td>
                      <td class="text-center">{{ st.gender === 'female' ? 'أنثى' : 'ذكر' }}</td>
                      <td></td>
                    </tr>
                  }
                  @if (studentsInSection(printSection()!.id).length === 0) {
                    <tr>
                      <td colspan="5" class="text-center empty-td">لا يوجد طلاب مسكنون في هذه الشعبة بعد.</td>
                    </tr>
                  }
                </tbody>
              </table>

              <div class="roster-footer">
                <div class="sig-block">
                  <span>توقيع رائد الفصل:</span>
                  <span class="dots">...................................</span>
                </div>
                <div class="sig-block">
                  <span>المرشد الطلابي:</span>
                  <span class="dots">...................................</span>
                </div>
                <div class="sig-block">
                  <span>اعتماد مدير المدرسة:</span>
                  <span class="dots">...................................</span>
                </div>
              </div>
            </div>

            <div class="nb-modal-footer no-print">
              <button class="nb-btn-secondary" (click)="printSection.set(null)">إغلاق</button>
              <button class="nb-btn-primary" (click)="triggerBrowserPrint()">
                <span class="btn-icon">🖨️</span> طباعة الكشف
              </button>
            </div>
          </div>
        </div>
      }

      <!-- مودال النقل اليدوي السريع -->
      @if (transferFor()) {
        <div class="nb-modal-backdrop" (click)="transferFor.set(null)">
          <div class="nb-modal-box sm" (click)="$event.stopPropagation()">
            <div class="nb-modal-header">
              <h3>نقل الطالب إلى شعبة أخرى</h3>
              <button class="close-btn" (click)="transferFor.set(null)">✕</button>
            </div>
            <div class="nb-modal-body">
              <p class="modal-sub">{{ transferFor()!.name }} ({{ transferFor()!.student_number || 'بدون رقم قيد' }})</p>
              <div class="form-group">
                <label class="form-label">اختر الشعبة الهدف</label>
                <select [(ngModel)]="transferTarget" class="form-select">
                  <option value="">اختر شعبة…</option>
                  @for (sec of sections(); track sec.id) {
                    @if (sec.id !== transferFor()!.sectionId) {
                      <option [value]="sec.id">{{ sec.name }} ({{ countInSection(sec.id) }}/{{ sec.capacity }})</option>
                    }
                  }
                </select>
              </div>
            </div>
            <div class="nb-modal-footer">
              <button class="nb-btn-secondary" (click)="transferFor.set(null)">إلغاء</button>
              <button class="nb-btn-primary" [disabled]="!transferTarget" (click)="confirmTransfer()">نقل</button>
            </div>
          </div>
        </div>
      }

      <!-- مودال الترقية وتخطي الصف -->
      @if (promoteFor()) {
        <div class="nb-modal-backdrop" (click)="promoteFor.set(null)">
          <div class="nb-modal-box sm" (click)="$event.stopPropagation()">
            <div class="nb-modal-header">
              <h3>ترقية وتخطي صف دراسي</h3>
              <button class="close-btn" (click)="promoteFor.set(null)">✕</button>
            </div>
            <div class="nb-modal-body">
              <p class="modal-sub">{{ promoteFor()!.name }}</p>
              <div class="form-group">
                <label class="form-label">الصف الدراسي الهدف</label>
                <select [(ngModel)]="promoteTarget" class="form-select">
                  <option value="">اختر صفاً أعلى…</option>
                  @for (g of grades(); track g.id) {
                    @if (g.id !== gradeId()) {
                      <option [value]="g.id">{{ g.name }}</option>
                    }
                  }
                </select>
              </div>
              <p class="hint-warn">سيتم ترفيع الطالب وتثبيت ذلك في سجلات الترقية الأكاديمية.</p>
            </div>
            <div class="nb-modal-footer">
              <button class="nb-btn-secondary" (click)="promoteFor.set(null)">إلغاء</button>
              <button class="nb-btn-primary" [disabled]="!promoteTarget || busy()" (click)="confirmPromote()">تأكيد الترقية</button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .distribution-page {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      min-width: 0;
      background: var(--nb-bg, #f8fafc);
      color: var(--nb-text, #1e293b);
      font-family: inherit;
    }

    /* أزرار الترويسة */
    .magic-btn {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%) !important;
      color: #ffffff !important;
      border: none !important;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
      transition: all 0.2s ease;
    }
    .magic-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.35);
    }
    .btn-icon {
      margin-left: 6px;
      display: inline-block;
    }

    /* شريط السياق */
    .context-bar {
      display: flex;
      gap: 16px;
      align-items: flex-end;
      margin-bottom: 20px;
      flex-wrap: wrap;
      background: #ffffff;
      padding: 16px 20px;
      border-radius: 12px;
      border: 1px solid var(--nb-border, #e2e8f0);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .fld {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 200px;
    }
    .fld label {
      font-size: 12px;
      font-weight: 700;
      color: var(--nb-text-muted, #64748b);
    }
    .fld select {
      height: 40px;
      padding: 0 12px;
      border-radius: 8px;
      border: 1px solid var(--nb-border, #cbd5e1);
      background: #ffffff;
      font-size: 14px;
      color: #1e293b;
      outline: none;
      transition: border-color 0.2s;
    }
    .fld select:focus {
      border-color: #4f46e5;
    }

    /* أدوات البحث والتصفية */
    .filter-tools {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-right: auto;
      flex-wrap: wrap;
    }
    .search-box {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-box input {
      height: 40px;
      width: 260px;
      padding: 0 36px 0 32px;
      border-radius: 8px;
      border: 1px solid var(--nb-border, #cbd5e1);
      font-size: 13px;
      outline: none;
      transition: all 0.2s;
    }
    .search-box input:focus {
      width: 290px;
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
    .search-icon {
      position: absolute;
      right: 10px;
      font-size: 14px;
      pointer-events: none;
      opacity: 0.6;
    }
    .clear-search {
      position: absolute;
      left: 10px;
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      font-size: 12px;
    }

    .gender-pills {
      display: flex;
      background: #f1f5f9;
      padding: 3px;
      border-radius: 8px;
      gap: 2px;
    }
    .pill-btn {
      padding: 6px 12px;
      border-radius: 6px;
      border: none;
      background: none;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pill-btn.active {
      background: #ffffff;
      color: #1e293b;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }
    .pill-btn.male.active { color: #2563eb; }
    .pill-btn.female.active { color: #db2777; }

    /* شريط المؤشرات */
    .stats-ribbon {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: #ffffff;
      border: 1px solid var(--nb-border, #e2e8f0);
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }
    .stat-card.alert-card {
      border-color: #fde68a;
      background: #fffbeb;
    }
    .stat-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .stat-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--nb-text-muted, #64748b);
    }
    .stat-badge {
      font-size: 15px;
      font-weight: 800;
      color: #1e293b;
    }
    .stat-badge.green { color: #059669; }
    .stat-badge.blue { color: #2563eb; }
    .stat-badge.amber { color: #d97706; }
    .stat-badge.purple { color: #7c3aed; }
    .stat-progress {
      height: 6px;
      background: #e2e8f0;
      border-radius: 99px;
      overflow: hidden;
    }
    .stat-fill {
      height: 100%;
      border-radius: 99px;
      transition: width 0.3s ease;
    }
    .stat-fill.blue { background: #3b82f6; }
    .stat-fill.green { background: #10b981; }
    .stat-fill.amber { background: #f59e0b; }
    .stat-details {
      font-size: 11px;
      color: #64748b;
    }

    /* لوحة الكانبان */
    .kanban-workspace {
      display: flex;
      gap: 18px;
      align-items: flex-start;
      min-height: 540px;
      overflow-x: auto;
      padding-bottom: 24px;
    }

    /* عمود حوض غير المسكنين */
    .pool-column {
      width: 320px;
      min-width: 320px;
      background: #ffffff;
      border: 1px solid var(--nb-border, #cbd5e1);
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      height: calc(100vh - 300px);
      min-height: 520px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .column-header {
      padding: 14px 16px;
      border-bottom: 1px solid var(--nb-border, #e2e8f0);
      background: #fafafa;
      border-top-left-radius: 14px;
      border-top-right-radius: 14px;
    }
    .pool-head {
      background: #f8fafc;
    }
    .header-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title-with-pill {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .status-dot.unassigned { background: #f59e0b; }
    .status-dot.male { background: #3b82f6; }
    .status-dot.female { background: #ec4899; }
    .status-dot.mixed { background: #10b981; }
    .column-title {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
    }
    .count-pill {
      background: #e2e8f0;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 12px;
    }
    .text-action-btn {
      background: none;
      border: none;
      color: #4f46e5;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .text-action-btn:hover { text-decoration: underline; }

    /* شريط التحديد المجمع */
    .batch-bar {
      margin-top: 10px;
      padding: 8px 10px;
      background: #ede9fe;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .batch-count {
      font-size: 12px;
      font-weight: 700;
      color: #5b21b6;
    }
    .batch-controls {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .batch-controls select {
      height: 28px;
      font-size: 11px;
      border-radius: 6px;
      border: 1px solid #c4b5fd;
      background: #ffffff;
      outline: none;
    }
    .clear-btn {
      background: none;
      border: none;
      font-size: 11px;
      color: #6d28d9;
      cursor: pointer;
    }

    /* مسار أعمدة الفصول */
    .sections-track {
      display: flex;
      gap: 16px;
      flex: 1;
      overflow-x: auto;
    }
    .section-column {
      width: 290px;
      min-width: 290px;
      background: #ffffff;
      border: 1px solid var(--nb-border, #cbd5e1);
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      height: calc(100vh - 300px);
      min-height: 520px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      transition: all 0.2s;
    }
    .section-column.full-cap {
      border-color: #fca5a5;
    }
    .sec-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .sec-code {
      font-size: 11px;
      color: #94a3b8;
      font-family: monospace;
    }
    .sec-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .gender-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    .gender-badge.male { background: #dbeafe; color: #1d4ed8; }
    .gender-badge.female { background: #fce7f3; color: #be185d; }
    .gender-badge.mixed { background: #d1fae5; color: #047857; }

    .icon-action-btn {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      border: 1px solid var(--nb-border, #e2e8f0);
      background: #ffffff;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }
    .icon-action-btn:hover {
      background: #f1f5f9;
      color: #1e293b;
    }
    .icon-action-btn.print:hover {
      background: #ede9fe;
      color: #6d28d9;
    }

    /* عداد الطاقة الاستيعابية */
    .capacity-meter {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .meter-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }
    .capacity-text strong {
      font-size: 13px;
      color: #1e293b;
    }
    .seats-left {
      color: #059669;
      font-weight: 600;
    }
    .seats-left.warning { color: #d97706; }
    .seats-left.over { color: #dc2626; }
    .meter-track {
      height: 6px;
      background: #e2e8f0;
      border-radius: 99px;
      overflow: hidden;
    }
    .meter-fill {
      height: 100%;
      border-radius: 99px;
      transition: width 0.3s ease;
    }
    .meter-fill.safe { background: #10b981; }
    .meter-fill.warn { background: #f59e0b; }
    .meter-fill.danger { background: #ef4444; }

    /* حاوية البطاقات ومنطقة السحب والإفلات */
    .cards-container {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: 200px;
      transition: background-color 0.2s;
    }
    .cdk-drop-list-dragging .student-card:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .cdk-drop-list-receiving {
      background-color: #f0fdf4 !important;
      outline: 2px dashed #22c55e;
      outline-offset: -2px;
    }

    /* بطاقة الطالب */
    .student-card {
      background: #ffffff;
      border: 1px solid var(--nb-border, #e2e8f0);
      border-radius: 10px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: grab;
      user-select: none;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }
    .student-card:active {
      cursor: grabbing;
    }
    .student-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
      border-color: #cbd5e1;
    }
    .student-card.selected {
      background: #f5f3ff;
      border-color: #8b5cf6;
      box-shadow: 0 0 0 1.5px #8b5cf6;
    }
    .student-card.is-draft {
      border-right: 4px solid #f59e0b;
    }
    .card-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #f1f5f9;
      color: #334155;
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .card-avatar.male {
      background: #e0f2fe;
      color: #0369a1;
    }
    .card-avatar.female {
      background: #fce7f3;
      color: #be185d;
    }
    .card-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .card-title-line {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .student-name {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .draft-badge {
      font-size: 9px;
      background: #fef3c7;
      color: #92400e;
      padding: 1px 5px;
      border-radius: 4px;
      font-weight: 700;
    }
    .student-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #64748b;
    }
    .student-num {
      font-family: monospace;
      font-size: 10px;
    }
    .gender-tag {
      font-size: 10px;
      padding: 1px 4px;
      border-radius: 3px;
    }
    .gender-tag.male { color: #0284c7; }
    .gender-tag.female { color: #db2777; }

    /* معاينة السحب Drag Preview */
    .drag-preview-card {
      background: #ffffff;
      border: 2px solid #4f46e5;
      border-radius: 10px;
      padding: 10px 14px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 10px;
      direction: rtl;
    }
    .drag-preview-card .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #4f46e5;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
    }
    .preview-name {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
    }
    .bundle-badge {
      font-size: 11px;
      background: #ede9fe;
      color: #6d28d9;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
      display: block;
      margin-top: 2px;
    }

    /* عنصر الحجز Placeholder */
    .drag-placeholder {
      background: #e0e7ff;
      border: 2px dashed #6366f1;
      border-radius: 10px;
      min-height: 48px;
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    /* حالات الفراغ */
    .pool-empty-state, .section-empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 24px;
      color: #94a3b8;
      font-size: 12px;
    }
    .check-icon {
      font-size: 24px;
      color: #10b981;
      margin-bottom: 6px;
    }
    .drop-hint {
      border: 2px dashed #e2e8f0;
      padding: 16px;
      border-radius: 10px;
      width: 100%;
      box-sizing: border-box;
    }

    /* شريط المسودة العائم (Draft Dock) */
    .draft-action-dock {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #1e293b;
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 99px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 32px;
      z-index: 100;
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideUp {
      from { transform: translate(-50%, 100%); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
    .dock-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .dock-icon {
      font-size: 20px;
      color: #fbbf24;
    }
    .dock-text {
      display: flex;
      flex-direction: column;
    }
    .dock-title {
      font-size: 14px;
      font-weight: 700;
    }
    .dock-sub {
      font-size: 11px;
      color: #94a3b8;
    }
    .dock-buttons {
      display: flex;
      gap: 10px;
    }
    .dock-btn {
      height: 36px;
      font-size: 13px;
      padding: 0 18px;
      border-radius: 99px;
    }
    .save-btn {
      background: #10b981 !important;
      border: none !important;
      color: #ffffff !important;
      font-weight: 700;
    }
    .save-btn:hover {
      background: #059669 !important;
    }

    /* المودالات المخصصة لنظام نبراس OS */
    .nb-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }
    .nb-modal-box {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      max-width: 540px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      max-height: 90vh;
      animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .nb-modal-box.sm { max-width: 420px; }
    .nb-modal-box.print-modal { max-width: 800px; }
    @keyframes modalPop {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .nb-modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .modal-badge-icon {
      font-size: 18px;
    }
    .nb-modal-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
    }
    .close-btn {
      background: none;
      border: none;
      font-size: 16px;
      color: #94a3b8;
      cursor: pointer;
    }
    .nb-modal-body {
      padding: 20px;
      overflow-y: auto;
    }
    .modal-desc {
      font-size: 13px;
      color: #475569;
      line-height: 1.6;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .strategy-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 8px;
    }
    .strategy-card {
      display: flex;
      gap: 12px;
      padding: 12px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .strategy-card.active {
      border-color: #4f46e5;
      background: #f5f3ff;
    }
    .strategy-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .strategy-title {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
    }
    .strategy-sub {
      font-size: 11px;
      color: #64748b;
    }
    .options-group {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .checkbox-option {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #334155;
      cursor: pointer;
    }
    .nb-modal-footer {
      padding: 14px 20px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    /* كشف طباعة الفصل الرسمي */
    .print-roster-content {
      padding: 24px;
      background: #ffffff;
      color: #000000;
      font-family: 'Amiri', 'Traditional Arabic', serif, Tahoma;
    }
    .roster-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px double #000000;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .rep-side h4 { margin: 0; font-size: 13px; }
    .rep-side h5 { margin: 2px 0; font-size: 12px; }
    .rep-side p { margin: 2px 0; font-size: 11px; }
    .rep-side.end { text-align: left; }
    .rep-center {
      text-align: center;
    }
    .logo-mark {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
    }
    .roster-title {
      margin: 4px 0 8px 0;
      font-size: 18px;
      font-weight: 800;
    }
    .roster-meta {
      display: flex;
      gap: 16px;
      font-size: 13px;
      justify-content: center;
    }
    .roster-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .roster-table th, .roster-table td {
      border: 1px solid #000000;
      padding: 6px 10px;
    }
    .roster-table th {
      background: #f1f5f9;
      font-weight: 700;
    }
    .roster-footer {
      display: flex;
      justify-content: space-between;
      margin-top: 36px;
      font-size: 13px;
    }
    .sig-block {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .empty-td {
      padding: 20px;
      color: #64748b;
    }

    /* طباعة الورق عبر المتصفح */
    @media print {
      body * { visibility: hidden; }
      #printable-roster, #printable-roster * { visibility: visible; }
      #printable-roster {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        margin: 0;
        padding: 20mm;
      }
      .no-print { display: none !important; }
    }
  `]
})
export class AcademicDistributionComponent implements OnInit {
  private readonly svc = inject(AcademicsService);
  private readonly notify = inject(NotificationService);

  // البيانات الأكاديمية الأساسية
  readonly years = signal<any[]>([]);
  readonly grades = signal<any[]>([]);
  readonly yearId = signal<string>('');
  readonly gradeId = signal<string>('');
  yearIdModel = '';
  gradeIdModel = '';

  // الفصول والطلاب
  readonly sections = signal<DistSection[]>([]);
  readonly students = signal<DistStudent[]>([]);
  readonly originalStudentSectionMap = signal<Map<string, string | null>>(new Map());

  // حالات التحميل والعمل
  readonly loading = signal<boolean>(false);
  readonly busy = signal<boolean>(false);

  // التصفية والبحث
  readonly searchTerm = signal<string>('');
  readonly genderFilter = signal<'all' | 'male' | 'female'>('all');
  readonly selectedIds = signal<Set<string>>(new Set());

  // النوافذ والمودالات
  readonly showAutoDistModal = signal<boolean>(false);
  readonly autoStrategy = signal<'balanced' | 'alphabetical' | 'gender'>('balanced');
  autoPreserveExisting = true;
  autoAllowOverflow = false;

  readonly printSection = signal<DistSection | null>(null);
  readonly transferFor = signal<DistStudent | null>(null);
  transferTarget = '';
  readonly promoteFor = signal<DistStudent | null>(null);
  promoteTarget = '';

  // الحسابات المحسوبة
  readonly gradeStudents = computed(() => this.students());

  readonly unassigned = computed(() => {
    return this.students().filter((s) => !s.sectionId);
  });

  readonly filteredUnassigned = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const gender = this.genderFilter();

    return this.unassigned().filter((s) => {
      const matchGender = gender === 'all' || s.gender === gender;
      const matchTerm = !term || s.name.toLowerCase().includes(term) || s.student_number.toLowerCase().includes(term);
      return matchGender && matchTerm;
    });
  });

  readonly assignedStudents = computed(() => {
    return this.students().filter((s) => !!s.sectionId);
  });

  readonly pendingChangesCount = computed(() => {
    const origMap = this.originalStudentSectionMap();
    return this.students().filter((s) => s.sectionId !== origMap.get(s.id)).length;
  });

  readonly allDropListIds = computed(() => {
    return ['pool-drop-list', ...this.sections().map((s) => 'sec-drop-' + s.id)];
  });

  readonly totalSectionsCapacity = computed(() => {
    return this.sections().reduce((sum, sec) => sum + (sec.capacity || 0), 0);
  });

  readonly occupancyPercent = computed(() => {
    const total = this.gradeStudents().length;
    return total ? Math.round((this.assignedStudents().length / total) * 100) : 0;
  });

  readonly unassignedPercent = computed(() => {
    const total = this.gradeStudents().length;
    return total ? Math.round((this.unassigned().length / total) * 100) : 0;
  });

  ngOnInit(): void {
    this.loadInitialContext();
  }

  private loadInitialContext(): void {
    this.svc.getAcademicYears().subscribe({
      next: (res) => {
        const list = pickList<any>(res);
        this.years.set(list);
        const current = list.find((y) => y.current_flag) ?? list[0];
        if (current) {
          this.yearId.set(current.id);
          this.yearIdModel = current.id;
        }
      }
    });

    this.svc.getGrades().subscribe({
      next: (res) => this.grades.set(pickList(res))
    });
  }

  onYearChange(): void {
    this.yearId.set(this.yearIdModel);
    if (this.gradeId()) {
      this.reload();
    }
  }

  onGradeChange(): void {
    this.gradeId.set(this.gradeIdModel);
    this.clearSelection();
    this.reload();
  }

  reload(): void {
    const gId = this.gradeId();
    const yId = this.yearId();
    if (!gId || !yId) {
      this.students.set([]);
      this.sections.set([]);
      return;
    }

    this.loading.set(true);
    this.svc.getDistributionOverview(gId, yId).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        const rawSections: DistSection[] = (data.sections || []).map((sec: any) => ({
          id: sec.id,
          name: sec.name,
          code: sec.code,
          capacity: sec.capacity || 30,
          gender: sec.gender || 'mixed',
          occupied_seats: sec.occupied_seats || 0,
          available_seats: sec.available_seats || 30,
          class_teacher_id: sec.class_teacher_id
        }));

        const rawStudents: DistStudent[] = (data.students || []).map((st: any) => ({
          id: st.id,
          student_number: st.student_number || '',
          name: st.name || 'طالب',
          gender: st.gender || 'male',
          status: st.status || 'active',
          gradeId: st.grade_id || gId,
          sectionId: st.section_id || null,
          isDraft: false
        }));

        this.sections.set(rawSections);
        this.students.set(rawStudents);

        // تخزين الحالة الأصلية لمراقبة مسودة التغييرات
        const origMap = new Map<string, string | null>();
        rawStudents.forEach((st) => origMap.set(st.id, st.sectionId));
        this.originalStudentSectionMap.set(origMap);

        this.clearSelection();
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('تعذّر تحميل بيانات توزيع الطلاب للصف.');
        this.loading.set(false);
      }
    });
  }

  // ---------- التوزيع والتعامل بالسحب والإفلات ----------
  onDrop(event: CdkDragDrop<DistStudent[]>, targetSectionId: string | null): void {
    const student = event.item.data as DistStudent;
    if (!student) return;

    // إذا كان السحب لطالب محدد، ومحدد معه طلاب آخرون: ننقل كل الطلاب المحددين!
    const selected = this.selectedIds();
    let studentsToMove: DistStudent[] = [];

    if (selected.has(student.id) && selected.size > 1) {
      studentsToMove = this.students().filter((s) => selected.has(s.id));
    } else {
      studentsToMove = [student];
    }

    // التحقق من توافق النوع إذا كان الهدف شعبة منفصلة
    if (targetSectionId) {
      const targetSec = this.sections().find((s) => s.id === targetSectionId);
      if (targetSec && targetSec.gender !== 'mixed') {
        const mismatched = studentsToMove.filter((s) => s.gender !== targetSec.gender);
        if (mismatched.length > 0) {
          this.notify.error(`لا يمكن تسكين طلاب في شعبة (${targetSec.name}) المخصصة لـ (${this.getGenderLabel(targetSec.gender)}).`);
          return;
        }
      }
    }

    const moveIds = new Set(studentsToMove.map((s) => s.id));
    const origMap = this.originalStudentSectionMap();

    // تحديث مكان الطلاب في المسودة
    this.students.update((list) =>
      list.map((s) => {
        if (moveIds.has(s.id)) {
          const isDraft = targetSectionId !== origMap.get(s.id);
          return { ...s, sectionId: targetSectionId, isDraft };
        }
        return s;
      })
    );

    this.clearSelection();
  }

  // ---------- التحديد المجمع والإجراءات السريعة ----------
  toggleSelect(id: string): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds.set(next);
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  toggleSelectAllUnassigned(): void {
    if (this.isAllUnassignedSelected()) {
      this.clearSelection();
    } else {
      const allIds = this.filteredUnassigned().map((s) => s.id);
      this.selectedIds.set(new Set(allIds));
    }
  }

  isAllUnassignedSelected(): boolean {
    const current = this.filteredUnassigned();
    if (current.length === 0) return false;
    return current.every((s) => this.selectedIds().has(s.id));
  }

  moveSelectedToSection(targetSectionId: string): void {
    if (!targetSectionId || this.selectedIds().size === 0) return;
    const targetSec = this.sections().find((s) => s.id === targetSectionId);
    if (!targetSec) return;

    const selectedList = this.students().filter((s) => this.selectedIds().has(s.id));

    if (targetSec.gender !== 'mixed') {
      const mismatched = selectedList.filter((s) => s.gender !== targetSec.gender);
      if (mismatched.length > 0) {
        this.notify.error(`نوع بعض الطلاب المحددين لا يطابق نوع الشعبة (${targetSec.name}).`);
        return;
      }
    }

    const moveIds = new Set(this.selectedIds());
    const origMap = this.originalStudentSectionMap();

    this.students.update((list) =>
      list.map((s) => {
        if (moveIds.has(s.id)) {
          const isDraft = targetSectionId !== origMap.get(s.id);
          return { ...s, sectionId: targetSectionId, isDraft };
        }
        return s;
      })
    );

    this.notify.success(`تم تسكين ${moveIds.size} طالب في شعبة ${targetSec.name} (مسودة).`);
    this.clearSelection();
  }

  // ---------- التوزيع الآلي الذكي ----------
  openAutoDistModal(): void {
    this.showAutoDistModal.set(true);
  }

  closeAutoDistModal(): void {
    this.showAutoDistModal.set(false);
  }

  runAutoDistributionPreview(): void {
    const gId = this.gradeId();
    const yId = this.yearId();
    if (!gId || !yId) return;

    this.busy.set(true);
    this.svc.simulateAutoDistribution({
      grade_id: gId,
      academic_year_id: yId,
      strategy: this.autoStrategy(),
      options: {
        preserve_existing: this.autoPreserveExisting,
        allow_overflow: this.autoAllowOverflow
      }
    }).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        const plan = data.plan || [];
        const origMap = this.originalStudentSectionMap();

        if (plan.length === 0) {
          this.notify.info(data.message || 'لا توجد تعيينات جديدة مقترحة.');
          this.busy.set(false);
          this.closeAutoDistModal();
          return;
        }

        const planMap = new Map<string, string>();
        plan.forEach((item: any) => planMap.set(item.student_id, item.section_id));

        this.students.update((list) =>
          list.map((s) => {
            if (planMap.has(s.id)) {
              const newSecId = planMap.get(s.id)!;
              const isDraft = newSecId !== origMap.get(s.id);
              return { ...s, sectionId: newSecId, isDraft };
            }
            return s;
          })
        );

        this.busy.set(false);
        this.closeAutoDistModal();
        this.notify.success(`تم توزيع ${plan.length} طالب بنجاح في وضع المعاينة. راجع التوزيع واضغط "اعتماد وحفظ".`);
      },
      error: () => {
        this.busy.set(false);
        this.notify.error('تعذّرت محاكاة التوزيع التلقائي الذكي.');
      }
    });
  }

  // ---------- حفظ المسودة والاعتماد النهائي ----------
  saveDistribution(): void {
    const gId = this.gradeId();
    const yId = this.yearId();
    const origMap = this.originalStudentSectionMap();

    const changedStudents = this.students().filter((s) => s.sectionId !== origMap.get(s.id));
    if (changedStudents.length === 0) {
      this.notify.info('لا توجد تغييرات جديدة لحفظها.');
      return;
    }

    const allocations = changedStudents.map((s) => ({
      student_id: s.id,
      section_id: s.sectionId
    }));

    this.busy.set(true);
    this.svc.bulkDistribute({
      grade_id: gId,
      academic_year_id: yId,
      allocations,
      allow_overflow: true
    }).subscribe({
      next: (res: any) => {
        this.busy.set(false);
        const newOrigMap = new Map<string, string | null>();
        this.students().forEach((st) => newOrigMap.set(st.id, st.sectionId));
        this.originalStudentSectionMap.set(newOrigMap);

        // إزالة علامة المسودة
        this.students.update((list) => list.map((s) => ({ ...s, isDraft: false })));

        this.notify.success(`تم بنجاح اعتماد وحفظ تسكين ${allocations.length} طالب.`);
      },
      error: () => {
        this.busy.set(false);
        this.notify.error('تعذّر حفظ التوزيع المجمع في قاعدة البيانات. حاول مجدداً.');
      }
    });
  }

  resetDraft(): void {
    const origMap = this.originalStudentSectionMap();
    this.students.update((list) =>
      list.map((s) => ({
        ...s,
        sectionId: origMap.get(s.id) || null,
        isDraft: false
      }))
    );
    this.clearSelection();
    this.notify.info('تم التراجع عن مسودة التعديلات غير المحفوظة.');
  }

  // ---------- أدوات العرض والإحصاء ----------
  studentsInSection(sectionId: string): DistStudent[] {
    return this.students().filter((s) => s.sectionId === sectionId);
  }

  countInSection(sectionId: string): number {
    return this.studentsInSection(sectionId).length;
  }

  countByGender(gender: string): number {
    return this.gradeStudents().filter((s) => s.gender === gender).length;
  }

  getSectionPercent(sec: DistSection): number {
    const count = this.countInSection(sec.id);
    return sec.capacity ? Math.round((count / sec.capacity) * 100) : 0;
  }

  getSectionMeterWidth(sec: DistSection): number {
    return Math.min(100, this.getSectionPercent(sec));
  }

  isNearCapacity(sec: DistSection): boolean {
    const count = this.countInSection(sec.id);
    return count >= sec.capacity * 0.85 && count <= sec.capacity;
  }

  getCapacityText(sec: DistSection): string {
    const count = this.countInSection(sec.id);
    const left = sec.capacity - count;
    if (left > 0) return `${left} مقعد متاح`;
    if (left === 0) return 'الشعبة ممتلئة';
    return `تجاوز بـ ${Math.abs(left)} طالب`;
  }

  getGenderLabel(gender: string): string {
    const map: Record<string, string> = { male: 'بنين', female: 'بنات', mixed: 'مختلط' };
    return map[gender] || gender;
  }

  getInitials(name: string): string {
    const parts = (name || '').trim().split(/\s+/);
    if (parts.length > 1) {
      return parts[0][0] + parts[1][0];
    }
    return (name || 'ط').substring(0, 2);
  }

  // ---------- الطباعة والتقارير ----------
  openPrintRoster(sec: DistSection): void {
    this.printSection.set(sec);
  }

  triggerBrowserPrint(): void {
    window.print();
  }

  selectedGradeName(): string {
    const g = this.grades().find((x) => x.id === this.gradeId());
    return g ? g.name : '';
  }

  selectedYearName(): string {
    const y = this.years().find((x) => x.id === this.yearId());
    return y ? y.name : '';
  }

  todayFormatted(): string {
    const d = new Date();
    return d.toLocaleDateString('ar-SD', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // ---------- النقل والترقية الفردية ----------
  openTransfer(s: DistStudent): void {
    this.transferFor.set(s);
    this.transferTarget = '';
  }

  confirmTransfer(): void {
    const s = this.transferFor();
    const target = this.transferTarget;
    if (!s || !target) return;

    const origMap = this.originalStudentSectionMap();
    this.students.update((list) =>
      list.map((item) => (item.id === s.id ? { ...item, sectionId: target, isDraft: target !== origMap.get(item.id) } : item))
    );

    this.transferFor.set(null);
    this.notify.success(`تم نقل ${s.name} في المسودة.`);
  }

  openPromote(s: DistStudent): void {
    this.promoteFor.set(s);
    this.promoteTarget = '';
  }

  confirmPromote(): void {
    const s = this.promoteFor();
    const targetGrade = this.promoteTarget;
    if (!s || !targetGrade || this.busy()) return;

    this.busy.set(true);
    this.svc.promoteStudent(s.id, {
      from_grade_id: this.gradeId(),
      to_grade_id: targetGrade,
      academic_year_id: this.yearId()
    }).subscribe({
      next: () => {
        this.busy.set(false);
        this.promoteFor.set(null);
        this.students.update((list) => list.filter((x) => x.id !== s.id));
        this.notify.success(`تمت ترقية الطالب ${s.name} بنجاح إلى الصف الأعلى.`);
      },
      error: () => {
        this.busy.set(false);
        this.notify.error('تعذّرت ترقية الطالب.');
      }
    });
  }
}
