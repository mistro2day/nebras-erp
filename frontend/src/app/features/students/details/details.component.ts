import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { StudentsService } from '../students.service';
import {
  ConfirmDialogComponent, ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';

/**
 * تفاصيل الطالب — ملف عامل كامل (Nebras OS).
 * شريط إجراءات حقيقي (تعديل/تخريج/انسحاب/أرشفة) + تبويبات: نظرة عامة، طبي، أولياء أمور،
 * تسجيلات أكاديمية، عناوين، وثائق، خط زمني، ملخص مالي. كل البيانات من نقاط نهاية حقيقية.
 */
@Component({
  selector: 'app-student-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, MatTabsModule, MatDialogModule],
  template: `
    @if (student(); as s) {
      <div class="page" dir="rtl">
        <div class="nb-card summary-card">
          <div class="summary-content">
            <div class="avatar-section">
              <div class="avatar-placeholder">{{ (s.profile?.arabic_name || '؟').charAt(0) }}</div>
              <div class="basic-info">
                <h2>{{ s.profile?.arabic_name || 'ملف طالب' }}</h2>
                <p class="eng-name">{{ s.profile?.english_name }}</p>
                <div class="badge-row">
                  <span [class]="statusBadge(s.status)">{{ statusText(s.status) }}</span>
                  <span class="num-badge">رقم الطالب: {{ s.student_number }}</span>
                </div>
              </div>
            </div>
            <div class="quick-stats">
              <div class="stat-item"><span class="label">الجنسية</span><span class="val">{{ s.profile?.nationality || '—' }}</span></div>
              <div class="stat-item"><span class="label">الجنس</span><span class="val">{{ s.profile?.gender === 'male' ? 'ذكر' : s.profile?.gender === 'female' ? 'أنثى' : '—' }}</span></div>
              <div class="stat-item"><span class="label">تاريخ الميلاد</span><span class="val">{{ s.profile?.date_of_birth || '—' }}</span></div>
            </div>
          </div>

          <div class="action-bar">
            <button class="nb-btn-ghost" (click)="back()">عودة للقائمة</button>
            <div class="spacer"></div>
            <button class="nb-btn-secondary" [routerLink]="['/students/edit', s.id]">تعديل الملف</button>
            <button class="nb-btn-secondary" (click)="graduate(s)" [disabled]="s.status === 'graduated'">تخريج</button>
            <button class="nb-btn-secondary" (click)="withdraw(s)" [disabled]="s.status === 'withdrawn'">تسجيل انسحاب</button>
            <button class="nb-btn-danger" (click)="archive(s)">أرشفة</button>
          </div>

          <!-- روابط بين الوحدات: ربط ملف الطالب بالشؤون الأكاديمية والقبول والمالية وسندات القبض -->
          <div class="xlinks">
            <span class="xlinks-label">روابط سريعة:</span>
            <a class="xlink" routerLink="/academics">الشؤون الأكاديمية</a>
            <a class="xlink" routerLink="/admissions/applications">القبول والتسجيل</a>
            <a class="xlink" routerLink="/student-finance/accounts" [queryParams]="{ q: s.id }">الحساب المالي</a>
            <a class="xlink" routerLink="/student-finance/outstanding">الأرصدة المستحقة</a>
            <a class="xlink" routerLink="/student-finance/receipts">سندات القبض</a>
          </div>
        </div>

        <div class="nb-card tabs-card">
          <mat-tab-group class="nb-tabs">
            <!-- نظرة عامة -->
            <mat-tab label="نظرة عامة">
              <div class="tab-content">
                <h3>البيانات الشخصية والوطنية</h3>
                <div class="info-grid">
                  <div class="info-item"><strong>الهوية الوطنية / الإقامة:</strong> {{ s.profile?.national_id || 'غير متوفر' }}</div>
                  <div class="info-item"><strong>رقم جواز السفر:</strong> {{ s.profile?.passport || 'غير متوفر' }}</div>
                  <div class="info-item"><strong>الديانة:</strong> {{ s.profile?.religion || 'غير متوفر' }}</div>
                  <div class="info-item"><strong>فصيلة الدم:</strong> {{ s.profile?.blood_group || 'غير متوفر' }}</div>
                  <div class="info-item"><strong>اللغات المفضلة:</strong> {{ s.profile?.languages?.join(', ') || 'العربية' }}</div>
                </div>
                <hr class="nb-divider" />
                <h3>الاحتياجات والبرامج الخاصة</h3>
                <div class="info-grid">
                  <div class="info-item"><strong>ذوي الاحتياجات الخاصة:</strong> {{ s.profile?.special_needs || 'لا يوجد' }}</div>
                  <div class="info-item"><strong>صعوبات التعلم:</strong> {{ s.profile?.learning_difficulty || 'لا يوجد' }}</div>
                  <div class="info-item"><strong>برامج الموهوبين:</strong> {{ s.profile?.talented_program || 'لا يوجد' }}</div>
                </div>
              </div>
            </mat-tab>

            <!-- الملف الطبي -->
            <mat-tab label="الملف الطبي">
              <div class="tab-content">
                <h3>الوضع الصحي والاحتياطات الطبية</h3>
                @if (s.medical_profile; as m) {
                  <div class="info-grid">
                    <div class="info-item"><strong>الحساسية:</strong> {{ m.allergies?.join(', ') || 'لا يوجد' }}</div>
                    <div class="info-item"><strong>الأمراض المزمنة:</strong> {{ m.chronic_diseases?.join(', ') || 'لا يوجد' }}</div>
                    <div class="info-item"><strong>الأدوية الموصوفة:</strong> {{ m.medication?.join(', ') || 'لا يوجد' }}</div>
                    <div class="info-item"><strong>طبيب الأسرة المفضل:</strong> {{ m.doctor || 'غير متوفر' }}</div>
                  </div>
                }
              </div>
            </mat-tab>

            <!-- أولياء الأمور -->
            <mat-tab label="أولياء الأمور">
              <div class="tab-content">
                <div class="family-list">
                  @for (member of s.family_relations; track $index) {
                    <div class="info-item family-item">
                      <div class="member-header">
                        <h4>{{ member.full_name }}</h4>
                        <span class="nb-badge-ai">{{ member.relationship }}</span>
                      </div>
                      <p><strong>الهاتف:</strong> {{ member.phone || '—' }}</p>
                      <p><strong>البريد الإلكتروني:</strong> {{ member.email || 'غير متوفر' }}</p>
                      <p><strong>الهوية الوطنية:</strong> {{ member.national_id || 'غير متوفر' }}</p>
                    </div>
                  }
                  @if (!s.family_relations || s.family_relations.length === 0) {
                    <div class="no-data">لم يتم تسجيل أفراد العائلة بعد.</div>
                  }
                </div>
              </div>
            </mat-tab>

            <!-- التسجيلات الأكاديمية -->
            <mat-tab label="التسجيلات الأكاديمية">
              <div class="tab-content">
                <div class="tbl">
                  <div class="tbl-head en"><span>نوع التسجيل</span><span>الحالة</span><span>تاريخ التسجيل</span></div>
                  @for (en of enrollments(s); track $index) {
                    <div class="tbl-row en">
                      <span>{{ en.enrollment_type || 'تسجيل' }}</span>
                      <span><span [class]="statusBadge(en.status)">{{ statusText(en.status) }}</span></span>
                      <span>{{ (en.enrollment_date || en.created_at) | date:'yyyy-MM-dd' }}</span>
                    </div>
                  }
                  @if (enrollments(s).length === 0) {
                    <div class="tbl-empty">لا توجد تسجيلات أكاديمية بعد.</div>
                  }
                </div>
              </div>
            </mat-tab>

            <!-- العناوين -->
            <mat-tab label="العناوين">
              <div class="tab-content">
                <div class="info-grid">
                  @for (addr of addresses(s); track $index) {
                    <div class="info-item">
                      <strong>{{ addr.address_type || 'عنوان' }}</strong>
                      {{ addr.city || '' }} {{ addr.district ? '· ' + addr.district : '' }} {{ addr.street || '' }}
                      {{ (!addr.city && !addr.street) ? 'غير مكتمل' : '' }}
                    </div>
                  }
                  @if (addresses(s).length === 0) {
                    <div class="no-data">لا توجد عناوين مسجلة.</div>
                  }
                </div>
              </div>
            </mat-tab>

            <!-- الوثائق -->
            <mat-tab label="الوثائق">
              <div class="tab-content">
                <div class="tbl">
                  <div class="tbl-head doc"><span>الوثيقة</span><span>الملف</span><span>التاريخ</span></div>
                  @for (d of documents(); track $index) {
                    <div class="tbl-row doc">
                      <span class="strong">{{ d.title }}</span>
                      <span>{{ d.comments || '—' }}</span>
                      <span>{{ d.date | date:'yyyy-MM-dd' }}</span>
                    </div>
                  }
                  @if (documents().length === 0) {
                    <div class="tbl-empty">لا توجد وثائق مرفوعة. <!-- مصدرها أحداث الخط الزمني (document_upload) --></div>
                  }
                </div>
              </div>
            </mat-tab>

            <!-- الخط الزمني -->
            <mat-tab label="الخط الزمني">
              <div class="tab-content">
                <div class="timeline">
                  @for (event of timeline(); track $index) {
                    <div class="timeline-event">
                      <div class="event-dot"></div>
                      <div class="event-details">
                        <div class="event-header">
                          <h4>{{ event.title }}</h4>
                          <span class="event-date">{{ event.date | date:'medium' }}</span>
                        </div>
                        <p class="event-comment">{{ event.comments }}</p>
                      </div>
                    </div>
                  }
                  @if (timeline().length === 0) {
                    <div class="no-data">لا يوجد سجل أنشطة للطالب حالياً.</div>
                  }
                </div>
              </div>
            </mat-tab>

            <!-- الملخص المالي -->
            <mat-tab label="الملخص المالي">
              <div class="tab-content">
                <!-- TODO Connect Backend: لا توجد نقطة نهاية لملخص مالي على مستوى الطالب.
                     يُربط لاحقاً بحساب الطالب المالي في وحدة Student Finance. -->
                <div class="empty-box">
                  <p>يُدار الوضع المالي للطالب في وحدة حسابات الطلاب المالية.</p>
                  <div class="fin-links">
                    <a class="nb-btn-secondary" routerLink="/student-finance/accounts" [queryParams]="{ q: s.id }">الحساب المالي للطالب</a>
                    <a class="nb-btn-secondary" routerLink="/student-finance/invoices">الفواتير</a>
                    <a class="nb-btn-secondary" routerLink="/student-finance/receipts">سندات القبض</a>
                  </div>
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </div>
      </div>
    } @else {
      <div class="page" dir="rtl"><div class="loading">جارٍ تحميل بيانات الطالب…</div></div>
    }
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .summary-card { padding: 20px; margin-bottom: 16px; }
    .summary-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 24px; }
    .avatar-section { display: flex; align-items: center; gap: 16px; }
    .avatar-placeholder { width: 64px; height: 64px; border-radius: 50%; background: var(--nb-primary-50); color: var(--nb-primary-600); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; }
    .basic-info h2 { font-size: 20px; font-weight: 700; margin: 0; color: var(--nb-text); }
    .eng-name { color: var(--nb-text-muted); margin: 2px 0 10px; font-size: 13px; }
    .badge-row { display: flex; gap: 8px; align-items: center; }
    .num-badge { background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); padding: 2px 8px; border-radius: var(--nb-radius-sm); font-size: 12px; color: var(--nb-text-secondary); }
    .quick-stats { display: flex; gap: 28px; }
    .stat-item { display: flex; flex-direction: column; align-items: flex-end; }
    .stat-item .label { font-size: 11px; color: var(--nb-text-muted); }
    .stat-item .val { font-size: 15px; font-weight: 600; color: var(--nb-text); margin-top: 2px; }
    .action-bar { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--nb-border-soft); flex-wrap: wrap; }
    .action-bar .spacer { flex: 1; }
    .xlinks { display: flex; align-items: center; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
    .xlinks-label { font-size: 12px; font-weight: 700; color: var(--nb-text-muted); }
    .xlink { font-size: 12px; font-weight: 600; color: var(--nb-primary-600); text-decoration: none; background: var(--nb-primary-50); border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius-pill); padding: 4px 12px; }
    .xlink:hover { background: var(--nb-primary-100); }
    .fin-links { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
    .tabs-card { padding: 8px 12px 16px; }
    .tab-content { padding: 16px 4px; }
    .tab-content h3 { color: var(--nb-primary-600); font-size: 14px; margin: 0 0 14px; font-weight: 700; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .info-item { background: var(--nb-surface-raised); padding: 12px; border-radius: var(--nb-radius); border: 1px solid var(--nb-border-soft); font-size: 13px; color: var(--nb-text); }
    .info-item strong { color: var(--nb-text-muted); display: block; margin-bottom: 4px; font-weight: 600; }
    .info-item p { margin: 6px 0; }
    .info-item p strong { display: inline; margin: 0; }
    .nb-divider { border: 0; border-top: 1px solid var(--nb-border); margin: 20px 0; }
    .family-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; }
    .member-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 8px; }
    .member-header h4 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .tbl { display: flex; flex-direction: column; border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); overflow: hidden; }
    .tbl-head, .tbl-row { display: grid; gap: 8px; padding: 9px 16px; align-items: center; }
    .tbl-head.en, .tbl-row.en { grid-template-columns: 1fr 1fr 1fr; }
    .tbl-head.doc, .tbl-row.doc { grid-template-columns: 1.4fr 1.4fr 1fr; }
    .tbl-head { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text); }
    .tbl-row:last-child { border-bottom: none; }
    .strong { font-weight: 600; }
    .tbl-empty { padding: 24px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
    .timeline { display: flex; flex-direction: column; gap: 12px; position: relative; padding-right: 20px; }
    .timeline::before { content: ''; position: absolute; right: 5px; top: 4px; bottom: 4px; width: 2px; background: var(--nb-border); }
    .timeline-event { display: flex; gap: 16px; position: relative; }
    .event-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--nb-primary-600); position: absolute; right: -19px; top: 14px; border: 2px solid var(--nb-surface); }
    .event-details { flex: 1; background: var(--nb-surface-raised); padding: 12px 14px; border-radius: var(--nb-radius); border: 1px solid var(--nb-border-soft); }
    .event-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .event-header h4 { margin: 0; font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .event-date { font-size: 11px; color: var(--nb-text-muted); }
    .event-comment { margin: 0; color: var(--nb-text-secondary); font-size: 12px; }
    .no-data { text-align: center; padding: 28px; color: var(--nb-text-muted); font-size: 13px; }
    .empty-box { text-align: center; padding: 32px 16px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
    .empty-box p { font-size: 13px; color: var(--nb-text-muted); margin: 0; }
    .loading { text-align: center; padding: 40px; color: var(--nb-text-muted); font-size: 13px; }
  `]
})
export class StudentDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private studentsService = inject(StudentsService);
  private dialog = inject(MatDialog);

  student = this.studentsService.selectedStudent;
  timeline = signal<any[]>([]);

  readonly documents = computed(() => this.timeline().filter((e) => e.type === 'document_upload'));

  private id = '';

  enrollments(s: any): any[] { return s?.enrollments ?? []; }
  addresses(s: any): any[] { return s?.addresses ?? []; }

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      active: 'nb-badge-success', registered: 'nb-badge-info', suspended: 'nb-badge-danger',
      graduated: 'nb-badge-ai', withdrawn: 'nb-badge-neutral', archived: 'nb-badge-neutral',
    };
    return map[status] || 'nb-badge-neutral';
  }

  statusText(status: string): string {
    const map: Record<string, string> = {
      active: 'نشط', registered: 'مسجل', suspended: 'موقوف',
      graduated: 'متخرج', withdrawn: 'منسحب', archived: 'مؤرشف',
    };
    return map[status] || status || '—';
  }

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.id = params['id'];
      if (this.id) this.reload();
    });
  }

  private reload(): void {
    this.studentsService.getStudentById(this.id).subscribe();
    this.studentsService.getTimeline(this.id).subscribe((res) => {
      if (res && res.success) this.timeline.set(res.data || []);
    });
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private confirm(data: ConfirmDialogData): Promise<boolean> {
    return new Promise((resolve) =>
      this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((ok) => resolve(!!ok))
    );
  }

  async graduate(s: any): Promise<void> {
    const ok = await this.confirm({ title: 'تخريج الطالب', message: `سيُنقل «${s.profile?.arabic_name || s.id}» إلى سجل الخريجين بتاريخ اليوم.`, color: 'primary' });
    if (ok) this.studentsService.graduateStudent(this.id, { graduation_date: this.today() }).subscribe({ next: () => this.reload() });
  }

  async withdraw(s: any): Promise<void> {
    const ok = await this.confirm({ title: 'تسجيل انسحاب', message: `سيتم تسجيل انسحاب «${s.profile?.arabic_name || s.id}» بتاريخ اليوم.`, color: 'warn' });
    if (ok) this.studentsService.withdrawStudent(this.id, { withdrawal_date: this.today(), reason: 'انسحاب مسجّل من ملف الطالب' }).subscribe({ next: () => this.reload() });
  }

  async archive(s: any): Promise<void> {
    const ok = await this.confirm({ title: 'أرشفة الطالب', message: `سيتم أرشفة ملف «${s.profile?.arabic_name || s.id}». يمكن استعادته لاحقاً.`, color: 'warn' });
    if (ok) this.studentsService.archiveStudent(this.id, 'أرشفة يدوية من ملف الطالب').subscribe({ next: () => this.router.navigate(['/students/list']) });
  }

  back(): void {
    this.router.navigate(['/students/list']);
  }
}
