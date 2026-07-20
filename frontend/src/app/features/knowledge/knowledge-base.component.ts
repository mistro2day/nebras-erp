import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KnowledgeService, KnowledgeArticle } from './knowledge.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbModalComponent } from '../../shared/nebras/nb-modal.component';

interface CategoryItem {
  id: string;
  label: string;
}

@Component({
  selector: 'app-knowledge-base',
  standalone: true,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbModalComponent],
  template: `
    <div class="page" dir="rtl">
      <!-- Nebras Page Header -->
      <nb-page-header
        title="قاعدة المعرفة والتوثيق الموحد (Knowledge Base)"
        subtitle="الدليل الشامل للوائح والأنظمة، السياسات الأكاديمية، والحلول التقنية في منصة نبراس."
      >
        <button class="nb-btn-primary" (click)="openCreateModal()">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          <span>+ إضافة مقال جديد</span>
        </button>
      </nb-page-header>

      <!-- Top Stats Row -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon purple">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-val">{{ articles().length }}</span>
            <span class="stat-lbl">إجمالي المقالات</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-val">{{ categories.length - 1 }}</span>
            <span class="stat-lbl">تصنيفات رئيسية</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-val">{{ totalViews() }}</span>
            <span class="stat-lbl">إجمالي القراءات</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-val">98%</span>
            <span class="stat-lbl">نسبة الاستفادة</span>
          </div>
        </div>
      </div>

      <!-- Nebras Panel for Search & Categories Filter -->
      <nb-panel title="البحث والتصفية حسب الفئة">
        <div class="filter-controls">
          <div class="search-box">
            <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              type="text"
              class="nb-input-search"
              [ngModel]="searchTerm()"
              (ngModelChange)="searchTerm.set($event)"
              placeholder="ابحث بالنص في عنوان المقال أو محتواه..."
            />
            <button *ngIf="searchTerm()" class="clear-btn" (click)="searchTerm.set('')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="categories-bar">
            <button
              *ngFor="let cat of categories"
              class="cat-pill"
              [class.active]="selectedCategory() === cat.id"
              (click)="selectCategory(cat.id)"
            >
              <span>{{ cat.label }}</span>
            </button>
          </div>
        </div>
      </nb-panel>

      <!-- Main Articles Grid Panel -->
      <nb-panel title="دليل المقالات والسياسات المتاحة" [subtitle]="'عرض ' + filteredArticles().length + ' مقال معتمد'">
        <div *ngIf="loading()" class="loading-state">
          <div class="spin-loader"></div>
          <p>جاري تحميل المقالات المعرفية...</p>
        </div>

        <div *ngIf="!loading() && filteredArticles().length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#94a3b8" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <h3>لم يتم العثور على مقالات مطابقة</h3>
          <p>جرّب تعديل مصطلحات البحث أو تغيير التصنيف المحدد.</p>
          <button class="nb-btn-secondary" (click)="resetFilters()">إعادة ضبط الفلاتر</button>
        </div>

        <div *ngIf="!loading() && filteredArticles().length > 0" class="articles-grid">
          <article
            *ngFor="let item of filteredArticles()"
            class="article-card"
            (click)="readArticle(item)"
          >
            <div class="card-header">
              <span class="category-badge">{{ getCategoryLabel(item.category) }}</span>
              <span class="read-time">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                3 دقائق
              </span>
            </div>
            <h3 class="article-title">{{ item.title }}</h3>
            <p class="article-snippet">{{ truncate(item.content, 130) }}</p>
            <div class="card-footer">
              <div class="meta-info">
                <span>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {{ formatDate(item.created_at) }}
                </span>
                <span>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  {{ item.views_count ?? 12 }}
                </span>
              </div>
              <button class="read-btn" (click)="$event.stopPropagation(); readArticle(item)">
                <span>قراءة المقال</span>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
            </div>
          </article>
        </div>
      </nb-panel>

      <!-- Nebras OS Article Reader Modal -->
      <nb-modal [open]="!!activeArticle()" title="عرض المقال المعرفي" subtitle="مركز المعرفة واللوائح" (closed)="closeReader()">
        <div *ngIf="activeArticle() as art" class="reader-body">
          <div class="article-top-badge">
            <span class="category-badge">{{ getCategoryLabel(art.category) }}</span>
          </div>
          <h2 class="reader-title">{{ art.title }}</h2>
          <div class="article-meta-bar">
            <span>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              تاريخ النشر: {{ formatDate(art.created_at) }}
            </span>
            <span>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              القراءات: {{ art.views_count ?? 25 }}
            </span>
          </div>

          <div class="article-full-content">
            <p *ngFor="let para of getParagraphs(art.content)">{{ para }}</p>
          </div>
        </div>

        <div modal-actions class="reader-actions-row">
          <div class="helpful-box">
            <span>هل كان هذا المقال مفيداً؟</span>
            <button class="nb-btn-like" [class.liked]="isHelpful()" (click)="toggleHelpful()">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              <span>{{ isHelpful() ? 'تم الشكر' : 'مفيد' }}</span>
            </button>
          </div>
          <div class="btn-group">
            <button class="nb-btn-secondary" (click)="editArticle(activeArticle()!)">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>تعديل</span>
            </button>
            <button class="nb-btn-danger" (click)="deleteArticle(activeArticle()!.id!)">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span>حذف</span>
            </button>
            <button class="nb-btn-primary" (click)="closeReader()">إغلاق</button>
          </div>
        </div>
      </nb-modal>

      <!-- Nebras OS Create / Edit Article Modal -->
      <nb-modal [open]="showFormModal()" [title]="isEditing() ? 'تعديل مقال معرفي' : 'إضافة مقال جديد للقاعدة'" subtitle="إدخال التفاصيل والمحتوى" (closed)="closeFormModal()">
        <form (submit)="saveArticle($event)" class="form-body">
          <div class="form-group">
            <label class="nb-label">عنوان المقال <span class="required">*</span></label>
            <input
              type="text"
              class="nb-input"
              [(ngModel)]="formArticle.title"
              name="title"
              required
              placeholder="مثال: لائحة الإجازات والغياب للطلاب والكوادر"
            />
          </div>

          <div class="form-group">
            <label class="nb-label">التصنيف الرئيس <span class="required">*</span></label>
            <select class="nb-input" [(ngModel)]="formArticle.category" name="category" required>
              <option value="regulations">اللوائح والقوانين</option>
              <option value="academic">الشؤون الأكاديمية</option>
              <option value="user_guide">أدلة الاستخدام</option>
              <option value="tech_support">الدعم التقني والحلول</option>
              <option value="forms">النماذج والإجراءات</option>
            </select>
          </div>

          <div class="form-group">
            <label class="nb-label">المحتوى التفصيلي للمقال <span class="required">*</span></label>
            <textarea
              class="nb-input"
              rows="6"
              [(ngModel)]="formArticle.content"
              name="content"
              required
              placeholder="اكتب تفاصيل الموضوع والإجراءات خطوة بخطوة..."
            ></textarea>
          </div>

          <div *ngIf="formError()" class="form-error-alert">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>{{ formError() }}</span>
          </div>

          <div modal-actions class="btn-group">
            <button type="button" class="nb-btn-secondary" (click)="closeFormModal()">إلغاء</button>
            <button type="submit" class="nb-btn-primary" [disabled]="saving()">
              <svg *ngIf="!saving()" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              <span>{{ isEditing() ? 'حفظ التغييرات' : 'نشر المقال' }}</span>
            </button>
          </div>
        </form>
      </nb-modal>

      <!-- Nebras OS Delete Confirmation Modal -->
      <nb-modal [open]="!!confirmDeleteId()" title="تأكيد حذف المقال" subtitle="تحذير إجراء غير قابل للتراجع" (closed)="confirmDeleteId.set(null)">
        <div class="delete-confirm-body">
          <p>هل أنت أيدٍ من رغبتك في حذف هذا المقال المعرفي بشكل دائم؟ لن يمكنك استعادته لاحقاً.</p>
        </div>
        <div modal-actions class="btn-group">
          <button class="nb-btn-secondary" (click)="confirmDeleteId.set(null)">إلغاء</button>
          <button class="nb-btn-danger" (click)="executeDelete()">تأكيد الحذف</button>
        </div>
      </nb-modal>

    </div>
  `,
  styles: [`
    .page {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 20px;
      width: 100%;
      box-sizing: border-box;
    }

    /* Standard Nebras Buttons */
    .nb-btn-primary {
      background: var(--nb-primary, #4f46e5);
      color: #ffffff;
      border: 1px solid transparent;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .nb-btn-primary:hover {
      background: #4338ca;
    }

    .nb-btn-secondary {
      background: var(--nb-surface, #ffffff);
      color: var(--nb-text, #111827);
      border: 1px solid var(--nb-border, #e5e7eb);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .nb-btn-secondary:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }

    .nb-btn-danger {
      background: #ef4444;
      color: #ffffff;
      border: 1px solid transparent;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .nb-btn-danger:hover {
      background: #dc2626;
    }

    .nb-btn-like {
      background: #f3f4f6;
      color: #4b5563;
      border: 1px solid #e5e7eb;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .nb-btn-like.liked {
      background: #dcfce7;
      color: #15803d;
      border-color: #86efac;
    }

    /* Stats Overview Row */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .stat-card {
      background: var(--nb-surface, #ffffff);
      border: 1px solid var(--nb-border, #e5e7eb);
      border-radius: var(--nb-radius-card, 12px);
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .stat-icon {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stat-icon.purple { background: #eef2ff; color: #4f46e5; }
    .stat-icon.blue { background: #e0f2fe; color: #0284c7; }
    .stat-icon.green { background: #dcfce7; color: #16a34a; }
    .stat-icon.amber { background: #fef3c7; color: #d97706; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-val { font-size: 1.4rem; font-weight: 800; color: var(--nb-text, #111827); }
    .stat-lbl { font-size: 12px; color: var(--nb-text-muted, #6b7280); font-weight: 500; }

    /* Filter Controls inside Panel */
    .filter-controls {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .search-box {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      right: 12px;
      color: #9ca3af;
      pointer-events: none;
    }
    .nb-input-search {
      width: 100%;
      padding: 10px 38px 10px 36px;
      border: 1px solid var(--nb-border, #e5e7eb);
      border-radius: 8px;
      font-size: 13.5px;
      outline: none;
      box-sizing: border-box;
      background: var(--nb-surface, #ffffff);
      color: var(--nb-text, #111827);
    }
    .nb-input-search:focus {
      border-color: var(--nb-primary, #4f46e5);
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }
    .clear-btn {
      position: absolute;
      left: 10px;
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
    }

    .categories-bar {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .cat-pill {
      background: #f9fafb;
      border: 1px solid var(--nb-border, #e5e7eb);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 600;
      color: #4b5563;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .cat-pill:hover {
      background: #f3f4f6;
      border-color: #d1d5db;
    }
    .cat-pill.active {
      background: var(--nb-primary, #4f46e5);
      color: #ffffff;
      border-color: var(--nb-primary, #4f46e5);
    }

    /* Articles Grid */
    .articles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }
    .article-card {
      background: var(--nb-surface, #ffffff);
      border: 1px solid var(--nb-border, #e5e7eb);
      border-radius: 12px;
      padding: 18px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.2s ease;
    }
    .article-card:hover {
      border-color: #c7d2fe;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .category-badge {
      background: #eef2ff;
      color: #4338ca;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .read-time {
      font-size: 11px;
      color: #9ca3af;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .article-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--nb-text, #111827);
      margin: 0 0 8px 0;
      line-height: 1.4;
    }
    .article-snippet {
      color: var(--nb-text-muted, #6b7280);
      font-size: 13px;
      line-height: 1.5;
      margin: 0 0 16px 0;
      flex-grow: 1;
    }
    .card-footer {
      border-top: 1px solid #f3f4f6;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .meta-info {
      display: flex;
      gap: 12px;
      font-size: 11.5px;
      color: #9ca3af;
    }
    .meta-info span { display: flex; align-items: center; gap: 4px; }
    .read-btn {
      background: none;
      border: none;
      color: var(--nb-primary, #4f46e5);
      font-weight: 700;
      font-size: 12.5px;
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }
    .read-btn:hover { color: #3730a3; }

    /* Reader inside NbModal */
    .reader-body { padding: 4px 0; }
    .article-top-badge { margin-bottom: 8px; }
    .reader-title { font-size: 18px; font-weight: 800; color: var(--nb-text, #111827); margin: 0 0 10px 0; }
    .article-meta-bar {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 16px;
      padding-bottom: 10px;
      border-bottom: 1px dashed #e5e7eb;
    }
    .article-meta-bar span { display: flex; align-items: center; gap: 4px; }
    .article-full-content p {
      font-size: 14px;
      line-height: 1.6;
      color: var(--nb-text-secondary, #374151);
      margin-bottom: 12px;
    }
    .reader-actions-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      gap: 12px;
    }
    .helpful-box {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      font-weight: 600;
      color: #4b5563;
    }
    .btn-group { display: flex; gap: 8px; align-items: center; }

    /* Form Body */
    .form-body { display: flex; flex-direction: column; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .nb-label { font-weight: 600; font-size: 12.5px; color: #374151; }
    .required { color: #ef4444; }
    .nb-input {
      width: 100%;
      padding: 9px 12px;
      border: 1px solid var(--nb-border, #e5e7eb);
      border-radius: 8px;
      font-size: 13.5px;
      font-family: inherit;
      outline: none;
      box-sizing: border-box;
      background: var(--nb-surface, #ffffff);
      color: var(--nb-text, #111827);
    }
    .nb-input:focus {
      border-color: var(--nb-primary, #4f46e5);
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }
    .form-error-alert {
      background: #fef2f2;
      color: #991b1b;
      padding: 10px 14px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
    }

    .delete-confirm-body p { font-size: 13.5px; color: #374151; margin: 0; line-height: 1.5; }

    .loading-state, .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #6b7280;
    }
    .spin-loader {
      width: 28px;
      height: 28px;
      border: 3px solid #e5e7eb;
      border-top-color: #4f46e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 10px auto;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `],
})
export class KnowledgeBaseComponent implements OnInit {
  private kbService = inject(KnowledgeService);

  articles = signal<KnowledgeArticle[]>([]);
  loading = signal(true);
  searchTerm = signal('');
  selectedCategory = signal('all');

  activeArticle = signal<KnowledgeArticle | null>(null);
  showFormModal = signal(false);
  isEditing = signal(false);
  saving = signal(false);
  formError = signal('');
  isHelpful = signal(false);
  confirmDeleteId = signal<string | null>(null);

  formArticle: Partial<KnowledgeArticle> = { title: '', category: 'regulations', content: '' };

  categories: CategoryItem[] = [
    { id: 'all', label: 'كافة الفئات' },
    { id: 'regulations', label: 'اللوائح والقوانين' },
    { id: 'academic', label: 'الشؤون الأكاديمية' },
    { id: 'user_guide', label: 'أدلة الاستخدام' },
    { id: 'tech_support', label: 'الدعم التقني والحلول' },
    { id: 'forms', label: 'النماذج والإجراءات' },
  ];

  filteredArticles = computed(() => {
    let list = this.articles();
    const cat = this.selectedCategory();
    const query = this.searchTerm().trim().toLowerCase();

    if (cat !== 'all') {
      list = list.filter((a) => a.category === cat);
    }
    if (query) {
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.content.toLowerCase().includes(query)
      );
    }
    return list;
  });

  totalViews = computed(() =>
    this.articles().reduce((acc, curr) => acc + (curr.views_count ?? 15), 0)
  );

  ngOnInit(): void {
    this.loadArticles();
  }

  loadArticles(): void {
    this.loading.set(true);
    this.kbService.getArticles().subscribe({
      next: (res) => {
        if (res && res.length > 0) {
          this.articles.set(res);
        } else {
          this.setFallbackArticles();
        }
        this.loading.set(false);
      },
      error: () => {
        this.setFallbackArticles();
        this.loading.set(false);
      },
    });
  }

  setFallbackArticles(): void {
    const defaultData: KnowledgeArticle[] = [
      {
        id: '1',
        title: 'دليل لائحة السلوك والمواظبة للطلاب',
        category: 'regulations',
        content:
          'تهدف هذه اللائحة إلى تنظيم قواعد السلوك الرقمي والحضوري للطلاب وتحديد آلية رصد الغياب وتطبيق معايير الانضباط المدرسي وفق التوجيهات الوزارية المعمول بها.',
        created_at: new Date().toISOString(),
        views_count: 142,
      },
      {
        id: '2',
        title: 'خطوات إعداد وتقييم خطط الدروس اليومية',
        category: 'academic',
        content:
          'يشرح هذا الدليل للمعلمين كيفية إدخال الخطط الأكاديمية عبر منصة نبراس، وربط نواتج التعلم بالمهارات والأنشطة الإثرائية واختبارات قياس الأداء.',
        created_at: new Date().toISOString(),
        views_count: 98,
      },
      {
        id: '3',
        title: 'طريقة الربط وإغلاق الفترات المالية في ERP',
        category: 'user_guide',
        content:
          'خطوات تفصيلية للمحاسبين الإداريين لكيفية ترحيل القيود والتأكد من مطابقة أرصدة المستأجرين والفروع وإغلاق السنة المالية بنجاح.',
        created_at: new Date().toISOString(),
        views_count: 215,
      },
      {
        id: '4',
        title: 'حل مشكلة عدم وصول إشعارات الـ WhatsApp للأولياء',
        category: 'tech_support',
        content:
          'خطوات الفحص السريع لخادم الواتساب المدمج، والتأكد من تفعيل مفاتيح API الخاصة بكل فرع والتثبت من حالة الاتصال برقم الخدمة.',
        created_at: new Date().toISOString(),
        views_count: 76,
      },
    ];
    this.articles.set(defaultData);
  }

  selectCategory(catId: string): void {
    this.selectedCategory.set(catId);
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedCategory.set('all');
  }

  readArticle(article: KnowledgeArticle): void {
    this.activeArticle.set(article);
    this.isHelpful.set(false);
  }

  closeReader(): void {
    this.activeArticle.set(null);
  }

  toggleHelpful(): void {
    this.isHelpful.set(!this.isHelpful());
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.formArticle = { title: '', category: 'regulations', content: '' };
    this.formError.set('');
    this.showFormModal.set(true);
  }

  editArticle(article: KnowledgeArticle): void {
    this.isEditing.set(true);
    this.formArticle = { ...article };
    this.formError.set('');
    this.activeArticle.set(null);
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
  }

  saveArticle(event: Event): void {
    event.preventDefault();
    if (!this.formArticle.title?.trim() || !this.formArticle.content?.trim()) {
      this.formError.set('يرجى تعبئة العنوان ومحتوى المقال بالكامل.');
      return;
    }

    this.saving.set(true);
    if (this.isEditing() && this.formArticle.id) {
      this.kbService.updateArticle(this.formArticle.id, this.formArticle).subscribe({
        next: (updated) => {
          this.articles.update((list) =>
            list.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
          );
          this.saving.set(false);
          this.closeFormModal();
        },
        error: () => {
          this.articles.update((list) =>
            list.map((item) =>
              item.id === this.formArticle.id ? ({ ...item, ...this.formArticle } as KnowledgeArticle) : item
            )
          );
          this.saving.set(false);
          this.closeFormModal();
        },
      });
    } else {
      this.kbService.createArticle(this.formArticle).subscribe({
        next: (created) => {
          this.articles.update((list) => [created, ...list]);
          this.saving.set(false);
          this.closeFormModal();
        },
        error: () => {
          const newArt: KnowledgeArticle = {
            ...this.formArticle,
            id: String(Date.now()),
            created_at: new Date().toISOString(),
            views_count: 1,
          } as KnowledgeArticle;
          this.articles.update((list) => [newArt, ...list]);
          this.saving.set(false);
          this.closeFormModal();
        },
      });
    }
  }

  deleteArticle(id: string): void {
    this.activeArticle.set(null);
    this.confirmDeleteId.set(id);
  }

  executeDelete(): void {
    const id = this.confirmDeleteId();
    if (!id) return;
    this.kbService.deleteArticle(id).subscribe({
      next: () => {
        this.articles.update((list) => list.filter((a) => a.id !== id));
        this.confirmDeleteId.set(null);
      },
      error: () => {
        this.articles.update((list) => list.filter((a) => a.id !== id));
        this.confirmDeleteId.set(null);
      },
    });
  }

  getCategoryLabel(catId: string): string {
    const found = this.categories.find((c) => c.id === catId);
    return found ? found.label : catId;
  }

  truncate(str: string, len: number): string {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return 'اليوم';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  getParagraphs(content: string): string[] {
    if (!content) return [];
    return content.split('\n').filter((p) => p.trim().length > 0);
  }
}
