import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClinicService } from '../clinic.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

/**
 * زيارات العيادة.
 *
 * الزيارة سجلّ طبي سرّي: يُفتح على مريض بعينه (طالب أو موظف)، وتُسجَّل
 * مؤشراته الحيوية، وقد يُصرف له دواء يُخصم من مستودع العيادة فعلاً.
 */
@Component({
  selector: 'app-clinic-visits',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="زيارات العيادة" subtitle="استقبال المرضى، تسجيل المؤشرات، وصرف الأدوية.">
        <button class="btn ghost" (click)="back()">رجوع للوحة</button>
        <button class="btn ghost" (click)="load()">تحديث</button>
        <button class="btn primary" (click)="openNew()">＋ زيارة جديدة</button>
      </nb-page-header>

      @if (showNew()) {
        <section class="form-card">
          <header class="fc-head">
            <h3>زيارة جديدة</h3>
            <button class="x" (click)="showNew.set(false)" aria-label="إغلاق">✕</button>
          </header>
          <div class="fc-body">
            <div class="fields">
              <label class="wide">
                <span>المريض <i>*</i></span>
                <select [(ngModel)]="form.person">
                  <option value="">اختر…</option>
                  <optgroup label="الطلاب">
                    @for (p of students(); track p.id) {
                      <option [value]="p.type + ':' + p.id">{{ p.name }} — {{ p.reference }}</option>
                    }
                  </optgroup>
                  <optgroup label="الموظفون والمعلمون">
                    @for (p of employees(); track p.id) {
                      <option [value]="p.type + ':' + p.id">{{ p.name }} — {{ p.reference }}</option>
                    }
                  </optgroup>
                </select>
              </label>
              <label>
                <span>العيادة <i>*</i></span>
                <select [(ngModel)]="form.clinic">
                  <option value="">اختر…</option>
                  @for (c of clinics(); track c.id) { <option [value]="c.id">{{ c.name_ar }}</option> }
                </select>
              </label>
              <label>
                <span>نوع الزيارة</span>
                <select [(ngModel)]="form.type">
                  <option value="walk_in">زيارة عادية</option>
                  <option value="emergency">طارئة</option>
                  <option value="scheduled">موعد</option>
                  <option value="follow_up">متابعة</option>
                </select>
              </label>
              <label class="wide">
                <span>سبب الزيارة</span>
                <input [(ngModel)]="form.notes" placeholder="الشكوى الرئيسية" />
              </label>
            </div>
            @if (error()) { <p class="err">{{ error() }}</p> }
          </div>
          <footer class="fc-acts">
            <button class="btn ghost" (click)="showNew.set(false)">إلغاء</button>
            <button class="btn primary" [disabled]="saving()" (click)="createVisit()">
              {{ saving() ? 'جارٍ التسجيل…' : 'فتح الزيارة' }}
            </button>
          </footer>
        </section>
      }

      <div class="chips">
        <button [class.on]="filter()===''" (click)="filter.set('')">الكل ({{ all().length }})</button>
        <button [class.on]="filter()==='open'" (click)="filter.set('open')">مفتوحة ({{ countOpen() }})</button>
        <button [class.on]="filter()==='emergency'" (click)="filter.set('emergency')">طارئة ({{ countUrgent() }})</button>
        <button [class.on]="filter()==='closed'" (click)="filter.set('closed')">مغلقة ({{ countClosed() }})</button>
      </div>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل الزيارات…"></nb-loading>
      } @else if (!filtered().length) {
        <div class="empty-card">لا توجد زيارات مطابقة.</div>
      } @else {
        <section class="list">
          @for (v of filtered(); track v.id) {
            <article class="visit" [class.urgent]="v.isUrgent">
              <header class="v-head">
                <div class="v-who">
                  <strong>{{ v.patient_name }}</strong>
                  <span class="v-meta">
                    {{ v.patient_type_label }} · {{ visitTypeText(v.visit_type) }} · {{ v.visit_date }}
                  </span>
                </div>
                <span class="badge" [class]="v.status">{{ statusText(v.status) }}</span>
              </header>

              @if (v.notes) { <p class="v-notes">{{ v.notes }}</p> }

              @if (vitalsOf(v.id); as vt) {
                <div class="vitals">
                  <span class="vt" [class.hot]="vt.temperature >= 38">
                    <b>{{ vt.temperature }}</b>°م
                  </span>
                  @if (vt.blood_pressure_sys) {
                    <span class="vt"><b>{{ vt.blood_pressure_sys }}/{{ vt.blood_pressure_dia }}</b> ضغط</span>
                  }
                  @if (vt.pulse_rate) { <span class="vt"><b>{{ vt.pulse_rate }}</b> نبضة</span> }
                  @if (vt.oxygen_saturation) { <span class="vt"><b>{{ vt.oxygen_saturation }}٪</b> أكسجين</span> }
                </div>
              }

              @if (dispensesOf(v.id).length) {
                <div class="meds">
                  <span class="m-lbl">أدوية مصروفة:</span>
                  @for (d of dispensesOf(v.id); track d.id) {
                    <span class="med">{{ medName(d.medication) }} × {{ d.quantity }}</span>
                  }
                </div>
              }

              <footer class="v-acts">
                @if (!isClosed(v.status)) {
                  <button class="act" (click)="openDispense(v)">💊 صرف دواء</button>
                  <button class="act" (click)="discharge(v)">✓ إنهاء الزيارة</button>
                } @else {
                  <span class="muted">أُغلقت الزيارة</span>
                }
              </footer>
            </article>
          }
        </section>
      }

      <!-- صرف دواء -->
      @if (dispenseFor(); as v) {
        <div class="overlay" (click)="dispenseFor.set(null)">
          <section class="form-card modal" (click)="$event.stopPropagation()">
            <header class="fc-head">
              <h3>صرف دواء — {{ v.patient_name }}</h3>
              <button class="x" (click)="dispenseFor.set(null)" aria-label="إغلاق">✕</button>
            </header>
            <div class="fc-body">
              <p class="fc-note">
                الكمية تُخصم من مستودع العيادة فعلياً عبر موديول المخزون، ويُسجَّل الصرف في ملف المريض.
              </p>
              <div class="fields">
                <label class="wide">
                  <span>الدواء <i>*</i></span>
                  <select [(ngModel)]="disp.medication">
                    <option value="">اختر…</option>
                    @for (m of medications(); track m.id) {
                      <option [value]="m.id">{{ m.name_ar || m.name_en }}</option>
                    }
                  </select>
                </label>
                <label>
                  <span>الكمية <i>*</i></span>
                  <input type="number" min="1" [(ngModel)]="disp.quantity" />
                </label>
              </div>
              @if (error()) { <p class="err">{{ error() }}</p> }
            </div>
            <footer class="fc-acts">
              <button class="btn ghost" (click)="dispenseFor.set(null)">إلغاء</button>
              <button class="btn primary" [disabled]="saving()" (click)="doDispense(v)">
                {{ saving() ? 'جارٍ الصرف…' : 'صرف الدواء' }}
              </button>
            </footer>
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .btn { font-family: inherit; font-size: 13px; font-weight: 700; padding: 8px 14px;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn:disabled { opacity: .55; cursor: default; }

    .chips { display: flex; gap: 6px; margin-bottom: 13px; flex-wrap: wrap; }
    .chips button { font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
      background: var(--nb-surface); border: 1px solid var(--nb-border); color: var(--nb-text-muted);
      border-radius: 20px; padding: 6px 14px; }
    .chips button.on { background: var(--nb-primary-600); border-color: var(--nb-primary-600); color: #fff; }

    .list { display: flex; flex-direction: column; gap: 10px; }
    .visit { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 14px 16px;
      display: flex; flex-direction: column; gap: 9px; }
    .visit.urgent { border-inline-start: 4px solid #DC2626; }
    .v-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .v-who { display: flex; flex-direction: column; gap: 2px; }
    .v-who strong { font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .v-meta { font-size: 11.5px; color: var(--nb-text-muted); }
    .v-notes { margin: 0; font-size: 12.5px; color: var(--nb-text-muted); }

    .badge { font-size: 11px; font-weight: 700; border-radius: 20px; padding: 3px 11px; }
    .badge.checked_in { background: #fffaf0; color: #B45309; }
    .badge.in_progress, .badge.diagnosed { background: var(--nb-primary-50); color: var(--nb-primary-700); }
    .badge.discharged, .badge.closed { background: #f0fdf4; color: #15803D; }
    .badge.cancelled { background: #fef2f2; color: #B91C1C; }

    .vitals { display: flex; gap: 8px; flex-wrap: wrap; }
    .vt { font-size: 11.5px; color: var(--nb-text-muted); background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border); border-radius: 7px; padding: 3px 9px; }
    .vt b { color: var(--nb-text); font-weight: 700; font-variant-numeric: tabular-nums; }
    .vt.hot { background: #fef2f2; border-color: #fecaca; }
    .vt.hot b { color: #B91C1C; }

    .meds { display: flex; gap: 7px; flex-wrap: wrap; align-items: center; }
    .m-lbl { font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .med { font-size: 11.5px; background: #f0fdf4; color: #15803D; border: 1px solid #bbf7d0;
      border-radius: 20px; padding: 2px 10px; }

    .v-acts { display: flex; gap: 7px; flex-wrap: wrap; padding-top: 8px;
      border-top: 1px solid var(--nb-border-soft, #f0f1f5); }
    .act { border: 1px solid var(--nb-border); background: var(--nb-surface); border-radius: 8px;
      font-family: inherit; font-size: 12px; font-weight: 700; color: var(--nb-text);
      cursor: pointer; padding: 6px 12px; }
    .act:hover { border-color: var(--nb-primary-400); color: var(--nb-primary-700); }
    .muted { font-size: 12px; color: var(--nb-text-muted); }

    .form-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); overflow: hidden; margin-bottom: 14px; }
    .form-card.modal { width: 100%; max-width: 520px; margin: 0;
      box-shadow: 0 18px 50px rgba(16,20,40,.22); }
    .fc-head { display: flex; align-items: center; justify-content: space-between; padding: 13px 18px;
      background: var(--nb-primary-50, #f5f6ff); border-bottom: 1px solid var(--nb-primary-100, #e3e6fb); }
    .fc-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-primary-800, #2a3178); }
    .x { border: none; background: none; font-size: 15px; color: var(--nb-text-muted); cursor: pointer; padding: 4px; }
    .fc-body { padding: 16px 18px; }
    .fc-note { margin: 0 0 14px; font-size: 12px; color: var(--nb-text-muted); }
    .fc-acts { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px;
      background: var(--nb-surface-raised); border-top: 1px solid var(--nb-border); }

    .overlay { position: fixed; inset: 0; background: rgba(16,20,40,.42); backdrop-filter: blur(2px);
      display: grid; place-items: center; z-index: 60; padding: 20px; }

    .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 640px) { .fields { grid-template-columns: 1fr; } }
    .fields .wide { grid-column: 1 / -1; }
    .fields label { display: grid; grid-template-rows: 18px auto; gap: 4px; }
    .fields label > span { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .fields label i { color: #DC2626; font-style: normal; }
    .fields input, .fields select { height: 38px; padding: 0 11px; font-family: inherit; font-size: 13px;
      border: 1px solid var(--nb-border); border-radius: 8px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }

    .err { margin: 12px 0 0; font-size: 12.5px; color: #B91C1C; background: #fef2f2;
      border: 1px solid #fecaca; border-radius: 8px; padding: 9px 12px; }
    .empty-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 30px; text-align: center;
      font-size: 13px; color: var(--nb-text-muted); }
  `],
})
export class ClinicVisitsComponent implements OnInit {
  private svc = inject(ClinicService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly showNew = signal(false);
  readonly filter = signal('');
  readonly dispenseFor = signal<any | null>(null);

  private visits = signal<any[]>([]);
  private vitals = signal<any[]>([]);
  private dispenses = signal<any[]>([]);
  readonly medications = signal<any[]>([]);
  readonly clinics = signal<any[]>([]);
  private people = signal<any[]>([]);

  form: any = { person: '', clinic: '', type: 'walk_in', notes: '' };
  disp: any = { medication: '', quantity: 1 };

  readonly students = computed(() => this.people().filter((p) => p.type === 'student'));
  readonly employees = computed(() => this.people().filter((p) => p.type === 'employee'));

  readonly all = computed(() =>
    this.visits().map((v) => ({ ...v, isUrgent: v.visit_type === 'emergency' })),
  );

  readonly filtered = computed(() => {
    const f = this.filter();
    return this.all()
      .filter((v) => {
        if (f === 'open') return !this.isClosed(v.status);
        if (f === 'emergency') return v.isUrgent;
        if (f === 'closed') return this.isClosed(v.status);
        return true;
      })
      .sort((a, b) => (b.isUrgent ? 1 : 0) - (a.isUrgent ? 1 : 0));
  });

  isClosed(s: string): boolean { return ['discharged', 'closed', 'cancelled'].includes(s); }
  countOpen(): number { return this.all().filter((v) => !this.isClosed(v.status)).length; }
  countUrgent(): number { return this.all().filter((v) => v.isUrgent).length; }
  countClosed(): number { return this.all().filter((v) => this.isClosed(v.status)).length; }

  vitalsOf(visitId: string): any {
    return this.vitals().find((x) => x.visit === visitId) || null;
  }
  dispensesOf(visitId: string): any[] {
    return this.dispenses().filter((d) => d.visit === visitId);
  }
  medName(id: string): string {
    const m = this.medications().find((x) => x.id === id);
    return m?.name_ar || m?.name_en || 'دواء';
  }

  statusText(s: string): string {
    return ({ checked_in: 'بانتظار الفحص', in_progress: 'قيد الفحص', diagnosed: 'شُخِّص',
      discharged: 'خرج', closed: 'مغلقة', cancelled: 'ملغاة' } as any)[s] || s;
  }
  visitTypeText(t: string): string {
    return ({ walk_in: 'زيارة عادية', emergency: 'طارئة', scheduled: 'موعد',
      follow_up: 'متابعة' } as any)[t] || t;
  }

  openNew() {
    const def = this.clinics()[0];
    this.form = { person: '', clinic: def?.id || '', type: 'walk_in', notes: '' };
    this.error.set('');
    this.showNew.set(true);
  }
  openDispense(v: any) { this.disp = { medication: '', quantity: 1 }; this.error.set(''); this.dispenseFor.set(v); }

  createVisit() {
    const f = this.form;
    if (!f.person || !f.clinic) { this.error.set('اختر المريض والعيادة.'); return; }
    const [type, id] = f.person.split(':');
    this.saving.set(true);
    this.error.set('');
    this.svc.createVisit({
      clinic: f.clinic,
      patient_user_id: id,
      patient_type: type,
      visit_type: f.type,
      status: 'checked_in',
      notes: f.notes?.trim() || null,
    }).subscribe({
      next: () => { this.saving.set(false); this.showNew.set(false); this.load(); },
      error: (e) => this.fail(e, 'تعذّر فتح الزيارة.'),
    });
  }

  doDispense(v: any) {
    if (!this.disp.medication || !this.disp.quantity) {
      this.error.set('اختر الدواء والكمية.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.svc.dispenseMedication(v.id, {
      medication_id: this.disp.medication,
      quantity: Number(this.disp.quantity),
    }).subscribe({
      next: () => { this.saving.set(false); this.dispenseFor.set(null); this.load(); },
      error: (e) => this.fail(e, 'تعذّر صرف الدواء.'),
    });
  }

  discharge(v: any) {
    this.svc.updateVisit(v.id, {
      status: 'discharged',
      discharge_time: new Date().toISOString(),
    }).subscribe({ next: () => this.load(), error: () => {} });
  }

  private fail(e: any, fallback: string) {
    this.saving.set(false);
    const d = e?.details?.error ?? e?.details;
    this.error.set(typeof d === 'string' ? d : (e?.message || fallback));
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const rows = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.results ?? []));
    this.svc.getVisits().subscribe({
      next: (d) => { this.visits.set(rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getVitals().subscribe({ next: (d) => this.vitals.set(rows(d)), error: () => {} });
    this.svc.getDispenses().subscribe({ next: (d) => this.dispenses.set(rows(d)), error: () => {} });
    this.svc.getMedications().subscribe({ next: (d) => this.medications.set(rows(d)), error: () => {} });
    this.svc.getClinics().subscribe({ next: (d) => this.clinics.set(rows(d)), error: () => {} });
    this.svc.getPeople().subscribe({ next: (d) => this.people.set(rows(d)), error: () => {} });
  }

  back() { this.router.navigateByUrl('/clinic/dashboard'); }
}
