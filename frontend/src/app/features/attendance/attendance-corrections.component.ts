import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbBadgeComponent } from '../../shared/nebras/nb-badge.component';
import { NbLoadingComponent } from '../../shared/nebras/nb-loading.component';

@Component({
  selector: 'app-attendance-corrections',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    NbPageHeaderComponent,
    NbPanelComponent,
    NbBadgeComponent,
    NbLoadingComponent
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="طلبات تصحيح الحضور"
        subtitle="مراجعة واعتماد طلبات تعديل البصمات المقدمة من الموظفين"
      >
        <div class="header-nav">
          <a routerLink="/attendance/dashboard" class="nav-btn">نظرة عامة</a>
          <a routerLink="/attendance/shifts" class="nav-btn">الدوامات وجدولة العمل</a>
          <a routerLink="/attendance/corrections" class="nav-btn active">طلبات التصحيح</a>
        </div>
      </nb-page-header>

      <!-- قائمة طلبات تصحيح البصمة -->
      <nb-panel title="طلبات التعديل المعلقة" [flush]="true">
        <div class="tbl">
          <div class="tbl-head">
            <span>الموظف</span>
            <span>تاريخ الطلب</span>
            <span>الحالة المعروضة</span>
            <span>الدخول المطلوب</span>
            <span>الخروج المطلوب</span>
            <span>سبب التصحيح</span>
            <span>الإجراءات</span>
          </div>

          @if (isLoading()) {
            <nb-loading message="جاري تحميل طلبات تصحيح الحضور المعلقة..."></nb-loading>
          } @else {
            @for (req of requests(); track req.id) {
              <div class="tbl-row">
                <div class="emp-profile">
                  <div class="avatar">{{ req.employee_name.charAt(0) }}</div>
                  <div class="emp-info">
                    <span class="name">{{ req.employee_name }}</span>
                    <span class="dept">{{ req.department }}</span>
                  </div>
                </div>

                <span class="tab-num">{{ req.date }}</span>
                <span><nb-badge kind="warning">نسيان بصمة</nb-badge></span>
                <span class="time-req">{{ req.requested_check_in }}</span>
                <span class="time-req">{{ req.requested_check_out }}</span>
                <span class="reason-text" [title]="req.reason">{{ req.reason }}</span>
                
                <div class="actions">
                  <button class="approve-btn" (click)="approve(req.id)">اعتماد</button>
                  <button class="reject-btn" (click)="reject(req.id)">رفض</button>
                </div>
              </div>
            }

            @if (requests().length === 0) {
              <div class="tbl-empty">لا توجد طلبات تصحيح معلقة حالياً.</div>
            }
          }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; background: #F8F9FC; }
    .header-nav { display: flex; gap: 8px; margin-top: 12px; align-items: center; width: 100%; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 8px; }
    .nav-btn { text-decoration: none; padding: 8px 16px; font-size: 13px; font-weight: 600; color: var(--nb-text-secondary); border-radius: 6px; transition: all 0.2s; }
    .nav-btn:hover { background: var(--nb-surface-raised); color: var(--nb-text); }
    .nav-btn.active { background: #101828; color: #fff; }

    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1.2fr 1.2fr 2fr 1.5fr; gap: 12px; padding: 12px 18px; align-items: center; }
    .tbl-head { background: #FCFCFD; border-bottom: 1px solid var(--nb-border-soft); font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text); }
    .tbl-row:hover { background: #F9FAFB; }

    .emp-profile { display: flex; align-items: center; gap: 10px; }
    .avatar { width: 34px; height: 34px; border-radius: 50%; background: #EEF2F6; color: #475467; font-weight: 700; display: grid; place-items: center; font-size: 14px; }
    .emp-info { display: flex; flex-direction: column; gap: 2px; }
    .emp-info .name { font-weight: 700; color: var(--nb-text); }
    .emp-info .dept { font-size: 11px; color: var(--nb-text-muted); }

    .tab-num { font-variant-numeric: tabular-nums; }
    .time-req { font-variant-numeric: tabular-nums; font-weight: 700; color: #475467; }
    .reason-text { color: var(--nb-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12.5px; }

    .actions { display: flex; gap: 8px; }
    .approve-btn, .reject-btn { border: 1px solid var(--nb-border); border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
    .approve-btn { background: #12B76A; color: #fff; border-color: #12B76A; }
    .approve-btn:hover { background: #109f5c; }
    .reject-btn { background: #FFF; color: #D92D20; border-color: #FDA29B; }
    .reject-btn:hover { background: #FEF3F2; }

    .tbl-empty { padding: 48px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
  `]
})
export class AttendanceCorrectionsComponent implements OnInit {
  requests = signal<any[]>([]);
  isLoading = signal(false);

  ngOnInit() {
    this.loadPendingRequests();
  }

  loadPendingRequests() {
    this.isLoading.set(true);
    setTimeout(() => {
      this.requests.set([
        {
          id: 1,
          employee_name: 'KAMRUL HASAN',
          department: 'الخدمات العامة',
          date: '2026-07-15',
          requested_check_in: '12:05 مساءً',
          requested_check_out: '08:00 مساءً',
          reason: 'نسيت تسجيل الدخول بسبب عطل في شبكة الواي فاي للفرع.'
        }
      ]);
      this.isLoading.set(false);
    }, 600);
  }

  approve(id: number) {
    this.requests.update(reqs => reqs.filter(r => r.id !== id));
  }

  reject(id: number) {
    this.requests.update(reqs => reqs.filter(r => r.id !== id));
  }
}
