# Axis Finance — CRM Lead-to-Closure (React mockup)

Front-end-only recreation of the Axis Finance CRM mockup. **No backend.** Every
number, funnel, chart and role-based view is derived at runtime from one seed
dataset, so the prototype behaves like a real system during a client walkthrough.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
```

## Sign-in

There are no passwords — the login screen lists eight demo profiles, one per
role. Pick one and the whole app re-scopes to that role.

| Profile | Role | Sees |
| --- | --- | --- |
| Arjun Mehta | DST | Own leads only (7) |
| Priya Sharma | DST | Own leads only (4) |
| Rahul Verma | SM | 3 DSTs — 12 leads |
| Anita Desai | ASM | 2 SMs — cluster roll-up |
| Vikram Rao | RSM | Region roll-up |
| Sunita Krishnan | ZSM | Zone roll-up |
| Rajesh Kapoor | BH | National, **read-only** |
| Shreya Iyer | Admin | Everything + system administration |

## Structure

```
src/
  data/
    mockData.js       Seed dataset + role-scoped selectors (single source of truth)
    permissions.js    §9.3 permission matrix as predicates, visibility rules
  context/
    AuthContext.jsx   Current user + per-user notification feed
  components/
    Layout, Sidebar, Topbar    App shell; sidebar nav is role-driven
    StatCard, Badges           KPI tile, status/product/SLA/role badges
    CallNotesForm              Call-notes capture + status transition rules
    charts/                    Recharts wrappers (trend, funnel, donut, gauge)
    modals/                    Add/edit/deactivate user, territory, promo code,
                               bulk upload, assign lead, create task
  pages/
    Login
    DashboardDST      Personal pipeline, SLA score, today's actions
    DashboardSM       Team escalations, dormant/stale, leaderboard, SLA by DST
    DashboardManager  ASM / RSM / ZSM / BH variants
    DashboardAdmin    7 tabs: overview, users, permissions, product variants,
                      territory master, promo codes, campaigns
    Leads             Table + drag-and-drop kanban, filters, global search
    LeadDetail        Overview / call notes / timeline / documents / 13-field gate
    Analytics         MTD · Q2 FY26 · FY26 with role-aware totals
    Tasks             Priority-grouped tasks, create/complete
    Audit             Severity-filtered immutable audit trail
```

## How the business logic works (all client-side)

- **Role scoping** — `getLeadsForUser(user)` walks the reporting chain
  (ZSM → RSM → ASM → SM → DST) and returns only that slice. The same dashboard
  code runs for every role; only the data slice and visible modules differ.
- **Permissions** — `permissions.js` gates actions per role: only a DST can enter
  a Loan Application Number, only SM and above can reassign or override Dormant,
  only Admin manages users and the territory master, BH is read-only.
- **SLA escalation** — `slaBreached` + `escalationLevel` drive the badge chain
  (Breached → SM Alerted → ASM Alerted → RSM Alerted) and the alert panels.
- **13-field gate** — the Logged-In gate marks each field valid, missing, or N/A
  based on product and employment type.
- **Stage changes** — dragging a kanban card or saving call notes updates the
  lead in component state; counts and charts recompute from it.

State lives in React only, so a page refresh resets the demo to the seed data.

## Design tokens

Brand maroon `#861D3F` (hover `#A42B55`, tint `#FDF0F4`), app background
`#F2F5FA`, border `#E4E9F2`. Component classes (`card`, `stat-card`,
`btn-primary`, `nav-item`, `badge-status`, `tbl-row`, `section-title`,
`input-field`) are defined in `src/index.css`; palette tokens in
`tailwind.config.js`.

## Dataset

16 leads across 4 products and 4 cities, 12 users spanning the full hierarchy,
18 audit events, 9 tasks, 6 campaigns, 3 BTL promo codes, 9 territory pincodes
(1 deliberately unallocated), 14 rejection reason codes, 8 product variants,
and a 15-row permission matrix.
