import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { MatMenuModule } from '@angular/material/menu';
import { TenantService } from '../../core/services/tenant.service';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  link?: string;
  count?: number;
  countKind?: 'danger' | 'info' | 'warning';
  ai?: boolean;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

/**
 * هيكل التطبيق — اتجاه 1a من تصدير Nebras OS.html
 * (شريط جانبي ثابت 240px — كثافة متوازنة)
 */
@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatMenuModule],
  template: `
    <div class="shell" dir="rtl">
      <!-- الشريط الجانبي (يمين في RTL) -->
      <aside class="sidebar">
        <div class="sidebar-logo">
          <div class="logo-mark">ن</div>
          <div class="logo-title">نبراس <span>OS</span></div>
        </div>

        <nav class="sidebar-nav">
          @for (group of navGroups; track group.label ?? 'root') {
            @if (group.label) {
              <div class="nav-group-label">{{ group.label }}</div>
            }
            @for (item of group.items; track item.label) {
              @if (item.link) {
                <a
                  class="nav-item"
                  [class.ai]="item.ai"
                  [routerLink]="item.link"
                  routerLinkActive="active"
                >
                  <span>{{ item.label }}</span>
                  @if (item.count) {
                    <span class="nav-count" [class]="'nav-count ' + item.countKind">{{ item.count }}</span>
                  }
                </a>
              } @else {
                <div class="nav-item">
                  <span>{{ item.label }}</span>
                </div>
              }
            }
          }
        </nav>

        <div class="sidebar-user" [matMenuTriggerFor]="userMenu">
          <div class="user-avatar">{{ userInitials() }}</div>
          <div class="user-meta">
            <span class="user-name">{{ userName() }}</span>
            <span class="user-role">{{ userRole() }}</span>
          </div>
        </div>
        <mat-menu #userMenu="matMenu">
          <button mat-menu-item routerLink="/platform/settings">إعدادات الحساب</button>
          <button mat-menu-item (click)="logout()">تسجيل الخروج</button>
        </mat-menu>
      </aside>

      <!-- المنطقة الرئيسية -->
      <div class="main">
        <header class="topbar">
          <div class="breadcrumb">
            {{ tenantName() }} <span class="sep">/</span>
            <span class="current">{{ pageTitle() }}</span>
          </div>
          <div class="spacer"></div>
          <div class="search">
            <input
              type="text"
              placeholder="بحث أو تنفيذ أمر…"
              [value]="searchQuery()"
              (input)="searchQuery.set($any($event.target).value)"
              (keyup.enter)="onSearch()"
            />
            <span class="kbd">Ctrl K</span>
          </div>
          <button class="topbar-icon" [matMenuTriggerFor]="notifMenu" aria-label="الإشعارات">🔔</button>
          <mat-menu #notifMenu="matMenu">
            <div class="notif-header">الإشعارات الواردة</div>
            <button mat-menu-item>
              <strong>طلب عطلة جديد</strong>
            </button>
            <button mat-menu-item>
              <strong>تحديث كشف الرواتب</strong>
            </button>
          </mat-menu>
          <div class="topbar-avatar" [matMenuTriggerFor]="userMenu">{{ userInitials() }}</div>
        </header>

        <div class="page">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .shell {
        display: flex;
        height: 100vh;
        background: var(--nb-bg);
        overflow: hidden;
      }

      /* ---------- الشريط الجانبي ---------- */
      .sidebar {
        width: var(--nb-sidebar-width);
        flex-shrink: 0;
        background: var(--nb-surface);
        border-left: 1px solid var(--nb-border);
        display: flex;
        flex-direction: column;
      }

      .sidebar-logo {
        height: 52px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 16px;
        border-bottom: 1px solid var(--nb-border-soft);
        flex-shrink: 0;
      }

      .logo-mark {
        width: 26px;
        height: 26px;
        background: var(--nb-primary-600);
        border-radius: var(--nb-radius);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--nb-on-primary);
        font-weight: 700;
        font-size: 13px;
      }

      .logo-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--nb-text);

        span { color: var(--nb-primary-600); }
      }

      .sidebar-nav {
        padding: 12px 10px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        overflow-y: auto;
        flex: 1;
      }

      .nav-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 7px 10px;
        border-radius: var(--nb-radius);
        color: var(--nb-text-secondary);
        font-size: 13px;
        text-decoration: none;
        cursor: pointer;

        &:hover { background: var(--nb-bg); }

        &.active {
          background: var(--nb-primary-50);
          color: var(--nb-primary-600);
          font-weight: 600;
        }

        &.ai {
          color: var(--nb-primary-600);
          font-weight: 500;
        }
      }

      .nav-group-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--nb-text-faint);
        padding: 14px 10px 4px;
      }

      .nav-count {
        font-size: 11px;
        font-weight: 700;
        padding: 1px 7px;
        border-radius: var(--nb-radius-round);

        &.danger  { background: var(--nb-danger-bg);  color: var(--nb-danger); }
        &.info    { background: var(--nb-info-bg);    color: var(--nb-info); }
        &.warning { background: var(--nb-warning-bg); color: var(--nb-warning); }
      }

      .sidebar-user {
        border-top: 1px solid var(--nb-border-soft);
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        flex-shrink: 0;
      }

      .user-avatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: var(--nb-primary-100);
        color: var(--nb-primary-600);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        flex-shrink: 0;
      }

      .user-meta {
        display: flex;
        flex-direction: column;
      }

      .user-name {
        font-size: 12px;
        font-weight: 600;
        color: var(--nb-text);
      }

      .user-role {
        font-size: 11px;
        color: var(--nb-text-muted);
      }

      /* ---------- المنطقة الرئيسية ---------- */
      .main {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .topbar {
        height: var(--nb-topbar-height);
        background: var(--nb-surface);
        border-bottom: 1px solid var(--nb-border);
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 0 20px;
        flex-shrink: 0;
      }

      .breadcrumb {
        font-size: 13px;
        color: var(--nb-text-muted);
        white-space: nowrap;

        .sep { color: var(--nb-text-separator); }
        .current { color: var(--nb-text); font-weight: 600; }
      }

      .spacer { flex: 1; }

      .search {
        width: 340px;
        height: 32px;
        background: var(--nb-bg);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius);
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 10px;

        input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-family: var(--nb-font-family);
          font-size: 12px;
          color: var(--nb-text);

          &::placeholder { color: var(--nb-text-faint); }
        }

        .kbd {
          background: var(--nb-surface);
          border: 1px solid var(--nb-border);
          border-radius: var(--nb-radius-sm);
          padding: 1px 6px;
          font-size: 11px;
          color: var(--nb-text-muted);
          white-space: nowrap;
        }
      }

      .topbar-icon {
        width: 30px;
        height: 30px;
        border-radius: var(--nb-radius);
        border: 1px solid var(--nb-border);
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--nb-text-secondary);
        font-size: 13px;
        cursor: pointer;
        padding: 0;

        &:focus-visible {
          outline: none;
          box-shadow: var(--nb-focus-ring);
        }
      }

      .topbar-avatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: var(--nb-primary-100);
        color: var(--nb-primary-600);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
      }

      .notif-header {
        padding: 8px 16px;
        font-size: 12px;
        font-weight: 700;
        color: var(--nb-text-muted);
      }

      /* ---------- منطقة الصفحة ---------- */
      .page {
        flex: 1;
        display: flex;
        min-height: 0;
      }
    `,
  ],
})
export class DashboardLayoutComponent {
  private readonly tenantService = inject(TenantService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly searchQuery = signal('');

  /* عناصر التنقل — الترتيب والتسميات والعدّادات كما في تصدير 1a حرفيًا */
  readonly navGroups: NavGroup[] = [
    {
      items: [
        { label: 'لوحة القيادة', link: '/dashboard' },
        { label: 'الموافقات', link: '/approvals', count: 18, countKind: 'danger' },
        { label: 'المهام' },
      ],
    },
    {
      label: 'الأكاديمية',
      items: [
        { label: 'الطلاب', link: '/students' },
        { label: 'القبول والتسجيل', link: '/admissions', count: 342, countKind: 'info' },
        { label: 'الشؤون الأكاديمية', link: '/academics' },
        { label: 'الجداول الدراسية', link: '/timetable' },
      ],
    },
    {
      label: 'العمليات',
      items: [
        { label: 'المالية', link: '/finance' },
        { label: 'الموارد البشرية', link: '/hr' },
        { label: 'الرواتب', link: '/payroll' },
        { label: 'المشتريات', link: '/procurement' },
      ],
    },
    {
      label: 'الخدمات',
      items: [
        { label: 'مكتب المساعدة', link: '/maintenance', count: 24, countKind: 'warning' },
        { label: 'التحليلات والتقارير', link: '/reporting' },
        { label: '✦ مساعد نبراس', link: '/ai', ai: true },
      ],
    },
  ];

  private readonly pageTitles: Record<string, string> = {
    dashboard: 'لوحة القيادة التنفيذية',
    approvals: 'مركز الموافقات',
    students: 'الطلاب',
    admissions: 'القبول والتسجيل',
    academics: 'الشؤون الأكاديمية',
    timetable: 'الجداول الدراسية',
    finance: 'المالية',
    hr: 'الموارد البشرية',
    payroll: 'الرواتب',
    procurement: 'المشتريات',
    maintenance: 'مكتب المساعدة',
    reporting: 'التحليلات والتقارير',
    ai: 'مساعد نبراس',
  };

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  readonly pageTitle = computed(() => {
    const first = this.currentUrl().split('/').filter(Boolean)[0] ?? '';
    return this.pageTitles[first] ?? first;
  });

  readonly tenantName = computed(
    () => this.tenantService.currentTenant()?.nameAr || 'مجموعة مدارس النبراس الأهلية'
  );

  readonly userName = computed(() => {
    const u = this.authService.currentUser();
    return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || 'د. عبدالله المطيري' : 'د. عبدالله المطيري';
  });

  readonly userRole = computed(() => 'المدير التنفيذي');

  readonly userInitials = computed(() => {
    const u = this.authService.currentUser();
    if (u?.firstName) {
      return `${u.firstName.charAt(0)}.${(u.lastName ?? '').charAt(0)}`;
    }
    return 'ع.م';
  });

  onSearch(): void {
    /* لوحة الأوامر Ctrl+K — تُفعَّل في مرحلة لاحقة */
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/accounts/login']);
    });
  }
}
