// ---------------------------------------------------------------------------
// Role hierarchy, data visibility and the permission matrix.
//
// Transcribed VERBATIM from the AFL Requirement Input Sheet
// (tabs: "Hierarchy" and "Role Permissions"). This file is the single source of
// truth for access control — no screen hardcodes a role check.
//
// Items the sheet marks "To be confirmed by AFL" are encoded as TBC rather than
// guessed, so the POC can show them as pending instead of inventing an answer.
// ---------------------------------------------------------------------------

/** Marker for a cell AFL has not yet confirmed. */
export const TBC = 'TBC'

/**
 * Visibility scopes, from narrowest to widest. `rank` drives "and everyone below".
 */
export const SCOPE = {
  OWN: 'own', // own leads only
  TEAM: 'team', // own team
  AREA: 'area', // own area and everyone below
  REGION: 'region', // own region and everyone below
  ZONE: 'zone', // own zone and everyone below
  ORG: 'org', // entire organisation / pan organisation
  NONE: 'none', // no customer data at all
}

/**
 * The eleven roles. `level` mirrors the sheet's Level column (null for the
 * central/support roles that sit outside the sales line).
 */
export const ROLES = {
  BH: {
    code: 'BH',
    level: 1,
    name: 'Business Head',
    designation: 'Business Head',
    reportsTo: null,
    scope: SCOPE.ORG,
    canAllocateLeads: false,
    remarks: 'Own data, hierarchy wise',
  },
  NH: {
    code: 'NH',
    level: 2,
    name: 'National Head',
    designation: 'National Head / National Sales Manager (Vertical Head)',
    reportsTo: 'BH',
    scope: SCOPE.ORG,
    canAllocateLeads: false,
  },
  ZH: {
    code: 'ZH',
    level: 3,
    name: 'Zonal Head',
    designation: 'Zonal Head / Zonal Sales Manager',
    reportsTo: 'NH',
    scope: SCOPE.ZONE,
    canAllocateLeads: true,
    remarks: 'Also handles out-of-geography (OGL) leads',
  },
  RH: {
    code: 'RH',
    level: 4,
    name: 'Regional Head',
    designation: 'Regional Head / Regional Sales Manager',
    reportsTo: 'ZH',
    scope: SCOPE.REGION,
    canAllocateLeads: TBC,
  },
  AH: {
    code: 'AH',
    level: 5,
    name: 'Area Head',
    designation: 'Area Head / Area Sales Manager',
    reportsTo: 'RH',
    scope: SCOPE.AREA,
    canAllocateLeads: TBC,
  },
  SM: {
    code: 'SM',
    level: 6,
    name: 'Sales Manager',
    designation: 'Sales Manager / Sales Officer',
    reportsTo: 'AH',
    scope: SCOPE.TEAM,
    canAllocateLeads: TBC,
  },
  DST: {
    code: 'DST',
    level: 7,
    name: 'Direct Sales Team',
    designation: 'Direct Sales Team',
    reportsTo: 'SM',
    scope: SCOPE.OWN,
    canAllocateLeads: false,
    remarks: 'Own leads only',
  },
  HO: {
    code: 'HO',
    level: null,
    name: 'Head Office',
    designation: 'HO — central designations',
    reportsTo: TBC,
    scope: SCOPE.ORG,
    canAllocateLeads: TBC,
    central: true,
    remarks: 'AFL to list the exact designations. 8–9 users on differing product entitlements',
  },
  PRODUCT_TEAM: {
    code: 'PRODUCT_TEAM',
    // AFL's own code is too long for a badge pill; every other role is <= 5
    // characters, so only this one needs an abbreviation.
    short: 'PROD',
    level: null,
    name: 'Product Team',
    designation: 'Central product team',
    reportsTo: TBC,
    scope: SCOPE.ORG,
    canAllocateLeads: true,
    central: true,
    remarks: 'Uploads campaign data',
  },
  IT: {
    code: 'IT',
    level: null,
    name: 'IT Team',
    designation: 'AFL IT',
    reportsTo: TBC,
    scope: SCOPE.NONE,
    canAllocateLeads: false,
    central: true,
    remarks: 'No customer data — audit and config only',
  },
  SUPER: {
    code: 'SUPER',
    level: null,
    name: 'Super User',
    designation: 'Super User',
    reportsTo: null,
    scope: SCOPE.ORG,
    canAllocateLeads: true,
    central: true,
    remarks: 'Full access including UAM',
  },
}

export const ROLE_CODES = Object.keys(ROLES)

/** The sales reporting line, top down. Central roles sit outside it. */
export const SALES_LINE = ['BH', 'NH', 'ZH', 'RH', 'AH', 'SM', 'DST']

/**
 * The eleven permission actions, in the sheet's column order.
 * `pii` marks the action that the DPDP restriction applies to.
 */
export const ACTIONS = [
  { key: 'viewOwnLeads', label: 'View own leads' },
  { key: 'viewTeamLeads', label: 'View team leads' },
  { key: 'createLeadManually', label: 'Create lead manually' },
  { key: 'editLead', label: 'Edit lead' },
  { key: 'reassignLead', label: 'Re-assign lead' },
  { key: 'uploadExcel', label: 'Upload Excel' },
  { key: 'downloadReports', label: 'Download reports', pii: true },
  { key: 'viewCustomer360', label: 'View Customer 360' },
  { key: 'viewDashboard', label: 'View dashboard' },
  { key: 'deleteLead', label: 'Delete lead' },
  { key: 'uam', label: 'UAM' },
]

const Y = true
const N = false

/**
 * The permission matrix, exactly as the sheet has it.
 * Order: viewOwn, viewTeam, createManual, edit, reassign, uploadExcel,
 *        downloadReports, customer360, viewDashboard, deleteLead, uam
 */
const MATRIX = {
  BH:           [Y, Y, Y, Y, Y, N, Y, Y, Y, N, N],
  NH:           [Y, Y, Y, Y, Y, N, Y, N, Y, N, N],
  ZH:           [Y, Y, Y, Y, Y, N, Y, N, Y, N, N],
  RH:           [Y, Y, Y, Y, Y, N, Y, N, Y, N, N],
  AH:           [Y, Y, Y, Y, Y, N, Y, N, Y, N, N],
  SM:           [Y, Y, Y, Y, Y, N, N, N, Y, N, N],
  DST:          [Y, N, Y, Y, N, N, N, N, Y, N, N],
  PRODUCT_TEAM: [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, N],
  HO:           [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, N],
  IT:           [N, N, N, N, N, N, N, N, N, N, Y],
  SUPER:        [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y],
}

export const PERMISSIONS = Object.fromEntries(
  Object.entries(MATRIX).map(([role, row]) => [
    role,
    Object.fromEntries(ACTIONS.map((a, i) => [a.key, row[i]])),
  ]),
)

/** Single gate every screen should call. */
export const can = (role, action) => Boolean(PERMISSIONS[role]?.[action])

/**
 * DPDP restriction (Input Sheet, Open Point 6 + Role Permissions footnote):
 * "Phone no and Address details cannot be downloadable from DST to RH."
 * Read as the sales line from DST up to and including RH.
 */
export const PII_FIELDS = ['mobileNumber', 'alternateMobile', 'address', 'pincode']
export const PII_DOWNLOAD_BLOCKED_ROLES = ['DST', 'SM', 'AH', 'RH']

export const canDownloadPii = (role) =>
  can(role, 'downloadReports') && !PII_DOWNLOAD_BLOCKED_ROLES.includes(role)

/** Roles allowed to re-assign a lead, per the assignment tab's "who can re-assign". */
export const canReassign = (role) => can(role, 'reassignLead')

/** What goes inside a fixed-width badge — never the 12-character raw code. */
export const roleBadgeCode = (code) => ROLES[code]?.short || ROLES[code]?.code || code

export const roleLabel = (code) => ROLES[code]?.name || code
export const roleDesignation = (code) => ROLES[code]?.designation || code

/** Product entitlement tiers (MOM): single product to BH, multi above BH, all at HO. */
export const PRODUCT_ENTITLEMENT = {
  SINGLE: 'single', // one product — sales line up to BH
  MULTI: 'multi', // several products — above BH
  ALL: 'all', // every product — HO / Product Team / Super User
}

export const defaultEntitlement = (role) => {
  if (['HO', 'PRODUCT_TEAM', 'SUPER'].includes(role)) return PRODUCT_ENTITLEMENT.ALL
  if (['BH', 'NH'].includes(role)) return PRODUCT_ENTITLEMENT.MULTI
  return PRODUCT_ENTITLEMENT.SINGLE
}
