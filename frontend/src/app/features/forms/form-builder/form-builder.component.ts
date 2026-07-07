import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

/**
 * منصة مطور النماذج والاستمارات الذكية — لغة تصميم Nebras OS.
 * المنطق كما هو — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-form-builder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="منصة مطور النماذج والاستمارات الذكية"
        subtitle="تصميم وبناء النماذج الإلكترونية ديناميكياً وتحديد قواعد التحقق والموافقة بصرياً."
      >
        <button class="nb-btn-secondary">معاينة النموذج</button>
        <button class="nb-btn-primary">حفظ المخطط (Schema)</button>
      </nb-page-header>

      <div class="builder-grid">
        <nb-panel title="لوحة العناصر">
          <div class="palette">
            @for (field of paletteFields(); track field.label) {
              <div class="palette-item">{{ field.label }}</div>
            }
          </div>
        </nb-panel>

        <nb-panel title="مساحة التصميم (Canvas)">
          @if (canvasFields().length === 0) {
            <div class="canvas-empty">اسحب الحقول من لوحة العناصر وأفلتها هنا للبدء بالتصميم.</div>
          } @else {
            <div class="canvas-fields">
              @for (field of canvasFields(); track field.name) {
                <div class="canvas-field">
                  <span class="cf-label">{{ field.label }}</span>
                  <input [placeholder]="field.placeholder" disabled />
                </div>
              }
            </div>
          }
        </nb-panel>

        <nb-panel title="مفتش الخصائص">
          <p class="inspector-hint">اختر حقولاً من لوحة مساحة التصميم لتعديل خصائصها، شروط العرض، وقواعد التحقق.</p>
        </nb-panel>
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .builder-grid { display: grid; grid-template-columns: 280px 1fr 300px; gap: 16px; }
    @media (max-width: 1100px) { .builder-grid { grid-template-columns: 1fr; } }
    .palette { display: flex; flex-direction: column; gap: 8px; }
    .palette-item { padding: 10px 14px; background: var(--nb-surface-raised); border-radius: var(--nb-radius); cursor: pointer; border: 1px dashed var(--nb-border); font-weight: 500; color: var(--nb-text-secondary); font-size: 13px; }
    .palette-item:hover { border-color: var(--nb-primary-400); }
    .canvas-empty { border: 2px dashed var(--nb-border); border-radius: var(--nb-radius); padding: 40px; text-align: center; color: var(--nb-text-muted); font-size: 13px; }
    .canvas-fields { display: flex; flex-direction: column; gap: 12px; }
    .canvas-field { padding: 14px; border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); background: var(--nb-surface-raised); }
    .cf-label { font-weight: 600; color: var(--nb-text); display: block; margin-bottom: 8px; font-size: 13px; }
    .canvas-field input { width: 100%; height: 34px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; background: var(--nb-surface); color: var(--nb-text-muted); }
    .inspector-hint { color: var(--nb-text-muted); font-size: 13px; margin: 0; line-height: 1.6; }
  `]
})
export class FormBuilderComponent {
  paletteFields = signal([
    { label: 'حقل نصي قصير', icon: 'text_fields', type: 'text' },
    { label: 'حقل نصي طويل', icon: 'notes', type: 'textarea' },
    { label: 'حقل أرقام', icon: 'tag', type: 'number' },
    { label: 'تحديد تاريخ', icon: 'calendar_today', type: 'date' },
    { label: 'قائمة خيارات', icon: 'arrow_drop_down_circle', type: 'select' }
  ]);

  canvasFields = signal([
    { label: 'الاسم الكامل للطالب', name: 'student_name', placeholder: 'أدخل الاسم الثلاثي للطالب...', type: 'text' },
    { label: 'تاريخ الميلاد', name: 'birth_date', placeholder: '', type: 'date' }
  ]);
}
