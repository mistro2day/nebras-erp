import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface NbSelectItem {
  id: string | number;
  code?: string;
  name_ar?: string;
  name?: string;
  category_name?: string;
  type?: string;
  [key: string]: any;
}

@Component({
  selector: 'nb-searchable-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="nb-search-select-wrap" [class.is-open]="isOpen()" [class.is-disabled]="disabled">
      <!-- زر العرض وحقل الاختيار -->
      <div
        class="select-trigger"
        tabindex="0"
        (click)="toggleDropdown()"
        (keydown.enter)="toggleDropdown()"
        (keydown.space)="toggleDropdown(); $event.preventDefault()"
        (keydown.escape)="closeDropdown()"
      >
        @if (selectedItem(); as item) {
          <div class="selected-val">
            @if (item.code) {
              <span class="code-badge mono">{{ item.code }}</span>
            }
            <span class="label-text">{{ getItemLabel(item) }}</span>
          </div>
          <button
            type="button"
            class="btn-clear"
            (click)="clearSelection($event)"
            title="مسح الاختيار"
            tabindex="-1"
          >
            ✕
          </button>
        } @else {
          <span class="placeholder-text">{{ placeholder }}</span>
        }
        <span class="chevron-icon" [class.rotate]="isOpen()">▾</span>
      </div>

      <!-- القائمة المنسدلة القابلة للبحث -->
      @if (isOpen()) {
        <div class="dropdown-panel" (click)="$event.stopPropagation()">
          <div class="search-box-wrap">
            <span class="search-icon">🔍</span>
            <input
              #searchInput
              type="text"
              class="search-input"
              [placeholder]="searchPlaceholder"
              [ngModel]="query()"
              (ngModelChange)="query.set($event)"
              (keydown.escape)="closeDropdown()"
            />
            @if (query()) {
              <button type="button" class="search-clear-btn" (click)="query.set('')">✕</button>
            }
          </div>

          <div class="options-list">
            @for (item of filteredItems(); track item.id) {
              <div
                class="option-row"
                [class.selected]="item.id === value"
                (click)="selectItem(item)"
              >
                <div class="opt-main">
                  @if (item.code) {
                    <span class="code-pill mono">{{ item.code }}</span>
                  }
                  <span class="opt-name">{{ getItemLabel(item) }}</span>
                </div>
                @if (item.category_name || item.type) {
                  <span class="opt-meta">{{ item.category_name || item.type }}</span>
                }
              </div>
            } @empty {
              <div class="empty-state">
                <span>لا توجد حسابات أو عناصر مطابقة للبحث.</span>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      position: relative;
    }

    .nb-search-select-wrap {
      position: relative;
      width: 100%;
      user-select: none;
    }

    .select-trigger {
      min-height: 38px;
      padding: 0 12px;
      border: 1px solid var(--nb-border, #cbd5e1);
      border-radius: var(--nb-radius, 8px);
      background: var(--nb-surface, #ffffff);
      color: var(--nb-text, #0f172a);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      cursor: pointer;
      font-size: 13px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .select-trigger:focus-visible,
    .nb-search-select-wrap.is-open .select-trigger {
      outline: none;
      border-color: var(--nb-primary-600, #1e3a8a);
      box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.15);
    }

    .selected-val {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }

    .code-badge {
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #bfdbfe;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 11.5px;
      font-weight: 700;
    }

    .label-text {
      font-weight: 600;
      color: var(--nb-text, #0f172a);
    }

    .placeholder-text {
      color: var(--nb-text-muted, #94a3b8);
      font-size: 13px;
    }

    .btn-clear {
      background: transparent;
      border: none;
      color: var(--nb-text-muted, #94a3b8);
      font-size: 12px;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .btn-clear:hover {
      background: #fee2e2;
      color: #dc2626;
    }

    .chevron-icon {
      font-size: 11px;
      color: var(--nb-text-muted, #64748b);
      transition: transform 0.2s;
    }
    .chevron-icon.rotate {
      transform: rotate(180deg);
    }

    /* القائمة المنسدلة */
    .dropdown-panel {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      left: 0;
      background: var(--nb-surface, #ffffff);
      border: 1px solid var(--nb-border, #cbd5e1);
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      overflow: hidden;
      animation: fadeInDown 0.15s ease-out;
    }

    @keyframes fadeInDown {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .search-box-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-bottom: 1px solid var(--nb-border-soft, #e2e8f0);
      background: var(--nb-surface-raised, #f8fafc);
    }

    .search-icon {
      font-size: 13px;
      opacity: 0.6;
    }

    .search-input {
      flex: 1;
      height: 32px;
      border: 1px solid var(--nb-border, #cbd5e1);
      border-radius: 6px;
      padding: 0 8px;
      font-size: 12.5px;
      font-family: inherit;
      background: var(--nb-surface, #ffffff);
      color: var(--nb-text, #0f172a);
    }
    .search-input:focus {
      outline: none;
      border-color: var(--nb-primary-600, #1e3a8a);
      box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.1);
    }

    .search-clear-btn {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 11px;
    }

    .options-list {
      max-height: 220px;
      overflow-y: auto;
      padding: 4px 0;
    }

    .option-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 12.5px;
      transition: background-color 0.1s;
    }
    .option-row:hover {
      background: var(--nb-surface-raised, #f1f5f9);
    }
    .option-row.selected {
      background: #eff6ff;
      color: #1e3a8a;
      font-weight: 700;
    }

    .opt-main {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      overflow: hidden;
    }

    .code-pill {
      background: #e2e8f0;
      color: #334155;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .option-row.selected .code-pill {
      background: #bfdbfe;
      color: #1e40af;
    }

    .opt-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .opt-meta {
      font-size: 11px;
      color: var(--nb-text-muted, #64748b);
      flex-shrink: 0;
    }

    .empty-state {
      padding: 18px 12px;
      text-align: center;
      color: var(--nb-text-muted, #94a3b8);
      font-size: 12.5px;
    }

    .mono {
      font-family: 'Consolas', 'Courier New', monospace;
    }
  `]
})
export class NbSearchableSelectComponent {
  private elementRef = inject(ElementRef);

  @Input() items: NbSelectItem[] = [];
  @Input() value: string | number | null = null;
  @Input() placeholder = 'اختر من القائمة…';
  @Input() searchPlaceholder = 'ابحث برقم الحساب أو الاسم…';
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<string | number | null>();
  @Output() selected = new EventEmitter<NbSelectItem | null>();

  isOpen = signal(false);
  query = signal('');

  selectedItem = computed(() => {
    const val = this.value;
    if (!val) return null;
    return this.items.find((i) => String(i.id) === String(val)) || null;
  });

  filteredItems = computed(() => {
    const q = this.normalizeArabic(this.query().trim().toLowerCase());
    if (!q) return this.items;

    return this.items.filter((item) => {
      const code = String(item.code || '').toLowerCase();
      const nameAr = this.normalizeArabic(String(item.name_ar || item.name || '').toLowerCase());
      const category = this.normalizeArabic(String(item.category_name || item.type || '').toLowerCase());
      return code.includes(q) || nameAr.includes(q) || category.includes(q);
    });
  });

  toggleDropdown() {
    if (this.disabled) return;
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      this.query.set('');
    }
  }

  closeDropdown() {
    this.isOpen.set(false);
  }

  selectItem(item: NbSelectItem) {
    this.value = item.id;
    this.valueChange.emit(item.id);
    this.selected.emit(item);
    this.closeDropdown();
  }

  clearSelection(event: MouseEvent) {
    event.stopPropagation();
    this.value = null;
    this.valueChange.emit(null);
    this.selected.emit(null);
  }

  getItemLabel(item: NbSelectItem): string {
    return item.name_ar || item.name || String(item.id);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  private normalizeArabic(text: string): string {
    return text
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[ًٌٍَُِّْ]/g, '');
  }
}
