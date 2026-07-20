import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrmService, SupportCase } from './crm.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { SendMessageModalComponent } from '../communications/components/send-message-modal.component';

@Component({
  selector: 'app-crm-cases',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent, SendMessageModalComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="قضايا وتذاكر الدعم والشكاوى (Support Cases & Complaints)"
        subtitle="متابعة تذاكر خدمة أولياء الأمور، الشكاوى، الاقتراحات، وتصعيد القضايا للحرجة."
      >
        <button class="nb-btn-primary" (click)="toggleNewCaseModal()">+ تسجيل تذكرة جديدة</button>
      </nb-page-header>

      <nb-panel>
        <div class="filter-bar">
          <div class="status-tabs">
            <button
              class="status-tab"
              [class.active]="activeStatus() === 'all'"
              (click)="activeStatus.set('all')"
            >
              جميع التذاكر ({{ safeCases().length }})
            </button>
            <button
              class="status-tab open"
              [class.active]="activeStatus() === 'open'"
              (click)="activeStatus.set('open')"
            >
              مفتوحة ({{ countOpen() }})
            </button>
            <button
              class="status-tab in-progress"
              [class.active]="activeStatus() === 'in_progress'"
              (click)="activeStatus.set('in_progress')"
            >
              قيد المعالجة ({{ countInProgress() }})
            </button>
            <button
              class="status-tab resolved"
              [class.active]="activeStatus() === 'resolved'"
              (click)="activeStatus.set('resolved')"
            >
              تم الحسم ({{ countResolved() }})
            </button>
          </div>
        </div>

        <div class="cases-grid">
          @for (c of filteredCases(); track c.id) {
            <div class="case-card" [class.urgent]="c.priority === 'urgent' || c.priority === 'high'">
              <div class="case-header">
                <div class="case-title-area">
                  <span
                    class="type-tag"
                    [class.complaint]="c.case_type === 'complaint'"
                    [class.suggestion]="c.case_type === 'suggestion'"
                    [class.tech]="c.case_type === 'technical_support'"
                  >
                    {{ c.case_type === 'complaint' ? 'شكوى' : c.case_type === 'suggestion' ? 'اقتراح' : 'دعم فني' }}
                  </span>
                  <h4>{{ c.subject }}</h4>
                </div>
                <span
                  class="priority-badge"
                  [class.urgent]="c.priority === 'urgent'"
                  [class.high]="c.priority === 'high'"
                  [class.medium]="c.priority === 'medium'"
                >
                  {{ c.priority === 'urgent' ? 'حرجة جداً' : c.priority === 'high' ? 'عالية' : 'متوسطة' }}
                </span>
              </div>

              <p class="case-desc">{{ c.description }}</p>

              <div class="case-meta">
                <div>👤 <strong>{{ c.contact_name }}</strong> ({{ c.contact_phone }})</div>
                <div>📅 {{ c.created_at }}</div>
              </div>

              <div class="case-footer">
                <span
                  class="status-badge"
                  [class.open]="c.status === 'open'"
                  [class.progress]="c.status === 'in_progress'"
                  [class.done]="c.status === 'resolved'"
                >
                  {{ c.status === 'open' ? 'جديدة' : c.status === 'in_progress' ? 'قيد المتابعة' : 'تم الحل' }}
                </span>

                <div class="actions">
                  @if (c.status !== 'resolved') {
                    <button class="action-btn message" (click)="openMessageModal(c)">
                      💬 مراسلة
                    </button>
                    <button class="action-btn escalate" (click)="escalate(c.id!)">
                      ⚠️ تصعيد للإدارة
                    </button>
                    <button class="action-btn resolve" (click)="resolveCase(c.id!)">
                      ✓ إغلاق التذكرة
                    </button>
                  }
                </div>
              </div>
            </div>
          } @empty {
            <div class="empty-state">لا توجد قضايا أو تذاكر تفي بشروط العرض الحالية.</div>
          }
        </div>
      </nb-panel>

      <!-- Modal تسجيل تذكرة جديدة -->
      @if (showNewCaseModal()) {
        <div class="modal-backdrop" (click)="toggleNewCaseModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>تسجيل تذكرة دعم / شكوى جديدة</h3>
              <button class="close-btn" (click)="toggleNewCaseModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>اسم صاحب الطلب / ولي الأمر *</label>
                <input type="text" [(ngModel)]="newCase.contact_name" placeholder="مثال: الطيب البشير" />
              </div>
              <div class="form-group">
                <label>رقم التواصل *</label>
                <input type="text" [(ngModel)]="newCase.contact_phone" placeholder="09xxxxxxxx" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>نوع التذكرة</label>
                  <select [(ngModel)]="newCase.case_type">
                    <option value="complaint">شكوى (Complaint)</option>
                    <option value="suggestion">اقتراح (Suggestion)</option>
                    <option value="technical_support">دعم فني للبوابة (Technical)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>الأولوية</label>
                  <select [(ngModel)]="newCase.priority">
                    <option value="low">عادية (Low)</option>
                    <option value="medium">متوسطة (Medium)</option>
                    <option value="high">عالية (High)</option>
                    <option value="urgent">حرجة طارئة (Urgent)</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>عنوان الموضوع *</label>
                <input type="text" [(ngModel)]="newCase.subject" placeholder="مثال: استفسار حول كشف الدرجات" />
              </div>
              <div class="form-group">
                <label>تفاصيل الشكوى أو الطلب</label>
                <textarea rows="4" [(ngModel)]="newCase.description" placeholder="اكتب تفاصيل التذكرة بدقة..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="nb-btn-secondary" (click)="toggleNewCaseModal()">إلغاء</button>
              <button class="nb-btn-primary" (click)="saveNewCase()">تسجيل التذكرة</button>
            </div>
          </div>
        </div>
      }

      <app-send-message-modal
        [(open)]="showMsgModal"
        [recipientName]="selectedCase()?.contact_name || ''"
        [recipientPhone]="selectedCase()?.contact_phone || ''"
        [contextVariables]="{ ticket: selectedCase()?.id, subject: selectedCase()?.subject }"
        defaultTemplateCode="CASE_UPDATE"
      ></app-send-message-modal>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .filter-bar { margin-bottom: 16px; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 8px; }
    .status-tabs { display: flex; gap: 10px; }
    .status-tab { background: transparent; border: none; border-bottom: 2px solid transparent; padding: 8px 12px; font-size: 13px; cursor: pointer; color: var(--nb-text-muted); font-weight: 500; }
    .status-tab.active { border-bottom-color: var(--nb-primary-600); color: var(--nb-primary-600); font-weight: 700; }
    
    .cases-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px; }
    .case-card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-lg, 10px); padding: 16px; display: flex; flex-direction: column; gap: 12px; transition: box-shadow 0.2s; }
    .case-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .case-card.urgent { border-right: 4px solid var(--nb-danger, #dc2626); }
    .case-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .case-title-area { display: flex; flex-direction: column; gap: 4px; }
    .case-title-area h4 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .type-tag { font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: var(--nb-radius-sm); display: inline-block; width: fit-content; }
    .type-tag.complaint { background: #fee2e2; color: #991b1b; }
    .type-tag.suggestion { background: #e0e7ff; color: #3730a3; }
    .type-tag.tech { background: #f3e8ff; color: #6b21a8; }

    .priority-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
    .priority-badge.urgent { background: #dc2626; color: white; }
    .priority-badge.high { background: #f97316; color: white; }
    .priority-badge.medium { background: #fef08a; color: #713f12; }

    .case-desc { font-size: 12.5px; color: var(--nb-text-secondary); line-height: 1.5; margin: 0; }
    .case-meta { font-size: 11.5px; color: var(--nb-text-muted); display: flex; justify-content: space-between; border-top: 1px dashed var(--nb-border-soft); padding-top: 8px; }
    
    .case-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 4px; }
    .status-badge { font-size: 11.5px; font-weight: 700; padding: 4px 10px; border-radius: var(--nb-radius-sm); }
    .status-badge.open { background: #fef3c7; color: #92400e; }
    .status-badge.progress { background: #dbeafe; color: #1e40af; }
    .status-badge.done { background: #dcfce7; color: #15803d; }

    .actions { display: flex; gap: 6px; }
    .action-btn { font-size: 11.5px; padding: 4px 10px; border-radius: var(--nb-radius); border: 1px solid var(--nb-border); background: var(--nb-surface); cursor: pointer; }
    .action-btn.escalate { color: #c2410c; border-color: #fdba74; }
    .action-btn.resolve { color: #15803d; border-color: #86efac; }
    .empty-state { grid-column: 1 / -1; text-align: center; padding: 32px; color: var(--nb-text-muted); }

    /* Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-card { background: var(--nb-surface); width: 500px; max-width: 90vw; border-radius: var(--nb-radius-lg, 12px); box-shadow: 0 10px 25px rgba(0,0,0,0.15); overflow: hidden; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--nb-border-soft); }
    .modal-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .close-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--nb-text-muted); }
    .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-size: 12px; font-weight: 600; color: var(--nb-text-secondary); }
    .form-group input, .form-group select, .form-group textarea { padding: 8px 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); font-size: 13px; outline: none; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--nb-border-soft); background: var(--nb-bg); }
    .nb-btn-primary { background: var(--nb-primary-600); color: white; border: none; padding: 8px 16px; border-radius: var(--nb-radius); font-size: 13px; font-weight: 600; cursor: pointer; }
    .nb-btn-secondary { background: var(--nb-surface); border: 1px solid var(--nb-border); color: var(--nb-text); padding: 8px 16px; border-radius: var(--nb-radius); font-size: 13px; cursor: pointer; }
  `]
})
export class CrmCasesComponent {
  private crmService = inject(CrmService);

  cases = signal<SupportCase[]>([]);
  activeStatus = signal<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  showNewCaseModal = signal(false);

  showMsgModal = false;
  selectedCase = signal<SupportCase | null>(null);

  newCase: Partial<SupportCase> = {
    contact_name: '',
    contact_phone: '',
    subject: '',
    description: '',
    case_type: 'complaint',
    priority: 'medium',
    status: 'open',
  };

  constructor() {
    this.crmService.getCases().subscribe((data) => {
      const arr = Array.isArray(data) ? data : (data as any)?.results || [];
      this.cases.set(arr);
    });
  }

  safeCases = computed(() => {
    const raw = this.cases();
    return Array.isArray(raw) ? raw : [];
  });

  filteredCases = computed(() => {
    const st = this.activeStatus();
    if (st === 'all') return this.safeCases();
    return this.safeCases().filter((c) => c.status === st);
  });

  countOpen = computed(() => this.safeCases().filter((c) => c.status === 'open').length);
  countInProgress = computed(() => this.safeCases().filter((c) => c.status === 'in_progress').length);
  countResolved = computed(() => this.safeCases().filter((c) => c.status === 'resolved').length);

  toggleNewCaseModal(): void {
    this.showNewCaseModal.update((v) => !v);
  }

  openMessageModal(c: SupportCase) {
    this.selectedCase.set(c);
    this.showMsgModal = true;
  }

  saveNewCase(): void {
    if (!this.newCase.contact_name || !this.newCase.subject) return;
    const item: SupportCase = {
      id: String(Date.now()),
      contact_name: this.newCase.contact_name,
      contact_phone: this.newCase.contact_phone || '0500000000',
      subject: this.newCase.subject,
      description: this.newCase.description || '',
      case_type: this.newCase.case_type || 'complaint',
      priority: this.newCase.priority || 'medium',
      status: 'open',
      created_at: new Date().toISOString().split('T')[0],
    };

    this.cases.update((list) => [item, ...(Array.isArray(list) ? list : [])]);
    this.toggleNewCaseModal();
    this.newCase = { contact_name: '', contact_phone: '', subject: '', description: '', case_type: 'complaint', priority: 'medium' };
  }

  escalate(id: string): void {
    this.crmService.escalateCase(id).subscribe(() => {
      this.cases.update((list) =>
        (Array.isArray(list) ? list : []).map((c) => (c.id === id ? { ...c, priority: 'urgent' } : c))
      );
    });
  }

  resolveCase(id: string): void {
    this.cases.update((list) =>
      (Array.isArray(list) ? list : []).map((c) => (c.id === id ? { ...c, status: 'resolved' } : c))
    );
  }
}
