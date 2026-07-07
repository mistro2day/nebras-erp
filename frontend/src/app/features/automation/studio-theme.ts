/**
 * أنماط موحّدة لمساحة عمل الأتمتة (Automation Studio) — دعم RTL والوضع الداكن.
 * تُستورد داخل styles لكل مكوّن للحفاظ على تناسق التصميم.
 */
export const STUDIO_STYLES = `
  :host { display: block; font-family: var(--nb-font-family); }
  .studio { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; background: var(--nb-bg); color: var(--nb-text); }
  .studio-header { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--nb-border);
    display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .studio-header h1 { font-size: 18px; font-weight: 700; margin: 0; color: var(--nb-text); }
  .studio-header p { color: var(--nb-text-muted); margin: 4px 0 0; font-size: 12px; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .stat-card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 14px;
    display: flex; align-items: center; gap: 12px; }
  .stat-card mat-icon { font-size: 24px; width: 24px; height: 24px; padding: 8px; border-radius: var(--nb-radius);
    background: var(--nb-primary-50); color: var(--nb-primary-600); }
  .stat-card h3 { font-size: 12px; color: var(--nb-text-muted); margin: 0; }
  .stat-card .value { font-size: 20px; font-weight: 700; margin: 2px 0 0; color: var(--nb-text); }
  .nav-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
  .nav-card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 16px;
    cursor: pointer; text-decoration: none; color: inherit; display: block; transition: border-color .15s ease, box-shadow .15s ease; }
  .nav-card:hover { border-color: var(--nb-primary-300); box-shadow: var(--nb-shadow-card); }
  .nav-card mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--nb-primary-600); margin-bottom: 8px; }
  .nav-card h2 { font-size: 14px; font-weight: 700; margin: 0 0 6px; color: var(--nb-text); }
  .nav-card p { color: var(--nb-text-muted); font-size: 12px; margin: 0; line-height: 1.5; }
  .section-title { font-size: 14px; font-weight: 700; margin: 16px 0 12px; color: var(--nb-text); }
  table.data { width: 100%; border-collapse: collapse; text-align: right; background: var(--nb-surface);
    border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); overflow: hidden; }
  table.data th { background: var(--nb-surface-raised); padding: 8px 16px; font-size: 11px; font-weight: 700; color: var(--nb-text-muted);
    border-bottom: 1px solid var(--nb-border-soft); }
  table.data td { padding: 10px 16px; font-size: 13px; color: var(--nb-text); border-bottom: 1px solid var(--nb-border-row); }
  .badge { font-size: 11px; padding: 2px 8px; border-radius: var(--nb-radius-pill); font-weight: 600; }
  .badge.active, .badge.published, .badge.success, .badge.healthy, .badge.enabled { background: var(--nb-success-bg); color: var(--nb-success); }
  .badge.draft, .badge.paused, .badge.pending, .badge.unknown { background: var(--nb-warning-bg); color: var(--nb-warning); }
  .badge.failed, .badge.down, .badge.blocked, .badge.disabled { background: var(--nb-danger-bg); color: var(--nb-danger); }
  .no-data { text-align: center; padding: 28px !important; color: var(--nb-text-muted); }
  button.pill { background: var(--nb-primary-600); color: var(--nb-on-primary); border: none; border-radius: var(--nb-radius);
    padding: 0 14px; height: 32px; cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 600; }
  button.pill:hover { background: var(--nb-primary-hover); }
  code { background: var(--nb-surface-raised); color: var(--nb-text-secondary); padding: 1px 6px; border-radius: var(--nb-radius-sm); font-size: 12px; }
`;
