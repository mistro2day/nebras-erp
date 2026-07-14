import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParentService } from './parent.service';

/**
 * التواصل مع المعلمين والإدارة + إعلانات المدرسة لولي الأمر.
 */
@Component({
  selector: 'app-parent-messages',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="wrap" dir="rtl">
      <h1>التواصل</h1>

      <div class="tabs">
        <button [class.on]="tab()==='contact'" (click)="tab.set('contact')">مراسلة المدرسة</button>
        <button [class.on]="tab()==='news'" (click)="showNews()">الإعلانات</button>
      </div>

      @if (tab() === 'contact') {
        @if (sent()) {
          <div class="sent">
            <div class="tick">✓</div>
            <strong>تم إرسال رسالتك</strong>
            <p>ستتلقى الرد من المدرسة قريباً.</p>
            <button class="ghost" (click)="reset()">إرسال رسالة أخرى</button>
          </div>
        } @else {
          <form class="form" (ngSubmit)="send()">
            <label>إلى
              <select [(ngModel)]="audience" name="audience">
                <option value="admin">إدارة المدرسة</option>
                <option value="teacher">معلّم</option>
              </select>
            </label>
            <label>الموضوع <span>*</span>
              <input [(ngModel)]="subject" name="subject" required placeholder="عنوان الرسالة" />
            </label>
            <label>الرسالة <span>*</span>
              <textarea [(ngModel)]="body" name="body" rows="5" required placeholder="اكتب رسالتك هنا…"></textarea>
            </label>
            @if (error()) { <div class="err">{{ error() }}</div> }
            <button class="primary" type="submit" [disabled]="sending()">
              {{ sending() ? 'جارٍ الإرسال…' : 'إرسال' }}
            </button>
          </form>
        }
      } @else {
        @if (loadingNews()) {
          <div class="sk" *ngFor="let i of [1,2]"></div>
        } @else if (news().length === 0) {
          <div class="empty"><span>📣</span><p>لا توجد إعلانات حالياً.</p></div>
        } @else {
          @for (a of news(); track a.id) {
            <article class="ann">
              <h3>{{ a.title }}</h3>
              <p>{{ a.content }}</p>
              <span class="date">{{ a.publish_date | date:'y/MM/dd' }}</span>
            </article>
          }
        }
      }
    </section>
  `,
  styles: [`
    :host { --p:#3F51B5; --accent:#F59E0B; --danger:#dc2626; --ok:#16a34a;
      --muted:#6b7280; --line:#e5e7eb; font-family:'Cairo','Segoe UI',sans-serif; }
    h1 { margin:6px 0 14px; font-size:22px; font-weight:800; color:#1f2937; }
    .tabs { display:flex; gap:6px; background:#eef0f6; padding:5px; border-radius:14px; margin-bottom:16px; }
    .tabs button { flex:1; border:none; background:none; padding:9px; border-radius:10px;
      font-family:inherit; font-size:13.5px; font-weight:700; color:var(--muted); cursor:pointer; }
    .tabs button.on { background:#fff; color:var(--p); box-shadow:0 2px 8px rgba(48,63,181,0.1); }
    .form { display:flex; flex-direction:column; gap:14px; }
    label { display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:700; color:#374151; }
    label span { color:var(--danger); }
    input, textarea, select { font-family:inherit; font-size:14px; padding:11px 12px; border:1px solid var(--line);
      border-radius:12px; background:#fff; color:#1f2937; }
    input:focus, textarea:focus, select:focus { outline:none; border-color:var(--p); box-shadow:0 0 0 3px rgba(63,81,181,0.12); }
    .err { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; border-radius:10px; padding:10px 12px; font-size:13px; }
    .primary { background:linear-gradient(135deg,#3F51B5,#303F9F); color:#fff; border:none;
      padding:14px; border-radius:14px; font-family:inherit; font-size:15px; font-weight:800; cursor:pointer; }
    .primary:disabled { opacity:.6; }
    .sent { text-align:center; padding:36px 20px; }
    .tick { width:64px; height:64px; border-radius:50%; background:var(--ok); color:#fff; font-size:32px;
      display:flex; align-items:center; justify-content:center; margin:0 auto 14px; }
    .sent strong { display:block; font-size:17px; color:#1f2937; margin-bottom:6px; }
    .sent p { margin:0 0 16px; color:var(--muted); font-size:14px; }
    .ghost { background:none; border:none; color:var(--p); font-family:inherit; font-weight:700; cursor:pointer; }
    .ann { background:#fff; border:1px solid var(--line); border-radius:16px; padding:16px; margin-bottom:12px; }
    .ann h3 { margin:0 0 6px; font-size:15px; font-weight:800; color:#1f2937; }
    .ann p { margin:0 0 8px; font-size:13.5px; color:#4b5563; line-height:1.8; }
    .ann .date { font-size:11.5px; color:var(--muted); }
    .empty { text-align:center; padding:44px 20px; color:var(--muted); }
    .empty span { font-size:42px; display:block; margin-bottom:8px; }
    .empty p { margin:0; font-size:13.5px; }
    .sk { height:90px; border-radius:16px; margin-bottom:12px;
      background:linear-gradient(90deg,#eef0f6,#f7f8fc,#eef0f6); background-size:200% 100%; animation:sh 1.2s infinite; }
    @keyframes sh { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  `]
})
export class ParentMessagesComponent implements OnInit {
  private parent = inject(ParentService);

  readonly tab = signal<'contact' | 'news'>('contact');
  readonly news = signal<any[]>([]);
  readonly loadingNews = signal(false);
  readonly sending = signal(false);
  readonly sent = signal(false);
  readonly error = signal('');

  audience = 'admin';
  subject = '';
  body = '';
  private newsLoaded = false;

  ngOnInit(): void {}

  showNews(): void {
    this.tab.set('news');
    if (!this.newsLoaded) { this.newsLoaded = true; this.loadNews(); }
  }

  loadNews(): void {
    this.loadingNews.set(true);
    this.parent.listAnnouncements().subscribe({
      next: (res) => { this.news.set(res?.results || res?.data || res || []); this.loadingNews.set(false); },
      error: () => this.loadingNews.set(false),
    });
  }

  send(): void {
    this.error.set('');
    if (!this.subject.trim() || !this.body.trim()) { this.error.set('أدخل الموضوع ونص الرسالة.'); return; }
    this.sending.set(true);
    this.parent.contact({ audience: this.audience, subject: this.subject.trim(), body: this.body.trim() }).subscribe({
      next: () => { this.sending.set(false); this.sent.set(true); },
      error: (err) => { this.sending.set(false); this.error.set(err?.error?.detail || 'تعذّر الإرسال. حاول مجدداً.'); },
    });
  }

  reset(): void { this.subject = ''; this.body = ''; this.sent.set(false); }
}
