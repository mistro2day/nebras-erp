import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService, TenantInfo } from '../../../core/services/tenant.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

@Component({
  selector: 'app-school-identity-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="بيانات المدرسة وهوية المطبوعات الرسمية"
        subtitle="إدارة وتعديل اسم المنشأة التعليمية، الشعار الرسمي، العناوين المعتمدة، وأرقام التواصل والواتساب، والتي تنعكس فورياً على الترويسات والمطبوعات والفوتر."
      ></nb-page-header>

      <!-- تنبيه النجاح أو الخطأ -->
      @if (saveSuccess()) {
        <div class="alert-banner success">
          <span class="icon">✅</span>
          <div class="text">
            <strong>تم حفظ البيانات وهوية المدرسة والشعار بنجاح!</strong>
            <p>تم تطبيق كافة التعديلات على الشعار، الترويسات، المطبوعات، وسندات القبض/الصرف والفوتر في كامل النظام فوراً.</p>
          </div>
          <button type="button" class="close-btn" (click)="saveSuccess.set(false)">×</button>
        </div>
      }

      @if (saveError()) {
        <div class="alert-banner error">
          <span class="icon">⚠️</span>
          <div class="text">
            <strong>تعذر حفظ البيانات:</strong>
            <p>{{ saveError() }}</p>
          </div>
          <button type="button" class="close-btn" (click)="saveError.set(null)">×</button>
        </div>
      }

      <div class="settings-layout">
        <!-- عمود نماذج الإدخال -->
        <div class="form-column">
          <!-- 1. الشعار الرسمي للمدرسة -->
          <nb-panel title="شعار المدرسة الرسمي (Logo)">
            <div class="panel-body">
              <div class="logo-config-wrapper">
                <div class="logo-preview-box">
                  @if (logoPreview()) {
                    <img [src]="logoPreview()" alt="شعار المدرسة" class="school-logo-img" />
                  } @else {
                    <div class="no-logo-placeholder">🏫 لا يوجد شعار</div>
                  }
                </div>
                <div class="logo-actions">
                  <input
                    type="file"
                    #logoFileInput
                    (change)="onLogoFileSelected($event)"
                    accept="image/png, image/jpeg, image/webp, image/svg+xml"
                    style="display: none;"
                  />
                  <div class="logo-btn-row">
                    <button type="button" class="nb-btn-secondary upload-btn" (click)="logoFileInput.click()">
                      📁 اختيار أو رفع شعار جديد
                    </button>
                    @if (logoPreview() && !logoPreview().includes('logo-dark')) {
                      <button type="button" class="btn-remove-logo" (click)="removeLogo()">
                        استعادة الافتراضي
                      </button>
                    }
                  </div>
                  <span class="hint">يظهر الشعار في منتصف ترويسات سندات القبض، استمارات القبول، وأوامر الشراء. يفضل قياس 300×300 بكسل بخلفية شفافة (PNG).</span>
                </div>
              </div>
            </div>
          </nb-panel>

          <!-- 2. منظومة الأختام الإدارية الرسمية للمؤسسة -->
          <nb-panel title="منظومة الأختام الإدارية الرسمية للمؤسسة التعليمية (Official Department Seals)">
            <div class="panel-body">
              <p class="seals-intro-text">
                تتيح منظومة نبراس تخصيص ختم رسمي مستقل لكل إدارة في المدرسة لضمان الحوكمة والاعتماد الرسمي الدقيق، مع ربط كل ختم بنوع المستند المطبوع تلقائياً:
              </p>

              <div class="seals-grid">
                <!-- أ) ختم الإدارة العامة والمدير العام -->
                <div class="seal-dept-card" [class.has-seal]="!!stampPreview()">
                  <div class="seal-card-header">
                    <div class="seal-badge general">ختم الإدارة العامة والمدير العام</div>
                    <span class="seal-desc">الشهادات، النتائج الأكاديمية، استمارات القبول، العقود والقرارات</span>
                  </div>
                  <div class="seal-card-body">
                    <div class="logo-preview-box stamp-preview-box">
                      @if (stampPreview()) {
                        <img [src]="stampPreview()" alt="ختم الإدارة العامة" class="school-stamp-img" />
                      } @else {
                        <div class="no-logo-placeholder">🔴 لا يوجد ختم مخصص</div>
                      }
                    </div>
                    <div class="seal-actions">
                      <input type="file" #stampGeneralInput (change)="onStampFileSelected($event)" accept="image/png, image/jpeg, image/webp, image/svg+xml" style="display: none;" />
                      <button type="button" class="nb-btn-secondary upload-btn xs" (click)="stampGeneralInput.click()">📁 رفع ختم الإدارة</button>
                      @if (stampPreview()) {
                        <button type="button" class="btn-remove-logo xs" (click)="removeStamp()">إزالة</button>
                      }
                    </div>
                  </div>
                </div>

                <!-- ب) ختم الإدارة المالية والخزينة -->
                <div class="seal-dept-card" [class.has-seal]="!!stampFinancePreview()">
                  <div class="seal-card-header">
                    <div class="seal-badge finance">ختم الإدارة المالية والحسابات</div>
                    <span class="seal-desc">سندات القبض والصرف، فواتير الرسوم، كشوفات الحسابات، وإبراء الذمة</span>
                  </div>
                  <div class="seal-card-body">
                    <div class="logo-preview-box stamp-preview-box">
                      @if (stampFinancePreview()) {
                        <img [src]="stampFinancePreview()" alt="ختم الإدارة المالية" class="school-stamp-img" />
                      } @else {
                        <div class="no-logo-placeholder">🔴 لا يوجد ختم مخصص</div>
                      }
                    </div>
                    <div class="seal-actions">
                      <input type="file" #stampFinanceInput (change)="onStampFinanceFileSelected($event)" accept="image/png, image/jpeg, image/webp, image/svg+xml" style="display: none;" />
                      <button type="button" class="nb-btn-secondary upload-btn xs" (click)="stampFinanceInput.click()">📁 رفع ختم المالية</button>
                      @if (stampFinancePreview()) {
                        <button type="button" class="btn-remove-logo xs" (click)="removeStampFinance()">إزالة</button>
                      }
                    </div>
                  </div>
                </div>

                <!-- ج) ختم المتابعة والشؤون الأكاديمية -->
                <div class="seal-dept-card" [class.has-seal]="!!stampAcademicPreview()">
                  <div class="seal-card-header">
                    <div class="seal-badge academic">ختم المتابعة والشؤون الأكاديمية</div>
                    <span class="seal-desc">كشوفات الحضور والغياب، إنذارات وسجلات المواظبة، وبطاقات المتابعة</span>
                  </div>
                  <div class="seal-card-body">
                    <div class="logo-preview-box stamp-preview-box">
                      @if (stampAcademicPreview()) {
                        <img [src]="stampAcademicPreview()" alt="ختم الشؤون الأكاديمية" class="school-stamp-img" />
                      } @else {
                        <div class="no-logo-placeholder">🔴 لا يوجد ختم مخصص</div>
                      }
                    </div>
                    <div class="seal-actions">
                      <input type="file" #stampAcademicInput (change)="onStampAcademicFileSelected($event)" accept="image/png, image/jpeg, image/webp, image/svg+xml" style="display: none;" />
                      <button type="button" class="nb-btn-secondary upload-btn xs" (click)="stampAcademicInput.click()">📁 رفع ختم المتابعة</button>
                      @if (stampAcademicPreview()) {
                        <button type="button" class="btn-remove-logo xs" (click)="removeStampAcademic()">إزالة</button>
                      }
                    </div>
                  </div>
                </div>
              </div>
              <span class="hint mt-2">يمكن رفع الختم بأي شكل معتمد للمؤسسة (دائري، بيضاوي، أو مربع) بخلفية شفافة (PNG) دون أي تقييد. في حال عدم رفع ختم لأي قسم، تعتمد المنظومة تلقائياً ختم الإدارة العامة.</span>
            </div>
          </nb-panel>

          <!-- 3. الأسماء الرسمية -->
          <nb-panel title="الاسم الرسمي للمؤسسة التعليمية">
            <div class="panel-body">
              <div class="form-group">
                <label for="schoolNameAr">اسم المدرسة الرسمي (بالعربية) <span class="req">*</span></label>
                <input
                  id="schoolNameAr"
                  type="text"
                  [(ngModel)]="nameAr"
                  placeholder="مثال: مدارس المورد النموذجية الخاصة / مدارس المورد الجديدة للتعليم الخاص"
                  class="form-control"
                />
                <span class="hint">يظهر في أعلى كل الترويسات الرسمية، السندات المالية، واستمارات القبول.</span>
              </div>

              <div class="form-group">
                <label for="schoolNameEn">اسم المدرسة (بالإنجليزية)</label>
                <input
                  id="schoolNameEn"
                  type="text"
                  [(ngModel)]="nameEn"
                  placeholder="e.g. Al-Mawred Model Private Schools"
                  class="form-control ltr-input"
                  dir="ltr"
                />
              </div>

              <div class="form-group">
                <label for="schoolEmail">البريد الإلكتروني الرسمي للمدرسة</label>
                <input
                  id="schoolEmail"
                  type="email"
                  [(ngModel)]="email"
                  placeholder="accounts@almawred.edu.sd"
                  class="form-control ltr-input"
                  dir="ltr"
                />
              </div>
            </div>
          </nb-panel>

          <!-- 3. العنوان والموقع الجغرافي السوداني -->
          <nb-panel title="العنوان والموقع المعتمد في المطبوعات">
            <div class="panel-body">
              <div class="form-row">
                <div class="form-group">
                  <label for="stateCity">الولاية والمنطقة</label>
                  <input
                    id="stateCity"
                    type="text"
                    [(ngModel)]="stateCity"
                    placeholder="مثال: الخرطوم — أركويت"
                    class="form-control"
                  />
                </div>

                <div class="form-group">
                  <label for="streetSquare">الشارع والمربع</label>
                  <input
                    id="streetSquare"
                    type="text"
                    [(ngModel)]="streetSquare"
                    placeholder="مثال: شارع الفردوس — مربع 54"
                    class="form-control"
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="fullAddress">العنوان الكامل للترويسة والمستندات الورقية <span class="req">*</span></label>
                <textarea
                  id="fullAddress"
                  rows="2"
                  [(ngModel)]="address"
                  placeholder="جمهورية السودان — ولاية الخرطوم — أركويت — شارع الفردوس — مربع 54"
                  class="form-control textarea"
                ></textarea>
                <span class="hint">هذا هو السطر النصي الدقيق الذي سيُطبع في ترويسة وفوتر جميع مخرجات النظام.</span>
              </div>
            </div>
          </nb-panel>

          <!-- 4. أرقام الهواتف والواتساب -->
          <nb-panel title="أرقام هواتف التواصل وخدمة العملاء">
            <div class="panel-body">
              <div class="phones-section">
                <div class="section-head">
                  <label>أرقام الهواتف الثابتة والجوّالة للمدرسة</label>
                  <button type="button" class="btn-link-action" (click)="addPhone()">
                    + إضافة رقم هاتف
                  </button>
                </div>

                <div class="phones-list">
                  @for (phone of phones(); track $index) {
                    <div class="phone-row">
                      <span class="phone-index">{{ $index + 1 }}</span>
                      <input
                        type="text"
                        [ngModel]="phones()[$index]"
                        (ngModelChange)="updatePhone($index, $event)"
                        placeholder="0123689814"
                        class="form-control phone-input"
                        dir="ltr"
                      />
                      @if (phones().length > 1) {
                        <button
                          type="button"
                          class="btn-remove-phone"
                          title="حذف هذا الرقم"
                          (click)="removePhone($index)"
                        >
                          ✕
                        </button>
                      }
                    </div>
                  }
                </div>
                <span class="hint">أرقام التواصل التي تظهر في ترويسة السندات وأسفل الاستمارات.</span>
              </div>

              <div class="form-group mt-3">
                <label for="whatsappNum">رقم خدمة الواتساب المعتمد (WhatsApp)</label>
                <div class="input-with-icon">
                  <span class="input-prefix">💬</span>
                  <input
                    id="whatsappNum"
                    type="text"
                    [(ngModel)]="whatsapp"
                    placeholder="0120397775"
                    class="form-control phone-input"
                    dir="ltr"
                  />
                </div>
                <span class="hint">يُستخدم لتوجيه أولياء الأمور إلى الدعم المباشر ومراسلات القبول.</span>
              </div>
            </div>
          </nb-panel>

          <!-- أزرار الإجراءات -->
          <div class="actions-footer">
            <button
              type="button"
              class="nb-btn-primary"
              [disabled]="saving()"
              (click)="saveChanges()"
            >
              @if (saving()) {
                <span>جارٍ حفظ البيانات وتطبيقها...</span>
              } @else {
                <span>💾 حفظ التعديلات وتطبيقها على المطبوعات</span>
              }
            </button>
            <button
              type="button"
              class="nb-btn-secondary"
              [disabled]="saving()"
              (click)="resetToCurrent()"
            >
              إلغاء التغييرات
            </button>
          </div>
        </div>

        <!-- عمود المعاينة الحية الفورية (Live Preview) -->
        <div class="preview-column">
          <div class="preview-sticky">
            <div class="preview-card">
              <div class="preview-badge">معاينة حيّة للمطبوعات الورقية والترويسة</div>

              <!-- شريط التبديل التفاعلي بين أنواع المستندات لمعاينة الختم المخصص -->
              <div class="preview-type-switcher">
                <button type="button" class="type-btn" [class.active]="previewDocType() === 'finance'" (click)="previewDocType.set('finance')">
                  💰 مستند مالي
                </button>
                <button type="button" class="type-btn" [class.active]="previewDocType() === 'general'" (click)="previewDocType.set('general')">
                  📜 استمارة إدارية
                </button>
                <button type="button" class="type-btn" [class.active]="previewDocType() === 'academic'" (click)="previewDocType.set('academic')">
                  📋 كشف متابعة وغياب
                </button>
              </div>

              <div class="print-mock-sheet">
                <!-- الترويسة المطبوعة المحاكية -->
                <div class="mock-header">
                  <div class="mock-side right">
                    <div class="country">جمهورية السودان</div>
                    <div class="state">ولاية الخرطوم — وزارة التعليم والتربية الوطنية</div>
                    <div class="school-ar">{{ nameAr() || 'مدارس المورد النموذجية الخاصة' }}</div>
                  </div>

                  <div class="mock-logo">
                    @if (logoPreview()) {
                      <img [src]="logoPreview()" alt="شعار المدرسة" class="mock-logo-img" />
                    } @else {
                      <div class="logo-box">
                        <span class="logo-icon">🏫</span>
                      </div>
                    }
                  </div>

                  <div class="mock-side left">
                    <div class="country">Republic of Sudan</div>
                    <div class="state">Ministry of Education</div>
                    <div class="school-en">{{ nameEn() || 'Al-Mawred Model Private Schools' }}</div>
                  </div>
                </div>

                <div class="mock-divider"></div>

                <!-- شريط المستند النموذجي -->
                <div class="mock-doc-title">
                  <span>{{ previewDocTitle() }}</span>
                </div>

                <div class="mock-body-placeholder">
                  <div class="mock-line w-75"></div>
                  <div class="mock-line w-50"></div>
                  <div class="mock-line w-90"></div>
                </div>

                <!-- التوقيعات والختم المعتمد في المعاينة الحية -->
                <div class="mock-signatures-row">
                  <div class="mock-sig-col">
                    <span class="mock-sig-title">{{ previewSig1Label() }}</span>
                    <div class="mock-sig-line"></div>
                    <span class="mock-sig-sub">التوقيع والاعتماد</span>
                  </div>
                  <div class="mock-sig-col mock-stamp-col">
                    <span class="mock-sig-title">{{ previewStampLabel() }}</span>
                    <div class="mock-stamp-display">
                      @if (activeStampPreview()) {
                        <img [src]="activeStampPreview()" [alt]="previewStampLabel()" class="mock-stamp-img" />
                      } @else {
                        <div class="mock-stamp-placeholder-badge">
                          <span class="txt-top">{{ nameAr() || 'المؤسسة' }}</span>
                          <span class="txt-mid">معتمد</span>
                          <span class="txt-bot">★</span>
                        </div>
                      }
                    </div>
                  </div>
                  <div class="mock-sig-col">
                    <span class="mock-sig-title">{{ previewSig2Label() }}</span>
                    <div class="mock-sig-line"></div>
                    <span class="mock-sig-sub">الاعتماد الرسمي</span>
                  </div>
                </div>

                <!-- الفوتر المطبوع المحاكي -->
                <div class="mock-footer">
                  <div class="footer-row">
                    <span class="item">📍 <strong>العنوان:</strong> {{ address() || 'أركويت — شارع الفردوس — مربع 54' }}</span>
                  </div>
                  <div class="footer-row contacts">
                    <span class="item">📞 <strong>الهواتف:</strong> {{ formattedPhonesPreview() }}</span>
                    @if (whatsapp()) {
                      <span class="item">💬 <strong>واتساب:</strong> {{ whatsapp() }}</span>
                    }
                  </div>
                  <div class="footer-note">
                    نظام نبراس OS لإدارة المدارس الذكية — سند إلكتروني معتمد رسمياً
                  </div>
                </div>
              </div>

              <div class="preview-info-box">
                <span class="info-icon">💡</span>
                <span>أي تعديل تقوم به هنا (بما في ذلك تغيير الشعار) يُحدث فورياً جميع سندات القبض، أوامر الشراء، استمارات التقديم، وكشوفات الحساب لكافة مستخدمي المدرسة.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      background: var(--nb-bg, #f8fafc);
      min-width: 0;
    }

    .alert-banner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 18px;
      border-radius: var(--nb-radius, 8px);
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .alert-banner.success {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
    }
    .alert-banner.error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }
    .alert-banner .icon {
      font-size: 20px;
      line-height: 1;
    }
    .alert-banner .text strong {
      display: block;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 3px;
    }
    .alert-banner .text p {
      margin: 0;
      font-size: 12.5px;
      opacity: 0.9;
    }
    .alert-banner .close-btn {
      margin-right: auto;
      margin-left: 0;
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: inherit;
      opacity: 0.6;
    }
    .alert-banner .close-btn:hover {
      opacity: 1;
    }

    .settings-layout {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 24px;
      align-items: start;
    }

    @media (max-width: 1080px) {
      .settings-layout {
        grid-template-columns: 1fr;
      }
    }

    .form-column {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .panel-body {
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* تكوين الشعار */
    .logo-config-wrapper {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .logo-preview-box {
      width: 90px;
      height: 90px;
      border: 2px dashed var(--nb-border, #cbd5e1);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      overflow: hidden;
      flex-shrink: 0;
      padding: 4px;
    }
    .school-logo-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .no-logo-placeholder {
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
    .logo-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }
    .logo-btn-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .btn-remove-logo {
      background: none;
      border: 1px solid #f87171;
      color: #dc2626;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.15s;
    }
    .btn-remove-logo:hover {
      background: #fee2e2;
    }

    /* شبكة وبطاقات الأختام المتعددة */
    .seals-intro-text {
      font-size: 13px;
      color: #475569;
      line-height: 1.5;
      margin: 0 0 12px 0;
    }
    .seals-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }
    @media (max-width: 900px) {
      .seals-grid {
        grid-template-columns: 1fr;
      }
    }
    .seal-dept-card {
      border: 1px solid var(--nb-border, #cbd5e1);
      border-radius: 10px;
      background: #fafafa;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .seal-dept-card.has-seal {
      border-color: #3b82f6;
      background: #ffffff;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.08);
    }
    .seal-card-header {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .seal-badge {
      display: inline-flex;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      align-self: flex-start;
    }
    .seal-badge.general { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
    .seal-badge.finance { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .seal-badge.academic { background: #faf5ff; color: #6b21a8; border: 1px solid #e9d5ff; }
    .seal-desc {
      font-size: 10.5px;
      color: #64748b;
      line-height: 1.35;
    }
    .seal-card-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .seal-dept-card .stamp-preview-box {
      width: 85px;
      height: 75px;
      border-radius: 8px;
    }
    .seal-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .seal-actions button.xs {
      padding: 4px 10px;
      font-size: 11px;
    }

    /* شريط التبديل في المعاينة الحية */
    .preview-type-switcher {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      background: #f1f5f9;
      padding: 4px;
      border-radius: 8px;
    }
    .type-btn {
      background: none;
      border: none;
      padding: 6px 4px;
      font-size: 10.5px;
      font-weight: 700;
      color: #64748b;
      border-radius: 6px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s ease;
      white-space: nowrap;
      text-align: center;
    }
    .type-btn.active {
      background: #ffffff;
      color: #1e3a8a;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    @media (max-width: 600px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }

    .form-group label {
      font-size: 13px;
      font-weight: 600;
      color: var(--nb-text, #1e293b);
    }
    .form-group label .req {
      color: #ef4444;
      font-weight: bold;
    }

    .form-control {
      height: 38px;
      border: 1px solid var(--nb-border, #cbd5e1);
      border-radius: var(--nb-radius, 6px);
      padding: 0 12px;
      font-family: var(--nb-font-family, 'Cairo', 'Inter', sans-serif);
      font-size: 13.5px;
      color: var(--nb-text, #0f172a);
      background: var(--nb-surface, #ffffff);
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .form-control:focus {
      border-color: var(--nb-primary-500, #3b82f6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }

    .form-control.textarea {
      height: auto;
      padding: 8px 12px;
      resize: vertical;
      line-height: 1.5;
    }

    .ltr-input {
      text-align: left;
      direction: ltr;
    }

    .hint {
      font-size: 11.5px;
      color: var(--nb-text-muted, #64748b);
      margin-top: 2px;
    }

    .phones-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-head label {
      font-size: 13px;
      font-weight: 600;
      color: var(--nb-text, #1e293b);
    }

    .btn-link-action {
      background: none;
      border: none;
      color: var(--nb-primary-600, #2563eb);
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.15s;
    }
    .btn-link-action:hover {
      background: rgba(37, 99, 235, 0.08);
      text-decoration: underline;
    }

    .phones-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .phone-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .phone-index {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--nb-surface-raised, #e2e8f0);
      border-radius: 50%;
      font-size: 11.5px;
      font-weight: 700;
      color: var(--nb-text-secondary, #475569);
      flex-shrink: 0;
    }

    .phone-input {
      flex: 1;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .btn-remove-phone {
      width: 32px;
      height: 32px;
      background: #fee2e2;
      border: 1px solid #fca5a5;
      color: #b91c1c;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: bold;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .btn-remove-phone:hover {
      background: #ef4444;
      color: #ffffff;
      border-color: #dc2626;
    }

    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-prefix {
      position: absolute;
      right: 10px;
      font-size: 14px;
      pointer-events: none;
    }
    .input-with-icon .phone-input {
      padding-right: 34px;
      width: 100%;
    }

    .mt-3 {
      margin-top: 12px;
    }

    .actions-footer {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 0 32px;
    }

    .nb-btn-primary {
      background: linear-gradient(135deg, #1e3a8a, #2563eb);
      color: #ffffff;
      border: none;
      border-radius: var(--nb-radius, 8px);
      padding: 10px 24px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 3px 8px rgba(37, 99, 235, 0.3);
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .nb-btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #172554, #1d4ed8);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
      transform: translateY(-1px);
    }
    .nb-btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .nb-btn-secondary {
      background: var(--nb-surface, #ffffff);
      color: var(--nb-text, #334155);
      border: 1px solid var(--nb-border, #cbd5e1);
      border-radius: var(--nb-radius, 8px);
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .nb-btn-secondary:hover:not(:disabled) {
      background: var(--nb-surface-raised, #f1f5f9);
      border-color: #94a3b8;
    }

    /* عمود المعاينة الحية */
    .preview-sticky {
      position: sticky;
      top: 20px;
    }

    .preview-card {
      background: var(--nb-surface, #ffffff);
      border: 1px solid var(--nb-border, #e2e8f0);
      border-radius: var(--nb-radius, 12px);
      padding: 20px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .preview-badge {
      display: inline-flex;
      align-items: center;
      align-self: flex-start;
      background: rgba(30, 58, 138, 0.08);
      color: #1e3a8a;
      font-size: 11.5px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 20px;
      border: 1px solid rgba(30, 58, 138, 0.2);
    }

    .print-mock-sheet {
      background: #ffffff;
      border: 1px dashed #94a3b8;
      border-radius: 8px;
      padding: 18px 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
      color: #0f172a;
      font-size: 12px;
      font-family: 'Cairo', 'Inter', sans-serif;
    }

    .mock-header {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .mock-side.right {
      text-align: right;
    }
    .mock-side.left {
      text-align: left;
      direction: ltr;
    }
    .mock-side .country {
      font-size: 10.5px;
      font-weight: 700;
      color: #475569;
    }
    .mock-side .state {
      font-size: 9.5px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .mock-side .school-ar {
      font-size: 12.5px;
      font-weight: 800;
      color: #1e3a8a;
      line-height: 1.3;
    }
    .mock-side .school-en {
      font-size: 11px;
      font-weight: 700;
      color: #1e3a8a;
      line-height: 1.3;
    }

    .mock-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 60px;
    }
    .mock-logo-img {
      max-height: 52px;
      max-width: 90px;
      object-fit: contain;
    }
    .logo-box {
      width: 58px;
      height: 48px;
      border-radius: 8px;
      background: #eff6ff;
      border: 1.5px solid #3b82f6;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-icon {
      font-size: 24px;
    }

    .mock-divider {
      height: 2px;
      background: linear-gradient(90deg, #1e3a8a, #3b82f6, #1e3a8a);
      margin-bottom: 14px;
    }

    .mock-doc-title {
      text-align: center;
      margin-bottom: 16px;
    }
    .mock-doc-title span {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 3px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      color: #334155;
    }

    .mock-body-placeholder {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px 0 20px;
    }
    .mock-line {
      height: 6px;
      background: #e2e8f0;
      border-radius: 3px;
    }
    .w-75 { width: 75%; }
    .w-50 { width: 50%; }
    .w-90 { width: 90%; }

    /* أنماط الختم في لوحة الإعدادات */
    .stamp-preview-box {
      border-radius: 8px !important;
      border: 1.5px dashed #0284c7 !important;
      background: #f0f9ff;
    }
    .school-stamp-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      transform: rotate(-3deg);
    }

    /* أنماط التوقيعات والختم في المعاينة الحية */
    .mock-signatures-row {
      display: grid;
      grid-template-columns: 1fr 1.2fr 1fr;
      gap: 10px;
      align-items: center;
      margin: 14px 0 10px;
      padding: 10px 6px 4px;
      border-top: 1px dashed #cbd5e1;
      text-align: center;
    }
    .mock-sig-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .mock-sig-title {
      font-size: 9.5px;
      font-weight: 700;
      color: #475569;
    }
    .mock-sig-line {
      width: 80%;
      border-bottom: 1px dashed #94a3b8;
      height: 14px;
    }
    .mock-sig-sub {
      font-size: 8px;
      color: #94a3b8;
    }
    .mock-stamp-display {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
    }
    .mock-stamp-img {
      max-height: 50px;
      max-width: 80px;
      object-fit: contain;
      transform: rotate(-3deg);
    }
    .mock-stamp-placeholder-badge {
      width: 62px;
      height: 44px;
      border: 1.5px dashed #0284c7;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 7px;
      color: #0284c7;
      font-weight: 700;
      transform: rotate(-3deg);
      line-height: 1.15;
      padding: 2px 4px;
    }

    .mock-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 10.5px;
      color: #475569;
    }
    .footer-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .footer-row.contacts {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      color: #1e293b;
    }
    .footer-note {
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
      margin-top: 6px;
    }

    .preview-info-box {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 11.5px;
      color: #475569;
      line-height: 1.5;
    }
    .preview-info-box .info-icon {
      font-size: 14px;
    }
  `]
})
export class SchoolIdentitySettingsComponent implements OnInit {
  private tenantService = inject(TenantService);

  nameAr = signal('مدارس المورد النموذجية الخاصة');
  nameEn = signal('Al-Mawred Model Private Schools');
  email = signal('accounts@almawred.edu.sd');
  stateCity = signal('جمهورية السودان — ولاية الخرطوم — أركويت');
  streetSquare = signal('شارع الفردوس — مربع 54');
  address = signal('جمهورية السودان — ولاية الخرطوم — أركويت — شارع الفردوس — مربع 54');
  phones = signal<string[]>(['0123689814', '0110100504', '0110100505', '0110100506']);
  whatsapp = signal('0120397775');

  // إدارة الشعار
  logoUrl = signal<string>('/assets/branding/logo-dark.png');
  logoDataUrl = signal<string | null>(null);
  logoPreview = computed(() => this.logoDataUrl() || this.logoUrl());

  // إدارة الختم الرسمي العام للمؤسسة والاعتماد (General Administration Seal)
  stampUrl = signal<string | null>(null);
  stampDataUrl = signal<string | null>(null);
  stampPreview = computed(() => this.stampDataUrl() !== null ? this.stampDataUrl() : this.stampUrl());

  // إدارة ختم الإدارة المالية والخزينة (Financial Administration Seal)
  stampFinanceUrl = signal<string | null>(null);
  stampFinanceDataUrl = signal<string | null>(null);
  stampFinancePreview = computed(() => this.stampFinanceDataUrl() !== null ? this.stampFinanceDataUrl() : this.stampFinanceUrl());

  // إدارة ختم الشؤون الأكاديمية والمتابعة (Academic Affairs & Attendance Seal)
  stampAcademicUrl = signal<string | null>(null);
  stampAcademicDataUrl = signal<string | null>(null);
  stampAcademicPreview = computed(() => this.stampAcademicDataUrl() !== null ? this.stampAcademicDataUrl() : this.stampAcademicUrl());

  // نوع المستند المختار في المعاينة الحية
  previewDocType = signal<'general' | 'finance' | 'academic'>('finance');

  previewDocTitle = computed(() => {
    switch (this.previewDocType()) {
      case 'finance': return 'سند قـبـض مـالـي مـعـتـمـد / فـاتـورة رسـوم';
      case 'academic': return 'كشف متابعة حضور وغياب وتوزيع الطلاب';
      case 'general':
      default: return 'استمارة تسجيل وقبول طالب / شهادة إدارية رسمية';
    }
  });

  previewSig1Label = computed(() => {
    switch (this.previewDocType()) {
      case 'finance': return 'أمين الخزينة / المحاسب';
      case 'academic': return 'مشرف الصف / شؤون الطلاب';
      case 'general':
      default: return 'مسؤول القبول والتسجيل';
    }
  });

  previewSig2Label = computed(() => {
    switch (this.previewDocType()) {
      case 'finance': return 'اعتماد المدير المالي';
      case 'academic': return 'اعتماد وكيل المدرسة';
      case 'general':
      default: return 'اعتماد المدير العام للمدرسة';
    }
  });

  previewStampLabel = computed(() => {
    switch (this.previewDocType()) {
      case 'finance': return 'ختم الإدارة المالية';
      case 'academic': return 'ختم الشؤون الأكاديمية';
      case 'general':
      default: return 'ختم الإدارة العامة للمدرسة';
    }
  });

  activeStampPreview = computed(() => {
    switch (this.previewDocType()) {
      case 'finance': return this.stampFinancePreview() || this.stampPreview();
      case 'academic': return this.stampAcademicPreview() || this.stampPreview();
      case 'general':
      default: return this.stampPreview();
    }
  });

  saving = signal(false);
  saveSuccess = signal(false);
  saveError = signal<string | null>(null);

  formattedPhonesPreview = computed(() => {
    return this.phones().filter(p => p.trim()).join(' | ');
  });

  ngOnInit(): void {
    this.resetToCurrent();
  }

  resetToCurrent(): void {
    const t = this.tenantService.currentTenant();
    if (t) {
      this.populateFromTenant(t);
    } else {
      this.tenantService.refreshCurrentTenant();
      setTimeout(() => {
        const cur = this.tenantService.currentTenant();
        if (cur) this.populateFromTenant(cur);
      }, 600);
    }
  }

  private populateFromTenant(t: TenantInfo): void {
    this.nameAr.set(t.nameAr || t.schoolNameAr || t.name || 'مدارس المورد النموذجية الخاصة');
    this.nameEn.set(t.nameEn || t.schoolNameEn || 'Al-Mawred Model Private Schools');
    this.email.set(t.email || 'accounts@almawred.edu.sd');
    this.address.set(t.address || 'جمهورية السودان — ولاية الخرطوم — أركويت — شارع الفردوس — مربع 54');
    
    if (t.logoUrl) {
      this.logoUrl.set(t.logoUrl);
    } else {
      this.logoUrl.set('/assets/branding/logo-dark.png');
    }
    this.logoDataUrl.set(null);

    // ختم الإدارة العامة
    this.stampUrl.set(t.stampUrl || null);
    this.stampDataUrl.set(null);

    // ختم الإدارة المالية
    this.stampFinanceUrl.set(t.stampFinanceUrl || null);
    this.stampFinanceDataUrl.set(null);

    // ختم الشؤون الأكاديمية
    this.stampAcademicUrl.set(t.stampAcademicUrl || null);
    this.stampAcademicDataUrl.set(null);

    if (t.phones && t.phones.length > 0) {
      this.phones.set([...t.phones]);
    } else if (t.phone) {
      this.phones.set([t.phone]);
    } else {
      this.phones.set(['0123689814']);
    }

    this.whatsapp.set(t.whatsapp || '0120397775');
  }

  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.logoDataUrl.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeLogo(): void {
    this.logoDataUrl.set('');
    this.logoUrl.set('/assets/branding/logo-dark.png');
  }

  // ختم الإدارة العامة
  onStampFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.stampDataUrl.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeStamp(): void {
    this.stampDataUrl.set('');
    this.stampUrl.set(null);
  }

  // ختم الإدارة المالية
  onStampFinanceFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.stampFinanceDataUrl.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeStampFinance(): void {
    this.stampFinanceDataUrl.set('');
    this.stampFinanceUrl.set(null);
  }

  // ختم الشؤون الأكاديمية والمتابعة
  onStampAcademicFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.stampAcademicDataUrl.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeStampAcademic(): void {
    this.stampAcademicDataUrl.set('');
    this.stampAcademicUrl.set(null);
  }

  addPhone(): void {
    this.phones.update(list => [...list, '']);
  }

  updatePhone(index: number, val: string): void {
    this.phones.update(list => {
      const next = [...list];
      next[index] = val;
      return next;
    });
  }

  removePhone(index: number): void {
    this.phones.update(list => {
      if (list.length <= 1) return list;
      return list.filter((_, i) => i !== index);
    });
  }

  saveChanges(): void {
    const cleanNameAr = this.nameAr().trim();
    if (!cleanNameAr) {
      this.saveError.set('يرجى كتابة اسم المدرسة بالعربية بشكل صحيح');
      return;
    }

    const cleanPhones = this.phones()
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (cleanPhones.length === 0) {
      this.saveError.set('يرجى إضافة رقم هاتف واحد على الأقل للمدرسة');
      return;
    }

    this.saving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set(null);

    const payload: any = {
      name: cleanNameAr,
      name_ar: cleanNameAr,
      name_en: this.nameEn().trim(),
      email: this.email().trim(),
      address: this.address().trim(),
      phone_number: cleanPhones[0],
      phone: cleanPhones[0],
      phones: cleanPhones,
      whatsapp: this.whatsapp().trim(),
      address_short: this.streetSquare().trim() || 'أركويت - شارع الفردوس - مربع 54',
    };

    // إضافة الشعار في حالة رفعه أو تغييره
    if (this.logoDataUrl() !== null) {
      payload.logo = this.logoDataUrl();
    }

    // ختم الإدارة العامة
    if (this.stampDataUrl() !== null) {
      payload.stamp = this.stampDataUrl();
    }

    // ختم الإدارة المالية
    if (this.stampFinanceDataUrl() !== null) {
      payload.stamp_finance = this.stampFinanceDataUrl();
    }

    // ختم الشؤون الأكاديمية
    if (this.stampAcademicDataUrl() !== null) {
      payload.stamp_academic = this.stampAcademicDataUrl();
    }

    this.tenantService.updateTenantSettings(payload).subscribe({
      next: (updatedTenant) => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        this.populateFromTenant(updatedTenant);
        // التمرير لأعلى الصفحة لمشاهدة رسالة النجاح
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err?.error?.detail || err?.message || 'حدث خطأ أثناء حفظ الإعدادات، يرجى المحاولة ثانية');
      }
    });
  }
}
