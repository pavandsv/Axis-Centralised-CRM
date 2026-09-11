# Lead Module — dummy dataset

Generated from the client's **Lead Module Fields** sheet. No backend: these files
are the source of truth and every dashboard/analytics figure is derived from them
at runtime.

Regenerate (deterministic — same seed, same data every time):

```bash
node scripts/generate-dataset.mjs     # writes src/data/generated/* + exports/*.csv
node scripts/validate-dataset.mjs     # asserts all 31 spec rules + integrity
```

## Files

| File | Contents |
| --- | --- |
| `src/data/masters.js` | Every dropdown: sources, portfolios, 26 products, statuses, 26 reason codes, occupations, PAN masking |
| `src/data/geography.js` | 51 branches, 257 real pincodes → district/city/state/branch/region/zone, plus 3 deliberately unmapped pincodes |
| `src/data/generated/org.js` | 158-user hierarchy: BH → 4 ZSM → 10 RSM → 20 ASM → 51 SM → 71 DST + Admin |
| `src/data/generated/campaigns.js` | 40 campaigns with budget, channel, theme, month |
| `src/data/generated/leads.js` | **1,500 leads**, all 31 spec fields + timeline |
| `src/data/leadModule.js` | Role scoping + all derived aggregates |
| `exports/axis-leads-dummy-data.csv` | The same 1,500 leads as CSV, in your spreadsheet's column order |

## Field mapping (your sheet → generated data)

| # | Your field label | Property | How it's generated |
| --- | --- | --- | --- |
| 1 | Lead first name | `firstName` | Region-appropriate Indian names — a Chennai lead reads Tamil, a Kolkata lead Bengali |
| 2 | Lead last name | `lastName` | as above |
| 3 | Lead ID | `leadId` | `AFL-RET-000001` … `AFL-RET-001500`, sequential — **format needs your confirmation** |
| 4 | Lead Source | `leadSource` | Website 31% · Landing page 28% · Social media 24% · PQ Campaign 17% |
| 5 | Campaign name | `campaignName` | Lookup into the campaign master, e.g. "Shubh Vivah DEC25" |
| 6 | Campaign ID | `campaignId` | `CMP-2025-0011` — auto-generated in the master, looked up here |
| 7 | Lead Created Date | `leadCreatedDate` | Spread over 12 months (Oct 2025 – 10 Sep 2026), business hours, gentle growth trend |
| 8 | UCIC | `ucic` | 9-digit, on 43% of leads. **Every PQ Campaign lead has one** (pre-qualified from the existing base) |
| 9 | Mobile Number | `mobileNumber` | 10 digits, starts 6–9, unique across all 1,500. `alternateMobile` on ~30% |
| 10 | Email ID | `emailId` | Derived from the name; blank on ~8% (field is optional) |
| 11 | Date of Birth | `dateOfBirth` | Age consistent with occupation — students 21–26, pensioners 58–70 |
| 12 | PAN | `panNumber`, `panAttachment` | Valid PAN shape + a filename/date. Present on every lead past Login Initiated |
| 13 | City | `city` | **Derived from pincode** |
| 14 | District | `district` | **Derived from pincode** |
| 15 | State | `state` | **Derived from pincode** — 17 states |
| 16 | Pincode | `pincode` | Real 6-digit pincodes; the routing key for everything below |
| 17 | Country | `country` | India |
| 18 | Portfolio | `portfolio` | 7 portfolios; annual mix held close to the target weights (see Portfolio mix below) |
| 19 | Product | `product`, `productCode` | 26 loan schemes — Diwali Special, Education, Marriage, Medical Emergency, Travel, Gold, Vyapar, LAP, Home Purchase … |
| 20 | Offer Amount | `offerAmount` | Inside the product's real ticket band, skewed to smaller tickets, rounded sensibly |
| 21 | Offer Valid Till | `offerValidTill` | Created + 30/45/60 days (derived, not an input) |
| 22 | Assigned To | `assignedTo`, `assignedToName` | Round-robin among the DSTs mapped to that pincode's branch |
| 23 | Region / Zone / Branch | `branch`, `region`, `zone`, `branchCode` | **Derived from pincode**, per your remark |
| 24 | Lead Status | `leadStatus` | Your 9 values. Mix depends on lead age — fresh leads are open, old leads resolved |
| 25 | Reason | `reasonCode`, `reason` | Always present for Rejected and Not interested; also filled for Not reachable and Duplicate |
| 26 | Next Follow-up Date | `nextFollowUpDate` | Only on Follow-up leads. Some deliberately overdue, so the Tasks screen has real work |
| 27 | LAN No. | `lanNo` | `AFLRET26000123`. Only on Sanctioned and Disbursed |
| 28 | *(label was cut off)* | `statusUpdatedOn` | **Assumed "Status Updated On"** — read off the last timeline event. Please confirm the intended label |
| 29 | Duplicate Flag | `duplicateFlag` | Yes/No, always agrees with the Duplicate status (1.2% of leads) |
| 30 | Last Modified By and On | `lastModifiedBy`, `lastModifiedOn` | Taken from the last timeline event, so the audit trail matches the history tab |
| 31 | Occupation | `occupation` | 10 values, and always one the chosen product actually accepts |

Supporting fields beyond your list: `employmentType`, `smId`/`asmId`/`rsmId`/`zsmId`
(the reporting chain), `firstResponseHours`, `slaBreached`, `contacted`,
`isUnallocated`, `monthLabel`, `consentFlag`, and `timeline[]` (the lead history).

## What the numbers look like

| Metric | Value |
| --- | --- |
| Leads | 1,500 over 12 months (Oct 2025 – 10 Sep 2026) |
| Contact rate | 60.4% (see open question 3) |
| Login Initiated or better | 27.2% |
| Disbursal rate | 16.2% |
| Total offer value | ₹621 Cr |
| Disbursed value | ₹109.2 Cr |
| Average disbursed ticket | ₹44.9 L |
| SLA compliance (≤2 hr first contact) | 75.6% overall, ranging 63.3%–82.4% by month |
| Average first response | 1.9 hrs |
| Unallocated (pincode unmapped) | 20 leads |
| Duplicates flagged | 18 leads |
| Leads carrying a LAN | 345 |
| Leads carrying a UCIC | 639 |

Status mix: New 2% · Not reachable 9% · Not interested 27% · Follow-up 6% · Login Initiated 4% · Sanctioned 7% · Disbursed 16% · Rejected 27% · Duplicate 1%.

Portfolio mix: Retail Personal Loans 34.7% / Retail Home Loans 20.2% / Business & MSME Loans 17.6% / Loan Against Property 11% / Vehicle & Consumer Loans 8% / Gold & Secured Loans 5.7% / Professional Loans 2.8%.

## Deliberate realism

- **Seasonality.** Diwali Special peaks Oct–Nov and nearly vanishes off-season;
  Education peaks May–Aug; Marriage peaks Dec–Feb and Apr–May; Vyapar/Working
  Capital peak Jan–Mar for financial year-end; Gold peaks at Akshaya Tritiya.
  Seasonal weights are normalised so this never distorts the annual portfolio mix.
- **Uneven performance.** Each branch has a volume weight and each DST a skill
  multiplier, so leaderboards, conversion rates and SLA scores genuinely differ.
- **SLA that drifts, with real noise.** Response times improve across the year
  (roughly 70% → 78% compliance) but individual months swing, because monthly
  volumes are small and weak DSTs carry most of the breaches. The story lives in
  the who-is-breaching drill-down, not in a suspiciously smooth line.
- **Broken-data cases on purpose.** 20 leads sit on unmapped pincodes for the
  Unallocated Queue, some follow-ups are overdue, and weak DSTs carry visible
  SLA breaches.

## Open questions

1. **Field 28** — the label was cut off in the screenshot. Assumed *Status Updated On*.
2. **Lead ID format** — using `AFL-RET-000001` from your example. Confirm the prefix and width.
3. **Contact rate definition** — your remark says capture NI, FU, Q, LI as contacted.
   Taken literally that gives **60.4%**. Including Rejected (arguably post-contact,
   since it reached credit) gives **87.1%**. Which do you want on the dashboard?
4. **Alternate mobile** — you asked whether it's needed. Generated on ~30% of leads;
   drop it if not required.
5. **PAN masking** — you asked whether to mask for lower roles. `maskPan()` and
   `PAN_MASKED_FOR_ROLES` are in place, currently masking for DST only.
6. **State / District master** — the sheet says AFL will provide. I've used 17 real
   states and 43 districts; swap in the official master when it arrives.
7. **Lead Source = API** — if any source is an API feed, we need endpoint, method,
   auth and payload as your remark notes.
8. **Portfolio values** — I inferred 7 portfolios. Confirm against the CRM master.
