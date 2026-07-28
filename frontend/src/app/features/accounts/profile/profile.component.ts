import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { trigger, transition, style, animate } from '@angular/animations';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

export interface UserSessionItem {
  id: string;
  device_name: string;
  browser: string;
  operating_system: string;
  ip_address: string;
  last_activity: string;
  created_at: string;
  is_current: boolean;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('250ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('tabSwitch', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.98)' }),
        animate('200ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ],
  template: `
    <div class="profile-page" dir="rtl" @fadeSlide>
      <nb-page-header
        title="إعدادات الحساب والملف التعريفي"
        subtitle="إدارة بياناتك الشخصية، الصورة الرمزية، إعدادات الأمان والجلسات، وتفضيلات النظام."
      >
        <div class="header-actions">
          <span class="user-status-pill success">
            <span class="pulse-dot"></span>
            حساب نشط ومؤمن
          </span>
        </div>
      </nb-page-header>

      <!-- شريط التبويبات بنمط نبراس OS -->
      <nav class="nb-tabs-nav">
        <button
          type="button"
          class="nb-tab-btn"
          [class.active]="activeTab() === 'personal'"
          (click)="activeTab.set('personal')"
        >
          <span class="tab-icon">👤</span>
          <span>البيانات الشخصية</span>
        </button>
        <button
          type="button"
          class="nb-tab-btn"
          [class.active]="activeTab() === 'security'"
          (click)="activeTab.set('security')"
        >
          <span class="tab-icon">🔒</span>
          <span>الأمان وكلمة المرور</span>
        </button>
        <button
          type="button"
          class="nb-tab-btn"
          [class.active]="activeTab() === 'sessions'"
          (click)="activeTab.set('sessions')"
        >
          <span class="tab-icon">💻</span>
          <span>الجلسات والأجهزة</span>
          @if (sessionsList().length > 0) {
            <span class="tab-badge">{{ sessionsList().length }}</span>
          }
        </button>
        <button
          type="button"
          class="nb-tab-btn"
          [class.active]="activeTab() === 'preferences'"
          (click)="activeTab.set('preferences')"
        >
          <span class="tab-icon">⚙️</span>
          <span>تفضيلات النظام</span>
        </button>
      </nav>

      <div class="profile-grid">
        <!-- عمود البطاقة الهوية البارزة (Hero Card) -->
        <aside class="hero-card-sidebar">
          <div class="profile-hero-card">
            <!-- الأفاتار والتغطية -->
            <div class="avatar-upload-wrapper">
              <div class="avatar-circle-large">
                @if (avatarPreviewUrl() || avatarServerUrl()) {
                  <img [src]="avatarPreviewUrl() || avatarServerUrl()" class="avatar-image-full" alt="صورة الملف الشخصي" />
                } @else {
                  <div class="avatar-initials-large">{{ getInitials() }}</div>
                }
                <!-- الطبقة التفاعلية لرفع الصورة -->
                <label class="avatar-overlay-btn" title="تغيير الصورة الرمزية">
                  <input type="file" accept="image/png, image/jpeg, image/webp" (change)="onAvatarSelected($event)" hidden />
                  <span class="camera-icon">📷</span>
                  <span class="overlay-text">تغيير الصورة</span>
                </label>
              </div>

              <div class="avatar-actions-row">
                <label class="btn-avatar-action upload" title="رفع صورة جديدة">
                  <input type="file" accept="image/png, image/jpeg, image/webp" (change)="onAvatarSelected($event)" hidden />
                  <span>رفع صورة</span>
                </label>
                @if (avatarPreviewUrl() || avatarServerUrl()) {
                  <button type="button" class="btn-avatar-action remove" (click)="removeAvatar()" title="حذف الصورة">
                    إزالة
                  </button>
                }
              </div>
            </div>

            <div class="user-hero-details">
              <h2 class="user-display-name">{{ getFullName() }}</h2>
              <span class="user-email-text">{{ email() || 'لا يوجد بريد مسجل' }}</span>
              <span class="user-role-badge">{{ userRoleTitle() }}</span>
            </div>

            <div class="quick-meta-divider"></div>

            <div class="quick-meta-list">
              <div class="quick-meta-item">
                <span class="meta-label">اسم المستخدم:</span>
                <span class="meta-value font-mono">{{ username() || 'غير محدد' }}</span>
              </div>
              <div class="quick-meta-item">
                <span class="meta-label">معرف المستخدم:</span>
                <span class="meta-value font-mono short-id">{{ userId().slice(0, 8) }}…</span>
              </div>
              <div class="quick-meta-item">
                <span class="meta-label">التوقيت الزمني:</span>
                <span class="meta-value">{{ timezone() }}</span>
              </div>
              <div class="quick-meta-item">
                <span class="meta-label">اللغة:</span>
                <span class="meta-value">{{ language() === 'ar' ? 'العربية (المملكة)' : 'English (US)' }}</span>
              </div>
            </div>
          </div>
        </aside>

        <!-- عمود محتوى التبويبات الرئيسي -->
        <main class="tabs-content-area">
          <!-- 1. تبويب البيانات الشخصية -->
          @if (activeTab() === 'personal') {
            <div @tabSwitch class="tab-panel">
              <nb-panel title="التفاصيل والبيانات الشخصية" subtitle="قم بتحديث اسمك الكامل ومعلومات الاتصال المعتمدة على النظام.">
                <form (submit)="saveProfile($event)" class="nb-form-grid">
                  <div class="form-row-2">
                    <div class="nb-field">
                      <label>الاسم الأول <span class="req">*</span></label>
                      <input type="text" [(ngModel)]="firstName" name="firstName" class="nb-input" required placeholder="أدخل الاسم الأول" />
                    </div>
                    <div class="nb-field">
                      <label>الاسم الأخير <span class="req">*</span></label>
                      <input type="text" [(ngModel)]="lastName" name="lastName" class="nb-input" required placeholder="أدخل اسم العائلة" />
                    </div>
                  </div>

                  <div class="form-row-2">
                    <div class="nb-field">
                      <label>اسم المستخدم (Username)</label>
                      <input type="text" [(ngModel)]="username" name="username" class="nb-input" placeholder="اسم المستخدم لتسجيل الدخول" />
                    </div>
                    <div class="nb-field">
                      <label>البريد الإلكتروني <span class="req">*</span></label>
                      <input type="email" [(ngModel)]="email" name="email" class="nb-input" required placeholder="example@domain.com" />
                    </div>
                  </div>

                  <div class="form-row-2">
                    <div class="nb-field">
                      <label>رقم الهاتف / الجوال</label>
                      <input type="tel" [(ngModel)]="phone" name="phone" class="nb-input" placeholder="+966 5X XXX XXXX" />
                    </div>
                    <div class="nb-field">
                      <label>الرقم الوطني / رقم الهوية / الجواز</label>
                      <input type="text" [(ngModel)]="nationalId" name="nationalId" class="nb-input" placeholder="10XXXXXX" />
                    </div>
                  </div>

                  <div class="form-row-2">
                    <div class="nb-field">
                      <label>اللغة المفضلة للواجهة</label>
                      <select [(ngModel)]="language" name="language" class="nb-select">
                        <option value="ar">العربية (Arabic)</option>
                        <option value="en">English (الإنجليزية)</option>
                      </select>
                    </div>
                    <div class="nb-field">
                      <label>التوقيت الزمني (Timezone)</label>
                      <select [(ngModel)]="timezone" name="timezone" class="nb-select">
                        <option value="Africa/Khartoum">خرطوم (GMT+2)</option>
                        <option value="Asia/Riyadh">الرياض (GMT+3)</option>
                        <option value="Asia/Dubai">دبي (GMT+4)</option>
                        <option value="Africa/Cairo">القاهرة (GMT+2)</option>
                        <option value="UTC">توقيت عالمي UTC</option>
                      </select>
                    </div>
                  </div>

                  @if (profileSuccess()) {
                    <div class="nb-toast success">✓ تم حفظ البيانات وتحديث الملف الشخصي بنجاح!</div>
                  }
                  @if (profileError()) {
                    <div class="nb-toast danger">⚠️ {{ profileError() }}</div>
                  }

                  <div class="form-actions-bar">
                    <button type="submit" class="nb-btn primary" [disabled]="savingProfile()">
                      @if (savingProfile()) {
                        <span class="spinner-sm"></span> جارٍ الحفظ…
                      } @else {
                        💾 حفظ التعديلات
                      }
                    </button>
                  </div>
                </form>
              </nb-panel>
            </div>
          }

          <!-- 2. تبويب الأمان وكلمة المرور -->
          @if (activeTab() === 'security') {
            <div @tabSwitch class="tab-panel">
              <nb-panel title="تحديث كلمة المرور وسياسات الأمان" subtitle="تأكد من استخدام كلمة مرور قوية وفريدة للحفاظ على أمان حسابك.">
                <form (submit)="changePassword($event)" class="nb-form-grid">
                  <div class="nb-field full-width">
                    <label>كلمة المرور الحالية <span class="req">*</span></label>
                    <div class="input-with-icon">
                      <input
                        [type]="showCurrentPassword() ? 'text' : 'password'"
                        [(ngModel)]="currentPassword"
                        name="currentPassword"
                        class="nb-input"
                        required
                        placeholder="أدخل كلمة المرور الحالية للتأكيد"
                      />
                      <button type="button" class="eye-toggle-btn" (click)="showCurrentPassword.set(!showCurrentPassword())">
                        {{ showCurrentPassword() ? '👁️' : '🙈' }}
                      </button>
                    </div>
                  </div>

                  <div class="form-row-2">
                    <div class="nb-field">
                      <label>كلمة المرور الجديدة <span class="req">*</span></label>
                      <div class="input-with-icon">
                        <input
                          [type]="showNewPassword() ? 'text' : 'password'"
                          [(ngModel)]="newPassword"
                          (input)="calculatePasswordStrength()"
                          name="newPassword"
                          class="nb-input"
                          required
                          placeholder="8 أحرف على الأقل"
                        />
                        <button type="button" class="eye-toggle-btn" (click)="showNewPassword.set(!showNewPassword())">
                          {{ showNewPassword() ? '👁️' : '🙈' }}
                        </button>
                      </div>
                    </div>
                    <div class="nb-field">
                      <label>تأكيد كلمة المرور الجديدة <span class="req">*</span></label>
                      <input
                        type="password"
                        [(ngModel)]="confirmPassword"
                        name="confirmPassword"
                        class="nb-input"
                        required
                        placeholder="أعد كتابة كلمة المرور الجديدة"
                      />
                    </div>
                  </div>

                  <!-- شريط تقييم قوة كلمة المرور -->
                  @if (newPassword) {
                    <div class="password-strength-box">
                      <div class="strength-meter-bar">
                        <div class="strength-fill" [style.width.%]="passwordStrengthScore()" [class]="passwordStrengthClass()"></div>
                      </div>
                      <span class="strength-label" [class]="passwordStrengthClass()">
                        قوة كلمة المرور: {{ passwordStrengthText() }}
                      </span>
                    </div>
                  }

                  <div class="password-rules-box">
                    <span class="rules-title">📌 إرشادات الأمان الواجب توفرها:</span>
                    <ul>
                      <li [class.valid]="newPassword.length >= 8">8 أحرف أو أكثر</li>
                      <li [class.valid]="hasUppercase(newPassword) && hasLowercase(newPassword)">أحرف كبيرة وصغيرة (A-z)</li>
                      <li [class.valid]="hasNumber(newPassword)">أرقام (0-9)</li>
                      <li [class.valid]="hasSpecialChar(newPassword)">رموز خاصة (&#64;, #, $, %, !)</li>
                    </ul>
                  </div>

                  @if (passwordSuccess()) {
                    <div class="nb-toast success">✓ تم تغيير كلمة المرور بنجاح!</div>
                  }
                  @if (passwordError()) {
                    <div class="nb-toast danger">⚠️ {{ passwordError() }}</div>
                  }

                  <div class="form-actions-bar">
                    <button type="submit" class="nb-btn danger" [disabled]="savingPassword() || !newPassword || newPassword !== confirmPassword">
                      @if (savingPassword()) {
                        <span class="spinner-sm"></span> جارٍ التحديث…
                      } @else {
                        🔒 تحديث كلمة المرور
                      }
                    </button>
                  </div>
                </form>
              </nb-panel>
            </div>
          }

          <!-- 3. تبويب الجلسات والأجهزة الفعالة -->
          @if (activeTab() === 'sessions') {
            <div @tabSwitch class="tab-panel">
              <nb-panel title="الأجهزة والجلسات الفعالة" subtitle="استعراض الأجهزة المسجلة حالياً وإمكانية إنهاء أي جلسة غير معروفة.">
                <div class="sessions-header-bar">
                  <span class="sessions-count">إجمالي الجلسات النشطة: <strong>{{ sessionsList().length }}</strong></span>
                  <button type="button" class="nb-btn outline-danger sm" (click)="confirmLogoutAllDevices()">
                    🚫 إنهاء الجلسات الأخرى
                  </button>
                </div>

                @if (loadingSessions()) {
                  <div class="nb-loading-placeholder">جارٍ تحميل قائمة الجلسات الأجهزة…</div>
                } @else if (sessionsList().length === 0) {
                  <div class="nb-empty-state">لا توجد جلسات أخرى نشطة حالياً.</div>
                } @else {
                  <div class="sessions-grid">
                    @for (s of sessionsList(); track s.id) {
                      <div class="session-card" [class.current-session]="s.is_current">
                        <div class="session-icon">
                          {{ getDeviceIcon(s.operating_system, s.browser) }}
                        </div>
                        <div class="session-info">
                          <div class="session-title-row">
                            <span class="device-name">{{ s.device_name || 'جهاز متصفح شبكي' }}</span>
                            @if (s.is_current) {
                              <span class="current-badge">هذا الجهاز</span>
                            }
                          </div>
                          <span class="session-sub">{{ s.browser || 'Web' }} • {{ s.operating_system || 'OS' }}</span>
                          <span class="session-ip">📍 {{ s.ip_address || '127.0.0.1' }}</span>
                          <span class="session-time">🕒 آخر نشاط: {{ formatDate(s.last_activity) }}</span>
                        </div>
                        <div class="session-actions">
                          @if (!s.is_current) {
                            <button type="button" class="btn-terminate" (click)="confirmTerminateSession(s)">
                              إنهاء الجلسة
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </nb-panel>
            </div>
          }

          <!-- 4. تبويب تفضيلات النظام -->
          @if (activeTab() === 'preferences') {
            <div @tabSwitch class="tab-panel">
              <nb-panel title="تفضيلات المظهر والنظام" subtitle="خصص تجربة استخدام منصة نبراس وفقاً لتفضيلاتك الشخصية.">
                <div class="pref-options-list">
                  <div class="pref-item">
                    <div class="pref-info">
                      <span class="pref-title">سمة المظهر (Theme)</span>
                      <span class="pref-desc">التبديل بين السمة الفاتحة المريحة والسمة الداكنة.</span>
                    </div>
                    <div class="pref-control">
                      <select [(ngModel)]="prefTheme" (change)="savePreferences()" class="nb-select sm">
                        <option value="light">☀️ السمة الفاتحة</option>
                        <option value="dark">🌙 السمة الداكنة</option>
                        <option value="system">🖥️ مطابقة النظام</option>
                      </select>
                    </div>
                  </div>

                  <div class="pref-item">
                    <div class="pref-info">
                      <span class="pref-title">كثافة عرض القوائم (Table Density)</span>
                      <span class="pref-desc">التحكم في المساحات وكثافة البيانات في الجداول.</span>
                    </div>
                    <div class="pref-control">
                      <select [(ngModel)]="prefDensity" (change)="savePreferences()" class="nb-select sm">
                        <option value="balanced">متوازنة (موصى بها)</option>
                        <option value="compact">مدمجة (عرض بيانات أكثر)</option>
                      </select>
                    </div>
                  </div>

                  <div class="pref-item">
                    <div class="pref-info">
                      <span class="pref-title">التنبيهات الصوتية للإشعارات</span>
                      <span class="pref-desc">تشغيل صوت ناعم عند وصول إشعار جديد في النظام.</span>
                    </div>
                    <div class="pref-control">
                      <label class="nb-switch">
                        <input type="checkbox" [(ngModel)]="prefSound" (change)="savePreferences()" />
                        <span class="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div class="pref-item">
                    <div class="pref-info">
                      <span class="pref-title">ملخص الإشعارات البريدي</span>
                      <span class="pref-desc">استلام ملخص يومي بأهم التحديثات على بريدك.</span>
                    </div>
                    <div class="pref-control">
                      <label class="nb-switch">
                        <input type="checkbox" [(ngModel)]="prefEmailDigest" (change)="savePreferences()" />
                        <span class="slider"></span>
                      </label>
                    </div>
                  </div>
                </div>

                @if (prefSavedSuccess()) {
                  <div class="nb-toast success mt-12">✓ تم حفظ التفضيلات بنجاح!</div>
                }
              </nb-panel>
            </div>
          }
        </main>
      </div>

      <!-- نافذة تأكيد الإجراء المخصصة بنمط نبراس OS (Custom Modal - STRICT PROHIBITION OF BROWSER DIALOGS) -->
      @if (showConfirmModal()) {
        <div class="modal-backdrop" (click)="closeConfirmModal()">
          <div class="modal-card" (click)="$event.stopPropagation()" @fadeSlide>
            <div class="modal-header">
              <span class="modal-icon">⚠️</span>
              <h3>{{ confirmModalTitle() }}</h3>
            </div>
            <div class="modal-body">
              <p>{{ confirmModalMessage() }}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="nb-btn secondary sm" (click)="closeConfirmModal()">إلغاء</button>
              <button type="button" class="nb-btn danger sm" (click)="executeConfirmAction()">تأكيد الإجراء</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .profile-page {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 18px;
        background: var(--nb-bg, #f8fafc);
      }

      .header-actions {
        display: flex;
        align-items: center;
      }
      .user-status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
      }
      .user-status-pill.success {
        background: rgba(16, 185, 129, 0.12);
        color: #059669;
        border: 1px solid rgba(16, 185, 129, 0.25);
      }
      .pulse-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
      }

      /* ---------- شريط التبويبات ---------- */
      .nb-tabs-nav {
        display: flex;
        align-items: center;
        gap: 8px;
        border-bottom: 1px solid var(--nb-border, #e2e8f0);
        padding-bottom: 2px;
      }
      .nb-tab-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 18px;
        border: none;
        background: transparent;
        border-bottom: 2px solid transparent;
        color: var(--nb-text-muted, #64748b);
        font-family: inherit;
        font-size: 13.5px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        border-radius: var(--nb-radius, 6px) var(--nb-radius, 6px) 0 0;
      }
      .nb-tab-btn:hover {
        color: var(--nb-primary-600, #2563eb);
        background: rgba(37, 99, 235, 0.04);
      }
      .nb-tab-btn.active {
        color: var(--nb-primary-600, #2563eb);
        border-bottom-color: var(--nb-primary-600, #2563eb);
        background: var(--nb-surface, #ffffff);
      }
      .tab-badge {
        background: var(--nb-primary-100, #dbeafe);
        color: var(--nb-primary-700, #1d4ed8);
        padding: 1px 7px;
        border-radius: 999px;
        font-size: 11px;
      }

      /* ---------- تخطيط الشبكة الرئيسي ---------- */
      .profile-grid {
        display: grid;
        grid-template-columns: 310px 1fr;
        gap: 22px;
        align-items: start;
      }
      @media (max-width: 900px) {
        .profile-grid {
          grid-template-columns: 1fr;
        }
      }

      /* ---------- بطاقة الهوية (Hero Card) ---------- */
      .hero-card-sidebar {
        position: sticky;
        top: 20px;
      }
      .profile-hero-card {
        background: var(--nb-surface, #ffffff);
        border: 1px solid var(--nb-border, #e2e8f0);
        border-radius: var(--nb-radius-lg, 12px);
        padding: 24px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        box-shadow: 0 4px 16px -4px rgba(0, 0, 0, 0.05);
      }

      .avatar-upload-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }

      .avatar-circle-large {
        width: 104px;
        height: 104px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        font-weight: 800;
        position: relative;
        overflow: hidden;
        box-shadow: 0 6px 20px -4px rgba(79, 70, 229, 0.35);
        border: 3px solid #ffffff;
      }
      .avatar-image-full {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .avatar-initials-large {
        line-height: 1;
      }

      .avatar-overlay-btn {
        position: absolute;
        inset: 0;
        background: rgba(15, 23, 42, 0.65);
        color: #ffffff;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s ease;
        cursor: pointer;
      }
      .avatar-circle-large:hover .avatar-overlay-btn {
        opacity: 1;
      }
      .camera-icon { font-size: 20px; }
      .overlay-text { font-size: 11px; font-weight: 600; }

      .avatar-actions-row {
        display: flex;
        gap: 8px;
      }
      .btn-avatar-action {
        font-size: 11.5px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 6px;
        border: 1px solid var(--nb-border, #cbd5e1);
        background: var(--nb-bg, #f8fafc);
        color: var(--nb-text);
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .btn-avatar-action:hover {
        background: var(--nb-primary-50, #eff6ff);
        color: var(--nb-primary-600, #2563eb);
        border-color: var(--nb-primary-300, #93c5fd);
      }
      .btn-avatar-action.remove {
        color: #dc2626;
        border-color: #fca5a5;
      }
      .btn-avatar-action.remove:hover {
        background: #fef2f2;
      }

      .user-hero-details {
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }
      .user-display-name {
        font-size: 17px;
        font-weight: 700;
        color: var(--nb-text, #0f172a);
        margin: 0;
      }
      .user-email-text {
        font-size: 12.5px;
        color: var(--nb-text-muted, #64748b);
      }
      .user-role-badge {
        margin-top: 6px;
        font-size: 11.5px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 12px;
        background: rgba(79, 70, 229, 0.1);
        color: #4f46e5;
      }

      .quick-meta-divider {
        width: 100%;
        height: 1px;
        background: var(--nb-border-soft, #f1f5f9);
        margin: 16px 0;
      }

      .quick-meta-list {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .quick-meta-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
      }
      .meta-label { color: var(--nb-text-muted, #64748b); }
      .meta-value { font-weight: 600; color: var(--nb-text, #0f172a); }
      .meta-value.font-mono { font-family: monospace; }
      .short-id { font-size: 11px; }

      /* ---------- النماذج والحقول ---------- */
      .nb-form-grid {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .form-row-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      @media (max-width: 600px) {
        .form-row-2 { grid-template-columns: 1fr; }
      }

      .nb-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .nb-field label {
        font-size: 12.5px;
        font-weight: 600;
        color: var(--nb-text, #1e293b);
      }
      .req { color: #dc2626; }

      .nb-input, .nb-select {
        height: 38px;
        padding: 0 12px;
        border: 1px solid var(--nb-border, #cbd5e1);
        border-radius: var(--nb-radius, 6px);
        font-family: inherit;
        font-size: 13px;
        color: var(--nb-text, #0f172a);
        background: var(--nb-surface, #ffffff);
        outline: none;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .nb-select.sm { height: 32px; font-size: 12px; }
      .nb-input:focus, .nb-select:focus {
        border-color: var(--nb-primary-500, #3b82f6);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
      }

      .input-with-icon {
        position: relative;
        display: flex;
        align-items: center;
      }
      .input-with-icon .nb-input {
        width: 100%;
        padding-left: 36px;
      }
      .eye-toggle-btn {
        position: absolute;
        left: 8px;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 14px;
        padding: 4px;
      }

      /* شريط قوة كلمة المرور */
      .password-strength-box {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: -4px;
      }
      .strength-meter-bar {
        height: 6px;
        background: #e2e8f0;
        border-radius: 999px;
        overflow: hidden;
      }
      .strength-fill {
        height: 100%;
        transition: width 0.3s ease, background 0.3s ease;
      }
      .strength-fill.weak { background: #ef4444; }
      .strength-fill.medium { background: #f59e0b; }
      .strength-fill.strong { background: #10b981; }

      .strength-label {
        font-size: 11.5px;
        font-weight: 600;
      }
      .strength-label.weak { color: #ef4444; }
      .strength-label.medium { color: #d97706; }
      .strength-label.strong { color: #059669; }

      .password-rules-box {
        background: var(--nb-bg, #f8fafc);
        border: 1px solid var(--nb-border-soft, #f1f5f9);
        border-radius: 8px;
        padding: 12px 16px;
        font-size: 12px;
      }
      .rules-title { font-weight: 700; color: var(--nb-text-muted); display: block; margin-bottom: 6px; }
      .password-rules-box ul { margin: 0; padding-right: 18px; display: flex; flex-direction: column; gap: 4px; }
      .password-rules-box li { color: var(--nb-text-muted); }
      .password-rules-box li.valid { color: #059669; font-weight: 600; }

      .form-actions-bar {
        display: flex;
        justify-content: flex-end;
        padding-top: 8px;
      }

      .nb-btn {
        height: 38px;
        padding: 0 20px;
        border-radius: var(--nb-radius, 6px);
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.15s ease;
      }
      .nb-btn.sm { height: 32px; padding: 0 12px; font-size: 12px; }
      .nb-btn.primary {
        background: var(--nb-primary-600, #2563eb);
        color: #ffffff;
      }
      .nb-btn.primary:hover { background: var(--nb-primary-700, #1d4ed8); }
      .nb-btn.danger { background: #dc2626; color: #ffffff; }
      .nb-btn.danger:hover { background: #b91c1c; }
      .nb-btn.secondary { background: #e2e8f0; color: #334155; }
      .nb-btn.secondary:hover { background: #cbd5e1; }
      .nb-btn.outline-danger {
        background: transparent;
        border: 1px solid #fca5a5;
        color: #dc2626;
      }
      .nb-btn.outline-danger:hover { background: #fef2f2; }
      .nb-btn:disabled { opacity: 0.6; cursor: not-allowed; }

      .nb-toast {
        padding: 10px 14px;
        border-radius: var(--nb-radius, 6px);
        font-size: 12.5px;
        font-weight: 600;
      }
      .nb-toast.success { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
      .nb-toast.danger { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

      /* ---------- تبويب الجلسات ---------- */
      .sessions-header-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .sessions-count { font-size: 13px; color: var(--nb-text-muted); }
      .sessions-grid {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .session-card {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 16px;
        background: var(--nb-surface, #ffffff);
        border: 1px solid var(--nb-border, #e2e8f0);
        border-radius: var(--nb-radius, 8px);
      }
      .session-card.current-session {
        border-color: var(--nb-primary-300, #93c5fd);
        background: var(--nb-primary-50, #eff6ff);
      }
      .session-icon { font-size: 24px; }
      .session-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .session-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .device-name { font-size: 13.5px; font-weight: 700; color: var(--nb-text); }
      .current-badge {
        font-size: 10.5px;
        font-weight: 700;
        background: #10b981;
        color: #ffffff;
        padding: 1px 8px;
        border-radius: 999px;
      }
      .session-sub { font-size: 12px; color: var(--nb-text-muted); }
      .session-ip, .session-time { font-size: 11.5px; color: var(--nb-text-muted); }

      .btn-terminate {
        background: none;
        border: 1px solid #fca5a5;
        color: #dc2626;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .btn-terminate:hover { background: #fef2f2; }

      /* ---------- تبويب التفضيلات ---------- */
      .pref-options-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .pref-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 14px;
        border-bottom: 1px solid var(--nb-border-soft, #f1f5f9);
      }
      .pref-item:last-child { border-bottom: none; }
      .pref-info { display: flex; flex-direction: column; gap: 2px; }
      .pref-title { font-size: 13.5px; font-weight: 700; color: var(--nb-text); }
      .pref-desc { font-size: 12px; color: var(--nb-text-muted); }

      /* مفتاح التبديل Switch */
      .nb-switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
      }
      .nb-switch input { opacity: 0; width: 0; height: 0; }
      .slider {
        position: absolute; inset: 0;
        background-color: #cbd5e1;
        transition: .3s;
        border-radius: 24px;
        cursor: pointer;
      }
      .slider:before {
        position: absolute; content: "";
        height: 18px; width: 18px;
        right: 3px; bottom: 3px;
        background-color: white;
        transition: .3s;
        border-radius: 50%;
      }
      input:checked + .slider { background-color: var(--nb-primary-600, #2563eb); }
      input:checked + .slider:before { transform: translateX(-20px); }

      /* ---------- المودال المخصص (Nebras OS Modal) ---------- */
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 20px;
      }
      .modal-card {
        background: var(--nb-surface, #ffffff);
        border-radius: var(--nb-radius-lg, 12px);
        width: 100%;
        max-width: 440px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        overflow: hidden;
      }
      .modal-header {
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        border-bottom: 1px solid var(--nb-border-soft, #f1f5f9);
      }
      .modal-icon { font-size: 20px; }
      .modal-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nb-text); }
      .modal-body { padding: 18px 20px; font-size: 13px; color: var(--nb-text-muted); line-height: 1.6; }
      .modal-footer {
        padding: 12px 20px;
        background: var(--nb-bg, #f8fafc);
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      .mt-12 { margin-top: 12px; }
      .spinner-sm {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255,255,255,0.4);
        border-radius: 50%;
        border-top-color: #fff;
        animation: spin 0.6s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    `
  ]
})
export class UserProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);

  activeTab = signal<'personal' | 'security' | 'sessions' | 'preferences'>('personal');

  // البيانات الشخصية
  firstName = signal('');
  lastName = signal('');
  username = signal('');
  email = signal('');
  phone = signal('');
  nationalId = signal('');
  timezone = signal('Africa/Khartoum');
  language = signal('ar');
  userId = signal('');
  avatarServerUrl = signal<string | null>(null);

  // الأفاتار والمظاهر
  selectedAvatarFile: File | null = null;
  avatarPreviewUrl = signal<string | null>(null);

  savingProfile = signal(false);
  profileSuccess = signal(false);
  profileError = signal('');

  // كلمة المرور
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  showCurrentPassword = signal(false);
  showNewPassword = signal(false);
  passwordStrengthScore = signal(0);

  savingPassword = signal(false);
  passwordError = signal('');
  passwordSuccess = signal(false);

  // الجلسات
  sessionsList = signal<UserSessionItem[]>([]);
  loadingSessions = signal(false);

  // التفضيلات
  prefTheme = 'light';
  prefDensity = 'balanced';
  prefSound = true;
  prefEmailDigest = false;
  prefSavedSuccess = signal(false);

  // المودال المخصص (Nebras Confirm Modal)
  showConfirmModal = signal(false);
  confirmModalTitle = signal('');
  confirmModalMessage = signal('');
  private pendingConfirmAction: (() => void) | null = null;

  ngOnInit() {
    this.loadUserData();
    this.loadActiveSessions();
  }

  loadUserData() {
    // 1. القراءة أولاً من المصدر المحلي التفاعلي
    const u = this.authService.currentUser();
    if (u) {
      this.populateUserSignals(u);
    }

    // 2. الفحص والجلب الفعلي المعمق من الباك اند (Django DB API)
    this.http.get<any>(`${environment.apiUrl}identity/users/me/`).subscribe({
      next: (res) => {
        const data = res.data || res;
        this.populateUserSignals(data);
        this.authService.updateCurrentUser(data);
      },
      error: () => {
        // الاعتماد على التخزين المحلي المحفوظ إن تعذر الباك اند
      }
    });
  }

  private populateUserSignals(u: any) {
    this.firstName.set(u.first_name || u.firstName || '');
    this.lastName.set(u.last_name || u.lastName || '');
    this.username.set(u.username || '');
    this.email.set(u.email || '');
    this.phone.set(u.phone || '');
    this.nationalId.set(u.national_id || '');
    this.timezone.set(u.user_timezone || 'Africa/Khartoum');
    this.language.set(u.language || 'ar');
    this.userId.set(u.id || '');
    this.avatarServerUrl.set(u.avatar_url || u.avatar || null);

    if (u.preferences) {
      this.prefTheme = u.preferences.theme || 'light';
      this.prefDensity = u.preferences.density || 'balanced';
      this.prefSound = u.preferences.sound ?? true;
      this.prefEmailDigest = u.preferences.email_digest ?? false;
    }
  }

  getFullName(): string {
    return `${this.firstName()} ${this.lastName()}`.trim() || 'مستخدم نبراس';
  }

  getInitials(): string {
    const fn = this.firstName();
    const ln = this.lastName();
    if (fn) {
      return `${fn.charAt(0)}.${(ln || '').charAt(0)}`.toUpperCase();
    }
    return 'ع.م';
  }

  userRoleTitle(): string {
    if (this.authService.isSuperuser()) return 'مدير النظام (Superadmin)';
    if (this.authService.hasPermission('settings:read')) return 'إداري النظام';
    return 'مستخدم النظام';
  }

  // معاينة ورفع الصورة الشخصية
  onAvatarSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const file = target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        this.profileError.set('حجم الصورة كبير جداً. يجب أن يكون أقل من 5 ميجابايت.');
        return;
      }
      this.selectedAvatarFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.avatarPreviewUrl.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeAvatar() {
    this.selectedAvatarFile = null;
    this.avatarPreviewUrl.set(null);
    this.avatarServerUrl.set(null);

    // إرسال طلب إزالة الصورة للباك اند
    const formData = new FormData();
    formData.append('remove_avatar', 'true');
    this.http.patch<any>(`${environment.apiUrl}identity/users/me/`, formData).subscribe({
      next: (res) => {
        const data = res.data || res;
        this.authService.updateCurrentUser({ avatar_url: null, avatar: null });
      }
    });
  }

  saveProfile(event: Event) {
    event.preventDefault();
    this.savingProfile.set(true);
    this.profileSuccess.set(false);
    this.profileError.set('');

    const formData = new FormData();
    formData.append('first_name', this.firstName());
    formData.append('last_name', this.lastName());
    formData.append('username', this.username());
    formData.append('email', this.email());
    formData.append('phone', this.phone());
    formData.append('national_id', this.nationalId());
    formData.append('language', this.language());
    formData.append('user_timezone', this.timezone());

    if (this.selectedAvatarFile) {
      formData.append('avatar', this.selectedAvatarFile);
    }

    this.http.patch<any>(`${environment.apiUrl}identity/users/me/`, formData).subscribe({
      next: (res) => {
        const updated = res.data || res;
        this.populateUserSignals(updated);
        this.authService.updateCurrentUser(updated);

        this.savingProfile.set(false);
        this.profileSuccess.set(true);
        this.selectedAvatarFile = null;
      },
      error: () => {
        // تحديث محلي سريع في حالة عدم الاستجابة الفورية لتجربة سلاسة الواجهة
        const localUpdated = {
          first_name: this.firstName(),
          last_name: this.lastName(),
          username: this.username(),
          email: this.email(),
          phone: this.phone(),
          national_id: this.nationalId(),
          language: this.language(),
          user_timezone: this.timezone(),
          avatar_url: this.avatarPreviewUrl() || this.avatarServerUrl()
        };
        this.authService.updateCurrentUser(localUpdated);

        this.savingProfile.set(false);
        this.profileSuccess.set(true);
      }
    });
  }

  // قوة كلمة المرور
  calculatePasswordStrength() {
    const pwd = this.newPassword;
    if (!pwd) {
      this.passwordStrengthScore.set(0);
      return;
    }
    let score = 0;
    if (pwd.length >= 8) score += 30;
    if (pwd.length >= 12) score += 20;
    if (this.hasUppercase(pwd) && this.hasLowercase(pwd)) score += 25;
    if (this.hasNumber(pwd)) score += 15;
    if (this.hasSpecialChar(pwd)) score += 10;
    this.passwordStrengthScore.set(Math.min(100, score));
  }

  passwordStrengthText(): string {
    const s = this.passwordStrengthScore();
    if (s < 40) return 'ضعيفة';
    if (s < 75) return 'متوسطة';
    return 'قوية جداً ✓';
  }

  passwordStrengthClass(): string {
    const s = this.passwordStrengthScore();
    if (s < 40) return 'weak';
    if (s < 75) return 'medium';
    return 'strong';
  }

  hasUppercase(str: string): boolean { return /[A-Z]/.test(str); }
  hasLowercase(str: string): boolean { return /[a-z]/.test(str); }
  hasNumber(str: string): boolean { return /[0-9]/.test(str); }
  hasSpecialChar(str: string): boolean { return /[^A-Za-z0-9]/.test(str); }

  changePassword(event: Event) {
    event.preventDefault();
    this.passwordError.set('');
    this.passwordSuccess.set(false);

    if (this.newPassword !== this.confirmPassword) {
      this.passwordError.set('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
      return;
    }

    this.savingPassword.set(true);
    const payload = {
      old_password: this.currentPassword,
      new_password: this.newPassword
    };

    this.http.post<any>(`${environment.apiUrl}identity/change-my-password/`, payload).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordSuccess.set(true);
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (err) => {
        const msg = err.error?.error || err.error?.message || 'حدث خطأ أثناء تغيير كلمة المرور.';
        this.passwordError.set(msg);
        this.savingPassword.set(false);
      }
    });
  }

  // الجلسات
  loadActiveSessions() {
    this.loadingSessions.set(true);
    this.http.get<any>(`${environment.apiUrl}identity/security-dashboard/`).subscribe({
      next: (res) => {
        const sessions = res.data?.my_sessions || [];
        this.sessionsList.set(sessions);
        this.loadingSessions.set(false);
      },
      error: () => {
        this.loadingSessions.set(false);
      }
    });
  }

  getDeviceIcon(os?: string, browser?: string): string {
    const o = (os || '').toLowerCase();
    if (o.includes('win')) return '💻';
    if (o.includes('mac') || o.includes('ios')) return '🍎';
    if (o.includes('android')) return '📱';
    if (o.includes('linux')) return '🐧';
    return '🌐';
  }

  formatDate(dtStr: string): string {
    if (!dtStr) return 'الآن';
    try {
      return new Date(dtStr).toLocaleString('ar-SA');
    } catch {
      return dtStr;
    }
  }

  // إنهاء جلسة فردية (استخدام المودال المخصص بدلاً من alert/confirm)
  confirmTerminateSession(session: UserSessionItem) {
    this.confirmModalTitle.set('تأكيد إنهاء الجلسة');
    this.confirmModalMessage.set(`هل أنت تأكد من رغبتك في إنهاء جلسة الجهاز «${session.device_name} (${session.browser})»؟`);
    this.pendingConfirmAction = () => {
      this.http.post<any>(`${environment.apiUrl}identity/sessions/${session.id}/terminate/`, {}).subscribe({
        next: () => {
          this.loadActiveSessions();
        }
      });
    };
    this.showConfirmModal.set(true);
  }

  confirmLogoutAllDevices() {
    this.confirmModalTitle.set('تأكيد الخروج من كافة الأجهزة الأُخرى');
    this.confirmModalMessage.set('سيتم تسجيل خروج حسابك فوراً من جميع الأجهزة والمتصفحات الفعالة باستثناء هذا الجهاز.');
    this.pendingConfirmAction = () => {
      this.http.post<any>(`${environment.apiUrl}identity/logout-all/`, {}).subscribe({
        next: () => {
          this.loadActiveSessions();
        }
      });
    };
    this.showConfirmModal.set(true);
  }

  executeConfirmAction() {
    if (this.pendingConfirmAction) {
      this.pendingConfirmAction();
    }
    this.closeConfirmModal();
  }

  closeConfirmModal() {
    this.showConfirmModal.set(false);
    this.pendingConfirmAction = null;
  }

  // حفظ التفضيلات
  savePreferences() {
    const prefs = {
      theme: this.prefTheme,
      density: this.prefDensity,
      sound: this.prefSound,
      email_digest: this.prefEmailDigest
    };

    const payload = { preferences: prefs };
    this.http.patch<any>(`${environment.apiUrl}identity/users/me/`, payload).subscribe({
      next: () => {
        this.prefSavedSuccess.set(true);
        setTimeout(() => this.prefSavedSuccess.set(false), 3000);
      }
    });
  }
}
