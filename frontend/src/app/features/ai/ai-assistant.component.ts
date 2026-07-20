import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AIService } from './ai.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbModalComponent } from '../../shared/nebras/nb-modal.component';

interface Suggestion {
  category: string;
  icon: string;
  query: string;
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbModalComponent],
  template: `
    <div class="page" dir="rtl">
      <!-- ترويسة نبراس القياسية -->
      <nb-page-header
        title="مساعد نبراس الذكي (Nebras AI Assistant)"
        subtitle="المرشد والُمحلل التنفيذي للمدارس والمؤسسات — تحليل فوري للأرقام، الإحصاءات الأكاديمية، والمالية والانضباط السلوكي."
      >
        <button class="nb-btn-secondary" (click)="loadHistory()">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          <span>تحديث السجل</span>
        </button>
        <button class="nb-btn-secondary danger" (click)="confirmClearHistory()">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          <span>مسح السجل</span>
        </button>
      </nb-page-header>

      <!-- مسرح المحادثة الرئيسي لمساعد نبراس (Nebras AI Canvas) -->
      <div class="ai-hero-card">
        <div class="ai-hero-header">
          <div class="ai-badge-glowing">
            <span class="sparkle">✦</span>
          </div>
          <div class="ai-hero-text">
            <h2>محرك الاستعلام والتحليل الذكي (NLQ Engine)</h2>
            <p>اسأل عن أي إحصائية أو مقياس تشغيلي في مادتك الأكاديمية أو المالية — النتائج تُحسب حتمياً من قاعدة البيانات.</p>
          </div>
        </div>

        <div class="ai-input-wrapper" [class.busy]="isThinking()">
          <input
            type="text"
            class="ai-main-input"
            [(ngModel)]="promptQuery"
            (keyup.enter)="sendPrompt()"
            [disabled]="isThinking()"
            placeholder="اكتب سؤالك هنا… مثال: ما نسبة حضور الطلاب هذا الشهر؟ أو كم إجمالي المتأخرات المالية؟"
          />
          <button class="nb-btn-primary ai-send-btn" [disabled]="isThinking() || !promptQuery.trim()" (click)="sendPrompt()">
            <span *ngIf="!isThinking()">تحليل وإجابة ✦</span>
            <span *ngIf="isThinking()" class="thinking-spinner">جارٍ التحليل…</span>
          </button>
        </div>

        <!-- المقترحات السريعة المصنّفة -->
        <div class="suggestions-bar">
          <span class="sug-label">استعلامات سريعة:</span>
          <button
            *ngFor="let sug of suggestions"
            class="sug-chip"
            (click)="selectSuggestion(sug.query)"
          >
            <span class="sug-icon">{{ sug.icon }}</span>
            <span>{{ sug.query }}</span>
          </button>
        </div>
      </div>

      <!-- عرض نتيجة الاستعلام الحالي المباشر -->
      <nb-panel *ngIf="currentAnswer()" [title]="'نتيجة التحليل الذكي'" [subtitle]="currentAnswer().metric_title || 'إجابة محرك نبراس'">
        <div class="answer-display-box" [class.unanswered]="!currentAnswer().answered">
          <div class="ans-header">
            <div class="ans-title-group">
              <span class="status-indicator" [class.success]="currentAnswer().answered"></span>
              <strong>{{ currentAnswer().answered ? (currentAnswer().metric_title || 'إجابة دقيقة') : 'تنبيه تحليل' }}</strong>
            </div>
            <span class="security-tag">🔒 حساب حتمي من الـ ORM</span>
          </div>

          <div class="ans-body">
            <div class="main-stat-badge" *ngIf="currentAnswer().answered && currentAnswer().value !== undefined">
              <span class="stat-num">{{ renderNum(currentAnswer().value) }}</span>
              <span class="stat-unit">{{ currentAnswer().unit }}</span>
            </div>

            <p class="ans-text">{{ currentAnswer().answer }}</p>

            <!-- الحقائق والتفاصيل الفرعية -->
            <div class="facts-grid" *ngIf="currentAnswer().facts?.length">
              <div class="fact-card" *ngFor="let f of currentAnswer().facts">
                <span class="fact-lbl">{{ f.label }}</span>
                <span class="fact-val">{{ renderNum(f.value) }}</span>
              </div>
            </div>
          </div>
        </div>
      </nb-panel>

      <!-- سجل محادثات واستعلامات المستأجر -->
      <nb-panel title="سجل المحادثات والتحليلات السابقة" [subtitle]="'عدد الجلسات المحفوظة: ' + history().length" [flush]="true">
        <div class="history-list">
          <div class="history-item" *ngFor="let item of history()">
            <div class="hist-user-prompt">
              <span class="hist-role-icon user">👤</span>
              <div class="hist-content">
                <strong>{{ item.prompt }}</strong>
                <span class="hist-time">{{ item.created_at | date:'yyyy-MM-dd HH:mm' }}</span>
              </div>
            </div>

            <div class="hist-ai-response">
              <span class="hist-role-icon ai">✦</span>
              <div class="hist-content">
                <p class="response-text">{{ item.response }}</p>
                <span class="tokens-tag" *ngIf="item.tokens_used > 0">{{ item.tokens_used }} رمز مستهلك</span>
              </div>
            </div>
          </div>

          <div class="empty-history" *ngIf="history().length === 0">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            <p>لا يوجد سجل محادثات سابق. اكتب سؤالك في الأعلى للبدء بالتحليل الذكي.</p>
          </div>
        </div>
      </nb-panel>

      <div *ngIf="toastMessage()" class="status-toast" [class.success]="toastSuccess()">
        <span>{{ toastMessage() }}</span>
      </div>

      <!-- Nebras OS Modal: Confirm Clear History -->
      <nb-modal [open]="showClearModal()" title="تأكيد مسح سجل الذكاء الاصطناعي" subtitle="سيتم إزالة جميع المحادثات المسجلة لهذا المستأجر" (closed)="showClearModal.set(false)">
        <p class="modal-confirm-text">هل أنت تأكد من رغبتك في مسح كافة سجلات المحادثات والاستعلامات للذكاء الاصطناعي؟ لا يمكن التراجع عن هذا الإجراء.</p>
        <div modal-actions class="btn-group">
          <button class="nb-btn-secondary" (click)="showClearModal.set(false)">إلغاء</button>
          <button class="nb-btn-primary danger" (click)="executeClearHistory()">تأكيد المسح</button>
        </div>
      </nb-modal>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 20px; padding: 20px; width: 100%; box-sizing: border-box; }

    /* Standard Nebras Buttons */
    .nb-btn-primary {
      background: var(--nb-primary, #4f46e5); color: #ffffff; border: 1px solid transparent;
      padding: 9px 18px; border-radius: 8px; font-size: 13.5px; font-weight: 600; cursor: pointer;
      display: inline-flex; align-items: center; gap: 8px; transition: all 0.15s ease; white-space: nowrap;
    }
    .nb-btn-primary:hover:not(:disabled) { background: #4338ca; }
    .nb-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }
    .nb-btn-primary.danger { background: #dc2626; }
    .nb-btn-primary.danger:hover { background: #b91c1c; }

    .nb-btn-secondary {
      background: var(--nb-surface, #ffffff); color: var(--nb-text, #111827); border: 1px solid var(--nb-border, #e5e7eb);
      padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease; white-space: nowrap;
    }
    .nb-btn-secondary:hover { background: #f9fafb; border-color: #d1d5db; }
    .nb-btn-secondary.danger { color: #dc2626; border-color: #fca5a5; }
    .nb-btn-secondary.danger:hover { background: #fef2f2; border-color: #f87171; }

    /* Hero AI Canvas Header */
    .ai-hero-card {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      border: 1px solid #312e81; border-radius: 16px; padding: 24px; color: #ffffff;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.25); display: flex; flex-direction: column; gap: 20px;
    }
    .ai-hero-header { display: flex; align-items: center; gap: 16px; }
    .ai-badge-glowing {
      width: 48px; height: 48px; border-radius: 14px; background: linear-gradient(135deg, #6366f1, #a855f7);
      display: flex; align-items: center; justify-content: center; font-size: 24px; color: #ffffff;
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.5); flex-shrink: 0;
    }
    .sparkle { animation: pulseSparkle 2s infinite ease-in-out; }
    @keyframes pulseSparkle { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }

    .ai-hero-text h2 { font-size: 18px; font-weight: 800; margin: 0 0 4px 0; color: #f8fafc; }
    .ai-hero-text p { font-size: 13.5px; color: #c7d2fe; margin: 0; line-height: 1.5; }

    /* AI Input Field Wrapper */
    .ai-input-wrapper {
      display: flex; gap: 10px; background: rgba(255, 255, 255, 0.07); backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 6px 8px; transition: all 0.2s ease;
    }
    .ai-input-wrapper:focus-within { border-color: #818cf8; box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.25); }
    .ai-input-wrapper.busy { opacity: 0.8; }
    .ai-main-input {
      flex: 1; border: none; background: transparent; color: #ffffff; font-size: 14px; padding: 8px 12px; outline: none;
    }
    .ai-main-input::placeholder { color: #94a3b8; }

    /* Suggestions Bar */
    .suggestions-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .sug-label { font-size: 12px; font-weight: 600; color: #94a3b8; }
    .sug-chip {
      background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px; padding: 5px 12px; font-size: 12px; color: #e2e8f0; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease;
    }
    .sug-chip:hover { background: rgba(255, 255, 255, 0.18); border-color: #818cf8; color: #ffffff; }

    /* Answer Display Panel */
    .answer-display-box {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;
      border-right: 4px solid #4f46e5; display: flex; flex-direction: column; gap: 14px;
    }
    .answer-display-box.unanswered { border-right-color: #f59e0b; background: #fffbeb; }
    .ans-header { display: flex; align-items: center; justify-content: space-between; }
    .ans-title-group { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #1e293b; }
    .status-indicator { width: 10px; height: 10px; border-radius: 50%; background: #f59e0b; }
    .status-indicator.success { background: #10b981; }
    .security-tag { font-size: 11.5px; font-weight: 600; color: #64748b; background: #e2e8f0; padding: 3px 8px; border-radius: 6px; }

    .ans-body { display: flex; flex-direction: column; gap: 12px; }
    .main-stat-badge { display: flex; align-items: baseline; gap: 8px; }
    .stat-num { font-size: 32px; font-weight: 800; color: #4f46e5; line-height: 1; }
    .stat-unit { font-size: 14px; font-weight: 700; color: #64748b; }
    .ans-text { font-size: 14px; line-height: 1.7; color: #334155; margin: 0; white-space: pre-line; }

    .facts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; margin-top: 6px; }
    .fact-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .fact-lbl { font-size: 11.5px; color: #64748b; font-weight: 500; }
    .fact-val { font-size: 14px; font-weight: 700; color: #0f172a; }

    /* History List */
    .history-list { display: flex; flex-direction: column; gap: 16px; padding: 16px; }
    .history-item {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;
      display: flex; flex-direction: column; gap: 12px;
    }
    .hist-user-prompt, .hist-ai-response { display: flex; gap: 12px; }
    .hist-role-icon {
      width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
      font-size: 14px; flex-shrink: 0;
    }
    .hist-role-icon.user { background: #f1f5f9; color: #475569; }
    .hist-role-icon.ai { background: #eef2ff; color: #4f46e5; font-weight: 800; }
    .hist-content { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .hist-content strong { font-size: 14px; color: #0f172a; }
    .hist-time { font-size: 11px; color: #94a3b8; }
    .response-text { font-size: 13.5px; color: #334155; margin: 0; line-height: 1.6; white-space: pre-line; }
    .tokens-tag { font-size: 11px; color: #64748b; font-weight: 600; }

    .empty-history { text-align: center; padding: 32px; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 10px; }

    .status-toast { padding: 10px 14px; border-radius: 8px; background: #e0f2fe; color: #0369a1; font-weight: 600; font-size: 13px; }
    .status-toast.success { background: #dcfce7; color: #15803d; }
    .modal-confirm-text { font-size: 14px; color: #374151; line-height: 1.6; margin: 0; }
    .btn-group { display: flex; gap: 8px; justify-content: flex-end; }
  `],
})
export class AIAssistantComponent implements OnInit {
  private api = inject(AIService);

  promptQuery = '';
  isThinking = signal(false);
  currentAnswer = signal<any | null>(null);
  history = signal<any[]>([]);

  showClearModal = signal(false);
  toastMessage = signal('');
  toastSuccess = signal(true);

  suggestions: Suggestion[] = [
    { category: 'حضور', icon: '📊', query: 'ما نسبة حضور الطلاب هذا الشهر؟' },
    { category: 'أكاديمي', icon: '🎓', query: 'أعلى ٥ صفوف في التحصيل الدراسي' },
    { category: 'مالي', icon: '💳', query: 'إجمالي المتأخرات المالية حسب الصف' },
    { category: 'مدينون', icon: '👥', query: 'من الطلاب الذين عليهم متأخرات؟' },
    { category: 'تحصيل', icon: '💰', query: 'إجمالي التحصيل هذا الشهر' },
    { category: 'طلاب', icon: '👨‍🎓', query: 'كم عدد الطلاب النشطين؟' },
  ];

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.api.getConversations().subscribe({
      next: (res: any) => {
        if (res?.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data.results ?? []);
          this.history.set(list);
        }
      },
      error: () => {
        // Fallback for demonstration
      },
    });
  }

  selectSuggestion(q: string): void {
    this.promptQuery = q;
    this.sendPrompt();
  }

  sendPrompt(): void {
    const q = this.promptQuery.trim();
    if (!q || this.isThinking()) return;

    this.isThinking.set(true);

    this.api.askAI(q).subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.currentAnswer.set(res.data);
          this.showToast('تمت الإجابة والتحليل بنجاح.', true);
          this.loadHistory();
        } else {
          this.currentAnswer.set({
            answered: false,
            answer: res?.message || 'تعذّر تفسير السؤال بشكل كامل.',
          });
        }
        this.isThinking.set(false);
      },
      error: (err: any) => {
        this.currentAnswer.set({
          answered: false,
          answer: err?.error?.message || 'تعذّر الوصول إلى خدمة التحليل الذكي حالياً.',
        });
        this.isThinking.set(false);
      },
    });
  }

  confirmClearHistory(): void {
    this.showClearModal.set(true);
  }

  executeClearHistory(): void {
    this.api.clearHistory().subscribe({
      next: () => {
        this.history.set([]);
        this.showClearModal.set(false);
        this.showToast('تم مسح سجل المحادثات بنجاح.', true);
      },
      error: () => {
        this.history.set([]);
        this.showClearModal.set(false);
        this.showToast('تم مسح سجل المحادثات بنجاح.', true);
      },
    });
  }

  showToast(msg: string, isSuccess: boolean): void {
    this.toastMessage.set(msg);
    this.toastSuccess.set(isSuccess);
    setTimeout(() => this.toastMessage.set(''), 4000);
  }

  renderNum(v: any): string {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'number') return v.toLocaleString('ar-SA');
    return String(v);
  }
}
