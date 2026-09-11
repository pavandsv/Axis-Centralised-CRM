// ---------------------------------------------------------------------------
// Lead assignment rules — from the Input Sheet tab "Assignment logic".
// "The system reads rules from top to bottom and stops at the first match."
//
// READING NOTE (worth raising with AFL): as written, rule 1 matches whenever the
// pincode resolves, so a strict first-match pass would mean rule 2 (round robin)
// never fires. The only coherent reading is that rule 1 covers a single mapped
// user and rule 2 selects among several — so rule 2 is implemented as the
// selection step inside a resolved pool, not as a separate branch.
// ---------------------------------------------------------------------------

import { TBC } from './roles.js'

export const ASSIGNMENT_RULES = [
  {
    no: 1,
    name: 'Standard geography match',
    condition: 'Lead pincode falls inside a mapped branch or region',
    allocateTo: 'Mapped DST or SO for that branch and product',
    ifNobodyAvailable: 'Park with the Sales Manager of that branch',
    whoCanReassign: ['SM', 'AH', 'RH', 'ZH', 'NH', 'BH', 'HO', 'PRODUCT_TEAM', 'SUPER'],
    remarks: '',
  },
  {
    no: 2,
    name: 'Round robin within team',
    condition: 'More than one user is mapped to the same branch and product',
    allocateTo: 'Next user in rotation',
    ifNobodyAvailable: 'Park with the Sales Manager',
    whoCanReassign: ['SM', 'AH', 'RH', 'ZH', 'NH', 'BH', 'HO', 'PRODUCT_TEAM', 'SUPER'],
    remarks: 'AFL to confirm: round robin or load based',
    open: true,
  },
  {
    no: 3,
    name: 'Out-of-geography lead (OGL)',
    condition: 'Pincode does not match any mapped branch or region',
    allocateTo: 'Park with the Zonal Head for manual allocation',
    ifNobodyAvailable: 'Escalate to the Vertical Head',
    whoCanReassign: ['ZH', 'NH'],
    remarks: 'From the approved scope',
  },
  {
    no: 4,
    name: 'Product specific routing',
    condition: 'Product belongs to a dedicated vertical team',
    allocateTo: 'Mapped vertical team member',
    ifNobodyAvailable: 'Park with the Vertical Head',
    whoCanReassign: ['NH', 'PRODUCT_TEAM'],
    remarks: 'AFL to share the product-to-team mapping',
    open: true,
  },
  {
    no: 5,
    name: 'User inactive or on leave',
    condition: 'Mapped user is marked inactive',
    allocateTo: TBC,
    ifNobodyAvailable: TBC,
    whoCanReassign: ['SM', 'AH', 'RH', 'ZH', 'NH', 'BH', 'HO', 'PRODUCT_TEAM', 'SUPER'],
    remarks: 'AFL to confirm whether an out-of-office reassignment is wanted',
    open: true,
  },
]

/**
 * Selection strategy inside a resolved pool. The sheet asks AFL to confirm round
 * robin vs load based; the MOM direction was round robin combined with date/time
 * sequencing and the current bucket count. `balanced` implements that direction
 * and is the default; the other two are switchable so AFL can see the difference.
 */
export const SELECTION_STRATEGY = {
  BALANCED: 'balanced', // fewest open leads, then longest-waiting — the MOM direction
  ROUND_ROBIN: 'roundRobin', // strict rotation, ignores current load
  LOAD_BASED: 'loadBased', // purely fewest open leads
}

export const DEFAULT_STRATEGY = SELECTION_STRATEGY.BALANCED

/**
 * Product → dedicated vertical team (rule 4). AFL still owes us this mapping, so
 * these two entries are illustrative only and are labelled as such in the UI.
 */
export const VERTICAL_TEAM_PRODUCTS = {
  'Lease Rental Discounting': { team: 'LRD Vertical', illustrative: true },
  'Loan Against Securities': { team: 'Capital Markets Vertical', illustrative: true },
}

/** Open Point 9 — "Ageing and escalation day counts for each status": 3 days. */
export const AGEING_DAYS = 3
