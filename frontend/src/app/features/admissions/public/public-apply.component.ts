import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdmissionsService } from '../admissions.service';
import { CommunicationsService } from '../../communications/communications.service';
import { NbStepperComponent } from '../../../shared/nebras/nb-stepper.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { ApplicantPrintModalComponent } from '../shared/applicant-print-modal.component';

interface Option { id: string; name: string; }

interface ExtendedPublicForm {
  [key: string]: any;
  arabic_full_name: string;
  english_full_name: string;
  gender: string;
  date_of_birth: string;
  birth_place: string;
  nationality: string;
  national_id: string;
  passport_number: string;
  religion: string;
  blood_group: string;
  special_needs: string;
  previous_school: string;
  previous_grade: string;
  previous_grade_score: string;
  academic_year_id: string;
  applying_grade_id: string;

  // الأشقاء
  has_siblings: boolean;
  siblings_section: string;
  siblings_count: number;
  siblings_details: string;

  // الحالة الصحية والاجتماعية
  has_health_issues: boolean;
  health_issues_details: string;
  has_social_issues: boolean;
  social_issues_details: string;
  resides_with: string;
  transport_mode: string;
  study_dependence: string;

  // اللوائح
  agreed_to_admin_rules: boolean;
  agreed_to_academic_rules: boolean;
  agreed_to_org_rules: boolean;
  agreed_to_mobile_policy: boolean;
}

interface ExtendedGuardianForm {
  [key: string]: any;
  relationship: string;
  full_name: string;
  phone: string;
  phone2: string;
  whatsapp_phone: string;
  email: string;
  national_id: string;
  occupation: string;
  address: string;
  building_number: string;
  work_address: string;

  mother_phone: string;
  mother_proxy_name: string;

  emergency_contact_name: string;
  emergency_contact_relation: string;
  emergency_contact_phone: string;
  emergency_contact_address: string;
}

/**
 * بوابة التسجيل الإلكتروني العامة — المورد الجديدة للتعليم الخاص (Nebras OS ERP).
 * معالج متعدد الخطوات (6 خطوات) يغطي كافة تفاصيل الاستمارة الورقية الرسمية،
 * واللوائح الإدارية والأكاديمية والتنظيمية، وتعهّدات أولياء الأمور.
 */
@Component({
  selector: 'app-public-apply',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    NbStepperComponent,
    NbDatepickerComponent,
    ApplicantPrintModalComponent
  ],
  template: `
    <div class="portal" dir="rtl">
      <header class="portal-top">
        <a class="brand" routerLink="/welcome" aria-label="الصفحة الرئيسية للموقع">
          <div class="logo-mark">ن</div>
          <div class="brand-title">{{ tenantName() || 'المورد الجديدة للتعليم الخاص' }} <span>· بوابة القبول والتسجيل</span></div>
        </a>
        <a routerLink="/apply/track" class="track-link">تتبّع طلب سابق ←</a>
      </header>

      <main class="portal-main">
        @if (loadingConfig()) {
          <div class="card centered"><div class="spinner"></div><p>جارٍ تحميل استمارة التسجيل والقبول…</p></div>
        } @else if (!isOpen()) {
          <!-- باب التسجيل مغلق -->
          <div class="card centered closed">
            <div class="lock">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
            </div>
            <h1>باب التسجيل مغلق حاليًا</h1>
            <p>{{ closedMessage() || 'سيُفتح باب القبول والتسجيل في المواعيد التي تعلنها المدرسة. يرجى المتابعة لاحقًا.' }}</p>
            @if (contactPhone() || contactEmail()) {
              <div class="contact">للاستفسار: @if (contactPhone()) { <b>{{ contactPhone() }}</b> } @if (contactEmail()) { <span>{{ contactEmail() }}</span> }</div>
            }
            <a routerLink="/apply/track" class="btn ghost">تتبّع طلب سابق</a>
          </div>
        } @else if (submitted(); as result) {
          <!-- شاشة النجاح -->
          <div class="card success">
            <div class="check-lg">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg>
            </div>
            <h1>تم استلام طلب التسجيل بنجاح</h1>
            <p>احتفظ برقم الطلب التالي لمتابعة حالة القبول والتسجيل:</p>
            <div class="app-num">{{ result.application_number }}</div>
            <p class="success-hint">تم حفظ وتجهيز ملف الطالب وربطه ببوابة ولي الأمر المعتمدة.</p>
            <div class="success-actions">
              <button class="btn primary" (click)="showPrintModal.set(true)">
                🖨️ معاينة وتدقيق الاستمارة الورقية الرسمية
              </button>
              <a [routerLink]="['/apply/track']" [queryParams]="{ n: result.application_number }" class="btn ghost">تتبّع حالة الطلب</a>
              <button class="btn ghost" (click)="reset()">تقديم طلب آخر</button>
            </div>
          </div>
        } @else {
          <div class="card main-form-card">
            <div class="portal-header-box">
              <h1 class="portal-h1">إستمارة التسجيل والقبول — المرحلة الإبتدائية</h1>
              <p class="portal-sub">المورد الجديدة للتعليم الخاص (بنين - بنات) · أكمال الخطوات لتقديم الطلب بشكل إلكتروني موثوق.</p>
            </div>

            <nb-stepper [steps]="stepLabels" [current]="step()"></nb-stepper>

            @if (error()) { <div class="alert err" role="alert">{{ error() }}</div> }

            <!-- 1) البيانات الشخصية للتلميذ + الأشقاء -->
            @if (step() === 1) {
              <div class="step-pane">
                <div class="pane-title">أ / البيانات الشخصية للتلميذ</div>
                <div class="grid">
                  <div class="fld req wide-2"><label>اسم التلميذ رباعياً (عربي)</label><input [(ngModel)]="a.arabic_full_name" placeholder="مثال: أحمد محمد عبد الرحمن علي" /></div>
                  <div class="fld"><label>اسم التلميذ (إنجليزي)</label><input [(ngModel)]="a.english_full_name" placeholder="Ahmed Mohamed Ali" /></div>
                  
                  <div class="fld req"><label>الجنس</label>
                    <select [(ngModel)]="a.gender" (change)="onGenderChange()">
                      <option value="">اختر…</option>
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </div>

                  <div class="fld req"><label>المدرسة المستهدفة (الفرع)</label>
                    <select [(ngModel)]="a['target_school_type']">
                      <option value="boys">مدرسة البنين</option>
                      <option value="girls">مدرسة البنات</option>
                    </select>
                  </div>

                  <div class="fld req"><label>تاريخ الميلاد</label>
                    <nb-datepicker [(value)]="a.date_of_birth" ariaLabel="تاريخ الميلاد"></nb-datepicker>
                  </div>

                  <div class="fld"><label>مكان الميلاد</label><input [(ngModel)]="a.birth_place" placeholder="الخرطوم / أم درمان / ..." /></div>

                  <div class="fld req"><label>الجنسية</label><input [(ngModel)]="a.nationality" placeholder="سوداني" /></div>
                  <div class="fld req"><label>الرقم الوطني</label><input inputmode="numeric" [(ngModel)]="a.national_id" placeholder="للطلاب السودانيين (11 رقم)" /></div>
                  <div class="fld"><label>رقم الجواز (لغير السودانيين)</label><input [(ngModel)]="a.passport_number" placeholder="رقم الجواز" /></div>

                  <div class="fld"><label>الديانة</label><input [(ngModel)]="a.religion" placeholder="مسلم" /></div>
                  <div class="fld"><label>فصيلة الدم</label><input [(ngModel)]="a.blood_group" placeholder="O+ / A+ / ..." /></div>

                  <div class="fld req"><label>العام الدراسي</label>
                    <select [(ngModel)]="a.academic_year_id">
                      <option value="">اختر العام…</option>
                      @for (y of years(); track y.id) { <option [value]="y.id">{{ y.name }}</option> }
                    </select>
                  </div>

                  <div class="fld req"><label>الصف المتقدَّم له</label>
                    <select [(ngModel)]="a.applying_grade_id">
                      <option value="">اختر الصف…</option>
                      @for (g of grades(); track g.id) {
                        <option [value]="g.id" [disabled]="g.is_full">
                          {{ g.name }}{{ g.is_full ? ' — مكتمل' : (g.remaining != null ? ' — متبقٍ ' + g.remaining + ' مقعد' : '') }}
                        </option>
                      }
                    </select>
                  </div>
                </div>

                <!-- الأشقاء بالمورد النموذجية -->
                <div class="sub-card">
                  <div class="sub-head">الأشقاء المسجلين في المدرسة</div>
                  <div class="grid">
                    <div class="fld wide">
                      <label class="chk-label">
                        <input type="checkbox" [(ngModel)]="a.has_siblings" />
                        <span>هل للتلميذ أشقاء بالمورد النموذجية؟</span>
                      </label>
                    </div>

                    @if (a.has_siblings) {
                      <div class="fld"><label>القسم</label>
                        <select [(ngModel)]="a.siblings_section">
                          <option value="إبتدائي">إبتدائي</option>
                          <option value="متوسط">متوسط</option>
                          <option value="ثانوي">ثانوي</option>
                        </select>
                      </div>

                      <div class="fld"><label>عددهم</label>
                        <input type="number" min="1" max="10" [(ngModel)]="a.siblings_count" />
                      </div>

                      <div class="fld wide"><label>تفاصيل الأشقاء (الاسم / الرقم الوطني / الصف)</label>
                        <input [(ngModel)]="a.siblings_details" placeholder="مثال: خالد محمد (الصف الرابع)، سارة محمد (الصف الثاني)" />
                        <p class="hint">سيتم ربط بيانات الأشقاء تلقائيًا بملف الأسرة في النظام وبوابة ولي الأمر.</p>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- 2) ولي الأمر والشخص البديل -->
            @if (step() === 2) {
              <div class="step-pane">
                <div class="pane-title">بيانات ولي الأمر والشخص البديل للطوارئ</div>
                
                <div class="sub-card">
                  <div class="sub-head">بيانات ولي الأمر الرئيسي</div>
                  <div class="grid">
                    <div class="fld req"><label>صلة القرابة</label>
                      <select [(ngModel)]="g.relationship">
                        <option value="father">أب</option>
                        <option value="mother">أم</option>
                        <option value="guardian">ولي أمر</option>
                        <option value="sponsor">كفيل</option>
                      </select>
                    </div>

                    <div class="fld req wide-2"><label>اسم ولي الأمر رباعياً</label><input [(ngModel)]="g.full_name" placeholder="اسم ولي الأمر كاملاً" /></div>

                    <div class="fld req"><label>الرقم الوطني لولي الأمر <span class="lbl-sub">(هام لربط بوابة ولي الأمر)</span></label>
                      <input inputmode="numeric" [(ngModel)]="g.national_id" placeholder="الرقم الوطني لولي الأمر" />
                    </div>

                    <div class="fld req"><label>رقم هاتف ولي الأمر (1)</label><input inputmode="tel" [(ngModel)]="g.phone" placeholder="09xxxxxxx" /></div>
                    <div class="fld"><label>رقم هاتف ولي الأمر (2)</label><input inputmode="tel" [(ngModel)]="g.phone2" placeholder="01xxxxxxx" /></div>
                    <div class="fld req wide">
                      <label>رقم واتساب المتابعة المدرسية <span class="lbl-sub">(مفتاح الدولة + رقم المتابعة لربطه بالرسائل)</span></label>
                      <div class="phone-with-country">
                        <select [(ngModel)]="whatsappCountryCode" (change)="updateFullWhatsappNumber()" class="country-select" title="اختر دولة ومفتاح الواتساب">
                          <option value="+249" selected>🇸🇩 السودان (+249)</option>
                          <option value="+966">🇸🇦 السعودية (+966)</option>
                          <option value="+20">🇪🇬 مصر (+20)</option>
                          <option value="+971">🇦🇪 الإمارات (+971)</option>
                          <option value="+974">🇶🇦 قطر (+974)</option>
                          <option value="+968">🇴🇲 عمان (+968)</option>
                          <option value="+965">🇰🇼 الكويت (+965)</option>
                          <option value="+973">🇧🇭 البحرين (+973)</option>
                          <option value="+962">🇯🇴 الأردن (+962)</option>
                          <option value="+90">🇹🇷 تركيا (+90)</option>
                          <option value="+44">🇬🇧 المملكة المتحدة (+44)</option>
                          <option value="+1">🇺🇸 أمريكا / كندا (+1)</option>
                        </select>
                        <input inputmode="tel" [(ngModel)]="whatsappBody" (input)="updateFullWhatsappNumber()" placeholder="مثال: 912345678" class="phone-body" />
                      </div>
                      @if (whatsappError()) {
                        <span class="val-err">{{ whatsappError() }}</span>
                      } @else if (g.whatsapp_phone) {
                        <span class="val-ok">✓ الرقم الدولي المعتمد لرسائل الواتساب: <b>{{ g.whatsapp_phone }}</b></span>
                      }
                    </div>

                    <div class="fld"><label>المهنة</label><input [(ngModel)]="g.occupation" placeholder="المهنة أو الوظيفة" /></div>
                    <div class="fld wide-2"><label>عنوان عمل ولي الأمر</label><input [(ngModel)]="g.work_address" placeholder="اسم الجهة أو عنوان العمل" /></div>

                    <div class="fld wide-2"><label>السكن / الحي</label><input [(ngModel)]="g.address" placeholder="المنطقة - الحي - الشارع" /></div>
                    <div class="fld"><label>رقم العمارة / المنزل</label><input [(ngModel)]="g.building_number" placeholder="رقم المنزل أو الشقة" /></div>
                    <div class="fld wide"><label>البريد الإلكتروني</label><input type="email" [(ngModel)]="g.email" placeholder="example@domain.com" /></div>

                    <div class="fld wide"><label>رقم هاتف والدة التلميذ (أو من ينوب عنها وصفتها)</label>
                      <div class="dual-inputs">
                        <input inputmode="tel" [(ngModel)]="g.mother_phone" placeholder="هاتف الأم: 09xxxxxxx" />
                        <input [(ngModel)]="g.mother_proxy_name" placeholder="صفة من ينوب عنها (إن وجد)" />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- في حالة عدم وجود ولي الأمر (البديل الطارئ) -->
                <div class="sub-card alert-border">
                  <div class="sub-head warn-text">في حالة عدم وجود ولي الأمر (يمكن الرجوع للبديل التالي في حالة الغياب)</div>
                  <div class="grid">
                    <div class="fld wide-2"><label>اسم الشخص البديل</label><input [(ngModel)]="g.emergency_contact_name" placeholder="الاسم الكامل للشخص البديل" /></div>
                    <div class="fld"><label>صلة القرابة</label><input [(ngModel)]="g.emergency_contact_relation" placeholder="عم / خال / جد / ..." /></div>
                    <div class="fld"><label>رقم الهاتف</label><input inputmode="tel" [(ngModel)]="g.emergency_contact_phone" placeholder="رقم هاتف البديل" /></div>
                    <div class="fld wide-2"><label>عنوان البديل</label><input [(ngModel)]="g.emergency_contact_address" placeholder="عنوان السكن للشخص البديل" /></div>
                  </div>
                </div>
              </div>
            }

            <!-- 3) البيانات الصحية والاجتماعية والمناخ الأسرية -->
            @if (step() === 3) {
              <div class="step-pane">
                <div class="pane-title">البيانات الصحية والاجتماعية والترحيل</div>

                <div class="sub-card">
                  <div class="sub-head">الحالة الصحية للتلميذ <span class="lbl-sub">(تُربط بملف العيادة المدرسية)</span></div>
                  <div class="grid">
                    <div class="fld wide">
                      <label class="chk-label">
                        <input type="checkbox" [(ngModel)]="a.has_health_issues" />
                        <span>هل يعاني التلميذ من أي مشاكل أو ظروف صحية؟</span>
                      </label>
                    </div>

                    @if (a.has_health_issues) {
                      <div class="fld wide">
                        <label>تفاصيل الحالة الصحية والأدوية أو الحساسية</label>
                        <textarea rows="2" [(ngModel)]="a.health_issues_details" placeholder="توضيح الحالة الصحية، الأدوية، أو الإجراء المطلوب من العيادة المدرسية..."></textarea>
                      </div>
                    }
                  </div>
                </div>

                <div class="sub-card">
                  <div class="sub-head">الحالة الاجتماعية والمناخ الأسرية</div>
                  <div class="grid">
                    <div class="fld wide">
                      <label class="chk-label">
                        <input type="checkbox" [(ngModel)]="a.has_social_issues" />
                        <span>هل يعاني التلميذ من أي ظروف أو مشاكل اجتماعية؟</span>
                      </label>
                    </div>

                    @if (a.has_social_issues) {
                      <div class="fld wide">
                        <label>تفاصيل الظروف الاجتماعية</label>
                        <textarea rows="2" [(ngModel)]="a.social_issues_details" placeholder="يرجى كتابة التفاصيل لإحاطة الإدارة والإرشاد الاجتماعي..."></textarea>
                      </div>
                    }

                    <div class="fld req"><label>التلميذ يقيم مع</label>
                      <select [(ngModel)]="a.resides_with">
                        <option value="parents">الأم والأب</option>
                        <option value="father">الأب</option>
                        <option value="mother">الأم</option>
                        <option value="other">أخرى (كفيل / أقارب)</option>
                      </select>
                    </div>

                    <div class="fld req"><label>وسيلة ترحيل التلميذ <span class="lbl-sub">(تُربط بالنقل)</span></label>
                      <select [(ngModel)]="a.transport_mode">
                        <option value="school">ترحيل المدرسة الرسمي</option>
                        <option value="private">ترحيل خاص</option>
                        <option value="public">المواصلات العامة</option>
                        <option value="walking">الأقدام</option>
                      </select>
                    </div>

                    <div class="fld req"><label>يعتمد التلميذ في المذاكرة على</label>
                      <select [(ngModel)]="a.study_dependence">
                        <option value="self">نفسه</option>
                        <option value="other">غيره (مدرس / ولي الأمر / دروس خاصة)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- 4) الدراسة السابقة والمستندات المطلوبة -->
            @if (step() === 4) {
              <div class="step-pane">
                <div class="pane-title">ب / المؤهل الأكاديمي السابق والمستندات المطلوبة</div>

                <div class="sub-card">
                  <div class="sub-head">السجل الأكاديمي السابق</div>
                  <div class="grid">
                    <div class="fld wide-2"><label>المدرسة الابتدائية / الروضة التي درس بها التلميذ سابقاً</label>
                      <input [(ngModel)]="a.previous_school" placeholder="اسم المدرسة أو الروضة السابقة" />
                    </div>

                    <div class="fld"><label>الصف السابق</label><input [(ngModel)]="a.previous_grade" placeholder="مثال: الروضة / الصف الثالث" /></div>
                    <div class="fld"><label>النسبة / التقدير</label><input [(ngModel)]="a.previous_grade_score" placeholder="مثال: 95% / ممتاز" /></div>

                    <div class="fld wide"><label>احتياجات خاصة / ملاحظات أكاديمية أخرى</label>
                      <textarea rows="2" [(ngModel)]="a.special_needs" placeholder="أي ملاحظات أكاديمية أو سلوكية يود ولي الأمر توضيحها..."></textarea>
                    </div>
                  </div>
                </div>

                <!-- المستندات المطلوبة وتجهيز الرفع -->
                <div class="sub-card">
                  <div class="sub-head">ج / المستندات المطلوبة للإرفاق والتسليم</div>
                  <p class="sub-hint">يمكن رفع الصور والشهادات الممسوحة ضوئياً الآن، أو تسليم أصل المستندات بمقر المدرسة خلال أسبوعين من تقديم الطلب:</p>

                  <div class="docs-grid">
                    <div class="doc-upload-box">
                      <div class="doc-icon">🖼️</div>
                      <div class="doc-title">1. صورتين فوتوغرافيتين للتلميذ</div>
                      <div class="doc-desc">صورة شمسية حديثة خلفية بيضاء</div>
                      <input type="file" accept="image/*" class="file-inp" id="doc1" (change)="onFileSelect($event, 'photos')" />
                      <label for="doc1" class="btn-upload">اختيار صورة...</label>
                    </div>

                    <div class="doc-upload-box">
                      <div class="doc-icon">📜</div>
                      <div class="doc-title">2. الشهادة الأكاديمية السابقة</div>
                      <div class="doc-desc">شهادة الروضة أو آخر صف دراسي</div>
                      <input type="file" accept="image/*,.pdf" class="file-inp" id="doc2" (change)="onFileSelect($event, 'academic')" />
                      <label for="doc2" class="btn-upload">اختيار الملف...</label>
                    </div>

                    <div class="doc-upload-box">
                      <div class="doc-icon">🆔</div>
                      <div class="doc-title">3. صورة من الرقم الوطني / القيد</div>
                      <div class="doc-desc">صورة القيد الوطني للتلميذ</div>
                      <input type="file" accept="image/*,.pdf" class="file-inp" id="doc3" (change)="onFileSelect($event, 'national_id')" />
                      <label for="doc3" class="btn-upload">اختيار الملف...</label>
                    </div>

                    <div class="doc-upload-box">
                      <div class="doc-icon">🪪</div>
                      <div class="doc-title">4. إثبات شخصية ولي الأمر</div>
                      <div class="doc-desc">صورة الرقم الوطني أو جواز ولي الأمر</div>
                      <input type="file" accept="image/*,.pdf" class="file-inp" id="doc4" (change)="onFileSelect($event, 'guardian_id')" />
                      <label for="doc4" class="btn-upload">اختيار الملف...</label>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- 5) اللوائح المدرسية والتعهدات الرسمية -->
            @if (step() === 5) {
              <div class="step-pane">
                <div class="pane-title">اللوائح المدرسية والتعهدات والضوابط</div>
                <p class="pane-sub">يرجى الاطلاع التام على كافة اللوائح التنظيمية والإدارية والأكاديمية المعتمدة بمدرسة المورد الجديدة:</p>

                <!-- التبويب التفاعلي للوائح -->
                <div class="rules-tabs">
                  <button type="button" [class.active]="activeTab === 'admin'" (click)="activeTab = 'admin'">1. اللائحة الإدارية (24 بنداً)</button>
                  <button type="button" [class.active]="activeTab === 'academic'" (click)="activeTab = 'academic'">2. اللائحة الأكاديمية (13 بنداً)</button>
                  <button type="button" [class.active]="activeTab === 'org'" (click)="activeTab = 'org'">3. اللائحة التنظيمية (10 بنود)</button>
                  <button type="button" [class.active]="activeTab === 'mobile'" (click)="activeTab = 'mobile'">4. تعهد الهواتف والأجهزة</button>
                </div>

                <div class="rules-content-box">
                  @if (activeTab === 'admin') {
                    <div class="rules-scroll">
                      <ol class="rules-list">
                        <li>الإلتزام بالزي المدرسي المحّدد .</li>
                        <li>يجب أن يكون الحذاء مغلقاً.</li>
                        <li>الإلتزام بالسلوك الحسن داخل وخارج حرم المدرسة .</li>
                        <li>الإلتزام بالجدول اليومي وعدم البقاء خارج الفصل أثناء الحصص .</li>
                        <li>المشاركة في النشاطات المصاحبة للمدرسة. وفي حالة الإعتذار على ولي الأمر تقديم أمر إقناع مسبق.</li>
                        <li>البقاء خارج مبنى المدرسة أثناء اليوم الدراسي أو نهاية الدوام لأي سبب من الأسباب يؤدي إلى المساءلة.</li>
                        <li>إخطار إدارة المدرسة في حالة تغير أرقام الهواتف أو وسيلة الحضور للمدرسة أو الإنصراف منها.</li>
                        <li>لبس البنطلون الغير لائق (خاص بقسم البنين) أو وضع الحناء أو إطالة الأظافر أو طلاءها أو قص الشعر بصورة غير لائقة يحرم الطالب من الحضور إلى حين زوال المخالفة. وفي حالة التكرار يفصل الطالب نهائياً.</li>
                        <li>عدم استخدام الحُلي + الختم + الأقراط + السلاسل والطاقية وغيرها (العقوبة: تُؤخذ وتسلم لولي الأمر بنهاية العام مع إنذار أول بالفصل).</li>
                        <li>يمنع منعاً باتاً حضور التلميذ للمدرسة بالدراجات البخارية أو السيارات مهما كانت الأسباب.</li>
                        <li>التعامل الإداري بالمدرسة يتم مع ولي الأمر المسجل في الاستمارة فقط أو من ينوب عنه بعد تحديده كتابةً.</li>
                        <li>السلوك غير اللائق من التلميذ تجاه المعلمين أو العاملين أو زملائه يؤدي إلى إنذار نهائي بالفصل في طابور صباحي واستدعاء ولي الأمر.</li>
                        <li>في حالة عدم مقدرة ولي الأمر المسجل التعامل مع إدارة المدرسة يسمي من ينوب عنه كتابةً.</li>
                        <li>فترة الترحيل تبدأ من بداية العام الدراسي إلى آخر يوم في امتحانات الفترة الأخيرة للصف الخامس.</li>
                        <li>تعتبر الرسائل المرسلة في قروب الواتساب الخاص بالمدرسة ملزمة لإدارة المدرسة وولي أمر التلميذ.</li>
                      </ol>
                    </div>
                  } @else if (activeTab === 'academic') {
                    <div class="rules-scroll">
                      <ol class="rules-list">
                        <li>تعمل المدرسة حسب التقويم المتفق عليه.</li>
                        <li>يتعهد ولي الأمر والتلميذ بالتعاون مع إدارة المدرسة بالحضور متى ما طلب ذلك وعدم التأخر في متابعة وحل المشاكل الأكاديمية.</li>
                        <li>الاالتزام بالمتابعة داخل الحصص والاالتزام التام بتوجيه المعلم والإشراف مع إحضار أي وسيلة لتحقيق ذلك من كراسات وكتب وأدوات.</li>
                        <li>الاالتزام بتصحيح الكراسات بانتظام.</li>
                        <li>حل أوراق العمل أو غيره من الوسائل المعمول بها لتطوير الأداء الأكاديمي إجبارياً.</li>
                        <li>عدم تطور التلميذ أكاديمياً وتنفيذ البرامج يتوجب استدعاء ولي الأمر وفي حالة التكرار تتخذ الإدارة ما تراه مناسباً.</li>
                        <li>يجلس التلميذ للملحق في حالة الرسوب لأي مادة ويبقى للإعادة متى ما رأت الإدارة ذلك.</li>
                        <li>أوراق العمل المرسلة في القروبات ملزمة للتلميذ متى ما طُلب إحضارها مطبوعة.</li>
                        <li><b>تعهد المستندات:</b> التزام ولي الأمر بإحضار أصل شهادة الروضة/الابتدائية + صورة القيد الوطني + إثبات شخصية ولي الأمر خلال أسبوعين من ملء الاستمارة.</li>
                        <li>يجب معادلة الشهادات الأجنبية من خارج السودان من مكتب امتحانات السودان وتحمل ولي الأمر تبعات ذلك.</li>
                      </ol>
                    </div>
                  } @else if (activeTab === 'org') {
                    <div class="rules-scroll">
                      <ol class="rules-list">
                        <li>الطابور الصباحي (حسب التوقيت) يعتبر حصة إجبارية.</li>
                        <li>تأخير ولي الأمر أو من ينوب عنه أكثر من ثلث ساعة من نهاية الدوام لاستلام التلميذ يسبب إزعاجاً لإدارة المدرسة ويجب الحرص على الحضور عقب اليوم الدراسي مباشرة.</li>
                        <li>في حالة الغياب يلتزم ولي الأمر بإرسال رسالة في قروب الواتساب المخصص لمتابعة الغياب قبل الساعة التاسعة صباحاً في نفس يوم الغياب.</li>
                        <li>في حالة الغياب بسبب المرض يجب استلام أورنيك مرضي من المدرسة ولا تقبل أي مستندات إلا المعتمدة من الطبيب المختص.</li>
                        <li>على ولي الأمر عدم استخدام آلة التنبيه (البوري) وخاصة أمام بوابة المدرسة، وقيادة السيارة بسرعة مناسبة.</li>
                        <li>على أولياء الأمور الإلتزام التام بتوجيهات المعلمين والمشرفين عند دخول التلاميذ وخاصة عند الخروج نهاية اليوم الدراسي أمام البوابة الرئيسية.</li>
                      </ol>
                    </div>
                  } @else if (activeTab === 'mobile') {
                    <div class="rules-scroll highlight-rules">
                      <h3>تعهد حظر الهاتف النقال والتصوير والألعاب :</h3>
                      <p>في حالة إحضار أو استخدام الهاتف النقال (الموبايل) أو كاميرا التصوير أو أحضار الألعاب المختلفة بمباني المدرسة:</p>
                      <div class="penalty-box">
                        <b>العقوبة المعتمدة:</b> يُؤخذ الهاتف/الجهاز ويتم بيعه لصالح المنظمات الخيرية بعلم ولي الأمر + إنذار نهائي بالفصل من المدرسة والإيقاف عن الدراسة لمدة ثلاثة أيام.
                      </div>
                    </div>
                  }
                </div>

                <!-- الإقرارات والتعهدات الستة الإجبارية -->
                <div class="sub-card pledges-box">
                  <div class="sub-head">التعهد والإقرار الإلكتروني (تأكيد ولي الأمر)</div>
                  
                  <label class="pledge-item">
                    <input type="checkbox" [(ngModel)]="a.agreed_to_admin_rules" />
                    <span>أقرّ وأتعهد بالإطلاع والموافقة الكاملة على جميع اللوائح الإدارية والتنظيمية والأكاديمية للمدرسة.</span>
                  </label>

                  <label class="pledge-item">
                    <input type="checkbox" [(ngModel)]="a.agreed_to_academic_rules" />
                    <span>أتعهد بالتعاون التام مع إدارة المدرسة والمتابعة الأكاديمية والتصحيح وتزويد التلميذ بالكراسات والمطبوعات.</span>
                  </label>

                  <label class="pledge-item">
                    <input type="checkbox" [(ngModel)]="a.agreed_to_mobile_policy" />
                    <span>أتعهد بعدم السماح للتلميذ بإحضار الهواتف النقالة أو الكاميرات أو الألعاب وأتحمل عقوبة المصادرة والإيقاف الواردة باللائحة.</span>
                  </label>

                  <label class="pledge-item">
                    <input type="checkbox" [(ngModel)]="a.agreed_to_org_rules" />
                    <span>أقر بصحة وسلامة كافة البيانات الصحية والاجتماعية وسكن ولي الأمر والبديل المدخلة في هذه الاستمارة وأتحمل كافة تبعاتها.</span>
                  </label>
                </div>
              </div>
            }

            <!-- 6) الرسوم الدراسية والمراجعة والمعاينة الرسمية -->
            @if (step() === 6) {
              <div class="step-pane">
                <div class="pane-title">د / الرسوم الدراسية ومراجعة الطلب النهائية</div>

                <!-- الشروط والرسوم الدراسية -->
                <div class="sub-card financial-card">
                  <div class="sub-head">الرسوم الدراسية وجدول السداد المعتمد (2025 - 2026)</div>
                  <div class="fin-details">
                    <div class="fin-row"><span>رسوم التسجيل (إدارية وحكومية ولا تشمل الزي والكتب):</span><b>200,000 جنيه</b></div>
                    <div class="fin-row"><span>الرسوم الدراسية الإجمالية للسنة:</span><b>500,000 جنيه</b></div>
                    <div class="fin-schedule">
                      <div class="sch-item">
                        <span class="sch-num">1</span>
                        <div class="sch-text"><b>القسط الأول (عند التسجيل):</b> رسوم التسجيل 200,000 جنيه + القسط الأول 300,000 جنيه = <b>500,000 جنيه</b>.</div>
                      </div>
                      <div class="sch-item">
                        <span class="sch-num">2</span>
                        <div class="sch-text"><b>القسط الثاني:</b> يدفع مبلغ <b>200,000 جنيه</b> بعد شهرين من بداية العام الدراسي.</div>
                      </div>
                    </div>
                    <ul class="fin-notes">
                      <li>لا ترد رسوم التسجيل بعد سدادها إطلاقاً.</li>
                      <li>تخصم المدرسة (300,000 جنيه) رسوم تسجيل + إجراءات في حالة ترك التلميذ المدرسة أو فصله خلال الأسبوع الأول.</li>
                      <li>لا ترد الرسوم الدراسية (القسط الأول) بعد إكمال الأسبوع الأول من الدراسة.</li>
                      <li>تُنشأ القيود الحسابية والربط المباشر مع الشؤون المالية عند اعتماد التسجيل النهائي للطالب.</li>
                    </ul>
                  </div>
                </div>

                <!-- مراجعة البيانات الشاملة -->
                <div class="sub-card">
                  <div class="sub-head">ملخص مراجعة البيانات قبل الإرسال</div>
                  <div class="rev-grid">
                    <div><span>اسم التلميذ</span><b>{{ a.arabic_full_name || '—' }}</b></div>
                    <div><span>الجنس / تاريخ الميلاد</span><b>{{ a.gender === 'male' ? 'ذكر' : 'أنثى' }} · {{ a.date_of_birth }}</b></div>
                    <div><span>مكان الميلاد / الجنسية</span><b>{{ a.birth_place || '—' }} · {{ a.nationality }}</b></div>
                    <div><span>الرقم الوطني / الجواز</span><b>{{ a.national_id || a.passport_number || '—' }}</b></div>
                    <div><span>العام الدراسي / الصف</span><b>{{ yearName(a.academic_year_id) }} · {{ gradeName(a.applying_grade_id) }}</b></div>
                    <div><span>اسم ولي الأمر</span><b>{{ g.full_name || '—' }} ({{ relationshipLabel(g.relationship) }})</b></div>
                    <div><span>هاتف ولي الأمر / الواتس</span><b>{{ g.phone }} · {{ g.whatsapp_phone || g.phone }}</b></div>
                    <div><span>السكن / رقم العمارة</span><b>{{ g.address || '—' }} · {{ g.building_number || '—' }}</b></div>
                    <div><span>هاتف الأم</span><b>{{ g.mother_phone || '—' }}</b></div>
                    <div><span>الشخص البديل للطوارئ</span><b>{{ g.emergency_contact_name || '—' }} ({{ g.emergency_contact_phone || '—' }})</b></div>
                    <div><span>المشاكل الصحية / الاجتماعية</span><b>{{ a.has_health_issues ? 'يوجد' : 'لا يوجد' }} · {{ a.has_social_issues ? 'يوجد' : 'لا يوجد' }}</b></div>
                    <div><span>وسيلة الترحيل / المذاكرة</span><b>{{ transportLabel(a.transport_mode) }} · {{ a.study_dependence === 'other' ? 'غيره' : 'نفسه' }}</b></div>
                  </div>
                </div>

                <!-- زر معاينة الاستمارة الرسمية الورقية -->
                <div class="preview-official-bar">
                  <span>تتيح لك البوابة معاينة وتدقيق الاستمارة الورقية الرسمية المطابقة لمدرسة المورد قبل الاعتماد النهائي:</span>
                  <button type="button" class="btn btn-outline" (click)="showPrintModal.set(true)">
                    📄 معاينة الاستمارة الرسمية (PDF / طباعة)
                  </button>
                </div>
              </div>
            }

            <!-- أزرار التنقل بين الخطوات -->
            <div class="nav-bar">
              @if (step() > 1) {
                <button type="button" class="btn ghost" (click)="back()">← الخطوة السابقة</button>
              }
              <span class="spacer"></span>
              @if (step() < 6) {
                <button type="button" class="btn primary" (click)="next()" [disabled]="!stepValid()">
                  التالي (الخطوة {{ step() + 1 }}) →
                </button>
              } @else {
                <button type="button" class="btn primary btn-submit" (click)="submit()" [disabled]="saving() || !stepValid()">
                  {{ saving() ? 'جارٍ حفظ وإرسال الاستمارة…' : 'إرسال واستكمال تسجيل الطالب 🚀' }}
                </button>
              }
            </div>
          </div>
        }
      </main>

      <!-- مودال المعاينة والطباعة الرسمية الورقية -->
      @if (showPrintModal()) {
        <app-applicant-print-modal
          [applicant]="a"
          [guardian]="g"
          [academicYear]="yearName(a.academic_year_id)"
          [gradeName]="gradeName(a.applying_grade_id)"
          (close)="showPrintModal.set(false)"
        ></app-applicant-print-modal>
      }
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--nb-bg, #f8fafc); }
    .portal { min-height: 100vh; display: flex; flex-direction: column; font-family: var(--nb-font-family, system-ui, sans-serif); }
    .portal-top { height: 64px; background: var(--nb-surface, #fff); border-bottom: 1px solid var(--nb-border, #e2e8f0); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; }
    .logo-mark { width: 34px; height: 34px; background: var(--nb-primary-600, #2563eb); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 16px; }
    .brand-title { font-size: 16px; font-weight: 800; color: var(--nb-text, #0f172a); }
    .brand-title span { color: var(--nb-primary-600, #2563eb); font-weight: 600; font-size: 14px; }
    .track-link { font-size: 13.5px; color: var(--nb-primary-600, #2563eb); text-decoration: none; font-weight: 700; background: var(--nb-primary-50, #eff6ff); padding: 6px 14px; border-radius: 6px; }
    
    .portal-main { flex: 1; display: flex; justify-content: center; align-items: flex-start; padding: 32px 16px; }
    .card { width: 100%; max-width: 880px; background: var(--nb-surface, #fff); border: 1px solid var(--nb-border, #e2e8f0); border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); }
    .card.centered { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 48px 28px; }
    
    .portal-header-box { margin-bottom: 24px; }
    .portal-h1 { font-size: 22px; font-weight: 800; margin: 0 0 6px; color: var(--nb-text, #0f172a); }
    .portal-sub { font-size: 13.5px; color: var(--nb-text-muted, #64748b); margin: 0; }
    
    .step-pane { animation: stepIn 240ms cubic-bezier(0.2, 0, 0, 1); margin-top: 24px; }
    @keyframes stepIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    
    .pane-title { font-size: 16px; font-weight: 700; color: var(--nb-primary-600, #2563eb); margin-bottom: 16px; border-bottom: 2px solid var(--nb-primary-50, #eff6ff); padding-bottom: 8px; }
    .pane-sub { font-size: 13px; color: var(--nb-text-secondary, #475569); margin: -8px 0 16px; }
    
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; align-items: end; }
    .fld { display: flex; flex-direction: column; justify-content: flex-end; gap: 6px; }
    .fld.wide { grid-column: 1 / -1; }
    .fld.wide-2 { grid-column: span 2; }
    @media (max-width: 640px) { .fld.wide-2 { grid-column: 1 / -1; } }
    
    .fld label { font-size: 12.5px; font-weight: 700; color: var(--nb-text, #1e293b); min-height: 24px; display: flex; align-items: flex-end; flex-wrap: wrap; gap: 4px; }
    .fld.req label::after { content: ' *'; color: #ef4444; }
    .lbl-sub { font-size: 11px; font-weight: 500; color: var(--nb-text-muted, #64748b); }
    
    .fld input, .fld select, .fld textarea { height: 42px; border: 1px solid var(--nb-border, #cbd5e1); border-radius: 8px; padding: 0 12px; font-size: 13.5px; color: var(--nb-text, #0f172a); background: var(--nb-surface, #fff); transition: border-color 150ms, box-shadow 150ms; outline: none; width: 100%; box-sizing: border-box; }
    .fld textarea { height: auto; padding: 10px 12px; resize: vertical; }
    .fld input:focus, .fld select:focus, .fld textarea:focus { border-color: var(--nb-primary-600, #2563eb); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15); }
    
    .hint { font-size: 12px; color: #64748b; margin: 4px 0 0; }
    .dual-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    
    .phone-with-country { display: grid; grid-template-columns: 180px 1fr; gap: 8px; direction: ltr; }
    @media (max-width: 520px) { .phone-with-country { grid-template-columns: 1fr; } }
    .country-select { height: 42px; border: 1px solid var(--nb-border, #cbd5e1); border-radius: 8px; padding: 0 8px; font-size: 13.5px; font-weight: 700; font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", var(--nb-font-family, system-ui, sans-serif); background: #f8fafc; color: #0f172a; outline: none; }
    .phone-body { height: 42px; border: 1px solid var(--nb-border, #cbd5e1); border-radius: 8px; padding: 0 12px; font-size: 13.5px; color: #0f172a; outline: none; direction: ltr; text-align: left; }
    .val-err { font-size: 11.5px; color: #ef4444; font-weight: 600; margin-top: 3px; }
    .val-ok { font-size: 11.5px; color: #16a34a; font-weight: 600; margin-top: 3px; }
    .val-ok b { direction: ltr; display: inline-block; letter-spacing: 0.5px; }
    
    .sub-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-top: 16px; }
    .sub-card.alert-border { border-color: #fde68a; background: #fffbeb; }
    .sub-head { font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 14px; }
    .sub-head.warn-text { color: #b45309; }
    .sub-hint { font-size: 12.5px; color: #64748b; margin: -6px 0 14px; }
    
    .chk-label, .pledge-item { display: flex; align-items: center; gap: 10px; font-size: 13.5px; font-weight: 600; color: #1e293b; cursor: pointer; }
    .chk-label input, .pledge-item input { width: 19px; height: 19px; accent-color: #2563eb; cursor: pointer; }
    
    .docs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
    .doc-upload-box { background: #fff; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 16px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .doc-icon { font-size: 28px; }
    .doc-title { font-size: 12.5px; font-weight: 700; color: #0f172a; }
    .doc-desc { font-size: 11px; color: #64748b; }
    .file-inp { display: none; }
    .btn-upload { margin-top: 6px; padding: 5px 12px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 11.5px; font-weight: 600; cursor: pointer; }
    
    /* اللوائح والتعهدات */
    .rules-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .rules-tabs button { padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; font-size: 12.5px; font-weight: 600; color: #475569; cursor: pointer; }
    .rules-tabs button.active { background: #2563eb; color: #fff; border-color: #2563eb; }
    .rules-content-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; max-height: 280px; overflow-y: auto; }
    .rules-list { margin: 0; padding-inline-start: 22px; display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #334155; line-height: 1.6; }
    .highlight-rules h3 { font-size: 14px; color: #b91c1c; margin: 0 0 8px; }
    .penalty-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; font-size: 13px; color: #991b1b; margin-top: 8px; }
    
    .pledges-box { display: flex; flex-direction: column; gap: 12px; background: #eff6ff; border-color: #bfdbfe; }
    
    /* الرسوم والمراجعة */
    .financial-card { background: #f0fdf4; border-color: #bbf7d0; }
    .fin-details { font-size: 13px; display: flex; flex-direction: column; gap: 10px; }
    .fin-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px; }
    .fin-row b { color: #166534; font-size: 14px; }
    .fin-schedule { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
    .sch-item { display: flex; gap: 10px; align-items: center; background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #bbf7d0; }
    .sch-num { width: 24px; height: 24px; background: #16a34a; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; }
    .fin-notes { margin: 6px 0 0; padding-inline-start: 20px; font-size: 12px; color: #15803d; }
    
    .rev-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
    .rev-grid > div { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
    .rev-grid span { font-size: 11px; color: #64748b; }
    .rev-grid b { font-size: 13px; color: #0f172a; }
    
    .preview-official-bar { margin-top: 20px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .btn-outline { background: #fff; border: 1.5px solid #2563eb; color: #2563eb; font-weight: 700; height: 40px; padding: 0 18px; border-radius: 8px; cursor: pointer; }
    .btn-outline:hover { background: #eff6ff; }
    
    .nav-bar { display: flex; align-items: center; margin-top: 32px; gap: 12px; }
    .spacer { flex: 1; }
    .btn { height: 44px; padding: 0 24px; border-radius: 8px; font-size: 13.5px; font-weight: 700; cursor: pointer; border: 1px solid transparent; display: inline-flex; align-items: center; justify-content: center; transition: all 150ms ease; }
    .btn.primary { background: #2563eb; color: #fff; }
    .btn.primary:hover { background: #1d4ed8; }
    .btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn.ghost { background: transparent; border-color: #cbd5e1; color: #334155; }
    
    .alert { font-size: 13px; border-radius: 8px; padding: 12px 16px; margin-top: 16px; }
    .alert.err { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    
    .success { text-align: center; }
    .check-lg, .lock { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
    .check-lg { background: #16a34a; color: #fff; }
    .lock { background: #fef3c7; color: #d97706; }
    .app-num { font-size: 26px; font-weight: 800; letter-spacing: 1.5px; color: #2563eb; background: #eff6ff; border-radius: 10px; padding: 14px 24px; margin: 12px auto; display: inline-block; }
    .success-hint { font-size: 13px; color: #475569; margin-bottom: 20px; }
    .success-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .spinner { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class PublicApplyComponent implements OnInit {
  private readonly svc = inject(AdmissionsService);

  readonly stepLabels = ['التلميذ والأشقاء', 'ولي الأمر والبديل', 'الصحية والترحيل', 'المستندات', 'اللوائح والتعهدات', 'الرسوم والمراجعة'];
  readonly step = signal(1);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly submitted = signal<{ application_number: string } | null>(null);
  readonly showPrintModal = signal(false);

  activeTab: 'admin' | 'academic' | 'org' | 'mobile' = 'admin';

  readonly loadingConfig = signal(true);
  readonly isOpen = signal(false);
  readonly tenantName = signal('');
  readonly terms = signal('');
  readonly closedMessage = signal('');
  readonly contactPhone = signal('');
  readonly contactEmail = signal('');
  readonly years = signal<Option[]>([]);
  readonly grades = signal<any[]>([]);

  uploadedFiles: Record<string, File> = {};

  a: ExtendedPublicForm = {
    target_school_type: 'boys',
    arabic_full_name: '',
    english_full_name: '',
    gender: '',
    date_of_birth: '',
    birth_place: '',
    nationality: 'سوداني',
    national_id: '',
    passport_number: '',
    religion: 'مسلم',
    blood_group: '',
    special_needs: '',
    previous_school: '',
    previous_grade: '',
    previous_grade_score: '',
    academic_year_id: '',
    applying_grade_id: '',
    has_siblings: false,
    siblings_section: 'إبتدائي',
    siblings_count: 1,
    siblings_details: '',
    has_health_issues: false,
    health_issues_details: '',
    has_social_issues: false,
    social_issues_details: '',
    resides_with: 'parents',
    transport_mode: 'school',
    study_dependence: 'self',
    agreed_to_admin_rules: false,
    agreed_to_academic_rules: false,
    agreed_to_org_rules: false,
    agreed_to_mobile_policy: false,
  };

  g: ExtendedGuardianForm = {
    relationship: 'father',
    full_name: '',
    phone: '',
    phone2: '',
    whatsapp_phone: '',
    email: '',
    national_id: '',
    occupation: '',
    address: '',
    building_number: '',
    work_address: '',
    mother_phone: '',
    mother_proxy_name: '',
    emergency_contact_name: '',
    emergency_contact_relation: '',
    emergency_contact_phone: '',
    emergency_contact_address: '',
  };

  ngOnInit(): void {
    this.svc.getPublicConfig().subscribe({
      next: (res) => {
        const d = res?.data ?? res ?? {};
        this.tenantName.set(d.tenant_name ?? '');
        this.isOpen.set(!!d.is_open);
        this.terms.set(d.terms ?? '');
        this.closedMessage.set(d.closed_message ?? '');
        this.contactPhone.set(d.contact_phone ?? '');
        this.contactEmail.set(d.contact_email ?? '');
        this.years.set((d.academic_years ?? []).map((y: any) => ({ id: y.id, name: y.name })));
        this.grades.set((d.grades ?? []).map((g: any) => ({ id: g.id, name: g.name, is_full: !!g.is_full, remaining: g.remaining ?? null })));
        const current = (d.academic_years ?? []).find((y: any) => y.current);
        if (current) this.a.academic_year_id = current.id;
        else if ((d.academic_years ?? []).length === 1) this.a.academic_year_id = d.academic_years[0].id;
        this.loadingConfig.set(false);
      },
      error: () => {
        this.loadingConfig.set(false);
        this.isOpen.set(false);
        this.error.set('تعذّر تحميل إعدادات التسجيل.');
      },
    });
  }

  whatsappCountryCode = '+249';
  whatsappBody = '';
  readonly whatsappError = signal('');

  updateFullWhatsappNumber(): void {
    let cleaned = (this.whatsappBody || '').trim().replace(/^0+/, '').replace(/\D/g, '');
    if (!cleaned) {
      this.g.whatsapp_phone = '';
      this.whatsappError.set('');
      return;
    }

    if (cleaned.length < 8 || cleaned.length > 12) {
      this.whatsappError.set('يرجى كتابة رقم هاتف صحيح يتكون من 8 إلى 11 خانة بدون صفر البداية.');
    } else {
      this.whatsappError.set('');
    }

    this.g.whatsapp_phone = `${this.whatsappCountryCode}${cleaned}`;
  }

  onFileSelect(event: Event, key: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadedFiles[key] = input.files[0];
    }
  }

  onGenderChange(): void {
    if (this.a.gender === 'female') {
      this.a['target_school_type'] = 'girls';
    } else if (this.a.gender === 'male') {
      this.a['target_school_type'] = 'boys';
    }
  }

  stepValid(): boolean {
    switch (this.step()) {
      case 1:
        return !!this.a.arabic_full_name && !!this.a.gender && !!this.a.date_of_birth && !!this.a.nationality &&
          !!this.a.academic_year_id && !!this.a.applying_grade_id && (!!this.a.national_id || !!this.a.passport_number);
      case 2:
        return !!this.g.relationship && !!this.g.full_name && !!this.g.phone && !!this.g.whatsapp_phone && !this.whatsappError();
      case 3:
        return !!this.a.resides_with && !!this.a.transport_mode && !!this.a.study_dependence;
      case 4:
        return true;
      case 5:
        return this.a.agreed_to_admin_rules && this.a.agreed_to_academic_rules &&
          this.a.agreed_to_mobile_policy && this.a.agreed_to_org_rules;
      case 6:
        return true;
      default:
        return true;
    }
  }

  next(): void {
    if (this.stepValid() && this.step() < 6) {
      this.error.set('');
      this.step.update((s) => s + 1);
    }
  }

  back(): void {
    if (this.step() > 1) {
      this.error.set('');
      this.step.update((s) => s - 1);
    }
  }

  yearName(id: string): string { return this.years().find((y) => y.id === id)?.name || '—'; }
  gradeName(id: string): string { return this.grades().find((g) => g.id === id)?.name || '—'; }

  relationshipLabel(rel: string): string {
    switch (rel) {
      case 'father': return 'أب';
      case 'mother': return 'أم';
      case 'guardian': return 'ولي أمر';
      case 'sponsor': return 'كفيل';
      default: return rel;
    }
  }

  transportLabel(val: string): string {
    switch (val) {
      case 'private': return 'ترحيل خاص';
      case 'school': return 'ترحيل المدرسة';
      case 'public': return 'المواصلات العامة';
      case 'walking': return 'الأقدام';
      default: return val || 'ترحيل المدرسة';
    }
  }

  private readonly commsSvc = inject(CommunicationsService);

  submit(): void {
    if (this.saving() || !this.stepValid()) return;
    this.saving.set(true);
    this.error.set('');

    this.svc.submitPublicApplication({ applicant: this.compact(this.a), guardian: this.compact(this.g) }).subscribe({
      next: (res) => {
        this.saving.set(false);
        const d = res?.data ?? res;
        const appNum = d?.application_number ?? 'APP-' + Math.floor(100000 + Math.random() * 900000);
        this.submitted.set({ application_number: appNum });

        // إرسال إشعار الواتساب التلقائي لتأكيد التسجيل
        this.sendRegistrationConfirmationWhatsapp(appNum);
      },
      error: (e) => {
        this.saving.set(false);
        if (e?.status === 403) { this.isOpen.set(false); this.closedMessage.set(e?.error?.message ?? ''); }
        this.error.set(e?.error?.message || 'تعذّر إرسال الطلب. يرجى التأكد من الحقول وإعادة المحاولة.');
      },
    });
  }

  private sendRegistrationConfirmationWhatsapp(appNum: string): void {
    const phone = this.g.whatsapp_phone || this.g.phone;
    if (!phone) return;

    const schoolName = this.a['target_school_type'] === 'girls' ? 'مدرسة البنات' : 'مدرسة البنين';
    const msg = `السلام عليكم ${this.g.full_name || 'ولي الأمر المحترم'}، تم استلام طلب الالتحاق بنجاح بالرقم : (${appNum}) للتلميذ/ة (${this.a.arabic_full_name}) بـ (${schoolName}) - مدارس المورد النموذجية للعام الدراسي (${this.yearName(this.a.academic_year_id)}). نرجو الاحتفاظ برقم الطلب لمتابعة حالة القبول وتحديد المقابلة. شكرًا لثقتكم.`;

    this.commsSvc.sendMessage({
      channel: 'whatsapp',
      channel_type: 'whatsapp',
      recipient_address: phone,
      recipient_name: this.g.full_name || 'ولي الأمر',
      subject: 'تأكيد استلام طلب الالتحاق - مدارس نبراس',
      body: msg,
      template_code: 'ADM_SUBMITTED',
    }).subscribe();
  }

  reset(): void {
    this.submitted.set(null);
    this.step.set(1);
    for (const k of Object.keys(this.a)) (this.a as any)[k] = typeof (this.a as any)[k] === 'boolean' ? false : '';
    this.a.nationality = 'سوداني';
    this.a.religion = 'مسلم';
    this.a.resides_with = 'parents';
    this.a.transport_mode = 'school';
    this.a.study_dependence = 'self';

    for (const k of Object.keys(this.g)) (this.g as any)[k] = '';
    this.g.relationship = 'father';
  }

  private compact(obj: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) if (v !== '' && v != null) out[k] = v;
    return out;
  }
}
