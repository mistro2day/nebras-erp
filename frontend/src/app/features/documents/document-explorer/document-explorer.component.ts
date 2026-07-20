import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';

interface Folder {
  id: string;
  name: string;
  icon: string;
  count: number;
  classification: 'public' | 'internal' | 'confidential';
  access: string;
}

interface Doc {
  id: string;
  folder: string;
  title: string;
  ext: string;
  version: string;
  size: string;
  owner: string;
  updated: string;
  locked?: boolean;
}

type DocTab = 'files' | 'permissions' | 'activity';

/**
 * متصفح المستندات والأرشفة الرقمية (DMS) — لغة تصميم نبراس.
 *
 * التوقيع البصري: مستكشف بجزأين — شجرة المجلدات المؤسسية مع وسم التصنيف الأمني
 * لكل مجلد، ولوح المستندات مع شريط استهلاك المساحة. التصنيف يُعرض بنص + لون معاً
 * (لا اعتماد على اللون وحده). تبويبات محلية بدل mat-tabs تفادياً لأخطاء البناء.
 */
@Component({
  selector: 'app-document-explorer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NbPageHeaderComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="متصفح المستندات والأرشفة الرقمية"
        subtitle="إدارة المجلدات والوثائق المؤسسية، ضبط الإصدارات والأذونات، والأرشفة الآمنة.">
        <button class="btn ghost">مجلد جديد</button>
        <button class="btn primary">رفع مستند</button>
      </nb-page-header>

      <!-- شريط استهلاك المساحة -->
      <section class="storage">
        <div class="st-info">
          <span class="st-label">المساحة المستخدمة</span>
          <span class="st-value">{{ usedGb }}<em>GB</em> <span class="st-of">من {{ quotaGb }}GB</span></span>
        </div>
        <div class="st-bar" role="img" [attr.aria-label]="'استُهلك ' + storagePct() + ' بالمئة من المساحة'">
          <span class="st-fill" [style.width.%]="storagePct()"></span>
        </div>
        <div class="st-legend">
          <span><b>{{ totalDocs() }}</b> مستند</span>
          <span><b>{{ folders.length }}</b> مجلد</span>
          <span><b>{{ lockedCount() }}</b> مقفل للتحرير</span>
        </div>
      </section>

      <!-- المستكشف: شجرة + قائمة -->
      <section class="explorer">
        <aside class="tree" aria-label="شجرة المجلدات">
          <div class="tree-head">المجلدات المؤسسية</div>
          @for (f of folders; track f.id) {
            <button class="node" [class.on]="selected() === f.id" (click)="selected.set(f.id)"
                    [attr.aria-current]="selected() === f.id ? 'true' : null">
              <span class="node-ic" aria-hidden="true">{{ f.icon }}</span>
              <span class="node-body">
                <span class="node-name">{{ f.name }}</span>
                <span class="node-access">{{ f.access }}</span>
              </span>
              <span class="node-count">{{ f.count }}</span>
            </button>
          }
        </aside>

        <div class="pane">
          <header class="pane-head">
            <div class="ph-title">
              <h2>{{ current().name }}</h2>
              <span class="tag" [attr.data-c]="current().classification">{{ classText(current().classification) }}</span>
            </div>
            <input class="search" type="search" [value]="query()"
                   (input)="query.set($any($event.target).value)"
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
                <span>المستند</span><span>الإصدار</span><span>المالك</span><span>آخر تعديل</span><span class="ta-end">الحجم</span>
              </div>
              @for (d of visibleDocs(); track d.id) {
                <div class="row">
                  <span class="doc">
                    <span class="ext" [attr.data-e]="d.ext">{{ d.ext }}</span>
                    <span class="doc-body">
                      <span class="doc-title">{{ d.title }}</span>
                      @if (d.locked) { <span class="lock">مقفل للتحرير</span> }
                    </span>
                  </span>
                  <span class="mono">v{{ d.version }}</span>
                  <span class="muted">{{ d.owner }}</span>
                  <span class="muted">{{ d.updated }}</span>
                  <span class="ta-end mono">{{ d.size }}</span>
                </div>
              }
              @if (visibleDocs().length === 0) {
                <div class="empty">
                  لا توجد مستندات مطابقة في هذا المجلد.
                  @if (query()) { <button class="link-btn" (click)="query.set('')">مسح البحث</button> }
                </div>
              }
            </div>
          }

          @if (tab() === 'permissions') {
            <div class="perms">
              @for (p of permissions; track p.role) {
                <div class="perm">
                  <span class="perm-role">{{ p.role }}</span>
                  <span class="perm-level" [attr.data-l]="p.level">{{ p.label }}</span>
                </div>
              }
              <p class="note">
                الأذونات تُورَّث من المجلد الأب ما لم يُضبط لها استثناء صريح على مستوى المستند.
              </p>
            </div>
          }

          @if (tab() === 'activity') {
            <ol class="timeline">
              @for (a of activity; track a.at) {
                <li class="tl-item">
                  <span class="tl-dot" aria-hidden="true"></span>
                  <span class="tl-body">
                    <strong>{{ a.action }}</strong>
                    <span class="tl-meta">{{ a.actor }} · {{ a.at }}</span>
                  </span>
                </li>
              }
            </ol>
          }
        </div>
      </section>
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
    .link-btn { background: none; border: none; font-family: inherit; font-size: 12px; font-weight: 600;
      color: var(--nb-primary-600); cursor: pointer; }

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
    .node.on .node-count { background: var(--nb-surface); color: var(--nb-primary-600); }

    .pane { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); overflow: hidden; }
    .pane-head { display: flex; align-items: center; justify-content: space-between; gap: 12px;
      flex-wrap: wrap; padding: 14px 16px; }
    .ph-title { display: flex; align-items: center; gap: 10px; }
    .ph-title h2 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .tag { font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 999px; }
    .tag[data-c='public'] { background: #dcfce7; color: #15803d; }
    .tag[data-c='internal'] { background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .tag[data-c='confidential'] { background: #fee2e2; color: #b91c1c; }
    .search { height: 32px; min-width: 200px; padding: 0 12px; font-family: inherit; font-size: 12.5px;
      color: var(--nb-text); background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius); outline: none; }
    .search:focus { border-color: var(--nb-primary-400); box-shadow: 0 0 0 3px rgba(48,63,159,.10); }

    .tabs { display: flex; gap: 2px; padding: 0 12px; background: var(--nb-surface-raised);
      border-block: 1px solid var(--nb-border-soft); overflow-x: auto; }
    .tab { position: relative; height: 38px; padding: 0 12px; background: none; border: none; cursor: pointer;
      font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--nb-text-muted); white-space: nowrap; }
    .tab:hover { color: var(--nb-text); }
    .tab.on { color: var(--nb-primary-600); }
    .tab.on::after { content: ''; position: absolute; inset-inline: 8px; bottom: -1px; height: 2px;
      background: var(--nb-primary-600); border-radius: 2px 2px 0 0; }

    .list { display: flex; flex-direction: column; }
    .row { display: grid; grid-template-columns: 2.4fr .7fr 1.2fr 1fr .8fr; gap: 10px; align-items: center;
      padding: 10px 16px; font-size: 13px; border-bottom: 1px solid var(--nb-border-row); }
    .row:last-child { border-bottom: none; }
    .row.head { background: var(--nb-surface-raised); font-size: 11px; font-weight: 700;
      color: var(--nb-text-muted); padding: 8px 16px; }
    .row:not(.head):hover { background: var(--nb-surface-raised); }
    .doc { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .ext { flex-shrink: 0; width: 34px; height: 34px; border-radius: var(--nb-radius-sm);
      display: flex; align-items: center; justify-content: center; text-transform: uppercase;
      font-size: 10px; font-weight: 800; background: var(--nb-border-soft); color: var(--nb-text-secondary); }
    .ext[data-e='pdf'] { background: #fee2e2; color: #b91c1c; }
    .ext[data-e='docx'] { background: #dbeafe; color: #1d4ed8; }
    .ext[data-e='xlsx'] { background: #dcfce7; color: #15803d; }
    .doc-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .doc-title { font-weight: 600; color: var(--nb-text); }
    .lock { font-size: 11px; font-weight: 600; color: var(--nb-warning, #b45309); }
    .mono { font-family: ui-monospace, monospace; font-size: 12px; color: var(--nb-text-secondary);
      font-variant-numeric: tabular-nums; }
    .muted { font-size: 12px; color: var(--nb-text-muted); }
    .ta-end { text-align: end; }
    .empty { padding: 34px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted);
      display: flex; flex-direction: column; align-items: center; gap: 8px; }

    .perms { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
    .perm { display: flex; align-items: center; justify-content: space-between;
      padding: 11px 14px; background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); }
    .perm-role { font-size: 13px; font-weight: 600; color: var(--nb-text); }
    .perm-level { font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 999px; }
    .perm-level[data-l='write'] { background: #dcfce7; color: #15803d; }
    .perm-level[data-l='read'] { background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .perm-level[data-l='none'] { background: #fee2e2; color: #b91c1c; }
    .note { margin: 6px 0 0; font-size: 12px; line-height: 1.7; color: var(--nb-text-muted); }

    .timeline { list-style: none; margin: 0; padding: 16px 20px; display: flex; flex-direction: column; }
    .tl-item { position: relative; display: flex; gap: 12px; padding-bottom: 16px; }
    .tl-item:not(:last-child)::before { content: ''; position: absolute; inset-inline-start: 4px; top: 14px;
      bottom: 0; width: 1px; background: var(--nb-border); }
    .tl-dot { flex-shrink: 0; width: 9px; height: 9px; margin-top: 4px; border-radius: 50%;
      background: var(--nb-primary-500); }
    .tl-body { display: flex; flex-direction: column; gap: 2px; }
    .tl-body strong { font-size: 13px; font-weight: 600; color: var(--nb-text); }
    .tl-meta { font-size: 11.5px; color: var(--nb-text-muted); }

    @media (max-width: 780px) {
      .page { padding: 14px; }
      .row, .row.head { grid-template-columns: 1fr 1fr; row-gap: 4px; }
      .ta-end { text-align: start; }
    }
  `]
})
export class DocumentExplorerComponent {
  readonly quotaGb = 20;
  readonly usedGb = 4.2;

  readonly tabs: { key: DocTab; label: string }[] = [
    { key: 'files', label: 'المستندات' },
    { key: 'permissions', label: 'الأذونات' },
    { key: 'activity', label: 'سجل النشاط' },
  ];

  readonly folders: Folder[] = [
    { id: 'hr', name: 'ملفات شؤون الموظفين', icon: '📁', count: 412, classification: 'confidential', access: 'الموارد البشرية — قراءة/كتابة' },
    { id: 'students', name: 'ملفات الطلاب', icon: '📁', count: 638, classification: 'internal', access: 'شؤون الطلاب — قراءة/كتابة' },
    { id: 'finance', name: 'المستندات المالية', icon: '📁', count: 254, classification: 'internal', access: 'الشؤون المالية — قراءة/كتابة' },
    { id: 'medical', name: 'السجلات الصحية', icon: '🔒', count: 96, classification: 'confidential', access: 'العيادة المدرسية — قراءة فقط' },
    { id: 'policies', name: 'اللوائح والسياسات', icon: '📁', count: 20, classification: 'public', access: 'الجميع — قراءة فقط' },
  ];

  private readonly docs: Doc[] = [
    { id: 'd1', folder: 'finance', title: 'فاتورة المشتريات رقم 14', ext: 'pdf', version: '1.0', size: '1.2 MB', owner: 'الشؤون المالية', updated: 'اليوم 09:12' },
    { id: 'd2', folder: 'finance', title: 'الميزانية التقديرية للعام الدراسي', ext: 'xlsx', version: '3.4', size: '640 KB', owner: 'الشؤون المالية', updated: 'أمس 14:30' },
    { id: 'd3', folder: 'hr', title: 'عقد الموظف سالم العلي', ext: 'pdf', version: '2.1', size: '4.8 MB', owner: 'الموارد البشرية', updated: 'أمس 11:05', locked: true },
    { id: 'd4', folder: 'hr', title: 'نموذج تقييم الأداء السنوي', ext: 'docx', version: '1.3', size: '210 KB', owner: 'الموارد البشرية', updated: '18 يوليو' },
    { id: 'd5', folder: 'policies', title: 'لائحة تنظيم النقل المدرسي', ext: 'pdf', version: '1.2', size: '850 KB', owner: 'إدارة النقل', updated: '15 يوليو' },
    { id: 'd6', folder: 'students', title: 'كشف درجات الفصل الأول', ext: 'xlsx', version: '2.0', size: '1.1 MB', owner: 'الشؤون الأكاديمية', updated: '12 يوليو' },
    { id: 'd7', folder: 'medical', title: 'سجل التطعيمات — الصف الثالث', ext: 'pdf', version: '1.0', size: '380 KB', owner: 'العيادة المدرسية', updated: '10 يوليو', locked: true },
  ];

  readonly permissions = [
    { role: 'مدير النظام', level: 'write', label: 'قراءة وكتابة وحذف' },
    { role: 'مدير القسم', level: 'write', label: 'قراءة وكتابة' },
    { role: 'موظف القسم', level: 'read', label: 'قراءة فقط' },
    { role: 'أولياء الأمور', level: 'none', label: 'لا يوجد وصول' },
  ];

  readonly activity = [
    { action: 'رُفع إصدار جديد من «عقد الموظف سالم العلي»', actor: 'نورة القحطاني', at: 'اليوم 11:05' },
    { action: 'مُنح قسم الشؤون المالية صلاحية الكتابة', actor: 'مدير النظام', at: 'أمس 16:40' },
    { action: 'أُرشف مجلد «مستندات العام السابق»', actor: 'خالد الدوسري', at: '18 يوليو' },
  ];

  tab = signal<DocTab>('files');
  selected = signal<string>('hr');
  query = signal('');

  current = computed(() => this.folders.find((f) => f.id === this.selected()) ?? this.folders[0]);

  totalDocs = computed(() => this.folders.reduce((s, f) => s + f.count, 0));
  lockedCount = computed(() => this.docs.filter((d) => d.locked).length);
  storagePct = computed(() => Math.round((this.usedGb / this.quotaGb) * 100));

  visibleDocs = computed(() => {
    const q = this.query().trim();
    return this.docs
      .filter((d) => d.folder === this.selected())
      .filter((d) => !q || d.title.includes(q) || d.owner.includes(q));
  });

  classText(c: Folder['classification']): string {
    return c === 'confidential' ? 'سري' : c === 'internal' ? 'داخلي' : 'عام';
  }
}
