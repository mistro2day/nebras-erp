import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { PlatformService } from '../platform.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-platform-settings',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, FormsModule],
  template: `
    <div class="platform-settings" dir="rtl">
      <header class="settings-header animate-fade-in">
        <div class="header-info">
          <h1>إعدادات النظام والـ Feature Flags</h1>
          <p>تعديل الإعدادات والتحكم بالميزات المفعلة للمستأجرين وتغيير بارامترات النظام</p>
        </div>
      </header>

      <div class="settings-grid animate-slide-up">
        <!-- System Configuration -->
        <mat-card class="settings-card">
          <mat-card-header>
            <mat-card-title>إعدادات النظام الأساسية</mat-card-title>
          </mat-card-header>
          <mat-card-content class="form-container">
            <div class="form-group">
              <mat-form-field appearance="outline">
                <mat-label>اسم المنصة الرئيسي</mat-label>
                <input matInput [(ngModel)]="platformName">
              </mat-form-field>
            </div>
            
            <div class="form-group">
              <mat-form-field appearance="outline">
                <mat-label>حجم الملف الأقصى المسموح برَفعه (MB)</mat-label>
                <input matInput type="number" [(ngModel)]="maxFileSize">
              </mat-form-field>
            </div>

            <button mat-flat-button color="primary" (click)="saveSettings()">
              حفظ الإعدادات
            </button>
          </mat-card-content>
        </mat-card>

        <!-- Feature Flags -->
        <mat-card class="settings-card">
          <mat-card-header>
            <mat-card-title>إدارة الـ Feature Flags</mat-card-title>
          </mat-card-header>
          <mat-card-content class="flags-list">
            <div class="flag-item" *ngFor="let flag of flags()">
              <div class="flag-info">
                <strong>{{ flag.flag_name }}</strong>
                <span class="flag-rollout">التوزيع: {{ flag.rollout_percentage }}%</span>
              </div>
              <mat-slide-toggle [checked]="flag.is_enabled" color="primary"></mat-slide-toggle>
            </div>
            <div class="no-data" *ngIf="flags().length === 0">
              <p>لا يوجد Feature Flags مسجلة في هذا القسم.</p>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .platform-settings {
      padding: 2rem;
      background: linear-gradient(135deg, #0b0f19 0%, #151829 100%);
      color: #f8fafc;
      min-height: 100vh;
      font-family: 'Cairo', 'Outfit', sans-serif;
    }

    .settings-header {
      margin-bottom: 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 1.5rem;
    }

    .settings-header h1 {
      font-size: 2.25rem;
      font-weight: 800;
      background: linear-gradient(to left, #6366f1, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }

    .settings-header p {
      color: #94a3b8;
      margin: 0.5rem 0 0 0;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 2rem;
    }

    .settings-card {
      background: rgba(30, 41, 59, 0.3) !important;
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.05) !important;
      border-radius: 16px !important;
      color: #f8fafc !important;
      padding: 1.5rem;
    }

    .form-container {
      margin-top: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .flags-list {
      margin-top: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .flag-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(15, 23, 42, 0.4);
      padding: 1rem 1.5rem;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.03);
    }

    .flag-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .flag-rollout {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .no-data {
      text-align: center;
      padding: 2rem;
      color: #94a3b8;
    }

    /* Animations */
    .animate-fade-in { animation: fadeIn 0.8s ease-out; }
    .animate-slide-up { animation: slideUp 0.8s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    @media (max-width: 768px) {
      .settings-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PlatformSettingsComponent implements OnInit {
  private platformService = inject(PlatformService);

  flags = this.platformService.featureFlags;
  platformName = 'Nebras School Portal';
  maxFileSize = 10;

  ngOnInit() {
    this.platformService.getFeatureFlags().subscribe();
    this.platformService.getConfigurations().subscribe(res => {
      // إسناد القيم المحفوظة تلقائياً
    });
  }

  saveSettings() {
    this.platformService.setConfiguration('platform_name', this.platformName).subscribe();
    this.platformService.setConfiguration('max_file_size', this.maxFileSize).subscribe();
  }
}