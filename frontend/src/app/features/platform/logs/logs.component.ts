import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PlatformService } from '../platform.service';

@Component({
  selector: 'app-platform-logs',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatTabsModule, MatIconModule, MatButtonModule],
  template: `
    <div class="platform-logs" dir="rtl">
      <header class="logs-header animate-fade-in">
        <div class="header-info">
          <h1>التدقيق الأمني والتنبيهات والملفات</h1>
          <p>عرض وتحليل سجلات التدقيق الأمني للعمليات، الإشعارات الصادرة، وإدارة الملفات المرفوعة</p>
        </div>
      </header>

      <div class="tabs-container animate-slide-up">
        <mat-tab-group>
          <!-- 1. Audit Logs -->
          <mat-tab label="سجل التدقيق الأمني (Audit Logs)">
            <div class="tab-content">
              <table mat-table [dataSource]="auditLogs()" class="mat-elevation-z8">
                <ng-container matColumnDef="timestamp">
                  <th mat-header-cell *matHeaderCellDef> التاريخ والوقت </th>
                  <td mat-cell *matCellDef="let log"> {{ log.created_at | date:'medium' }} </td>
                </ng-container>

                <ng-container matColumnDef="user">
                  <th mat-header-cell *matHeaderCellDef> المستخدم </th>
                  <td mat-cell *matCellDef="let log"> {{ log.user_id }} </td>
                </ng-container>

                <ng-container matColumnDef="action">
                  <th mat-header-cell *matHeaderCellDef> العملية </th>
                  <td mat-cell *matCellDef="let log"> {{ log.action }} </td>
                </ng-container>

                <ng-container matColumnDef="entity">
                  <th mat-header-cell *matHeaderCellDef> الكيان </th>
                  <td mat-cell *matCellDef="let log"> {{ log.entity_name }} </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="auditColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: auditColumns;"></tr>
              </table>
              <div class="no-data" *ngIf="auditLogs().length === 0">
                <p>لا يوجد سجلات تدقيق حالياً.</p>
              </div>
            </div>
          </mat-tab>

          <!-- 2. Notifications History -->
          <mat-tab label="سجل الإشعارات والتنبيهات">
            <div class="tab-content">
              <table mat-table [dataSource]="notifications()" class="mat-elevation-z8">
                <ng-container matColumnDef="recipient">
                  <th mat-header-cell *matHeaderCellDef> المستلم </th>
                  <td mat-cell *matCellDef="let notif"> {{ notif.recipient_id }} </td>
                </ng-container>

                <ng-container matColumnDef="channel">
                  <th mat-header-cell *matHeaderCellDef> القناة </th>
                  <td mat-cell *matCellDef="let notif">
                    <span class="badge channel">{{ notif.channel }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef> العنوان </th>
                  <td mat-cell *matCellDef="let notif"> {{ notif.title }} </td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef> الحالة </th>
                  <td mat-cell *matCellDef="let notif">
                    <span class="badge" [ngClass]="notif.status">{{ notif.status }}</span>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="notifColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: notifColumns;"></tr>
              </table>
              <div class="no-data" *ngIf="notifications().length === 0">
                <p>لا يوجد إشعارات مسجلة حالياً.</p>
              </div>
            </div>
          </mat-tab>

          <!-- 3. Storage Manager -->
          <mat-tab label="مدير الملفات والتخزين">
            <div class="tab-content">
              <div class="upload-section">
                <input type="file" #fileInput (change)="onFileSelected($event)" style="display: none">
                <button mat-flat-button color="primary" (click)="fileInput.click()">
                  <mat-icon>cloud_upload</mat-icon> رفع وثيقة جديدة للتحقق
                </button>
              </div>
              
              <div class="file-info-box" *ngIf="uploadedFile()">
                <h4>آخر ملف تم رَفعه بنجاح:</h4>
                <p><strong>اسم الملف:</strong> {{ uploadedFile().file_name }}</p>
                <p><strong>معرف الأصل:</strong> {{ uploadedFile().file_asset_id }}</p>
                <p><strong>بوابة التخزين:</strong> {{ uploadedFile().storage_provider }}</p>
                <p><strong>رقم التحقق (SHA256 Checksum):</strong> {{ uploadedFile().checksum }}</p>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    </div>
  `,
  styles: [`
    .platform-logs {
      padding: 2rem;
      background: linear-gradient(135deg, #0b0f19 0%, #151829 100%);
      color: #f8fafc;
      min-height: 100vh;
      font-family: 'Cairo', 'Outfit', sans-serif;
    }

    .logs-header {
      margin-bottom: 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 1.5rem;
    }

    .logs-header h1 {
      font-size: 2.25rem;
      font-weight: 800;
      background: linear-gradient(to left, #6366f1, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }

    .logs-header p {
      color: #94a3b8;
      margin: 0.5rem 0 0 0;
    }

    .tabs-container {
      background: rgba(30, 41, 59, 0.3);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 1.5rem;
    }

    .tab-content {
      padding: 2rem 0;
      overflow-x: auto;
    }

    table {
      width: 100%;
      background: transparent !important;
      color: #f8fafc !important;
    }

    th {
      color: #94a3b8 !important;
      font-weight: 700 !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    }

    td {
      color: #e2e8f0 !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
    }

    tr:hover td {
      background-color: rgba(255, 255, 255, 0.02) !important;
    }

    .badge {
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge.sent { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .badge.failed { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
    .badge.channel { background: rgba(99, 102, 241, 0.15); color: #6366f1; }

    .upload-section {
      display: flex;
      justify-content: center;
      padding: 3rem;
      border: 2px dashed rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.2);
    }

    .file-info-box {
      margin-top: 2rem;
      padding: 1.5rem;
      background: rgba(15, 23, 42, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    }

    .file-info-box h4 {
      margin-top: 0;
      color: #6366f1;
    }

    .no-data {
      text-align: center;
      padding: 3rem;
      color: #94a3b8;
    }

    /* Animations */
    .animate-fade-in { animation: fadeIn 0.8s ease-out; }
    .animate-slide-up { animation: slideUp 0.8s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
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