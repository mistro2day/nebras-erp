/**
 * أنماط موحّدة لمساحة عمل الأتمتة (Automation Studio) — دعم RTL والوضع الداكن.
 * تُستورد داخل styles لكل مكوّن للحفاظ على تناسق التصميم.
 */
export const STUDIO_STYLES = `
  :host { display: block; font-family: 'Cairo', sans-serif; }
  .studio { padding: 1.5rem; background: #0f172a; color: #f8fafc; min-height: 100vh; }
  .studio-header { margin-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 1rem;
    display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .studio-header h1 { font-size: 1.9rem; font-weight: 800; margin: 0;
    background: linear-gradient(to left, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .studio-header p { color: #94a3b8; margin: 4px 0 0; font-size: .9rem; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1.25rem; margin-bottom: 2rem; }
  .stat-card { background: #1e293b; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.1rem;
    display: flex; align-items: center; gap: 1rem; transition: transform .15s ease, border-color .15s ease; }
  .stat-card:hover { transform: translateY(-2px); border-color: rgba(129,140,248,0.4); }
  .stat-card mat-icon { font-size: 30px; width: 30px; height: 30px; padding: 8px; border-radius: 12px;
    background: rgba(129,140,248,0.15); color: #a5b4fc; }
  .stat-card h3 { font-size: .72rem; color: #94a3b8; margin: 0; }
  .stat-card .value { font-size: 1.5rem; font-weight: bold; margin: 2px 0 0; }
  .nav-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; }
  .nav-card { background: #1e293b; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.4rem;
    cursor: pointer; text-decoration: none; color: inherit; display: block; transition: all .15s ease; }
  .nav-card:hover { transform: translateY(-3px); border-color: rgba(56,189,248,0.5); box-shadow: 0 10px 30px rgba(2,6,23,.5); }
  .nav-card mat-icon { font-size: 34px; width: 34px; height: 34px; color: #38bdf8; margin-bottom: .6rem; }
  .nav-card h2 { font-size: 1.1rem; margin: 0 0 .4rem; }
  .nav-card p { color: #94a3b8; font-size: .82rem; margin: 0; line-height: 1.5; }
  .section-title { font-size: 1.2rem; font-weight: bold; margin: 1.5rem 0 1rem; color: #cbd5e1; }
  table.data { width: 100%; border-collapse: collapse; text-align: right; background: #1e293b;
    border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; }
  table.data th { background: rgba(15,23,42,.5); padding: 12px 16px; font-size: .8rem; color: #94a3b8; }
  table.data td { padding: 12px 16px; font-size: .84rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .badge { font-size: .7rem; padding: 3px 9px; border-radius: 9999px; font-weight: 700; }
  .badge.active, .badge.published, .badge.success, .badge.healthy, .badge.enabled { background: rgba(16,185,129,.18); color: #34d399; }
  .badge.draft, .badge.paused, .badge.pending, .badge.unknown { background: rgba(245,158,11,.18); color: #fbbf24; }
  .badge.failed, .badge.down, .badge.blocked, .badge.disabled { background: rgba(239,68,68,.18); color: #f87171; }
  .no-data { text-align: center; padding: 2.5rem !important; color: #94a3b8; }
  button.pill { background: rgba(56,189,248,.15); color: #38bdf8; border: none; border-radius: 8px;
    padding: 6px 14px; cursor: pointer; font-family: inherit; font-size: .8rem; font-weight: 600; }
  button.pill:hover { background: rgba(56,189,248,.28); }
  code { background: rgba(148,163,184,.12); padding: 1px 6px; border-radius: 4px; font-size: .8rem; }
`;
