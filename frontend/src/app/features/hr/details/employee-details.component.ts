import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatDialogModule } from '@angular/material/dialog';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NotificationService } from '../../../core/services/notification.service';
import { environment } from '../../../../environments/environment';
import { EmployeeContractPrintModalComponent } from '../components/employee-contract-print-modal.component';
import { SendMessageModalComponent } from '../../communications/components/send-message-modal.component';

@Component({
  selector: 'app-employee-details',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    NbPageHeaderComponent,
    NbPanelComponent,
    EmployeeContractPrintModalComponent,
    SendMessageModalComponent
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="ملف وتفاصيل المعلم / الموظف" subtitle="استعراض السجل الوظيفي والأكاديمي الشامل وفق عقد معلم 2026م واللائحة التنظيمية.">
        <button class="nb-btn-secondary" (click)="goBack()">← الرجوع لدليل الموظفين</button>
        <button class="nb-btn-primary" (click)="openContractModal()">📜 معاينة وطباعة عقد 2026م</button>
      </nb-page-header>

      @if (loading()) {
        <div class="loading-container animate-fade">
          <div class="spinner"></div>
          <p class="loading-text">جارٍ تحميل البيانات والملف الكامل للموظف من السيرفر…</p>
        </div>
      } @else if (!employee()) {
        <div class="error-card animate-fade">
          <span class="icon">⚠️</span>
          <h3>لم يتم العثور على بيانات الموظف</h3>
          <p>قد يكون هذا الملف غير موجود أو تم حذفه من المنظومة.</p>
          <button class="nb-btn-primary" (click)="goBack()">الرجوع للدليل الرئيسي</button>
        </div>
      } @else {
        
        <!-- الكارت التعريفي المعتمد برأس الصفحة -->
        <div class="profile-header-card animate-fade">
          <div class="avatar-box">
            @if (employee()?.photo_url) {
              <img [src]="employee()?.photo_url" [alt]="employee()?.full_name_ar" class="avatar-img" />
            } @else {
              <div class="avatar-placeholder">{{ initials(employee()?.full_name_ar) }}</div>
            }
          </div>
          <div class="main-info">
            <div class="title-row">
              <h2>{{ employee()?.full_name_ar }}</h2>
              <span class="badge" [class.active]="employee()?.status === 'active'">
                {{ employee()?.status === 'active' ? 'نشط وعقد موثق ✓' : 'تحت التجربة' }}
              </span>
            </div>
            <p class="role-subtitle">
              {{ employee()?.position || 'معلم' }} • {{ employee()?.department || 'التعليم والإشراف' }}
              <span class="emp-no"> | المعرف: {{ employee()?.employee_number || 'EMP-2026-001' }}</span>
            </p>
            <div class="tags-row">
              <span class="tag">🎓 {{ employee()?.specialization || 'التخصص الأكاديمي' }}</span>
              <span class="tag">🏛️ {{ employee()?.university_institute || 'الجامعة/المعهد' }}</span>
              <span class="tag">📚 23 حصة أسبوعياً (معفى من النوبتجية)</span>
            </div>
          </div>

          <div class="quick-actions-box">
            <button class="btn-action-lg print" (click)="openContractModal()">
              <span>🖨️ طباعة عقد 2026م</span>
            </button>
            <button class="btn-action-lg msg" (click)="showMsgModal = true">
              <span>💬 إرسال رسالة واتساب</span>
            </button>
          </div>
        </div>

        <!-- التبويبات الداخلية لمعاينة الملف الشامل -->
        <div class="details-tabs">
          <button class="d-tab" [class.active]="activeTab() === 'personal'" (click)="activeTab.set('personal')">
            👤 البيانات الشخصية والسكن
          </button>
          <button class="d-tab" [class.active]="activeTab() === 'contact'" (click)="activeTab.set('contact')">
            📞 التواصل والمعرفون
          </button>
          <button class="d-tab" [class.active]="activeTab() === 'academic'" (click)="activeTab.set('academic')">
            🎓 المؤهل والتكليف
          </button>
          <button class="d-tab" [class.active]="activeTab() === 'dependents'" (click)="activeTab.set('dependents')">
            👨‍👩‍👧‍👦 الأبناء والتخفيضات ({{ employee()?.dependents?.length || 0 }})
          </button>
          <button class="d-tab" [class.active]="activeTab() === 'experiences'" (click)="activeTab.set('experiences')">
            🏫 الخبرات السابقة ({{ employee()?.prior_experiences?.length || 0 }})
          </button>
          <button class="d-tab" [class.active]="activeTab() === 'payroll'" (click)="activeTab.set('payroll')">
            💵 المالية وهيكل عقد 2026م
          </button>
        </div>

        <div class="tab-content-area animate-fade">

          <!-- 1. البيانات الشخصية والسكن -->
          @if (activeTab() === 'personal') {
            <nb-panel title="البيانات الشخصية وعنوان السكن التفصيلي" [flush]="true">
              <div class="info-grid">
                <div class="info-item">
                  <span class="lbl">الاسم كامل بالعربية</span>
                  <span class="val font-bold">{{ employee()?.full_name_ar }}</span>
                </div>
                <div class="info-item">
                  <span class="lbl">اللقب العلمي/الإداري</span>
                  <span class="val">{{ employee()?.title_surname || '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="lbl">الرقم الوطني / الهوية</span>
                  <span class="val">{{ employee()?.national_id || '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="lbl">الجنس والديانة</span>
                  <span class="val">{{ employee()?.gender === 'male' ? 'ذكر' : 'أنثى' }} | {{ employee()?.religion || 'مسلم' }}</span>
                </div>
                <div class="info-item">
                  <span class="lbl">الجنسية والحالة الاجتماعية</span>
                  <span class="val">{{ employee()?.nationality || 'سوداني' }} | {{ employee()?.marital_status || 'أعزب' }}</span>
                </div>
                <div class="info-item">
                  <span class="lbl">عدد الأبناء</span>
                  <span class="val">{{ employee()?.children_count || 0 }} أبناء</span>
                </div>
                <div class="info-item">
                  <span class="lbl">المدينة والحي السكني</span>
                  <span class="val">{{ employee()?.city || 'الخرطوم' }} - {{ employee()?.neighborhood || '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="lbl">رقم المربع والمنزل</span>
                  <span class="val">مربع: {{ employee()?.square_number || '—' }} | منزل: {{ employee()?.house_number || '—' }}</span>
                </div>
                <div class="info-item full">
                  <span class="lbl">اسم أقرب معلم بارز للتعرف بالمنظومة</span>
                  <span class="val font-bold" style="color: #0369a1;">{{ employee()?.prominent_teacher_friend || '—' }}</span>
                </div>
              </div>
            </nb-panel>
          }

          <!-- 2. التواصل والمعرفون -->
          @if (activeTab() === 'contact') {
            <div class="dual-sections">
              <nb-panel title="وسائل الاتصال والواتساب الدولي" [flush]="true">
                <div class="info-grid">
                  <div class="info-item">
                    <span class="lbl">رقم الهاتف الرئيسي (1)</span>
                    <span class="val phone-num">{{ employee()?.mobile || employee()?.phone_1 || '—' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="lbl">رقم الواتساب الدولي المعتمد (E.164)</span>
                    <span class="val phone-num highlight-wa">
                      @if (employee()?.whatsapp_number) {
                        ✓ {{ employee()?.whatsapp_number }}
                      } @else {
                        غير مسجل
                      }
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="lbl">رقم هاتف ثانٍ (2)</span>
                    <span class="val phone-num">{{ employee()?.phone_2 || '—' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="lbl">البريد الإلكتروني الرسمي</span>
                    <span class="val">{{ employee()?.email || '—' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="lbl">رقم الطوارئ وصلة القرابة</span>
                    <span class="val">{{ employee()?.emergency_phone_other || '—' }} ({{ employee()?.emergency_kinship || 'أقارب' }})</span>
                  </div>
                </div>
              </nb-panel>

              <nb-panel title="المعرفون والمراجع من معالم المنظومة" [flush]="true">
                <div class="list-wrapper">
                  @if (!employee()?.references?.length) {
                    <div class="empty-msg">لا يوجد معرفون مسجلون لهذا الموظف.</div>
                  } @else {
                    @for (ref of employee()?.references; track ref.id) {
                      <div class="list-card-item">
                        <span class="icon">👤</span>
                        <div class="content">
                          <span class="name">{{ ref.ref_name }}</span>
                          <span class="phone">هاتف: {{ ref.ref_phone }}</span>
                        </div>
                        <a [href]="'https://wa.me/' + ref.ref_phone" target="_blank" class="btn-sm-wa">💬 تواصل واتساب</a>
                      </div>
                    }
                  }
                </div>
              </nb-panel>
            </div>
          }

          <!-- 3. المؤهل والتكليف -->
          @if (activeTab() === 'academic') {
            <nb-panel title="المؤهل العلمي والتكليف الأكاديمي والأنصبة" [flush]="true">
              <div class="info-grid">
                <div class="info-item">
                  <span class="lbl">الجامعة / المعهد</span>
                  <span class="val font-bold">{{ employee()?.university_institute || '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="lbl">الكلية والتخصص الدقيق</span>
                  <span class="val">{{ employee()?.faculty || '—' }} ({{ employee()?.specialization || '—' }})</span>
                </div>
                <div class="info-item">
                  <span class="lbl">المادة الأولى الأساسية (1)</span>
                  <span class="val font-bold" style="color: #2563eb;">{{ employee()?.teaching_subject_1 || '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="lbl">المادة الثانية والثالثة</span>
                  <span class="val">{{ employee()?.teaching_subject_2 || '—' }} / {{ employee()?.teaching_subject_3 || '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="lbl">نصاب الحصص الأسبوعي</span>
                  <span class="val font-bold">23 حصة أسبوعياً</span>
                </div>
                <div class="info-item">
                  <span class="lbl">الإعفاء من النوبتجية (Duty)</span>
                  <span class="val">
                    <span class="badge approved">
                      {{ employee()?.duty_exempt !== false ? 'نعم - معفى رسمياً من النوبتجية' : 'غير معفى' }}
                    </span>
                  </span>
                </div>
                <div class="info-item full">
                  <span class="lbl">أي مهام أو أنشطة أكاديمية وإشرافية أخرى</span>
                  <span class="val">{{ employee()?.other_tasks_activities || 'لا توجد تكليفات إضافية مسجلة' }}</span>
                </div>
              </div>
            </nb-panel>
          }

          <!-- 4. الأبناء والتخفيضات -->
          @if (activeTab() === 'dependents') {
            <nb-panel title="سجل أبناء المعلم بالمدرسة وتخفيضات الرسوم" [flush]="true">
              <div class="table-responsive">
                <div class="tbl-head-grid dep-grid">
                  <span>اسم التلميذ</span><span>صلة القرابة</span><span>المرحلة / الصف</span><span>نسبة التخفيض</span><span>حالة الربط بالطالب</span>
                </div>
                @if (!employee()?.dependents?.length) {
                  <div class="empty-msg">لا يوجد أبناء مسجلون بالمدرسة لهذا المعلم.</div>
                } @else {
                  @for (dep of employee()?.dependents; track dep.id) {
                    <div class="tbl-row-grid dep-grid">
                      <span><b>{{ dep.full_name }}</b></span>
                      <span>{{ dep.relation_type === 'relative' ? 'قريب درجة أولى' : 'ابن / ابنة' }}</span>
                      <span>{{ dep.academic_stage }} · {{ dep.grade_level || '—' }}</span>
                      <span>
                        <b class="disc-val">{{ dep.discount_percentage }}%</b>
                        @if (dep.is_fully_exempt) { <span class="badge approved">إعفاء كلي</span> }
                      </span>
                      <span>
                        @if (dep.student_id) {
                          <span class="badge approved">مربوط بطالب ✓ — الخصم مُفعّل</span>
                          <button type="button" class="nb-btn-ghost sm" (click)="unlinkDependent(dep)">فكّ الربط</button>
                        } @else {
                          <span class="badge pending">تصريح معلّق — بانتظار تسجيل الطالب</span>
                        }
                      </span>
                    </div>
                  }
                }
              </div>

              <!-- اقتراحات الربط: طلاب مسجّلون أولياء أمرهم يحملون رقم الموظف الوطني -->
              <div class="link-box">
                <div class="link-head">
                  <b>اقتراحات ربط الطلاب</b>
                  <button type="button" class="nb-btn-secondary" [disabled]="loadingSuggestions()"
                          (click)="loadLinkSuggestions()">
                    {{ loadingSuggestions() ? 'جارٍ البحث…' : '⟳ بحث عن طلاب مطابقين' }}
                  </button>
                </div>
                <p class="link-hint">
                  المطابقة تتم بالرقم الوطني لولي الأمر، فتعمل سواء سُجّل الطالب قبل العقد أو بعده.
                  التأكيد يدوي لأن أثر الخطأ مالي.
                </p>
                @if (suggestionsLoaded()) {
                  @if (!suggestions().length) {
                    <div class="empty-msg">لا توجد طلاب مطابقون غير مربوطين حالياً.</div>
                  } @else {
                    @for (s of suggestions(); track s.student_id) {
                      <div class="sug-row">
                        <span><b>{{ s.student_name || 'طالب' }}</b></span>
                        <span class="sug-meta">
                          @if (s.declared_name) { مطابق للتصريح: {{ s.declared_name }} }
                          @else { لا يوجد تصريح مسبق — سيُنشأ تلقائياً }
                        </span>
                        <button type="button" class="nb-btn-primary sm" (click)="confirmLink(s)">تأكيد الربط</button>
                      </div>
                    }
                  }
                }
              </div>
            </nb-panel>
          }

          <!-- 5. الخبرات السابقة -->
          @if (activeTab() === 'experiences') {
            <nb-panel title="سجل الخبرات والمدارس والمؤسسات السابقة" [flush]="true">
              <div class="list-wrapper">
                @if (!employee()?.prior_experiences?.length) {
                  <div class="empty-msg">لا توجد خبرات مدرسية سابقة مسجلة.</div>
                } @else {
                  @for (exp of employee()?.prior_experiences; track exp.id) {
                    <div class="list-card-item">
                      <span class="icon">🏫</span>
                      <div class="content">
                        <span class="name">{{ exp.school_name }}</span>
                        <span class="phone">الفترة والتاريخ: {{ exp.time_period }}</span>
                      </div>
                    </div>
                  }
                }
              </div>
            </nb-panel>
          }

          <!-- 6. الراتب وهيكل عقد 2026م -->
          @if (activeTab() === 'payroll') {
            <nb-panel title="تفاصيل هيكل الراتب الشهري والإقرار المالي لعقد 2026م" [flush]="true">
              <div class="payroll-breakdown-card">
                <div class="salary-metric">
                  <span class="lbl">الراتب الأساسي</span>
                  <span class="num">{{ (employee()?.basic_salary || 200000) | number }} ج.س</span>
                </div>
                <div class="salary-metric">
                  <span class="lbl">بدل ترحيل</span>
                  <span class="num">{{ (employee()?.transport_allowance || 80000) | number }} ج.س</span>
                </div>
                <div class="salary-metric">
                  <span class="lbl">بدل اتصال وانترنت</span>
                  <span class="num">{{ (employee()?.communication_allowance || 40000) | number }} ج.س</span>
                </div>
                <div class="salary-metric">
                  <span class="lbl">بدل تمثيل</span>
                  <span class="num">{{ (employee()?.representation_allowance || 30000) | number }} ج.س</span>
                </div>
                <div class="salary-metric minus">
                  <span class="lbl">الخصومات المقتطعة</span>
                  <span class="num">- {{ (employee()?.deductions || 0) | number }} ج.س</span>
                </div>
                <div class="salary-metric total">
                  <span class="lbl">الصافي المستحق صرفه</span>
                  <span class="num">{{ (employee()?.net_payable || 350000) | number }} ج.س</span>
                </div>
              </div>

              <div class="bylaws-info-box">
                <b>📜 الإقرار المالي والتنظيمي بالعقد:</b>
                تم توثيق موافقة وإقرار المعلم على كافة بنود لائحة العمل العامة بالمدرسة (31 بنداً) واعتمادها رسمياً في {{ employee()?.joining_date || '2026-01-01' }}.
              </div>
            </nb-panel>
          }

        </div>
      }

      @if (showContractModal) {
        <app-employee-contract-print-modal
          [employee]="employee()"
          (close)="showContractModal = false"
        ></app-employee-contract-print-modal>
      }

      <app-send-message-modal
        [(open)]="showMsgModal"
        [recipientName]="employee()?.full_name_ar || ''"
        [recipientPhone]="employee()?.mobile || employee()?.phone_1 || ''"
        [recipientEmail]="employee()?.email || ''"
        [contextVariables]="{ employee_name: employee()?.full_name_ar, job_title: employee()?.position }"
        [allowedCategories]="['hr']"
      ></app-send-message-modal>

    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 1200px; margin: 0 auto; font-family: var(--nb-font-family); background: var(--nb-background); }
    
    .loading-container {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 80px 20px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; margin-top: 20px;
    }
    .spinner {
      width: 48px; height: 48px; border: 4px solid #e2e8f0; border-top-color: #2563eb;
      border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 16px;
    }
    .loading-text { font-size: 16px; font-weight: 700; color: #1e293b; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .error-card { text-align: center; padding: 48px; background: #fff; border-radius: 16px; border: 1px solid #fee2e2; }
    .error-card .icon { font-size: 40px; margin-bottom: 12px; }

    /* الكارت التعريفي المعتمد برأس الصفحة */
    .profile-header-card {
      display: flex; gap: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;
      padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); margin-bottom: 24px; align-items: center;
    }
    @media (max-width: 768px) { .profile-header-card { flex-direction: column; text-align: center; } }
    
    .avatar-box { width: 90px; height: 90px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
    .avatar-img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-placeholder {
      width: 100%; height: 100%; background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #fff; font-size: 32px; font-weight: 800; display: flex; align-items: center; justify-content: center;
    }

    .main-info { flex: 1; display: flex; flex-direction: column; gap: 8px; }
    .title-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .title-row h2 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
    .role-subtitle { font-size: 14px; color: #64748b; margin: 0; font-weight: 600; }
    .emp-no { color: #2563eb; font-weight: 700; }

    .tags-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
    .tag { background: #f1f5f9; color: #334155; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }

    .quick-actions-box { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
    .btn-action-lg {
      border: none; padding: 10px 18px; border-radius: 8px; font-size: 13.5px; font-weight: 700;
      cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px;
    }
    .btn-action-lg.print { background: #e0f2fe; color: #0369a1; }
    .btn-action-lg.print:hover { background: #bae6fd; }
    .btn-action-lg.msg { background: #f3e8ff; color: #7e22ce; }
    .btn-action-lg.msg:hover { background: #e9d5ff; }

    /* التبويبات الداخلية */
    .details-tabs { display: flex; gap: 8px; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px; overflow-x: auto; padding-bottom: 4px; }
    .d-tab {
      background: none; border: none; padding: 10px 16px; font-size: 13.5px; font-weight: 600;
      color: #64748b; cursor: pointer; border-radius: 8px 8px 0 0; white-space: nowrap; transition: all 0.2s;
    }
    .d-tab:hover { background: #f8fafc; color: #0f172a; }
    .d-tab.active { background: #eff6ff; color: #2563eb; font-weight: 800; border-bottom: 3px solid #2563eb; }

    /* شبكة المعلومات */
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; padding: 20px; }
    .info-item { display: flex; flex-direction: column; gap: 4px; background: #f8fafc; padding: 14px; border-radius: 10px; border: 1px solid #f1f5f9; }
    .info-item.full { grid-column: 1 / -1; }
    .info-item .lbl { font-size: 12px; color: #64748b; font-weight: 600; }
    .info-item .val { font-size: 14px; color: #0f172a; font-weight: 600; }
    .phone-num { font-variant-numeric: tabular-nums; direction: ltr; text-align: right; }
    .highlight-wa { color: #16a34a; font-weight: 800; }

    .dual-sections { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 850px) { .dual-sections { grid-template-columns: 1fr; } }

    .list-wrapper { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .list-card-item { display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 12px 16px; border-radius: 10px; border: 1px solid #e2e8f0; }
    .list-card-item .icon { font-size: 20px; }
    .list-card-item .content { display: flex; flex-direction: column; flex: 1; }
    .list-card-item .name { font-weight: 700; color: #1e293b; font-size: 14px; }
    .list-card-item .phone { font-size: 12px; color: #64748b; }
    .btn-sm-wa { background: #dcfce7; color: #15803d; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; }

    .empty-msg { padding: 24px; text-align: center; color: #94a3b8; font-size: 13.5px; }

    /* جدول الأبناء */
    .table-responsive { width: 100%; display: flex; flex-direction: column; }
    .tbl-head-grid { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1.2fr 1fr; padding: 12px 18px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #475569; }
    .tbl-row-grid { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1.2fr 1fr; padding: 14px 18px; border-bottom: 1px solid #e2e8f0; align-items: center; font-size: 13.5px; }

    /* تفكيك الراتب */
    .payroll-breakdown-card { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; padding: 20px; }
    .salary-metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 4px; }
    .salary-metric .lbl { font-size: 12px; color: #64748b; font-weight: 600; }
    .salary-metric .num { font-size: 18px; font-weight: 800; color: #0f172a; }
    .salary-metric.minus .num { color: #dc2626; }
    .salary-metric.total { background: #dcfce7; border-color: #86efac; }
    .salary-metric.total .num { color: #166534; font-size: 22px; }

    .bylaws-info-box { margin: 0 20px 20px 20px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px; color: #92400e; font-size: 13.5px; line-height: 1.5; }

    .badge { padding: 4px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 700; }
    .badge.active, .badge.approved { background: #dcfce7; color: #15803d; }
    .badge.pending { background: #fef3c7; color: #92400e; }

    /* ربط الأبناء بالطلاب */
    .dep-grid { grid-template-columns: 1.4fr 0.9fr 1.1fr 0.9fr 1.7fr; }
    .disc-val { color: #16a34a; font-size: 15px; }
    .link-box { margin: 16px 20px 20px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; background: #f8fafc; }
    .link-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .link-hint { margin: 8px 0 12px; font-size: 12.5px; color: #64748b; line-height: 1.7; }
    .sug-row { display: grid; grid-template-columns: 1.2fr 2fr auto; gap: 12px; align-items: center; padding: 10px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; font-size: 13px; }
    .sug-meta { color: #64748b; font-size: 12.5px; }
    .nb-btn-primary.sm, .nb-btn-ghost.sm { padding: 6px 14px; font-size: 12px; }
    .nb-btn-ghost { background: transparent; border: none; color: #2563eb; font-weight: 600; cursor: pointer; }

    .nb-btn-primary { background: #2563eb; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; }
    .nb-btn-secondary { background: #e2e8f0; color: #1e293b; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; }

    .animate-fade { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class EmployeeDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly employee = signal<any>(null);
  readonly activeTab = signal<'personal' | 'contact' | 'academic' | 'dependents' | 'experiences' | 'payroll'>('personal');

  // ربط أبناء الموظف بالطلاب المسجّلين (المطابقة بالرقم الوطني لولي الأمر)
  readonly suggestions = signal<any[]>([]);
  readonly suggestionsLoaded = signal(false);
  readonly loadingSuggestions = signal(false);

  showContractModal = false;
  showMsgModal = false;

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.fetchEmployeeDetails(id);
      } else {
        this.loading.set(false);
      }
    });
  }

  private cleanApiUrl(endpoint: string): string {
    const base = environment.apiUrl.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    if (base.endsWith('/v1') && cleanEndpoint.startsWith('v1/')) {
      return `${base.replace(/\/v1$/, '')}/${cleanEndpoint}`;
    }
    return `${base}/${cleanEndpoint}`;
  }

  fetchEmployeeDetails(id: string) {
    this.loading.set(true);
    const url = this.cleanApiUrl(`v1/employees/employees/${id}/`);
    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.loading.set(false);
        const data = res?.data || res;
        this.employee.set(data);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('تعذر جلب تفاصيل بيانات الموظف.');
      }
    });
  }

  // ==== ربط أبناء الموظف بالطلاب المسجّلين ====

  /** يجلب الطلاب المطابقين بالرقم الوطني لولي الأمر والذين لم يُربطوا بعد. */
  loadLinkSuggestions() {
    const id = this.employee()?.id;
    if (!id) return;
    this.loadingSuggestions.set(true);
    const url = this.cleanApiUrl(`v1/employees/employees/${id}/link-suggestions/`);
    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.loadingSuggestions.set(false);
        this.suggestionsLoaded.set(true);
        this.suggestions.set((res?.data ?? res)?.suggestions ?? []);
      },
      error: () => {
        this.loadingSuggestions.set(false);
        this.suggestionsLoaded.set(true);
        this.notify.error('تعذّر جلب اقتراحات الربط.');
      },
    });
  }

  /** يؤكّد ربط طالب مقترح بملف الموظف — يفعّل الخصم على فواتيره القادمة. */
  confirmLink(s: any) {
    const id = this.employee()?.id;
    if (!id) return;
    const url = this.cleanApiUrl(`v1/employees/employees/${id}/confirm-link/`);
    this.http.post<any>(url, {
      student_id: s.student_id,
      dependent_id: s.dependent_id || undefined,
      student_name: s.student_name || '',
    }).subscribe({
      next: (res) => {
        this.notify.success(res?.message || 'تم ربط الطالب بملف الموظف.');
        this.suggestions.update(list => list.filter(x => x.student_id !== s.student_id));
        this.fetchEmployeeDetails(id);
      },
      error: () => this.notify.error('تعذّر تأكيد الربط.'),
    });
  }

  /** يفكّ ربط تصريح عن طالبه مع إبقاء التصريح قائماً. */
  unlinkDependent(dep: any) {
    const id = this.employee()?.id;
    if (!id) return;
    const url = this.cleanApiUrl(`v1/employees/employees/${id}/unlink-dependent/`);
    this.http.post<any>(url, { dependent_id: dep.id }).subscribe({
      next: () => {
        this.notify.success('تم فكّ الربط.');
        this.fetchEmployeeDetails(id);
      },
      error: () => this.notify.error('تعذّر فكّ الربط.'),
    });
  }

  openContractModal() {
    this.showContractModal = true;
  }

  initials(name: string): string {
    if (!name) return 'م';
    const parts = name.split(' ');
    const first = parts[0]?.replace('أ.', '')?.replace('م.', '')?.trim() || '';
    const second = parts[1] || '';
    return (first[0] || '') + (second[0] || '');
  }

  goBack() {
    this.router.navigate(['/hr']);
  }
}
