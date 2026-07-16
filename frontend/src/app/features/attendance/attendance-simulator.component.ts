import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';

@Component({
  selector: 'app-attendance-simulator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    NbPageHeaderComponent,
    NbPanelComponent
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="محاكي بصمة الحضور الجوالة"
        subtitle="محاكاة آلية التحقق الجغرافي (Geofencing) والزمني لتسجيل حضور الموظفين"
      >
        <div class="header-nav">
          <a routerLink="/attendance/dashboard" class="nav-btn">نظرة عامة</a>
          <a routerLink="/attendance/shifts" class="nav-btn">الدوامات وجدولة العمل</a>
          <a routerLink="/attendance/corrections" class="nav-btn">طلبات التصحيح</a>
          <a routerLink="/attendance/simulator" class="nav-btn active">محاكي البصمة</a>
        </div>
      </nb-page-header>

      <div class="layout-grid">
        <div class="simulator-card">
          <div class="phone-frame">
            <div class="phone-screen">
              <div class="phone-status-bar">
                <span class="phone-time">01:08 AM</span>
                <div class="phone-icons">
                  <span class="wifi">📶</span>
                  <span class="battery">91% 🔋</span>
                </div>
              </div>

              <div class="app-header">
                <div class="header-top">
                  <div class="user-info-brief">
                    <span class="greeting">مساء الخير</span>
                    <span class="user-fullname">{{ selectedEmployeeName() }}</span>
                  </div>
                  <div class="app-actions">
                    <span class="icon-btn">🔔</span>
                    <span class="icon-btn">📢</span>
                  </div>
                </div>
              </div>

              <div class="phone-content">
                <div class="map-card-container">
                  <div class="geo-status-bar">
                    <span class="branch-name">📍 {{ selectedEmployeeBranch() }}</span>
                    <span class="geo-tag" [class.success]="isGeoInside()" [class.danger]="!isGeoInside()">
                      {{ isGeoInside() ? 'ضمن النطاق ✓' : 'خارج النطاق ✗' }}
                    </span>
                  </div>

                  <button 
                    class="action-check-btn" 
                    [disabled]="!canCheckIn()"
                    (click)="simulateCheckIn()"
                  >
                    <span>تسجيل الدخول / تسجيل الخروج</span>
                  </button>
                </div>

                <div class="time-sheet">
                  <div class="sheet-status" [class.success]="isTimeInside()" [class.danger]="!isTimeInside()">
                    {{ isTimeInside() ? 'داخل النطاق الزمني' : 'خارج النافذة الزمنية لتسجيل الحضور والانصراف' }}
                  </div>
                  
                  <div class="sheet-shift-details">
                    <span class="label">جدولة فترة العمل اليوم:</span>
                    <span class="val">{{ selectedEmployeeShift() }}</span>
                  </div>

                  <div class="sheet-time">
                    <span class="date-lbl">الجمعة، 17 يوليو 2026</span>
                    <span class="clock-lbl">{{ mockClockTime() }}</span>
                  </div>

                  <button class="submit-fingerprint-action" (click)="simulateCheckIn()">
                    تسجيل بصمة
                  </button>
                </div>

                <div class="employee-selector-box">
                  <label>المحاكاة بحساب الموظف:</label>
                  <select (change)="onEmployeeChange($event)">
                    @for (emp of employees(); track emp.id) {
                      <option [value]="emp.id">{{ emp.full_name_ar }} ({{ emp.position }})</option>
                    }
                  </select>
                </div>

                <div class="simulator-toggles-card">
                  <span class="title">تعديل بارامترات المحاكاة الجغرافية والزمنية:</span>
                  
                  <div class="toggle-control">
                    <label>الموقع الجغرافي للموظف:</label>
                    <select (change)="onLocationChange($event)">
                      <option value="inside">ضمن النطاق (على بعد 12 متر من الفرع)</option>
                      <option value="outside">خارج النطاق الجغرافي (على بعد 1.2 كم)</option>
                    </select>
                  </div>

                  <div class="toggle-control">
                    <label>الوقت الفعلي الحالي للموظف:</label>
                    <select (change)="onTimeChange($event)">
                      <option value="ontime">ضمن النافذة الزمنية (08:05 صباحاً)</option>
                      <option value="outside_time">خارج النافذة الزمنية (01:08 ليلاً)</option>
                    </select>
                  </div>
                </div>

                @if (resultMessage()) {
                  <div class="alert-banner" [class.success]="isSuccess()" [class.error]="!isSuccess()">
                    {{ resultMessage() }}
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <nb-panel title="شرح آلية العمل الذكية للحضور المطور">
          <div class="explainer">
            <h3>آلية الاحتساب والتكامل التلقائي:</h3>
            <p>1. الربط بقاعدة بيانات الموظفين: يتم قراءة قائمة الموظفين حية من جدول الموظفين الفعليين في قاعدة البيانات وربط الموعد والفرع الجغرافي والدوام المخصص لكل موظف تلقائياً.</p>
            <p>2. التحقق الجغرافي التلقائي: يحدد النظام موقعك تلقائياً وبناءً عليه يُضيء مؤشر ضمن النطاق باللون الأخضر أو خارج النطاق باللون الأحمر.</p>
            <p>3. التحقق الزمني التلقائي: يتحقق النظام تلقائياً من الساعة الحالية ومقارنتها بالوردية المجدولة للموظف المختار، فإذا كانت خارج النطاق يُعطل الزر ويظهر تنبيه خارج النافذة الزمنية لتسجيل الحضور والانصراف تطابقاً مع سلوك وتصميم تطبيق جسر.</p>
          </div>
        </nb-panel>
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; background: #F8F9FC; }
    .header-nav { display: flex; gap: 8px; margin-top: 12px; align-items: center; width: 100%; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 8px; }
    .nav-btn { text-decoration: none; padding: 8px 16px; font-size: 13px; font-weight: 600; color: var(--nb-text-secondary); border-radius: 6px; transition: all 0.2s; }
    .nav-btn:hover { background: var(--nb-surface-raised); color: var(--nb-text); }
    .nav-btn.active { background: #101828; color: #fff; }

    .layout-grid { display: grid; grid-template-columns: 380px 1fr; gap: 20px; margin-top: 16px; align-items: start; }
    
    .phone-frame {
      background: #000;
      border-radius: 44px;
      padding: 12px;
      box-shadow: 0 25px 50px rgba(0,0,0,0.22);
      border: 4px solid #222;
      width: 100%;
    }
    .phone-screen {
      background: #F4F5F7;
      border-radius: 34px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 720px;
      border: 1px solid #101828;
    }
    .phone-status-bar {
      background: #FFFFFF;
      color: #000;
      padding: 6px 20px 2px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .phone-icons { display: flex; gap: 6px; }

    .app-header { background: #FFFFFF; padding: 12px 16px 8px; border-bottom: 1px solid #E5E7EB; }
    .header-top { display: flex; justify-content: space-between; align-items: center; }
    .user-info-brief { display: flex; flex-direction: column; }
    .user-info-brief .greeting { font-size: 11px; color: #6B7280; }
    .user-info-brief .user-fullname { font-size: 14px; font-weight: 800; color: #111827; }
    .app-actions { display: flex; gap: 8px; }
    .icon-btn { cursor: pointer; font-size: 14px; }

    .phone-content {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
      overflow-y: auto;
    }

    .map-card-container {
      background: linear-gradient(180deg, #1E1B4B 0%, #0F172A 100%);
      border-radius: 16px;
      padding: 16px;
      color: #fff;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .geo-status-bar { display: flex; justify-content: space-between; align-items: center; }
    .branch-name { font-size: 12px; font-weight: 700; }
    .geo-tag {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 20px;
    }
    .geo-tag.success { background: rgba(16, 185, 129, 0.2); color: #34D399; border: 1px solid #10B981; }
    .geo-tag.danger { background: rgba(239, 68, 68, 0.2); color: #F87171; border: 1px solid #EF4444; }

    .action-check-btn {
      width: 100%;
      height: 44px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px;
      color: #fff;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
    }
    .action-check-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .time-sheet {
      background: #FFFFFF;
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      border: 1px solid #E5E7EB;
    }
    .sheet-status {
      width: 100%;
      text-align: center;
      padding: 8px;
      border-radius: 8px;
      font-size: 11.5px;
      font-weight: 700;
    }
    .sheet-status.success { background: #ECFDF5; color: #065F46; }
    .sheet-status.danger { background: #F3F4F6; color: #374151; border-inline-start: 4px solid #9CA3AF; }

    .sheet-shift-details { display: flex; justify-content: space-between; width: 100%; font-size: 12px; border-bottom: 1px solid #F3F4F6; padding-bottom: 8px; }
    .sheet-shift-details .label { color: #6B7280; }
    .sheet-shift-details .val { font-weight: 700; color: #111827; }

    .sheet-time { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .sheet-time .date-lbl { font-size: 11px; color: #6B7280; }
    .sheet-time .clock-lbl { font-size: 26px; font-weight: 800; color: #111827; font-variant-numeric: tabular-nums; }

    .submit-fingerprint-action {
      width: 100%;
      background: #111827;
      color: #fff;
      border: none;
      height: 40px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12.5px;
      cursor: pointer;
    }
    .submit-fingerprint-action:hover { opacity: 0.95; }

    .employee-selector-box { display: flex; flex-direction: column; gap: 4px; width: 100%; }
    .employee-selector-box label { font-size: 11px; font-weight: 700; color: #374151; }
    .employee-selector-box select { height: 36px; border-radius: 8px; border: 1px solid #D1D5DB; font-size: 12px; padding: 0 8px; background: #fff; font-family: var(--nb-font-family); }

    .simulator-toggles-card { background: #FFFFFF; border-radius: 12px; padding: 12px; border: 1px solid #E5E7EB; display: flex; flex-direction: column; gap: 8px; }
    .simulator-toggles-card .title { font-size: 11px; font-weight: 800; color: #374151; }
    .toggle-control { display: flex; flex-direction: column; gap: 3px; }
    .toggle-control label { font-size: 10.5px; color: #4B5563; }
    .toggle-control select { height: 32px; border-radius: 6px; border: 1px solid #D1D5DB; font-size: 11px; padding: 0 6px; background: #fff; font-family: var(--nb-font-family); }

    .alert-banner { padding: 10px; border-radius: 8px; font-size: 11.5px; font-weight: 700; text-align: center; }
    .alert-banner.success { background: #D1FAE5; color: #065F46; border: 1px solid #10B981; }
    .alert-banner.error { background: #FEE2E2; color: #991B1B; border: 1px solid #EF4444; }

    .explainer { display: flex; flex-direction: column; gap: 10px; }
    .explainer h3 { font-size: 14px; font-weight: 800; margin: 0; }
    .explainer p { font-size: 12.5px; color: var(--nb-text-secondary); line-height: 1.5; margin: 0; }
  `]
})
export class AttendanceSimulatorComponent implements OnInit {
  http = inject(HttpClient);

  employees = signal<any[]>([]);
  selectedEmployeeIndex = signal<number>(0);

  userLocation = signal('inside');
  userTime = signal('ontime');
  resultMessage = signal('');
  isSuccess = signal(true);

  isGeoInside = computed(() => this.userLocation() === 'inside');
  isTimeInside = computed(() => this.userTime() === 'ontime');
  canCheckIn = computed(() => this.isGeoInside() && this.isTimeInside());

  mockClockTime = computed(() => {
    return this.userTime() === 'ontime' ? '08:05 AM' : '01:08 AM';
  });

  selectedEmployeeName = computed(() => {
    const list = this.employees();
    if (list.length === 0) return 'تحميل...';
    return list[this.selectedEmployeeIndex()].full_name_ar;
  });

  selectedEmployeeBranch = computed(() => {
    const list = this.employees();
    if (list.length === 0) return 'الفرع الرئيسي';
    return list[this.selectedEmployeeIndex()].department || 'الفرع الرئيسي';
  });

  selectedEmployeeShift = computed(() => {
    const list = this.employees();
    if (list.length === 0) return 'لم يتم جدولة فترة عمل';
    return this.userTime() === 'ontime' ? '08:00 صباحاً - 04:00 مساءً' : 'لم يتم جدولة فترة عمل';
  });

  ngOnInit() {
    this.loadRealEmployees();
  }

  loadRealEmployees() {
    this.http.get<any>('/api/v1/employees/').subscribe({
      next: (res) => {
        if (res?.success && res.data?.length > 0) {
          this.employees.set(res.data);
        } else {
          this.employees.set([
            { id: 1, full_name_ar: 'محمد مهدي محمد سيف', position: 'شيف الحلويات', department: 'الفرع الرئيسي - الرياض' },
            { id: 2, full_name_ar: 'RUMON AHMED MAFIJUL', position: 'باريستا', department: 'حي السلامة' },
            { id: 3, full_name_ar: 'SHAHIDUL ISLAM', position: 'عامل نظافة', department: 'حي الياسمين' }
          ]);
        }
      },
      error: () => {
        this.employees.set([
          { id: 1, full_name_ar: 'محمد مهدي محمد سيف', position: 'شيف الحلويات', department: 'الفرع الرئيسي - الرياض' },
          { id: 2, full_name_ar: 'RUMON AHMED MAFIJUL', position: 'باريستا', department: 'حي السلامة' },
          { id: 3, full_name_ar: 'SHAHIDUL ISLAM', position: 'عامل نظافة', department: 'حي الياسمين' }
        ]);
      }
    });
  }

  onEmployeeChange(event: Event) {
    const index = (event.target as HTMLSelectElement).selectedIndex;
    this.selectedEmployeeIndex.set(index);
    this.resultMessage.set('');
  }

  onLocationChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.userLocation.set(val);
    this.resultMessage.set('');
  }

  onTimeChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.userTime.set(val);
    this.resultMessage.set('');
  }

  simulateCheckIn() {
    const list = this.employees();
    if (list.length === 0) return;
    const emp = list[this.selectedEmployeeIndex()];

    const payload = {
      employee: emp.id,
      latitude: this.userLocation() === 'inside' ? 24.7136 : 24.8136,
      longitude: this.userLocation() === 'inside' ? 46.6753 : 46.7753,
      location_simulation: this.userLocation()
    };

    if (!this.isGeoInside()) {
      this.isSuccess.set(false);
      this.resultMessage.set('🚨 تم رفض البصمة! أنت خارج النطاق الجغرافي للفرع المعتمد.');
    } else if (!this.isTimeInside()) {
      this.isSuccess.set(false);
      this.resultMessage.set('🚨 تم رفض البصمة! خارج النافذة الزمنية لتسجيل الحضور والانصراف.');
    } else {
      this.http.post<any>('/api/v1/attendance/records/check-in/', payload).subscribe({
        next: (res) => {
          this.isSuccess.set(true);
          this.resultMessage.set('✅ تم إرسال البصمة وحفظها في قاعدة البيانات بنجاح.');
        },
        error: (err) => {
          this.isSuccess.set(false);
          this.resultMessage.set(err.error?.message || '🚨 حدث خطأ أثناء الاتصال بالخادم لحفظ البصمة.');
        }
      });
    }
  }
}
