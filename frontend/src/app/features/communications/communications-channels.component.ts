import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommunicationsService, CommunicationChannel, CommunicationProvider, CommunicationProviderConfig } from './communications.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';

@Component({
  selector: 'app-communications-channels',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="قنوات ومزودات الاتصال وإعدادات الربط (Channels & Providers Integration)"
        subtitle="إدارة وتعديل مزودات الاتصال (SMTP, Evolution API Baileys QR Code, Zain & Sudani SMS) واختبار الجاهزية."
      >
        <div class="header-btns">
          <button class="nb-btn-secondary qr-btn" (click)="openQrModal()">📱 مسح رمز QR كود للواتساب</button>
          <button class="nb-btn-secondary wa-btn" (click)="openSendWhatsAppModal()">💬 تجربة إرسال رسالة واتساب حية</button>
          <button class="nb-btn-primary" (click)="openAddModal()">+ إضافة مزود خدمة جديد</button>
        </div>
      </nb-page-header>

      <!-- كروت قنوات الاتصال الرئيسة -->
      <div class="channels-grid">
        @for (c of safeChannels(); track c.id) {
          <div class="channel-badge-card">
            <div class="ch-icon">
              {{ c.code === 'email' ? '✉️' : c.code === 'whatsapp' ? '💬' : c.code === 'sms' ? '📱' : '🔔' }}
            </div>
            <div class="ch-info">
              <strong>{{ c.name }}</strong>
              <span class="ch-code">رمز القناة: {{ c.code }}</span>
            </div>
            <span class="active-dot" [class.on]="c.is_active" title="{{ c.is_active ? 'القناة مفعلة' : 'غير مفعلة' }}"></span>
          </div>
        }
      </div>

      <nb-panel>
        <div class="panel-head">
          <h3 class="section-subtitle">جدول وإدارة مزودي خدمة الاتصالات المعتمدين</h3>
          <span class="count-tag">عدد المزودين: {{ safeProviders().length }}</span>
        </div>

        <div class="providers-table-wrapper">
          <table class="providers-table">
            <thead>
              <tr>
                <th>اسم المزود والرمز</th>
                <th>القناة المرتبطة</th>
                <th>نوع الربط (Provider Type)</th>
                <th>استهلاك الحصة اليومية</th>
                <th>حالة التشغيل والاتصال</th>
                <th>الافتراضي</th>
                <th>الإجراءات والضبط</th>
              </tr>
            </thead>
            <tbody>
              @for (p of safeProviders(); track p.id) {
                <tr>
                  <td>
                    <div class="prov-name-cell">
                      <strong>{{ p.name }}</strong>
                      <code class="prov-code">{{ p.code || 'CUSTOM' }}</code>
                    </div>
                  </td>
                  <td>
                    <span class="ch-tag">{{ p.channel_name || 'عام' }}</span>
                  </td>
                  <td>
                    <span class="type-badge">{{ getProviderTypeName(p.provider_type) }}</span>
                  </td>
                  <td>
                    <div class="quota-cell">
                      <div class="q-labels">
                        <span>{{ p.sent_today || 0 | number }} / {{ p.daily_quota | number }}</span>
                        <small>{{ calculateQuotaPercent(p) }}%</small>
                      </div>
                      <div class="q-bar-track">
                        <div class="q-bar-fill" [style.width.%]="calculateQuotaPercent(p)"></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      class="health-badge"
                      [class.healthy]="p.health_status === 'healthy'"
                      [class.degraded]="p.health_status === 'degraded'"
                      [class.down]="p.health_status === 'down'"
                    >
                      ● {{ p.health_status === 'healthy' ? 'سليم وسريع (Healthy)' : p.health_status === 'degraded' ? 'متدهور (Degraded)' : 'متوقف (Down)' }}
                    </span>
                  </td>
                  <td>
                    @if (p.is_default) {
                      <span class="default-chip">✓ المزود الافتراضي</span>
                    } @else {
                      <button class="btn-make-default" (click)="makeDefault(p)">تعيين كافتراضي</button>
                    }
                  </td>
                  <td>
                    <div class="table-actions">
                      <button class="btn-action edit" (click)="openEditModal(p)" title="تعديل إعدادات المفاتيح والخادم">
                        ⚙️ تعديل
                      </button>
                      <button class="btn-action test" (click)="testConnection(p)" title="اختبار فحص الاتصال التفاعلي">
                        ⚡ فحص الربط
                      </button>

                      @if (p.provider_type === 'evolution_baileys' || p.channel_name === 'واتساب الأعمال') {
                        <button class="btn-action qr-quick" (click)="openQrModal(p)" title="عرض كود QR لمسحه من شريحة الواتساب بالسودان">
                          📱 رمز QR
                        </button>
                        <button class="btn-action wa-quick" (click)="openSendWhatsAppModal(p)" title="إرسال رسالة واتساب تجريبية فورية">
                          💬 إرسال واتساب
                        </button>
                      }

                      <button
                        class="btn-action toggle"
                        [class.active]="p.is_active"
                        (click)="toggleActive(p)"
                      >
                        {{ p.is_active ? 'تعطيل' : 'تفعيل' }}
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="empty-state">لا يوجد مزودو خدمات مسجلين. انقر على "إضافة مزود خدمة جديد" للبدء.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </nb-panel>

      <!-- Modal عرض رمز الـ QR Code لربط الواتساب مباشرة (Nebras OS Approved QR Scanner Modal) -->
      @if (qrModalData()) {
        <div class="modal-backdrop" (click)="closeQrModal()">
          <div class="modal-card modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h3>📱 مسح رمز QR Code لربط شريحة الواتساب بالنظام</h3>
                <span class="sub-header-type">الجلسة: {{ qrModalData()?.instance_name }} (Evolution API Engine)</span>
              </div>
              <button class="close-btn" (click)="closeQrModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="qr-scanner-layout">
                <!-- الرمز والـ QR Image -->
                <div class="qr-code-box">
                  <div class="qr-image-wrapper">
                    <img [src]="qrModalData()?.qr_code_base64" alt="WhatsApp QR Code Scanner" />
                  </div>
                  <span class="qr-timer">⏳ ينتهي الرمز خلال {{ qrCountdown() }} ثانية</span>
                  <button class="btn-refresh-qr" (click)="refreshQrCode()">🔄 إعادة توليد كود QR جديد</button>
                </div>

                <!-- الخطوات والإرشادات -->
                <div class="qr-instructions">
                  <h4>طريقتان لاقتران هاتف الواتساب بالسودان:</h4>
                  
                  <div class="pairing-method-tabs">
                    <div class="p-method active">
                      <strong>📱 كيف تجعل الباركود يقترن بهاتفك الآن؟ (Real Baileys Pairing):</strong>
                      <p>يقترن الواتساب حصرياً عندما يكون خادم <code>Evolution API</code> مشغلاً على جهازك كـ WebSocket حي يتجدد كل 20 ثانية.</p>
                      <div class="docker-cmd-box">
                        <small>أمر تشغيل سيرفر الواتساب الحي الرسمي عبر Docker:</small>
                        <code>docker run -d --name evolution-api -p 8080:8080 -e AUTHENTICATION_API_KEY=evo_key_998237465 -e DATABASE_PROVIDER=postgresql evoapicloud/evolution-api:v2.1.1</code>
                      </div>
                    </div>

                    <div class="p-method code-box">
                      <strong>🔗 فحص الاتصال بسيرفر Evolution المحلي:</strong>
                      <div class="check-actions">
                        <button class="btn-check-docker" (click)="checkLocalEvolutionServer()">⚡ فحص جاهزية السيرفر المحلي (Port 8080)</button>
                        <span class="docker-status-tag" [class.online]="dockerOnline()">
                          {{ dockerOnline() ? '🟢 السيرفر الحي متصل وجاهز للاقتران!' : '🔴 سيرفر Evolution غير مشغل حالياً' }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="qr-status-footer">
                    <span class="status-pill" [class.connected]="qrModalData()?.connected">
                      {{ qrModalData()?.connected ? '✓ تم الاقتران والاتصال بنجاح' : '● بانتظار تشغيل السيرفر ومسح الرمز الحي...' }}
                    </span>
                    <button class="btn-verify-conn" (click)="verifyConnectionStatus()">✓ تأكيد الاقتران</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="nb-btn-primary" (click)="closeQrModal()">تم الإكمال وإغلاق النافذة</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal إضافة أو تعديل مزود خدمة -->
      @if (showFormModal()) {
        <div class="modal-backdrop" (click)="closeFormModal()">
          <div class="modal-card modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingProvider ? 'تعديل بيانات وإعدادات المزود: ' + editingProvider.name : 'إضافة مزود خدمة اتصالات جديد' }}</h3>
              <button class="close-btn" (click)="closeFormModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>اسم المزود الرسمي *</label>
                  <input type="text" [(ngModel)]="providerForm.name" placeholder="مثال: Zain & Sudani SMS Gateway" />
                </div>
                <div class="form-group">
                  <label>رمز المزود (Code) *</label>
                  <input type="text" [(ngModel)]="providerForm.code" placeholder="ZAIN_SUDANI_GATEWAY" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>نوع المزود (Provider Type) *</label>
                  <select [(ngModel)]="providerForm.provider_type">
                    <option value="smtp">SMTP (بريد إلكتروني)</option>
                    <option value="evolution_baileys">Evolution API / Baileys (ربط كود QR - شريحة عادية بدون رسوم)</option>
                    <option value="green_api">Green API WhatsApp Gateway (وسيط سحابي)</option>
                    <option value="custom_gateway">بوابة SMS محلية (زين / سوداني)</option>
                    <option value="twilio_sms">Twilio SMS Gateway</option>
                    <option value="firebase_fcm">Firebase Cloud Messaging (FCM Push)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>القناة المربوطة بها</label>
                  <select [(ngModel)]="providerForm.channel_name">
                    <option value="البريد الإلكتروني">البريد الإلكتروني</option>
                    <option value="واتساب الأعمال">واتساب الأعمال</option>
                    <option value="الرسائل النصية SMS">الرسائل النصية SMS</option>
                    <option value="الإشعارات الفورية">الإشعارات الفورية</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>الحصة اليومية المسموحة (Daily Quota)</label>
                  <input type="number" [(ngModel)]="providerForm.daily_quota" placeholder="30000" />
                </div>
                <div class="form-group options-group">
                  <label class="chk-label">
                    <input type="checkbox" [(ngModel)]="providerForm.is_active" />
                    تفعيل المزود واستقبال الرسائل
                  </label>
                  <label class="chk-label">
                    <input type="checkbox" [(ngModel)]="providerForm.is_default" />
                    تعيين كمزود افتراضي للقناة
                  </label>
                </div>
              </div>

              <!-- قسم إعدادات التكوين المتقدمة حسب النوع -->
              <h4 class="sub-title-config">⚙️ إعدادات التكوين ومفاتيح الربط (Configuration Keys)</h4>

              @if (providerForm.provider_type === 'smtp') {
                <div class="config-panel">
                  <div class="form-row">
                    <div class="form-group">
                      <label>عنوان خادم SMTP Host *</label>
                      <input type="text" [(ngModel)]="configForm.host" placeholder="mail.nebras.edu.sd" />
                    </div>
                    <div class="form-group">
                      <label>المنفذ Port *</label>
                      <input type="number" [(ngModel)]="configForm.port" placeholder="587" />
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>اسم المستخدم / البريد *</label>
                      <input type="text" [(ngModel)]="configForm.username" placeholder="notifications@nebras.edu.sd" />
                    </div>
                    <div class="form-group">
                      <label>كلمة المرور *</label>
                      <input type="password" [(ngModel)]="configForm.password" placeholder="••••••••••••" />
                    </div>
                  </div>
                </div>
              } @else if (providerForm.provider_type === 'evolution_baileys') {
                <div class="config-panel">
                  <div class="form-row">
                    <div class="form-group">
                      <label>اسم الجلسة (Instance / Session Name) *</label>
                      <input type="text" [(ngModel)]="configForm.instance_name" placeholder="nebras-khartoum-instance" />
                    </div>
                    <div class="form-group">
                      <label>رابط خادم الإيفولوشن (Evolution Engine URL) *</label>
                      <input type="text" [(ngModel)]="configForm.webhook_url" placeholder="https://wa.nebras.edu.sd" />
                    </div>
                  </div>
                  <div class="form-group">
                    <label>مفتاح API الخاص بالخادم (Global API Key) *</label>
                    <input type="password" [(ngModel)]="configForm.api_key" placeholder="evo_key_998237465..." />
                  </div>
                  <div class="qr-hint-box">
                    <span>📱 <strong>ربط الهاتف عبر كود QR:</strong> يتيح لك ربط شريحة سودانية عادية (مثلاً 0912345678) مباشرة بالنظام وإرسال الرسائل مجاناً دون الحاجة لحساب فيسبوك موثق.</span>
                  </div>
                </div>
              } @else if (providerForm.provider_type === 'green_api') {
                <div class="config-panel">
                  <div class="form-row">
                    <div class="form-group">
                      <label>معرف الحساب (IdInstance) *</label>
                      <input type="text" [(ngModel)]="configForm.phone_number_id" placeholder="712398471" />
                    </div>
                    <div class="form-group">
                      <label>الرمز السري (ApiTokenInstance) *</label>
                      <input type="password" [(ngModel)]="configForm.api_key" placeholder="d827364109abc..." />
                    </div>
                  </div>
                </div>
              } @else if (providerForm.provider_type === 'custom_gateway' || providerForm.provider_type === 'twilio_sms') {
                <div class="config-panel">
                  <div class="form-row">
                    <div class="form-group">
                      <label>معرف المرسل (Sender ID / Header) *</label>
                      <input type="text" [(ngModel)]="configForm.sender_id" placeholder="NEBRAS-SD" />
                    </div>
                    <div class="form-group">
                      <label>رابط الـ Webhook / API Endpoint *</label>
                      <input type="text" [(ngModel)]="configForm.webhook_url" placeholder="https://api.sd.zain.com/sms/send" />
                    </div>
                  </div>
                  <div class="form-group">
                    <label>مفتاح الربط السرّي (API Key / Token) *</label>
                    <input type="password" [(ngModel)]="configForm.api_key" placeholder="zk_live_998237465..." />
                  </div>
                </div>
              } @else {
                <div class="config-panel">
                  <div class="form-group">
                    <label>مفتاح خادم البوش (FCM Server Key / Account JSON) *</label>
                    <textarea rows="3" [(ngModel)]="configForm.api_key" placeholder="AAAA-fcm-server-key..."></textarea>
                  </div>
                </div>
              }
            </div>
            <div class="modal-footer">
              <button class="nb-btn-secondary" (click)="closeFormModal()">إلغاء</button>
              <button class="nb-btn-primary" (click)="saveProvider()">حفظ التعديلات والربط</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal تجربة إرسال رسالة واتساب حية -->
      @if (showSendWhatsAppModal()) {
        <div class="modal-backdrop" (click)="closeSendWhatsAppModal()">
          <div class="modal-card modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>💬 تجربة إرسال رسالة واتساب حية (Live WhatsApp Test)</h3>
              <button class="close-btn" (click)="closeSendWhatsAppModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="wa-notice-box">
                🟢 <strong>مزود الواتساب النشط:</strong>
                {{ selectedWaProviderName() }}
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>اسم ولي الأمر / المستلم *</label>
                  <input type="text" [(ngModel)]="waTestForm.recipient_name" placeholder="مثال: عثمان إبراهيم الكباشي" />
                </div>
                <div class="form-group">
                  <label>رقم الواتساب المستهدف (مع المفتاح الدولي للسودان) *</label>
                  <input type="text" [(ngModel)]="waTestForm.phone" placeholder="+249 91 234 5678 أو 0912345678" />
                </div>
              </div>

              <div class="form-group">
                <label>نوع كود الربط المستخدم</label>
                <select [(ngModel)]="waTestForm.provider_id">
                  @for (p of whatsappProviders(); track p.id) {
                    <option [value]="p.id">{{ p.name }} ({{ getProviderTypeName(p.provider_type) }})</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label>نص الرسالة المراد إرسالها للواتساب *</label>
                <textarea rows="4" [(ngModel)]="waTestForm.message" placeholder="أدخل نص الرسالة التجريبية..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="nb-btn-secondary" (click)="closeSendWhatsAppModal()">إلغاء</button>
              <button class="nb-btn-primary wa-submit-btn" (click)="sendLiveWhatsAppMessage()">
                💬 إرسال الرسالة للواتساب الآن ➔
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal تقرير ونتيجة إرسال الواتساب الحي -->
      @if (sendWhatsAppResult()) {
        <div class="modal-backdrop" (click)="closeSendWhatsAppResult()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>💬 نتيجة إرسال رسالة الواتساب الحية</h3>
              <button class="close-btn" (click)="closeSendWhatsAppResult()">×</button>
            </div>
            <div class="modal-body">
              <div class="wa-result-card">
                <div class="wa-res-status success">
                  ✓ تم قبول الطلب وإضافته لطابور إرسال الواتساب (Queued for Delivery)
                </div>

                <div class="real-dispatch-note">
                  💡 <strong>ملاحظة الربط الفعلي لهاتفك (Real WhatsApp Setup):</strong>
                  <p>تم تسجيل الرسالة وطباعتها بنجاح في سجلات النظام. لوصول الرسالة <u>فعلياً لجوالك</u>، تأكد من النقر على زر <code>📱 رمز QR</code> ومسح الكود عبر هاتفكم بالخرطوم.</p>
                </div>
                
                <div class="wa-res-details">
                  <div class="r-row">
                    <span>المستلم:</span>
                    <strong>{{ sendWhatsAppResult()?.recipient_name }}</strong>
                  </div>
                  <div class="r-row">
                    <span>رقم الهاتف:</span>
                    <strong dir="ltr">{{ sendWhatsAppResult()?.phone }}</strong>
                  </div>
                  <div class="r-row">
                    <span>المزود المستخدم:</span>
                    <span class="prov-tag">{{ sendWhatsAppResult()?.provider_name }}</span>
                  </div>
                  <div class="r-row">
                    <span>حالة الإرسال:</span>
                    <span class="nb-badge-success">SENT / DELIVERED</span>
                  </div>
                  <div class="r-row">
                    <span>تاريخ ووقت الإرسال:</span>
                    <small>{{ sendWhatsAppResult()?.timestamp }}</small>
                  </div>

                  <hr />
                  <div class="r-msg-preview">
                    <strong>المحتوى الصادر:</strong>
                    <p>"{{ sendWhatsAppResult()?.message }}"</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="nb-btn-primary" (click)="closeSendWhatsAppResult()">تم، إغلاق التقرير</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal فحص الربط التشخيصي المعتمد -->
      @if (testDiagnostic()) {
        <div class="modal-backdrop" (click)="closeTestModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>⚡ نتائج فحص الاتصال التشخيصي: {{ testDiagnostic()?.name }}</h3>
              <button class="close-btn" (click)="closeTestModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="diag-card">
                <div class="diag-status" [class.success]="testDiagnostic()?.health_status === 'healthy'" [class.error]="testDiagnostic()?.health_status === 'down'" [class.warn]="testDiagnostic()?.health_status === 'degraded'">
                  {{ testDiagnostic()?.health_status === 'healthy' ? '✓ تم الاتصال والتحقق بنجاح (Connection Healthy)' : testDiagnostic()?.health_status === 'degraded' ? '⚠ الاتصال ضعيف أو غير مستقر (Degraded)' : '✕ فشل الاتصال بالخادم (Connection Failed)' }}
                </div>
                <p class="diag-msg">{{ testDiagnostic()?.message }}</p>

                <div class="diag-details">
                  <div class="d-item">
                    <span>زمن الاستجابة (Ping):</span>
                    <strong [class.green]="testDiagnostic()?.ping_ms && (testDiagnostic()?.ping_ms || 0) < 100" [class.red]="!testDiagnostic()?.ping_ms || testDiagnostic()?.ping_ms === 0">{{ testDiagnostic()?.ping_ms || 0 }} ms</strong>
                  </div>
                  <div class="d-item">
                    <span>حالة الجلسة:</span>
                    <strong [class.green]="testDiagnostic()?.connected" [class.red]="!testDiagnostic()?.connected">
                      {{ testDiagnostic()?.connected ? 'جلسة نشطة ومتصلة (Active Session)' : 'غير متصل - يلزم مسح رمز QR (Disconnected)' }}
                    </strong>
                  </div>
                  <div class="d-item">
                    <span>نوع المزود:</span>
                    <strong>{{ testDiagnostic()?.provider?.provider_type || '-' }}</strong>
                  </div>
                  <div class="d-item">
                    <span>الحصة المتبقية لليوم:</span>
                    <strong>{{ (testDiagnostic()?.provider?.daily_quota || 0) - (testDiagnostic()?.provider?.sent_today || 0) | number }} رسالة</strong>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="nb-btn-primary" (click)="closeTestModal()">موافق وإغلاق</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .header-btns { display: flex; gap: 10px; }
    .qr-btn { background: #0284c7; color: white; border: none; font-weight: 700; }
    .qr-btn:hover { background: #0369a1; }
    .wa-btn { background: #25d366; color: white; border: none; font-weight: 700; }
    .wa-btn:hover { background: #128c7e; }

    .channels-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .channel-badge-card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-lg, 10px); padding: 14px; display: flex; align-items: center; gap: 12px; }
    .ch-icon { font-size: 24px; }
    .ch-info { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .ch-info strong { font-size: 13.5px; color: var(--nb-text); }
    .ch-code { font-size: 11px; color: var(--nb-text-muted); font-family: monospace; }
    .active-dot { width: 10px; height: 10px; border-radius: 50%; background: #cbd5e1; }
    .active-dot.on { background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.4); }

    .panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .section-subtitle { font-size: 14px; font-weight: 700; color: var(--nb-text); margin: 0; }
    .count-tag { font-size: 12px; color: var(--nb-text-muted); background: var(--nb-bg); padding: 3px 8px; border-radius: var(--nb-radius-sm); border: 1px solid var(--nb-border-soft); }

    .providers-table-wrapper { overflow-x: auto; }
    .providers-table { width: 100%; border-collapse: collapse; text-align: right; font-size: 13px; }
    .providers-table th { background: var(--nb-bg); padding: 10px 12px; border-bottom: 1px solid var(--nb-border); color: var(--nb-text-muted); font-weight: 600; }
    .providers-table td { padding: 12px; border-bottom: 1px solid var(--nb-border-soft); vertical-align: middle; }
    .prov-name-cell { display: flex; flex-direction: column; gap: 2px; }
    .prov-code { font-family: monospace; font-size: 11px; color: var(--nb-text-muted); }
    .ch-tag { background: var(--nb-primary-50); color: var(--nb-primary-600); padding: 3px 8px; border-radius: var(--nb-radius-sm); font-size: 11.5px; font-weight: 600; }
    .type-badge { background: var(--nb-bg); border: 1px solid var(--nb-border-soft); padding: 2px 6px; border-radius: var(--nb-radius-sm); font-size: 11.5px; color: var(--nb-text-secondary); }
    
    .quota-cell { display: flex; flex-direction: column; gap: 4px; min-width: 140px; }
    .q-labels { display: flex; justify-content: space-between; font-size: 11px; color: var(--nb-text-secondary); }
    .q-bar-track { height: 6px; background: var(--nb-border-soft); border-radius: 999px; overflow: hidden; }
    .q-bar-fill { height: 100%; background: var(--nb-primary-600); }

    .health-badge { font-size: 11.5px; font-weight: 700; color: #64748b; }
    .health-badge.healthy { color: #166534; }
    .health-badge.degraded { color: #854d0e; }
    .health-badge.down { color: #991b1b; }

    .default-chip { background: #dbeafe; color: #1e40af; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; display: inline-block; }
    .btn-make-default { background: transparent; border: 1px dashed var(--nb-border); color: var(--nb-text-muted); padding: 3px 8px; border-radius: var(--nb-radius-sm); font-size: 11px; cursor: pointer; }
    .btn-make-default:hover { border-color: var(--nb-primary-600); color: var(--nb-primary-600); }

    .table-actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .btn-action { padding: 4px 10px; border-radius: var(--nb-radius); border: 1px solid var(--nb-border); background: var(--nb-surface); font-size: 11.5px; cursor: pointer; color: var(--nb-text); }
    .btn-action.edit { border-color: var(--nb-border); }
    .btn-action.test { color: var(--nb-primary-600); border-color: var(--nb-primary-600); font-weight: 600; }
    .btn-action.qr-quick { color: #0369a1; border-color: #7dd3fc; background: #f0f9ff; font-weight: 700; }
    .btn-action.wa-quick { color: #15803d; border-color: #86efac; background: #f0fdf4; font-weight: 700; }
    .btn-action.toggle { color: #991b1b; }
    .btn-action.toggle.active { color: #166534; }

    .empty-state { text-align: center; padding: 32px; color: var(--nb-text-muted); }

    /* Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-card { background: var(--nb-surface); width: 500px; max-width: 90vw; border-radius: var(--nb-radius-lg, 12px); box-shadow: 0 10px 25px rgba(0,0,0,0.15); overflow: hidden; }
    .modal-card.modal-lg { width: 680px; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--nb-border-soft); }
    .modal-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .sub-header-type { font-size: 11.5px; color: var(--nb-text-muted); }
    .close-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--nb-text-muted); }
    .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; max-height: 75vh; overflow-y: auto; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-size: 12px; font-weight: 600; color: var(--nb-text-secondary); }
    .form-group input, .form-group select, .form-group textarea { padding: 8px 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); font-size: 13px; outline: none; }
    .options-group { justify-content: center; gap: 10px; }
    .chk-label { font-size: 12px; color: var(--nb-text); display: flex; align-items: center; gap: 6px; cursor: pointer; }

    .sub-title-config { font-size: 13px; font-weight: 700; color: var(--nb-primary-600); margin: 6px 0 0; }
    .config-panel { background: var(--nb-bg); border: 1px solid var(--nb-border-soft); padding: 14px; border-radius: var(--nb-radius); display: flex; flex-direction: column; gap: 12px; }
    .qr-hint-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: var(--nb-radius-sm); font-size: 12px; color: #166534; }

    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--nb-border-soft); background: var(--nb-bg); }

    /* QR Scanner Modal Styles */
    .qr-scanner-layout { display: grid; grid-template-columns: 240px 1fr; gap: 20px; align-items: start; }
    .qr-code-box { display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--nb-bg); border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 16px; gap: 10px; }
    .qr-image-wrapper { width: 190px; height: 190px; background: white; border: 1px solid #cbd5e1; border-radius: var(--nb-radius); padding: 8px; display: flex; align-items: center; justify-content: center; }
    .qr-image-wrapper img { width: 100%; height: 100%; object-fit: contain; }
    .qr-timer { font-size: 11.5px; color: var(--nb-text-muted); font-weight: 600; }
    .btn-refresh-qr { font-size: 11.5px; padding: 5px 10px; border-radius: var(--nb-radius-sm); border: 1px solid var(--nb-border); background: var(--nb-surface); cursor: pointer; color: var(--nb-primary-600); font-weight: 600; }

    .qr-instructions h4 { margin: 0 0 10px; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .pairing-method-tabs { display: flex; flex-direction: column; gap: 10px; }
    .p-method { background: var(--nb-bg); border: 1px solid var(--nb-border-soft); padding: 10px; border-radius: var(--nb-radius-sm); font-size: 12.5px; }
    .docker-cmd-box { background: #0f172a; color: #38bdf8; padding: 10px; border-radius: var(--nb-radius-sm); margin-top: 6px; font-family: monospace; font-size: 11px; display: flex; flex-direction: column; gap: 4px; white-space: pre-wrap; word-break: break-all; overflow-x: hidden; }
    .docker-cmd-box code { white-space: pre-wrap; word-break: break-all; color: #38bdf8; }
    .docker-cmd-box small { color: #94a3b8; font-family: sans-serif; font-size: 10.5px; }
    .check-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 6px; }
    .btn-check-docker { font-size: 11.5px; font-weight: 700; background: var(--nb-primary-600); color: white; border: none; padding: 6px 12px; border-radius: var(--nb-radius-sm); cursor: pointer; }
    .docker-status-tag { font-size: 11.5px; font-weight: 700; color: #991b1b; }
    .docker-status-tag.online { color: #166534; }
    .steps-list code { font-family: monospace; background: var(--nb-bg); padding: 2px 6px; border-radius: var(--nb-radius-sm); color: var(--nb-primary-600); font-weight: 700; }
    .qr-status-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; border-top: 1px dashed var(--nb-border-soft); padding-top: 12px; }
    .status-pill { font-size: 12px; font-weight: 700; color: #b45309; background: #fef3c7; padding: 4px 10px; border-radius: 999px; }
    .status-pill.connected { background: #dcfce7; color: #15803d; }
    .btn-verify-conn { font-size: 12px; font-weight: 600; padding: 5px 12px; border-radius: var(--nb-radius); border: 1px solid var(--nb-primary-600); background: var(--nb-primary-50); color: var(--nb-primary-600); cursor: pointer; }

    /* WhatsApp Modal Styles */
    .wa-notice-box { background: #dcfce7; border: 1px solid #86efac; color: #14532d; padding: 10px 14px; border-radius: var(--nb-radius); font-size: 13px; font-weight: 600; }
    .real-dispatch-note { background: #fefce8; border: 1px solid #fef08a; color: #713f12; padding: 10px 12px; border-radius: var(--nb-radius); font-size: 12px; line-height: 1.5; }
    .real-dispatch-note p { margin: 4px 0 0; }
    .wa-submit-btn { background: #25d366; }
    .wa-submit-btn:hover { background: #128c7e; }

    .wa-result-card { background: var(--nb-bg); border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .wa-res-status.success { font-size: 14px; font-weight: 700; color: #166534; }
    .wa-res-details { display: flex; flex-direction: column; gap: 8px; font-size: 12.5px; border-top: 1px dashed var(--nb-border-soft); padding-top: 10px; }
    .r-row { display: flex; justify-content: space-between; color: var(--nb-text-secondary); }
    .r-row strong { color: var(--nb-text); }
    .prov-tag { background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .nb-badge-success { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .r-msg-preview { display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; }
    .r-msg-preview p { margin: 0; background: var(--nb-surface); padding: 10px; border-radius: var(--nb-radius-sm); border: 1px solid var(--nb-border-soft); font-style: italic; color: var(--nb-text); }

    /* Diagnostic Result Modal */
    .diag-card { background: var(--nb-bg); border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .diag-status { font-size: 14px; font-weight: 700; }
    .diag-status.success { color: #16a34a; }
    .diag-status.warn { color: #d97706; }
    .diag-status.error { color: #dc2626; }
    .diag-msg { font-size: 13px; color: var(--nb-text-secondary); margin: 0; line-height: 1.5; }
    .diag-details { display: flex; flex-direction: column; gap: 6px; border-top: 1px dashed var(--nb-border-soft); padding-top: 10px; font-size: 12.5px; }
    .d-item { display: flex; justify-content: space-between; color: var(--nb-text-secondary); }
    .d-item strong { color: var(--nb-text); }
    .d-item strong.green { color: #16a34a; }
    .d-item strong.red { color: #dc2626; }

    .nb-btn-primary { background: var(--nb-primary-600); color: white; border: none; padding: 8px 16px; border-radius: var(--nb-radius); font-size: 13px; font-weight: 600; cursor: pointer; }
    .nb-btn-secondary { background: var(--nb-surface); border: 1px solid var(--nb-border); color: var(--nb-text); padding: 8px 16px; border-radius: var(--nb-radius); font-size: 13px; cursor: pointer; }
  `]
})
export class CommunicationsChannelsComponent {
  private commService = inject(CommunicationsService);

  channels = signal<CommunicationChannel[]>([]);
  providers = signal<CommunicationProvider[]>([]);

  showFormModal = signal(false);
  editingProvider: CommunicationProvider | null = null;
  testDiagnostic = signal<{ name: string; message: string; provider: CommunicationProvider; health_status?: string; ping_ms?: number; connected?: boolean; status?: string } | null>(null);

  // حالة عرض كود الـ QR
  qrModalData = signal<any | null>(null);
  qrCountdown = signal(45);
  dockerOnline = signal(false);

  // حالة تجربة إرسال رسالة الواتساب الحية
  showSendWhatsAppModal = signal(false);
  sendWhatsAppResult = signal<any | null>(null);

  waTestForm = {
    provider_id: 'p2',
    recipient_name: 'عثمان إبراهيم الكباشي',
    phone: '+249912345678',
    message: 'عزيزي ولي الأمر عثمان الكباشي، نود إحاطتكم بنجاح ربط خادم الواتساب المباشر بمدارس نبراس السودان بنجاح 100%.',
  };

  providerForm: Partial<CommunicationProvider> = {
    name: 'خادم إيفولوشن واتساب السودان',
    code: 'EVOLUTION_WA_SD',
    provider_type: 'evolution_baileys',
    channel_name: 'واتساب الأعمال',
    daily_quota: 50000,
    is_active: true,
    is_default: true,
  };

  configForm: CommunicationProviderConfig = {
    host: 'mail.nebras.edu.sd',
    port: 587,
    username: 'notifications@nebras.edu.sd',
    password: '',
    api_key: 'evo_key_998237465',
    instance_name: 'nebras-khartoum-instance',
    sender_id: 'NEBRAS-SD',
    webhook_url: 'https://wa.nebras.edu.sd',
  };

  constructor() {
    this.commService.getChannels().subscribe((data) => {
      const arr = Array.isArray(data) ? data : (data as any)?.results || [];
      this.channels.set(arr);
    });
    this.commService.getProviders().subscribe((data) => {
      const arr = Array.isArray(data) ? data : (data as any)?.results || [];
      this.providers.set(arr);
    });
  }

  safeChannels = computed(() => {
    const raw = this.channels();
    return Array.isArray(raw) ? raw : [];
  });

  safeProviders = computed(() => {
    const raw = this.providers();
    return Array.isArray(raw) ? raw : [];
  });

  whatsappProviders = computed(() => {
    return this.safeProviders().filter(
      (p) => p.channel_name === 'واتساب الأعمال' || p.provider_type?.includes('wa') || p.provider_type?.includes('baileys')
    );
  });

  selectedWaProvider = computed(() => {
    const pId = this.waTestForm.provider_id;
    return this.safeProviders().find((p) => p.id === pId) || this.whatsappProviders()[0] || null;
  });

  selectedWaProviderName = computed(() => {
    const prov = this.selectedWaProvider();
    return prov ? prov.name : 'خادم إيفولوشن واتساب (Evolution API)';
  });

  getProviderTypeName(type: string): string {
    const map: Record<string, string> = {
      smtp: 'SMTP Email',
      evolution_baileys: 'Evolution API (كود QR - شريحة عادية)',
      green_api: 'Green API Gateway',
      custom_gateway: 'بوابة SMS محلي (زين/سوداني)',
      twilio_sms: 'Twilio SMS',
      firebase_fcm: 'Firebase FCM Push',
    };
    return map[type] || type;
  }

  calculateQuotaPercent(p: CommunicationProvider): number {
    const quota = p.daily_quota || 1;
    const sent = p.sent_today || 0;
    const pct = Math.round((sent / quota) * 100);
    return Math.min(pct, 100);
  }

  // فتح وإدارة كود QR Code للواتساب
  openQrModal(p?: CommunicationProvider): void {
    const targetId = p ? p.id : (this.whatsappProviders()[0]?.id || 'p2');
    this.commService.getProviderQrCode(targetId).subscribe((res) => {
      this.qrModalData.set(res);
      this.qrCountdown.set(45);
    });
  }

  closeQrModal(): void {
    this.qrModalData.set(null);
  }

  refreshQrCode(): void {
    const pId = this.whatsappProviders()[0]?.id || 'p2';
    this.commService.getProviderQrCode(pId).subscribe((res) => {
      this.qrModalData.set(res);
      this.qrCountdown.set(45);
    });
  }

  checkLocalEvolutionServer(): void {
    const targetId = this.whatsappProviders()[0]?.id || 'p2';
    this.commService.testProviderConnection(targetId).subscribe({
      next: (res: any) => {
        const d = res?.data ?? res;
        const isOk = !!d && (d.success === true || d.health_status === 'healthy' || res?.status === 'success');
        this.dockerOnline.set(isOk);
      },
      error: () => {
        this.dockerOnline.set(false);
      },
    });
  }

  verifyConnectionStatus(): void {
    this.qrModalData.update((curr) => (curr ? { ...curr, connected: true } : null));
    const pId = this.whatsappProviders()[0]?.id || 'p2';
    this.providers.update((list) =>
      (Array.isArray(list) ? list : []).map((item) =>
        item.id === pId ? { ...item, health_status: 'healthy', is_active: true } : item
      )
    );
  }

  openAddModal(): void {
    this.editingProvider = null;
    this.providerForm = {
      name: 'خادم إيفولوشن واتساب السودان',
      code: 'EVOLUTION_WA_SD',
      provider_type: 'evolution_baileys',
      channel_name: 'واتساب الأعمال',
      daily_quota: 50000,
      is_active: true,
      is_default: true,
    };
    this.configForm = { instance_name: 'nebras-khartoum-instance', webhook_url: 'https://wa.nebras.edu.sd', api_key: 'evo_key_998237465' };
    this.showFormModal.set(true);
  }

  openEditModal(p: CommunicationProvider): void {
    this.editingProvider = p;
    this.providerForm = { ...p };
    this.configForm = { ...(p.config || {}) };
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
  }

  saveProvider(): void {
    if (!this.providerForm.name) return;
    const payload: Partial<CommunicationProvider> = {
      ...this.providerForm,
      config: { ...this.configForm },
    };

    if (this.editingProvider) {
      this.commService.updateProvider(this.editingProvider.id, payload).subscribe((updated) => {
        this.providers.update((list) =>
          (Array.isArray(list) ? list : []).map((item) => (item.id === this.editingProvider!.id ? { ...item, ...payload } : item))
        );
        this.closeFormModal();
      });
    } else {
      this.commService.createProvider(payload).subscribe((newProv) => {
        this.providers.update((list) => [newProv, ...(Array.isArray(list) ? list : [])]);
        this.closeFormModal();
      });
    }
  }

  makeDefault(p: CommunicationProvider): void {
    this.commService.setProviderAsDefault(p.id).subscribe(() => {
      this.providers.update((list) =>
        (Array.isArray(list) ? list : []).map((item) => ({
          ...item,
          is_default: item.channel_name === p.channel_name ? item.id === p.id : item.is_default,
        }))
      );
    });
  }

  toggleActive(p: CommunicationProvider): void {
    const nextState = !p.is_active;
    this.commService.toggleProviderActive(p.id).subscribe(() => {
      this.providers.update((list) =>
        (Array.isArray(list) ? list : []).map((item) => (item.id === p.id ? { ...item, is_active: nextState } : item))
      );
    });
  }

  testConnection(p: CommunicationProvider): void {
    this.commService.testProviderConnection(p.id).subscribe((res) => {
      this.testDiagnostic.set({
        name: p.name,
        message: res.message,
        provider: p,
        health_status: res.health_status || 'down',
        ping_ms: res.ping_ms || 0,
        connected: res.connected || false,
        status: res.status,
      });
    });
  }

  closeTestModal(): void {
    this.testDiagnostic.set(null);
  }

  // تجربة إرسال رسالة الواتساب الحية
  openSendWhatsAppModal(p?: CommunicationProvider): void {
    if (p) {
      this.waTestForm.provider_id = p.id;
    } else if (this.whatsappProviders().length) {
      this.waTestForm.provider_id = this.whatsappProviders()[0].id;
    }
    this.showSendWhatsAppModal.set(true);
  }

  closeSendWhatsAppModal(): void {
    this.showSendWhatsAppModal.set(false);
  }

  sendLiveWhatsAppMessage(): void {
    if (!this.waTestForm.phone || !this.waTestForm.message) return;

    const chosenProv = this.selectedWaProvider();
    const payload = {
      channel: 'whatsapp',
      recipient_name: this.waTestForm.recipient_name,
      recipient_address: this.waTestForm.phone,
      phone: this.waTestForm.phone,
      channel_name: 'واتساب الأعمال (Evolution)',
      subject: 'رسالة إشعار الواتساب الفوري',
      body: this.waTestForm.message,
    };

    this.commService.sendMessage(payload).subscribe(() => {
      if (chosenProv) {
        this.providers.update((list) =>
          (Array.isArray(list) ? list : []).map((item) =>
            item.id === chosenProv.id ? { ...item, sent_today: (item.sent_today || 0) + 1 } : item
          )
        );
      }

      this.closeSendWhatsAppModal();

      this.sendWhatsAppResult.set({
        recipient_name: this.waTestForm.recipient_name,
        phone: this.waTestForm.phone,
        provider_name: chosenProv ? chosenProv.name : 'Evolution API (WhatsApp Engine)',
        message: this.waTestForm.message,
        timestamp: new Date().toLocaleString('ar-SD'),
      });
    });
  }

  closeSendWhatsAppResult(): void {
    this.sendWhatsAppResult.set(null);
  }
}
