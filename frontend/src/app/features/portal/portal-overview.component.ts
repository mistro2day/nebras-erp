import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PortalService, PortalAnnouncement, PortalSessionInfo } from './portal.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

@Component({
  selector: 'app-portal-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="بوابات الخدمات الإلكترونية (Portals & Self-Service Overview)"
        subtitle="إدارة بوابة ولي الأمر، بوابة الطالب، وبوابة المتقدم، وتنسيق الإعلانات العامة والجلسات."
      >
        <button class="nb-btn-primary" (click)="toggleAnnouncementModal()">+ نشر إعلان جديد للبوابات</button>
      </nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="أولياء الأمور النشطين" value="1,240" suffix="مستخدم" valueKind="info"></nb-stat-card>
        <nb-stat-card label="الطلاب المسجلين بالبوابة" value="3,450" suffix="طالب" valueKind="success"></nb-stat-card>
        <nb-stat-card label="المتقدمين الجدد بالخدمة الذاتية" value="184" suffix="متقدم" valueKind="warning"></nb-stat-card>
        <nb-stat-card label="نسبة استخدام الخدمات الذاتية" value="94.8 %"></nb-stat-card>
      </div>

      <!-- Quick Access to Portals -->
      <h3 class="section-subtitle">الوصول المباشر لبوابات الخدمات</h3>
      <div class="portals-launch-grid">
        <a routerLink="/portal/parent/dashboard" class="portal-launch-card parent">
          <div class="p-icon">👨‍👩‍👧‍👦</div>
          <div class="p-content">
            <h4>بوابة ولي الأمر (Parent Portal)</h4>
            <p>متابعة الطلاب المكفولين، كشوف الفواتير والمدفوعات، الإعلانات والتواصل مع المدرسة.</p>
          </div>
          <span class="btn-launch">الدخول للبوابة ➔</span>
        </a>

        <a routerLink="/portal/student/dashboard" class="portal-launch-card student">
          <div class="p-icon">🎓</div>
          <div class="p-content">
            <h4>بوابة الطالب (Student Portal)</h4>
            <p>جدول الحصص الدراسية، جدول الامتحانات، الواجبات والمهام الأكاديمية.</p>
          </div>
          <span class="btn-launch">الدخول للبوابة ➔</span>
        </a>

        <a routerLink="/portal/applicant/dashboard" class="portal-launch-card applicant">
          <div class="p-icon">📝</div>
          <div class="p-content">
            <h4>بوابة المتقدم (Applicant Portal)</h4>
            <p>متابعة حالة القبول، رفع الوثائق والمستندات، وجدول المقابلات الشخصية.</p>
          </div>
          <span class="btn-launch">الدخول للبوابة ➔</span>
        </a>
      </div>

      <div class="grid-two-cols">
        <!-- الإعلانات العامة -->
        <nb-panel>
          <div class="panel-head">
            <h3>الإعلانات العامة بالبوابات</h3>
          </div>
          <div class="announcements-list">
            @for (a of announcements(); track a.id) {
              <div class="ann-item">
                <div class="ann-top">
                  <span class="audience-tag" [class.all]="a.target_audience === 'all'">
                    {{ a.target_audience === 'all' ? 'الجميع' : a.target_audience === 'parents' ? 'أولياء الأمور' : 'الطلاب' }}
                  </span>
                  <span class="ann-date">{{ a.publish_date }}</span>
                </div>
                <h4>{{ a.title }}</h4>
                <p>{{ a.content }}</p>
              </div>
            }
          </div>
        </nb-panel>

        <!-- الجلسات النشطة -->
        <nb-panel>
          <div class="panel-head">
            <h3>الجلسات والنشاط الحالي</h3>
          </div>
          <div class="sessions-list">
            @for (s of sessions(); track s.id) {
              <div class="session-item">
                <div class="s-user">
                  <strong>{{ s.user_name }}</strong>
                  <small>{{ s.ip_address }}</small>
                </div>
                <span class="s-time">{{ s.logged_in_at }}</span>
              </div>
            }
          </div>
        </nb-panel>
      </div>

      <!-- Modal إضافة إعلان -->
      @if (showAnnouncementModal()) {
        <div class="modal-backdrop" (click)="toggleAnnouncementModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>نشر إعلان جديد بالبوابة الإلكترونية</h3>
              <button class="close-btn" (click)="toggleAnnouncementModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>عنوان الإعلان *</label>
                <input type="text" [(ngModel)]="newAnn.title" placeholder="مثال: موعد بداية العام الأكاديمي" />
              </div>
              <div class="form-group">
                <label>الجمهور المستهدف</label>
                <select [(ngModel)]="newAnn.target_audience">
                  <option value="all">الجميع (أولياء أمور وطالب ومتقدم)</option>
                  <option value="parents">أولياء الأمور فقط</option>
                  <option value="students">الطلاب فقط</option>
                  <option value="applicants">المتقدمين للقبول</option>
                </select>
              </div>
              <div class="form-group">
                <label>محتوى الإعلان *</label>
                <textarea rows="4" [(ngModel)]="newAnn.content" placeholder="اكتب تفاصيل الإعلان بالتفصيل..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="nb-btn-secondary" (click)="toggleAnnouncementModal()">إلغاء</button>
              <button class="nb-btn-primary" (click)="saveAnnouncement()">نشر الإعلان</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .section-subtitle { font-size: 14px; font-weight: 700; color: var(--nb-text); margin: 0 0 12px; }
    
    .portals-launch-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px; margin-bottom: 16px; }
    .portal-launch-card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-lg, 12px); padding: 18px; text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 12px; transition: transform 0.2s, box-shadow 0.2s; position: relative; overflow: hidden; }
    .portal-launch-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
    .portal-launch-card.parent { border-top: 4px solid #3b82f6; }
    .portal-launch-card.student { border-top: 4px solid #10b981; }
    .portal-launch-card.applicant { border-top: 4px solid #f59e0b; }
    
    .p-icon { font-size: 32px; }
    .p-content h4 { margin: 0 0 6px; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .p-content p { margin: 0; font-size: 12.5px; color: var(--nb-text-secondary); line-height: 1.5; }
    .btn-launch { font-size: 12px; font-weight: 700; color: var(--nb-primary-600); margin-top: auto; align-self: flex-end; }

    .grid-two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 900px) { .grid-two-cols { grid-template-columns: 1fr; } }

    .panel-head h3 { margin: 0 0 14px; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .announcements-list { display: flex; flex-direction: column; gap: 12px; }
    .ann-item { background: var(--nb-bg); padding: 12px; border-radius: var(--nb-radius); border: 1px solid var(--nb-border-soft); display: flex; flex-direction: column; gap: 6px; }
    .ann-top { display: flex; justify-content: space-between; align-items: center; }
    .audience-tag { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: var(--nb-radius-sm); background: #e2e8f0; color: #334155; }
    .audience-tag.all { background: #dbeafe; color: #1e40af; }
    .ann-date { font-size: 11px; color: var(--nb-text-muted); }
    .ann-item h4 { margin: 0; font-size: 13.5px; font-weight: 700; color: var(--nb-text); }
    .ann-item p { margin: 0; font-size: 12px; color: var(--nb-text-secondary); line-height: 1.4; }

    .sessions-list { display: flex; flex-direction: column; gap: 10px; }
    .session-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--nb-bg); border-radius: var(--nb-radius); border: 1px solid var(--nb-border-soft); }
    .s-user strong { display: block; font-size: 13px; color: var(--nb-text); }
    .s-user small { font-size: 11px; color: var(--nb-text-muted); }
    .s-time { font-size: 11.5px; font-weight: 600; color: #166534; background: #dcfce7; padding: 2px 8px; border-radius: 999px; }

    /* Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-card { background: var(--nb-surface); width: 500px; max-width: 90vw; border-radius: var(--nb-radius-lg, 12px); box-shadow: 0 10px 25px rgba(0,0,0,0.15); overflow: hidden; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--nb-border-soft); }
    .modal-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .close-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--nb-text-muted); }
    .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-size: 12px; font-weight: 600; color: var(--nb-text-secondary); }
    .form-group input, .form-group select, .form-group textarea { padding: 8px 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); font-size: 13px; outline: none; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--nb-border-soft); background: var(--nb-bg); }
    .nb-btn-primary { background: var(--nb-primary-600); color: white; border: none; padding: 8px 16px; border-radius: var(--nb-radius); font-size: 13px; font-weight: 600; cursor: pointer; }
    .nb-btn-secondary { background: var(--nb-surface); border: 1px solid var(--nb-border); color: var(--nb-text); padding: 8px 16px; border-radius: var(--nb-radius); font-size: 13px; cursor: pointer; }
  `]
})
export class PortalOverviewComponent {
  private portalService = inject(PortalService);

  announcements = signal<PortalAnnouncement[]>([]);
  sessions = signal<PortalSessionInfo[]>([]);
  showAnnouncementModal = signal(false);

  newAnn: Partial<PortalAnnouncement> = {
    title: '',
    content: '',
    target_audience: 'all',
  };

  constructor() {
    this.portalService.getAnnouncements().subscribe((data) => this.announcements.set(data));
    this.portalService.getActiveSessions().subscribe((data) => this.sessions.set(data));
  }

  toggleAnnouncementModal(): void {
    this.showAnnouncementModal.update((v) => !v);
  }

  saveAnnouncement(): void {
    if (!this.newAnn.title || !this.newAnn.content) return;
    const item: PortalAnnouncement = {
      id: String(Date.now()),
      title: this.newAnn.title,
      content: this.newAnn.content,
      target_audience: this.newAnn.target_audience || 'all',
      publish_date: new Date().toISOString().split('T')[0],
      is_published: true,
    };
    this.announcements.update((list) => [item, ...list]);
    this.toggleAnnouncementModal();
    this.newAnn = { title: '', content: '', target_audience: 'all' };
  }
}
