import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="error-page" dir="rtl">
      <section>
        <p class="code">{{ code() }}</p>
        <h1>{{ title() }}</h1>
        <p>{{ message() }}</p>
        <a routerLink="/dashboard">العودة للوحة التحكم</a>
      </section>
    </main>
  `,
  styles: [
    `
      .error-page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: var(--nb-bg);
        font-family: var(--nb-font-family);
      }

      section {
        width: min(560px, 100%);
        padding: 32px;
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card);
        background: var(--nb-surface);
        box-shadow: var(--nb-shadow-card);
        text-align: center;
      }

      section h1 { font-size: 18px; font-weight: 700; color: var(--nb-text); margin: 0 0 8px; }
      section > p { color: var(--nb-text-secondary); font-size: 13px; margin: 0; }

      .code {
        color: var(--nb-primary-600);
        font-size: 48px;
        font-weight: 800;
        margin: 0 0 8px;
      }

      a {
        display: inline-flex;
        margin-top: 20px;
        color: var(--nb-primary-600);
        font-weight: 700;
        text-decoration: none;
        font-size: 13px;
      }
    `,
  ],
})
export class ErrorPageComponent {
  code = input('404');
  title = input('الصفحة غير موجودة');
  message = input('تعذر العثور على الصفحة المطلوبة.');
}