/** تطبيع استجابة القوائم (StandardPagination/StandardResponse) إلى مصفوفة. */
export function pickList<T = any>(res: any): T[] {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d as T[];
  if (Array.isArray(d?.results)) return d.results as T[];
  if (Array.isArray(d?.data)) return d.data as T[];
  return [];
}

/** أنماط صفحة أكاديمية موحّدة (جدول + شريط أدوات + نموذج إضافة) — لغة Nebras OS. */
export const ACADEMIC_PAGE_STYLES = `
  .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
  .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
  .search { flex: 1; min-width: 240px; height: 34px; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius); display: flex; align-items: center; padding: 0 12px; }
  .search input { flex: 1; border: none; background: transparent; outline: none; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); }
  .search input::placeholder { color: var(--nb-text-faint); }
  .add-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; align-items: end; animation: paneIn 220ms cubic-bezier(0.2,0,0,1); }
  @keyframes paneIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .add-form { animation: none; } }
  .fld { display: flex; flex-direction: column; gap: 5px; }
  .fld.req label::after { content: ' *'; color: var(--nb-danger); }
  .fld label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
  .fld input, .fld select { height: 36px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; transition: border-color 150ms ease, box-shadow 150ms ease; }
  .fld input:focus, .fld select:focus { border-color: var(--nb-primary-600); box-shadow: var(--nb-focus-ring); }
  .tbl { display: flex; flex-direction: column; }
  .tbl-head, .tbl-row { display: grid; gap: 8px; padding: 9px 16px; align-items: center; }
  .tbl-head { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); font-size: 11px; font-weight: 700; color: var(--nb-text-muted); padding: 8px 16px; }
  .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text); }
  .tbl-row:last-child { border-bottom: none; }
  .tbl-row:hover { background: var(--nb-surface-raised); }
  .strong { font-weight: 600; }
  .mono { font-variant-numeric: tabular-nums; color: var(--nb-text-secondary); }
  .row-actions { display: flex; gap: 6px; justify-content: flex-end; }
  .tbl-empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
  .nb-btn-ghost.sm, .nb-btn-danger.sm, .nb-btn-secondary.sm { height: 26px; padding: 0 12px; font-size: 12px; }
  .form-actions { display: flex; gap: 8px; }
  .hint { font-size: 12px; color: var(--nb-text-muted); margin: 8px 0 0; }
`;
