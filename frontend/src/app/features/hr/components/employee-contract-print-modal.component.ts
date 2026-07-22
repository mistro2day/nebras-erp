import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

@Component({
  selector: 'app-employee-contract-print-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()" dir="rtl">
      <div class="modal-card nb-card-shadow" (click)="$event.stopPropagation()">
        
        <!-- شريط أدوات الطباعة والإغلاق المعتمد بنظام نبراس OS -->
        <div class="no-print modal-header">
          <div class="header-brand">
            <div class="brand-logo">📖</div>
            <div class="brand-text">
              <h3>نظام نبراس لإدارة الموارد البشرية والعقود</h3>
              <p>معاينة وثيقة عقد معلم 2026م واللائحة التنظيمية الرسمية</p>
            </div>
          </div>
          <div class="header-actions">
            <button class="btn-print" (click)="printDocument()">🖨️ طباعة العقد الرسمي (A4)</button>
            <button class="btn-close" (click)="close.emit()">✕ إغلاق Window</button>
          </div>
        </div>

        <div class="document-container" id="contract-print-area">
          
          <!-- الصفحة الأولى: وثيقة واستمارة عقد معلم 2026م -->
          <div class="a4-sheet">
            
            <!-- ترويسة نبراس OS الهيكلية للمؤسسة -->
            <div class="nebras-doc-header">
              <div class="header-right">
                <p class="country">جمهورية السودان</p>
                <p class="ministry">وزارة التربية والتعليم والتربية الخاصة</p>
                <p class="school-name">مؤسسات المورد الجديدة للتعليم الخاص</p>
              </div>

              <div class="header-center">
                <div class="crest-box">
                  <div class="crest-icon">📖</div>
                  <span class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
                </div>
                <div class="contract-badge-pill">
                  <h1>عقد توظيف معلم لعام 2026م</h1>
                </div>
              </div>

              <div class="header-left">
                <div class="meta-box">
                  <p><b>التاريخ:</b> <span>{{ employee?.joining_date || '2026/01/02' }}</span></p>
                  <p><b>الفرع:</b> <span>{{ employee?.branch_name || 'الفرع الرئيسي' }}</span></p>
                  <p><b>المعرف الرقمي:</b> <span class="highlight-code">{{ employee?.employee_number || 'EMP-2026-001' }}</span></p>
                </div>
              </div>
            </div>

            <!-- 1. البيانات الشخصية والسكنية -->
            <div class="nebras-section-box">
              <div class="section-header-ribbon">
                <span class="ribbon-icon">👤</span>
                <h3>أولاً: البيانات الشخصية والسكنية</h3>
              </div>
              <div class="data-grid grid-cols-3">
                <div class="data-cell col-span-2">
                  <span class="lbl">اسم المعلم رباعياً:</span>
                  <span class="val font-bold-name">{{ employee?.full_name_ar || employee?.name }}</span>
                </div>
                <div class="data-cell">
                  <span class="lbl">اللقب العلمي / الإداري:</span>
                  <span class="val">{{ employee?.title_surname || 'أستاذ' }}</span>
                </div>
                <div class="data-cell">
                  <span class="lbl">الرقم الوطني / الهوية:</span>
                  <span class="val font-code">{{ employee?.national_id || '—' }}</span>
                </div>
                <div class="data-cell">
                  <span class="lbl">الحالة الاجتماعية:</span>
                  <span class="val">{{ employee?.marital_status === 'married' ? 'متزوج / متزوجة' : 'أعزب / عزباء' }}</span>
                </div>
                <div class="data-cell">
                  <span class="lbl">عدد الأبناء:</span>
                  <span class="val font-bold">{{ employee?.children_count || 0 }} أبناء</span>
                </div>
                <div class="data-cell col-span-3">
                  <span class="lbl">عنوان السكن التفصيلي:</span>
                  <span class="val">
                    المدينة: <b>{{ employee?.city || 'الخرطوم' }}</b> | 
                    الحي: <b>{{ employee?.neighborhood || '—' }}</b> | 
                    مربع: <b>{{ employee?.square_number || '—' }}</b> | 
                    منزل: <b>{{ employee?.house_number || '—' }}</b>
                  </span>
                </div>
                <div class="data-cell col-span-3">
                  <span class="lbl">اسم أقرب معلم بارز للتعرف بالمنظومة:</span>
                  <span class="val font-highlight">{{ employee?.prominent_teacher_friend || '—' }}</span>
                </div>
              </div>
            </div>

            <!-- 2. التواصل والواتساب المعرفون -->
            <div class="nebras-section-box">
              <div class="section-header-ribbon">
                <span class="ribbon-icon">📞</span>
                <h3>ثانياً: وسائل الاتصال والواتساب الدولي</h3>
              </div>
              <div class="data-grid grid-cols-3">
                <div class="data-cell">
                  <span class="lbl">الهاتف الرئيسي (1):</span>
                  <span class="val font-code ltr">{{ employee?.mobile || employee?.phone_1 || employee?.phone }}</span>
                </div>
                <div class="data-cell">
                  <span class="lbl">هاتف ثانٍ (2):</span>
                  <span class="val font-code ltr">{{ employee?.phone_2 || '—' }}</span>
                </div>
                <div class="data-cell">
                  <span class="lbl">الواتساب الدولي (E.164):</span>
                  <span class="val font-code wa-green ltr">✓ {{ employee?.whatsapp_number || employee?.mobile || '—' }}</span>
                </div>
                <div class="data-cell col-span-2">
                  <span class="lbl">رقم هاتف الطوارئ والرجوع:</span>
                  <span class="val font-code ltr">{{ employee?.emergency_phone_other || '—' }}</span>
                </div>
                <div class="data-cell">
                  <span class="lbl">صلة القرابة:</span>
                  <span class="val">{{ employee?.emergency_kinship || '—' }}</span>
                </div>
              </div>
            </div>

            <!-- 3. المعرفون والمراجع من معلمي المدرسة -->
            <div class="nebras-section-box">
              <div class="section-header-ribbon">
                <span class="ribbon-icon">👥</span>
                <h3>ثالثاً: أسماء وأرقام معلمين بالمدرسة يمكن الرجوع إليهم</h3>
              </div>
              <div class="data-grid grid-cols-2">
                @if (getReferences().length === 0) {
                  <div class="data-cell"><span>/1 ...............................................</span></div>
                  <div class="data-cell"><span>/2 ...............................................</span></div>
                } @else {
                  <div class="data-cell" *ngFor="let ref of getReferences(); let i = index">
                    <span class="lbl">/{{ i + 1 }} {{ ref.ref_name }}:</span>
                    <span class="val font-code ltr">{{ ref.ref_phone || '—' }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- 4. الأبناء بالمورد ورعايتهم مالياً -->
            <div class="nebras-section-box">
              <div class="section-header-ribbon">
                <span class="ribbon-icon">👨‍👩‍👧‍👦</span>
                <h3>رابعاً: الأبناء بالمدرسة وتخفيضات الرسوم المالية المعتمدة</h3>
              </div>
              <table class="nebras-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>اسم التلميذ رباعياً</th>
                    <th>المرحلة الدراسية</th>
                    <th>الصف الدراسي</th>
                    <th>نسبة الخصم المستحقة %</th>
                    <th>ملاحظات الاعتماد</th>
                  </tr>
                </thead>
                <tbody>
                  @if (getDependents().length === 0) {
                    <tr>
                      <td colspan="6" style="color: #64748b; padding: 12px;">لا يوجد أبناء مسجلون بالمدرسة لهذا المعلم</td>
                    </tr>
                  } @else {
                    <tr *ngFor="let child of getDependents(); let idx = index">
                      <td>{{ idx + 1 }}</td>
                      <td class="font-bold-name">{{ child.full_name }}</td>
                      <td>{{ child.academic_stage || '—' }}</td>
                      <td>{{ child.grade_level || '—' }}</td>
                      <td><b class="disc-tag">خصم {{ child.discount_percentage }}%</b></td>
                      <td><span class="status-ok">معتمد وفق لائحة أبناء العاملين ✓</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- 5. المؤهل الأساسي والتكليف الأكاديمي -->
            <div class="nebras-section-box">
              <div class="section-header-ribbon">
                <span class="ribbon-icon">🎓</span>
                <h3>خامساً: المؤهل العلمي والتكليف الأكاديمي والنصاب</h3>
              </div>
              <div class="data-grid grid-cols-3">
                <div class="data-cell">
                  <span class="lbl">الجامعة / المعهد:</span>
                  <span class="val font-bold">{{ employee?.university_institute || 'جامعة الخرطوم' }}</span>
                </div>
                <div class="data-cell">
                  <span class="lbl">الكلية:</span>
                  <span class="val">{{ employee?.faculty || 'كلية الآداب' }}</span>
                </div>
                <div class="data-cell">
                  <span class="lbl">التخصص الدقيق:</span>
                  <span class="val">{{ employee?.specialization || 'اللغة العربية' }}</span>
                </div>
                <div class="data-cell col-span-2">
                  <span class="lbl">المواد التي يتم تدريسها:</span>
                  <span class="val">
                    1/ <b>{{ employee?.teaching_subject_1 || 'المادة الأولى' }}</b> | 
                    2/ {{ employee?.teaching_subject_2 || '—' }} | 
                    3/ {{ employee?.teaching_subject_3 || '—' }}
                  </span>
                </div>
                <div class="data-cell">
                  <span class="lbl">نصاب الحصص الأسبوعي:</span>
                  <span class="val font-highlight">23 حصة (معفى من النوبتجية)</span>
                </div>
                <div class="data-cell col-span-3">
                  <span class="lbl">أي مهام أخرى أو أنشطة أكاديمية وإشرافية:</span>
                  <span class="val">{{ employee?.other_tasks_activities || 'رئيس شعبة، إشراف أكاديمي' }}</span>
                </div>
              </div>
            </div>

            <!-- 6. إقرار والتزام بلائحة العمل العامة -->
            <div class="pledge-banner">
              <div class="pledge-icon">✍️</div>
              <div class="pledge-text">
                <h4>إقرار والتزام بلائحة العمل العامة بالمدرسة:</h4>
                <p>
                  أقر أنا والمعلم / <b>{{ employee?.full_name_ar || employee?.name }}</b> باطلاعي التام على كافة البيانات الواردة بهذه الاستمارة وأنها صحيحة، وألتزم التزاماً كاملاً بجميع بنود لائحة العمل بالمدرسة (31 بنداً) والسعي للارتقاء بالجودة التعليمية والتربوية.
                </p>
              </div>
            </div>

            <!-- توقيعات واعتمادات نبراس OS -->
            <div class="signatures-strip">
              <div class="sig-card">
                <span class="sig-label">توقيع المعلم المباشر</span>
                <div class="sig-line">................................</div>
                <span class="sig-date">التاريخ: {{ employee?.joining_date || '2026/01/02' }}</span>
              </div>
              <div class="sig-card approved">
                <span class="sig-label">اعتماد مدير المدرسة</span>
                <div class="stamp-badge">✓ معتمد رسمياً [ الختم ]</div>
                <span class="sig-date">التاريخ: 2026/01/02</span>
              </div>
              <div class="sig-card approved">
                <span class="sig-label">اعتماد المدير الإداري</span>
                <div class="stamp-badge">✓ معتمد رسمياً [ الختم ]</div>
                <span class="sig-date">التاريخ: 2026/01/02</span>
              </div>
              <div class="sig-card approved">
                <span class="sig-label">اعتماد المدير العام</span>
                <div class="stamp-badge">✓ معتمد رسمياً [ الختم ]</div>
                <span class="sig-date">التاريخ: 2026/01/02</span>
              </div>
            </div>

          </div>

          <!-- الصفحة الثانية: الهيكل المالي ولائحة العمل لعام 2026م -->
          <div class="a4-sheet page-break">
            
            <div class="bylaw-banner-header">
              <h2>الاستحقاق المالي والبنود التنظيمية لعقد معلم 2026م</h2>
              <p>تفكيك المرتب الشهري الشامل والإقرار باللائحة الداخلية المرفقة</p>
            </div>

            <!-- جدول الراتب والمستحقات المالي المعتمد بستايل نبراس OS -->
            <table class="nebras-table payroll-table">
              <thead>
                <tr>
                  <th>الراتب الأساسي</th>
                  <th>بدل الترحيل</th>
                  <th>بدل اتصال وانترنت</th>
                  <th>بدل تمثيل</th>
                  <th>الخصومات الإدارية</th>
                  <th>المستحق صرفه صافياً</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>{{ (employee?.basic_salary || 200000) | number }} ج.س</b></td>
                  <td>{{ (employee?.transport_allowance || 80000) | number }} ج.س</td>
                  <td>{{ (employee?.communication_allowance || 40000) | number }} ج.س</td>
                  <td>{{ (employee?.representation_allowance || 30000) | number }} ج.س</td>
                  <td class="ded-text">- {{ (employee?.deductions || 0) | number }} ج.س</td>
                  <td class="net-highlight"><b>{{ (employee?.net_payable || (employee?.salary + employee?.allowance) || 350000) | number }} ج.س</b></td>
                </tr>
              </tbody>
            </table>

            <!-- اللائحة التنظيمية المطبوعة والبنود الإدارية -->
            <div class="rules-container">
              <div class="rule-block">
                <h4>أولاً: الضوابط الأكاديمية والتعليمية</h4>
                <ol>
                  <li>المعلم هو المسؤول الأول في متابعة الكراسات ثم يكمل دوره بمشرف الصف للوقوف على أداء الطالب ومستواه التربوي والأكاديمي.</li>
                  <li>التعاون التام مع الإشراف المخصص لكل فصل والعمل على إكمال العملية التربوية معاً بتفاهم وانسجام.</li>
                  <li>احترام أعضاء الشعبة والاتصال ومناقشة وتحليل ما درس مع الزملاء يسهل الوصول للغاية المطلوبة.</li>
                  <li>تسليم أوراق العمل مبكراً قبل بداية الباب أو الفصل ليسهل الفهم والاستذكار للطالب وحلها نموذجياً.</li>
                  <li>وضع الاختبارات أو الامتحانات الدورية حسب معايير القياس والتقويم التربوي والتقيد بذلك في الامتحان الجزئي.</li>
                  <li>الالتزام التام بتصحيح الاختبارات والامتحانات وفق ورقة الإجابات النموذجية للمادة.</li>
                </ol>
              </div>

              <div class="rule-block">
                <h4>ثانياً: الحضور والدوام والانضباط الإداري</h4>
                <ol>
                  <li>الحضور المبكر (قبل ثلث ساعة / 20 دقيقة من الطابور الصباحي) والانصراف بعد نصف ساعة من نهاية الحصة الأخيرة.</li>
                  <li>إخطار مدير المدرسة في حالة الغياب بصورة عامة قبل وقت كاف والعمل جاهداً على تغطية جدول حصصه اليومي مع زملائه.</li>
                  <li>الدخول والخروج من الحصص في المواعيد المحددة يساعد في هدوء المدرسة وعدم إزعاج الآخرين.</li>
                  <li>جدول المعلم للإسناد الأسبوعي بعد الإعفاء من النوبتجية (DUTY) بعدد ثلاث وعشرون حصة (23 حصة).</li>
                </ol>
              </div>

              <div class="rule-block">
                <h4>ثالثاً: السلفيات المالية ورعاية أبناء المعلمين</h4>
                <ol>
                  <li>تلتزم المدرسة بسداد الرواتب لكل المنسوبين للمدرسة حتى تاريخ نهاية العقد 31/7/2026م.</li>
                  <li>السلفيات حق أصيل للمعلم والإداري وتكون بحد أقصى مرتب شهر وتسدد على فترتين/قسطين متتاليين.</li>
                  <li>حق المعلم في إلحاق أبنائه بالمدرسة مع تطبيق خصومات الرسوم الدراسية: (تلميذ واحد 50%، تلميذان 30%، 3 تلاميذ 25%، 4 تلاميذ إعفاء تلميذ وخصم 20%، 5 تلاميذ إعفاء تلميذين).</li>
                  <li>أقارب المعلمين من الدرجة الأولى يتم دفع رسوم التسجيل + خصم 10% من الرسوم الدراسية.</li>
                </ol>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    /* تصميم نبراس OS العصري لمودال معاينة وتصدير الوثائق */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center;
      z-index: 9999; padding: 20px; overflow-y: auto; font-family: var(--nb-font-family, 'Cairo', sans-serif);
    }
    .modal-card {
      background: #f8fafc; color: #0f172a; border-radius: 20px; width: 100%; max-width: 960px;
      max-height: 94vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3); border: 1px solid rgba(255,255,255,0.2);
    }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between; padding: 18px 28px;
      background: linear-gradient(135deg, #0f172a, #1e293b); color: #ffffff; border-top-left-radius: 20px; border-top-right-radius: 20px;
      position: sticky; top: 0; z-index: 20; border-bottom: 2px solid #2563eb;
    }
    .header-brand { display: flex; align-items: center; gap: 14px; }
    .brand-logo { width: 42px; height: 42px; background: rgba(37,99,235,0.2); border: 1px solid #3b82f6; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
    .brand-text h3 { font-size: 16px; margin: 0; font-weight: 800; color: #ffffff; }
    .brand-text p { font-size: 12px; margin: 2px 0 0 0; color: #94a3b8; }
    
    .header-actions { display: flex; gap: 12px; }
    .btn-print {
      background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; border: none; padding: 10px 22px; border-radius: 10px;
      font-weight: 800; cursor: pointer; transition: all 0.2s; font-size: 14px; box-shadow: 0 4px 12px rgba(37,99,235,0.3);
    }
    .btn-print:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(37,99,235,0.4); }
    .btn-close {
      background: rgba(255,255,255,0.1); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.15); padding: 10px 16px;
      border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 700; transition: all 0.2s;
    }
    .btn-close:hover { background: rgba(255,255,255,0.2); color: #fff; }

    /* حاوية الورقة الرسمية A4 */
    .document-container { padding: 32px; background: #cbd5e1; display: flex; flex-direction: column; align-items: center; gap: 24px; }
    .a4-sheet {
      background: #ffffff; width: 100%; max-width: 820px; min-height: 1120px; padding: 36px 40px; border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.08); position: relative; color: #0f172a; font-size: 13px; line-height: 1.5;
    }
    
    /* الترويسة الهيكلية لنبراس OS */
    .nebras-doc-header {
      display: grid; grid-template-columns: 1fr 1.3fr 1fr; align-items: center; gap: 12px;
      border-bottom: 3px double #0f172a; padding-bottom: 16px; margin-bottom: 22px; text-align: center;
    }
    .header-right { text-align: right; }
    .country { font-size: 12px; font-weight: 700; color: #475569; margin: 0; }
    .ministry { font-size: 12px; font-weight: 700; color: #475569; margin: 2px 0; }
    .school-name { font-size: 15px; font-weight: 800; color: #1e3a8a; margin: 2px 0 0 0; }

    .crest-box { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .crest-icon { font-size: 26px; }
    .bismillah { font-size: 12px; font-weight: 700; color: #334155; }
    .contract-badge-pill { background: #eff6ff; border: 1px solid #bfdbfe; padding: 4px 18px; border-radius: 20px; margin-top: 6px; display: inline-block; }
    .contract-badge-pill h1 { font-size: 16px; font-weight: 800; color: #1d4ed8; margin: 0; }

    .header-left { text-align: left; }
    .meta-box p { font-size: 11.5px; color: #334155; margin: 3px 0; font-weight: 600; }
    .highlight-code { font-family: monospace; font-weight: 800; color: #2563eb; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }

    /* كتل الصناديق الهيكلية للمعلومات */
    .nebras-section-box {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    .section-header-ribbon { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
    .ribbon-icon { font-size: 16px; }
    .section-header-ribbon h3 { font-size: 14px; font-weight: 800; color: #1e3a8a; margin: 0; }

    .data-grid { display: grid; gap: 8px 16px; }
    .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
    .col-span-2 { grid-column: span 2; }
    .col-span-3 { grid-column: span 3; }

    .data-cell { display: flex; align-items: baseline; gap: 6px; font-size: 12.5px; flex-wrap: wrap; }
    .data-cell .lbl { color: #475569; font-weight: 600; font-size: 12px; }
    .data-cell .val { color: #0f172a; font-weight: 700; border-bottom: 1px dashed #cbd5e1; padding: 0 4px; }
    .font-bold-name { font-size: 14px; font-weight: 800; color: #0f172a; }
    .font-highlight { color: #0284c7; font-weight: 800; }
    .font-code { font-family: monospace; font-weight: 700; }
    .wa-green { color: #16a34a; font-weight: 800; }
    .ltr { direction: ltr; display: inline-block; }

    /* جداول نبراس القياسية */
    .nebras-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; text-align: center; }
    .nebras-table th, .nebras-table td { border: 1px solid #cbd5e1; padding: 8px 10px; }
    .nebras-table th { background: #f8fafc; color: #1e293b; font-weight: 800; }
    .disc-tag { color: #16a34a; font-weight: 800; }
    .status-ok { background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px; }

    .pledge-banner {
      display: flex; gap: 14px; background: #fffbeb; border: 1px solid #fde68a; border-right: 5px solid #d97706;
      border-radius: 10px; padding: 14px 18px; margin: 18px 0; align-items: flex-start;
    }
    .pledge-icon { font-size: 24px; }
    .pledge-text h4 { font-size: 13.5px; font-weight: 800; color: #92400e; margin: 0 0 4px 0; }
    .pledge-text p { font-size: 12px; color: #78350f; margin: 0; line-height: 1.5; }

    /* شريط التوقيعات نبراس OS */
    .signatures-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 20px; border-top: 2px solid #e2e8f0; padding-top: 16px; text-align: center; }
    .sig-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 8px; display: flex; flex-direction: column; gap: 4px; }
    .sig-label { font-size: 11.5px; font-weight: 800; color: #1e3a8a; }
    .sig-line { color: #94a3b8; font-size: 11px; margin: 6px 0; }
    .stamp-badge { color: #16a34a; font-weight: 800; font-size: 11px; }
    .sig-date { font-size: 10.5px; color: #64748b; }

    /* مفردات المرتب واللائحة في الصفحة الثانية */
    .bylaw-banner-header { border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 16px; }
    .bylaw-banner-header h2 { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; }
    .bylaw-banner-header p { font-size: 12px; color: #64748b; margin: 2px 0 0 0; }

    .payroll-table th { background: #0f172a; color: #ffffff; font-size: 12.5px; }
    .payroll-table td { font-size: 13px; }
    .ded-text { color: #dc2626; font-weight: 700; }
    .net-highlight { background: #dcfce7; color: #166534; font-size: 15px; font-weight: 800; }

    .rules-container { display: flex; flex-direction: column; gap: 14px; margin-top: 16px; }
    .rule-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
    .rule-block h4 { font-size: 13.5px; font-weight: 800; color: #1d4ed8; margin: 0 0 6px 0; }
    .rule-block ol { padding-right: 20px; font-size: 12px; color: #334155; line-height: 1.55; margin: 0; }

    @media print {
      body * { visibility: hidden !important; }
      #contract-print-area, #contract-print-area * { visibility: visible !important; }
      #contract-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; background: #fff; }
      .no-print { display: none !important; }
      .modal-backdrop { position: static !important; background: none !important; padding: 0 !important; }
      .modal-card { box-shadow: none !important; max-width: 100% !important; max-height: none !important; border: none !important; background: #fff; }
      .a4-sheet { border: none !important; padding: 10mm !important; margin-bottom: 0 !important; width: 100% !important; max-width: 100% !important; box-shadow: none !important; }
      .page-break { page-break-before: always !important; }
    }
  `]
})
export class EmployeeContractPrintModalComponent {
  @Input() employee: any = null;
  @Output() close = new EventEmitter<void>();

  getReferences() {
    return this.employee?.references || [];
  }

  getDependents() {
    return this.employee?.dependents || [];
  }

  printDocument() {
    const area = document.getElementById('contract-print-area');
    if (!area) {
      window.print();
      return;
    }

    const printWin = window.open('', '_blank', 'width=950,height=900');
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <title>عقد توظيف معلم 2026م - ${this.employee?.full_name_ar || this.employee?.name || ''}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', 'Segoe UI', sans-serif; }
            body { padding: 12mm; background: #fff; color: #0f172a; direction: rtl; line-height: 1.5; font-size: 12.5px; }
            
            .a4-sheet { background: #fff; border: 1px solid #cbd5e1; padding: 20px; border-radius: 8px; margin-bottom: 20px; page-break-after: always; }
            .page-break { page-break-before: always; }

            .nebras-doc-header { display: grid; grid-template-columns: 1fr 1.2fr 1fr; align-items: center; gap: 10px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; text-align: center; }
            .header-right { text-align: right; }
            .country { font-size: 11.5px; font-weight: 700; color: #475569; }
            .ministry { font-size: 11.5px; font-weight: 700; color: #475569; }
            .school-name { font-size: 14px; font-weight: 800; color: #1e3a8a; }
            .bismillah { font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px; }
            .contract-badge-pill { background: #eff6ff; border: 1px solid #bfdbfe; padding: 4px 14px; border-radius: 20px; display: inline-block; }
            .contract-badge-pill h1 { font-size: 15px; font-weight: 800; color: #1d4ed8; }
            .header-left { text-align: left; font-size: 11.5px; color: #334155; }
            .highlight-code { font-family: monospace; font-weight: 800; color: #2563eb; }

            .nebras-section-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; }
            .section-header-ribbon { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
            .section-header-ribbon h3 { font-weight: 800; font-size: 13px; color: #1e3a8a; }

            .data-grid { display: grid; gap: 6px 12px; }
            .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
            .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
            .col-span-2 { grid-column: span 2; }
            .col-span-3 { grid-column: span 3; }
            .data-cell { display: flex; gap: 4px; flex-wrap: wrap; align-items: baseline; }
            .data-cell .lbl { color: #475569; font-weight: 600; font-size: 11.5px; }
            .data-cell .val { font-weight: 700; color: #0f172a; border-bottom: 1px dashed #94a3b8; padding: 0 4px; }
            .font-bold-name { font-size: 13.5px; font-weight: 800; color: #0f172a; }
            .font-highlight { color: #0284c7; font-weight: 800; }
            .font-code { font-family: monospace; font-weight: 700; }
            .wa-green { color: #16a34a; font-weight: 800; }
            .ltr { direction: ltr; display: inline-block; }

            .nebras-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 12px; }
            .nebras-table th, .nebras-table td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: center; }
            .nebras-table th { background: #f8fafc; color: #0f172a; font-weight: 800; }

            .payroll-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12.5px; }
            .payroll-table th, .payroll-table td { border: 1px solid #94a3b8; padding: 8px; text-align: center; }
            .payroll-table th { background: #0f172a; color: #fff; }
            .ded-text { color: #dc2626; font-weight: 700; }
            .net-highlight { background: #dcfce7; color: #166534; font-size: 14px; font-weight: 800; }

            .pledge-banner { background: #fffbeb; border-right: 4px solid #d97706; padding: 8px 12px; border-radius: 6px; font-size: 12px; line-height: 1.4; margin: 12px 0; color: #92400e; }
            .signatures-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 14px; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 11px; text-align: center; }
            .sig-card { background: #fff; border: 1px solid #e2e8f0; padding: 6px; border-radius: 4px; }
            .sig-label { font-size: 11px; font-weight: 800; color: #1e3a8a; }
            .sig-line { color: #94a3b8; margin: 6px 0; }
            .stamp-badge { color: #16a34a; font-weight: 800; font-size: 10.5px; }
            .sig-date { color: #64748b; font-size: 10px; }

            .bylaw-banner-header h2 { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
            .bylaw-banner-header p { font-size: 11.5px; color: #64748b; }
            .rule-block { margin-top: 8px; }
            .rule-block h4 { color: #1d4ed8; font-size: 13px; margin-bottom: 2px; }
            .rule-block ol { padding-right: 18px; font-size: 11.5px; color: #334155; line-height: 1.45; }
          </style>
        </head>
        <body>
          ${area.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
        </html>
      `);
      printWin.document.close();
    } else {
      window.print();
    }
  }
}
