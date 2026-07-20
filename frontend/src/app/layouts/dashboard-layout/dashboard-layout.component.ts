import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { MatMenuModule } from '@angular/material/menu';
import { TenantService } from '../../core/services/tenant.service';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationsService, AppNotification } from '../../core/services/notifications.service';

interface NavItem {
  label: string;
  link?: string;
  count?: number;
  countKind?: 'danger' | 'info' | 'warning';
  ai?: boolean;
  /** مسار الجذر للتفعيل (اختياري): يُستخدم لإبراز الأب عند فتح أي صفحة فرعية */
  match?: string;
  /** عناصر فرعية — تُعرض كقائمة متفرعة قابلة للطي في الشريط الجانبي */
  children?: NavItem[];
  /** صلاحية مطلوبة لإظهار العنصر (اختياري) — يُخفى إن لم يمتلكها المستخدم */
  permission?: string;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
  /** صلاحية مطلوبة لإظهار المجموعة كاملة (اختياري) */
  permission?: string;
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
        <a class="sidebar-logo" routerLink="/welcome" aria-label="الصفحة الرئيسية للموقع">
          <div class="logo-mark">ن</div>
          <div class="logo-title">نبراس <span>OS</span></div>
        </a>

        <!-- فلتر تصفية القائمة السريع -->
        <div class="sidebar-search-box">
          <input
            type="text"
            class="sidebar-search-input"
            placeholder="🔍 تصفية القائمة السريعة..."
            [value]="navFilterQuery()"
            (input)="updateNavFilter($event)"
          />
          @if (navFilterQuery()) {
            <button class="clear-filter-btn" (click)="clearNavFilter()">×</button>
          }
        </div>

        <nav class="sidebar-nav">
          @for (group of filteredNavGroups(); track group.label ?? 'root') {
            <div class="nav-group">
              @if (group.label) {
                <button
                  type="button"
                  class="nav-group-header"
                  [class.active]="isGroupActive(group)"
                  (click)="toggleNavGroup(group.label)"
                >
                  <span class="group-title">{{ group.label }}</span>
                  <span class="chevron" [class.open]="isGroupExpanded(group.label)">‹</span>
                </button>
              }
              @if (!group.label || isGroupExpanded(group.label)) {
                <div class="nav-group-items">
                  @for (item of group.items; track item.label) {
                    @if (item.children && item.children.length) {
                      <!-- عنصر أب بقائمة فرعية قابلة للطي -->
                      @if (item.link) {
                        <a
                          [routerLink]="item.link"
                          class="nav-item nav-parent"
                          [class.active]="isBranchActive(item)"
                          (click)="toggleGroup(item.label)"
                        >
                          <span>{{ item.label }}</span>
                          <span class="chevron" [class.open]="isExpanded(item)">‹</span>
                        </a>
                      } @else {
                        <button
                          type="button"
                          class="nav-item nav-parent"
                          [class.active]="isBranchActive(item)"
                          (click)="toggleGroup(item.label)"
                        >
                          <span>{{ item.label }}</span>
                          <span class="chevron" [class.open]="isExpanded(item)">‹</span>
                        </button>
                      }
                      @if (isExpanded(item)) {
                        <div class="submenu">
                          @for (child of item.children; track child.label) {
                            <a
                              class="nav-item nav-child"
                              [routerLink]="child.link"
                              routerLinkActive="active"
                            >
                              <span>{{ child.label }}</span>
                              @if (child.count) {
                                <span class="nav-count" [class]="'nav-count ' + child.countKind">{{ child.count }}</span>
                              }
                            </a>
                          }
                        </div>
                      }
                    } @else if (item.link) {
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
                </div>
              }
            </div>
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
          <button mat-menu-item routerLink="/profile">إعدادات الحساب</button>
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
          <button class="topbar-icon notif-btn" [matMenuTriggerFor]="notifMenu"
                  (menuOpened)="reloadNotifications()" aria-label="الإشعارات">
            🔔
            @if (notifUnread() > 0) {
              <span class="notif-badge">{{ notifUnread() > 99 ? '99+' : notifUnread() }}</span>
            }
          </button>
          <mat-menu #notifMenu="matMenu" class="notif-menu-panel">
            <div class="notif-header">
              <span>الإشعارات</span>
              @if (notifUnread() > 0) {
                <button class="notif-mark-all" (click)="$event.stopPropagation(); markAllNotificationsRead()">
                  تحديد الكل كمقروء
                </button>
              }
            </div>
            @if (notifItems().length === 0) {
              <div class="notif-empty">لا توجد إشعارات.</div>
            } @else {
              @for (n of notifItems(); track n.id) {
                <button mat-menu-item class="notif-item" [class.unread]="!n.is_read"
                        (click)="openNotification(n)">
                  <span class="notif-dot" [class.on]="!n.is_read"></span>
                  <span class="notif-body">
                    <strong>{{ n.title }}</strong>
                    <small>{{ n.body }}</small>
                  </span>
                </button>
              }
            }
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
        text-decoration: none;
        cursor: pointer;
        transition: background 150ms ease;
      }
      .sidebar-logo:hover { background: var(--nb-bg); }

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
        padding: 8px 8px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        overflow-y: auto;
        flex: 1;
      }

      .sidebar-nav::-webkit-scrollbar {
        width: 4px;
      }
      .sidebar-nav::-webkit-scrollbar-track {
        background: transparent;
      }
      .sidebar-nav::-webkit-scrollbar-thumb {
        background: var(--nb-border);
        border-radius: 4px;
      }
      .sidebar-nav::-webkit-scrollbar-thumb:hover {
        background: var(--nb-text-muted);
      }

      .sidebar-search-box {
        padding: 8px 10px 4px;
        position: relative;
        flex-shrink: 0;
      }
      .sidebar-search-input {
        width: 100%;
        height: 32px;
        padding: 0 10px;
        background: var(--nb-surface-raised);
        border: 1px solid var(--nb-border-soft);
        border-radius: var(--nb-radius);
        font-family: var(--nb-font-family);
        font-size: 12px;
        color: var(--nb-text);
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .sidebar-search-input:focus {
        border-color: var(--nb-primary-500);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.12);
      }
      .clear-filter-btn {
        position: absolute;
        left: 16px;
        top: 12px;
        background: none;
        border: none;
        color: var(--nb-text-muted);
        font-size: 15px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }

      /* ---------- 1. مجموعات القائمة الرئيسية (Level 1) ---------- */
      .nav-group {
        display: flex;
        flex-direction: column;
        gap: 3px;
        margin-bottom: 8px;
      }

      .nav-group-header {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 7px 10px;
        background: var(--nb-surface-raised, #f8fafc);
        border: 1px solid var(--nb-border-soft, #e2e8f0);
        border-right: 3px solid var(--nb-primary-500, #3b82f6);
        border-radius: var(--nb-radius, 6px);
        font-family: var(--nb-font-family);
        font-size: 11.5px;
        font-weight: 700;
        color: var(--nb-text);
        cursor: pointer;
        transition: all 180ms ease;
        box-sizing: border-box;

        &:hover {
          background: var(--nb-primary-50, #eff6ff);
          border-color: var(--nb-primary-300, #93c5fd);
          border-right-color: var(--nb-primary-600, #2563eb);
          color: var(--nb-primary-700, #1d4ed8);
        }

        &.active {
          background: var(--nb-primary-50, #eff6ff);
          border-right-color: var(--nb-primary-600, #2563eb);
          color: var(--nb-primary-700, #1d4ed8);
        }

        .group-title {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .chevron {
          font-size: 14px;
          transition: transform 180ms ease;
          display: inline-block;
          color: var(--nb-text-muted);
          line-height: 1;
        }

        .chevron.open {
          transform: rotate(-90deg);
        }
      }

      .nav-group-items {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding-top: 2px;
      }

      /* ---------- 2. العناصر والوحدات الرئيسية (Level 2) ---------- */
      .nav-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 10px;
        border-radius: var(--nb-radius, 6px);
        color: var(--nb-text-secondary);
        font-size: 12.5px;
        font-weight: 500;
        text-decoration: none;
        cursor: pointer;
        transition: background 150ms ease, color 150ms ease;

        &:hover {
          background: var(--nb-bg, #f1f5f9);
          color: var(--nb-text);
        }

        &.active {
          background: var(--nb-primary-50, #eff6ff);
          color: var(--nb-primary-600, #2563eb);
          font-weight: 600;
        }

        &.nav-parent {
          font-weight: 600;
          color: var(--nb-text);
        }
      }

      /* ---------- 3. القوائم الفرعية المتشعبة (Level 3) ---------- */
      .submenu {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding-right: 10px;
        margin-right: 12px;
        border-right: 1.5px dashed var(--nb-border, #cbd5e1);
        margin-top: 2px;
        margin-bottom: 4px;
      }

      .nav-item.nav-child {
        padding: 4.5px 8px;
        font-size: 12px;
        color: var(--nb-text-muted);

        &:hover {
          color: var(--nb-text);
          background: var(--nb-bg, #f1f5f9);
        }

        &.active {
          color: var(--nb-primary-600);
          background: var(--nb-primary-50);
          font-weight: 600;
        }
      }

      .nav-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 5.5px 10px;
        border-radius: var(--nb-radius);
        color: var(--nb-text-secondary);
        font-size: 12.5px;
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

      /* ---------- القوائم الفرعية المتفرعة ---------- */
      .nav-parent {
        width: 100%;
        border: none;
        background: transparent;
        font-family: var(--nb-font-family);
        text-align: inherit;
      }

      .chevron {
        font-size: 15px;
        line-height: 1;
        color: var(--nb-text-faint);
        transition: transform 0.15s ease;
        transform: rotate(-90deg); /* يشير للأسفل في RTL عند الإغلاق */
      }
      .chevron.open { transform: rotate(-270deg); }

      .submenu {
        display: flex;
        flex-direction: column;
        gap: 1px;
        margin: 2px 6px 4px;
        padding-right: 8px;
        border-right: 1px solid var(--nb-border-soft);
      }

      .nav-child {
        font-size: 12.5px;
        padding: 6px 10px;
        color: var(--nb-text-muted);

        &.active {
          background: var(--nb-primary-50);
          color: var(--nb-primary-600);
          font-weight: 600;
        }
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

      .notif-btn { position: relative; }
      .notif-badge {
        position: absolute; top: -6px; left: -6px; min-width: 16px; height: 16px;
        padding: 0 4px; border-radius: 999px; background: var(--nb-danger, #dc2626);
        color: #fff; font-size: 10px; font-weight: 700; line-height: 16px; text-align: center;
        box-sizing: border-box;
      }
      .notif-header {
        padding: 10px 16px; display: flex; align-items: center; justify-content: space-between;
        font-size: 12px; font-weight: 700; color: var(--nb-text-muted);
        border-bottom: 1px solid var(--nb-border-soft);
      }
      .notif-mark-all {
        background: none; border: none; color: var(--nb-primary-600); font-family: inherit;
        font-size: 11px; font-weight: 700; cursor: pointer; padding: 0;
      }
      .notif-empty { padding: 24px 16px; text-align: center; color: var(--nb-text-muted); font-size: 13px; }
      .notif-item {
        display: flex; align-items: flex-start; gap: 10px; height: auto; line-height: 1.5;
        padding: 10px 16px; white-space: normal; min-width: 300px; max-width: 360px;
      }
      .notif-item.unread { background: var(--nb-primary-50, #eef0fa); }
      .notif-dot {
        width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0;
        background: transparent;
      }
      .notif-dot.on { background: var(--nb-primary-600, #3F51B5); }
      .notif-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .notif-body strong { font-size: 13px; color: var(--nb-text); font-weight: 700; }
      .notif-body small { font-size: 11.5px; color: var(--nb-text-muted); white-space: normal; }

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
  private readonly notifications = inject(NotificationsService);

  readonly searchQuery = signal('');
  readonly navFilterQuery = signal('');

  updateNavFilter(event: Event): void {
    const val = (event.target as HTMLInputElement).value || '';
    this.navFilterQuery.set(val);
  }

  clearNavFilter(): void {
    this.navFilterQuery.set('');
  }

  // مركز الإشعارات
  readonly notifItems = this.notifications.items;
  readonly notifUnread = this.notifications.unread;

  constructor() {
    this.notifications.load().subscribe();
  }

  openNotification(n: AppNotification): void {
    if (!n.is_read) this.notifications.markRead(n.id).subscribe();
    if (n.action_url) this.router.navigateByUrl(n.action_url);
  }

  markAllNotificationsRead(): void {
    this.notifications.markAllRead().subscribe();
  }

  reloadNotifications(): void {
    this.notifications.load().subscribe();
  }

  /** حالة الأقسام الرئيسية المفتوحة/المغلقة يدويًا */
  private readonly toggledGroups = signal<Record<string, boolean>>({});

  isGroupActive(group: NavGroup): boolean {
    return group.items.some(
      (item) =>
        this.isBranchActive(item) ||
        (item.link && (this.currentUrl() === item.link || this.currentUrl().startsWith(item.link + '/')))
    );
  }

  isGroupExpanded(groupLabel?: string): boolean {
    if (!groupLabel) return true;
    if (this.navFilterQuery().trim().length > 0) return true;
    const manual = this.toggledGroups()[groupLabel];
    if (manual !== undefined) return manual;
    const group = this.navGroups.find((g) => g.label === groupLabel);
    if (group) return this.isGroupActive(group);
    return false;
  }

  toggleNavGroup(groupLabel?: string): void {
    if (!groupLabel) return;
    const currentlyOpen = this.isGroupExpanded(groupLabel);
    this.toggledGroups.update((state) => ({
      ...state,
      [groupLabel]: !currentlyOpen,
    }));
  }

  /** القوائم الفرعية المفتوحة يدويًا (بالإضافة إلى الفرع النشط الذي يُفتح تلقائيًا) */
  private readonly manuallyToggled = signal<Record<string, boolean>>({});

  /** هل الفرع (الأب) يحتوي المسار الحالي؟ يُستخدم للإبراز والفتح التلقائي. */
  isBranchActive(item: NavItem): boolean {
    const url = this.currentUrl();
    if (item.match && (url === item.match || url.startsWith(item.match + '/'))) return true;
    return (item.children ?? []).some((c) => c.link && (url === c.link || url.startsWith(c.link + '/')));
  }

  /** الفرع مفتوح إذا كان نشطًا (تلقائيًا) أو فتحه المستخدم يدويًا (مع احترام الإغلاق اليدوي). */
  isExpanded(item: NavItem): boolean {
    if (this.navFilterQuery().trim().length > 0) return true;
    const manual = this.manuallyToggled()[item.label];
    if (manual !== undefined) return manual;
    return this.isBranchActive(item);
  }

  toggleGroup(label: string): void {
    const item = this.navGroups.flatMap((g) => g.items).find((i) => i.label === label);
    if (!item) return;
    const currentlyOpen = this.isExpanded(item);
    
    const parents = this.navGroups.flatMap((g) => g.items).filter((i) => i.children && i.children.length > 0);
    const nextState: Record<string, boolean> = {};
    for (const p of parents) {
      nextState[p.label] = p.label === label ? !currentlyOpen : false;
    }
    this.manuallyToggled.set(nextState);
  }

  /* عناصر التنقل — الترتيب والتسميات والعدّادات كما في تصدير 1a حرفيًا */
  // القائمة الجانبية مبنية من مسارات Angular الحقيقية فقط (app.routes.ts).
  // كل عنصر ينتقل إلى مسار موجود فعلاً — لا مسارات وهمية، ولا شارات أعداد مُختلقة.
  readonly navGroups: NavGroup[] = [
    {
      items: [
        { label: 'لوحة القيادة', link: '/dashboard' },
        { label: 'الموافقات', link: '/approvals' },
      ],
    },
    {
      label: 'الأكاديمية',
      items: [
        {
          label: 'الطلاب',
          match: '/students',
          link: '/students/dashboard',
          children: [
            { label: 'قائمة الطلاب', link: '/students/list' },
            { label: 'لوحة شؤون الطلاب', link: '/students/dashboard' },
            { label: 'تسجيل طالب جديد', link: '/students/create' },
          ],
        },
        {
          label: 'القبول والتسجيل',
          match: '/admissions',
          link: '/admissions/dashboard',
          children: [
            { label: 'قائمة طلبات الالتحاق', link: '/admissions/applications' },
            { label: 'تسجيل طلب جديد', link: '/admissions/applications/new' },
            { label: 'المراجعة', link: '/admissions/review' },
            { label: 'المقابلات', link: '/admissions/interviews' },
            { label: 'المستندات', link: '/admissions/documents' },
            { label: 'قرارات القبول', link: '/admissions/acceptance' },
            { label: 'التسجيل النهائي', link: '/admissions/enrollment' },
            { label: 'قائمة الانتظار', link: '/admissions/waiting-list' },
            { label: 'المنح الدراسية', link: '/admissions/scholarships' },
            { label: 'لوحة القبول', link: '/admissions/dashboard' },
            { label: 'إعدادات القبول', link: '/admissions/settings' },
          ],
        },
        {
          label: 'الشؤون الأكاديمية',
          match: '/academics',
          link: '/academics/dashboard',
          children: [
            { label: 'لوحة الأكاديمية', link: '/academics/dashboard' },
            { label: 'السنوات الدراسية', link: '/academics/years' },
            { label: 'الأترام الدراسية', link: '/academics/terms' },
            { label: 'المراحل التعليمية', link: '/academics/stages' },
            { label: 'الصفوف الدراسية', link: '/academics/grades' },
            { label: 'الفصول الدراسية', link: '/academics/sections' },
            { label: 'توزيع الطلاب على الفصول', link: '/academics/distribution' },
            { label: 'المواد الدراسية', link: '/academics/subjects' },
          ],
        },
        { label: 'الجداول الدراسية', link: '/timetable' },
        { label: 'الجدولة', link: '/scheduling' },
        { label: 'الامتحانات', link: '/examinations' },
        { label: 'شؤون المعلمين', link: '/teachers' },
      ],
    },
    {
      label: 'الموارد البشرية',
      permission: 'employees:read',
      items: [
        { label: 'الموارد البشرية', link: '/hr' },
        { label: 'الرواتب', link: '/payroll' },
        {
          label: 'الحضور والانصراف',
          match: '/attendance',
          link: '/attendance/dashboard',
          children: [
            { label: 'نظرة عامة ومتابعة', link: '/attendance/dashboard' },
            { label: 'الكشوف والمخالصات', link: '/attendance/sheets' },
            { label: 'جدول الدوامات والورديات', link: '/attendance/shifts' },
            { label: 'طلبات تصحيح البصمة', link: '/attendance/corrections' },
            { label: 'سياسات الحضور', link: '/attendance/policies' },
            { label: 'طرق تسجيل البصمة والتحقق', link: '/attendance/check-in-methods' },
            { label: 'محاكي البصمة الجوالة', link: '/attendance/simulator' }
          ]
        },
      ],
    },
    {
      label: 'المالية والمشتريات',
      permission: 'finance:read',
      items: [
        { label: 'المالية', link: '/finance' },
        {
          label: 'حسابات الطلاب المالية',
          match: '/student-finance',
          link: '/student-finance/dashboard',
          children: [
            { label: 'لوحة التحكم', link: '/student-finance/dashboard' },
            { label: 'حسابات الطلاب', link: '/student-finance/accounts' },
            { label: 'فواتير الطلاب', link: '/student-finance/invoices' },
            { label: 'سندات القبض والمدفوعات', link: '/student-finance/receipts' },
            { label: 'مدفوعات أولياء الأمور', link: '/student-finance/online-payments' },
            { label: 'الأرصدة المستحقة', link: '/student-finance/outstanding' },
          ],
        },
        {
          label: 'المشتريات',
          match: '/procurement',
          link: '/procurement/dashboard',
          children: [
            { label: 'لوحة التحكم', link: '/procurement/dashboard' },
            { label: 'طلبات الشراء', link: '/procurement/requests' },
            { label: 'عروض الأسعار', link: '/procurement/rfqs' },
            { label: 'أوامر الشراء', link: '/procurement/orders' },
            { label: 'الموردون', link: '/procurement/vendors' },
            { label: 'العقود', link: '/procurement/contracts' },
          ],
        },
      ],
    },
    {
      label: 'سلسلة الإمداد والخدمات',
      permission: 'settings:read',
      items: [
        {
          label: 'المخزون',
          match: '/inventory',
          link: '/inventory/dashboard',
          children: [
            { label: 'لوحة التحكم', link: '/inventory/dashboard' },
            { label: 'الأصناف والأرصدة', link: '/inventory/items' },
            { label: 'المستودعات', link: '/inventory/warehouses' },
            { label: 'حركة المخزون', link: '/inventory/movements' },
            { label: 'استلام البضاعة', link: '/inventory/receipts' },
            { label: 'صرف المخزون', link: '/inventory/issues' },
            { label: 'التحويل بين المستودعات', link: '/inventory/transfers' },
            { label: 'الجرد', link: '/inventory/counts' },
            { label: 'المرجعيات', link: '/inventory/setup' },
          ],
        },
        {
          label: 'الأصول',
          match: '/assets',
          link: '/assets/dashboard',
          children: [
            { label: 'لوحة التحكم', link: '/assets/dashboard' },
            { label: 'سجل الأصول', link: '/assets/register' },
            { label: 'العهد والتغطية', link: '/assets/custody' },
            { label: 'الإهلاك', link: '/assets/depreciation' },
          ],
        },
        { label: 'النقل', link: '/transport' },
        {
          label: 'المكتبة',
          match: '/library',
          link: '/library/dashboard',
          children: [
            { label: 'لوحة التحكم', link: '/library/dashboard' },
            { label: 'الكتالوج والنسخ', link: '/library/catalog' },
            { label: 'الإعارة والإرجاع', link: '/library/borrows' },
            { label: 'الغرامات', link: '/library/fines' },
          ],
        },
        {
          label: 'العيادة',
          match: '/clinic',
          link: '/clinic/dashboard',
          children: [
            { label: 'لوحة التحكم', link: '/clinic/dashboard' },
            { label: 'الزيارات', link: '/clinic/visits' },
            { label: 'الإجازات المرضية', link: '/clinic/leaves' },
          ],
        },
        {
          label: 'الصيانة',
          match: '/maintenance',
          link: '/maintenance/dashboard',
          children: [
            { label: 'لوحة التحكم', link: '/maintenance/dashboard' },
            { label: 'بلاغات الصيانة', link: '/maintenance/requests' },
            { label: 'أوامر العمل', link: '/maintenance/work-orders' },
          ],
        },
      ],
    },
    {
      label: 'العلاقات والاتصال',
      permission: 'settings:read',
      items: [
        {
          label: 'إدارة علاقات العملاء (CRM)',
          match: '/crm',
          link: '/crm/dashboard',
          children: [
            { label: 'لوحة القيادة CRM', link: '/crm/dashboard' },
            { label: 'استقطاب العملاء المحتملين', link: '/crm/leads' },
            { label: 'تذاكر الدعم والشكاوى', link: '/crm/cases' },
            { label: 'استطلاعات الرأي والرضا', link: '/crm/surveys' },
          ],
        },
        {
          label: 'مركز الاتصالات',
          match: '/communications',
          link: '/communications/dashboard',
          children: [
            { label: 'لوحة التحكم والعمليات', link: '/communications/dashboard' },
            { label: 'قوالب الرسائل والمتغيرات', link: '/communications/templates' },
            { label: 'قنوات ومزودات الخدمة', link: '/communications/channels' },
          ],
        },
        {
          label: 'البوابات الإلكترونية',
          match: '/portal',
          link: '/portal/overview',
          children: [
            { label: 'نظرة عامة على البوابات', link: '/portal/overview' },
            { label: 'بوابة ولي الأمر', link: '/portal/parent/dashboard' },
            { label: 'بوابة الطالب', link: '/portal/student/dashboard' },
            { label: 'بوابة المتقدم', link: '/portal/applicant/dashboard' },
          ],
        },
      ],
    },
    {
      label: 'المعرفة والأتمتة',
      permission: 'settings:read',
      items: [
        { label: 'التقارير والتحليلات', link: '/reporting' },
        { label: 'إدارة المستندات', link: '/documents' },
        { label: 'النماذج', link: '/forms' },
        { label: 'الأتمتة', link: '/automation' },
        { label: 'محرك القواعد', link: '/rules' },
      ],
    },
    {
      label: 'النظام والإدارة',
      permission: 'settings:read',
      items: [
        { label: 'منصة النظام', link: '/platform' },
        { label: 'الإعدادات والميزات', link: '/config' },
        { label: 'التكامل', link: '/integration' },
        { label: 'التخصيص', link: '/personalization' },
        { label: 'لوحة الأوامر', link: '/command' },
        {
          label: 'الهيكل التنظيمي',
          match: '/organization',
          link: '/organization/overview',
          children: [
            { label: 'نظرة عامة', link: '/organization/overview' },
            { label: 'الأقسام', link: '/organization/departments' },
          ],
        },
        { label: '✦ مساعد نبراس', link: '/ai', ai: true },
      ],
    },
  ];

  /**
   * القوائم المفلترة حسب صلاحيات المستخدم الحالي.
   * تعتمد على إشارة الصلاحيات في AuthService فتتحدث تلقائياً بعد تسجيل الدخول.
   */
  readonly filteredNavGroups = computed<NavGroup[]>(() => {
    // قراءة إشارة الصلاحيات لجعل الحساب تفاعلياً
    this.authService.userPermissions();

    const canSee = (perm?: string) => !perm || this.authService.hasPermission(perm);
    const query = this.navFilterQuery().trim().toLowerCase();

    return this.navGroups
      .filter((group) => canSee(group.permission))
      .map((group) => {
        const groupMatches = Boolean(query && group.label?.toLowerCase().includes(query));

        const matchingItems = group.items
          .filter((item) => canSee(item.permission))
          .map((item) => {
            const matchesParent = !query || groupMatches || item.label.toLowerCase().includes(query);
            const matchingChildren = item.children?.filter(
              (child) => canSee(child.permission) && (!query || groupMatches || child.label.toLowerCase().includes(query) || matchesParent)
            );

            if (!query) {
              return {
                ...item,
                children: item.children?.filter((child) => canSee(child.permission)),
              };
            }

            if (matchesParent || (matchingChildren && matchingChildren.length > 0)) {
              return {
                ...item,
                children: matchingChildren || item.children,
              };
            }
            return null;
          })
          .filter(Boolean) as NavItem[];

        return {
          ...group,
          items: matchingItems,
        };
      })
      .filter((group) => group.items.length > 0);
  });

  private readonly pageTitles: Record<string, string> = {
    dashboard: 'لوحة القيادة التنفيذية',
    approvals: 'مركز الموافقات',
    students: 'الطلاب',
    admissions: 'القبول والتسجيل',
    academics: 'الشؤون الأكاديمية',
    timetable: 'الجداول الدراسية',
    finance: 'المالية',
    'student-finance': 'حسابات الطلاب المالية',
    hr: 'الموارد البشرية',
    payroll: 'الرواتب',
    procurement: 'المشتريات',
    maintenance: 'مكتب المساعدة',
    reporting: 'التحليلات والتقارير',
    ai: 'مساعد نبراس',
  };

  readonly currentUrl = toSignal(
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

  readonly userRole = computed(() => {
    // قراءة إشارة الصلاحيات لجعل الحساب تفاعلياً
    this.authService.userPermissions();
    if (this.authService.isSuperuser()) return 'مدير النظام';
    if (this.authService.hasPermission('settings:read')) return 'إداري';
    if (this.authService.hasPermission('grades:update')) return 'معلم';
    if (this.authService.hasPermission('portal:parent')) return 'ولي أمر';
    if (this.authService.hasPermission('portal:student')) return 'طالب';
    return 'مستخدم';
  });

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
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/accounts/login']);
      },
      error: () => {
        this.authService.clearSession();
        this.router.navigate(['/accounts/login']);
      }
    });
  }
}
