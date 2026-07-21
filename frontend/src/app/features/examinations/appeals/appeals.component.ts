import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExaminationsService } from '../examinations.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { ExamAppeal, ExamIncident } from '../examinations.types';

interface AppealRow extends ExamAppeal { decisionMark?: number | null; }

/** التظلمات والمخالفات — طلبات إعادة التصحيح ومحاضر الغش والإخلال. */
@Component({
  selector: 'app-appeals',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="التظلمات والمخالفات" subtitle="متابعة طلبات إعادة التصحيح والبتّ فيها، وسجل محاضر المخالفات والغش.">
        <button class="btn ghost" (click)="back()">رجوع للمركز</button>
      </nb-page-header>

      <div class="tabs">
        <button class="tab" [class.on]="tab()==='appeals'" (click)="tab.set('appeals')">التظلمات <span class="c">{{ pending() }}</span></button>
        <button class="tab" [class.on]="tab()==='incidents'" (click)="tab.set('incidents')">محاضر المخالفات <span class="c">{{ incidents().length }}</span></button>
      </div>

      <nb-panel [flush]="true">
        <div class="table-wrap">
          @if (tab()==='appeals') {
            <table class="nb-table">
              <thead><tr><th>لجنة الطالب</th><th>سبب التظلم</th><th>الدرجة السابقة</th><th>الدرجة الجديدة</th><th>الحالة</th><th>البتّ</th></tr></thead>
              <tbody>
                @if (loading()) { <tr><td colspan="6"><nb-loading message="جارٍ التحميل…"></nb-loading></td></tr> }
                @else {
                  @for (a of appeals(); track a.id) {
                    <tr>
                      <td class="mono">{{ (a.student_exam || '') | slice:0:8 }}…</td>
                      <td class="reason">{{ a.reason }}</td>
                      <td class="mono">{{ a.old_marks }}</td>
                      <td class="mono">{{ a.new_marks ?? '—' }}</td>
                      <td><span class="badge" [class]="appealClass(a.status)">{{ appealLabel(a.status) }}</span></td>
                      <td class="actions">
                        @if (a.status === 'submitted' || a.status === 'under_review') {
                          <input type="number" class="mini-in" [(ngModel)]="a.decisionMark" placeholder="درجة جديدة" />
                          <button class="mini ok" (click)="resolve(a, a.decisionMark)">اعتماد</button>
                          <button class="mini danger" (click)="resolve(a, null)">رفض</button>
                        }
                      </td>
                    </tr>
                  }
                  @if (!appeals().length) { <tr><td colspan="6" class="empty">لا توجد تظلمات.</td></tr> }
                }
              </tbody>
            </table>
          }
          @if (tab()==='incidents') {
            <table class="nb-table">
              <thead><tr><th>لجنة الطالب</th><th>نوع المخالفة</th><th>الوصف</th><th>الإجراء المتّخذ</th></tr></thead>
              <tbody>
                @for (i of incidents(); track i.id) {
                  <tr>
                    <td class="mono">{{ (i.student_exam || '') | slice:0:8 }}…</td>
                    <td><span class="badge danger">{{ i.incident_type }}</span></td>
                    <td class="reason">{{ i.description }}</td>
                    <td class="muted">{{ i.action_taken || 'قيد المراجعة' }}</td>
                  </tr>
                }
                @if (!incidents().length) { <tr><td colspan="4" class="empty">لا محاضر مخالفات مسجّلة.</td></tr> }
              </tbody>
            </table>
          }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .tabs { display: flex; gap: 6px; margin-bottom: 14px; }
    .tab { height: 34px; padding: 0 16px; border: 1px solid var(--nb-border); background: var(--nb-surface); color: var(--nb-text-secondary);
      border-radius: var(--nb-radius); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
    .tab.on { background: var(--nb-primary-600); border-color: var(--nb-primary-600); color: #fff; }
    .tab .c { font-size: 11px; font-weight: 800; background: var(--nb-border-soft); color: var(--nb-text-secondary); border-radius: var(--nb-radius-pill); padding: 0 7px; }
    .tab.on .c { background: rgba(255,255,255,.25); color: #fff; }
    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table td { padding: 9px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); vertical-align: middle; }
    .mono { font-variant-numeric: tabular-nums; }
    .reason { max-width: 320px; color: var(--nb-text-secondary); } .muted { color: var(--nb-text-muted); }
    .empty { text-align: center; padding: 26px; color: var(--nb-text-muted); }
    .badge { display: inline-flex; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: var(--nb-radius-sm); background: var(--nb-border-soft); color: var(--nb-text-secondary); }
    .badge.warn { background: var(--nb-warning-bg); color: var(--nb-warning); }
    .badge.info { background: var(--nb-info-bg); color: var(--nb-info); }
    .badge.ok { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.danger { background: var(--nb-danger-bg); color: var(--nb-danger); }
    .actions { display: flex; gap: 6px; align-items: center; }
    .mini-in { height: 26px; width: 100px; padding: 0 8px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius-sm);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 12px; }
    .mini { height: 26px; padding: 0 10px; font-size: 11.5px; font-weight: 700; border-radius: var(--nb-radius-sm); border: none; cursor: pointer; }
    .mini.ok { background: var(--nb-success-bg); color: var(--nb-success); }
    .mini.danger { background: var(--nb-danger-bg); color: var(--nb-danger); }
    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
  `],
})
export class AppealsComponent implements OnInit {
  private service = inject(ExaminationsService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  tab = signal<'appeals' | 'incidents'>('appeals');
  loading = signal(true);
  appeals = signal<AppealRow[]>([]);
  incidents = signal<ExamIncident[]>([]);

  pending = computed(() => this.appeals().filter((a) => a.status === 'submitted' || a.status === 'under_review').length);

  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true);
    this.service.getAppeals().subscribe({ next: (r) => { if (r?.success) this.appeals.set(r.data); this.loading.set(false); }, error: () => this.loading.set(false) });
    this.service.getIncidents().subscribe((r) => { if (r?.success) this.incidents.set(r.data); });
  }

  resolve(a: AppealRow, newMarks: number | null | undefined) {
    const marks = newMarks === null || newMarks === undefined || (newMarks as unknown) === '' ? null : Number(newMarks);
    this.service.resolveAppeal(a.id, marks).subscribe({
      next: (r) => { if (r?.success) { this.notify.success(marks === null ? 'تم رفض التظلم.' : 'تم اعتماد الدرجة الجديدة.'); this.load(); } },
      error: () => this.notify.error('تعذر البتّ في التظلم.'),
    });
  }

  appealLabel(s: string): string { const m: Record<string, string> = { submitted: 'مقدّم', under_review: 'قيد المراجعة', resolved_changed: 'اعتُمد التغيير', resolved_unchanged: 'دون تغيير', rejected: 'مرفوض' }; return m[s] || s; }
  appealClass(s: string): string { const m: Record<string, string> = { submitted: 'warn', under_review: 'info', resolved_changed: 'ok', resolved_unchanged: 'danger', rejected: 'danger' }; return m[s] || ''; }
  back() { this.router.navigateByUrl('/examinations/dashboard'); }
}
