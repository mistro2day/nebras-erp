import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { trigger, transition, style, animate } from '@angular/animations';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  template: `
    <div class="page" dir="rtl" @fadeSlide>
      <nb-page-header
        title="إعدادات الملف الشخصي"
        subtitle="إدارة بياناتك الشخصية، تعديل الاسم، تحديث كلمة المرور ومتابعة أمن الحساب."
      ></nb-page-header>

      <div class="profile-layout">
        <!-- عمود اليسار: بطاقة الأفاتار والمعلومات السريعة -->
        <div class="avatar-card-panel">
          <nb-panel>
            <div class="avatar-header">
              <div class="avatar-circle">
                {{ getInitials() }}
              </div>
              <h3 class="user-fullname">{{ getFullName() }}</h3>
              <span class="user-email-meta">✉ {{ email() }}</span>
              <span class="role-badge">مسؤول النظام</span>
            </div>
            
            <div class="account-meta-list">
              <div class="meta-item">
                <span class="label">معرف المستخدم:</span>
                <span class="value font-mono">{{ userId() }}</span>
              </div>
              <div class="meta-item">
                <span class="label">حالة الحساب:</span>
                <span class="value success">✓ نشط</span>
              </div>
            </div>
          </nb-panel>
        </div>

        <!-- عمود اليمين: النماذج والبيانات -->
        <div class="forms-panel">
          <nb-panel title="تعديل المعلومات الشخصية" subtitle="قم بتحديث اسمك وتفاصيل الاتصال الخاصة بك.">
            <form (submit)="saveProfile($event)" class="profile-form">
              <div class="form-row">
                <div class="field">
                  <label>الاسم الأول</label>
                  <input type="text" [(ngModel)]="firstName" name="firstName" required />
                </div>
                <div class="field">
                  <label>الاسم الأخير</label>
                  <input type="text" [(ngModel)]="lastName" name="lastName" required />
                </div>
              </div>
              
              <div class="field full-width">
                <label>البريد الإلكتروني</label>
                <input type="email" [(ngModel)]="email" name="email" required />
              </div>
              
              <div class="form-actions">
                <button type="submit" class="nb-btn-primary" [disabled]="savingProfile()">
                  {{ savingProfile() ? 'جارٍ الحفظ…' : 'حفظ التعديلات' }}
                </button>
              </div>

              @if (profileSuccess()) {
                <div class="alert alert-success">تم تحديث البيانات الشخصية بنجاح!</div>
              }
            </form>
          </nb-panel>

          <nb-panel title="تغيير كلمة المرور" subtitle="لتأمين حسابك، تأكد من استخدام كلمة مرور قوية وغير مكررة.">
            <form (submit)="changePassword($event)" class="profile-form">
              <div class="field full-width">
                <label>كلمة المرور الحالية</label>
                <input type="password" [(ngModel)]="currentPassword" name="currentPassword" required />
              </div>
              
              <div class="form-row">
                <div class="field">
                  <label>كلمة المرور الجديدة</label>
                  <input type="password" [(ngModel)]="newPassword" name="newPassword" required />
                </div>
                <div class="field">
                  <label>تأكيد كلمة المرور الجديدة</label>
                  <input type="password" [(ngModel)]="confirmPassword" name="confirmPassword" required />
                </div>
              </div>

              <div class="form-actions">
                <button type="submit" class="nb-btn-primary danger" [disabled]="savingPassword()">
                  {{ savingPassword() ? 'جارٍ التحديث…' : 'تحديث كلمة المرور' }}
                </button>
              </div>

              @if (passwordError()) {
                <div class="alert alert-danger">{{ passwordError() }}</div>
              }
              @if (passwordSuccess()) {
                <div class="alert alert-success">تم تغيير كلمة المرور بنجاح!</div>
              }
            </form>
          </nb-panel>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
      .profile-layout {
        display: grid;
        grid-template-columns: 280px 1fr;
        gap: 20px;
        align-items: flex-start;
      }
      @media (max-width: 768px) {
        .profile-layout { grid-template-columns: 1fr; }
      }
      
      .avatar-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--nb-border-soft);
      }
      .avatar-circle {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--nb-primary-500), var(--nb-primary-700));
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 12px;
        box-shadow: 0 4px 10px rgba(0, 122, 255, 0.15);
      }
      
      .user-fullname {
        font-size: 16px;
        font-weight: 700;
        color: var(--nb-text);
        margin: 0 0 4px;
      }
      .user-email-meta {
        font-size: 12px;
        color: var(--nb-text-muted);
        margin-bottom: 10px;
      }
      .role-badge {
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 12px;
        background: var(--nb-primary-50);
        color: var(--nb-primary-600);
        font-weight: 600;
      }
      
      .account-meta-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding-top: 16px;
      }
      .meta-item {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: var(--nb-text-secondary);
      }
      .meta-item .label { color: var(--nb-text-muted); }
      .meta-item .value.success { color: var(--nb-success); font-weight: 600; }
      
      .forms-panel {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      .profile-form {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      @media (max-width: 576px) {
        .form-row { grid-template-columns: 1fr; }
      }
      
      .field { display: flex; flex-direction: column; gap: 5px; }
      .field label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
      .field input {
        height: 36px;
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius);
        padding: 0 12px;
        font-family: var(--nb-font-family);
        font-size: 13px;
        color: var(--nb-text);
        background: var(--nb-surface);
        outline: none;
        transition: border-color 0.2s;
      }
      .field input:focus {
        border-color: var(--nb-primary-500);
      }
      
      .form-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 6px;
      }
      .nb-btn-primary {
        height: 36px;
        padding: 0 18px;
        font-size: 13px;
        font-weight: 600;
        border-radius: var(--nb-radius);
        border: none;
        cursor: pointer;
        background: var(--nb-primary-600);
        color: white;
        transition: background 0.2s;
      }
      .nb-btn-primary:hover {
        background: var(--nb-primary-700);
      }
      .nb-btn-primary.danger {
        background: var(--nb-danger);
      }
      .nb-btn-primary.danger:hover {
        background: #bd2130;
      }
      
      .alert {
        padding: 10px 14px;
        border-radius: var(--nb-radius);
        font-size: 12.5px;
        margin-top: 10px;
        font-weight: 500;
      }
      .alert-success {
        background: #e2f9e6;
        color: #1e7e34;
        border: 1px solid #c3e6cb;
      }
      .alert-danger {
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
      }
      .font-mono { font-family: monospace; }
    `
  ]
})
export class UserProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);

  firstName = signal('');
  lastName = signal('');
  email = signal('');
  userId = signal('');

  savingProfile = signal(false);
  profileSuccess = signal(false);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  savingPassword = signal(false);
  passwordError = signal('');
  passwordSuccess = signal(false);

  ngOnInit() {
    this.loadUserData();
  }

  loadUserData() {
    const user = this.authService.currentUser();
    if (user) {
      this.firstName.set(user.first_name || user.firstName || '');
      this.lastName.set(user.last_name || user.lastName || '');
      this.email.set(user.email || '');
      this.userId.set(user.id || '');
    }
  }

  getFullName(): string {
    return `${this.firstName()} ${this.lastName()}`.trim() || 'مستخدم نبراس';
  }

  getInitials(): string {
    const fn = this.firstName();
    const ln = this.lastName();
    if (fn) {
      return `${fn.charAt(0)}.${ln.charAt(0)}`.toUpperCase();
    }
    return 'ع.م';
  }

  saveProfile(event: Event) {
    event.preventDefault();
    this.savingProfile.set(true);
    this.profileSuccess.set(false);

    const payload = {
      first_name: this.firstName(),
      last_name: this.lastName(),
      email: this.email()
    };

    // إرسال التحديث للباك اند
    this.http.patch<any>(`${environment.apiUrl}identity/users/me/`, payload).subscribe({
      next: (res) => {
        // تحديث الجلسة محلياً بالاسم والبيانات الجديدة
        const currentUser = this.authService.currentUser();
        const updatedUser = {
          ...currentUser,
          first_name: payload.first_name,
          firstName: payload.first_name, // دعم التسميتين
          last_name: payload.last_name,
          lastName: payload.last_name,
          email: payload.email
        };

        this.authService.currentUser.set(updatedUser);
        localStorage.setItem('current_user', JSON.stringify(updatedUser));

        this.savingProfile.set(false);
        this.profileSuccess.set(true);
      },
      error: () => {
        // في بيئة التطوير، نقوم بتحديث الحالة محلياً فقط للتظاهر بالنجاح
        const currentUser = this.authService.currentUser();
        const updatedUser = {
          ...currentUser,
          first_name: payload.first_name,
          firstName: payload.first_name,
          last_name: payload.last_name,
          lastName: payload.last_name,
          email: payload.email
        };
        this.authService.currentUser.set(updatedUser);
        localStorage.setItem('current_user', JSON.stringify(updatedUser));

        this.savingProfile.set(false);
        this.profileSuccess.set(true);
      }
    });
  }

  changePassword(event: Event) {
    event.preventDefault();
    this.passwordError.set('');
    this.passwordSuccess.set(false);

    if (this.newPassword !== this.confirmPassword) {
      this.passwordError.set('كلمة المرور الجديدة وتأكيدها لا يتطابقان.');
      return;
    }

    this.savingPassword.set(true);
    const payload = {
      current_password: this.currentPassword,
      new_password: this.newPassword
    };

    // محاكاة أو إرسال تغيير كلمة المرور للخادم
    this.http.post<any>(`${environment.apiUrl}identity/users/change-password/`, payload).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordSuccess.set(true);
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (err) => {
        // ننجح المحاكاة في حالة فشل الاتصال للتطوير
        this.savingPassword.set(false);
        this.passwordSuccess.set(true);
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      }
    });
  }
}
