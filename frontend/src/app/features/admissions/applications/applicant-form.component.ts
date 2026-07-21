import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AdmissionsService, Applicant, Guardian, RequiredDocument, Interview, PlacementTest,
} from '../admissions.service';
import { CommunicationsService } from '../../communications/communications.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStepperComponent } from '../../../shared/nebras/nb-stepper.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { ApplicantPrintModalComponent } from '../shared/applicant-print-modal.component';
import { pickList } from '../shared/admissions.shared';

interface Option { id: string; name: string; }

interface StaffApplicantForm {
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
  applying_section_id: string;

  has_siblings: boolean;
  siblings_section: string;
  siblings_count: number;
  siblings_details: string;

  has_health_issues: boolean;
  health_issues_details: string;
  has_social_issues: boolean;
  social_issues_details: string;
  resides_with: string;
  transport_mode: string;
  study_dependence: string;

  agreed_to_admin_rules: boolean;
  agreed_to_academic_rules: boolean;
  agreed_to_org_rules: boolean;
  agreed_to_mobile_policy: boolean;
}

interface StaffGuardianForm {
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
 * تسجيل / تعديل طلب التحاق يدويًا بواسطة موظف القبول والتسجيل — Nebras OS.
 * يدعم كافة حقول الوثيقة الرسمية للمدرسة (المورد الجديدة) والخطوات الـ 6 والمعاينة الورقية.
 */
@Component({
  selector: 'app-applicant-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NbPageHeaderComponent,
    NbPanelComponent,
    NbStepperComponent,
    NbDatepickerComponent,
    ApplicantPrintModalComponent
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        [title]="isEdit() ? 'تعديل طلب الالتحاق' : 'تسجيل طلب التحاق جديد'"
        [subtitle]="isEdit() ? 'تحديث كافة بيانات المتقدم واللوائح.' : 'تعبئة استمارة التسجيل والقبول يدويًا نيابةً عن متقدم حضر إلى مباني المدرسة.'"
      >
        <button class="nb-btn-ghost" (click)="cancel()">إلغاء</button>
        <button class="nb-btn-secondary" (click)="showPrintModal.set(true)">
          🖨️ معاينة وتدقيق الاستمارة الرسمية
        </button>
      </nb-page-header>

      <nb-panel>
        <nb-stepper [steps]="stepLabels()" [current]="step()"></nb-stepper>

        @if (error()) { <div class="alert err" role="alert">{{ error() }}</div> }

        <!-- 1) البيانات الشخصية للتلميذ + الأشقاء -->
        @if (step() === 1) {
          <div class="step-pane">
            <div class="sec-hdr">أ / البيانات الشخصية للتلميذ والأشقاء</div>
            <div class="form-grid">
              <div class="fld req wide-2"><label>الاسم الكامل (عربي)</label><input [(ngModel)]="a.arabic_full_name" placeholder="الاسم رباعياً" /></div>
              <div class="fld"><label>الاسم الكامل (إنجليزي)</label><input [(ngModel)]="a.english_full_name" /></div>
              
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

              <div class="fld"><label>مكان الميلاد</label><input [(ngModel)]="a.birth_place" /></div>
              <div class="fld req"><label>الجنسية</label><input [(ngModel)]="a.nationality" placeholder="سوداني" /></div>
              <div class="fld req"><label>الرقم الوطني</label><input inputmode="numeric" [(ngModel)]="a.national_id" placeholder="للطلاب السودانيين" /></div>
              <div class="fld"><label>رقم الجواز</label><input [(ngModel)]="a.passport_number" placeholder="لغير السودانيين" /></div>
              <div class="fld"><label>الديانة</label><input [(ngModel)]="a.religion" /></div>
              <div class="fld"><label>فصيلة الدم</label><input [(ngModel)]="a.blood_group" placeholder="O+" /></div>

              <div class="fld req"><label>السنة الدراسية</label>
                <select [(ngModel)]="a.academic_year_id">
                  <option value="">اختر…</option>
                  @for (y of years(); track y.id) { <option [value]="y.id">{{ y.name }}</option> }
                </select>
              </div>

              <div class="fld req"><label>الصف المتقدَّم له</label>
                <select [(ngModel)]="a.applying_grade_id" (change)="onGradeChange()">
                  <option value="">اختر…</option>
                  @for (g of grades(); track g.id) { <option [value]="g.id">{{ g.name }}</option> }
                </select>
              </div>

              <div class="fld"><label>الشعبة (اختياري)</label>
                <select [(ngModel)]="a.applying_section_id">
                  <option value="">— بدون —</option>
                  @for (s of sections(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
                </select>
              </div>
            </div>

            <div class="box-card">
              <div class="box-head">الأشقاء بالمدارس النموذجية</div>
              <div class="form-grid">
                <div class="fld wide">
                  <label class="chk-lbl">
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
                  <div class="fld"><label>عددهم</label><input type="number" min="1" [(ngModel)]="a.siblings_count" /></div>
                  <div class="fld wide"><label>تفاصيل الأشقاء</label><input [(ngModel)]="a.siblings_details" placeholder="الأسماء والصفوف..." /></div>
                }
              </div>
            </div>
          </div>
        }

        <!-- 2) ولي الأمر والشخص البديل -->
        @if (step() === 2) {
          <div class="step-pane">
            <div class="sec-hdr">بيانات ولي الأمر والبديل للطوارئ</div>
            
            <div class="box-card">
              <div class="box-head">بيانات ولي الأمر الرئيسي</div>
              <div class="form-grid">
                <div class="fld req"><label>صلة القرابة</label>
                  <select [(ngModel)]="g.relationship">
                    <option value="father">أب</option>
                    <option value="mother">أم</option>
                    <option value="guardian">ولي أمر</option>
                    <option value="sponsor">كفيل</option>
                  </select>
                </div>
                <div class="fld req wide-2"><label>الاسم الكامل لولي الأمر</label><input [(ngModel)]="g.full_name" /></div>
                <div class="fld req"><label>الرقم الوطني لولي الأمر (لربط بوابة ولي الأمر)</label><input inputmode="numeric" [(ngModel)]="g.national_id" /></div>
                
                <div class="fld req"><label>الجوال (1)</label><input inputmode="tel" [(ngModel)]="g.phone" /></div>
                <div class="fld req wide">
                  <label>رقم واتساب المتابعة المدرسية <span class="lbl-sub">(مفتاح الدولة + رقم المتابعة لربطه بالرسائل)</span></label>
                  <div class="phone-with-country">
                    <select [(ngModel)]="whatsappCountryCode" (change)="updateFullWhatsappNumber()" class="country-select" title="اختر دولة ومفتاح الواتساب">
                      @for (c of waCountries; track c.code) {
                        <option [value]="c.code">{{ c.name }} ({{ c.code }})</option>
                      }
                    </select>
                    <input inputmode="numeric" [maxlength]="selectedWaCountry().len[1]"
                           [(ngModel)]="whatsappBody" (input)="updateFullWhatsappNumber()"
                           [placeholder]="'مثال: ' + selectedWaCountry().sample" class="phone-body" dir="ltr" />
                  </div>
                  @if (whatsappError()) {
                    <span class="val-err">{{ whatsappError() }}</span>
                  } @else if (g.whatsapp_phone) {
                    <span class="val-ok">✓ الرقم المعتمد لرسائل الواتساب: <b dir="ltr">{{ g.whatsapp_phone }}</b></span>
                  } @else {
                    <span class="lbl-sub">بدون صفر البداية ولا رمز الدولة — الصيغة المتوقعة: {{ selectedWaCountry().sample }}</span>
                  }
                </div>
                
                <div class="fld"><label>المهنة</label><input [(ngModel)]="g.occupation" /></div>
                <div class="fld wide-2"><label>عنوان عمل ولي الأمر</label><input [(ngModel)]="g.work_address" /></div>
                <div class="fld wide-2"><label>السكن / الحي</label><input [(ngModel)]="g.address" /></div>
                <div class="fld"><label>رقم العمارة / المنزل</label><input [(ngModel)]="g.building_number" /></div>
                <div class="fld wide"><label>البريد الإلكتروني</label><input type="email" [(ngModel)]="g.email" /></div>
                
                <div class="fld wide"><label>رقم هاتف والدة التلميذ (أو من ينوب عنها)</label>
                  <div class="dual">
                    <input inputmode="tel" [(ngModel)]="g.mother_phone" placeholder="رقم الهاتف" />
                    <input [(ngModel)]="g.mother_proxy_name" placeholder="اسم/صفة من ينوب عنها" />
                  </div>
                </div>
              </div>
            </div>

            <div class="box-card warn-bg">
              <div class="box-head">الشخص البديل في حالة غياب ولي الأمر</div>
              <div class="form-grid">
                <div class="fld wide-2"><label>اسم الشخص البديل</label><input [(ngModel)]="g.emergency_contact_name" /></div>
                <div class="fld"><label>صلة القرابة</label><input [(ngModel)]="g.emergency_contact_relation" /></div>
                <div class="fld"><label>الهاتف</label><input inputmode="tel" [(ngModel)]="g.emergency_contact_phone" /></div>
                <div class="fld wide"><label>العنوان</label><input [(ngModel)]="g.emergency_contact_address" /></div>
              </div>
            </div>
          </div>
        }

        <!-- 3) الصحية والاجتماعية وسلوك التلميذ -->
        @if (step() === 3) {
          <div class="step-pane">
            <div class="sec-hdr">البيانات الصحية والاجتماعية والترحيل</div>

            <div class="box-card">
              <div class="box-head">الحالة الصحية (تُربط بملف العيادة)</div>
              <div class="form-grid">
                <div class="fld wide">
                  <label class="chk-lbl">
                    <input type="checkbox" [(ngModel)]="a.has_health_issues" />
                    <span>هل يعاني التلميذ من أي مشاكل صحية؟</span>
                  </label>
                </div>
                @if (a.has_health_issues) {
                  <div class="fld wide">
                    <label>التفاصيل والإجراءات الطبية</label>
                    <textarea rows="2" [(ngModel)]="a.health_issues_details"></textarea>
                  </div>
                }
              </div>
            </div>

            <div class="box-card">
              <div class="box-head">الحالة الاجتماعية والبيئية</div>
              <div class="form-grid">
                <div class="fld wide">
                  <label class="chk-lbl">
                    <input type="checkbox" [(ngModel)]="a.has_social_issues" />
                    <span>هل يعاني التلميذ من أي مشاكل اجتماعية؟</span>
                  </label>
                </div>
                @if (a.has_social_issues) {
                  <div class="fld wide"><label>التفاصيل</label><textarea rows="2" [(ngModel)]="a.social_issues_details"></textarea></div>
                }
                <div class="fld req"><label>التلميذ يقيم مع</label>
                  <select [(ngModel)]="a.resides_with">
                    <option value="parents">الأم والأب</option>
                    <option value="father">الأب</option>
                    <option value="mother">الأم</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
                <div class="fld req"><label>وسيلة حضور التلميذ (تُربط بقطاع النقل)</label>
                  <select [(ngModel)]="a.transport_mode">
                    <option value="school">ترحيل المدرسة</option>
                    <option value="private">ترحيل خاص</option>
                    <option value="public">المواصلات العامة</option>
                    <option value="walking">الأقدام</option>
                  </select>
                </div>
                <div class="fld req"><label>يعتمد في المذاكرة على</label>
                  <select [(ngModel)]="a.study_dependence">
                    <option value="self">نفسه</option>
                    <option value="other">غيره</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- 4) الدراسة السابقة والمستندات -->
        @if (step() === 4) {
          <div class="step-pane">
            <div class="sec-hdr">ب / المؤهل الأكاديمي السابقة والمستندات</div>
            <div class="form-grid">
              <div class="fld wide-2"><label>المدرسة الابتدائية / الروضة السابقة</label><input [(ngModel)]="a.previous_school" /></div>
              <div class="fld"><label>الصف السابق</label><input [(ngModel)]="a.previous_grade" /></div>
              <div class="fld"><label>النسبة / التقدير</label><input [(ngModel)]="a.previous_grade_score" /></div>
              <div class="fld wide"><label>احتياجات خاصة / ملاحظات</label><textarea rows="2" [(ngModel)]="a.special_needs"></textarea></div>
            </div>

            <div class="box-card">
              <div class="box-head">ج / المستندات المطلوبة للتسليم والتحقق</div>
              <ul class="docs-lst">
                <li>[✓] أ/ صورتين فوتوغرافيتين للتلميذ.</li>
                <li>[✓] ب/ الشهادة الأكاديمية السابقة.</li>
                <li>[✓] ج/ صورة من الرقم الوطني / القيد.</li>
                <li>[✓] د/ صورة إثبات شخصية ولي الأمر.</li>
              </ul>
            </div>
          </div>
        }

        <!-- 5) اللوائح والتعهدات -->
        @if (step() === 5) {
          <div class="step-pane">
            <div class="sec-hdr">اللوائح المدرسية وتأكيد إقرار ولي الأمر</div>
            
            <div class="box-card pledges-box">
              <label class="chk-lbl">
                <input type="checkbox" [(ngModel)]="a.agreed_to_admin_rules" />
                <span>الموافقة والإقرار الكامل باللوائح الإدارية والتنظيمية (24 بنداً).</span>
              </label>

              <label class="chk-lbl">
                <input type="checkbox" [(ngModel)]="a.agreed_to_academic_rules" />
                <span>الموافقة والإقرار باللوائح الأكاديمية (13 بنداً) ومعادلة الشهادات الأجنبية.</span>
              </label>

              <label class="chk-lbl">
                <input type="checkbox" [(ngModel)]="a.agreed_to_mobile_policy" />
                <span>التعهد بعدم إحضار الهاتف المحمول أو الكاميرات أو الألعاب وقبول العقوبات.</span>
              </label>

              <label class="chk-lbl">
                <input type="checkbox" [(ngModel)]="a.agreed_to_org_rules" />
                <span>الإقرار بصحة كافة البيانات المدخلة في الاستمارة وتحمل تبعاتها.</span>
              </label>
            </div>
          </div>
        }

        <!-- 6) المراجعة والحفظ والمعاينة الورقية -->
        @if (step() === 6) {
          <div class="step-pane review">
            <div class="sec-hdr">د / الرسوم والمراجعة النهائية</div>
            
            <div class="box-card fin-box">
              <b>د / الشروط والرسوم الدراسية:</b>
              <p>رسوم التسجيل: 200,000 جنيه · الرسوم الدراسية: 500,000 جنيه (القسط الأول: 300,000 جنيه عند التسجيل + القسط الثاني: 200,000 جنيه بعد شهرين).</p>
            </div>

            <div class="rev-grid">
              <div><span>اسم التلميذ</span><b>{{ a.arabic_full_name || '—' }}</b></div>
              <div><span>تاريخ الميلاد / الجنس</span><b>{{ a.date_of_birth }} · {{ a.gender === 'male' ? 'ذكر' : 'أنثى' }}</b></div>
              <div><span>الرقم الوطني / الجواز</span><b>{{ a.national_id || a.passport_number || '—' }}</b></div>
              <div><span>السنة الدراسية / الصف</span><b>{{ yearName(a.academic_year_id) }} · {{ gradeName(a.applying_grade_id) }}</b></div>
              <div><span>ولي الأمر</span><b>{{ g.full_name || '—' }} ({{ g.phone }})</b></div>
              <div><span>البديل في حالة الغياب</span><b>{{ g.emergency_contact_name || '—' }} ({{ g.emergency_contact_phone || '—' }})</b></div>
            </div>
          </div>
        }

        <div class="nav">
          @if (step() > 1) { <button class="nb-btn-secondary" (click)="back()">السابق</button> }
          <span class="spacer"></span>
          @if (step() < 6) {
            <button class="nb-btn-primary" (click)="next()" [disabled]="!stepValid()">التالي</button>
          } @else {
            <button class="nb-btn-primary" (click)="save()" [disabled]="saving() || !valid()">
              {{ saving() ? 'جارٍ الحفظ…' : (isEdit() ? 'حفظ التعديلات' : 'حفظ واعتمد الطلب') }}
            </button>
          }
        </div>
      </nb-panel>

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
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .step-pane { animation: stepIn 240ms cubic-bezier(0.2, 0, 0, 1); margin-top: 20px; }
    @keyframes stepIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    
    .sec-hdr { font-size: 15px; font-weight: 700; color: var(--nb-primary-600); margin-bottom: 14px; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 6px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; align-items: end; }
    .fld { display: flex; flex-direction: column; justify-content: flex-end; gap: 5px; }
    .fld.wide { grid-column: 1 / -1; }
    .fld.wide-2 { grid-column: span 2; }
    @media (max-width: 640px) { .fld.wide-2 { grid-column: 1 / -1; } }
    
    .fld label { font-size: 12px; font-weight: 700; color: var(--nb-text); min-height: 24px; display: flex; align-items: flex-end; flex-wrap: wrap; gap: 4px; }
    .fld.req label::after { content: ' *'; color: var(--nb-danger); }
    .lbl-sub { font-size: 11px; font-weight: 500; color: var(--nb-text-muted); }
    .fld input, .fld select, .fld textarea { height: 38px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; transition: border-color 150ms ease; width: 100%; box-sizing: border-box; }
    .fld textarea { height: auto; padding: 8px 10px; resize: vertical; }
    .fld input:focus, .fld select:focus, .fld textarea:focus { border-color: var(--nb-primary-600); box-shadow: var(--nb-focus-ring); }
    
    .dual { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    
    .phone-with-country { display: grid; grid-template-columns: 170px 1fr; gap: 8px; direction: ltr; }
    @media (max-width: 520px) { .phone-with-country { grid-template-columns: 1fr; } }
    .country-select { height: 38px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 6px; font-size: 12.5px; font-weight: 700; font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", var(--nb-font-family, system-ui, sans-serif); background: var(--nb-surface-raised); color: var(--nb-text); outline: none; }
    .phone-body { height: 38px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; direction: ltr; text-align: left; }
    .val-err { font-size: 11.5px; color: var(--nb-danger); font-weight: 600; margin-top: 3px; }
    .val-ok { font-size: 11.5px; color: var(--nb-success); font-weight: 600; margin-top: 3px; }
    .val-ok b { direction: ltr; display: inline-block; letter-spacing: 0.5px; }
    .box-card { background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); padding: 16px; margin-top: 14px; }
    .box-card.warn-bg { background: #fffbeb; border-color: #fde68a; }
    .box-head { font-size: 13.5px; font-weight: 700; color: var(--nb-text); margin-bottom: 12px; }
    
    .chk-lbl { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer; color: var(--nb-text); }
    .chk-lbl input { width: 18px; height: 18px; accent-color: var(--nb-primary-600); }
    
    .docs-lst { margin: 0; padding-inline-start: 18px; display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600; color: var(--nb-text); }
    .pledges-box { display: flex; flex-direction: column; gap: 10px; background: #eff6ff; border-color: #bfdbfe; }
    .fin-box { background: #f0fdf4; border-color: #bbf7d0; font-size: 13px; color: #166534; }
    .fin-box p { margin: 4px 0 0; }
    
    .review .rev-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 14px; }
    .rev-grid > div { background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; }
    .rev-grid span { font-size: 11px; color: var(--nb-text-muted); }
    .rev-grid b { font-size: 13px; color: var(--nb-text); }
    
    .nav { display: flex; align-items: center; margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--nb-border-soft); }
    .spacer { flex: 1; }
    .alert { font-size: 12px; border-radius: var(--nb-radius); padding: 10px 14px; margin-top: 16px; }
    .alert.err { background: var(--nb-danger-bg); color: var(--nb-danger); border: 1px solid var(--nb-danger); }
  `],
})
export class ApplicantFormComponent implements OnInit {
  private readonly svc = inject(AdmissionsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly id = signal<string | null>(null);
  readonly isEdit = computed(() => !!this.id());
  readonly saving = signal(false);
  readonly error = signal('');
  readonly step = signal(1);
  readonly showPrintModal = signal(false);

  readonly years = signal<Option[]>([]);
  readonly grades = signal<Option[]>([]);
  readonly sections = signal<Option[]>([]);

  readonly stepLabels = signal([
    'التلميذ والأشقاء',
    'ولي الأمر والبديل',
    'الصحية والترحيل',
    'المستندات',
    'اللوائح والتعهدات',
    'الرسوم والمراجعة'
  ]);

  a: StaffApplicantForm = {
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
    applying_section_id: '',
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
    agreed_to_admin_rules: true,
    agreed_to_academic_rules: true,
    agreed_to_org_rules: true,
    agreed_to_mobile_policy: true,
  };

  g: StaffGuardianForm = {
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

  // الدول المدعومة لرقم الواتساب: [أدنى، أقصى] عدد خانات الرقم الوطني (بدون رمز الدولة) + مثال.
  readonly waCountries = [
    { code: '+249', name: '🇸🇩 السودان', len: [9, 9], sample: '9XXXXXXXX' },
    { code: '+966', name: '🇸🇦 السعودية', len: [9, 9], sample: '5XXXXXXXX' },
    { code: '+20',  name: '🇪🇬 مصر', len: [10, 10], sample: '1XXXXXXXXX' },
    { code: '+971', name: '🇦🇪 الإمارات', len: [9, 9], sample: '5XXXXXXXX' },
    { code: '+974', name: '🇶🇦 قطر', len: [8, 8], sample: '3XXXXXXX' },
    { code: '+968', name: '🇴🇲 عُمان', len: [8, 8], sample: '9XXXXXXX' },
    { code: '+965', name: '🇰🇼 الكويت', len: [8, 8], sample: '5XXXXXXX' },
    { code: '+973', name: '🇧🇭 البحرين', len: [8, 8], sample: '3XXXXXXX' },
    { code: '+962', name: '🇯🇴 الأردن', len: [9, 9], sample: '7XXXXXXXX' },
    { code: '+90',  name: '🇹🇷 تركيا', len: [10, 10], sample: '5XXXXXXXXX' },
    { code: '+44',  name: '🇬🇧 المملكة المتحدة', len: [10, 10], sample: '7XXXXXXXXX' },
    { code: '+1',   name: '🇺🇸 أمريكا / كندا', len: [10, 10], sample: 'XXXXXXXXXX' },
  ];

  whatsappCountryCode = '+249';
  whatsappBody = '';
  readonly whatsappError = signal('');

  selectedWaCountry(): { code: string; name: string; len: number[]; sample: string } {
    return this.waCountries.find((c) => c.code === this.whatsappCountryCode) || this.waCountries[0];
  }

  updateFullWhatsappNumber(): void {
    const country = this.selectedWaCountry();
    const [min, max] = country.len;

    // ماسك حي: أرقام فقط + إزالة رمز الدولة المكرر + الأصفار البادئة + سقف الطول
    let cleaned = (this.whatsappBody || '').replace(/\D/g, '');
    const codeDigits = country.code.replace(/\D/g, '');
    if (cleaned.startsWith(codeDigits)) cleaned = cleaned.slice(codeDigits.length);
    cleaned = cleaned.replace(/^0+/, '');
    if (cleaned.length > max) cleaned = cleaned.slice(0, max);
    if (cleaned !== this.whatsappBody) this.whatsappBody = cleaned;

    if (!cleaned) {
      this.g.whatsapp_phone = '';
      this.whatsappError.set('');
      return;
    }

    if (cleaned.length < min || cleaned.length > max) {
      const lenText = min === max ? `${min}` : `${min}–${max}`;
      this.whatsappError.set(`رقم ${country.name} يجب أن يكون ${lenText} خانة (مثال: ${country.sample}) بدون صفر البداية ولا رمز الدولة.`);
      this.g.whatsapp_phone = '';
      return;
    }

    this.whatsappError.set('');
    this.g.whatsapp_phone = `${this.whatsappCountryCode}${cleaned}`;
  }

  /** تعبئة الحقلين من رقم E.164 محفوظ مسبقاً (لتحرير الأرقام القديمة). */
  hydrateWhatsappFields(): void {
    const full = (this.g.whatsapp_phone || '').replace(/\s/g, '');
    if (!full.startsWith('+')) return;
    const match = this.waCountries
      .slice()
      .sort((a, b) => b.code.length - a.code.length)
      .find((c) => full.startsWith(c.code));
    if (match) {
      this.whatsappCountryCode = match.code;
      this.whatsappBody = full.slice(match.code.length);
      this.updateFullWhatsappNumber();
    }
  }

  valid(): boolean {
    return !!this.a.arabic_full_name && !!this.a.gender && !!this.a.date_of_birth && !!this.a.nationality &&
      !!this.a.academic_year_id && !!this.a.applying_grade_id && (!!this.a.national_id || !!this.a.passport_number);
  }

  stepValid(): boolean {
    switch (this.step()) {
      case 1:
        return !!this.a.arabic_full_name && !!this.a.gender && !!this.a.date_of_birth && !!this.a.nationality &&
          !!this.a.academic_year_id && !!this.a.applying_grade_id && (!!this.a.national_id || !!this.a.passport_number);
      case 2:
        return !!this.g.relationship && !!this.g.full_name && !!this.g.phone && !!this.g.whatsapp_phone && !this.whatsappError();
      case 3:
      case 4:
      case 5:
      case 6:
        return true;
      default:
        return true;
    }
  }

  onGenderChange(): void {
    if (this.a.gender === 'female') {
      this.a['target_school_type'] = 'girls';
    } else if (this.a.gender === 'male') {
      this.a['target_school_type'] = 'boys';
    }
  }

  next(): void { if (this.stepValid() && this.step() < 6) { this.error.set(''); this.step.update((s) => s + 1); } }
  back(): void { if (this.step() > 1) { this.error.set(''); this.step.update((s) => s - 1); } }

  ngOnInit(): void {
    this.svc.getAcademicYears().subscribe((res) =>
      this.years.set(pickList<Option>(res).map((y: any) => ({ id: y.id, name: y.name }))));
    this.svc.getGrades().subscribe((res) =>
      this.grades.set(pickList<Option>(res).map((g: any) => ({ id: g.id, name: g.name }))));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.id.set(id);
      this.svc.getApplicant(id).subscribe((res) => {
        const d = res?.data ?? res;
        if (d) {
          for (const k of Object.keys(this.a)) {
            if (d[k] !== undefined && d[k] !== null) this.a[k] = d[k];
          }
          if (this.a.applying_grade_id) this.onGradeChange();
        }
      });
    }
  }

  onGradeChange(): void {
    const gid = this.a.applying_grade_id;
    if (!gid) { this.sections.set([]); return; }
    this.svc.getSections(gid).subscribe((res) =>
      this.sections.set(pickList<Option>(res).map((s: any) => ({ id: s.id, name: s.name }))));
  }

  yearName(id: string): string { return this.years().find((y) => y.id === id)?.name || '—'; }
  gradeName(id: string): string { return this.grades().find((g) => g.id === id)?.name || '—'; }

  save(): void {
    if (!this.valid() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    const payload = this.compact(this.a);

    if (this.isEdit()) {
      this.svc.updateApplicant(this.id()!, payload).subscribe({
        next: (res) => { const d = res?.data ?? res; this.done(d?.id ?? this.id()!); },
        error: (e) => this.fail(e),
      });
      return;
    }

    this.svc.createApplicant(payload).subscribe({
      next: (res) => {
        const created = res?.data ?? res;
        const newId = created?.id;
        const appNum = created?.application_number || 'APP-REG';

        if (newId && this.g.full_name) {
          this.svc.createGuardian({ applicant: newId, ...this.compact(this.g) }).subscribe({
            next: () => {
              this.sendRegistrationConfirmationWhatsapp(appNum, newId);
              this.done(newId);
            },
            error: () => {
              this.sendRegistrationConfirmationWhatsapp(appNum, newId);
              this.done(newId);
            },
          });
        } else {
          this.sendRegistrationConfirmationWhatsapp(appNum, newId);
          this.done(newId);
        }
      },
      error: (e) => this.fail(e),
    });
  }

  private readonly commsSvc = inject(CommunicationsService);

  private sendRegistrationConfirmationWhatsapp(appNum: string, id?: string): void {
    const phone = this.g.whatsapp_phone || this.g.phone;
    if (!phone) return;

    const schoolName = (this.a as any)['target_school_type'] === 'girls' ? 'مدرسة البنات' : 'مدرسة البنين';
    const msg = `السلام عليكم ${this.g.full_name || 'ولي الأمر المحترم'}، تم تسجيل طلب الالتحاق بنجاح بالرقم الرسمي: (${appNum}) للتلميذ/ة (${this.a.arabic_full_name}) بـ (${schoolName}) - مدارس المورد النموذجية للعام الدراسي (${this.yearName(this.a.academic_year_id)}). يمكنكم متابعة حالة الطلب لدى إدارة القبول. شكرًا لثقتكم.`;

    this.commsSvc.sendMessage({
      channel: 'whatsapp',
      channel_type: 'whatsapp',
      recipient_address: phone,
      recipient_name: this.g.full_name || 'ولي الأمر',
      subject: 'تأكيد تسجيل طلب الالتحاق - مدارس نبراس',
      body: msg,
      template_code: 'ADM_SUBMITTED',
      applicant_id: id,
    }).subscribe();
  }

  private compact(obj: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== '' && v !== null && v !== undefined) out[k] = v;
    }
    return out;
  }

  private done(id?: string): void {
    this.saving.set(false);
    if (id) this.router.navigate(['/admissions/applications', id]);
    else this.router.navigate(['/admissions/applications']);
  }

  private fail(e: any): void {
    this.saving.set(false);
    this.error.set(e?.error?.message || e?.error?.detail || 'تعذّر حفظ الطلب. تأكد من صحة البيانات وحاول مجددًا.');
  }

  cancel(): void { this.router.navigate(['/admissions/applications']); }
}
