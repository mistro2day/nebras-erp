import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal, effect, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { CommunicationsService, CommunicationChannel, CommunicationTemplate } from '../communications.service';
import { NbModalComponent } from '../../../shared/nebras/nb-modal.component';

@Component({
  selector: 'app-send-message-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbModalComponent],
  template: `
    <nb-modal [open]="open" (closed)="closeModal()" title="مراسلة ولي الأمر بنظام القوالب والإرسال المباشر" subtitle="إرسال إشعار رسمي فوري لولي الأمر عبر القوالب المعتمدة أو تطبيق واتساب مباشرة." maxWidth="880px">
      
      <div class="msg-form" dir="rtl">
        <!-- صف بيانات المستلم وقناة وجهة الاتصال (3 أعمدة متوازنة) -->
        <div class="form-row three-cols">
          <div class="form-group">
            <label>المستلم (الاسم)</label>
            <input type="text" class="nb-input" [value]="recipientName" readonly disabled />
          </div>

          <div class="form-group">
            <label>قناة الاتصال</label>
            <select class="nb-input" [(ngModel)]="selectedChannelCode" (ngModelChange)="onChannelChange()">
              <option value="" disabled>-- اختر القناة --</option>
              @for (ch of activeChannels(); track ch.id) {
                <option [value]="ch.code">{{ ch.name }}</option>
              }
            </select>
          </div>

          <div class="form-group">
            <label>جهة الاتصال (الرقم أو البريد) <span style="color:red">*</span></label>
            <div class="contact-input-wrapper">
              <input type="text" class="nb-input ltr-input" [(ngModel)]="editableContact" placeholder="مثال: 249912345678">
            </div>
          </div>
        </div>

        <!-- صف اختيار قالب الرسالة -->
        <div class="form-group template-row">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <label class="section-label">قالب الرسالة (Template)</label>
            @if (allowedCategories && allowedCategories.length > 0) {
              <button type="button" class="btn-link-all" (click)="toggleAllCategories()">
                {{ showAllCategories() ? 'تصفية حسب القسم' : 'جلب كافة القوالب (' + templates().length + ')' }}
              </button>
            }
          </div>
          <select class="nb-input" [(ngModel)]="selectedTemplateId" (change)="onTemplateSelect()">
            <option value="" disabled>-- اختر القالب --</option>
            <option value="custom">رسالة حرة (بدون قالب)</option>
            @for (t of filteredTemplates(); track t.id) {
              <option [value]="t.id">{{ t.name }} ({{ getCategoryLabel(t.category) }})</option>
            }
          </select>
        </div>

        @if (selectedTemplateId) {
          <!-- قسم متقدم بشبكة متجاورة: التحرير على اليمين والمعاينة الفورية على اليسار -->
          <div class="editor-preview-grid">
            <!-- العمود الأيمن: تحرير نص القالب والمتغيرات -->
            <div class="editor-column">
              <div class="col-header">
                <label>تعديل نص الرسالة والقالب</label>
              </div>
              <textarea #messageTextarea class="nb-input msg-textarea" [(ngModel)]="messageBody" rows="7" placeholder="اكتب نص الرسالة هنا..."></textarea>
              
              <div class="vars-section">
                <span class="vars-title">المتغيرات السريعة (انقر للإدراج):</span>
                <div class="vars-toolbar">
                  @for (v of availableVariables(); track v) {
                    <button type="button" class="var-btn" (click)="insertVar(v)" title="إدراج متغير في موضع المؤشر">+ {{ v }}</button>
                  }
                </div>
              </div>

              <div class="debug-toggle">
                <label>
                  <input type="checkbox" [(ngModel)]="showDebugVars">
                  إظهار المتغيرات البرمجية المتاحة
                </label>
              </div>
              @if (showDebugVars) {
                <div class="debug-vars-box">
                  {{ debugVars() }}
                </div>
              }
            </div>

            <!-- العمود الأيسر: معاينة الرسالة الحية للمستلم -->
            <div class="preview-column">
              <div class="col-header">
                <label class="preview-title">
                  <span class="wa-dot"></span>
                  معاينة الرسالة الحية (كما تصل لولي الأمر)
                </label>
                <button type="button" class="btn-link-copy" (click)="copyRenderedMessage()" title="نسخ الرسالة المجهزة للحافظة">
                  📋 نسخ النص
                </button>
              </div>

              <div class="whatsapp-card">
                <div class="whatsapp-header">
                  <span class="wa-badge">📱 رسالة معتمدة</span>
                  <span class="wa-recipient">{{ recipientName || 'ولي الأمر' }}</span>
                </div>
                <div class="whatsapp-bubble">
                  <div class="bubble-content" [innerHTML]="previewBody()"></div>
                  <div class="bubble-footer">
                    <span class="bubble-time">الآن</span>
                    <span class="bubble-ticks">✓✓</span>
                  </div>
                </div>
              </div>
              <p class="help-text">تم استبدال بيانات الطالب والرسوم آلياً، ويمكنك التعديل مباشرة قبل الإرسال.</p>
            </div>
          </div>
        }

        @if (errorMsg()) {
          <div class="alert alert-error">
            <div>{{ errorMsg() }}</div>
            @if (isPhone(editableContact)) {
              <button type="button" class="fallback-direct-btn" (click)="sendDirectWhatsApp()">
                💬 فتح وإرسال مباشر عبر تطبيق واتساب بدلاً من ذلك
              </button>
            }
          </div>
        }
        @if (successMsg()) {
          <div class="alert alert-success">{{ successMsg() }}</div>
        }
      </div>

      <div modal-actions class="actions-footer">
        <button class="nb-btn-outline" (click)="closeModal()" [disabled]="sending()">إلغاء</button>
        @if (isPhone(editableContact)) {
          <button class="nb-btn-success wa-direct-send-btn" (click)="sendDirectWhatsApp()" [disabled]="sending() || !canSendDirectWhatsApp()" title="فتح تطبيق واتساب فورياً بالرسالة المجهزة">
            <span class="icon">💬</span> إرسال مباشر عبر واتساب
          </button>
        }
        <button class="nb-btn-primary send-btn" (click)="send()" [disabled]="sending() || !isValid()" title="إرسال عبر بوابة المراسلات بالنظام">
          @if (sending()) {
            <span class="spinner"></span> جاري الإرسال...
          } @else {
            <span class="icon">🚀</span> إرسال عبر النظام
          }
        </button>
      </div>

    </nb-modal>
  `,
  styles: [`
    .msg-form { display: flex; flex-direction: column; gap: 0.85rem; }
    .form-row { display: flex; gap: 0.85rem; width: 100%; }
    .three-cols { display: grid; grid-template-columns: 1.2fr 1fr 1.2fr; gap: 0.85rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    label { font-size: 0.82rem; font-weight: 600; color: #374151; }
    .section-label { font-size: 0.85rem; font-weight: 700; color: #1f2937; }
    
    .nb-input { padding: 0.55rem 0.75rem; border: 1px solid #d1d5db; border-radius: 8px; font-family: inherit; font-size: 0.9rem; width: 100%; box-sizing: border-box; background: #fff; }
    .nb-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.12); }
    .nb-input:disabled { background: #f8fafc; color: #64748b; border-color: #e2e8f0; }
    .ltr-input { text-align: left; direction: ltr; }
    
    /* تخطيط الشبكة المتجاورة للتحرير والمعاينة */
    .editor-preview-grid { display: grid; grid-template-columns: 1.15fr 1fr; gap: 1rem; align-items: stretch; margin-top: 0.2rem; }
    .editor-column, .preview-column { display: flex; flex-direction: column; gap: 0.4rem; }
    .col-header { display: flex; justify-content: space-between; align-items: center; min-height: 22px; }
    
    .msg-textarea { resize: vertical; min-height: 140px; line-height: 1.5; font-size: 0.88rem; }
    
    .vars-section { display: flex; flex-direction: column; gap: 0.3rem; margin-top: 2px; }
    .vars-title { font-size: 0.75rem; color: #6b7280; font-weight: 600; }
    .vars-toolbar { display: flex; flex-wrap: wrap; gap: 4px; max-height: 75px; overflow-y: auto; padding: 2px 0; }
    .var-btn { background: #f1f5f9; border: 1px solid #cbd5e1; color: #2563eb; font-size: 11px; padding: 2px 7px; border-radius: 4px; cursor: pointer; transition: all 0.15s; direction: ltr; font-weight: 500; }
    .var-btn:hover { background: #dbeafe; border-color: #93c5fd; color: #1d4ed8; }
    
    .debug-toggle { margin-top: 4px; font-size: 0.75rem; color: #6b7280; }
    .debug-toggle label { font-size: 0.75rem; font-weight: 400; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
    .debug-vars-box { font-size: 10.5px; color: #475569; background: #f1f5f9; padding: 6px; border-radius: 4px; margin-top: 3px; font-family: monospace; direction: ltr; text-align: left; max-height: 60px; overflow-x: auto; }

    /* بطاقة محاكاة واتساب للمعاينة */
    .preview-title { display: flex; align-items: center; gap: 6px; color: #0f766e; font-weight: 700; font-size: 0.82rem; }
    .wa-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block; box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2); }
    .whatsapp-card { background: #e5ddd5; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 200px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.03); background-image: radial-gradient(#d1d7db 1px, transparent 1px); background-size: 16px 16px; }
    .whatsapp-header { display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
    .wa-badge { background: #075e54; color: #fff; padding: 1px 7px; border-radius: 10px; font-size: 10.5px; font-weight: 600; }
    .wa-recipient { color: #4b5563; font-weight: 600; font-size: 11.5px; }
    .whatsapp-bubble { background: #ffffff; border-radius: 8px 0px 8px 8px; padding: 10px 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.12); display: flex; flex-direction: column; gap: 6px; max-height: 210px; overflow-y: auto; }
    .bubble-content { font-size: 12.5px; color: #111827; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
    .bubble-footer { display: flex; justify-content: flex-end; align-items: center; gap: 4px; font-size: 10px; color: #6b7280; }
    .bubble-ticks { color: #2563eb; font-weight: bold; }

    .help-text { font-size: 0.72rem; color: #6b7280; margin: 0; }
    .actions-footer { display: flex; justify-content: flex-end; gap: 0.75rem; width: 100%; flex-wrap: wrap; }
    
    .nb-btn-outline { background: #fff; border: 1px solid #d1d5db; color: #374151; padding: 0.55rem 1rem; border-radius: 8px; font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; }
    .nb-btn-outline:hover { background: #f3f4f6; }
    .nb-btn-primary { background: #2563eb; border: 1px solid #1d4ed8; color: #fff; padding: 0.55rem 1.15rem; border-radius: 8px; font-size: 0.88rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; font-family: inherit; }
    .nb-btn-primary:hover { background: #1d4ed8; }
    .nb-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .nb-btn-success { background: #10b981; color: #fff; border: 1px solid #059669; padding: 0.55rem 1.15rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; font-family: inherit; font-size: 0.88rem; }
    .nb-btn-success:hover { background: #059669; }
    .nb-btn-success:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .btn-link-all, .btn-link-copy { background: none; border: none; color: #2563eb; font-size: 11.5px; font-weight: 600; cursor: pointer; text-decoration: underline; padding: 0; font-family: inherit; }
    .btn-link-all:hover, .btn-link-copy:hover { color: #1d4ed8; }
    
    .alert { padding: 0.65rem 0.85rem; border-radius: 6px; font-size: 0.85rem; }
    .alert-error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
    .alert-success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
    .fallback-direct-btn { margin-top: 6px; background: #16a34a; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; font-size: 11.5px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; font-family: inherit; }
    .fallback-direct-btn:hover { background: #15803d; }
    .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; animation: spin 1s ease-in-out infinite; margin-left: 0.4rem; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 800px) {
      .three-cols { grid-template-columns: 1fr; }
      .editor-preview-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class SendMessageModalComponent implements OnChanges {
  @ViewChild('messageTextarea') messageTextarea!: ElementRef<HTMLTextAreaElement>;
  @Input() open = false;
  @Input() recipientName = '';
  @Input() recipientPhone = '';
  @Input() recipientEmail = '';
  @Input() contextVariables: any = {};
  @Input() defaultTemplateCode = '';
  @Input() allowedCategories: string[] = [];

  @Output() openChange = new EventEmitter<boolean>();
  @Output() messageSent = new EventEmitter<any>();

  private commService = inject(CommunicationsService);
  private sanitizer = inject(DomSanitizer);

  channels = signal<CommunicationChannel[]>([]);
  templates = signal<CommunicationTemplate[]>([]);
  showAllCategories = signal(false);

  toggleAllCategories() {
    this.showAllCategories.update(v => !v);
  }

  getCategoryLabel(cat?: string): string {
    const map: Record<string, string> = {
      finance: 'المالية والرسوم',
      attendance: 'الحضور والغياب',
      admission: 'القبول والتسجيل',
      academic: 'الأكاديميات',
      general: 'عام',
      system: 'النظام',
    };
    return (cat && map[cat]) ? map[cat] : (cat || 'عام');
  }

  isPhone(contact?: string): boolean {
    if (!contact) return false;
    return !contact.includes('@');
  }

  filteredTemplates = computed(() => {
    const list = this.templates();
    if (this.showAllCategories() || !this.allowedCategories || this.allowedCategories.length === 0) return list;
    return list.filter(t => this.allowedCategories.includes(t.category));
  });

  availableVariables = computed(() => {
    const vars = { name: this.recipientName, ...this.contextVariables };
    return Object.keys(vars);
  });

  selectedChannelCode = '';
  selectedTemplateId = '';
  messageBody = '';
  showDebugVars = false;

  sending = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  activeChannels = computed(() => this.channels().filter(c => c.is_active));

  editableContact = '';

  onChannelChange() {
    this.updateEditableContact();
  }

  updateEditableContact() {
    if (this.selectedChannelCode === 'email') {
      this.editableContact = this.recipientEmail;
    } else {
      let phone = this.recipientPhone || '';
      // توحيد مبدئي للرقم
      if (phone.startsWith('0')) {
        // إذا كان يبدأ بصفر، نقوم بإزالته لتشجيع كتابة الرمز الدولي
        phone = phone.substring(1);
      }
      this.editableContact = phone;
    }
  }

  formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    let p = phone.replace(/[^\d+]/g, '');
    if (p.startsWith('00')) p = '+' + p.substring(2);
    
    if (!p.startsWith('+')) {
      if (p.startsWith('05')) {
         p = '+966' + p.substring(1);
      } else if (p.startsWith('09') || p.startsWith('01')) {
         p = '+249' + p.substring(1);
      } else if (p.length === 9) {
         if (p.startsWith('5')) p = '+966' + p;
         else p = '+249' + p;
      }
    }
    return p;
  }

  constructor() {
    this.commService.getChannels().subscribe(c => this.channels.set(c));
    this.commService.getTemplates().subscribe(t => {
      this.templates.set(t);
      if (this.open && this.defaultTemplateCode) {
        this.applyDefaultTemplate();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['open'] && this.open) {
      this.resetState();
      this.applyDefaultTemplate();
    }
  }

  resetState() {
    this.errorMsg.set('');
    this.successMsg.set('');
    this.selectedTemplateId = '';
    this.messageBody = '';
    const waChannel = this.activeChannels().find(c => c.code === 'whatsapp');
    if (waChannel) {
      this.selectedChannelCode = waChannel.code;
    } else if (this.activeChannels().length > 0) {
      this.selectedChannelCode = this.activeChannels()[0].code;
    }
    this.updateEditableContact();
  }

  applyDefaultTemplate() {
    if (!this.defaultTemplateCode) return;
    const list = this.templates();
    const defaultTemp =
      list.find(t => t.code === this.defaultTemplateCode) ||
      (this.defaultTemplateCode === 'FEE_REMINDER' ? list.find(t => t.name.includes('تذكير بالرسوم')) : undefined) ||
      list[0];

    if (defaultTemp) {
      this.selectedTemplateId = defaultTemp.id!;
      this.onTemplateSelect();
    }
  }

  onTemplateSelect() {
    if (this.selectedTemplateId === 'custom') {
      this.messageBody = '';
      return;
    }
    const template = this.templates().find(t => t.id === this.selectedTemplateId);
    if (template) {
      this.messageBody = template.body;
      const vars = { name: this.recipientName, ...this.contextVariables };
      
      // DEBUG:
      this._debugVars = JSON.stringify(vars);
    }
  }

  insertVar(v: string) {
    const el = this.messageTextarea?.nativeElement;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const text = this.messageBody;
      const insertion = `{{${v}}}`;
      this.messageBody = text.substring(0, start) + insertion + text.substring(end);
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + insertion.length;
        el.focus();
      });
    } else {
      this.messageBody += `{{${v}}}`;
    }
  }

  previewBody() {
    let body = this.messageBody || '';
    // Escape HTML
    body = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    const vars = { name: this.recipientName, ...this.contextVariables };
    
    // Highlight variables
    for (const [key, value] of Object.entries(vars)) {
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        const valStr = String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        body = body.replace(regex, `<mark style="background: #dbeafe; color: #1e40af; padding: 0 4px; border-radius: 4px; font-weight: 600;">${valStr}</mark>`);
      }
    }
    
    return this.sanitizer.bypassSecurityTrustHtml(body);
  }

  _debugVars = '';
  debugVars() {
    return this._debugVars;
  }

  isValid() {
    return this.selectedChannelCode && this.editableContact && this.messageBody.trim().length > 0;
  }

  closeModal() {
    this.open = false;
    this.openChange.emit(false);
  }

  send() {
    if (!this.isValid()) return;
    
    this.errorMsg.set('');
    this.sending.set(true);

    let finalBody = this.messageBody;
    const vars = { name: this.recipientName, ...this.contextVariables };
    for (const [key, value] of Object.entries(vars)) {
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        finalBody = finalBody.replace(regex, String(value));
      }
    }

    const payload = {
      channel: this.selectedChannelCode,
      recipient_name: this.recipientName,
      recipient_address: this.editableContact,
      body: finalBody
    };

    this.commService.sendMessage(payload).subscribe(res => {
      this.sending.set(false);
      if (res.status === 'success') {
        this.successMsg.set('تم إرسال الرسالة بنجاح عبر ' + this.selectedChannelCode);
        setTimeout(() => {
          this.messageSent.emit(res);
          this.closeModal();
        }, 1500);
      } else {
        this.errorMsg.set(res.message || 'فشل في الإرسال');
      }
    });
  }

  canSendDirectWhatsApp(): boolean {
    return !!this.editableContact && this.messageBody.trim().length > 0;
  }

  getFinalRenderedBody(): string {
    let finalBody = this.messageBody;
    const vars = { name: this.recipientName, ...this.contextVariables };
    for (const [key, value] of Object.entries(vars)) {
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        finalBody = finalBody.replace(regex, String(value));
      }
    }
    return finalBody;
  }

  sendDirectWhatsApp() {
    if (!this.canSendDirectWhatsApp()) return;
    const finalBody = this.getFinalRenderedBody();
    let phone = this.formatPhoneNumber(this.editableContact).replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '249' + phone.substring(1);
    else if (!phone.startsWith('249') && phone.length === 9) phone = '249' + phone;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(finalBody)}`;
    window.open(url, '_blank');

    this.successMsg.set('تم فتح تطبيق واتساب بنجاح وتجهيز نص الرسالة والقالب المعتمد للإرسال.');
    setTimeout(() => {
      this.messageSent.emit({ status: 'success', channel: 'whatsapp_direct', recipient_address: phone });
      this.closeModal();
    }, 1500);
  }

  copyRenderedMessage() {
    const text = this.getFinalRenderedBody();
    if (text && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.successMsg.set('تم نسخ نص الرسالة المجهزة إلى الحافظة بنجاح.');
        setTimeout(() => this.successMsg.set(''), 2500);
      });
    }
  }
}
