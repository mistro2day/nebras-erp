import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { TenantService } from '../../core/services/tenant.service';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/auth/auth.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

interface MenuItem {
  label: string;
  link?: string;
  icon?: string;
  disabled?: boolean;
  permission?: string;
  children?: MenuItem[];
  expanded?: boolean;
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, MatIconModule, MatMenuModule, MatButtonModule, FormsModule],
  template: `
    <div class="dashboard-container" [class.dark-mode]="themeService.isDarkMode()" dir="rtl">
      <!-- Top Header -->
      <header class="top-nav">
        <div class="brand">
          <img [src]="tenantService.currentTenant()?.logoUrl || 'assets/logo.png'" alt="Logo" class="logo" />
          <div class="brand-info">
            <span class="app-name">{{ tenantService.currentTenant()?.nameAr || 'نبراس ERP' }}</span>
            <span class="context-info">العام الدراسي: 2026/2027 | الفصل الأول | الفرع الرئيسي</span>
          </div>
        </div>

        <!-- Global Search Bar -->
        <div class="search-bar-container">
          <mat-icon>search</mat-icon>
          <input type="text" placeholder="ابحث عن الموظفين، الطلاب، الفواتير (CTRL + K)..." [(ngModel)]="searchQuery" (keyup.enter)="onSearch()" />
        </div>

        <div class="actions">
          <button class="icon-btn" (click)="themeService.toggleTheme()" title="تغيير المظهر">
            <mat-icon>{{ themeService.isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
          </button>
          
          <button class="icon-btn" [matMenuTriggerFor]="notifMenu">
            <mat-icon>notifications</mat-icon>
            <span class="badge" *ngIf="unreadCount() > 0">{{ unreadCount() }}</span>
          </button>

          <mat-menu #notifMenu="matMenu" class="notif-dropdown">
            <div class="notif-header">الإشعارات الواردة</div>
            <button mat-menu-item class="notif-item">
              <strong>طلب عطلة جديد</strong>
              <p>قدم المعلم أحمد طلباً لعطلة طارئة.</p>
            </button>
            <button mat-menu-item class="notif-item">
              <strong>تحديث كشف الرواتب</strong>
              <p>تم اعتماد مسير رواتب شهر يونيو.</p>
            </button>
          </mat-menu>

          <div class="user-profile" [matMenuTriggerFor]="userMenu">
            <div class="avatar">{{ authService.currentUser()?.firstName?.charAt(0) || 'م' }}</div>
            <span class="username">{{ authService.currentUser()?.firstName || 'المستخدم' }}</span>
            <mat-icon>expand_more</mat-icon>
          </div>

          <mat-menu #userMenu="matMenu">
            <div class="menu-user-details">
              <strong>{{ authService.currentUser()?.firstName }} {{ authService.currentUser()?.lastName }}</strong>
              <p>{{ authService.currentUser()?.email }}</p>
            </div>
            <hr />
            <button mat-menu-item routerLink="/platform/settings">
              <mat-icon>settings</mat-icon>
              <span>إعدادات الحساب</span>
            </button>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>تسجيل الخروج</span>
            </button>
          </mat-menu>
        </div>
      </header>

      <div class="main-wrapper">
        <!-- Sidebar Navigation -->
        <aside class="sidebar" [class.collapsed]="isCollapsed()">
          <div class="sidebar-toggle" (click)="toggleSidebar()">
            <mat-icon>{{ isCollapsed() ? 'chevron_left' : 'chevron_right' }}</mat-icon>
            <span class="toggle-text" *ngIf="!isCollapsed()">طي القائمة</span>
          </div>

          <nav class="sidebar-nav">
            <ul>
              <li *ngFor="let item of menuItems">
                <ng-container *ngIf="checkPermission(item)">
                  <div class="menu-item-row" [class.active]="item.link && router.url.startsWith(item.link)" 
                       [class.disabled]="item.disabled" (click)="toggleMenu(item)">
                    <mat-icon class="menu-icon" *ngIf="item.icon">{{ item.icon }}</mat-icon>
                    <span class="menu-label" *ngIf="!isCollapsed()">{{ item.label }}</span>
                    <span class="coming-soon" *ngIf="item.disabled && !isCollapsed()">قريباً</span>
                    <mat-icon class="arrow-icon" *ngIf="item.children && !isCollapsed()">
                      {{ item.expanded ? 'expand_less' : 'expand_more' }}
                    </mat-icon>
                  </div>

                  <!-- Submenu -->
                  <ul class="submenu" *ngIf="item.children && item.expanded && !isCollapsed()">
                    <li *ngFor="let sub of item.children">
                      <a [routerLink]="sub.link" routerLinkActive="active" class="submenu-link" [class.disabled]="sub.disabled">
                        <mat-icon class="submenu-icon">{{ sub.icon || 'subdirectory_arrow_left' }}</mat-icon>
                        <span>{{ sub.label }}</span>
                      </a>
                    </li>
                  </ul>
                </ng-container>
              </li>
            </ul>
          </nav>
        </aside>

        <!-- Main Content View -->
        <main class="content-area">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background-color: #0f172a;
      color: #f8fafc;
    }
    .top-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 1.5rem;
      height: 64px;
      background: #1e293b;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo {
      height: 38px;
    }
    .brand-info {
      display: flex;
      flex-direction: column;
    }
    .app-name {
      font-weight: bold;
      font-size: 1.1rem;
    }
    .context-info {
      font-size: 0.7rem;
      color: #94a3b8;
    }
    .search-bar-container {
      display: flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 6px 12px;
      width: 350px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .search-bar-container input {
      background: transparent;
      border: none;
      color: white;
      outline: none;
      margin-right: 8px;
      font-size: 0.85rem;
      width: 100%;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .icon-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      position: relative;
    }
    .icon-btn:hover {
      color: white;
    }
    .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: white;
      border-radius: 50%;
      padding: 2px 6px;
      font-size: 0.65rem;
    }
    .user-profile {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #6366f1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }
    .main-wrapper {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .sidebar {
      width: 260px;
      background: #1e293b;
      border-left: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      transition: width 0.3s;
    }
    .sidebar.collapsed {
      width: 64px;
    }
    .sidebar-toggle {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 1rem;
      cursor: pointer;
      color: #94a3b8;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .sidebar-toggle:hover {
      color: white;
    }
    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      padding: 10px 0;
    }
    .sidebar-nav ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .menu-item-row {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      cursor: pointer;
      color: #cbd5e1;
      gap: 12px;
      transition: background 0.2s;
    }
    .menu-item-row:hover {
      background: rgba(255, 255, 255, 0.03);
      color: white;
    }
    .menu-item-row.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .menu-label {
      font-size: 0.9rem;
      font-weight: 500;
      flex: 1;
    }
    .coming-soon {
      font-size: 0.65rem;
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      color: #94a3b8;
    }
    .arrow-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .submenu {
      background: rgba(15, 23, 42, 0.2);
      padding: 4px 0;
    }
    .submenu-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 32px;
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.85rem;
    }
    .submenu-link:hover, .submenu-link.active {
      color: #6366f1;
      background: rgba(99, 102, 241, 0.05);
    }
    .content-area {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
      background-color: #0f172a;
    }
  `]
})
export class DashboardLayoutComponent implements OnInit {
  tenantService = inject(TenantService);
  themeService = inject(ThemeService);
  authService = inject(AuthService);
  router = inject(Router);

  isCollapsed = signal(false);
  unreadCount = signal(2);
  searchQuery = '';

  menuItems: MenuItem[] = [
    {
      label: 'لوحة القيادة الموحدة',
      icon: 'dashboard',
      link: '/dashboard',
      expanded: false,
      children: [
        { label: 'الإحصائيات العامة', link: '/dashboard', icon: 'bar_chart' }
      ]
    },
    {
      label: 'شؤون الطلاب والقبول',
      icon: 'school',
      expanded: false,
      children: [
        { label: 'سجل الطلاب', link: '/students/list', icon: 'list' },
        { label: 'إضافة طالب جديد', link: '/students/create', icon: 'person_add' },
        { label: 'طلبات القبول والتسجيل', link: '/admissions/applicants', icon: 'people' }
      ]
    },
    {
      label: 'أعضاء هيئة التدريس',
      icon: 'badge',
      expanded: false,
      children: [
        { label: 'شؤون المعلمين والأكاديميين', link: '/teachers/dashboard', icon: 'co_present' }
      ]
    },
    {
      label: 'الموارد البشرية والرواتب',
      icon: 'people_alt',
      expanded: false,
      children: [
        { label: 'مسيرات الرواتب والتعويضات', link: '/payroll/dashboard', icon: 'payments' },
        { label: 'حضور وانصراف الموظفين', link: '/attendance/dashboard', icon: 'schedule' }
      ]
    },
    {
      label: 'نواة المنصة والإعدادات',
      icon: 'settings_suggest',
      expanded: false,
      children: [
        { label: 'صحة وصيانة النظام', link: '/platform/dashboard', icon: 'analytics' },
        { label: 'محرك الجدولة الموحد', link: '/scheduling/dashboard', icon: 'date_range' },
        { label: 'منصة وقواعد الأعمال', link: '/rules/dashboard', icon: 'rule' },
        { label: 'الجدول الأكاديمي والحصص', link: '/timetable/dashboard', icon: 'calendar_today' },
        { label: 'الإعدادات والخصائص', link: '/platform/settings', icon: 'settings' },
        { label: 'التدقيق الأمني والملفات', link: '/platform/logs', icon: 'security' }
      ]
    }
  ];

  ngOnInit() {}

  toggleSidebar() {
    this.isCollapsed.update(val => !val);
  }

  toggleMenu(item: MenuItem) {
    if (item.disabled) return;
    if (this.isCollapsed()) {
      this.isCollapsed.set(false);
    }
    item.expanded = !item.expanded;
  }

  checkPermission(item: MenuItem): boolean {
    return true;
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/accounts/login']);
    });
  }

  onSearch() {}
}
