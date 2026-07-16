import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
        <!-- قسم الهاتف المحاكي -->
        <div class="simulator-card">
          <div class="phone-frame">
            <div class="phone-screen">
              <div class="phone-header">
                <span class="carrier">نبراس للعمل</span>
                <span class="time">12:00 م</span>
              </div>
              
              <div class="phone-content">
                <div class="avatar-badge">
                  <div class="avatar-big">M</div>
                  <span class="emp-name">محمد مهدي محمد سيف</span>
                  <span class="emp-role">شيف الحلويات</span>
                </div>

                <div class="status-box">
                  <div class="time-now">08:05:00 ص</div>
                  <div class="date-now">الجمعة، 17 يوليو 2026</div>
                </div>

                <!-- إعدادات المحاكي المباشرة -->
                <div class="simulator-controls">
                  <label class="section-title">إعدادات محاكاة الهاتف الجغرافي</label>
                  
                  <div class="control-group">
                    <label>موقع الموظف الحالي:</label>
                    <select (change)="onLocationChange($event)">
                      <option value="inside">داخل النطاق الجغرافي للفرع المعتمد (الرياض)</option>
                      <option value="outside">خارج النطاق الجغرافي (على بعد 1.5 كم)</option>
                    </select>
                  </div>

                  <div class="control-group">
                    <label>الوقت الحالي للمحاكاة:</label>
                    <select (change)="onTimeChange($event)">
                      <option value="ontime">ضمن الوقت المجدول (08:00 صباحاً)</option>
                      <option value="outside_time">خارج الوقت المجدول (03:00 ليلاً)</option>
                    </select>
                  </div>
                </div>

                <!-- زر تسجيل الحضور الفعلي -->
                <button class="fingerprint-btn" [class.error]="hasError()" (click)="simulateCheckIn()">
                  <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span>تسجيل الحضور الجوال</span>
                </button>

                <!-- رسالة النتيجة في شاشة الهاتف -->
                @if (resultMessage()) {
                  <div class="result-msg" [class.success]="isSuccess()" [class.error]="!isSuccess()">
                    {{ resultMessage() }}
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- شرح آلية العمل -->
        <nb-panel title="آلية عمل التحقق الجغرافي والزمني (Geofencing)">
          <div class="explainer">
            <h3>كيف تعمل ميزة تسجيل الحضور الذكي في نبراس؟</h3>
            <p>يعتمد تسجيل الحضور عبر تطبيق الجوال الخاص بالموظفين على ركيزتين أساسيتين لضمان المصداقية والانضباط:</p>
            
            <ul class="features-list">
              <li>
                <strong>التحقق الجغرافي (Geofencing):</strong> يتم مطابقة إحداثيات GPS الخاصة بالهاتف المحمول للموظف لحظة البصمة مع إحداثيات الفرع المسند إليه بقطر حماية أقصاه (150 متراً). إذا كان خارج النطاق يتم رفض الطلب فوراً.
              </li>
              <li>
                <strong>التحقق الزمني:</strong> يتم التحقق من الوردية المجدولة للموظف في نفس اليوم؛ ولا يُسمح بالبصمة إذا كان الوقت الحالي خارج هامش الوردية المحدد (مثلاً قبل البداية بأكثر من ساعتين أو بعد النهاية).
              </li>
            </ul>

            <div class="integration-notice">
              <h4>التكامل المالي مع مسير الرواتب</h4>
              <p>عند نجاح تسجيل الحضور والانصراف، يتم احتساب التأخير التلقائي بالدقائق بنهاية الشهر وتصديرها مباشرة إلى موديول الرواتب والتعويضات لخصمها من الراتب الأساسي وفقاً للمعادلة المعتمدة في نبراس.</p>
            </div>
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

    .layout-grid { display: grid; grid-template-columns: 360px 1fr; gap: 20px; margin-top: 16px; align-items: start; }
    
    .phone-frame {
      background: #000;
      border-radius: 40px;
      padding: 12px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      border: 4px solid #333;
      width: 100%;
    }
    .phone-screen {
      background: #F9FAFB;
      border-radius: 32px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 560px;
      border: 1px solid #101828;
    }
    .phone-header {
      background: #101828;
      color: #fff;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
    }
    .phone-content {
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      flex: 1;
    }

    .avatar-badge { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .avatar-big { width: 54px; height: 54px; border-radius: 50%; background: #7F56D9; color: #fff; font-weight: 700; font-size: 22px; display: grid; place-items: center; }
    .emp-name { font-weight: 700; font-size: 13px; color: #101828; }
    .emp-role { font-size: 11px; color: #667085; }

    .status-box { text-align: center; background: #fff; border: 1px solid var(--nb-border); border-radius: 12px; width: 100%; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .time-now { font-size: 22px; font-weight: 800; color: #101828; font-variant-numeric: tabular-nums; }
    .date-now { font-size: 11px; color: #667085; margin-top: 4px; }

    .simulator-controls { background: #F3F4F6; border-radius: 12px; padding: 12px; width: 100%; display: flex; flex-direction: column; gap: 8px; }
    .section-title { font-size: 11px; font-weight: 800; color: #475467; text-transform: uppercase; margin-bottom: 4px; }
    .control-group { display: flex; flex-direction: column; gap: 4px; }
    .control-group label { font-size: 10.5px; color: #344054; font-weight: 600; }
    .control-group select { height: 32px; border-radius: 6px; border: 1px solid #D1D5DB; font-size: 11.5px; padding: 0 8px; outline: none; background: #fff; font-family: var(--nb-font-family); }

    .fingerprint-btn {
      width: 100%;
      background: linear-gradient(135deg, #7F56D9 0%, #6941C6 100%);
      color: #fff;
      border: none;
      border-radius: 12px;
      padding: 12px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(105, 65, 198, 0.25);
    }
    .fingerprint-btn:active { transform: scale(0.98); }
    
    .result-msg { width: 100%; padding: 10px 12px; border-radius: 8px; font-size: 11.5px; font-weight: 700; text-align: center; }
    .result-msg.success { background: #ECFDF3; color: #027A48; border: 1px solid #A3E635; }
    .result-msg.error { background: #FEF3F2; color: #B42318; border: 1px solid #FECDCA; }

    .explainer { display: flex; flex-direction: column; gap: 14px; padding: 4px; }
    .explainer h3 { font-size: 15px; font-weight: 800; color: var(--nb-text); margin: 0; }
    .explainer p { font-size: 13px; color: var(--nb-text-secondary); line-height: 1.6; margin: 0; }
    
    .features-list { display: flex; flex-direction: column; gap: 10px; padding-inline-start: 18px; margin: 0; }
    .features-list li { font-size: 12.5px; color: var(--nb-text-secondary); line-height: 1.5; }
    
    .integration-notice { background: #EEF2F6; border-radius: 8px; padding: 12px 14px; border-inline-start: 4px solid #7F56D9; margin-top: 8px; }
    .integration-notice h4 { font-size: 13px; font-weight: 800; color: #101828; margin: 0 0 6px 0; }
    .integration-notice p { font-size: 12px; color: #475467; margin: 0; line-height: 1.5; }
  `]
})
export class AttendanceSimulatorComponent {
  userLocation = signal('inside');
  userTime = signal('ontime');
  resultMessage = signal('');
  isSuccess = signal(true);
  hasError = signal(false);

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
    if (this.userLocation() === 'outside') {
      this.isSuccess.set(false);
      this.resultMessage.set('🚨 تم رفض البصمة! أنت خارج النطاق الجغرافي المعتمد للفرع.');
      this.hasError.set(true);
      setTimeout(() => this.hasError.set(false), 600);
    } else if (this.userTime() === 'outside_time') {
      this.isSuccess.set(false);
      this.resultMessage.set('🚨 تم رفض البصمة! الوقت الحالي خارج النطاق الزمني للوردية المجدولة.');
      this.hasError.set(true);
      setTimeout(() => this.hasError.set(false), 600);
    } else {
      this.isSuccess.set(true);
      this.resultMessage.set('✅ تم تسجيل حضورك بنجاح! الموقع والوقت ضمن النطاق المعتمد.');
    }
  }
}
