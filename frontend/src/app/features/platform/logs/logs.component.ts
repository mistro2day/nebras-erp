import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { PlatformService } from '../platform.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

/**
 * التدقيق الأمني والتنبيهات والملفات — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-platform-logs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatTabsModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="التدقيق الأمني والتنبيهات والملفات"
        subtitle="سجلات التدقيق الأمني للعمليات، الإشعارات الصادرة، وإدارة الملفات المرفوعة"
      ></nb-page-header>

      <nb-panel [flush]="true">
        <mat-tab-group class="nb-tabs">
          <mat-tab label="سجل التدقيق الأمني (Audit Logs)">
            <div class="tbl">
              <div class="tbl-head au"><span>التاريخ والوقت</span><span>المستخدم</span><span>العملية</span><span>الكيان</span></div>
              @for (log of auditLogs(); track $index) {
                <div class="tbl-row au">
                  <span>{{ log.created_at | date:'medium' }}</span>
                  <span>{{ log.user_id }}</span>
                  <span>{{ log.action }}</span>
                  <span>{{ log.entity_name }}</span>
                </div>
              }
              @if (auditLogs().length === 0) { <div class="tbl-empty">لا يوجد سجلات تدقيق حالياً.</div> }
            </div>
          </mat-tab>

          <mat-tab label="سجل الإشعارات والتنبيهات">
            <div class="tbl">
              <div class="tbl-head nt"><span>المستلم</span><span>القناة</span><span>العنوان</span><span>الحالة</span></div>
              @for (notif of notifications(); track $index) {
                <div class="tbl-row nt">
                  <span>{{ notif.recipient_id }}</span>
                  <span><span class="nb-badge-ai">{{ notif.channel }}</span></span>
                  <span>{{ notif.title }}</span>
                  <span><span [class]="notifBadge(notif.status)">{{ notif.status }}</span></span>
                </div>
              }
              @if (notifications().length === 0) { <div class="tbl-empty">لا يوجد إشعارات مسجلة حالياً.</div> }
            </div>
          </mat-tab>

          <mat-tab label="مدير الملفات والتخزين">
            <div class="storage">
              <div class="upload-section">
                <input type="file" #fileInput (change)="onFileSelected($event)" style="display: none">
                <button class="nb-btn-primary" (click)="fileInput.click()">رفع وثيقة جديدة للتحقق</button>
              </div>
              @if (uploadedFile(); as f) {
                <div class="file-info-box">
                  <h4>آخر ملف تم رَفعه بنجاح:</h4>
                  <p><strong>اسم الملف:</strong> {{ f.file_name }}</p>
                  <p><strong>معرف الأصل:</strong> {{ f.file_asset_id }}</p>
                  <p><strong>بوابة التخزين:</strong> {{ f.storage_provider }}</p>
                  <p><strong>رقم التحقق (SHA256 Checksum):</strong> {{ f.checksum }}</p>
                </div>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .nb-tabs { padding: 4px 8px 8px; }
    .tbl { display: flex; flex-direction: column; padding-top: 8px; }
    .tbl-head, .tbl-row { display: grid; gap: 8px; padding: 9px 16px; align-items: center; }
    .tbl-head.au, .tbl-row.au { grid-template-columns: 1.6fr 1.2fr 1.2fr 1.2fr; }
    .tbl-head.nt, .tbl-row.nt { grid-template-columns: 1.2fr 1fr 1.8fr 1fr; }
    .tbl-head { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); padding: 8px 16px; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text); }
    .tbl-row:last-child { border-bottom: none; }
    .tbl-row:hover { background: var(--nb-surface-raised); }
    .tbl-empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
    .storage { padding: 16px; }
    .upload-section { display: flex; justify-content: center; padding: 32px; border: 2px dashed var(--nb-border); border-radius: var(--nb-radius-card); background: var(--nb-surface-raised); }
    .file-info-box { margin-top: 16px; padding: 16px; background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); font-size: 13px; color: var(--nb-text); }
    .file-info-box h4 { margin: 0 0 10px; color: var(--nb-primary-600); font-size: 14px; }
    .file-info-box p { margin: 6px 0; }
    .file-info-box strong { color: var(--nb-text-muted); }
  `]
})
export class PlatformLogsComponent implements OnInit {
  private platformService = inject(PlatformService);

  auditLogs = this.platformService.auditLogs;
  notifications = this.platformService.notifications;
  uploadedFile = signal<any | null>(null);

  auditColumns: string[] = ['timestamp', 'user', 'action', 'entity'];
  notifColumns: string[] = ['recipient', 'channel', 'title', 'status'];

  ngOnInit() {
    this.platformService.getAuditLogs().subscribe();
    this.platformService.getNotifications().subscribe();
  }

  notifBadge(status: string): string {
    switch (status) {
      case 'sent': return 'nb-badge-success';
      case 'failed': return 'nb-badge-danger';
      default: return 'nb-badge-neutral';
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.platformService.uploadFile(file).subscribe(res => {
        if (res && res.success) {
          this.uploadedFile.set(res.data);
        }
      });
    }
  }
}