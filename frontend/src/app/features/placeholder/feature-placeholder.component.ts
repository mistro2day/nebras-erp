import { Component, input } from '@angular/core';

@Component({
  selector: 'app-feature-placeholder',
  standalone: true,
  template: `
    <section class="placeholder" dir="rtl">
      <div>
        <p>{{ eyebrow() }}</p>
        <h1>{{ title() }}</h1>
        <span>{{ description() }}</span>
      </div>
    </section>
  `,
  styles: [
    `
      .placeholder {
        display: grid;
        min-height: 320px;
        place-items: center;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--surface-color);
        padding: 32px;
      }

      div {
        max-width: 620px;
        text-align: center;
      }

      p {
        color: var(--secondary-color);
        font-weight: 800;
        margin: 0 0 8px;
      }

      h1 {
        margin: 0 0 12px;
        font-size: 28px;
      }

      span {
        color: color-mix(in srgb, var(--text-color) 72%, transparent);
        line-height: 1.8;
      }
    `,
  ],
})
export class FeaturePlaceholderComponent {
  eyebrow = input('Nebras ERP');
  title = input('الموديول قيد الربط');
  description = input('تم تجهيز المسار والواجهة الأساسية، وسيتم ربط شاشة الموديول عند توفر مكونه.');
}