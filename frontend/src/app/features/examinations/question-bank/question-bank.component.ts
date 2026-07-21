import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExaminationsService } from '../examinations.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { QuestionBank, Question, Subject } from '../examinations.types';

/** بنك الأسئلة — بنوك أسئلة لكل مادة، والأسئلة بأنواعها ومستويات صعوبتها. */
@Component({
  selector: 'app-question-bank',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="بنك الأسئلة" subtitle="بنوك أسئلة مرتبطة بالمواد، وأسئلة بأنواعها ومستويات صعوبتها وتصنيف بلوم.">
        <button class="btn ghost" (click)="back()">رجوع للمركز</button>
      </nb-page-header>

      <div class="cols">
        <!-- البنوك -->
        <nb-panel title="بنوك الأسئلة" subtitle="لكل مادة بنك أسئلة مستقل.">
          <div class="mini-form">
            <input class="fld" placeholder="اسم البنك" [(ngModel)]="bForm.name" />
            <select class="fld" [(ngModel)]="bForm.subject_id">
              <option value="">المادة…</option>
              @for (s of subjects(); track s.id) { <option [value]="s.id">{{ s.arabic_name }}</option> }
            </select>
            <button class="btn primary sm" (click)="addBank()">إضافة</button>
          </div>
          <div class="list">
            @for (b of banks(); track b.id) {
              <button class="item" [class.sel]="b.id === selectedBank()" (click)="selectBank(b.id)">
                <div class="grow"><strong>{{ b.name }}</strong><small>{{ subjectName(b.subject_id) }}</small></div>
                <span class="num">{{ countFor(b.id) }}</span>
              </button>
            }
            @if (!banks().length) { <div class="empty">لا توجد بنوك بعد.</div> }
          </div>
        </nb-panel>

        <!-- أسئلة البنك المختار -->
        <nb-panel [title]="selectedBank() ? 'أسئلة: ' + bankName(selectedBank()) : 'الأسئلة'" subtitle="أضف أسئلة البنك المختار.">
          @if (!selectedBank()) {
            <div class="empty">اختر بنكًا من القائمة لعرض وإضافة أسئلته.</div>
          } @else {
            <div class="grid">
              <label class="full">نص السؤال<textarea class="fld ta" rows="2" [(ngModel)]="qForm.content" placeholder="اكتب نص السؤال…"></textarea></label>
              <label>النوع
                <select class="fld" [(ngModel)]="qForm.question_type">
                  @for (t of qTypes; track t.v) { <option [value]="t.v">{{ t.t }}</option> }
                </select>
              </label>
              <label>الدرجة<input class="fld" type="number" [(ngModel)]="qForm.marks" /></label>
              <label>الصعوبة
                <select class="fld" [(ngModel)]="qForm.difficulty_level">
                  <option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">صعب</option>
                </select>
              </label>
            </div>
            <div class="form-actions"><button class="btn primary" (click)="addQuestion()">إضافة السؤال</button></div>

            <div class="table-wrap mt">
              <table class="nb-table">
                <thead><tr><th>السؤال</th><th>النوع</th><th>الدرجة</th><th>الصعوبة</th></tr></thead>
                <tbody>
                  @if (loadingQ()) { <tr><td colspan="4"><nb-loading message="جارٍ…"></nb-loading></td></tr> }
                  @else {
                    @for (q of bankQuestions(); track q.id) {
                      <tr><td class="q">{{ q.content }}</td><td>{{ qTypeLabel(q.question_type) }}</td>
                        <td class="mono">{{ q.marks }}</td>
                        <td><span class="badge" [class]="q.difficulty_level">{{ diffLabel(q.difficulty_level) }}</span></td></tr>
                    }
                    @if (!bankQuestions().length) { <tr><td colspan="4" class="empty">لا أسئلة في هذا البنك بعد.</td></tr> }
                  }
                </tbody>
              </table>
            </div>
          }
        </nb-panel>
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .cols { display: grid; grid-template-columns: 320px 1fr; gap: 12px; }
    @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
    .mt { margin-top: 12px; }
    .mini-form { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .grid .full { grid-column: 1 / -1; }
    @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--nb-text-muted); }
    .fld { min-height: 34px; padding: 6px 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; width: 100%; box-sizing: border-box; }
    .fld.ta { resize: vertical; }
    .form-actions { margin-top: 12px; }
    .list { display: flex; flex-direction: column; gap: 6px; }
    .item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border: 1px solid var(--nb-border-soft);
      border-radius: var(--nb-radius); background: var(--nb-surface); cursor: pointer; text-align: start; font-family: inherit; }
    .item:hover { background: var(--nb-surface-raised); }
    .item.sel { border-color: var(--nb-primary-400); background: var(--nb-primary-50); }
    .item .grow { flex: 1; display: flex; flex-direction: column; }
    .item small { font-size: 11px; color: var(--nb-text-muted); }
    .num { font-size: 12px; font-weight: 800; color: var(--nb-info); background: var(--nb-info-bg); border-radius: var(--nb-radius-pill); padding: 1px 9px; }
    .empty { text-align: center; padding: 20px; color: var(--nb-text-muted); font-size: 13px; }
    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table td { padding: 9px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .nb-table td.q { max-width: 360px; }
    .mono { font-variant-numeric: tabular-nums; }
    .badge { display: inline-flex; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: var(--nb-radius-sm); }
    .badge.easy { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.medium { background: var(--nb-info-bg); color: var(--nb-info); }
    .badge.hard { background: var(--nb-danger-bg); color: var(--nb-danger); }
    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
  `],
})
export class QuestionBankComponent implements OnInit {
  private service = inject(ExaminationsService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  banks = signal<QuestionBank[]>([]);
  questions = signal<Question[]>([]);
  subjects = signal<Subject[]>([]);
  selectedBank = signal<string>('');
  loadingQ = signal(false);

  bForm: { name: string; subject_id: string } = { name: '', subject_id: '' };
  qForm: { content: string; question_type: string; marks: number; difficulty_level: string } = { content: '', question_type: 'mcq', marks: 1, difficulty_level: 'medium' };

  readonly qTypes = [
    { v: 'mcq', t: 'اختيار من متعدد' }, { v: 'true_false', t: 'صح أو خطأ' }, { v: 'essay', t: 'مقالي' },
    { v: 'short_answer', t: 'إجابة قصيرة' }, { v: 'matching', t: 'مطابقة' }, { v: 'fill_blanks', t: 'إكمال فراغات' },
    { v: 'calculation', t: 'مسألة حسابية' }, { v: 'coding', t: 'برمجة' },
  ];

  bankQuestions = computed(() => this.questions().filter((q) => q.bank === this.selectedBank()));

  ngOnInit() {
    this.service.getSubjects().subscribe((r) => { if (r?.success) this.subjects.set(r.data); });
    this.loadBanks();
    this.service.getQuestions().subscribe((r) => { if (r?.success) this.questions.set(r.data); });
  }
  loadBanks() { this.service.getQuestionBanks().subscribe((r) => { if (r?.success) this.banks.set(r.data); }); }

  selectBank(id: string) { this.selectedBank.set(id); }
  countFor(bankId: string): number { return this.questions().filter((q) => q.bank === bankId).length; }
  subjectName(id: string): string { return this.subjects().find((s) => s.id === id)?.arabic_name || '—'; }
  bankName(id: string): string { return this.banks().find((b) => b.id === id)?.name || ''; }
  qTypeLabel(v: string): string { return this.qTypes.find((t) => t.v === v)?.t || v; }
  diffLabel(v: string): string { const m: Record<string, string> = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' }; return m[v] || v; }

  addBank() {
    if (!this.bForm.name || !this.bForm.subject_id) { this.notify.error('أدخل اسم البنك والمادة.'); return; }
    this.service.createQuestionBank(this.bForm).subscribe({
      next: (r) => { if (r?.success) { this.notify.success('تمت إضافة البنك.'); this.bForm = { name: '', subject_id: '' }; this.loadBanks(); } },
      error: () => this.notify.error('تعذر حفظ البنك.'),
    });
  }

  addQuestion() {
    if (!this.qForm.content) { this.notify.error('اكتب نص السؤال.'); return; }
    this.loadingQ.set(true);
    this.service.createQuestion({ ...this.qForm, bank: this.selectedBank() }).subscribe({
      next: (r) => { this.loadingQ.set(false); if (r?.success) { this.notify.success('تمت إضافة السؤال.'); this.qForm = { content: '', question_type: 'mcq', marks: 1, difficulty_level: 'medium' };
        this.service.getQuestions().subscribe((x) => { if (x?.success) this.questions.set(x.data); }); } },
      error: () => { this.loadingQ.set(false); this.notify.error('تعذر حفظ السؤال.'); },
    });
  }

  back() { this.router.navigateByUrl('/examinations/dashboard'); }
}
