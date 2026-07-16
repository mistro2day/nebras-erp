import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProcurementService } from '../procurement.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { printDoc, ExportColumn } from '../../../shared/export';

/**
 * ملف المورّد — عرض وتعديل في مكان واحد.
 *
 * التوقيع: ترويسة تُبرز **التقييم والحالة** (ما يهم عند قرار الترسية)، ثم سجلّ
 * تعامله الفعلي: أوامر شراؤه وعقوده — فيُقرأ المورّد بأثره لا ببياناته فقط.
 */
@Component({
  selector: 'app-procurement-vendor-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <button class="back" (click)="back()">‹ رجوع للموردين</button>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل ملف المورّد…"></nb-loading>
      } @else if (vendor(); as v) {
        <!-- الترويسة -->
        <div class="hero">
          <div class="h-main">
            <div class="ava" [attr.data-s]="v.status">{{ initial(v.name_ar || v.name_en) }}</div>
            <div class="h-info">
              <div class="h-title">
                <h1>{{ v.name_ar || v.name_en }}</h1>
                <span class="badge" [attr.data-s]="v.status">{{ statusText(v.status) }}</span>
              </div>
              <span class="en">{{ v.name_en || '—' }}</span>
              <div class="rate">
                <span class="stars">{{ stars(v.rating) }}</span>
                <span class="rnum">{{ (v.rating || 0) | number:'1.1-1' }} من 5</span>
              </div>
            </div>
          </div>
          <div class="h-actions">
            <button class="btn ghost" (click)="print(v)" title="طباعة ملف المورّد وسجل تعامله">🖨️ طباعة</button>
            @if (!editing()) {
              <button class="btn primary" (click)="startEdit(v)">✎ تعديل البيانات</button>
            }
          </div>
        </div>

        <!-- مؤشرات التعامل -->
        <div class="stats">
          <div class="stat"><span class="s-val">{{ orders().length }}</span><span class="s-lbl">أوامر شراء</span></div>
          <div class="stat"><span class="s-val">{{ contracts().length }}</span><span class="s-lbl">عقود</span></div>
          <div class="stat"><span class="s-val">{{ fmt(totalAwarded()) }}</span><span class="s-lbl">إجمالي المُرسى</span></div>
        </div>

        <!-- التعديل -->
        @if (editing()) {
          <section class="card form">
            <div class="card-head"><h3>تعديل بيانات المورّد</h3></div>
            <div class="grid">
              <label>
                <span class="lbl">التصنيف</span>
                <select [(ngModel)]="form.category">
                  @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name_ar || c.name_en }}</option> }
                </select>
              </label>
              <label>
                <span class="lbl">الاسم (عربي) <b class="req">*</b></span>
                <input [(ngModel)]="form.name_ar" />
              </label>
              <label>
                <span class="lbl">الاسم (إنجليزي)</span>
                <input [(ngModel)]="form.name_en" />
              </label>
              <label>
                <span class="lbl">الرقم الضريبي</span>
                <input [(ngModel)]="form.tax_number" placeholder="بدون" />
              </label>
              <label>
                <span class="lbl">السجل التجاري</span>
                <input [(ngModel)]="form.cr_number" placeholder="بدون" />
              </label>
              <label>
                <span class="lbl">الحالة</span>
                <select [(ngModel)]="form.status">
                  <option value="pending">تحت التأهيل</option>
                  <option value="approved">معتمد ونشط</option>
                  <option value="suspended">موقوف مؤقتاً</option>
                  <option value="blacklisted">قائمة سوداء</option>
                </select>
              </label>
            </div>
            @if (form.status === 'blacklisted') {
              <div class="warn">⚠︎ المورّد في القائمة السوداء لن يُقبل عرضه ولا تصحّ الترسية عليه.</div>
            }
            <div class="foot">
              <button class="btn ghost" (click)="editing.set(false)">إلغاء</button>
              <button class="btn primary" [disabled]="saving()" (click)="save()">
                {{ saving() ? 'جارٍ الحفظ…' : 'حفظ التعديل' }}
              </button>
            </div>
          </section>
        } @else {
          <section class="card">
            <div class="card-head"><h3>البيانات النظامية</h3></div>
            <div class="kv"><span>التصنيف</span><b>{{ categoryName(v.category) }}</b></div>
            <div class="kv"><span>الرقم الضريبي</span><b>{{ v.tax_number || '—' }}</b></div>
            <div class="kv"><span>السجل التجاري</span><b>{{ v.cr_number || '—' }}</b></div>
          </section>
        }

        <!-- بيانات الاتصال -->
        <section class="card">
          <div class="card-head row-head">
            <h3>بيانات الاتصال</h3>
            @if (!addingContact()) {
              <button class="link-btn" (click)="startAddContact()">＋ إضافة جهة اتصال</button>
            }
          </div>

          @if (addingContact()) {
            <div class="contact-form">
              <div class="cf-grid">
                <label>
                  <span class="lbl">الاسم <b class="req">*</b></span>
                  <input [(ngModel)]="cForm.name" placeholder="اسم المسؤول" />
                </label>
                <label>
                  <span class="lbl">المسمى الوظيفي</span>
                  <input [(ngModel)]="cForm.job_title" placeholder="بدون" />
                </label>
                <label>
                  <span class="lbl">رقم الجوال</span>
                  <input [(ngModel)]="cForm.phone" placeholder="بدون" />
                </label>
                <label>
                  <span class="lbl">البريد الإلكتروني</span>
                  <input type="email" [(ngModel)]="cForm.email" placeholder="بدون" />
                </label>
              </div>
              <div class="cf-foot">
                <button class="btn ghost" (click)="addingContact.set(false)">إلغاء</button>
                <button class="btn primary" [disabled]="savingContact()" (click)="saveContact()">
                  {{ savingContact() ? 'جارٍ الحفظ…' : (cForm.id ? 'حفظ التعديل' : 'إضافة') }}
                </button>
              </div>
            </div>
          }

          @if (contacts().length) {
            <div class="row ct head">
              <span>الاسم</span><span>المسمى</span><span>الجوال</span><span>البريد</span><span class="ta-end">إجراء</span>
            </div>
            @for (ct of contacts(); track ct.id) {
              <div class="row ct">
                <span class="strong">{{ ct.name }}</span>
                <span class="muted">{{ ct.job_title || '—' }}</span>
                <span class="mono">
                  @if (ct.phone) { <a class="c-link" [href]="'tel:' + ct.phone">{{ ct.phone }}</a> } @else { — }
                </span>
                <span class="mail">
                  @if (ct.email) { <a class="c-link" [href]="'mailto:' + ct.email">{{ ct.email }}</a> } @else { — }
                </span>
                <span class="ta-end ct-acts">
                  <button class="mini" (click)="startEditContact(ct)">تعديل</button>
                  <button class="mini danger" (click)="removeContact(ct)">حذف</button>
                </span>
              </div>
            }
          } @else if (!addingContact()) {
            <div class="empty">لا توجد جهات اتصال — أضف رقم الجوال والبريد للتواصل مع المورّد.</div>
          }
        </section>

        <!-- سجل التعامل -->
        <section class="card">
          <div class="card-head"><h3>أوامر الشراء</h3></div>
          @if (orders().length) {
            <div class="row head"><span>رقم الأمر</span><span>التاريخ</span><span class="ta-end">القيمة</span><span class="ta-end">الحالة</span></div>
            @for (o of orders(); track o.id) {
              <div class="row">
                <span class="mono">{{ o.po_number }}</span>
                <span class="muted">{{ o.date }}</span>
                <span class="ta-end strong">{{ fmt(o.total_amount) }}</span>
                <span class="ta-end"><span class="badge" [attr.data-s]="o.status">{{ poStatus(o.status) }}</span></span>
              </div>
            }
          } @else { <div class="empty">لا توجد أوامر شراء لهذا المورّد.</div> }
        </section>

        <section class="card">
          <div class="card-head"><h3>العقود</h3></div>
          @if (contracts().length) {
            <div class="row c head"><span>رقم العقد</span><span>العنوان</span><span>ينتهي</span><span class="ta-end">القيمة</span></div>
            @for (c of contracts(); track c.id) {
              <div class="row c">
                <span class="mono">{{ c.contract_number }}</span>
                <span>{{ c.title || '—' }}</span>
                <span class="muted">{{ c.end_date }}</span>
                <span class="ta-end strong">{{ fmt(c.contract_value) }}</span>
              </div>
            }
          } @else { <div class="empty">لا توجد عقود مع هذا المورّد.</div> }
        </section>
      } @else {
        <div class="empty">تعذّر تحميل ملف المورّد.</div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .back { background: none; border: none; color: var(--nb-primary-600); font-family: inherit; font-weight: 700;
      font-size: 13.5px; cursor: pointer; padding: 4px 0 12px; }

    .hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px;
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 20px; margin-bottom: 14px; }
    .h-main { display: flex; align-items: center; gap: 16px; }
    .ava { width: 62px; height: 62px; border-radius: 18px; flex: none; display: grid; place-items: center;
      font-size: 26px; font-weight: 800; background: var(--nb-primary-50); color: var(--nb-primary-700); }
    .ava[data-s="blacklisted"] { background: #fee2e2; color: #991b1b; }
    .ava[data-s="approved"] { background: #dcfce7; color: #166534; }
    .h-title { display: flex; align-items: center; gap: 10px; }
    .h-title h1 { margin: 0; font-size: 21px; font-weight: 800; color: var(--nb-text); }
    .en { font-size: 12.5px; color: var(--nb-text-muted); direction: ltr; display: block; }
    .rate { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
    .stars { color: var(--nb-warning); font-size: 14px; letter-spacing: 2px; }
    .rnum { font-size: 12px; font-weight: 700; color: var(--nb-text-muted); }

    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 14px; }
    @media (max-width: 720px) { .stats { grid-template-columns: 1fr; } }
    .stat { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 14px 16px; display: flex; flex-direction: column; gap: 2px; }
    .s-val { font-size: 21px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .s-lbl { font-size: 12px; color: var(--nb-text-muted); }

    .card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      overflow: hidden; margin-bottom: 14px; }
    .card-head { padding: 14px 16px 10px; }
    .card-head h3 { margin: 0; font-size: 14px; font-weight: 800; color: var(--nb-text); }
    .form { padding: 0 16px 16px; }

    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    @media (max-width: 820px) { .grid { grid-template-columns: 1fr; } }
    label { display: grid; grid-template-rows: 18px auto; gap: 6px; }
    .lbl { font-size: 12.5px; font-weight: 700; color: var(--nb-text); line-height: 18px; }
    .req { color: var(--nb-danger); }
    input, select { font-family: inherit; font-size: 13px; height: 38px; padding: 0 11px; width: 100%;
      box-sizing: border-box; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); }
    input:focus, select:focus { outline: none; border-color: var(--nb-primary-400); box-shadow: 0 0 0 3px rgba(63,81,181,0.12); }
    .warn { margin-top: 14px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b;
      border-radius: var(--nb-radius); padding: 9px 12px; font-size: 12.5px; font-weight: 600; }
    .foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;
      padding-top: 14px; border-top: 1px solid var(--nb-border-soft); }

    .kv { display: flex; justify-content: space-between; padding: 11px 16px; font-size: 13.5px;
      border-top: 1px solid var(--nb-border-soft); }
    .kv span { color: var(--nb-text-muted); } .kv b { color: var(--nb-text); font-weight: 700; }

    .row { display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; gap: 8px; align-items: center;
      padding: 10px 16px; font-size: 13px; border-top: 1px solid var(--nb-border-soft); }
    .row.c { grid-template-columns: 1.2fr 1.6fr 1fr 1fr; }
    .row.ct { grid-template-columns: 1.3fr 1fr 1.1fr 1.6fr 0.9fr; }

    /* جهات الاتصال */
    .row-head { display: flex; align-items: center; justify-content: space-between; }
    .link-btn { background: none; border: none; font-family: inherit; font-size: 12px; font-weight: 800;
      color: var(--nb-primary-600); cursor: pointer; padding: 0; }
    .link-btn:hover { text-decoration: underline; }
    .contact-form { padding: 4px 16px 16px; border-top: 1px solid var(--nb-border-soft); }
    .cf-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding-top: 12px; }
    @media (max-width: 900px) { .cf-grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 560px) { .cf-grid { grid-template-columns: 1fr; } }
    .cf-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
    .c-link { color: var(--nb-primary-700); text-decoration: none; }
    .c-link:hover { text-decoration: underline; }
    .mail { direction: ltr; text-align: end; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ct-acts { display: flex; justify-content: flex-end; gap: 6px; }
    .mini { border: 1px solid var(--nb-border); background: var(--nb-surface); border-radius: 7px;
      padding: 4px 9px; font-family: inherit; font-size: 11px; font-weight: 700; color: var(--nb-text); cursor: pointer; }
    .mini.danger { color: var(--nb-danger); border-color: #fecaca; }
    .row.head { background: var(--nb-surface-raised); font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .ta-end { text-align: end; } .mono { font-variant-numeric: tabular-nums; font-weight: 600; }
    .muted { color: var(--nb-text-muted); } .strong { font-weight: 700; }

    .badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px;
      background: var(--nb-surface-raised); color: var(--nb-text-muted); }
    .badge[data-s="approved"] { background: #dcfce7; color: #166534; }
    .badge[data-s="pending"], .badge[data-s="draft"] { background: #fef3c7; color: #92400e; }
    .badge[data-s="blacklisted"], .badge[data-s="cancelled"] { background: #fee2e2; color: #991b1b; }
    .badge[data-s="completed"], .badge[data-s="issued"] { background: #e0f2fe; color: #075985; }

    .btn { height: 38px; padding: 0 18px; font-family: inherit; font-size: 13px; font-weight: 700;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn:disabled { opacity: .6; }
    .empty { padding: 26px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
  `]
})
export class ProcurementVendorDetailComponent implements OnInit {
  private svc = inject(ProcurementService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notify = inject(NotificationService);

  readonly vendor = signal<any | null>(null);
  readonly categories = signal<any[]>([]);
  readonly orders = signal<any[]>([]);
  readonly contracts = signal<any[]>([]);
  readonly loading = signal(true);
  readonly editing = signal(false);
  readonly saving = signal(false);

  form: any = {};
  private id = '';

  // جهات الاتصال (الجوال والبريد)
  readonly contacts = signal<any[]>([]);
  readonly addingContact = signal(false);
  readonly savingContact = signal(false);
  cForm: any = {};

  loadContacts() {
    this.svc.getVendorContacts().subscribe({
      next: (d: any) => this.contacts.set(this.pick(d).filter((c: any) => String(c.vendor) === this.id)),
      error: () => {},
    });
  }

  startAddContact() { this.cForm = { name: '', job_title: '', phone: '', email: '' }; this.addingContact.set(true); }

  startEditContact(ct: any) {
    this.cForm = { id: ct.id, name: ct.name, job_title: ct.job_title, phone: ct.phone, email: ct.email };
    this.addingContact.set(true);
  }

  saveContact() {
    if (!this.cForm.name?.trim()) { this.notify.error('أدخل اسم جهة الاتصال.'); return; }
    if (!this.cForm.phone?.trim() && !this.cForm.email?.trim()) {
      this.notify.error('أدخل رقم الجوال أو البريد الإلكتروني على الأقل.');
      return;
    }
    const payload = {
      vendor: this.id,
      name: this.cForm.name.trim(),
      job_title: (this.cForm.job_title || '').trim() || null,
      phone: (this.cForm.phone || '').trim() || null,
      email: (this.cForm.email || '').trim() || null,
    };
    this.savingContact.set(true);
    const req = this.cForm.id
      ? this.svc.updateVendorContact(this.cForm.id, payload)
      : this.svc.createVendorContact(payload);
    req.subscribe({
      next: () => {
        this.savingContact.set(false); this.addingContact.set(false);
        this.notify.success(this.cForm.id ? 'تم حفظ جهة الاتصال.' : 'تمت إضافة جهة الاتصال.');
        this.loadContacts();
      },
      error: (e) => {
        this.savingContact.set(false);
        this.notify.error(e?.details?.error || e?.details?.detail || e?.message || 'تعذّر حفظ جهة الاتصال.');
      },
    });
  }

  removeContact(ct: any) {
    this.svc.deleteVendorContact(ct.id).subscribe({
      next: () => { this.notify.success('تم حذف جهة الاتصال.'); this.loadContacts(); },
      error: () => this.notify.error('تعذّر حذف جهة الاتصال.'),
    });
  }

  readonly totalAwarded = computed(() =>
    this.orders().reduce((s, o) => s + (Number(o.total_amount) || 0), 0));

  private pick(d: any): any[] { return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []); }

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.load();
    this.svc.getVendorCategories().subscribe({
      next: (d: any) => this.categories.set(this.pick(d)), error: () => {},
    });
    this.loadContacts();
    // سجل تعامله الفعلي
    this.svc.getPurchaseOrders({ page_size: 200 }).subscribe({
      next: (d: any) => this.orders.set(this.pick(d).filter((o: any) => String(o.vendor) === this.id)),
      error: () => {},
    });
    this.svc.getContracts().subscribe({
      next: (d: any) => this.contracts.set(this.pick(d).filter((c: any) => String(c.vendor) === this.id)),
      error: () => {},
    });
  }

  load() {
    this.loading.set(true);
    this.svc.getVendor(this.id).subscribe({
      next: (res: any) => { this.vendor.set(res?.data ?? res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  startEdit(v: any) {
    this.form = {
      category: v.category, name_ar: v.name_ar, name_en: v.name_en,
      tax_number: v.tax_number, cr_number: v.cr_number, status: v.status,
    };
    this.editing.set(true);
  }

  save() {
    if (!this.form.name_ar?.trim()) { this.notify.error('أدخل اسم المورّد.'); return; }
    this.saving.set(true);
    this.svc.updateVendor(this.id, {
      ...this.form,
      tax_number: (this.form.tax_number || '').trim() || null,
      cr_number: (this.form.cr_number || '').trim() || null,
    }).subscribe({
      next: () => {
        this.saving.set(false); this.editing.set(false);
        this.notify.success('تم حفظ بيانات المورّد.');
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.error(e?.details?.error || e?.details?.detail || e?.message || 'تعذّر حفظ البيانات.');
      },
    });
  }

  /** طباعة ملف المورّد — يُطبع سجل أوامر شرائه فهو جوهر تعامله. */
  print(v: any): void {
    const cols: ExportColumn[] = [
      { key: 'po_number', label: 'رقم الأمر' },
      { key: 'date', label: 'التاريخ' },
      { key: 'total_amount', label: 'القيمة', align: 'end', map: (o) => Number(o.total_amount) || 0 },
      { key: 'status', label: 'الحالة', map: (o) => this.poStatus(o.status) },
      { key: 'vendor_invoice_number', label: 'فاتورة المورّد', map: (o) => o.vendor_invoice_number || '—' },
    ];
    const contact = this.contacts()[0];
    const contactLine = contact
      ? ` · جهة الاتصال: ${contact.name}${contact.phone ? ' — ' + contact.phone : ''}`
      : '';
    printDoc(
      {
        title: `ملف المورّد — ${v.name_ar || v.name_en}`,
        subtitle: `التصنيف: ${this.categoryName(v.category)} · الحالة: ${this.statusText(v.status)} · `
          + `التقييم: ${Number(v.rating || 0).toFixed(1)}/5 · الرقم الضريبي: ${v.tax_number || 'بدون'} · `
          + `أوامر الشراء: ${this.orders().length} · إجمالي المُرسى: ${this.fmt(this.totalAwarded())}${contactLine}`,
        filename: `مورّد-${v.name_ar || v.name_en}`,
      },
      cols,
      this.orders()
    );
  }

  back() { this.router.navigate(['/procurement/vendors']); }
  fmt(v: any) { return (Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
  initial(n: string) { return (n || '؟').trim().charAt(0); }
  stars(r: any) { const n = Math.round(Number(r) || 0); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); }
  categoryName(id: any) {
    return this.categories().find(c => String(c.id) === String(id))?.name_ar || '—';
  }
  statusText(s: string) {
    return ({ approved: 'معتمد ونشط', pending: 'تحت التأهيل', blacklisted: 'قائمة سوداء', suspended: 'موقوف' } as any)[s] || s;
  }
  poStatus(s: string) {
    return ({ draft: 'مسودة', approved: 'معتمد', issued: 'مُرسل', completed: 'مكتمل', cancelled: 'ملغى' } as any)[s] || s;
  }
}
