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
    <nb-modal [open]="open" (closed)="closeModal()" title="إرسال رسالة فورية" subtitle="إرسال إشعار أو تحديث للعميل/المستفيد عبر القنوات المتاحة.">
      
      <div class="msg-form" dir="rtl">
        <div class="form-row">
          <div class="form-group">
            <label>المستلم (الاسم)</label>
            <input type="text" class="nb-input" [value]="recipientName" readonly disabled />
          </div>
        </div>

        <div class="form-row two-cols">
          <div class="form-group">
            <label>قناة الاتصال</label>
            <select class="nb-input" [(ngModel)]="selectedChannelCode" (ngModelChange)="onChannelChange()">
              <option value="" disabled>-- اختر القناة --</option>
              @for (ch of activeChannels(); track ch.id) {
                <option [value]="ch.code">{{ ch.name }}</option>
              }
            </select>
          </div>
          <!-- Input Contact -->
          <div class="form-group">
            <label>جهة الاتصال (الرقم أو البريد) <span style="color:red">*</span></label>
            <div class="contact-input-wrapper" style="display:flex; flex-direction:column; gap:4px;">
              <input type="text" class="nb-input" [(ngModel)]="editableContact" dir="ltr" style="text-align: right;" placeholder="مثال: +249912345678 أو +966500000000">
              @if (selectedChannelCode === 'whatsapp' || selectedChannelCode === 'sms') {
                <small style="color: var(--nb-text-faint); font-size: 11px;">
                  الرجاء إدخال الرقم بالصيغة الدولية (بدون أصفار بالبداية) لضمان وصول الرسالة (مثال: 2499... أو 9665...)
                </small>
              }
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>قالب الرسالة (Template)</label>
          <select class="nb-input" [(ngModel)]="selectedTemplateId" (change)="onTemplateSelect()">
            <option value="" disabled>-- اختر القالب --</option>
            <option value="custom">رسالة حرة (بدون قالب)</option>
            @for (t of filteredTemplates(); track t.id) {
              <option [value]="t.id">{{ t.name }} ({{ t.category }})</option>
            }
          </select>
        </div>

        @if (selectedTemplateId) {
          <div class="form-group">
            <label>تعديل قالب الرسالة</label>
            <textarea #messageTextarea class="nb-input" [(ngModel)]="messageBody" rows="5" placeholder="اكتب رسالتك هنا..."></textarea>
            
            <div class="vars-toolbar" style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 6px;">
              @for (v of availableVariables(); track v) {
                <button class="var-btn" (click)="insertVar(v)" title="إدراج متغير">+ {{ v }}</button>
              }
            </div>

            <div class="preview-block" style="margin-top: 15px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
              <strong style="font-size: 11px; color: #64748b; margin-bottom: 8px; display: block;">معاينة الرسالة النهائية (كيف ستظهر للمستلم):</strong>
              <div [innerHTML]="previewBody()" style="font-size: 13.5px; color: #1e293b; line-height: 1.6; white-space: pre-wrap; word-break: break-word;"></div>
            </div>
            <div class="debug-toggle" style="margin-top: 10px;">
              <label style="font-size: 12px; color: var(--nb-text-secondary); cursor: pointer; display: flex; align-items: center; gap: 6px;">
                <input type="checkbox" [(ngModel)]="showDebugVars">
                إظهار المتغيرات البرمجية المتاحة (للمطورين)
              </label>
            </div>
            @if (showDebugVars) {
              <div style="font-size: 11px; color: var(--nb-text-muted); background: var(--nb-surface-raised); padding: 8px; border-radius: 4px; margin-top: 5px; font-family: monospace; direction: ltr; text-align: left; overflow-x: auto;">
                {{ debugVars() }}
              </div>
            }
            <p class="help-text" style="margin-top: 8px;">تم استبدال المتغيرات تلقائياً، يمكنك التعديل قبل الإرسال.</p>
          </div>
        }

        @if (errorMsg()) {
          <div class="alert alert-error">{{ errorMsg() }}</div>
        }
        @if (successMsg()) {
          <div class="alert alert-success">{{ successMsg() }}</div>
        }
      </div>

      <div modal-actions class="actions-footer">
        <button class="nb-btn-outline" (click)="closeModal()" [disabled]="sending()">إلغاء</button>
        <button class="nb-btn-primary send-btn" (click)="send()" [disabled]="sending() || !isValid()">
          @if (sending()) {
            <span class="spinner"></span> جاري الإرسال...
          } @else {
            <span class="icon">💬</span> إرسال الآن
          }
        </button>
      </div>

    </nb-modal>
  `,
  styles: [`
    .msg-form { display: flex; flex-direction: column; gap: 1rem; }
    .form-row { display: flex; gap: 1rem; width: 100%; }
    .two-cols > .form-group { flex: 1; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    label { font-size: 0.85rem; font-weight: 600; color: #4b5563; }
    .nb-input { padding: 0.6rem 0.8rem; border: 1px solid #d1d5db; border-radius: 6px; font-family: inherit; font-size: 0.95rem; width: 100%; box-sizing: border-box; }
    .nb-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
    .nb-input:disabled { background: #f3f4f6; color: #6b7280; }
    .ltr-input { text-align: left; direction: ltr; }
    .preview-box { resize: vertical; line-height: 1.5; background: #fafafa; }
    .help-text { font-size: 0.75rem; color: #6b7280; margin: 0; }
    .actions-footer { display: flex; justify-content: flex-end; gap: 0.75rem; width: 100%; }
    .alert { padding: 0.75rem; border-radius: 6px; font-size: 0.9rem; }
    .alert-error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
    .alert-success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
    .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; animation: spin 1s ease-in-out infinite; margin-left: 0.5rem; }
    .var-btn { background: var(--nb-surface-raised); border: 1px dashed var(--nb-primary-400); color: var(--nb-primary-600); font-size: 11px; padding: 3px 8px; border-radius: 4px; cursor: pointer; transition: all 0.2s; direction: ltr; }
    .var-btn:hover { background: var(--nb-primary-50); border-style: solid; }
    @keyframes spin { to { transform: rotate(360deg); } }
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

  filteredTemplates = computed(() => {
    const list = this.templates();
    if (!this.allowedCategories || this.allowedCategories.length === 0) return list;
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
    const defaultTemp = this.templates().find(t => t.code === this.defaultTemplateCode);
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
}
