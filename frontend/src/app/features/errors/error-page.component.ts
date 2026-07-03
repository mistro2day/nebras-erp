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
        background: var(--background-color);
      }

      section {
        width: min(560px, 100%);
        padding: 32px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--surface-color);
        text-align: center;
      }

      .code {
        color: var(--primary-color);
        font-size: 48px;
        font-weight: 800;
        margin: 0 0 8px;
      }

      a {
        display: inline-flex;
        margin-top: 20px;
        color: var(--primary-color);
        font-weight: 700;
        text-decoration: none;
      }
    `,
  ],
})
export class ErrorPageComponent {
  code = input('404');
  title = input('الصفحة غير موجودة');
  message = input('تعذر العثور على الصفحة المطلوبة.');
}