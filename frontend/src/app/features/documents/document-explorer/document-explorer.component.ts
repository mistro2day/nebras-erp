import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { BackendDocument, BackendFolder, DocumentService, StorageStats, ActivityItem } from '../../../core/services/document.service';

type DocTab = 'files' | 'permissions' | 'activity';

@Component({
  selector: 'app-document-explorer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="متصفح المستندات والأرشفة الرقمية"
        subtitle="إدارة المجلدات والوثائق المؤسسية، ضبط الإصدارات والأذونات، والأرشفة الآمنة.">
        <button class="btn ghost" (click)="openNewFolderModal()">مجلد جديد</button>
        <button class="btn primary" (click)="openUploadModal()">رفع مستند</button>
      </nb-page-header>

      <!-- شريط استهلاك المساحة -->
      <section class="storage">
        <div class="st-info">
          <span class="st-label">المساحة المستخدمة</span>
          <span class="st-value">{{ stats().used_gb }}<em>GB</em> <span class="st-of">من {{ stats().quota_gb }}GB</span></span>
        </div>
        <div class="st-bar" role="img" [attr.aria-label]="'استُهلك ' + storagePct() + ' بالمئة من المساحة'">
          <span class="st-fill" [style.width.%]="storagePct()"></span>
        </div>
        <div class="st-legend">
          <span><b>{{ stats().total_docs }}</b> مستند</span>
          <span><b>{{ folders().length }}</b> مجلد مؤسسي</span>
          <span><b>{{ stats().locked_count }}</b> مقفل للتحرير</span>
        </div>
      </section>

      <!-- المستكشف: شجرة + قائمة -->
      <section class="explorer">
        <aside class="tree" aria-label="شجرة المجلدات">
          <div class="tree-head">المجلدات المؤسسية</div>
          <button class="node" [class.on]="selectedFolderId() === null" (click)="selectFolder(null)">
            <span class="node-ic">📂</span>
            <span class="node-body">
              <span class="node-name">جميع المستندات</span>
              <span class="node-access">وصول شامل</span>
            </span>
            <span class="node-count">{{ stats().total_docs }}</span>
          </button>
          @for (f of folders(); track f.id) {
            <button class="node" [class.on]="selectedFolderId() === f.id" (click)="selectFolder(f.id)">
              <span class="node-ic">📁</span>
              <span class="node-body">
                <span class="node-name">{{ f.name }}</span>
                <span class="node-access">{{ f.folder_type }}</span>
              </span>
              <span class="node-count">{{ f.count }}</span>
            </button>
          }
        </aside>

        <div class="pane">
          <header class="pane-head">
            <div class="ph-title">
              <h2>{{ currentFolderName() }}</h2>
              <span class="tag data-internal">نشط</span>
            </div>
            <input class="search" type="search" [value]="query()"
                   (input)="onSearchInput($any($event.target).value)"
                   aria-label="بحث في المستندات" placeholder="بحث في المستندات…" />
          </header>

          <nav class="tabs" role="tablist">
            @for (t of tabs; track t.key) {
              <button class="tab" role="tab" [class.on]="tab() === t.key"
                      [attr.aria-selected]="tab() === t.key" (click)="tab.set(t.key)">{{ t.label }}</button>
            }
          </nav>

          @if (tab() === 'files') {
            <div class="list">
              <div class="row head">
                <span>المستند</span><span>الإصدار</span><span>حجم الملف</span><span>تاريخ الرفع</span><span class="ta-end">الإجراءات</span>
              </div>
              @if (loading()) {
                <div class="empty">جاري تحميل المستندات…</div>
              } @else {
                @for (d of documents(); track d.id) {
                  <div class="row">
                    <span class="doc">
                      <span class="ext" [attr.data-e]="d.file_extension">{{ d.file_extension || 'FILE' }}</span>
                      <span class="doc-body">
                        <a class="doc-title" [href]="d.latest_version_path || '#'" target="_blank" [title]="'تحميل أو معاينة ' + d.title">
                          {{ d.title }}
                        </a>
                        @if (d.is_locked) { <span class="lock">🔒 مقفل للتحرير</span> }
                      </span>
                    </span>
                    <span class="mono">v{{ d.current_version_number }}</span>
                    <span class="muted">{{ d.file_size_formatted }}</span>
                    <span class="muted">{{ d.created_at | date:'mediumDate' }}</span>
                    <div class="actions ta-end">
                      @if (d.latest_version_path) {
                        <a class="btn-icon" [href]="d.latest_version_path" target="_blank" title="تحميل الملف">📥</a>
                      }
                      <button class="btn-icon" (click)="openVersionModal(d)" title="إضافة إصدار جديد">⬆️</button>
                      <button class="btn-icon" (click)="toggleLock(d)" [title]="d.is_locked ? 'فك قفل الملف' : 'قفل الملف'">
                        {{ d.is_locked ? '🔓' : '🔒' }}
                      </button>
                    </div>
                  </div>
                }
                @if (documents().length === 0) {
                  <div class="empty">
                    لا توجد مستندات في هذا المجلد بعد. يمكنك رفع ملف جديد الآن.
                  </div>
                }
              }
            </div>
          }

          @if (tab() === 'permissions') {
            <div class="perms">
              <div class="perm">
                <span class="perm-role">إدارة النظام (Admin)</span>
                <span class="perm-level data-write">قراءة وكتابة وحذف</span>
              </div>
              <div class="perm">
                <span class="perm-role">مدير القسم</span>
                <span class="perm-level data-write">قراءة وكتابة</span>
              </div>
              <div class="perm">
                <span class="perm-role">موظفو القسم</span>
                <span class="perm-level data-read">قراءة فقط</span>
              </div>
              <p class="note">
                تُطبّق الأذونات بحسب أدوار ومستويات صلاحية المستخدمين في النظام.
              </p>
            </div>
          }

          @if (tab() === 'activity') {
            <ol class="timeline">
              @for (a of activity(); track a.at + a.action) {
                <li class="tl-item">
                  <span class="tl-dot" aria-hidden="true"></span>
                  <span class="tl-body">
                    <strong>{{ a.action }}</strong>
                    <span class="tl-meta">{{ a.actor }} · {{ a.at }}</span>
                  </span>
                </li>
              }
              @if (activity().length === 0) {
                <li class="empty">لا توجد أنشطة مسجلة مؤخراً.</li>
              }
            </ol>
          }
        </div>
      </section>

      <!-- Nebras OS Custom Modal: Upload Document -->
      @if (showUploadModal()) {
        <div class="modal-backdrop" (click)="closeUploadModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>رفع مستند جديد</h3>
              <button class="close-btn" (click)="closeUploadModal()">✕</button>
            </div>
            <div class="modal-body">
              <label class="form-group">
                <span>عنوان المستند *</span>
                <input class="input" type="text" [(ngModel)]="uploadTitle" placeholder="أدخل عنوان الوثيقة..." />
              </label>
              <label class="form-group">
                <span>المجلد المستهدف</span>
                <select class="input" [(ngModel)]="uploadFolderId">
                  <option [value]="''">بدون مجلد (عام)</option>
                  @for (f of folders(); track f.id) {
                    <option [value]="f.id">{{ f.name }}</option>
                  }
                </select>
              </label>
              <label class="form-group">
                <span>اختر الملف من جهازك *</span>
                <input class="input-file" type="file" (change)="onFileSelected($event)" />
              </label>
            </div>
            <div class="modal-footer">
              <button class="btn ghost" (click)="closeUploadModal()">إلغاء</button>
              <button class="btn primary" [disabled]="submitting() || !uploadFileObj || !uploadTitle" (click)="submitUpload()">
                {{ submitting() ? 'جاري الرفع…' : 'رفع المستند' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Nebras OS Custom Modal: New Folder -->
      @if (showFolderModal()) {
        <div class="modal-backdrop" (click)="closeFolderModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>إنشاء مجلد مؤسسي جديد</h3>
              <button class="close-btn" (click)="closeFolderModal()">✕</button>
            </div>
            <div class="modal-body">
              <label class="form-group">
                <span>اسم المجلد *</span>
                <input class="input" type="text" [(ngModel)]="newFolderName" placeholder="مثال: عقود المشتريات 2026" />
              </label>
              <label class="form-group">
                <span>نوع المجلد</span>
                <select class="input" [(ngModel)]="newFolderType">
                  <option value="department">مجلد قسم (Department)</option>
                  <option value="shared">مجلد مشترك (Shared)</option>
                  <option value="confidential">مجلد سري (Confidential)</option>
                </select>
              </label>
            </div>
            <div class="modal-footer">
              <button class="btn ghost" (click)="closeFolderModal()">إلغاء</button>
              <button class="btn primary" [disabled]="submitting() || !newFolderName" (click)="submitNewFolder()">
                {{ submitting() ? 'جاري الإنشاء…' : 'إنشاء المجلد' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Nebras OS Custom Modal: Add New Version -->
      @if (showVersionModal()) {
        <div class="modal-backdrop" (click)="closeVersionModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>إضافة إصدار جديد لـ «{{ activeDocForVersion?.title }}»</h3>
              <button class="close-btn" (click)="closeVersionModal()">✕</button>
            </div>
            <div class="modal-body">
              <label class="form-group">
                <span>ملاحظات التغيير / سجل الإصدار</span>
                <input class="input" type="text" [(ngModel)]="versionChangeLog" placeholder="مثال: تحديث البند الثالث من العقد" />
              </label>
              <label class="form-checkbox">
                <input type="checkbox" [(ngModel)]="isMajorVersion" />
                <span>إصدار رئيسي جديد (Major Version e.g. 2.0)</span>
              </label>
              <label class="form-group">
                <span>اختر الملف الجديد *</span>
                <input class="input-file" type="file" (change)="onFileSelected($event)" />
              </label>
            </div>
            <div class="modal-footer">
              <button class="btn ghost" (click)="closeVersionModal()">إلغاء</button>
              <button class="btn primary" [disabled]="submitting() || !uploadFileObj" (click)="submitNewVersion()">
                {{ submitting() ? 'جاري الحفظ…' : 'رفع الإصدار' }}
              </button>
            </div>
          </div>
        </div>
      }
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
    .btn.primary:disabled { opacity: 0.55; cursor: not-allowed; }

    .btn-icon { background: none; border: none; cursor: pointer; font-size: 14px; padding: 4px 6px; border-radius: 4px; }
    .btn-icon:hover { background: var(--nb-border-soft); }

    /* شريط المساحة */
    .storage { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 14px 16px; margin-bottom: 16px;
      display: flex; flex-direction: column; gap: 10px; }
    .st-info { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    .st-label { font-size: 12px; font-weight: 600; color: var(--nb-text-muted); }
    .st-value { font-size: 22px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .st-value em { font-size: 12px; font-weight: 600; font-style: normal; color: var(--nb-text-muted); }
    .st-of { font-size: 12px; font-weight: 500; color: var(--nb-text-muted); }
    .st-bar { height: 8px; border-radius: 999px; background: var(--nb-border-soft); overflow: hidden; }
    .st-fill { display: block; height: 100%; border-radius: 999px;
      background: linear-gradient(90deg, var(--nb-primary-500), var(--nb-primary-400)); transition: width .35s ease; }
    .st-legend { display: flex; flex-wrap: wrap; gap: 18px; font-size: 12px; color: var(--nb-text-muted); }
    .st-legend b { color: var(--nb-text); font-weight: 700; }

    /* المستكشف */
    .explorer { display: grid; grid-template-columns: 280px 1fr; gap: 16px; align-items: start; }
    @media (max-width: 1000px) { .explorer { grid-template-columns: 1fr; } }

    .tree { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); overflow: hidden; }
    .tree-head { padding: 12px 14px; font-size: 11px; font-weight: 700; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); }
    .node { position: relative; width: 100%; display: flex; align-items: center; gap: 10px; padding: 11px 14px;
      background: none; border: none; border-bottom: 1px solid var(--nb-border-row); cursor: pointer;
      font-family: inherit; text-align: start; transition: background .15s ease; }
    .node:last-child { border-bottom: none; }
    .node:hover { background: var(--nb-surface-raised); }
    .node.on { background: var(--nb-primary-50); }
    .node.on::before { content: ''; position: absolute; inset-inline-start: 0; inset-block: 6px;
      width: 3px; border-radius: 3px; background: var(--nb-primary-600); }
    .node-ic { font-size: 16px; flex-shrink: 0; }
    .node-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .node-name { font-size: 13px; font-weight: 600; color: var(--nb-text); }
    .node-access { font-size: 11px; color: var(--nb-text-muted); }
    .node-count { font-size: 11px; font-weight: 700; color: var(--nb-text-muted);
      background: var(--nb-border-soft); border-radius: 999px; padding: 1px 7px; }

    .pane { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); overflow: hidden; }
    .pane-head { display: flex; align-items: center; justify-content: space-between; gap: 12px;
      flex-wrap: wrap; padding: 14px 16px; }
    .ph-title { display: flex; align-items: center; gap: 10px; }
    .ph-title h2 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .tag { font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 999px; }
    .tag.data-internal { background: var(--nb-primary-50); color: var(--nb-primary-600); }

    .search { height: 32px; min-width: 200px; padding: 0 12px; font-family: inherit; font-size: 12.5px;
      color: var(--nb-text); background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius); outline: none; }
    .search:focus { border-color: var(--nb-primary-400); }

    .tabs { display: flex; gap: 2px; padding: 0 12px; background: var(--nb-surface-raised);
      border-block: 1px solid var(--nb-border-soft); }
    .tab { position: relative; height: 38px; padding: 0 12px; background: none; border: none; cursor: pointer;
      font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--nb-text-muted); }
    .tab.on { color: var(--nb-primary-600); }
    .tab.on::after { content: ''; position: absolute; inset-inline: 8px; bottom: -1px; height: 2px;
      background: var(--nb-primary-600); border-radius: 2px 2px 0 0; }

    .list { display: flex; flex-direction: column; }
    .row { display: grid; grid-template-columns: 2.2fr 0.8fr 1fr 1.2fr 0.8fr; gap: 10px; align-items: center;
      padding: 10px 16px; font-size: 13px; border-bottom: 1px solid var(--nb-border-row); }
    .row.head { background: var(--nb-surface-raised); font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .doc { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .ext { flex-shrink: 0; width: 34px; height: 34px; border-radius: var(--nb-radius-sm);
      display: flex; align-items: center; justify-content: center; text-transform: uppercase;
      font-size: 10px; font-weight: 800; background: var(--nb-border-soft); color: var(--nb-text-secondary); }
    .ext[data-e='pdf'] { background: #fee2e2; color: #b91c1c; }
    .ext[data-e='docx'] { background: #dbeafe; color: #1d4ed8; }
    .ext[data-e='xlsx'] { background: #dcfce7; color: #15803d; }
    .doc-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .doc-title { font-weight: 600; color: var(--nb-text); text-decoration: none; }
    .doc-title:hover { color: var(--nb-primary-600); text-decoration: underline; }
    .lock { font-size: 11px; font-weight: 600; color: var(--nb-warning, #b45309); }
    .mono { font-family: ui-monospace, monospace; font-size: 12px; color: var(--nb-text-secondary); }
    .muted { font-size: 12px; color: var(--nb-text-muted); }
    .ta-end { text-align: end; }
    .actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }

    .empty { padding: 34px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }

    .perms { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
    .perm { display: flex; align-items: center; justify-content: space-between; padding: 11px 14px;
      background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); }
    .perm-role { font-size: 13px; font-weight: 600; color: var(--nb-text); }
    .perm-level { font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 999px; }
    .perm-level.data-write { background: #dcfce7; color: #15803d; }
    .perm-level.data-read { background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .note { margin: 6px 0 0; font-size: 12px; color: var(--nb-text-muted); }

    .timeline { list-style: none; margin: 0; padding: 16px 20px; display: flex; flex-direction: column; }
    .tl-item { position: relative; display: flex; gap: 12px; padding-bottom: 16px; }
    .tl-item:not(:last-child)::before { content: ''; position: absolute; inset-inline-start: 4px; top: 14px;
      bottom: 0; width: 1px; background: var(--nb-border); }
    .tl-dot { flex-shrink: 0; width: 9px; height: 9px; margin-top: 4px; border-radius: 50%; background: var(--nb-primary-500); }
    .tl-body { display: flex; flex-direction: column; gap: 2px; }
    .tl-body strong { font-size: 13px; font-weight: 600; color: var(--nb-text); }
    .tl-meta { font-size: 11.5px; color: var(--nb-text-muted); }

    /* Nebras Custom Modal UI */
    .modal-backdrop { position: fixed; inset: 0; z-index: 999; background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-card { width: 100%; max-width: 480px; background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18); display: flex; flex-direction: column; }
    .modal-header { padding: 14px 18px; border-bottom: 1px solid var(--nb-border-soft); display: flex;
      align-items: center; justify-content: space-between; }
    .modal-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .close-btn { background: none; border: none; font-size: 16px; cursor: pointer; color: var(--nb-text-muted); }
    .modal-body { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
    .modal-footer { padding: 12px 18px; border-top: 1px solid var(--nb-border-soft); display: flex;
      justify-content: flex-end; gap: 10px; background: var(--nb-surface-raised); }
    .form-group { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--nb-text); }
    .form-checkbox { display: flex; align-items: center; gap: 8px; font-size: 12.5px; cursor: pointer; }
    .input { height: 36px; padding: 0 12px; font-family: inherit; font-size: 13px; color: var(--nb-text);
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius); outline: none; }
    .input:focus { border-color: var(--nb-primary-400); }
    .input-file { font-family: inherit; font-size: 12px; color: var(--nb-text); }
  `]
})
export class DocumentExplorerComponent implements OnInit {
  private docService = inject(DocumentService);

  readonly tabs: { key: DocTab; label: string }[] = [
    { key: 'files', label: 'المستندات' },
    { key: 'permissions', label: 'الأذونات' },
    { key: 'activity', label: 'سجل النشاط والتدقيق' },
  ];

  folders = signal<BackendFolder[]>([]);
  documents = signal<BackendDocument[]>([]);
  activity = signal<ActivityItem[]>([]);
  stats = signal<StorageStats>({ used_gb: 0.15, quota_gb: 20, total_docs: 0, locked_count: 0, folder_count: 0 });

  tab = signal<DocTab>('files');
  selectedFolderId = signal<string | null>(null);
  query = signal<string>('');
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);

  // Modals state
  showUploadModal = signal<boolean>(false);
  showFolderModal = signal<boolean>(false);
  showVersionModal = signal<boolean>(false);

  // Upload Form Inputs
  uploadTitle = '';
  uploadFolderId = '';
  uploadFileObj: File | null = null;

  // Folder Form Inputs
  newFolderName = '';
  newFolderType = 'department';

  // Version Form Inputs
  activeDocForVersion: BackendDocument | null = null;
  versionChangeLog = '';
  isMajorVersion = false;

  currentFolderName = computed(() => {
    const fid = this.selectedFolderId();
    if (!fid) return 'جميع المستندات';
    const found = this.folders().find(f => f.id === fid);
    return found ? found.name : 'مجلد غير معروف';
  });

  storagePct = computed(() => {
    const st = this.stats();
    if (!st.quota_gb) return 0;
    return Math.min(100, Math.round((st.used_gb / st.quota_gb) * 100));
  });

  ngOnInit(): void {
    this.refreshAllData();
  }

  refreshAllData(): void {
    this.loadFolders();
    this.loadStats();
    this.loadActivity();
    this.loadDocuments();
  }

  loadFolders(): void {
    this.docService.getFolders().subscribe({
      next: (data) => this.folders.set(data),
      error: (err) => console.error('خطأ في جلب المجلدات:', err)
    });
  }

  loadStats(): void {
    this.docService.getStorageStats().subscribe({
      next: (data) => this.stats.set(data),
      error: (err) => console.error('خطأ في جلب الإحصائيات:', err)
    });
  }

  loadActivity(): void {
    this.docService.getActivityLog().subscribe({
      next: (data) => this.activity.set(data),
      error: (err) => console.error('خطأ في جلب سجل النشاط:', err)
    });
  }

  loadDocuments(): void {
    this.loading.set(true);
    const fid = this.selectedFolderId() || undefined;
    const q = this.query().trim() || undefined;

    this.docService.getDocuments(fid, q).subscribe({
      next: (docs) => {
        this.documents.set(docs);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('خطأ في جلب المستندات:', err);
        this.loading.set(false);
      }
    });
  }

  selectFolder(folderId: string | null): void {
    this.selectedFolderId.set(folderId);
    this.loadDocuments();
  }

  onSearchInput(val: string): void {
    this.query.set(val);
    this.loadDocuments();
  }

  // Upload Modal Handlers
  openUploadModal(): void {
    this.uploadTitle = '';
    this.uploadFolderId = this.selectedFolderId() || '';
    this.uploadFileObj = null;
    this.showUploadModal.set(true);
  }

  closeUploadModal(): void {
    this.showUploadModal.set(false);
  }

  onFileSelected(event: any): void {
    const files = event.target?.files;
    if (files && files.length > 0) {
      this.uploadFileObj = files[0];
      if (!this.uploadTitle) {
        this.uploadTitle = files[0].name.replace(/\.[^/.]+$/, '');
      }
    }
  }

  submitUpload(): void {
    if (!this.uploadFileObj || !this.uploadTitle) return;

    const fd = new FormData();
    fd.append('file', this.uploadFileObj);
    fd.append('title', this.uploadTitle);
    if (this.uploadFolderId) {
      fd.append('folder', this.uploadFolderId);
    }

    this.submitting.set(true);
    this.docService.uploadDocument(fd).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeUploadModal();
        this.refreshAllData();
      },
      error: (err) => {
        console.error('خطأ أثناء رفع المستند:', err);
        this.submitting.set(false);
      }
    });
  }

  // Folder Modal Handlers
  openNewFolderModal(): void {
    this.newFolderName = '';
    this.newFolderType = 'department';
    this.showFolderModal.set(true);
  }

  closeFolderModal(): void {
    this.showFolderModal.set(false);
  }

  submitNewFolder(): void {
    if (!this.newFolderName.trim()) return;

    this.submitting.set(true);
    this.docService.createFolder(this.newFolderName.trim(), this.newFolderType).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeFolderModal();
        this.loadFolders();
        this.loadStats();
      },
      error: (err) => {
        console.error('خطأ في إنشاء المجلد:', err);
        this.submitting.set(false);
      }
    });
  }

  // Version Modal Handlers
  openVersionModal(doc: BackendDocument): void {
    this.activeDocForVersion = doc;
    this.versionChangeLog = '';
    this.isMajorVersion = false;
    this.uploadFileObj = null;
    this.showVersionModal.set(true);
  }

  closeVersionModal(): void {
    this.showVersionModal.set(false);
    this.activeDocForVersion = null;
  }

  submitNewVersion(): void {
    if (!this.activeDocForVersion || !this.uploadFileObj) return;

    const fd = new FormData();
    fd.append('file', this.uploadFileObj);
    fd.append('change_log', this.versionChangeLog);
    fd.append('is_major', String(this.isMajorVersion));

    this.submitting.set(true);
    this.docService.addVersion(this.activeDocForVersion.id, fd).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeVersionModal();
        this.refreshAllData();
      },
      error: (err) => {
        console.error('خطأ في رفع الإصدار الجديد:', err);
        this.submitting.set(false);
      }
    });
  }

  // Lock / Unlock Handler
  toggleLock(doc: BackendDocument): void {
    const action$ = doc.is_locked
      ? this.docService.unlockDocument(doc.id)
      : this.docService.lockDocument(doc.id);

    action$.subscribe({
      next: () => this.refreshAllData(),
      error: (err) => console.error('خطأ في تغيير حالة قفل المستند:', err)
    });
  }
}
