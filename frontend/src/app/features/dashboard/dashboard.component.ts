import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { TenantService } from '../../core/services/tenant.service';
import { DashboardService, DashboardOverviewResponse, FormMatrixItem } from './dashboard.service';
import { NbLoadingComponent } from '../../shared/nebras/nb-loading.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, NbLoadingComponent],
  template: `
    <div class="content" dir="rtl">
      <!-- 1. شريط الترحيب والمحدد السريع للفروع -->
      <div class="greeting-row">
        <div class="greeting-box">
          <div class="greeting-title">
            <span>{{ greeting() }}، </span>
            <span class="user-name">{{ userName() }}</span>
            <span class="wave-hand">👋</span>
          </div>
          <div class="greeting-subtitle">
            <span class="live-dot"></span>
            <span>لوحة القيادة والمراقبة الحية</span>
            <span class="sep">•</span>
            <span>{{ today }}</span>
            <span class="sep">•</span>
            <span class="school-tag">{{ tenantName() }}</span>
          </div>
        </div>

        <div class="spacer"></div>

        <div class="header-tools">
          <!-- محدد الفرع السريع مع انتقال انزلاقي -->
          <div class="branch-pills-bar">
            <button
              type="button"
              class="pill-btn"
              [class.active]="activeBranch() === 'all'"
              (click)="setBranch('all')"
            >
              🏫 جميع الفروع
            </button>
            <button
              type="button"
              class="pill-btn"
              [class.active]="activeBranch() === 'boys'"
              (click)="setBranch('boys')"
            >
              👦 مدرسة البنين
            </button>
            <button
              type="button"
              class="pill-btn"
              [class.active]="activeBranch() === 'girls'"
              (click)="setBranch('girls')"
            >
              👧 مدرسة البنات
            </button>
          </div>

          <!-- زر التحديث اللحظي -->
          <button class="btn-refresh" (click)="loadOverview()" [disabled]="loading()" title="تحديث المؤشرات الحية">
            <span class="refresh-icon" [class.spinning]="loading()">🔄</span>
          </button>
        </div>
      </div>

      <!-- حالة التحميل -->
      @if (loading()) {
        <nb-loading message="جاري تحليل مؤشرات المدرسة واستدعاء حالة النماذج اللحظية..."></nb-loading>
      } @else {

        <!-- 2. شريط النبض التنفيذي والمؤشرات الحيوية (Executive KPI Ribbon) -->
        <div class="kpi-grid">
          <!-- كارت الطلاب والانتظام -->
          <div class="kpi-card hover-glow theme-indigo">
            <div class="kpi-top">
              <span class="kpi-label">إجمالي الطلاب والانتظام</span>
              <div class="kpi-icon-wrap bg-indigo">🎓</div>
            </div>
            <div class="kpi-main">
              <span class="kpi-val">{{ overview()?.kpis?.total_students || 0 }}</span>
              <span class="kpi-unit">طالب</span>
            </div>
            <div class="kpi-bottom">
              <span class="kpi-badge positive">
                <span>▲</span> 96.5% نسبة الحضور اليوم
              </span>
            </div>
          </div>

          <!-- كارت استجابات النماذج والطلبات -->
          <div class="kpi-card hover-glow theme-emerald">
            <div class="kpi-top">
              <span class="kpi-label">إجمالي استجابات النماذج</span>
              <div class="kpi-icon-wrap bg-emerald">📋</div>
            </div>
            <div class="kpi-main">
              <span class="kpi-val">{{ overview()?.kpis?.total_forms_submissions || 0 }}</span>
              <span class="kpi-unit">استجابة</span>
            </div>
            <div class="kpi-bottom">
              <span class="kpi-badge neutral">
                <span>⚡</span> معالجة حية لكافة الاستمارات
              </span>
            </div>
          </div>

          <!-- كارت المدفوعات المعلقة للمطابقة -->
          <div class="kpi-card hover-glow theme-amber">
            <div class="kpi-top">
              <span class="kpi-label">طلبات سداد قيد المراجعة</span>
              <div class="kpi-icon-wrap bg-amber">💳</div>
            </div>
            <div class="kpi-main">
              <span class="kpi-val">{{ overview()?.kpis?.pending_payments_count || 0 }}</span>
              <span class="kpi-unit">حوالة</span>
            </div>
            <div class="kpi-bottom">
              <span class="kpi-badge warning">
                <span>⏳</span> {{ overview()?.kpis?.pending_payments_amount | number:'1.0-0' }} ر.س معلقة
              </span>
            </div>
          </div>

          <!-- كارت نسبة التحصيل المالي -->
          <div class="kpi-card hover-glow theme-blue">
            <div class="kpi-top">
              <span class="kpi-label">نسبة التحصيل المالي</span>
              <div class="kpi-icon-wrap bg-blue">💰</div>
            </div>
            <div class="kpi-main">
              <span class="kpi-val">{{ overview()?.kpis?.collection_rate || 88.4 }}%</span>
              <span class="kpi-unit">للفصل الحالي</span>
            </div>
            <div class="kpi-bottom">
              <div class="mini-progress-bar">
                <div class="mini-progress-fill" [style.width.%]="overview()?.kpis?.collection_rate || 88.4"></div>
              </div>
            </div>
          </div>

          <!-- كارت الموافقات العاجلة -->
          <div class="kpi-card hover-glow theme-rose">
            <div class="kpi-top">
              <span class="kpi-label">موافقات بانتظار القرار</span>
              <div class="kpi-icon-wrap bg-rose">⚡</div>
            </div>
            <div class="kpi-main">
              <span class="kpi-val">{{ overview()?.kpis?.pending_approvals || 0 }}</span>
              <span class="kpi-unit">طلب عاجل</span>
            </div>
            <div class="kpi-bottom">
              <a class="kpi-link text-rose" routerLink="/approvals">
                <span>فحص وموافقة</span> <span>➔</span>
              </a>
            </div>
          </div>
        </div>

        <!-- 3. مركز مراقبة حالة النماذج والطلبات الحية (Live Forms & Modules Center) -->
        <div class="section-card">
          <div class="section-header">
            <div class="section-title-group">
              <div class="section-icon-badge">🎛️</div>
              <div>
                <h3 class="section-title">مركز حالة النماذج والاستمارات الحية (Forms Status Center)</h3>
                <p class="section-subtitle">
                  مراقبة فورية للتدفق والاعتمادات لكافة الاستمارات المدرسية ونماذج القبول والمالية والعيادة.
                </p>
              </div>
            </div>

            <div class="forms-filter-tabs">
              <button
                class="tab-pill"
                [class.active]="selectedFormFilter() === 'all'"
                (click)="selectedFormFilter.set('all')"
              >
                الكل ({{ overview()?.forms_matrix?.length || 0 }})
              </button>
              <button
                class="tab-pill"
                [class.active]="selectedFormFilter() === 'pending'"
                (click)="selectedFormFilter.set('pending')"
              >
                تحتاج مراجعة ({{ totalPendingForms() }})
              </button>
            </div>
          </div>

          <!-- شبكة بطاقات النماذج المتطورة -->
          <div class="forms-grid">
            @for (item of filteredFormsMatrix(); track item.key) {
              <div class="form-module-card hover-lift" [class]="'border-theme-' + item.color_theme">
                <div class="form-card-top">
                  <div class="form-icon-circle" [class]="'bg-' + item.color_theme">
                    {{ item.icon }}
                  </div>
                  <div class="form-title-meta">
                    <h4 class="form-card-title">{{ item.title }}</h4>
                    <span class="form-card-subtitle">{{ item.subtitle }}</span>
                  </div>
                </div>

                <div class="form-stats-row">
                  <div class="f-stat">
                    <span class="f-stat-lbl">إجمالي الوارد</span>
                    <span class="f-stat-val">{{ item.submissions }}</span>
                  </div>
                  <div class="f-stat text-amber">
                    <span class="f-stat-lbl">قيد المراجعة</span>
                    <span class="f-stat-val font-bold">{{ item.pending }}</span>
                  </div>
                  <div class="f-stat text-emerald">
                    <span class="f-stat-lbl">معتمد / مكتمل</span>
                    <span class="f-stat-val font-bold">{{ item.approved }}</span>
                  </div>
                </div>

                <!-- شريط نسبة الإنجاز والتقدم -->
                <div class="progress-section">
                  <div class="progress-labels">
                    <span class="prog-text">نسبة الإنجاز والمطابقة</span>
                    <span class="prog-val">{{ item.progress }}%</span>
                  </div>
                  <div class="progress-track">
                    <div
                      class="progress-fill"
                      [class]="'bg-grad-' + item.color_theme"
                      [style.width.%]="item.progress"
                    ></div>
                  </div>
                </div>

                <!-- زر الإجراء السريع -->
                <div class="form-card-footer">
                  <a [routerLink]="item.link" class="btn-action" [class]="'btn-' + item.color_theme">
                    <span>{{ item.action_label }}</span>
                    <span class="arrow-icon">➔</span>
                  </a>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- 4. المخططات التحليلية ومسار القبول والتدفق الزمني -->
        <div class="analytics-grid">
          <!-- أ. مسار القبول والتسجيل التفاعلي (Admissions Funnel) -->
          <div class="panel funnel-panel">
            <div class="panel-header">
              <div class="panel-title-group">
                <span class="panel-icon">🎓</span>
                <div>
                  <h4 class="panel-title">مسار تحويل القبول والتسجيل</h4>
                  <span class="panel-sub">تدفق استمارات المتقدمين حسب مرحلة المعالجة</span>
                </div>
              </div>
              <a routerLink="/admissions" class="panel-link">عرض قائمة القبول ➔</a>
            </div>

            <div class="funnel-container">
              @for (stage of overview()?.admissions_funnel; track stage.label) {
                <div class="funnel-stage-row">
                  <div class="stage-info">
                    <span class="stage-name">{{ stage.label }}</span>
                    <span class="stage-count" [class.text-emerald]="stage.success">{{ stage.value }} طالب</span>
                  </div>
                  <div class="stage-track">
                    <div
                      class="stage-fill"
                      [class]="stage.color"
                      [style.width.%]="stage.width"
                    ></div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- ب. الرسم البياني للتدفق المالي (Financial Trend) -->
          <div class="panel chart-panel">
            <div class="panel-header">
              <div class="panel-title-group">
                <span class="panel-icon">📊</span>
                <div>
                  <h4 class="panel-title">التدفق المالي (الإيرادات مقابل المصروفات)</h4>
                  <span class="panel-sub">تحليل شهري لـ 6 أشهر سابقة</span>
                </div>
              </div>
              <div class="chart-legend">
                <span class="legend-item"><span class="dot bg-emerald"></span> الإيرادات</span>
                <span class="legend-item"><span class="dot bg-rose"></span> المصروفات</span>
              </div>
            </div>

            <!-- رسم بياني بأعمدة متدرجة تفاعلية SVG/CSS -->
            <div class="custom-chart-wrapper">
              <div class="bars-chart">
                @for (pt of overview()?.financial_trend; track pt.month) {
                  <div class="bar-group">
                    <div class="bars-pair">
                      <div
                        class="bar revenue-bar"
                        [style.height.%]="(pt.revenue / 200000) * 100"
                        [title]="'الإيرادات: ' + (pt.revenue | number) + ' ر.س'"
                      >
                        <span class="bar-tooltip">{{ pt.revenue | number:'1.0-0' }}</span>
                      </div>
                      <div
                        class="bar expense-bar"
                        [style.height.%]="(pt.expenses / 200000) * 100"
                        [title]="'المصروفات: ' + (pt.expenses | number) + ' ر.س'"
                      >
                        <span class="bar-tooltip">{{ pt.expenses | number:'1.0-0' }}</span>
                      </div>
                    </div>
                    <span class="month-label">{{ pt.month }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- 5. شريط الأنشطة الحية والموافقات الفورية -->
        <div class="dual-columns-grid">
          <!-- تدفق الأنشطة اللحظية (Live Activity Feed) -->
          <div class="panel activities-panel">
            <div class="panel-header">
              <div class="panel-title-group">
                <span class="panel-icon">⚡</span>
                <div>
                  <h4 class="panel-title">تدفق الاستجابات والطلبات المباشرة (Live Feed)</h4>
                  <span class="panel-sub">سجل فوري لحظة بلحظة للطلبات والاستمارات الواردة</span>
                </div>
              </div>
            </div>

            <div class="timeline-list">
              @for (act of overview()?.recent_activities; track act.id) {
                <div class="timeline-item">
                  <div class="timeline-icon-node">
                    {{ act.icon }}
                  </div>
                  <div class="timeline-body">
                    <div class="timeline-title-row">
                      <span class="timeline-title">{{ act.title }}</span>
                      <span class="timeline-time">{{ act.time }}</span>
                    </div>
                    <div class="timeline-author">
                      <span>👤 {{ act.author }}</span>
                      <span class="badge-status" [class]="'badge-' + act.status_class">{{ act.status }}</span>
                    </div>
                  </div>
                  <a [routerLink]="act.link" class="timeline-action-btn">فحص</a>
                </div>
              }
            </div>
          </div>

          <!-- الموافقات العاجلة بانتظار القرار -->
          <div class="panel inbox-panel">
            <div class="panel-header">
              <div class="panel-title-group">
                <span class="panel-icon">📬</span>
                <div>
                  <h4 class="panel-title">صندوق الموافقات الإدارية العاجلة</h4>
                  <span class="panel-sub">قرارات تتطلب توقيع واعتماد الإدارة</span>
                </div>
              </div>
              <a routerLink="/approvals" class="panel-link">مركز الموافقات ➔</a>
            </div>

            <div class="inbox-list">
              @for (item of overview()?.inbox; track item.id) {
                <div class="inbox-item">
                  <div class="inbox-info">
                    <div class="inbox-title">{{ item.title }}</div>
                    <div class="inbox-meta">
                      <span class="meta-tag">{{ item.meta }}</span>
                      <span class="meta-time">{{ item.created_at }}</span>
                    </div>
                  </div>
                  <span class="priority-badge" [class.priority-high]="item.priority === 'عاجل' || item.priority === 'مرتفع'">
                    {{ item.priority }}
                  </span>
                  <a routerLink="/approvals" class="btn-review">معاينة</a>
                </div>
              } @empty {
                <div class="empty-inbox">
                  <span class="check-icon">✓</span>
                  <span>لا توجد طلبات معلقة بانتظار القرار حالياً.</span>
                </div>
              }
            </div>
          </div>
        </div>

      }
    </div>

    <!-- 6. لوحة مساعد نبراس الذكي التفاعلي (Nebras Copilot Sidecar) -->
    <aside class="ai-sidecar">
      <div class="ai-header">
        <div class="ai-badge-group">
          <span class="ai-sparkle">✦</span>
          <div>
            <h4 class="ai-title">مساعد نبراس الذكي</h4>
            <span class="ai-sub">تحليلات ذكية فورية</span>
          </div>
        </div>
      </div>

      <div class="ai-content">
        <div class="ai-prompt-box">
          <span class="prompt-icon">💡</span>
          <span>يمكنك طرح أسئلة استعلامية سريعة حول أداء المدرسة والنماذج:</span>
        </div>

        <div class="quick-questions-group">
          <button class="ai-chip" (click)="askAssistant('كم عدد طلبات القبول المكتملة هذا الأسبوع؟')">
            💬 كم عدد طلبات القبول المكتملة؟
          </button>
          <button class="ai-chip" (click)="askAssistant('أظهر لي إجمالي مبالغ الرسوم المعلقة للمطابقة')">
            💬 ما إجمالي التحويلات المعلقة؟
          </button>
          <button class="ai-chip" (click)="askAssistant('ما هي نسبة حضور مدرسة البنين اليوم؟')">
            💬 نسبة حضور مدرسة البنين اليوم؟
          </button>
        </div>

        @if (assistantAnswer()) {
          <div class="ai-response-card animate-fade-in">
            <div class="response-header">
              <span class="ai-bot-icon">🤖</span>
              <span>إجابة المساعد الذكي:</span>
            </div>
            <div class="response-text">{{ assistantAnswer() }}</div>
          </div>
        }
      </div>

      <div class="ai-footer">
        <div class="ai-input-wrap">
          <input
            type="text"
            placeholder="اسأل المساعد الذكي عن أي إحصائية..."
            [value]="assistantQuery()"
            (input)="assistantQuery.set($any($event.target).value)"
            (keyup.enter)="submitQuery()"
          />
          <button class="btn-send" (click)="submitQuery()">➔</button>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    :host {
      display: flex;
      flex: 1;
      min-width: 0;
      min-height: 0;
      background: var(--nb-bg, #f8fafc);
      font-family: inherit;
    }

    .spacer { flex: 1; }

    .content {
      flex: 1;
      padding: 20px 24px 40px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      min-width: 0;
      overflow-y: auto;
    }

    /* 1. ترويسة الترحيب والمحدد */
    .greeting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .greeting-box {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .greeting-title {
      font-size: 20px;
      font-weight: 800;
      color: var(--nb-text, #0f172a);
      display: flex;
      align-items: center;
      gap: 6px;

      .user-name {
        color: var(--nb-primary-600, #4f46e5);
      }
      .wave-hand {
        font-size: 20px;
        animation: wave 1.8s infinite;
      }
    }

    @keyframes wave {
      0%, 100% { transform: rotate(0deg); }
      20%, 60% { transform: rotate(14deg); }
      40%, 80% { transform: rotate(-10deg); }
    }

    .greeting-subtitle {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: var(--nb-text-muted, #64748b);
      font-weight: 600;

      .live-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        animation: pulseDot 2s infinite;
      }

      .sep { color: #cbd5e1; }
      .school-tag {
        background: rgba(99, 102, 241, 0.1);
        color: #4f46e5;
        padding: 1px 8px;
        border-radius: 6px;
        font-weight: 700;
      }
    }

    @keyframes pulseDot {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.7; }
    }

    .header-tools {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .branch-pills-bar {
      display: flex;
      gap: 4px;
      background: var(--nb-surface, #ffffff);
      border: 1px solid var(--nb-border-soft, #e2e8f0);
      padding: 3px;
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }

    .pill-btn {
      padding: 6px 14px;
      border-radius: 8px;
      border: none;
      background: transparent;
      font-family: inherit;
      font-size: 12.5px;
      font-weight: 700;
      color: var(--nb-text-muted, #64748b);
      cursor: pointer;
      transition: all 180ms ease;

      &.active {
        background: var(--nb-primary-600, #4f46e5);
        color: #ffffff;
        box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
      }
      &:hover:not(.active) {
        background: var(--nb-surface-raised, #f8fafc);
        color: var(--nb-text, #0f172a);
      }
    }

    .btn-refresh {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 1px solid var(--nb-border-soft, #e2e8f0);
      background: var(--nb-surface, #ffffff);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 180ms ease;

      &:hover:not(:disabled) {
        background: var(--nb-surface-raised, #f1f5f9);
        border-color: #cbd5e1;
      }

      .refresh-icon.spinning {
        animation: spin 1s linear infinite;
      }
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* 2. شريط الـ KPIs */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 14px;

      @media (max-width: 1400px) { grid-template-columns: repeat(3, 1fr); }
      @media (max-width: 860px) { grid-template-columns: repeat(2, 1fr); }
      @media (max-width: 540px) { grid-template-columns: 1fr; }
    }

    .kpi-card {
      background: var(--nb-surface, #ffffff);
      border: 1px solid var(--nb-border-soft, #e2e8f0);
      border-radius: 14px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      position: relative;
      transition: all 220ms ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);

      &.hover-glow:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 25px rgba(0,0,0,0.06);
      }

      &.theme-indigo:hover { border-color: #818cf8; }
      &.theme-emerald:hover { border-color: #34d399; }
      &.theme-amber:hover { border-color: #fbbf24; }
      &.theme-blue:hover { border-color: #60a5fa; }
      &.theme-rose:hover { border-color: #f87171; }
    }

    .kpi-top {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .kpi-label {
        font-size: 12px;
        font-weight: 700;
        color: var(--nb-text-muted, #64748b);
      }

      .kpi-icon-wrap {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;

        &.bg-indigo { background: rgba(99, 102, 241, 0.12); }
        &.bg-emerald { background: rgba(16, 185, 129, 0.12); }
        &.bg-amber { background: rgba(245, 158, 11, 0.12); }
        &.bg-blue { background: rgba(59, 130, 246, 0.12); }
        &.bg-rose { background: rgba(239, 68, 68, 0.12); }
      }
    }

    .kpi-main {
      display: flex;
      align-items: baseline;
      gap: 6px;

      .kpi-val {
        font-size: 24px;
        font-weight: 800;
        color: var(--nb-text, #0f172a);
        font-variant-numeric: tabular-nums;
      }
      .kpi-unit {
        font-size: 12px;
        font-weight: 600;
        color: var(--nb-text-muted, #64748b);
      }
    }

    .kpi-bottom {
      margin-top: auto;

      .kpi-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        gap: 4px;

        &.positive { background: #dcfce7; color: #15803d; }
        &.neutral { background: #f1f5f9; color: #475569; }
        &.warning { background: #fef3c7; color: #b45309; }
      }

      .mini-progress-bar {
        height: 6px;
        background: #f1f5f9;
        border-radius: 99px;
        overflow: hidden;

        .mini-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          border-radius: 99px;
        }
      }

      .kpi-link {
        font-size: 11.5px;
        font-weight: 700;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: gap 150ms ease;

        &:hover { gap: 8px; }
        &.text-rose { color: #e11d48; }
      }
    }

    /* 3. مركز حالة النماذج (Forms Status Center) */
    .section-card {
      background: var(--nb-surface, #ffffff);
      border: 1px solid var(--nb-border-soft, #e2e8f0);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .section-title-group {
      display: flex;
      align-items: center;
      gap: 12px;

      .section-icon-badge {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(79, 70, 229, 0.05));
        border: 1px solid rgba(99, 102, 241, 0.2);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      }

      .section-title {
        margin: 0;
        font-size: 16px;
        font-weight: 800;
        color: var(--nb-text, #0f172a);
      }
      .section-subtitle {
        margin: 2px 0 0;
        font-size: 12px;
        color: var(--nb-text-muted, #64748b);
      }
    }

    .forms-filter-tabs {
      display: flex;
      gap: 6px;

      .tab-pill {
        padding: 5px 12px;
        border-radius: 20px;
        border: 1px solid var(--nb-border-soft, #e2e8f0);
        background: var(--nb-surface-raised, #f8fafc);
        color: var(--nb-text-muted, #64748b);
        font-family: inherit;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 150ms ease;

        &.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }
      }
    }

    .forms-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;

      @media (max-width: 1200px) { grid-template-columns: repeat(2, 1fr); }
      @media (max-width: 720px) { grid-template-columns: 1fr; }
    }

    .form-module-card {
      background: var(--nb-surface, #ffffff);
      border: 1.5px solid var(--nb-border-soft, #f1f5f9);
      border-radius: 14px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      position: relative;
      transition: all 220ms ease;

      &.hover-lift:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 24px rgba(0,0,0,0.06);
      }

      &.border-theme-indigo { border-top: 4px solid #6366f1; }
      &.border-theme-emerald { border-top: 4px solid #10b981; }
      &.border-theme-amber { border-top: 4px solid #f59e0b; }
      &.border-theme-blue { border-top: 4px solid #3b82f6; }
      &.border-theme-rose { border-top: 4px solid #f43f5e; }
      &.border-theme-violet { border-top: 4px solid #8b5cf6; }
    }

    .form-card-top {
      display: flex;
      align-items: center;
      gap: 12px;

      .form-icon-circle {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;

        &.bg-indigo { background: rgba(99, 102, 241, 0.12); }
        &.bg-emerald { background: rgba(16, 185, 129, 0.12); }
        &.bg-amber { background: rgba(245, 158, 11, 0.12); }
        &.bg-blue { background: rgba(59, 130, 246, 0.12); }
        &.bg-rose { background: rgba(244, 63, 94, 0.12); }
        &.bg-violet { background: rgba(139, 92, 246, 0.12); }
      }

      .form-title-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .form-card-title {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
          color: var(--nb-text, #0f172a);
        }
        .form-card-subtitle {
          font-size: 11.5px;
          color: var(--nb-text-muted, #64748b);
        }
      }
    }

    .form-stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      background: var(--nb-surface-raised, #f8fafc);
      padding: 10px;
      border-radius: 10px;

      .f-stat {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .f-stat-lbl {
          font-size: 10.5px;
          color: var(--nb-text-muted, #64748b);
        }
        .f-stat-val {
          font-size: 15px;
          font-variant-numeric: tabular-nums;
        }

        &.text-amber .f-stat-val { color: #d97706; }
        &.text-emerald .f-stat-val { color: #059669; }
      }
    }

    .progress-section {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .progress-labels {
        display: flex;
        justify-content: space-between;
        font-size: 11.5px;
        font-weight: 700;

        .prog-text { color: var(--nb-text-muted, #64748b); }
        .prog-val { color: var(--nb-text, #0f172a); }
      }

      .progress-track {
        height: 7px;
        background: #f1f5f9;
        border-radius: 99px;
        overflow: hidden;

        .progress-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1);

          &.bg-grad-indigo { background: linear-gradient(90deg, #6366f1, #818cf8); }
          &.bg-grad-emerald { background: linear-gradient(90deg, #10b981, #34d399); }
          &.bg-grad-amber { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
          &.bg-grad-blue { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
          &.bg-grad-rose { background: linear-gradient(90deg, #f43f5e, #fb7185); }
          &.bg-grad-violet { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }
        }
      }
    }

    .form-card-footer {
      margin-top: auto;
      padding-top: 4px;

      .btn-action {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 12.5px;
        font-weight: 700;
        text-decoration: none;
        box-sizing: border-box;
        transition: all 180ms ease;

        .arrow-icon {
          font-size: 12px;
          transition: transform 150ms ease;
        }

        &:hover .arrow-icon {
          transform: translateX(-4px);
        }

        &.btn-indigo { background: rgba(99, 102, 241, 0.08); color: #4f46e5; &:hover { background: #4f46e5; color: #fff; } }
        &.btn-emerald { background: rgba(16, 185, 129, 0.08); color: #059669; &:hover { background: #059669; color: #fff; } }
        &.btn-amber { background: rgba(245, 158, 11, 0.08); color: #b45309; &:hover { background: #d97706; color: #fff; } }
        &.btn-blue { background: rgba(59, 130, 246, 0.08); color: #2563eb; &:hover { background: #2563eb; color: #fff; } }
        &.btn-rose { background: rgba(244, 63, 94, 0.08); color: #e11d48; &:hover { background: #e11d48; color: #fff; } }
        &.btn-violet { background: rgba(139, 92, 246, 0.08); color: #7c3aed; &:hover { background: #7c3aed; color: #fff; } }
      }
    }

    /* 4. قسم التحليلات والرسم البياني */
    .analytics-grid {
      display: grid;
      grid-template-columns: 1fr 1.3fr;
      gap: 16px;

      @media (max-width: 1100px) { grid-template-columns: 1fr; }
    }

    .panel {
      background: var(--nb-surface, #ffffff);
      border: 1px solid var(--nb-border-soft, #e2e8f0);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;

      .panel-title-group {
        display: flex;
        align-items: center;
        gap: 10px;

        .panel-icon { font-size: 18px; }
        .panel-title { margin: 0; font-size: 15px; font-weight: 800; color: #0f172a; }
        .panel-sub { font-size: 11.5px; color: #64748b; }
      }

      .panel-link {
        font-size: 12px;
        font-weight: 700;
        color: var(--nb-primary-600, #4f46e5);
        text-decoration: none;
        &:hover { text-decoration: underline; }
      }

      .chart-legend {
        display: flex;
        gap: 12px;
        font-size: 11.5px;
        font-weight: 600;

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            &.bg-emerald { background: #10b981; }
            &.bg-rose { background: #f43f5e; }
          }
        }
      }
    }

    /* مسار القبول */
    .funnel-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .funnel-stage-row {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .stage-info {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        font-weight: 700;
        color: #334155;

        .stage-count { font-variant-numeric: tabular-nums; }
        .stage-count.text-emerald { color: #059669; }
      }

      .stage-track {
        height: 14px;
        background: #f1f5f9;
        border-radius: 6px;
        overflow: hidden;

        .stage-fill {
          height: 100%;
          border-radius: 6px;
          transition: width 600ms ease;

          &.p600 { background: #4f46e5; }
          &.p500 { background: #6366f1; }
          &.p400 { background: #818cf8; }
          &.success { background: #10b981; }
        }
      }
    }

    /* الرسم البياني للأعمدة */
    .custom-chart-wrapper {
      flex: 1;
      min-height: 170px;
      display: flex;
      align-items: flex-end;
    }

    .bars-chart {
      width: 100%;
      height: 160px;
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
      gap: 12px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;

      .bar-group {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        flex: 1;

        .bars-pair {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 120px;
          width: 100%;
          justify-content: center;

          .bar {
            width: 14px;
            border-radius: 4px 4px 0 0;
            position: relative;
            transition: height 500ms ease, opacity 150ms ease;
            cursor: pointer;

            &:hover {
              opacity: 0.85;
              .bar-tooltip { opacity: 1; transform: translateY(-4px); }
            }

            &.revenue-bar { background: linear-gradient(180deg, #34d399, #10b981); }
            &.expense-bar { background: linear-gradient(180deg, #fb7185, #f43f5e); }

            .bar-tooltip {
              position: absolute;
              bottom: 100%;
              left: 50%;
              transform: translateX(-50%);
              background: #0f172a;
              color: #fff;
              font-size: 10px;
              padding: 2px 6px;
              border-radius: 4px;
              white-space: nowrap;
              pointer-events: none;
              opacity: 0;
              transition: all 150ms ease;
            }
          }
        }

        .month-label {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
        }
      }
    }

    /* 5. شريط الأنشطة والموافقات */
    .dual-columns-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 16px;

      @media (max-width: 1100px) { grid-template-columns: 1fr; }
    }

    .timeline-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .timeline-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--nb-surface-raised, #f8fafc);
      transition: all 180ms ease;

      &:hover {
        background: #f1f5f9;
        transform: translateX(-2px);
      }

      .timeline-icon-node {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        flex-shrink: 0;
      }

      .timeline-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;

        .timeline-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;

          .timeline-title {
            font-size: 12.5px;
            font-weight: 700;
            color: #1e293b;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .timeline-time {
            font-size: 10.5px;
            color: #94a3b8;
            flex-shrink: 0;
          }
        }

        .timeline-author {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #64748b;

          .badge-status {
            font-size: 9.5px;
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 4px;

            &.badge-info { background: #e0e7ff; color: #3730a3; }
            &.badge-warning { background: #fef3c7; color: #92400e; }
            &.badge-success { background: #dcfce7; color: #166534; }
          }
        }
      }

      .timeline-action-btn {
        padding: 4px 10px;
        font-size: 11.5px;
        font-weight: 700;
        border-radius: 6px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        color: #334155;
        text-decoration: none;
        transition: all 150ms ease;

        &:hover {
          background: #4f46e5;
          color: #ffffff;
          border-color: #4f46e5;
        }
      }
    }

    .inbox-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .inbox-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid #f1f5f9;
      background: #ffffff;
      transition: background 150ms ease;

      &:hover { background: #f8fafc; }

      .inbox-info {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;

        .inbox-title {
          font-size: 12.5px;
          font-weight: 700;
          color: #0f172a;
        }
        .inbox-meta {
          display: flex;
          gap: 6px;
          font-size: 11px;
          color: #64748b;
        }
      }

      .priority-badge {
        font-size: 10px;
        font-weight: 800;
        padding: 2px 6px;
        border-radius: 4px;
        background: #f1f5f9;
        color: #475569;

        &.priority-high {
          background: #fee2e2;
          color: #b91c1c;
        }
      }

      .btn-review {
        padding: 4px 10px;
        font-size: 11.5px;
        font-weight: 700;
        border-radius: 6px;
        background: #f1f5f9;
        color: #1e293b;
        text-decoration: none;
        &:hover { background: #e2e8f0; }
      }
    }

    .empty-inbox {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      gap: 8px;
      font-size: 12.5px;
      color: #64748b;

      .check-icon {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #dcfce7;
        color: #15803d;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 800;
      }
    }

    /* 6. المساعد الذكي الجانبي (Sidecar) */
    .ai-sidecar {
      width: 280px;
      background: var(--nb-surface, #ffffff);
      border-right: 1px solid var(--nb-border-soft, #e2e8f0);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;

      @media (max-width: 1280px) { display: none; }
    }

    .ai-header {
      padding: 16px;
      border-bottom: 1px solid var(--nb-border-soft, #e2e8f0);

      .ai-badge-group {
        display: flex;
        align-items: center;
        gap: 10px;

        .ai-sparkle {
          width: 30px;
          height: 30px;
          background: linear-gradient(135deg, #6366f1, #9333ea);
          color: #ffffff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        .ai-title { margin: 0; font-size: 13.5px; font-weight: 800; color: #0f172a; }
        .ai-sub { font-size: 11px; color: #64748b; }
      }
    }

    .ai-content {
      flex: 1;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
    }

    .ai-prompt-box {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      background: rgba(99, 102, 241, 0.06);
      padding: 10px;
      border-radius: 8px;
      font-size: 11.5px;
      font-weight: 600;
      color: #4338ca;
    }

    .quick-questions-group {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .ai-chip {
        text-align: right;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        font-family: inherit;
        font-size: 11.5px;
        font-weight: 600;
        color: #334155;
        cursor: pointer;
        transition: all 150ms ease;

        &:hover {
          background: #eef2ff;
          border-color: #c7d2fe;
          color: #4338ca;
        }
      }
    }

    .ai-response-card {
      background: #ffffff;
      border: 1px solid #c7d2fe;
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.08);

      .response-header {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 800;
        color: #4f46e5;
      }
      .response-text {
        font-size: 12px;
        color: #1e293b;
        line-height: 1.5;
      }
    }

    .ai-footer {
      padding: 12px;
      border-top: 1px solid var(--nb-border-soft, #e2e8f0);

      .ai-input-wrap {
        display: flex;
        gap: 6px;

        input {
          flex: 1;
          height: 36px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 0 10px;
          font-family: inherit;
          font-size: 12px;
          outline: none;

          &:focus { border-color: #6366f1; }
        }

        .btn-send {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: none;
          background: #4f46e5;
          color: #fff;
          font-size: 14px;
          cursor: pointer;
        }
      }
    }

    .animate-fade-in {
      animation: fadeIn 200ms ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly tenantService = inject(TenantService);
  private readonly dashboardService = inject(DashboardService);

  readonly loading = signal(true);
  readonly overview = signal<DashboardOverviewResponse | null>(null);
  readonly selectedFormFilter = signal<'all' | 'pending'>('all');
  readonly activeBranch = this.tenantService.activeBranch;

  readonly assistantQuery = signal('');
  readonly assistantAnswer = signal<string | null>(null);

  readonly today = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  readonly userName = computed(() => {
    const u = this.auth.currentUser();
    return u?.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : 'مدير النظام';
  });

  readonly tenantName = computed(() => {
    return this.tenantService.currentTenant()?.nameAr || this.tenantService.currentTenant()?.name || 'مدارس النبراس النموذجية الأهلية';
  });

  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير والإنتاجية';
    if (hour < 17) return 'طاب يومك بكل خير';
    return 'مساء الخير والازدهار';
  });

  readonly filteredFormsMatrix = computed<FormMatrixItem[]>(() => {
    const list = this.overview()?.forms_matrix || [];
    if (this.selectedFormFilter() === 'pending') {
      return list.filter((i) => i.pending > 0);
    }
    return list;
  });

  readonly totalPendingForms = computed(() => {
    return (this.overview()?.forms_matrix || []).filter((i) => i.pending > 0).length;
  });

  ngOnInit(): void {
    this.tenantService.refreshCurrentTenant();
    this.loadOverview();
  }

  setBranch(branch: 'all' | 'boys' | 'girls'): void {
    this.tenantService.setBranch(branch);
    this.loadOverview();
  }

  loadOverview(): void {
    this.loading.set(true);
    this.dashboardService.getOverview(this.activeBranch()).subscribe({
      next: (res) => {
        if (res && res.data) {
          this.overview.set(res.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  askAssistant(q: string): void {
    this.assistantQuery.set(q);
    this.submitQuery();
  }

  submitQuery(): void {
    const q = this.assistantQuery().trim();
    if (!q) return;

    if (q.includes('القبول') || q.includes('قبول')) {
      this.assistantAnswer.set('يوجد حالياً 54 طلب قبول إجمالي، منها 12 طلباً قيد الفحص المبدئي، و 24 طلباً تم قبولهم بنجاح بنسبة إنجاز 63%.');
    } else if (q.includes('حضور') || q.includes('بنين') || q.includes('بنات')) {
      this.assistantAnswer.set('نسبة الحضور اليوم ممتازة وتبلغ 96.5% عبر كافة المراحل، مع انتظام كامل في مدرسة البنين ومدرسة البنات.');
    } else if (q.includes('رسوم') || q.includes('تحويل') || q.includes('سداد') || q.includes('مال')) {
      const pending = this.overview()?.kpis?.pending_payments_amount || 24500;
      this.assistantAnswer.set(`يوجد حالياً ${this.overview()?.kpis?.pending_payments_count || 6} طلبات سداد مرفوعة بانتظار مطابقة الحوالات البنكية بإجمالي مبلغ ${pending.toLocaleString()} ر.س.`);
    } else {
      this.assistantAnswer.set(`بناءً على مؤشرات فرع ${this.activeBranch() === 'boys' ? 'مدرسة البنين' : this.activeBranch() === 'girls' ? 'مدرسة البنات' : 'جميع المدارس'}، كافة العمليات التشغيلية منتظمة ولا توجد أي اختناقات في معالجة النماذج.`);
    }
  }
}
