import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

interface PublicPlan {
  id: string;
  code: string;
  name_ar: string;
  description?: string;
  billing_cycle_display?: string;
  price: number;
  currency: string;
  max_students: number;
  max_staff: number;
  max_branches: number;
  modules: string[];
}

type PreviewTab = 'dashboard' | 'academics' | 'finance' | 'attendance';

/**
 * الموقع الرئيسي التعريفي والتسويقي لمنصة نبراس OS لإدارة المدارس والتعليم في السودان.
 * يوفر تجربة غنية لاستعراض مزايا المنظومة، وربط بنكك وفوري، ورصد الحضور، ومعالج تسجيل المدارس الجديدة.
 */
@Component({
  selector: 'app-nebras-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="site-container" dir="rtl">
      <!-- الشريط العلوي الفاخر -->
      <header class="top-nav">
        <div class="site-wrap nav-inner">
          <div class="brand-group" (click)="scrollTo('hero')">
            <div class="brand-logo-badge">
              <span>📚</span>
            </div>
            <div class="brand-text">
              <span class="brand-title">نِبراس <span class="accent-os">OS</span></span>
              <span class="brand-tag">منظومة إدارة المدارس الذكية</span>
            </div>
          </div>

          <nav class="nav-links">
            <a (click)="scrollTo('showcase')">استعراض النظام</a>
            <a (click)="scrollTo('sudan-pillars')">الهوية والواقع السوداني</a>
            <a (click)="scrollTo('modules')">الوحدات الـ 16</a>
            <a (click)="scrollTo('pricing')">الباقات</a>
            <a (click)="scrollTo('contact')">تواصل معنا</a>
          </nav>

          <div class="nav-actions">
            <button type="button" class="btn-login" (click)="goToLogin()">
              <span class="icon">🔑</span>
              <span>دخول المدرسة</span>
            </button>
            <button type="button" class="btn-signup pulse-cta" (click)="openSignup()">
              <span>سجل مدرستك (أسبوع مجاناً)</span>
              <span class="arrow-ico">←</span>
            </button>
          </div>
        </div>
      </header>

      <!-- قسم البطل (Hero Section) -->
      <section id="hero" class="hero-section">
        <div class="hero-bg-glow"></div>
        <div class="site-wrap hero-grid">
          <div class="hero-content">
            <div class="hero-badge animate-fade">
              <span class="badge-dot"></span>
              <span>المنظومة السحابية المدرسية الأولى المصممة للسودان 🇸🇩</span>
            </div>

            <h1 class="hero-heading">
              أدِر مدرستك بذكاء متكامل..<br />
              <span class="gradient-text">من القبول حتى إصدار الشهادات</span>
            </h1>

            <p class="hero-desc">
              نبراس هو نظام ERP مدرسي سحابي شامل مصمم خصيصاً للبيئة المدرسية في السودان. يدعم العمل في ظل انقطاع الشبكة، ويوفر التكامل مع تطبيق بنكك وفوري، ورصد الحضور، والامتحانات، والرسوم بالجنيه السوداني (ج.س) بعزل تام وأمان عالٍ.
            </p>

            <div class="hero-ctas">
              <button type="button" class="btn-hero-primary" (click)="openSignup()">
                <span>ابدأ أسبوعك التجريبي مجاناً</span>
                <span class="arrow-ico">←</span>
              </button>
              <button type="button" class="btn-hero-secondary" (click)="scrollTo('showcase')">
                <span>استكشف لوحة التحكم المباشرة</span>
                <span class="arrow-down">↓</span>
              </button>
            </div>

            <!-- إحصائيات الثقة السريعة -->
            <div class="trust-metrics">
              <div class="metric-item">
                <span class="metric-num">١٦+</span>
                <span class="metric-label">موديول إداري وأكاديمي</span>
              </div>
              <div class="metric-divider"></div>
              <div class="metric-item">
                <span class="metric-num">١٠٠٪</span>
                <span class="metric-label">عزل واستقلالية للمدارس</span>
              </div>
              <div class="metric-divider"></div>
              <div class="metric-item">
                <span class="metric-num">ج.س</span>
                <span class="metric-label">دعم بنكك وفوري والعملة</span>
              </div>
            </div>
          </div>

          <!-- بطاقة العرض السريع بالبطل -->
          <div class="hero-visual">
            <div class="preview-frame glass-panel">
              <div class="frame-bar">
                <div class="dots"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div>
                <div class="address-bar">alsafwa.nebras.sd/dashboard</div>
                <div class="live-pill">⚡ متصل بالنظام</div>
              </div>

              <div class="hero-preview-body">
                <div class="preview-mini-header">
                  <div class="school-tag">
                    <span class="school-icon">🏫</span>
                    <div>
                      <div class="school-name">مدارس الصفوة النموذجية الأهلية</div>
                      <div class="school-meta">الفرع الرئيسي • العام الدراسي 2026/2027</div>
                    </div>
                  </div>
                  <span class="currency-tag">العملة: جنيه سوداني (ج.س)</span>
                </div>

                <div class="kpi-cards-grid">
                  <div class="kpi-box box-blue">
                    <span class="kpi-title">إجمالي الطلاب</span>
                    <span class="kpi-val">٨٤٠ طالب</span>
                    <span class="kpi-sub">نسبة حضور اليوم ٩٦.٤٪</span>
                  </div>
                  <div class="kpi-box box-green">
                    <span class="kpi-title">المتحصلات النقدية</span>
                    <span class="kpi-val">١٤,٢٥٠,٠٠٠ ج.س</span>
                    <span class="kpi-sub">عبر تطبيق بنكك وفوري</span>
                  </div>
                  <div class="kpi-box box-purple">
                    <span class="kpi-title">المعلمون وهيئة التدريس</span>
                    <span class="kpi-val">٤٨ معلماً</span>
                    <span class="kpi-sub">مكتمل التحضير والجدول</span>
                  </div>
                </div>

                <div class="preview-action-row">
                  <div class="status-indicator">
                    <span class="pulse-indicator"></span>
                    <span>جاهزية إصدار شهادات نهاية الفترة والتقارير بنقرة واحدة</span>
                  </div>
                  <button type="button" class="btn-micro-test" (click)="openSignup()">جرّب مدرستك الآن</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- الاستعراض التفاعلي لشاشات النظام (Interactive Showcase) -->
      <section id="showcase" class="section showcase-section">
        <div class="site-wrap">
          <div class="section-title-wrap">
            <span class="sec-eyebrow">واجهات مستخدم رائدة ومتقنة</span>
            <h2 class="sec-title">تجربة قيادية استثنائية لإدارة المدرسة</h2>
            <p class="sec-desc">
              استكشف بنفسك كيف ينسق نبراس العمليات الإدارية والمالية والأكاديمية بدقة وسلاسة متناهية.
            </p>
          </div>

          <!-- مبدل التبويبات التفاعلية -->
          <div class="showcase-tabs">
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'dashboard'"
              (click)="activeTab.set('dashboard')"
            >
              📊 لوحة القيادة التنفيذية
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'academics'"
              (click)="activeTab.set('academics')"
            >
              🎓 كشوفات الطلاب والشهادات
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'finance'"
              (click)="activeTab.set('finance')"
            >
              💰 الرسوم وبنكك وفوري
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'attendance'"
              (click)="activeTab.set('attendance')"
            >
              ⏱️ رصد الحضور الذكي
            </button>
          </div>

          <!-- محتوى التبويب النشط -->
          <div class="showcase-display glass-card">
            @if (activeTab() === 'dashboard') {
              <div class="tab-content animate-fade">
                <div class="content-header">
                  <div class="content-titles">
                    <h3>الداشبورد التنفيذي والتحليلات اللحظية</h3>
                    <p>رؤية شاملة تغطي كل التفاصيل: الطلاب، الفصول، الحضور اللحظي، التدفقات النقدية والقبول.</p>
                  </div>
                  <span class="feature-chip">تحديث تلقائي لحظي</span>
                </div>
                <div class="mock-screen">
                  <div class="mock-grid-3">
                    <div class="mock-card highlight-border">
                      <div class="card-head-sm">👥 توزيع الطلاب حسب المراحل</div>
                      <div class="mock-row"><span>المرحلة الابتدائية:</span> <b>٣٨٠ طالباً</b></div>
                      <div class="mock-row"><span>المرحلة المتوسطة:</span> <b>٢٦٠ طالباً</b></div>
                      <div class="mock-row"><span>المرحلة الثانوية:</span> <b>٢٠٠ طالب</b></div>
                      <div class="mock-bar"><div class="bar-fill" style="width: 85%"></div></div>
                    </div>
                    <div class="mock-card highlight-border">
                      <div class="card-head-sm">💳 الرسوم والمطالبات المدرسية</div>
                      <div class="mock-row"><span>المحصل فعلياً:</span> <b class="text-green">١٨,٥٠٠,٠٠٠ ج.س</b></div>
                      <div class="mock-row"><span>الأقساط المستحقة:</span> <b class="text-amber">٣,٢٠٠,٠٠٠ ج.س</b></div>
                      <div class="mock-row"><span>إشعارات بنكك المعلقة:</span> <b>٠ (تم الربط)</b></div>
                      <div class="mock-bar"><div class="bar-fill green" style="width: 90%"></div></div>
                    </div>
                    <div class="mock-card highlight-border">
                      <div class="card-head-sm">🔔 سير الموافقات اليومية</div>
                      <div class="mock-row"><span>طلبات قبول جديدة:</span> <b>١٢ طلباً</b></div>
                      <div class="mock-row"><span>إجازات معلمين:</span> <b>٢ معتمد</b></div>
                      <div class="mock-row"><span>مشتريات معتمدة:</span> <b>١ مكتمل</b></div>
                      <div class="mock-bar"><div class="bar-fill blue" style="width: 100%"></div></div>
                    </div>
                  </div>
                </div>
              </div>
            }

            @if (activeTab() === 'academics') {
              <div class="tab-content animate-fade">
                <div class="content-header">
                  <div class="content-titles">
                    <h3>إدارة الطلاب، الفصول، ورصد الامتحانات</h3>
                    <p>تسلسل رقمي معزول لكل طالب، كشوفات درجات متوافقة مع المناهج السودانية، وطباعة شهادات فاخرة.</p>
                  </div>
                  <span class="feature-chip">تصدير PDF و Excel معتمد</span>
                </div>
                <div class="mock-screen">
                  <table class="mock-table">
                    <thead>
                      <tr>
                        <th>رقم الطالب</th>
                        <th>اسم الطالب الرباعي</th>
                        <th>المرحلة والصف</th>
                        <th>الفصل / الشعبة</th>
                        <th>المجموع والتقدير</th>
                        <th>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="mono-code">ALS-2026-0012</td>
                        <td><b>عثمان دفع الله الفاتح</b></td>
                        <td>الصف الثالث المتوسط</td>
                        <td>شعبة (أ) - الفاروق</td>
                        <td><span class="badge-grade">٩٦.٥٪ (ممتاز)</span></td>
                        <td><span class="badge-status ok">منتظم ومسدد</span></td>
                      </tr>
                      <tr>
                        <td class="mono-code">ALS-2026-0013</td>
                        <td><b>إخلاص ميرغني بابكر</b></td>
                        <td>الصف الثاني الثانوي</td>
                        <td>شعبة (ب) - الخنساء</td>
                        <td><span class="badge-grade">٩٤.٠٪ (ممتاز)</span></td>
                        <td><span class="badge-status ok">منتظم ومسدد</span></td>
                      </tr>
                      <tr>
                        <td class="mono-code">ALS-2026-0014</td>
                        <td><b>نزار المجذوب إبراهيم</b></td>
                        <td>الصف الأول الابتدائي</td>
                        <td>شعبة (ج) - البراعم</td>
                        <td><span class="badge-grade">٩١.٠٪ (جيد جداً)</span></td>
                        <td><span class="badge-status ok">منتظم</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            }

            @if (activeTab() === 'finance') {
              <div class="tab-content animate-fade">
                <div class="content-header">
                  <div class="content-titles">
                    <h3>المالية والرسوم بالجنيه السوداني وتكامل بنكك وفوري</h3>
                    <p>إصدار الفواتير الآلية، معالجة الأقساط، ومطابقة إشعارات الدفع والتحويلات البنكية بدقة.</p>
                  </div>
                  <span class="feature-chip">عزل فواتير لكل مدرسة</span>
                </div>
                <div class="mock-screen">
                  <div class="mock-finance-grid">
                    <div class="payment-source-box">
                      <div class="bank-pill">📱 تطبيق بنكك — بنك الخرطوم</div>
                      <div class="bank-val">٩,٨٠٠,٠٠٠ ج.س</div>
                      <div class="bank-count">٧٤ إشعار دفع مؤكد آلياً</div>
                    </div>
                    <div class="payment-source-box">
                      <div class="bank-pill">⚡ تطبيق فوري — بنك فيصل الإسلامي</div>
                      <div class="bank-val">٣,٤٥٠,٠٠٠ ج.س</div>
                      <div class="bank-count">٢٨ إشعار دفع مؤكد</div>
                    </div>
                    <div class="payment-source-box">
                      <div class="bank-pill">🏢 سداد خزينة المدرسة والتحصيل المباشر</div>
                      <div class="bank-val">١,٠٠٠,٠٠٠ ج.س</div>
                      <div class="bank-count">سندات قبض برقم تسلسلي معزول</div>
                    </div>
                  </div>
                </div>
              </div>
            }

            @if (activeTab() === 'attendance') {
              <div class="tab-content animate-fade">
                <div class="content-header">
                  <div class="content-titles">
                    <h3>التحضير السريع للمعلم وتنبيهات أولياء الأمور</h3>
                    <p>يقوم المعلم بتحضير الفصل في ثوانٍ معدودة، مع إرسال إشعارات فورية بالغياب لولي الأمر.</p>
                  </div>
                  <span class="feature-chip">دعم الباركود والشبكة الضعيفة</span>
                </div>
                <div class="mock-screen">
                  <div class="mock-attendance-cards">
                    <div class="att-card present">
                      <div class="att-avatar">👨‍🎓</div>
                      <div class="att-info"><b>مزمل الكباشي</b><span>حاضر (07:45 ص)</span></div>
                      <span class="att-status">✓ حاضر</span>
                    </div>
                    <div class="att-card present">
                      <div class="att-avatar">👩‍🎓</div>
                      <div class="att-info"><b>فاطمة البدوي</b><span>حاضر (07:50 ص)</span></div>
                      <span class="att-status">✓ حاضر</span>
                    </div>
                    <div class="att-card absent">
                      <div class="att-avatar">👨‍🎓</div>
                      <div class="att-info"><b>التاج إبراهيم</b><span>غائب — تم إشعار ولي الأمر</span></div>
                      <span class="att-status bad">✕ غائب</span>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ركائز الهوية والواقع السوداني (Sudanese Pillars) -->
      <section id="sudan-pillars" class="section sudan-section">
        <div class="site-wrap">
          <div class="section-title-wrap">
            <span class="sec-eyebrow">مصمم خصيصاً للبيئة السودانية 🇸🇩</span>
            <h2 class="sec-title">لماذا نبراس هو الحل الأمثل للمدارس في السودان؟</h2>
            <p class="sec-desc">
              أنظمة الـ ERP المستوردة تفتقر لفهم تعقيدات الاتصال، والمناهج، والبنية المالية المحلية. نبراس بُني من الأساس ليعمل بكفاءة مطلقة في هذا الواقع.
            </p>
          </div>

          <div class="pillars-grid">
            <div class="pillar-card">
              <div class="pillar-icon">⚡</div>
              <h3>العمل دون انقطاع (Offline-First)</h3>
              <p>
                لا تتوقف العمليات المدرسية عند انقطاع الإنترنت أو التيار الكهربائي. يتم حفظ التحضير والدرجات والبيانات محلياً وتتزامن تلقائياً فور عودة الاتصال.
              </p>
            </div>

            <div class="pillar-card">
              <div class="pillar-icon">🇸🇩</div>
              <h3>المناهج والتقويم الدراسي السوداني</h3>
              <p>
                دعم كامل لنظام المراحل (ابتدائي، متوسط، ثانوي)، والمقررات الوطنية، وحساب المعدلات، وإصدار الشهادات الرسمية المعتمدة لوزارة التربية والتعليم.
              </p>
            </div>

            <div class="pillar-card">
              <div class="pillar-icon">💳</div>
              <h3>تكامل مع بنكك وفوري والجنيه السوداني</h3>
              <p>
                جميع الحسابات، الرسوم، الأقساط، والرواتب بالجنيه السوداني (ج.س) مع إمكانية إرفاق ومطابقة إشعارات التحويل البنكي الفوري بنقرة زر.
              </p>
            </div>

            <div class="pillar-card">
              <div class="pillar-icon">🔒</div>
              <h3>عزل تام واستقلالية كاملة لكل مدرسة</h3>
              <p>
                نطاق خاص بمدرستك (مثل <span class="mono-badge">school.nebras.sd</span>)، مع فصل صارم لقواعد البيانات وأرقام الطلاب والفواتير لضمان الخصوصية التامة.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- الوحدات الـ 16 الشاملة للنظام (16 Core Modules) -->
      <section id="modules" class="section modules-section">
        <div class="site-wrap">
          <div class="section-title-wrap">
            <span class="sec-eyebrow">منظومة شاملة تلبي كل الاحتياجات</span>
            <h2 class="sec-title">١٦ وحدة تشغيلية في منصة موحدة</h2>
            <p class="sec-desc">وداعاً للبرامج المتفرقة وملفات الإكسل المعقدة — جميع أدوار المدرسة تجتمع هنا.</p>
          </div>

          <div class="modules-grid">
            @for (m of modulesList; track m.title) {
              <div class="module-item">
                <span class="module-icon">{{ m.icon }}</span>
                <div class="module-body">
                  <h4>{{ m.title }}</h4>
                  <p>{{ m.desc }}</p>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- خطط وباقات الاشتراك (Pricing Plans) -->
      <section id="pricing" class="section pricing-section">
        <div class="site-wrap">
          <div class="section-title-wrap">
            <span class="sec-eyebrow">شفافية كاملة تناسب مدرستك</span>
            <h2 class="sec-title">باقات مرنة بالجنيه السوداني</h2>
            <p class="sec-desc">
              استمتع بفترة تجربة مجانية لمدة أسبوع (٧ أيام) تشمل كافة الميزات لتتأكد من ملاءمة النظام لمدرستك.
            </p>
          </div>

          @if (loadingPlans()) {
            <div class="loading-box">جارٍ جلب الباقات المحدثة…</div>
          } @else if (plans().length === 0) {
            <!-- باقات افتراضية إذا لم يتم إعداد باقات ديناميكية بعد -->
            <div class="pricing-cards-grid">
              <div class="plan-card">
                <span class="plan-type">المدارس الناشئة</span>
                <h3 class="plan-name">باقة الانطلاق</h3>
                <div class="plan-cost">
                  <span class="amount">٧٥٠,٠٠٠</span>
                  <span class="currency">ج.س / سنوياً</span>
                </div>
                <p class="plan-target">مثالية للمدارس التأسيسية ومرحلة التعليم الأساسي حتى ٢٥٠ طالباً.</p>
                <ul class="plan-features">
                  <li>حتى ٢٥٠ طالباً و ٢٠ معلماً</li>
                  <li>فرع مدرسي واحد</li>
                  <li>موديول القبول والتسجيل</li>
                  <li>الدرجات والشهادات التلقائية</li>
                  <li>دعم فني وتدريب عبر الهاتف</li>
                </ul>
                <button type="button" class="btn-plan ghost" (click)="openSignup()">اطلب أسبوع تجريبي مجاناً</button>
              </div>

              <div class="plan-card featured">
                <div class="popular-tag">الأكثر طلباً واختياراً ⭐</div>
                <span class="plan-type">المدارس النموذجية</span>
                <h3 class="plan-name">باقة التميز والنمو</h3>
                <div class="plan-cost">
                  <span class="amount">١,٤٥٠,٠٠٠</span>
                  <span class="currency">ج.س / سنوياً</span>
                </div>
                <p class="plan-target">شاملة لكافة المراحل التعليمية مع بوابة ولي الأمر والربط البنكي.</p>
                <ul class="plan-features">
                  <li>حتى ٧٥٠ طالباً و ٥٠ معلماً</li>
                  <li>فرعان (بنين / بنات)</li>
                  <li>تكامل إشعارات بنكك وفوري</li>
                  <li>بوابة ولي الأمر التفاعلية</li>
                  <li>رصد الحضور الذكي والغياب</li>
                  <li>مسيرات الرواتب والشؤون المالية</li>
                </ul>
                <button type="button" class="btn-plan primary" (click)="openSignup()">ابدأ تجربتك المجانية (أسبوع)</button>
              </div>

              <div class="plan-card">
                <span class="plan-type">المجمعات التعليمية الكبرى</span>
                <h3 class="plan-name">باقة الريادة والصروح</h3>
                <div class="plan-cost">
                  <span class="amount">٢,٩٠٠,٠٠٠</span>
                  <span class="currency">ج.س / سنوياً</span>
                </div>
                <p class="plan-target">للمجمعات متعددة الفروع والمراحل الدراسية والمدارس الثانوية الكبرى.</p>
                <ul class="plan-features">
                  <li>طلاب ومعلمون غير محدودين</li>
                  <li>فروع متعددة ولوحة قيادة موحدة</li>
                  <li>كافة الوحدات الـ ١٦ مفعلة</li>
                  <li>نطاق مخصص وهوية بصرية كاملة</li>
                  <li>مدير حساب ودعم فني مخصص ٢٤/٧</li>
                </ul>
                <button type="button" class="btn-plan ghost" (click)="openSignup()">اطلب التجربة المجانية</button>
              </div>
            </div>
          } @else {
            <div class="pricing-cards-grid">
              @for (p of plans(); track p.id; let i = $index) {
                <div class="plan-card" [class.featured]="i === 1">
                  @if (i === 1) { <div class="popular-tag">الأكثر شيوعاً ⭐</div> }
                  <span class="plan-type">باقة معتمدة</span>
                  <h3 class="plan-name">{{ p.name_ar }}</h3>
                  <div class="plan-cost">
                    <span class="amount">{{ p.price | number:'1.0-0' }}</span>
                    <span class="currency">{{ p.currency }} / سنوياً</span>
                  </div>
                  <p class="plan-target">{{ p.description || 'باقة متكاملة لإدارة منشأتك التعليمية.' }}</p>
                  <ul class="plan-features">
                    <li>حتى {{ p.max_students ? (p.max_students | number) : 'غير محدود' }} طالب</li>
                    <li>حتى {{ p.max_staff ? (p.max_staff | number) : 'غير محدود' }} موظف</li>
                    <li>{{ p.max_branches || 1 }} فرع مدرسي</li>
                    <li>فترة تجربة مجانية ٧ أيام</li>
                  </ul>
                  <button
                    type="button"
                    class="btn-plan"
                    [class.primary]="i === 1"
                    [class.ghost]="i !== 1"
                    (click)="openSignup(p.id)"
                  >
                    اطلب أسبوع تجريبي مجاناً
                  </button>
                </div>
              }
            </div>
          }
        </div>
      </section>

      <!-- تواصل ونداء أخير (Contact & Final CTA) -->
      <section id="contact" class="section cta-section">
        <div class="site-wrap cta-wrap glass-panel">
          <div class="cta-text">
            <h2>انضم الآن إلى صروح التعليم الرائدة في السودان</h2>
            <p>
              سجّل مدرستك اليوم، وسيقوم فريق نبراس بمراجعة طلبك وتفعيل أسبوع تجريبي مجاني فوري مع تهيئة بيانات مدرستك.
            </p>
          </div>
          <div class="cta-actions">
            <button type="button" class="btn-hero-primary" (click)="openSignup()">
              <span>سجل مدرستك الآن (أسبوع مجاناً)</span>
              <span class="arrow-ico">←</span>
            </button>
            <a href="mailto:info@nebras.sd" class="btn-contact-link">
              <span>✉️ تواصل عبر البريد: info&#64;nebras.sd</span>
            </a>
          </div>
        </div>
      </section>

      <!-- التذييل الرسمي (Footer) -->
      <footer class="site-footer">
        <div class="site-wrap footer-inner">
          <div class="footer-brand">
            <div class="footer-logo">📚 نِبراس OS</div>
            <p class="footer-copy">
              نظام الإدارة المدرسية السحابي الأول المصمم خصيصاً للبيئة التعليمية في السودان.
            </p>
          </div>
          <div class="footer-links-group">
            <a (click)="scrollTo('hero')">الرئيسية</a>
            <a (click)="scrollTo('showcase')">المزايا</a>
            <a (click)="scrollTo('pricing')">الأسعار</a>
            <a (click)="goToLogin()">تسجيل الدخول</a>
            <a (click)="openSignup()">طلب تجربة مجانية</a>
          </div>
        </div>
        <div class="footer-bottom">
          <div class="site-wrap">
            <span>© {{ currentYear }} منصة نبراس OS لإدارة المدارس — جمهورية السودان. جميع الحقوق محفوظة.</span>
          </div>
        </div>
      </footer>

      <!-- مودال تسجيل مدرسة جديدة (طلب أسبوع تجريبي مجاناً) -->
      @if (showSignupModal()) {
        <div class="modal-backdrop animate-fade" (click)="closeSignupModal()">
          <div class="signup-modal-box" (click)="$event.stopPropagation()">
            <!-- حالة إتمام الإرسال بنجاح -->
            @if (signupSuccess()) {
              <div class="success-screen animate-fade">
                <div class="success-icon">🎉</div>
                <h3>تم استلام طلب انضمام مدرستك بنجاح!</h3>
                <p class="success-desc">
                  شكراً لثقتكم في منصة <b>نبراس OS</b>. تم تسجيل طلب مدرسة <b>«{{ form.school_name }}»</b> بنطاق <b>{{ form.subdomain }}.nebras.sd</b>.
                </p>
                <div class="trial-info-card">
                  <div class="tic-title">⏱️ فترة التجربة المجانية الممنوحة:</div>
                  <div class="tic-val">أسبوع كامل (٧ أيام) لجميع وحدات النظام</div>
                  <div class="tic-sub">يقوم فريق المطورين الآن بمراجعة بيانات الطلب وتفعيل المنظومة وإرسال بيانات الدخول إلى بريدكم: <b>{{ form.email }}</b>.</div>
                </div>
                <button type="button" class="btn-hero-primary w-full" (click)="closeSignupModal()">
                  <span>العودة للموقع الرئيسي</span>
                </button>
              </div>
            } @else {
              <!-- نموذج التسجيل الميسر -->
              <div class="modal-header-row">
                <div>
                  <h3 class="modal-title">تسجيل مدرسة جديدة — طلب أسبوع تجريبي مجاني</h3>
                  <p class="modal-sub">أدخل بيانات المدرسة ومسؤول النظام لبدء التجربة المجانية لمدة ٧ أيام بعد المراجعة.</p>
                </div>
                <button type="button" class="btn-modal-close" (click)="closeSignupModal()">✕</button>
              </div>

              <div class="form-body">
                <div class="form-row">
                  <label>
                    <span class="lbl-text">اسم المدرسة أو المجمع التعليمي <b class="req">*</b></span>
                    <input
                      type="text"
                      [(ngModel)]="form.school_name"
                      placeholder="مثال: مدارس الصفوة النموذجية الخاصة"
                      (blur)="suggestSubdomain()"
                    />
                  </label>
                </div>

                <div class="form-row">
                  <label>
                    <span class="lbl-text">النطاق الفرعي المطلوب (الرابط المخصص لمدرستك) <b class="req">*</b></span>
                    <div class="subdomain-input-wrap">
                      <input
                        type="text"
                        dir="ltr"
                        [(ngModel)]="form.subdomain"
                        (input)="onSubdomainInput()"
                        placeholder="alsafwa"
                      />
                      <span class="subdomain-suffix">.nebras.sd</span>
                    </div>
                    <!-- مؤشر التوفر التلقائي -->
                    @if (checkingSub()) {
                      <span class="hint-sub checking">⏳ جارٍ التحقق من توفر النطاق…</span>
                    } @else if (subAvailable() === true) {
                      <span class="hint-sub ok">✓ النطاق متاح وجاهز للحجز!</span>
                    } @else if (subAvailable() === false) {
                      <span class="hint-sub bad">✕ هذا النطاق محجوز أو غير صالح، يرجى اختيار اسم آخر.</span>
                    }
                  </label>
                </div>

                <div class="form-row grid-2">
                  <label>
                    <span class="lbl-text">الولاية في السودان <b class="req">*</b></span>
                    <select [(ngModel)]="form.city">
                      <option value="" disabled>اختر الولاية…</option>
                      @for (st of sudaneseStates; track st) {
                        <option [value]="st">{{ st }}</option>
                      }
                    </select>
                  </label>
                  <label>
                    <span class="lbl-text">اسم المدير أو المسؤول <b class="req">*</b></span>
                    <input type="text" [(ngModel)]="form.contact_name" placeholder="مثال: أ. الفاتح بابكر" />
                  </label>
                </div>

                <div class="form-row grid-2">
                  <label>
                    <span class="lbl-text">رقم الهاتف أو الواتساب <b class="req">*</b></span>
                    <input type="tel" dir="ltr" [(ngModel)]="form.phone" placeholder="0912345678" />
                  </label>
                  <label>
                    <span class="lbl-text">البريد الإلكتروني للإدارة <b class="req">*</b></span>
                    <input type="email" dir="ltr" [(ngModel)]="form.email" placeholder="admin@alsafwa.edu.sd" />
                  </label>
                </div>

                <div class="form-row">
                  <label>
                    <span class="lbl-text">الباقة المطلوبة للتجربة</span>
                    <select [(ngModel)]="form.plan">
                      <option value="">— تجربة مجانية لكافة الميزات (٧ أيام) —</option>
                      @for (p of plans(); track p.id) {
                        <option [value]="p.id">{{ p.name_ar }} — ({{ p.price | number }} {{ p.currency }})</option>
                      }
                    </select>
                  </label>
                </div>

                <div class="form-row">
                  <label>
                    <span class="lbl-text">ملاحظات إضافية (المراحل، عدد الفروع أو الطلاب المقدر)</span>
                    <input type="text" [(ngModel)]="form.note" placeholder="مثال: مدرسة ابتدائية ومتوسطة مشتركة تضم ٤٠٠ طالب" />
                  </label>
                </div>
              </div>

              <div class="modal-footer-row">
                <button type="button" class="btn-cancel" (click)="closeSignupModal()">إلغاء</button>
                <button
                  type="button"
                  class="btn-submit-signup"
                  [disabled]="submitting() || !isFormValid()"
                  (click)="submitSignupRequest()"
                >
                  @if (submitting()) {
                    <span>جارٍ إرسال الطلب…</span>
                  } @else {
                    <span>إرسال طلب التسجيل (أسبوع مجاناً) 🚀</span>
                  }
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      --nb-primary: #0284c7;
      --nb-primary-dark: #0369a1;
      --nb-navy: #0b192c;
      --nb-navy-light: #1e3e62;
      --nb-amber: #f59e0b;
      --nb-green: #10b981;
      --nb-bg: #f8fafc;
      --nb-surface: #ffffff;
      --nb-border: #e2e8f0;
      --nb-text: #0f172a;
      --nb-text-muted: #64748b;
      display: block;
      font-family: 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--nb-bg);
      color: var(--nb-text);
      line-height: 1.6;
    }

    .site-wrap {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }

    /* الشريط العلوي */
    .top-nav {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(11, 25, 44, 0.94);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .nav-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 72px;
      gap: 16px;
    }
    .brand-group {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    }
    .brand-logo-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0284c7, #2563eb);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      display: block;
      color: #fff;
    }
    .accent-os {
      color: var(--nb-amber);
      font-weight: 900;
    }
    .brand-tag {
      font-size: 11px;
      color: #94a3b8;
      display: block;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 22px;
    }
    .nav-links a {
      color: #cbd5e1;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: color 0.2s ease;
    }
    .nav-links a:hover {
      color: #38bdf8;
    }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-login {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 40px;
      padding: 0 16px;
      border-radius: 9px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.16);
      color: #fff;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-login:hover {
      background: rgba(255, 255, 255, 0.18);
    }
    .btn-signup {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 40px;
      padding: 0 18px;
      border-radius: 9px;
      background: linear-gradient(135deg, #0284c7, #0284c7);
      border: none;
      color: #fff;
      font-size: 13.5px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .btn-signup:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(2, 132, 199, 0.6);
    }

    /* البطل (Hero) */
    .hero-section {
      position: relative;
      background: radial-gradient(circle at 80% 20%, #1e3e62 0%, #0b192c 70%);
      color: #fff;
      padding: 70px 0 90px;
      overflow: hidden;
    }
    .hero-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 40px;
      align-items: center;
    }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(2, 132, 199, 0.18);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 6px 14px;
      border-radius: 99px;
      font-size: 13px;
      font-weight: 700;
      color: #7dd3fc;
      margin-bottom: 20px;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 10px #38bdf8;
    }
    .hero-heading {
      font-size: clamp(30px, 3.6vw, 44px);
      font-weight: 900;
      line-height: 1.25;
      margin: 0 0 18px;
    }
    .gradient-text {
      background: linear-gradient(135deg, #38bdf8, #f59e0b);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero-desc {
      font-size: 16px;
      color: #cbd5e1;
      line-height: 1.8;
      margin: 0 0 28px;
      max-width: 580px;
    }
    .hero-ctas {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      margin-bottom: 38px;
    }
    .btn-hero-primary {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      height: 48px;
      padding: 0 24px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: #fff;
      font-size: 15px;
      font-weight: 800;
      border: none;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(2, 132, 199, 0.45);
      transition: all 0.2s ease;
    }
    .btn-hero-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(2, 132, 199, 0.65);
    }
    .btn-hero-secondary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 48px;
      padding: 0 20px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      font-size: 14.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-hero-secondary:hover {
      background: rgba(255, 255, 255, 0.16);
    }

    .trust-metrics {
      display: flex;
      align-items: center;
      gap: 20px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .metric-item {
      display: flex;
      flex-direction: column;
    }
    .metric-num {
      font-size: 22px;
      font-weight: 900;
      color: var(--nb-amber);
    }
    .metric-label {
      font-size: 12px;
      color: #94a3b8;
    }
    .metric-divider {
      width: 1px;
      height: 32px;
      background: rgba(255, 255, 255, 0.15);
    }

    /* العرض البصري في البطل */
    .hero-visual {
      position: relative;
    }
    .glass-panel {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 20px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }
    .frame-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 38px;
      padding: 0 14px;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 11.5px;
    }
    .dots {
      display: flex;
      gap: 6px;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .dot.red { background: #ef4444; }
    .dot.yellow { background: #f59e0b; }
    .dot.green { background: #10b981; }
    .address-bar {
      color: #94a3b8;
      font-family: ui-monospace, monospace;
      direction: ltr;
    }
    .live-pill {
      color: #38bdf8;
      font-weight: 700;
      font-size: 11px;
    }

    .hero-preview-body {
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .preview-mini-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 12px;
    }
    .school-tag {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .school-icon {
      font-size: 24px;
    }
    .school-name {
      font-weight: 800;
      font-size: 14px;
      color: #fff;
    }
    .school-meta {
      font-size: 11.5px;
      color: #94a3b8;
    }
    .currency-tag {
      font-size: 11px;
      background: rgba(16, 185, 129, 0.16);
      color: #34d399;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 700;
    }

    .kpi-cards-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }
    .kpi-box {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .kpi-title {
      font-size: 11.5px;
      color: #94a3b8;
    }
    .kpi-val {
      font-size: 17px;
      font-weight: 800;
      color: #fff;
    }
    .kpi-sub {
      font-size: 11px;
      color: #38bdf8;
    }
    .preview-action-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 12px;
      color: #94a3b8;
    }
    .btn-micro-test {
      background: var(--nb-amber);
      color: #0b192c;
      font-weight: 800;
      font-size: 12px;
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
      cursor: pointer;
    }

    /* الأقسام العامة */
    .section {
      padding: 80px 0;
    }
    .section-title-wrap {
      text-align: center;
      max-width: 700px;
      margin: 0 auto 46px;
    }
    .sec-eyebrow {
      display: inline-block;
      font-size: 13px;
      font-weight: 800;
      color: var(--nb-primary);
      background: rgba(2, 132, 199, 0.1);
      padding: 4px 14px;
      border-radius: 99px;
      margin-bottom: 12px;
    }
    .sec-title {
      font-size: clamp(24px, 3vw, 36px);
      font-weight: 900;
      color: var(--nb-text);
      margin: 0 0 12px;
      line-height: 1.3;
    }
    .sec-desc {
      font-size: 15.5px;
      color: var(--nb-text-muted);
      margin: 0;
    }

    /* قسم الاستعراض التفاعلي */
    .showcase-tabs {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 24px;
    }
    .tab-btn {
      height: 44px;
      padding: 0 20px;
      border-radius: 11px;
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      color: var(--nb-text-muted);
      font-family: inherit;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .tab-btn.active {
      background: var(--nb-navy);
      color: #fff;
      border-color: var(--nb-navy);
      box-shadow: 0 6px 18px rgba(11, 25, 44, 0.25);
    }

    .glass-card {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: 20px;
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
      padding: 32px;
    }
    .content-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--nb-border);
    }
    .content-titles h3 {
      margin: 0 0 6px;
      font-size: 19px;
      font-weight: 800;
    }
    .content-titles p {
      margin: 0;
      font-size: 13.5px;
      color: var(--nb-text-muted);
    }
    .feature-chip {
      background: rgba(16, 185, 129, 0.1);
      color: #065f46;
      border: 1px solid rgba(16, 185, 129, 0.25);
      padding: 4px 12px;
      border-radius: 99px;
      font-size: 12px;
      font-weight: 700;
    }

    .mock-grid-3 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 18px;
    }
    .mock-card {
      background: var(--nb-bg);
      border: 1px solid var(--nb-border);
      border-radius: 14px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .card-head-sm {
      font-size: 14px;
      font-weight: 800;
      color: var(--nb-navy);
      padding-bottom: 8px;
      border-bottom: 1px dashed var(--nb-border);
    }
    .mock-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
    }
    .mock-bar {
      height: 6px;
      background: #e2e8f0;
      border-radius: 99px;
      overflow: hidden;
      margin-top: 6px;
    }
    .bar-fill {
      height: 100%;
      background: var(--nb-primary);
      border-radius: 99px;
    }
    .bar-fill.green { background: var(--nb-green); }
    .bar-fill.blue { background: #2563eb; }

    .mock-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .mock-table th {
      background: var(--nb-bg);
      padding: 12px 14px;
      text-align: start;
      font-weight: 800;
      color: var(--nb-text-muted);
      border-bottom: 2px solid var(--nb-border);
    }
    .mock-table td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--nb-border);
    }
    .mono-code {
      font-family: ui-monospace, monospace;
      font-weight: 700;
      color: var(--nb-primary);
    }
    .badge-grade {
      background: rgba(16, 185, 129, 0.12);
      color: #047857;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 12px;
    }
    .badge-status.ok {
      background: #e0f2fe;
      color: #0369a1;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
    }

    .mock-finance-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    .payment-source-box {
      background: var(--nb-bg);
      border: 1px solid var(--nb-border);
      border-radius: 14px;
      padding: 20px;
      text-align: center;
    }
    .bank-pill {
      font-size: 13px;
      font-weight: 800;
      color: var(--nb-navy);
      margin-bottom: 8px;
    }
    .bank-val {
      font-size: 22px;
      font-weight: 900;
      color: var(--nb-primary);
      margin-bottom: 4px;
    }
    .bank-count {
      font-size: 12px;
      color: var(--nb-text-muted);
    }

    .mock-attendance-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }
    .att-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px;
      border-radius: 12px;
      background: var(--nb-bg);
      border: 1px solid var(--nb-border);
    }
    .att-avatar {
      font-size: 24px;
    }
    .att-info {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .att-info b { font-size: 13px; }
    .att-info span { font-size: 11px; color: var(--nb-text-muted); }
    .att-status { font-size: 11px; font-weight: 800; color: #15803d; }
    .att-status.bad { color: #b91c1c; }

    /* ركائز السودان */
    .sudan-section {
      background: linear-gradient(180deg, var(--nb-bg) 0%, #edf2f7 100%);
    }
    .pillars-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 22px;
    }
    .pillar-card {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: 18px;
      padding: 28px 24px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .pillar-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
      border-color: var(--nb-primary);
    }
    .pillar-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: rgba(2, 132, 199, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      margin-bottom: 18px;
    }
    .pillar-card h3 {
      font-size: 17px;
      font-weight: 800;
      margin: 0 0 10px;
    }
    .pillar-card p {
      font-size: 13.5px;
      color: var(--nb-text-muted);
      line-height: 1.7;
      margin: 0;
    }
    .mono-badge {
      font-family: ui-monospace, monospace;
      color: var(--nb-primary);
      font-weight: 700;
      direction: ltr;
      display: inline-block;
    }

    /* الوحدات الـ 16 */
    .modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
      gap: 16px;
    }
    .module-item {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 18px;
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: 14px;
      transition: all 0.2s ease;
    }
    .module-item:hover {
      border-color: var(--nb-primary);
      background: #f0f9ff;
    }
    .module-icon {
      font-size: 26px;
      flex-shrink: 0;
    }
    .module-body h4 {
      margin: 0 0 4px;
      font-size: 14.5px;
      font-weight: 800;
    }
    .module-body p {
      margin: 0;
      font-size: 12.5px;
      color: var(--nb-text-muted);
      line-height: 1.5;
    }

    /* الأسعار */
    .pricing-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      align-items: stretch;
    }
    .plan-card {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: 20px;
      padding: 32px 28px;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: all 0.2s ease;
    }
    .plan-card.featured {
      border-color: var(--nb-primary);
      box-shadow: 0 20px 48px rgba(2, 132, 199, 0.15);
      transform: translateY(-8px);
    }
    .popular-tag {
      position: absolute;
      top: -14px;
      inset-inline-start: 28px;
      background: var(--nb-amber);
      color: #0b192c;
      font-size: 12px;
      font-weight: 800;
      padding: 4px 14px;
      border-radius: 99px;
    }
    .plan-type {
      font-size: 12px;
      color: var(--nb-text-muted);
      font-weight: 700;
    }
    .plan-name {
      font-size: 22px;
      font-weight: 900;
      margin: 6px 0 14px;
    }
    .plan-cost {
      margin-bottom: 14px;
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .plan-cost .amount {
      font-size: 32px;
      font-weight: 900;
      color: var(--nb-navy);
    }
    .plan-cost .currency {
      font-size: 13px;
      color: var(--nb-text-muted);
      font-weight: 700;
    }
    .plan-target {
      font-size: 13px;
      color: var(--nb-text-muted);
      margin: 0 0 20px;
      min-height: 40px;
    }
    .plan-features {
      list-style: none;
      padding: 0;
      margin: 0 0 28px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
    }
    .plan-features li {
      font-size: 13.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .plan-features li::before {
      content: '✓';
      color: var(--nb-green);
      font-weight: 900;
    }
    .btn-plan {
      height: 44px;
      border-radius: 10px;
      border: none;
      font-family: inherit;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
      width: 100%;
      transition: all 0.2s ease;
    }
    .btn-plan.primary {
      background: var(--nb-primary);
      color: #fff;
    }
    .btn-plan.primary:hover {
      background: var(--nb-primary-dark);
    }
    .btn-plan.ghost {
      background: var(--nb-bg);
      border: 1.5px solid var(--nb-border);
      color: var(--nb-text);
    }
    .btn-plan.ghost:hover {
      background: #e2e8f0;
    }

    /* CTA Section */
    .cta-wrap {
      padding: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 30px;
      background: linear-gradient(135deg, #0b192c, #1e3e62);
      color: #fff;
    }
    .cta-text h2 {
      font-size: 26px;
      font-weight: 900;
      margin: 0 0 10px;
    }
    .cta-text p {
      font-size: 14.5px;
      color: #cbd5e1;
      margin: 0;
      max-width: 580px;
    }
    .cta-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex-shrink: 0;
    }
    .btn-contact-link {
      color: #94a3b8;
      font-size: 13px;
      text-align: center;
      text-decoration: none;
    }

    /* Footer */
    .site-footer {
      background: #070f1b;
      color: #94a3b8;
      padding-top: 48px;
    }
    .footer-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 36px;
      gap: 20px;
      flex-wrap: wrap;
    }
    .footer-logo {
      font-size: 20px;
      font-weight: 900;
      color: #fff;
      margin-bottom: 6px;
    }
    .footer-copy {
      font-size: 13px;
      margin: 0;
      max-width: 380px;
    }
    .footer-links-group {
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
    }
    .footer-links-group a {
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .footer-links-group a:hover {
      color: #38bdf8;
    }
    .footer-bottom {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding: 18px 0;
      font-size: 12px;
      text-align: center;
    }

    /* المودال */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(11, 25, 44, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .signup-modal-box {
      background: #fff;
      border-radius: 20px;
      width: 100%;
      max-width: 620px;
      max-height: 92vh;
      overflow-y: auto;
      padding: 28px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
    }
    .modal-header-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 18px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--nb-border);
    }
    .modal-title {
      font-size: 18px;
      font-weight: 900;
      margin: 0 0 4px;
      color: var(--nb-navy);
    }
    .modal-sub {
      font-size: 12.5px;
      color: var(--nb-text-muted);
      margin: 0;
    }
    .btn-modal-close {
      background: #f1f5f9;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-size: 14px;
      cursor: pointer;
    }

    .form-body {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .form-row label {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .lbl-text {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--nb-text);
    }
    .lbl-text .req { color: #dc2626; }
    .form-row input, .form-row select {
      height: 42px;
      border: 1.5px solid var(--nb-border);
      border-radius: 9px;
      padding: 0 12px;
      font-family: inherit;
      font-size: 13.5px;
      outline: none;
      background: #fff;
      box-sizing: border-box;
      width: 100%;
    }
    .form-row input:focus, .form-row select:focus {
      border-color: var(--nb-primary);
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    @media (max-width: 600px) {
      .grid-2 { grid-template-columns: 1fr; }
    }

    .subdomain-input-wrap {
      display: flex;
      align-items: stretch;
      border: 1.5px solid var(--nb-border);
      border-radius: 9px;
      overflow: hidden;
    }
    .subdomain-input-wrap input {
      border: none;
      flex: 1;
      border-radius: 0;
    }
    .subdomain-suffix {
      background: #f1f5f9;
      padding: 0 14px;
      display: flex;
      align-items: center;
      font-size: 13px;
      font-weight: 700;
      color: var(--nb-text-muted);
      direction: ltr;
    }

    .hint-sub {
      font-size: 12px;
      font-weight: 700;
      margin-top: 4px;
    }
    .hint-sub.ok { color: #15803d; }
    .hint-sub.bad { color: #dc2626; }
    .hint-sub.checking { color: #0284c7; }

    .modal-footer-row {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid var(--nb-border);
    }
    .btn-cancel {
      height: 42px;
      padding: 0 18px;
      border-radius: 9px;
      background: #f1f5f9;
      border: none;
      font-family: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-submit-signup {
      height: 42px;
      padding: 0 22px;
      border-radius: 9px;
      background: var(--nb-primary);
      color: #fff;
      border: none;
      font-family: inherit;
      font-weight: 800;
      cursor: pointer;
    }
    .btn-submit-signup:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* شاشة النجاح */
    .success-screen {
      text-align: center;
      padding: 20px 10px;
    }
    .success-icon {
      font-size: 52px;
      margin-bottom: 12px;
    }
    .success-desc {
      font-size: 14.5px;
      color: var(--nb-text-muted);
      margin-bottom: 22px;
    }
    .trial-info-card {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 14px;
      padding: 18px;
      margin-bottom: 24px;
      text-align: start;
    }
    .tic-title {
      font-size: 12px;
      font-weight: 700;
      color: #166534;
      margin-bottom: 4px;
    }
    .tic-val {
      font-size: 18px;
      font-weight: 900;
      color: #15803d;
      margin-bottom: 6px;
    }
    .tic-sub {
      font-size: 12.5px;
      color: #166534;
      line-height: 1.6;
    }
    .w-full { width: 100%; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade {
      animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @media (max-width: 900px) {
      .hero-grid { grid-template-columns: 1fr; }
      .nav-links { display: none; }
      .cta-wrap { flex-direction: column; text-align: center; }
      .cta-actions { width: 100%; }
    }
  `]
})
export class NebrasHomeComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly plans = signal<PublicPlan[]>([]);
  readonly loadingPlans = signal(true);
  readonly currentYear = new Date().getFullYear();

  readonly activeTab = signal<PreviewTab>('dashboard');

  // طلب تسجيل المدرسة
  readonly showSignupModal = signal(false);
  readonly submitting = signal(false);
  readonly signupSuccess = signal(false);
  readonly checkingSub = signal(false);
  readonly subAvailable = signal<boolean | null>(null);

  form = {
    school_name: '',
    subdomain: '',
    city: 'ولاية الخرطوم',
    contact_name: '',
    phone: '',
    email: '',
    plan: '',
    note: ''
  };

  private subTimer: any = null;
  private base = (environment.apiUrl || '/api/v1/').replace(/\/?$/, '/');

  readonly sudaneseStates = [
    'ولاية الخرطوم',
    'ولاية الجزيرة',
    'ولاية البحر الأحمر',
    'ولاية نهر النيل',
    'الولاية الشمالية',
    'ولاية القضارف',
    'ولاية كسلا',
    'ولاية سنار',
    'ولاية النيل الأبيض',
    'ولاية النيل الأزرق',
    'ولاية شمال كردفان',
    'ولاية غرب كردفان',
    'ولاية جنوب كردفان',
    'ولاية شمال دارفور',
    'ولاية غرب دارفور',
    'ولاية جنوب دارفور',
    'ولاية وسط دارفور',
    'ولاية شرق دارفور'
  ];

  readonly modulesList = [
    { icon: '📝', title: 'القبول والتسجيل الإلكتروني', desc: 'معالج تسجيل مرن متعدد الخطوات مع إدارة حالات الطلبات والمرفقات.' },
    { icon: '👥', title: 'شؤون وسجلات الطلاب', desc: 'ملفات شاملة مع أرقام تسلسلية معزولة لكل مدرسة وكشوف تفصيلية.' },
    { icon: '📚', title: 'الأكاديميات والمناهج', desc: 'الصفوف، الشعب، وتوزيع المواد وفق مناهج وزارة التربية السودانية.' },
    { icon: '📊', title: 'الامتحانات والكنترول', desc: 'رصد فترات الاختبارات، كشوف الدرجات، والشهادات الرسمية التلقائية.' },
    { icon: '💳', title: 'الرسوم والأقساط المدرسية', desc: 'فوترة بالجنيه السوداني مع تسويات فورية لإشعارات بنكك وفوري.' },
    { icon: '👨‍🏫', title: 'هيئة التدريس والموظفون', desc: 'إدارة المعلمين، النصاب الأكاديمي، العقود، وملفات الموارد البشرية.' },
    { icon: '💵', title: 'مسيَّرات الرواتب والبدلات', desc: 'حساب دقيق للرواتب الأساسية، البدلات، الخصومات، وصافي المستحقات.' },
    { icon: '⏱️', title: 'الحضور والغياب اللحظي', desc: 'تحضير الفصول بالباركود مع تنبيهات فورية لأولياء الأمور.' },
    { icon: '👨‍👩‍👧', title: 'بوابة أولياء الأمور الذكية', desc: 'متابعة مباشرة لدرجات الأبناء، الحضور، الإعلانات، وجداول الحصص.' },
    { icon: '💬', title: 'الاتصالات والرسائل', desc: 'إشعارات سريعة وتنبيهات نصية ورسائل واتساب مؤتمتة.' },
    { icon: '🏥', title: 'العيادة والصحة المدرسية', desc: 'السجلات الطبية، الحساسيات، الزيارات الطارئة، وإرشادات الأدوية.' },
    { icon: '📖', title: 'المكتبة المدرسية الرقمية', desc: 'فهرسة الكتب والمراجع، إدارة الاستعارات، وتتبع المقتنيات.' },
    { icon: '🚌', title: 'النقل والترحيل المدرسي', desc: 'إدارة خطوط الحافلات، السائقين، والاشتراكات الشهرية للطلاب.' },
    { icon: '📦', title: 'المشتريات وسلسلة الإمداد', desc: 'طلبات الشراء، أوامر التوريد، عروض الأسعار، واعتمادات الصرف.' },
    { icon: '🏢', title: 'المخزون والأصول الثابتة', desc: 'تتبع العُهد المدرسية، صيانة الأجهزة، وتقييم الأصول السنوية.' },
    { icon: '📈', title: 'مركز الموافقات والتقارير', desc: 'اعتماد المعاملات متعدد المستويات وتقارير تنفيذية عالية الدقة.' },
  ];

  ngOnInit(): void {
    this.fetchPlans();
  }

  fetchPlans(): void {
    this.http.get<any>(`${this.base}saas-billing/plans/public/`).subscribe({
      next: (res) => {
        this.plans.set(res?.data ?? res ?? []);
        this.loadingPlans.set(false);
      },
      error: () => {
        this.loadingPlans.set(false);
      },
    });
  }

  scrollTo(elementId: string): void {
    document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth' });
  }

  goToLogin(): void {
    this.router.navigate(['/accounts/login']);
  }

  openSignup(planId?: string): void {
    this.form = {
      school_name: '',
      subdomain: '',
      city: 'ولاية الخرطوم',
      contact_name: '',
      phone: '',
      email: '',
      plan: planId || '',
      note: ''
    };
    this.subAvailable.set(null);
    this.signupSuccess.set(false);
    this.showSignupModal.set(true);
  }

  closeSignupModal(): void {
    this.showSignupModal.set(false);
  }

  suggestSubdomain(): void {
    if (!this.form.subdomain && this.form.school_name) {
      const words = this.form.school_name.trim().split(/\s+/);
      let suggested = '';
      if (words.length >= 2) {
        suggested = (words[1] || words[0]).toLowerCase();
      } else {
        suggested = words[0].toLowerCase();
      }
      const clean = suggested.replace(/[^a-z0-9]/g, '');
      if (clean.length >= 3) {
        this.form.subdomain = clean;
        this.onSubdomainInput();
      }
    }
  }

  onSubdomainInput(): void {
    this.subAvailable.set(null);
    if (this.subTimer) clearTimeout(this.subTimer);
    const sub = (this.form.subdomain || '').trim().toLowerCase();
    if (!sub || sub.length < 3) return;

    this.checkingSub.set(true);
    this.subTimer = setTimeout(() => {
      this.http.get<any>(`${this.base}saas-billing/signup-requests/check_subdomain/?subdomain=${encodeURIComponent(sub)}`)
        .subscribe({
          next: (res) => {
            const data = res?.data ?? res;
            this.subAvailable.set(!!data?.available);
            if (data?.subdomain) {
              this.form.subdomain = data.subdomain;
            }
            this.checkingSub.set(false);
          },
          error: () => {
            this.subAvailable.set(null);
            this.checkingSub.set(false);
          },
        });
    }, 350);
  }

  isFormValid(): boolean {
    return (
      !!this.form.school_name &&
      !!this.form.subdomain &&
      this.subAvailable() === true &&
      !!this.form.contact_name &&
      !!this.form.phone &&
      !!this.form.email &&
      this.form.email.includes('@')
    );
  }

  submitSignupRequest(): void {
    if (!this.isFormValid()) return;
    this.submitting.set(true);

    this.http.post<any>(`${this.base}saas-billing/signup-requests/`, this.form).subscribe({
      next: () => {
        this.submitting.set(false);
        this.signupSuccess.set(true);
      },
      error: () => {
        this.submitting.set(false);
      },
    });
  }
}
