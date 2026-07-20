import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrmService, Lead } from './crm.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { SendMessageModalComponent } from '../communications/components/send-message-modal.component';

@Component({
  selector: 'app-crm-leads',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent, SendMessageModalComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="استقطاب والعملاء المحتملين (Leads & Recruitment)"
        subtitle="متابعة طلبات الاهتمام، قنوات الاستقطاب، وتحويل المهتمين إلى طلبات قبول رسمية."
      >
        <button class="nb-btn-primary" (click)="toggleNewLeadModal()">+ إضافة عميل محتمل جديد</button>
      </nb-page-header>

      <nb-panel>
        <div class="filter-bar">
          <div class="search-box">
            <input
              type="text"
              placeholder="بحث بالاسم أو رقم الهاتف أو البريد..."
              [ngModel]="searchTerm()"
              (ngModelChange)="searchTerm.set($event)"
            />
          </div>
          <div class="level-filter">
            <button
              class="filter-chip"
              [class.active]="selectedLevel() === 'all'"
              (click)="selectedLevel.set('all')"
            >
              الكل ({{ safeLeads().length }})
            </button>
            <button
              class="filter-chip high"
              [class.active]="selectedLevel() === 'high'"
              (click)="selectedLevel.set('high')"
            >
              اهتمام عالي ({{ countHigh() }})
            </button>
            <button
              class="filter-chip medium"
              [class.active]="selectedLevel() === 'medium'"
              (click)="selectedLevel.set('medium')"
            >
              اهتمام متوسط ({{ countMedium() }})
            </button>
          </div>
        </div>

        <div class="leads-table-wrapper">
          <table class="leads-table">
            <thead>
              <tr>
                <th>الاسم الأول والعائلة</th>
                <th>الهاتف والبريد</th>
                <th>قناة الاستقطاب</th>
                <th>درجة الاهتمام</th>
                <th>الملاحظات</th>
                <th>تاريخ الإضافة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              @for (lead of filteredLeads(); track lead.id) {
                <tr>
                  <td>
                    <div class="lead-name">
                      <strong>{{ lead.first_name }} {{ lead.last_name }}</strong>
                    </div>
                  </td>
                  <td>
                    <div class="lead-contact">
                      <span>📱 {{ lead.phone }}</span>
                      @if (lead.email) {
                        <small>✉️ {{ lead.email }}</small>
                      }
                    </div>
                  </td>
                  <td>
                    <span class="source-tag">{{ lead.source_name || 'مباشر' }}</span>
                  </td>
                  <td>
                    <span
                      class="interest-badge"
                      [class.high]="lead.interest_level === 'high'"
                      [class.medium]="lead.interest_level === 'medium'"
                      [class.low]="lead.interest_level === 'low'"
                    >
                      {{ lead.interest_level === 'high' ? 'عالية جداً' : lead.interest_level === 'medium' ? 'متوسطة' : 'منخفضة' }}
                    </span>
                  </td>
                  <td class="notes-cell">
                    {{ lead.notes || '—' }}
                  </td>
                  <td>{{ lead.created_at || '2026-07-20' }}</td>
                  <td>
                    <div style="display: flex; gap: 8px;">
                      <button class="btn-action convert" (click)="convertLead(lead.id!)">
                        تحويل إلى مستهدف ➔
                      </button>
                      <button class="btn-action message" (click)="openMessageModal(lead)">
                        💬 مراسلة
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="empty-state">لا يوجد عملاء محتملون يطابقون خيارات البحث.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </nb-panel>

      <!-- Modal إضافة عميل جديد -->
      @if (showNewLeadModal()) {
        <div class="modal-backdrop" (click)="toggleNewLeadModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>إضافة عميل محتمل جديد</h3>
              <button class="close-btn" (click)="toggleNewLeadModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>الاسم الأول *</label>
                  <input type="text" [(ngModel)]="newLeadData.first_name" placeholder="مثال: عثمان" />
                </div>
                <div class="form-group">
                  <label>اسم العائلة *</label>
                  <input type="text" [(ngModel)]="newLeadData.last_name" placeholder="مثال: الكباشي" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>رقم الهاتف *</label>
                  <input type="text" [(ngModel)]="newLeadData.phone" placeholder="09xxxxxxxx" />
                </div>
                <div class="form-group">
                  <label>البريد الإلكتروني</label>
                  <input type="email" [(ngModel)]="newLeadData.email" placeholder="example@domain.sd" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>درجة الاهتمام</label>
                  <select [(ngModel)]="newLeadData.interest_level">
                    <option value="high">عالية (High)</option>
                    <option value="medium">متوسطة (Medium)</option>
                    <option value="low">منخفضة (Low)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>قناة الاستقطاب</label>
                  <input type="text" [(ngModel)]="newLeadData.source_name" placeholder="مثال: وسائل التواصل / زيارة" />
                </div>
              </div>

              <div class="form-group">
                <label>ملاحظات إضافية</label>
                <textarea rows="3" [(ngModel)]="newLeadData.notes" placeholder="أدخل أي ملاحظات تخص الطالب أو المراحل المطلوبة..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="nb-btn-secondary" (click)="toggleNewLeadModal()">إلغاء</button>
              <button class="nb-btn-primary" (click)="saveNewLead()">حفظ العميل المحتمل</button>
            </div>
          </div>
        </div>
      }

      <app-send-message-modal
        [(open)]="showMsgModal"
        [recipientName]="(selectedLead()?.first_name || '') + ' ' + (selectedLead()?.last_name || '')"
        [recipientPhone]="selectedLead()?.phone || ''"
        [recipientEmail]="selectedLead()?.email || ''"
        [contextVariables]="{ lead_id: selectedLead()?.id, source: selectedLead()?.source_name }"
        defaultTemplateCode="LEAD_FOLLOWUP"
      ></app-send-message-modal>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .filter-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .search-box input { width: 320px; padding: 8px 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); font-size: 13px; outline: none; }
    .search-box input:focus { border-color: var(--nb-primary-600); }
    .level-filter { display: flex; gap: 8px; }
    .filter-chip { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); padding: 6px 14px; border-radius: 999px; font-size: 12px; cursor: pointer; color: var(--nb-text-secondary); }
    .filter-chip.active { background: var(--nb-primary-600); color: white; border-color: var(--nb-primary-600); font-weight: 600; }
    .leads-table-wrapper { overflow-x: auto; }
    .leads-table { width: 100%; border-collapse: collapse; text-align: right; font-size: 13px; }
    .leads-table th { background: var(--nb-bg); padding: 10px 12px; border-bottom: 1px solid var(--nb-border); color: var(--nb-text-muted); font-weight: 600; }
    .leads-table td { padding: 12px; border-bottom: 1px solid var(--nb-border-soft); vertical-align: middle; }
    .lead-name strong { color: var(--nb-text); font-size: 13.5px; }
    .lead-contact { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: var(--nb-text-secondary); }
    .source-tag { background: var(--nb-primary-50); color: var(--nb-primary-600); padding: 3px 8px; border-radius: var(--nb-radius-sm); font-size: 11.5px; font-weight: 500; }
    .interest-badge { padding: 3px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 700; display: inline-block; }
    .interest-badge.high { background: #dcfce7; color: #166534; }
    .interest-badge.medium { background: #fef9c3; color: #854d0e; }
    .interest-badge.low { background: #f1f5f9; color: #475569; }
    .notes-cell { max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--nb-text-secondary); }
    .btn-action { padding: 5px 12px; border-radius: var(--nb-radius); border: 1px solid var(--nb-primary-600); background: transparent; color: var(--nb-primary-600); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
    .btn-action:hover { background: var(--nb-primary-600); color: white; }
    .empty-state { text-align: center; padding: 32px; color: var(--nb-text-muted); }
    
    /* Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-card { background: var(--nb-surface); width: 540px; max-width: 90vw; border-radius: var(--nb-radius-lg, 12px); box-shadow: 0 10px 25px rgba(0,0,0,0.15); overflow: hidden; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--nb-border-soft); }
    .modal-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .close-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--nb-text-muted); }
    .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 12px; font-weight: 600; color: var(--nb-text-secondary); }
    .form-group input, .form-group select, .form-group textarea { padding: 8px 12px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); font-size: 13px; outline: none; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--nb-border-soft); background: var(--nb-bg); }
    .nb-btn-primary { background: var(--nb-primary-600); color: white; border: none; padding: 8px 16px; border-radius: var(--nb-radius); font-size: 13px; font-weight: 600; cursor: pointer; }
    .nb-btn-secondary { background: var(--nb-surface); border: 1px solid var(--nb-border); color: var(--nb-text); padding: 8px 16px; border-radius: var(--nb-radius); font-size: 13px; cursor: pointer; }
  `]
})
export class CrmLeadsComponent {
  private crmService = inject(CrmService);

  leads = signal<Lead[]>([]);
  searchTerm = signal('');
  selectedLevel = signal<'all' | 'high' | 'medium' | 'low'>('all');
  showNewLeadModal = signal(false);

  showMsgModal = false;
  selectedLead = signal<Lead | null>(null);

  newLeadData: Partial<Lead> = {
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    interest_level: 'high',
    source_name: 'زيارة مباشرة',
    notes: '',
  };

  constructor() {
    this.crmService.getLeads().subscribe((data) => {
      const arr = Array.isArray(data) ? data : (data as any)?.results || [];
      this.leads.set(arr);
    });
  }

  safeLeads = computed(() => {
    const raw = this.leads();
    return Array.isArray(raw) ? raw : [];
  });

  filteredLeads = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const lvl = this.selectedLevel();
    return this.safeLeads().filter((l) => {
      const matchSearch =
        !term ||
        (l.first_name || '').toLowerCase().includes(term) ||
        (l.last_name || '').toLowerCase().includes(term) ||
        (l.phone || '').includes(term);
      const matchLvl = lvl === 'all' || l.interest_level === lvl;
      return matchSearch && matchLvl;
    });
  });

  countHigh = computed(() => this.safeLeads().filter((l) => l.interest_level === 'high').length);
  countMedium = computed(() => this.safeLeads().filter((l) => l.interest_level === 'medium').length);

  toggleNewLeadModal(): void {
    this.showNewLeadModal.update((v) => !v);
  }

  openMessageModal(lead: Lead) {
    this.selectedLead.set(lead);
    this.showMsgModal = true;
  }

  saveNewLead(): void {
    if (!this.newLeadData.first_name || !this.newLeadData.phone) return;
    const newLead: Lead = {
      id: String(Date.now()),
      first_name: this.newLeadData.first_name || '',
      last_name: this.newLeadData.last_name || '',
      phone: this.newLeadData.phone || '',
      email: this.newLeadData.email,
      interest_level: this.newLeadData.interest_level || 'high',
      source_name: this.newLeadData.source_name || 'مباشر',
      notes: this.newLeadData.notes,
      created_at: new Date().toISOString().split('T')[0],
    };

    this.leads.update((list) => [newLead, ...(Array.isArray(list) ? list : [])]);
    this.toggleNewLeadModal();
    this.newLeadData = { first_name: '', last_name: '', phone: '', email: '', interest_level: 'high', notes: '' };
  }

  convertLead(id: string): void {
    this.crmService.convertLeadToProspect(id).subscribe(() => {
      this.leads.update((list) => (Array.isArray(list) ? list : []).filter((l) => l.id !== id));
    });
  }
}
