import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';

type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'file' | 'section';

interface PaletteItem {
  type: FieldType;
  label: string;
  glyph: string;
  hint: string;
}

interface CanvasField {
  id: string;
  type: FieldType;
  label: string;
  name: string;
  placeholder: string;
  required: boolean;
  width: 'full' | 'half';
  options?: string[];
}

/**
 * منصة مطوّر النماذج والاستمارات الذكية — لغة تصميم نبراس.
 *
 * التوقيع البصري: مساحة عمل بثلاثة أعمدة — لوحة العناصر، ثم مساحة التصميم التي
 * تعرض النموذج كما سيراه المستخدم فعلياً (لا كمربعات مجرّدة)، ثم مفتّش الخصائص
 * الذي يعدّل الحقل المحدَّد فورياً. الإضافة والتحديد والحذف تعمل فعلياً بالإشارات.
 */
@Component({
  selector: 'app-form-builder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NbPageHeaderComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="منصة مطوّر النماذج والاستمارات الذكية"
        subtitle="بناء النماذج الإلكترونية ديناميكياً وضبط قواعد التحقق والعرض والموافقة بصرياً.">
        <button class="btn ghost" (click)="preview.set(!preview())">
          {{ preview() ? 'العودة للتصميم' : 'معاينة النموذج' }}
        </button>
        <button class="btn primary" (click)="saveSchema()">حفظ المخطّط</button>
      </nb-page-header>

      @if (saved()) {
        <div class="toast" role="status" aria-live="polite">
          حُفظ مخطّط النموذج — {{ fields().length }} حقل، {{ requiredCount() }} منها إلزامي.
        </div>
      }

      <div class="builder" [class.preview-mode]="preview()">
        <!-- لوحة العناصر -->
        @if (!preview()) {
          <aside class="col palette" aria-label="لوحة العناصر">
            <div class="col-head">لوحة العناصر</div>
            <div class="col-body">
              @for (p of palette; track p.type) {
                <button class="pal-item" (click)="addField(p)" [attr.aria-label]="'إضافة ' + p.label">
                  <span class="pal-ic" aria-hidden="true">{{ p.glyph }}</span>
                  <span class="pal-body">
                    <span class="pal-label">{{ p.label }}</span>
                    <span class="pal-hint">{{ p.hint }}</span>
                  </span>
                  <span class="pal-add" aria-hidden="true">+</span>
                </button>
              }
            </div>
          </aside>
        }

        <!-- مساحة التصميم -->
        <section class="col canvas">
          <div class="col-head">
            <span>{{ preview() ? 'معاينة النموذج' : 'مساحة التصميم' }}</span>
            <span class="head-meta">{{ fields().length }} حقل</span>
          </div>
          <div class="col-body canvas-body">
            @if (fields().length === 0) {
              <div class="canvas-empty">
                <span class="ce-ic" aria-hidden="true">▤</span>
                <strong>ابدأ ببناء نموذجك</strong>
                <p>اختر عنصراً من لوحة العناصر على اليمين لإضافته إلى النموذج.</p>
              </div>
            } @else {
              <div class="fields">
                @for (f of fields(); track f.id) {
                  <div class="field" [class.half]="f.width === 'half'"
                       [class.on]="!preview() && selectedId() === f.id"
                       (click)="!preview() && selectedId.set(f.id)">

                    @if (f.type === 'section') {
                      <h3 class="sec-title">{{ f.label }}</h3>
                    } @else {
                      <label class="f-label" [attr.for]="f.id">
                        {{ f.label }}
                        @if (f.required) { <span class="req" aria-label="حقل إلزامي">*</span> }
                      </label>

                      @switch (f.type) {
                        @case ('textarea') {
                          <textarea [id]="f.id" rows="3" [placeholder]="f.placeholder" [disabled]="!preview()"></textarea>
                        }
                        @case ('select') {
                          <select [id]="f.id" [disabled]="!preview()">
                            <option value="">— اختر —</option>
                            @for (o of f.options || []; track o) { <option [value]="o">{{ o }}</option> }
                          </select>
                        }
                        @case ('checkbox') {
                          <label class="cb"><input type="checkbox" [id]="f.id" [disabled]="!preview()" />
                            <span>{{ f.placeholder || 'أوافق' }}</span></label>
                        }
                        @case ('file') {
                          <div class="file-drop">{{ f.placeholder || 'اسحب الملف هنا أو اضغط للاختيار' }}</div>
                        }
                        @default {
                          <input [id]="f.id" [type]="inputType(f.type)"
                                 [placeholder]="f.placeholder" [disabled]="!preview()" />
                        }
                      }
                    }

                    @if (!preview()) {
                      <div class="f-tools">
                        <button class="tool" (click)="move(f.id, -1); $event.stopPropagation()"
                                [disabled]="isFirst(f.id)" aria-label="تحريك لأعلى">↑</button>
                        <button class="tool" (click)="move(f.id, 1); $event.stopPropagation()"
                                [disabled]="isLast(f.id)" aria-label="تحريك لأسفل">↓</button>
                        <button class="tool danger" (click)="remove(f.id); $event.stopPropagation()"
                                aria-label="حذف الحقل">✕</button>
                      </div>
                    }
                  </div>
                }
              </div>

              @if (preview()) {
                <div class="preview-actions">
                  <button class="btn primary" type="button">إرسال النموذج</button>
                  <button class="btn ghost" type="button">حفظ كمسودّة</button>
                </div>
              }
            }
          </div>
        </section>

        <!-- مفتّش الخصائص -->
        @if (!preview()) {
          <aside class="col inspector" aria-label="مفتّش الخصائص">
            <div class="col-head">مفتّش الخصائص</div>
            <div class="col-body">
              @if (selected(); as f) {
                <div class="insp">
                  <div class="insp-type">{{ typeLabel(f.type) }}</div>

                  <label class="fld">
                    <span>عنوان الحقل</span>
                    <input type="text" [value]="f.label" (input)="patch(f.id, { label: $any($event.target).value })" />
                  </label>

                  <label class="fld">
                    <span>الاسم البرمجي</span>
                    <input class="ltr" type="text" [value]="f.name"
                           (input)="patch(f.id, { name: $any($event.target).value })" />
                    <small>يُستخدم كمفتاح الحقل في مخطّط البيانات (JSON Schema).</small>
                  </label>

                  @if (f.type !== 'section') {
                    <label class="fld">
                      <span>النص التلميحي</span>
                      <input type="text" [value]="f.placeholder"
                             (input)="patch(f.id, { placeholder: $any($event.target).value })" />
                    </label>
                  }

                  @if (f.type === 'select') {
                    <label class="fld">
                      <span>الخيارات (سطر لكل خيار)</span>
                      <textarea rows="4" [value]="(f.options || []).join('\\n')"
                                (input)="patchOptions(f.id, $any($event.target).value)"></textarea>
                    </label>
                  }

                  <div class="fld">
                    <span>عرض الحقل</span>
                    <div class="seg" role="group">
                      <button class="seg-btn" [class.on]="f.width === 'full'"
                              (click)="patch(f.id, { width: 'full' })">كامل</button>
                      <button class="seg-btn" [class.on]="f.width === 'half'"
                              (click)="patch(f.id, { width: 'half' })">نصف</button>
                    </div>
                  </div>

                  @if (f.type !== 'section') {
                    <label class="toggle">
                      <input type="checkbox" [checked]="f.required"
                             (change)="patch(f.id, { required: $any($event.target).checked })" />
                      <span>حقل إلزامي</span>
                    </label>
                  }

                  <button class="btn danger-btn" (click)="remove(f.id)">حذف الحقل</button>
                </div>
              } @else {
                <p class="insp-hint">
                  اختر حقلاً من مساحة التصميم لتعديل عنوانه، اسمه البرمجي، شروط عرضه، وقواعد التحقق الخاصة به.
                </p>
              }
            </div>
          </aside>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; min-width: 0;
      background: var(--nb-bg); color: var(--nb-text); font-family: var(--nb-font-family); }

    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.ghost:hover { border-color: var(--nb-primary-400); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.primary:hover { filter: brightness(1.08); }
    .btn.danger-btn { width: 100%; margin-top: 4px; background: #fee2e2; color: #b91c1c; }
    .btn.danger-btn:hover { background: #fecaca; }

    .toast { background: #dcfce7; border: 1px solid #bbf7d0; color: #15803d;
      border-radius: var(--nb-radius-card); padding: 10px 14px; margin-bottom: 14px;
      font-size: 12.5px; font-weight: 600; }

    .builder { display: grid; grid-template-columns: 260px 1fr 300px; gap: 16px; align-items: start; }
    .builder.preview-mode { grid-template-columns: minmax(0, 760px); justify-content: center; }
    @media (max-width: 1180px) { .builder { grid-template-columns: 1fr; } }

    .col { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); overflow: hidden; }
    .col-head { display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 11px 14px; background: var(--nb-surface-raised);
      border-bottom: 1px solid var(--nb-border-soft);
      font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .head-meta { font-weight: 600; }
    .col-body { padding: 14px; }
    .canvas-body { min-height: 340px; }

    /* لوحة العناصر */
    .palette .col-body { display: flex; flex-direction: column; gap: 6px; }
    .pal-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px;
      background: var(--nb-surface-raised); border: 1px dashed var(--nb-border);
      border-radius: var(--nb-radius); cursor: pointer; font-family: inherit; text-align: start;
      transition: border-color .15s ease, background .15s ease; }
    .pal-item:hover { border-color: var(--nb-primary-400); border-style: solid; background: var(--nb-primary-50); }
    .pal-ic { flex-shrink: 0; width: 28px; height: 28px; border-radius: var(--nb-radius-sm);
      background: var(--nb-surface); border: 1px solid var(--nb-border);
      display: flex; align-items: center; justify-content: center; font-size: 13px; color: var(--nb-primary-600); }
    .pal-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .pal-label { font-size: 12.5px; font-weight: 600; color: var(--nb-text); }
    .pal-hint { font-size: 11px; color: var(--nb-text-muted); }
    .pal-add { font-size: 15px; font-weight: 700; color: var(--nb-text-muted); }
    .pal-item:hover .pal-add { color: var(--nb-primary-600); }

    /* مساحة التصميم */
    .canvas-empty { display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 56px 24px; text-align: center; border: 2px dashed var(--nb-border);
      border-radius: var(--nb-radius-card); }
    .ce-ic { font-size: 30px; color: var(--nb-border); }
    .canvas-empty strong { font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .canvas-empty p { margin: 0; font-size: 12.5px; color: var(--nb-text-muted); }

    .fields { display: flex; flex-wrap: wrap; gap: 10px; }
    .field { position: relative; flex: 1 1 100%; padding: 12px 14px;
      background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft);
      border-radius: var(--nb-radius); cursor: pointer; transition: border-color .15s ease, box-shadow .15s ease; }
    .field.half { flex: 1 1 calc(50% - 5px); min-width: 220px; }
    .field:hover { border-color: var(--nb-primary-400); }
    .field.on { border-color: var(--nb-primary-500); box-shadow: 0 0 0 3px rgba(48,63,159,.10); }
    .preview-mode .field { cursor: default; background: var(--nb-surface); border-color: transparent; }

    .sec-title { margin: 4px 0; font-size: 14px; font-weight: 700; color: var(--nb-text);
      padding-bottom: 8px; border-bottom: 1px solid var(--nb-border); }
    .f-label { display: block; margin-bottom: 6px; font-size: 12.5px; font-weight: 600; color: var(--nb-text); }
    .req { color: var(--nb-danger, #dc2626); margin-inline-start: 2px; }

    .field input[type='text'], .field input[type='number'], .field input[type='date'],
    .field textarea, .field select {
      width: 100%; box-sizing: border-box; min-height: 34px; padding: 7px 10px;
      font-family: inherit; font-size: 12.5px; color: var(--nb-text);
      background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius); outline: none; }
    .field input:focus, .field textarea:focus, .field select:focus {
      border-color: var(--nb-primary-400); box-shadow: 0 0 0 3px rgba(48,63,159,.10); }
    .field input:disabled, .field textarea:disabled, .field select:disabled {
      color: var(--nb-text-muted); cursor: default; }
    .cb { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--nb-text-secondary); }
    .file-drop { padding: 16px; text-align: center; font-size: 12px; color: var(--nb-text-muted);
      border: 1px dashed var(--nb-border); border-radius: var(--nb-radius); background: var(--nb-surface); }

    .f-tools { position: absolute; top: 6px; inset-inline-end: 6px; display: flex; gap: 2px;
      opacity: 0; transition: opacity .15s ease; }
    .field:hover .f-tools, .field.on .f-tools { opacity: 1; }
    .tool { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-sm);
      cursor: pointer; font-size: 11px; color: var(--nb-text-secondary); font-family: inherit; }
    .tool:hover:not(:disabled) { border-color: var(--nb-primary-400); color: var(--nb-primary-600); }
    .tool.danger:hover { border-color: #fca5a5; color: #b91c1c; background: #fef2f2; }
    .tool:disabled { opacity: .35; cursor: not-allowed; }

    .preview-actions { display: flex; gap: 8px; margin-top: 18px; padding-top: 14px;
      border-top: 1px solid var(--nb-border-soft); }

    /* المفتّش */
    .insp { display: flex; flex-direction: column; gap: 12px; }
    .insp-type { align-self: flex-start; font-size: 11px; font-weight: 700; padding: 3px 10px;
      border-radius: 999px; background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .fld { display: flex; flex-direction: column; gap: 5px; }
    .fld > span { font-size: 11.5px; font-weight: 600; color: var(--nb-text-muted); }
    .fld small { font-size: 11px; color: var(--nb-text-muted); line-height: 1.5; }
    .fld input, .fld textarea { width: 100%; box-sizing: border-box; padding: 7px 10px;
      font-family: inherit; font-size: 12.5px; color: var(--nb-text);
      background: var(--nb-surface-raised); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius); outline: none; resize: vertical; }
    .fld input:focus, .fld textarea:focus { border-color: var(--nb-primary-400);
      box-shadow: 0 0 0 3px rgba(48,63,159,.10); }
    .fld input.ltr { direction: ltr; text-align: left; font-family: ui-monospace, monospace; font-size: 12px; }

    .seg { display: flex; gap: 4px; }
    .seg-btn { flex: 1; height: 30px; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
      background: var(--nb-surface-raised); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius); color: var(--nb-text-secondary); }
    .seg-btn.on { background: var(--nb-primary-50); border-color: var(--nb-primary-400); color: var(--nb-primary-600); }

    .toggle { display: flex; align-items: center; gap: 8px; font-size: 12.5px;
      font-weight: 600; color: var(--nb-text); cursor: pointer; }
    .insp-hint { margin: 0; font-size: 12.5px; line-height: 1.75; color: var(--nb-text-muted); }

    @media (max-width: 700px) { .page { padding: 14px; } .field.half { flex: 1 1 100%; } }
  `]
})
export class FormBuilderComponent {
  readonly palette: PaletteItem[] = [
    { type: 'text', label: 'حقل نصي قصير', glyph: 'أب', hint: 'اسم، عنوان، رقم هوية' },
    { type: 'textarea', label: 'حقل نصي طويل', glyph: '¶', hint: 'ملاحظات ووصف مفصّل' },
    { type: 'number', label: 'حقل أرقام', glyph: '#', hint: 'مبالغ، أعمار، كميات' },
    { type: 'date', label: 'تحديد تاريخ', glyph: '▤', hint: 'تاريخ ميلاد أو التحاق' },
    { type: 'select', label: 'قائمة خيارات', glyph: '▾', hint: 'اختيار واحد من قائمة' },
    { type: 'checkbox', label: 'مربع تأكيد', glyph: '☑', hint: 'موافقة أو إقرار' },
    { type: 'file', label: 'رفع مرفق', glyph: '⇧', hint: 'وثائق ومستندات داعمة' },
    { type: 'section', label: 'فاصل قسم', glyph: '—', hint: 'تجميع الحقول المترابطة' },
  ];

  private seq = 0;

  fields = signal<CanvasField[]>([
    { id: 'f_1', type: 'section', label: 'بيانات الطالب الأساسية', name: 'student_section', placeholder: '', required: false, width: 'full' },
    { id: 'f_2', type: 'text', label: 'الاسم الكامل للطالب', name: 'student_name', placeholder: 'أدخل الاسم الثلاثي…', required: true, width: 'full' },
    { id: 'f_3', type: 'date', label: 'تاريخ الميلاد', name: 'birth_date', placeholder: '', required: true, width: 'half' },
    { id: 'f_4', type: 'select', label: 'الصف المطلوب', name: 'grade_level', placeholder: '', required: true, width: 'half', options: ['الأول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي'] },
  ]);

  selectedId = signal<string | null>('f_2');
  preview = signal(false);
  saved = signal(false);

  selected = computed(() => this.fields().find((f) => f.id === this.selectedId()) ?? null);
  requiredCount = computed(() => this.fields().filter((f) => f.required).length);

  addField(p: PaletteItem): void {
    const id = `f_new_${++this.seq}`;
    const field: CanvasField = {
      id,
      type: p.type,
      label: p.label,
      name: `${p.type}_${this.seq}`,
      placeholder: p.type === 'section' ? '' : 'أدخل القيمة…',
      required: false,
      width: 'full',
      options: p.type === 'select' ? ['الخيار الأول', 'الخيار الثاني'] : undefined,
    };
    this.fields.update((list) => [...list, field]);
    this.selectedId.set(id);
    this.saved.set(false);
  }

  patch(id: string, changes: Partial<CanvasField>): void {
    this.fields.update((list) => list.map((f) => (f.id === id ? { ...f, ...changes } : f)));
    this.saved.set(false);
  }

  patchOptions(id: string, raw: string): void {
    this.patch(id, { options: raw.split('\n').map((o) => o.trim()).filter(Boolean) });
  }

  remove(id: string): void {
    this.fields.update((list) => list.filter((f) => f.id !== id));
    if (this.selectedId() === id) this.selectedId.set(null);
    this.saved.set(false);
  }

  move(id: string, delta: number): void {
    this.fields.update((list) => {
      const i = list.findIndex((f) => f.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    this.saved.set(false);
  }

  isFirst(id: string): boolean {
    return this.fields()[0]?.id === id;
  }

  isLast(id: string): boolean {
    const list = this.fields();
    return list[list.length - 1]?.id === id;
  }

  inputType(t: FieldType): string {
    return t === 'number' ? 'number' : t === 'date' ? 'date' : 'text';
  }

  typeLabel(t: FieldType): string {
    return this.palette.find((p) => p.type === t)?.label ?? t;
  }

  saveSchema(): void {
    this.saved.set(true);
  }
}
