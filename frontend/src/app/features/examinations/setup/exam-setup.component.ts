import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExaminationsService } from '../examinations.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { ExamCategory, ExamType, ExamRoom } from '../examinations.types';

/** الإعداد والمرجعيات — فئات وأنواع الامتحانات وقاعات اللجان. */
@Component({
  selector: 'app-exam-setup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الإعداد والمرجعيات" subtitle="البيانات المرجعية التي تُبنى عليها الامتحانات: الفئات، الأنواع، وقاعات اللجان.">
        <button class="btn ghost" (click)="back()">رجوع للمركز</button>
      </nb-page-header>

      <div class="cols">
        <!-- الفئات -->
        <nb-panel title="فئات الامتحانات" subtitle="تحريري، عملي، شفهي…">
          <div class="mini-form">
            <input class="fld" placeholder="الاسم" [(ngModel)]="catForm.name" />
            <input class="fld sm" placeholder="الرمز" [(ngModel)]="catForm.code" />
            <button class="btn primary sm" (click)="addCat()">إضافة</button>
          </div>
          <div class="chips">
            @for (c of categories(); track c.id) { <span class="chip">{{ c.name }} <em>{{ c.code }}</em></span> }
            @if (!categories().length) { <div class="empty">لا فئات بعد.</div> }
          </div>
        </nb-panel>

        <!-- الأنواع -->
        <nb-panel title="أنواع الامتحانات" subtitle="نصفي، نهائي، اختبار قصير…">
          <div class="mini-form">
            <input class="fld" placeholder="الاسم" [(ngModel)]="typeForm.name" />
            <input class="fld sm" placeholder="الرمز" [(ngModel)]="typeForm.code" />
            <select class="fld" [(ngModel)]="typeForm.type_class">
              @for (t of typeClasses; track t.v) { <option [value]="t.v">{{ t.t }}</option> }
            </select>
            <button class="btn primary sm" (click)="addType()">إضافة</button>
          </div>
          <div class="chips">
            @for (t of types(); track t.id) { <span class="chip">{{ t.name }} <em>{{ classLabel(t.type_class) }}</em></span> }
            @if (!types().length) { <div class="empty">لا أنواع بعد.</div> }
          </div>
        </nb-panel>
      </div>

      <!-- القاعات -->
      <nb-panel title="قاعات اللجان" subtitle="القاعات وسعتها المستخدمة في توزيع الطلاب على اللجان." class="mt">
        <div class="mini-form">
          <input class="fld" placeholder="اسم القاعة" [(ngModel)]="roomForm.name" />
          <input class="fld sm" placeholder="الرمز" [(ngModel)]="roomForm.code" />
          <input class="fld sm" type="number" placeholder="السعة" [(ngModel)]="roomForm.capacity" />
          <button class="btn primary sm" (click)="addRoom()">إضافة قاعة</button>
        </div>
        <div class="rooms">
          @for (r of rooms(); track r.id) {
            <div class="room"><span class="rn">{{ r.name }}</span><span class="rc">سعة {{ r.capacity }}</span></div>
          }
          @if (!rooms().length) { <div class="empty">لا قاعات بعد.</div> }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
    .mt { margin-top: 12px; }
    .mini-form { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .fld { height: 34px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; }
    .fld.sm { max-width: 110px; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; font-size: 12.5px; font-weight: 600;
      background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius-pill); color: var(--nb-text); }
    .chip em { font-style: normal; font-size: 11px; color: var(--nb-text-muted); }
    .rooms { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
    .room { display: flex; flex-direction: column; gap: 3px; padding: 12px 14px; border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); background: var(--nb-surface); }
    .rn { font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .rc { font-size: 11.5px; color: var(--nb-info); font-weight: 600; }
    .empty { text-align: center; padding: 14px; color: var(--nb-text-muted); font-size: 13px; width: 100%; }
    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
  `],
})
export class ExamSetupComponent implements OnInit {
  private service = inject(ExaminationsService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  categories = signal<ExamCategory[]>([]);
  types = signal<ExamType[]>([]);
  rooms = signal<ExamRoom[]>([]);

  catForm: { name: string; code: string } = { name: '', code: '' };
  typeForm: { name: string; code: string; type_class: string } = { name: '', code: '', type_class: 'midterm' };
  roomForm: { name: string; code: string; capacity: number } = { name: '', code: '', capacity: 30 };

  readonly typeClasses = [
    { v: 'midterm', t: 'نصفي' }, { v: 'final', t: 'نهائي' }, { v: 'quiz', t: 'اختبار قصير' }, { v: 'assignment', t: 'واجب' },
    { v: 'project', t: 'مشروع' }, { v: 'presentation', t: 'عرض' }, { v: 'laboratory', t: 'عملي' }, { v: 'oral', t: 'شفهي' },
    { v: 'weekly', t: 'أسبوعي' }, { v: 'monthly', t: 'شهري' }, { v: 'diagnostic', t: 'تشخيصي' }, { v: 'placement', t: 'تحديد مستوى' },
    { v: 'national', t: 'وطني' }, { v: 'custom', t: 'مخصص' },
  ];

  ngOnInit() { this.load(); }
  load() {
    this.service.getCategories().subscribe((r) => { if (r?.success) this.categories.set(r.data); });
    this.service.getTypes().subscribe((r) => { if (r?.success) this.types.set(r.data); });
    this.service.getRooms().subscribe((r) => { if (r?.success) this.rooms.set(r.data); });
  }
  classLabel(v: string): string { return this.typeClasses.find((t) => t.v === v)?.t || v; }

  addCat() {
    if (!this.catForm.name || !this.catForm.code) { this.notify.error('أدخل الاسم والرمز.'); return; }
    this.service.createCategory(this.catForm).subscribe({
      next: (r) => { if (r?.success) { this.notify.success('تمت إضافة الفئة.'); this.catForm = { name: '', code: '' }; this.load(); } }, error: () => this.notify.error('تعذر الحفظ.'),
    });
  }
  addType() {
    if (!this.typeForm.name || !this.typeForm.code) { this.notify.error('أدخل الاسم والرمز.'); return; }
    this.service.createType(this.typeForm).subscribe({
      next: (r) => { if (r?.success) { this.notify.success('تمت إضافة النوع.'); this.typeForm = { name: '', code: '', type_class: 'midterm' }; this.load(); } }, error: () => this.notify.error('تعذر الحفظ.'),
    });
  }
  addRoom() {
    if (!this.roomForm.name || !this.roomForm.code) { this.notify.error('أدخل اسم القاعة ورمزها.'); return; }
    this.service.createRoom(this.roomForm).subscribe({
      next: (r) => { if (r?.success) { this.notify.success('تمت إضافة القاعة.'); this.roomForm = { name: '', code: '', capacity: 30 }; this.load(); } }, error: () => this.notify.error('تعذر الحفظ.'),
    });
  }
  back() { this.router.navigateByUrl('/examinations/dashboard'); }
}
