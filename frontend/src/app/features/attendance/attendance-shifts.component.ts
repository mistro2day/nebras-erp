import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbDrawerComponent } from '../../shared/nebras/nb-drawer.component';
import { NbDatepickerComponent } from '../../shared/nebras/nb-datepicker.component';
import { NbLoadingComponent } from '../../shared/nebras/nb-loading.component';

@Component({
  selector: 'app-attendance-shifts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NbPageHeaderComponent,
    NbPanelComponent,
    NbDrawerComponent,
    NbDatepickerComponent,
    NbLoadingComponent
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="جدولة الدوامات"
        subtitle="توزيع الورديات الأسبوعية وتعيين أوقات وفروع العمل للموظفين"
      >
        <div class="header-nav">
          <a routerLink="/attendance/dashboard" class="nav-btn">نظرة عامة</a>
          <a routerLink="/attendance/shifts" class="nav-btn active">الدوامات وجدولة العمل</a>
          <a routerLink="/attendance/corrections" class="nav-btn">طلبات التصحيح</a>
          <button class="add-shift-btn" (click)="openAssignDrawer()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            إسناد دوام
          </button>
        </div>
      </nb-page-header>

      <!-- جدول توزيع الورديات الأسبوعي (شكل جدول دوامات جسر) -->
      <nb-panel title="جدول الدوامات (الأسبوع الحالي)" [flush]="true">
        <div class="scheduler-tbl">
          <div class="sch-head">
            <span>الموظف</span>
            <span>الأحد 12 يوليو</span>
            <span>الإثنين 13 يوليو</span>
            <span>الثلاثاء 14 يوليو</span>
            <span>الأربعاء 15 يوليو</span>
            <span>الخميس 16 يوليو</span>
            <span>الجمعة 17 يوليو</span>
            <span>السبت 18 يوليو</span>
          </div>

          @if (isLoading()) {
            <nb-loading message="جاري تحميل جدول الدوامات وتوزيع فترات العمل..."></nb-loading>
          } @else {
            @for (emp of employeesShifts(); track emp.id) {
              <div class="sch-row">
                <!-- الموظف -->
                <div class="emp-col">
                  <span class="name">{{ emp.name }}</span>
                  <span class="position">{{ emp.position }}</span>
                </div>
              
                <!-- أيام الأسبوع -->
                @for (day of days; track day) {
                  <div class="day-slot" [class.holiday]="emp.schedule[day].isHoliday">
                    @if (emp.schedule[day].isHoliday) {
                      <span class="holiday-lbl">يوم عطلة</span>
                    } @else {
                      <div class="shift-card" [style.border-right-color]="emp.schedule[day].color">
                        <span class="time">{{ emp.schedule[day].time }}</span>
                        <span class="branch">{{ emp.schedule[day].branch }}</span>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          }
        </div>
      </nb-panel>

      <!-- الدرج الجانبي لإسناد وردية دوام جديدة -->
      <nb-drawer [open]="isDrawerOpen()" title="إسناد دوام للموظفين" (closed)="closeAssignDrawer()">
        <div class="drawer-form">
          <div class="form-group">
            <label>اختر الموظف أو الموظفين</label>
            <select class="form-control">
              <option>RUMON AHMED MAFIJUL ISLAM</option>
              <option>SHAHIDUL ISLAM</option>
              <option>محمد مهدي محمد سيف</option>
              <option>KAMRUL HASAN</option>
            </select>
          </div>

          <div class="form-group row-flex">
            <div class="flex-item">
              <label>تاريخ البدء</label>
              <nb-datepicker [(value)]="startDate" placeholder="تاريخ البدء"></nb-datepicker>
            </div>
          </div>

          <div class="form-group">
            <label class="toggle-container">
              <input type="checkbox" [(ngModel)]="isHoliday" (change)="toggleHoliday($event)" />
              <span class="toggle-label">تعيين كـ يوم عطلة</span>
            </label>
          </div>

          <div class="form-group">
            <label>الموقع الجغرافي / الفرع المسموح به للبصمة</label>
            <select class="form-control">
              <option>الفرع الرئيسي - الرياض (AL DIAFA)</option>
              <option>فرع حي الياسمين (ABER KHAMIS)</option>
              <option>السماح بالبصمة من أي موقع</option>
            </select>
            <small class="hint-text">إذا تم ربط الوردية بفرع معين، فلن يتمكن الموظف من تسجيل حضور خارج النطاق الجغرافي لهذا الفرع.</small>
          </div>

          <div class="form-group">
            <label>المدة الزمنية المجدولة</label>
            <div class="time-range">
              <input type="time" class="form-control" value="08:00" />
              <span>إلى</span>
              <input type="time" class="form-control" value="16:00" />
            </div>
          </div>
        </div>

        <div drawer-actions>
          <button class="btn-primary" (click)="saveAssignment()">حفظ ونشر</button>
          <button class="btn-secondary" (click)="closeAssignDrawer()">إلغاء</button>
        </div>
      </nb-drawer>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; background: #F8F9FC; }
    .header-nav { display: flex; gap: 8px; margin-top: 12px; align-items: center; width: 100%; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 8px; }
    .nav-btn { text-decoration: none; padding: 8px 16px; font-size: 13px; font-weight: 600; color: var(--nb-text-secondary); border-radius: 6px; transition: all 0.2s; }
    .nav-btn:hover { background: var(--nb-surface-raised); color: var(--nb-text); }
    .nav-btn.active { background: #101828; color: #fff; }

    .add-shift-btn {
      margin-inline-start: auto;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      background: #101828;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    .add-shift-btn:hover { background: #1f2d3d; }

    .scheduler-tbl { display: flex; flex-direction: column; overflow-x: auto; }
    .sch-head, .sch-row { display: grid; grid-template-columns: 200px repeat(7, 1fr); min-width: 1000px; }
    .sch-head { background: #FCFCFD; border-bottom: 1px solid var(--nb-border-soft); padding: 12px 0; }
    .sch-head span { text-align: center; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .sch-head span:first-child { text-align: start; padding-inline-start: 16px; }

    .sch-row { border-bottom: 1px solid var(--nb-border-row); align-items: center; padding: 8px 0; }
    .sch-row:hover { background: #F9FAFB; }
    
    .emp-col { display: flex; flex-direction: column; padding-inline-start: 16px; justify-content: center; }
    .emp-col .name { font-weight: 700; font-size: 12.5px; color: var(--nb-text); }
    .emp-col .position { font-size: 10.5px; color: var(--nb-text-muted); }

    .day-slot { padding: 4px; display: flex; justify-content: center; align-items: center; min-height: 70px; }
    .day-slot.holiday { background: #FCFCFD; border-radius: 4px; }
    .holiday-lbl { font-size: 11px; color: var(--nb-text-faint); font-weight: 600; }

    .shift-card {
      width: 100%;
      background: #FFF;
      border: 1px solid var(--nb-border);
      border-right: 4px solid #7F56D9;
      border-radius: 6px;
      padding: 6px 8px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      box-shadow: 0 1px 2px rgba(16,24,40,0.04);
    }
    .shift-card .time { font-size: 10px; font-weight: 700; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .shift-card .branch { font-size: 9px; color: var(--nb-text-muted); font-weight: 600; }

    /* نماذج الدرج */
    .drawer-form { display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .form-control { height: 40px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 12px; font-size: 13px; outline: none; background: #fff; font-family: var(--nb-font-family); }
    .row-flex { display: flex; gap: 12px; }
    .flex-item { flex: 1; display: flex; flex-direction: column; gap: 6px; }
    
    .toggle-container { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .toggle-label { font-size: 13px; font-weight: 600; color: var(--nb-text); }

    .time-range { display: flex; align-items: center; gap: 10px; }
    .time-range span { font-size: 12px; color: var(--nb-text-muted); font-weight: 700; }

    .hint-text { font-size: 11px; color: var(--nb-text-muted); line-height: 1.4; }

    .btn-primary { background: #101828; color: #fff; border: none; padding: 10px 18px; border-radius: var(--nb-radius); font-size: 13px; font-weight: 700; cursor: pointer; }
    .btn-primary:hover { background: #1f2d3d; }
    .btn-secondary { background: transparent; border: 1px solid var(--nb-border); color: var(--nb-text-secondary); padding: 10px 18px; border-radius: var(--nb-radius); font-size: 13px; font-weight: 700; cursor: pointer; }
    .btn-secondary:hover { background: var(--nb-surface-raised); }
  `]
})
export class AttendanceShiftsComponent implements OnInit {
  http = inject(HttpClient);

  isDrawerOpen = signal(false);
  startDate = signal('2026-07-12');
  isHoliday = false;

  days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  isLoading = signal(false);
  employeesShifts = signal<any[]>([]);

  ngOnInit() {
    this.loadRealSchedules();
  }

  loadRealSchedules() {
    this.isLoading.set(true);
    this.http.get<any>('/api/v1/employees/employees/').subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const list = res?.results || res?.data || res;
        if (Array.isArray(list) && list.length > 0) {
          const mapped = list.map((emp: any, idx: number) => {
            const shiftColor = idx % 3 === 0 ? '#FD853A' : (idx % 3 === 1 ? '#2E90FA' : '#12B76A');
            const branchName = emp.department || 'الفرع الرئيسي';
            return {
              id: emp.id,
              name: emp.full_name_ar,
              position: emp.position || 'موظف',
              schedule: {
                sun: { time: '08:00 ص - 04:00 م', branch: branchName, color: shiftColor, isHoliday: false },
                mon: { time: '08:00 ص - 04:00 م', branch: branchName, color: shiftColor, isHoliday: false },
                tue: { time: '08:00 ص - 04:00 م', branch: branchName, color: shiftColor, isHoliday: false },
                wed: { time: '08:00 ص - 04:00 م', branch: branchName, color: shiftColor, isHoliday: false },
                thu: { time: '08:00 ص - 04:00 م', branch: branchName, color: shiftColor, isHoliday: false },
                fri: { time: '', branch: '', color: '', isHoliday: true },
                sat: { time: '', branch: '', color: '', isHoliday: true }
              }
            };
          });
          this.employeesShifts.set(mapped);
        } else {
          this.loadMockSchedules();
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.loadMockSchedules();
      }
    });
  }

  loadMockSchedules() {
    const mockShifts = [
      {
        id: 1,
        name: 'RUMON AHMED MAFIJUL ISLAM',
        position: 'باريستا - 200',
        schedule: {
          sun: { time: '07:00 ص - 04:00 م', branch: 'AL DIAFA', color: '#FD853A', isHoliday: false },
          mon: { time: '07:00 ص - 04:00 م', branch: 'AL DIAFA', color: '#FD853A', isHoliday: false },
          tue: { time: '07:00 ص - 04:00 م', branch: 'AL DIAFA', color: '#FD853A', isHoliday: false },
          wed: { time: '07:00 ص - 04:00 م', branch: 'AL DIAFA', color: '#FD853A', isHoliday: false },
          thu: { time: '07:00 ص - 04:00 م', branch: 'AL DIAFA', color: '#FD853A', isHoliday: false },
          fri: { time: '', branch: '', color: '', isHoliday: true },
          sat: { time: '', branch: '', color: '', isHoliday: true }
        }
      }
    ];
    this.employeesShifts.set(mockShifts);
  }

  openAssignDrawer() {
    this.isDrawerOpen.set(true);
  }

  closeAssignDrawer() {
    this.isDrawerOpen.set(true);
    // إغلاق الدرج
    this.isDrawerOpen.set(false);
  }

  toggleHoliday(event: any) {
    this.isHoliday = event.target.checked;
  }

  saveAssignment() {
    this.closeAssignDrawer();
  }
}
