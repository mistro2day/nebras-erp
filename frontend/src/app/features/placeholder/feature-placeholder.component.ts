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
        flex: 1;
        display: grid;
        min-height: 320px;
        place-items: center;
        margin: 20px;
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card);
        background: var(--nb-surface);
        box-shadow: var(--nb-shadow-card);
        padding: 32px;
        font-family: var(--nb-font-family);
      }

      div {
        max-width: 620px;
        text-align: center;
      }

      p {
        color: var(--nb-primary-600);
        font-weight: 700;
        font-size: 12px;
        letter-spacing: 0.5px;
        margin: 0 0 8px;
      }

      h1 {
        margin: 0 0 12px;
        font-size: 20px;
        font-weight: 700;
        color: var(--nb-text);
      }

      span {
        color: var(--nb-text-secondary);
        font-size: 13px;
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