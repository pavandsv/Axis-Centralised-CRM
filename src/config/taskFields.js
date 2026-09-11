// ---------------------------------------------------------------------------
// Task / Follow-up section fields — Input Sheet tab "Task Fields".
// All 17 fields, verbatim, including the conditional mandatory flags.
//
// Sheet note: "Two automations — Lead created and Follow-up", i.e. a task is
// generated automatically on lead creation and when a lead moves to Follow-up.
// ---------------------------------------------------------------------------

/** Mandatory can be unconditional, or gated on a condition. */
export const MANDATORY = {
  YES: 'yes',
  NO: 'no',
  ON_COMPLETION: 'onCompletion', // "Yes, on completion"
  FOR_CALL_TYPE: 'forCallType', // "Yes, for call type"
  IF_LEAD_OPEN: 'ifLeadOpen', // "Yes, if lead is still open"
}

export const TASK_TYPES = ['Call', 'Meeting', 'Document Collection']
export const TASK_PRIORITIES = ['High', 'Medium', 'Low']
export const TASK_STATUSES = ['Open', 'In Progress', 'Completed', 'Cancelled']
export const CALL_CONNECTED = ['Connected', 'Not Reachable', 'Busy', 'Wrong Number', 'Call Back Later']
export const NEXT_ACTIONS = [
  'Follow-up Call',
  'Send Documents',
  'Schedule Meeting',
  'Close Lead',
  'No Further Action',
]

export const TASK_FIELDS = [
  { no: 1,  key: 'taskId',         label: 'Task ID',            type: 'auto',      mandatory: MANDATORY.YES,           remarks: 'System generated' },
  { no: 2,  key: 'leadId',         label: 'Linked Lead ID',     type: 'lookup',    mandatory: MANDATORY.YES,           remarks: 'Every task must sit under a lead' },
  { no: 3,  key: 'customerName',   label: 'Customer Name',      type: 'text',      mandatory: MANDATORY.YES },
  { no: 4,  key: 'taskType',       label: 'Task Type',          type: 'dropdown',  options: TASK_TYPES,        mandatory: MANDATORY.YES, open: true, remarks: 'AFL to confirm the list' },
  { no: 5,  key: 'title',          label: 'Task Title / Subject', type: 'text',    mandatory: MANDATORY.YES },
  { no: 6,  key: 'dueDate',        label: 'Due Date',           type: 'date',      mandatory: MANDATORY.YES },
  { no: 7,  key: 'dueTime',        label: 'Due Time',           type: 'time',      mandatory: MANDATORY.NO,  open: true, remarks: 'AFL to confirm whether time is needed or date is enough' },
  { no: 8,  key: 'priority',       label: 'Priority',           type: 'dropdown',  options: TASK_PRIORITIES,   mandatory: MANDATORY.YES },
  { no: 9,  key: 'assignedTo',     label: 'Assigned To',        type: 'userLookup', mandatory: MANDATORY.YES, open: true, remarks: 'AFL to confirm whether a task can be assigned to someone else' },
  { no: 10, key: 'status',         label: 'Task Status',        type: 'dropdown',  options: TASK_STATUSES,     mandatory: MANDATORY.YES },
  { no: 11, key: 'outcome',        label: 'Outcome / Remarks',  type: 'longtext',  mandatory: MANDATORY.ON_COMPLETION },
  { no: 12, key: 'callConnected',  label: 'Call Connected',     type: 'dropdown',  options: CALL_CONNECTED,    mandatory: MANDATORY.FOR_CALL_TYPE, open: true, remarks: 'AFL to confirm the list' },
  { no: 13, key: 'nextAction',     label: 'Next Action',        type: 'dropdown',  options: NEXT_ACTIONS,      mandatory: MANDATORY.NO },
  { no: 14, key: 'nextFollowUpDate', label: 'Next Follow-up Date', type: 'date',   mandatory: MANDATORY.IF_LEAD_OPEN, open: true, remarks: 'AFL to confirm whether this writes back to the lead record' },
  { no: 15, key: 'attachment',     label: 'Attachment',         type: 'file',      mandatory: MANDATORY.NO,  open: true, remarks: 'AFL to confirm allowed file types and size limit' },
  { no: 16, key: 'createdBy',      label: 'Created By and On',   type: 'auto',      mandatory: MANDATORY.YES },
  { no: 17, key: 'completedOn',    label: 'Completed On',       type: 'datetime',  mandatory: MANDATORY.ON_COMPLETION },
]

/** Is this field required, given the current form state? */
export function isRequired(field, form = {}) {
  switch (field.mandatory) {
    case MANDATORY.YES: return true
    case MANDATORY.NO: return false
    case MANDATORY.ON_COMPLETION: return form.status === 'Completed'
    case MANDATORY.FOR_CALL_TYPE: return form.taskType === 'Call'
    case MANDATORY.IF_LEAD_OPEN: return Boolean(form.leadStillOpen)
    default: return false
  }
}

/** Validate a task against the sheet's rules. Returns { field: message }. */
export function validateTask(form) {
  const errors = {}
  for (const f of TASK_FIELDS) {
    if (f.type === 'auto') continue
    if (isRequired(f, form) && (form[f.key] == null || form[f.key] === '')) {
      errors[f.key] = `${f.label} is required`
    }
  }
  return errors
}

/** The two automations named on the sheet. */
export const TASK_AUTOMATIONS = [
  {
    key: 'onLeadCreated',
    when: 'Lead created',
    taskType: 'Call',
    priority: 'High',
    title: 'First contact call',
    dueInDays: 0,
    description: 'Auto-created when the lead is created and allocated.',
  },
  {
    key: 'onFollowUp',
    when: 'Lead moves to Follow-up status',
    taskType: 'Call',
    priority: 'Medium',
    title: 'Follow-up call',
    dueFrom: 'nextFollowUpDate',
    description: "Auto-created when the lead's status becomes Follow-up.",
  },
]

/** Build the auto-task a lead should carry, per the two automations. */
export function autoTasksForLead(lead, { taskSeq = 1 } = {}) {
  const out = []
  const mk = (auto, dueDate, seqOffset) => ({
    taskId: `TSK-${String(taskSeq + seqOffset).padStart(6, '0')}`,
    leadId: lead.leadId,
    customerName: `${lead.firstName} ${lead.lastName}`,
    taskType: auto.taskType,
    title: auto.title,
    dueDate,
    dueTime: '10:00',
    priority: auto.priority,
    assignedTo: lead.assignedTo,
    status: 'Open',
    outcome: null,
    callConnected: null,
    nextAction: null,
    nextFollowUpDate: null,
    attachment: null,
    createdBy: 'System',
    createdOn: lead.leadCreatedDate,
    completedOn: null,
    automation: auto.key,
    product: lead.product,
    offerAmount: lead.offerAmount,
  })

  out.push(mk(TASK_AUTOMATIONS[0], lead.leadCreatedDate.slice(0, 10), 0))
  if (lead.leadStatus === 'Follow-up' && lead.nextFollowUpDate) {
    out.push(mk(TASK_AUTOMATIONS[1], lead.nextFollowUpDate, 1))
  }
  return out
}
