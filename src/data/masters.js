// ---------------------------------------------------------------------------
// Lead Module — dropdown masters
// Every picklist in the Lead Module Fields spec lives here, so the client can
// review/extend values in one place. No backend: these ARE the masters.
// ---------------------------------------------------------------------------

/** Field 3 — Lead ID. Auto number, system generated, not editable. */
export const LEAD_ID_PREFIX = 'AFL-RET-'
export const formatLeadId = (n) => `${LEAD_ID_PREFIX}${String(n).padStart(6, '0')}`

/** Field 4 — Lead Source. */
export const LEAD_SOURCES = ['Website', 'Social media', 'PQ Campaign', 'Landing page']

/** Field 17 — Country. */
export const COUNTRIES = ['India']

/** Field 18 — Portfolio (the product grouping Product rolls up to). */
export const PORTFOLIOS = [
  'Retail Personal Loans',
  'Retail Home Loans',
  'Loan Against Property',
  'Business & MSME Loans',
  'Vehicle & Consumer Loans',
  'Gold & Secured Loans',
  'Professional Loans',
]

/**
 * Field 19 — Product (the loan scheme).
 * ticket = offer amount band in ₹; season = months (0-11) where demand spikes.
 */
export const PRODUCTS = [
  // Retail Personal Loans
  { name: 'Diwali Special Loan',        code: 'DIW', portfolio: 'Retail Personal Loans',    ticket: [50000, 500000],      tenure: '12–36 mo',  roi: '11.5%–16.0%', employment: ['Salaried', 'Self-Employed'], season: [9, 10] },
  { name: 'Education Loan',             code: 'EDU', portfolio: 'Retail Personal Loans',    ticket: [100000, 2500000],    tenure: '36–84 mo',  roi: '9.5%–13.5%',  employment: ['Salaried', 'Self-Employed'], season: [4, 5, 6, 7] },
  { name: 'Marriage Loan',              code: 'MRG', portfolio: 'Retail Personal Loans',    ticket: [200000, 2000000],    tenure: '24–60 mo',  roi: '11.0%–15.5%', employment: ['Salaried', 'Self-Employed'], season: [10, 11, 0, 1, 3, 4] },
  { name: 'Medical Emergency Loan',     code: 'MED', portfolio: 'Retail Personal Loans',    ticket: [50000, 1500000],     tenure: '12–48 mo',  roi: '11.0%–15.0%', employment: ['Salaried', 'Self-Employed'], season: [] },
  { name: 'Travel Loan',                code: 'TRV', portfolio: 'Retail Personal Loans',    ticket: [50000, 800000],      tenure: '12–36 mo',  roi: '12.0%–16.5%', employment: ['Salaried'],                  season: [2, 3, 9] },
  { name: 'Home Renovation Loan',       code: 'HRN', portfolio: 'Retail Personal Loans',    ticket: [100000, 1500000],    tenure: '24–60 mo',  roi: '10.5%–14.5%', employment: ['Salaried', 'Self-Employed'], season: [8, 9, 10] },
  { name: 'Debt Consolidation Loan',    code: 'DBC', portfolio: 'Retail Personal Loans',    ticket: [200000, 2500000],    tenure: '36–60 mo',  roi: '11.5%–15.0%', employment: ['Salaried'],                  season: [] },
  { name: 'Kushal Personal Loan',       code: 'KPL', portfolio: 'Retail Personal Loans',    ticket: [50000, 5000000],     tenure: '12–60 mo',  roi: '10.5%–16.0%', employment: ['Salaried'],                  season: [] },

  // Retail Home Loans
  { name: 'Home Purchase Loan',         code: 'HPL', portfolio: 'Retail Home Loans',        ticket: [1500000, 20000000],  tenure: '120–300 mo', roi: '8.5%–10.5%',  employment: ['Salaried', 'Self-Employed'], season: [8, 9, 10] },
  { name: 'Disha Home Loan',            code: 'DHL', portfolio: 'Retail Home Loans',        ticket: [500000, 10000000],   tenure: '120–240 mo', roi: '9.0%–12.0%',  employment: ['Salaried', 'Self-Employed'], season: [] },
  { name: 'Plot + Construction Loan',   code: 'PCL', portfolio: 'Retail Home Loans',        ticket: [1000000, 15000000],  tenure: '120–240 mo', roi: '9.0%–11.5%',  employment: ['Salaried', 'Self-Employed'], season: [] },
  { name: 'Home Loan Balance Transfer', code: 'HBT', portfolio: 'Retail Home Loans',        ticket: [2000000, 25000000],  tenure: '120–300 mo', roi: '8.4%–10.0%',  employment: ['Salaried', 'Self-Employed'], season: [] },

  // Loan Against Property
  { name: 'Loan Against Property',      code: 'LAP', portfolio: 'Loan Against Property',    ticket: [2500000, 50000000],  tenure: '60–180 mo', roi: '9.5%–13.0%',  employment: ['Salaried', 'Self-Employed'], season: [] },
  { name: 'MLAP (Shakti)',              code: 'MLP', portfolio: 'Loan Against Property',    ticket: [500000, 7500000],    tenure: '60–144 mo', roi: '11.0%–15.0%', employment: ['Self-Employed'],             season: [] },
  { name: 'Lease Rental Discounting',   code: 'LRD', portfolio: 'Loan Against Property',    ticket: [5000000, 100000000], tenure: '60–180 mo', roi: '9.0%–12.0%',  employment: ['Self-Employed'],             season: [] },

  // Business & MSME
  { name: 'Vyapar Business Loan',       code: 'VBL', portfolio: 'Business & MSME Loans',    ticket: [500000, 7500000],    tenure: '12–48 mo',  roi: '13.0%–18.0%', employment: ['Self-Employed'],             season: [0, 1, 2] },
  { name: 'Working Capital Loan',       code: 'WCL', portfolio: 'Business & MSME Loans',    ticket: [1000000, 25000000],  tenure: '12–36 mo',  roi: '12.0%–16.5%', employment: ['Self-Employed'],             season: [0, 1, 2] },
  { name: 'Machinery Purchase Loan',    code: 'MPL', portfolio: 'Business & MSME Loans',    ticket: [1000000, 20000000],  tenure: '24–72 mo',  roi: '11.5%–15.5%', employment: ['Self-Employed'],             season: [] },
  { name: 'MSME Growth Loan',           code: 'MSG', portfolio: 'Business & MSME Loans',    ticket: [500000, 10000000],   tenure: '24–60 mo',  roi: '12.5%–17.0%', employment: ['Self-Employed'],             season: [] },

  // Vehicle & Consumer
  { name: 'Two-Wheeler Loan',           code: 'TWL', portfolio: 'Vehicle & Consumer Loans', ticket: [40000, 250000],      tenure: '12–36 mo',  roi: '13.0%–19.0%', employment: ['Salaried', 'Self-Employed'], season: [9, 10] },
  { name: 'Used Car Loan',              code: 'UCL', portfolio: 'Vehicle & Consumer Loans', ticket: [200000, 2500000],    tenure: '24–60 mo',  roi: '12.0%–16.5%', employment: ['Salaried', 'Self-Employed'], season: [9, 10, 2] },
  { name: 'Consumer Durable Loan',      code: 'CDL', portfolio: 'Vehicle & Consumer Loans', ticket: [15000, 300000],      tenure: '6–24 mo',   roi: '13.0%–20.0%', employment: ['Salaried'],                  season: [9, 10] },

  // Gold & Secured
  { name: 'Gold Loan',                  code: 'GLD', portfolio: 'Gold & Secured Loans',     ticket: [25000, 2000000],     tenure: '6–24 mo',   roi: '10.0%–16.0%', employment: ['Salaried', 'Self-Employed'], season: [9, 10, 3] },
  { name: 'Loan Against Securities',    code: 'LAS', portfolio: 'Gold & Secured Loans',     ticket: [500000, 10000000],   tenure: '12–36 mo',  roi: '10.5%–14.0%', employment: ['Salaried', 'Self-Employed'], season: [] },

  // Professional
  { name: 'Doctor Professional Loan',   code: 'DPL', portfolio: 'Professional Loans',       ticket: [500000, 7500000],    tenure: '24–72 mo',  roi: '11.0%–15.0%', employment: ['Self-Employed'],             season: [] },
  { name: 'CA / Professional Loan',     code: 'CPL', portfolio: 'Professional Loans',       ticket: [300000, 5000000],    tenure: '24–60 mo',  roi: '11.5%–15.5%', employment: ['Self-Employed'],             season: [] },
]

export const PRODUCT_NAMES = PRODUCTS.map((p) => p.name)

/** Field 24 — Lead Status. Exactly the spec list, in funnel order. */
export const LEAD_STATUSES = [
  'New',
  'Not reachable',
  'Not interested',
  'Follow-up',
  'Login Initiated',
  'Sanctioned',
  'Disbursed',
  'Rejected',
  'Duplicate',
]

/**
 * Spec remark on field 24: "Capture NI, FU, Q, LI under contacted via backend."
 * These four statuses all mean the customer was successfully contacted, so
 * contact-rate reporting rolls them up.
 */
export const CONTACTED_STATUSES = ['Not interested', 'Follow-up', 'Login Initiated', 'Sanctioned', 'Disbursed']
export const OPEN_STATUSES = ['New', 'Not reachable', 'Follow-up', 'Login Initiated', 'Sanctioned']
export const CLOSED_STATUSES = ['Disbursed', 'Rejected', 'Not interested', 'Duplicate']

export const STATUS_SHORT = {
  New: 'NEW',
  'Not reachable': 'NR',
  'Not interested': 'NI',
  'Follow-up': 'FU',
  'Login Initiated': 'LI',
  Sanctioned: 'Q',
  Disbursed: 'DISB',
  Rejected: 'REJ',
  Duplicate: 'DUP',
}

/** Field 25 — Reason. Mandatory when status is Not interested or Rejected. */
export const REASONS = [
  // Not interested
  { code: 'NI-01', label: 'Rate of interest too high',            appliesTo: ['Not interested'] },
  { code: 'NI-02', label: 'Already availed loan elsewhere',       appliesTo: ['Not interested'] },
  { code: 'NI-03', label: 'Only enquiring — no current need',     appliesTo: ['Not interested'] },
  { code: 'NI-04', label: 'Requirement postponed',                appliesTo: ['Not interested'] },
  { code: 'NI-05', label: 'Processing fee not acceptable',        appliesTo: ['Not interested'] },
  { code: 'NI-06', label: 'Family / spouse declined',             appliesTo: ['Not interested'] },
  { code: 'NI-07', label: 'Tenure offered not suitable',          appliesTo: ['Not interested'] },
  // Rejected
  { code: 'REJ-01', label: 'Credit / bureau issue (CIBIL below cut-off)', appliesTo: ['Rejected'] },
  { code: 'REJ-02', label: 'Income below minimum',                appliesTo: ['Rejected'] },
  { code: 'REJ-03', label: 'Policy restriction',                  appliesTo: ['Rejected'] },
  { code: 'REJ-04', label: 'Negative / restricted profile',       appliesTo: ['Rejected'] },
  { code: 'REJ-05', label: 'OGL — outside the geo location',      appliesTo: ['Rejected'] },
  { code: 'REJ-06', label: 'Documentation — unable to provide',   appliesTo: ['Rejected'] },
  { code: 'REJ-07', label: 'Existing obligations too high (FOIR)', appliesTo: ['Rejected'] },
  { code: 'REJ-08', label: 'Employer / company not approved',     appliesTo: ['Rejected'] },
  { code: 'REJ-09', label: 'Property title not clear',            appliesTo: ['Rejected'] },
  { code: 'REJ-10', label: 'Technical valuation below expectation', appliesTo: ['Rejected'] },
  { code: 'REJ-11', label: 'Business vintage below minimum',      appliesTo: ['Rejected'] },
  { code: 'REJ-12', label: 'GST / ITR not available',             appliesTo: ['Rejected'] },
  { code: 'REJ-13', label: 'Others',                              appliesTo: ['Rejected'] },
  // Duplicate
  { code: 'DUP-01', label: 'Same campaign, same mobile',          appliesTo: ['Duplicate'] },
  { code: 'DUP-02', label: 'Same LAN already sourced',            appliesTo: ['Duplicate'] },
  { code: 'DUP-03', label: 'Same customer, different campaign',   appliesTo: ['Duplicate'] },
  // Not reachable
  { code: 'NR-01', label: 'Number switched off / unreachable',    appliesTo: ['Not reachable'] },
  { code: 'NR-02', label: 'Invalid / wrong number',               appliesTo: ['Not reachable'] },
  { code: 'NR-03', label: 'No response after 3 attempts',         appliesTo: ['Not reachable'] },
]

/** Field 31 — Occupation. */
export const OCCUPATIONS = [
  'Salaried — Private Sector',
  'Salaried — Government / PSU',
  'Salaried — MNC',
  'Self-Employed Professional',
  'Self-Employed Non-Professional',
  'Business Owner',
  'Retired / Pensioner',
  'Homemaker',
  'Student',
  'Agriculturist',
]

/** Occupation → employment class, used for product eligibility. */
export const OCCUPATION_EMPLOYMENT = {
  'Salaried — Private Sector': 'Salaried',
  'Salaried — Government / PSU': 'Salaried',
  'Salaried — MNC': 'Salaried',
  'Self-Employed Professional': 'Self-Employed',
  'Self-Employed Non-Professional': 'Self-Employed',
  'Business Owner': 'Self-Employed',
  'Retired / Pensioner': 'Salaried',
  Homemaker: 'Self-Employed',
  Student: 'Salaried',
  Agriculturist: 'Self-Employed',
}

/** Field 12 — PAN. Masked for roles below the owning SM (spec asks to confirm). */
export const PAN_MASKED_FOR_ROLES = ['DST']
export const maskPan = (pan) => (pan ? `${pan.slice(0, 3)}XXXX${pan.slice(-1)}` : '')
