// ---------------------------------------------------------------------------
// Triggers, automations and alerts — Input Sheet tab "Triggers and Alerts".
//
// Sheet-wide notes captured verbatim:
//   "Individual users recieves their trigger."
//   "When manager gets email trigger all team should not be in cc."
//   "Put is disclaimer in email individual reports are shared to team members."
//   "Go higher up in the same way."
//
// SMS is out of scope (Open Point 15). WhatsApp is Phase 2 (Open Point 16), so
// Phase 1 channels are in-app and email only.
// ---------------------------------------------------------------------------
import { TBC } from './roles.js'

export const CHANNELS = { IN_APP: 'In-app', EMAIL: 'Email' }

/** The disclaimer that must ride on every manager-level email. */
export const MANAGER_EMAIL_DISCLAIMER =
  'Individual reports are shared directly with the respective team members. This summary is for your visibility only — your team is not copied on this email.'

export const TRIGGERS = [
  {
    no: 1,
    key: 'leadAllocated',
    when: 'A new lead is created and allocated',
    action: 'Notify the assigned user',
    notify: ['assignedUser'],
    channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
    timing: 'Immediately',
    required: true,
    phase: 1,
  },
  {
    no: 2,
    key: 'followUpDueToday',
    when: 'Follow-up date is due today',
    action: "Show the lead in the user's due list and remind",
    notify: ['assignedUser'],
    channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
    timing: 'Morning of the due date',
    timingDetail: '09:00 assumed — AFL to confirm the exact time',
    open: true,
    required: true,
    phase: 1,
  },
  {
    no: 3,
    key: 'followUpOverdue',
    when: 'Follow-up date has passed and the lead is still open',
    action: 'Mark as overdue and remind',
    notify: ['assignedUser', 'manager'],
    channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
    timing: 'Daily until closed',
    required: true,
    phase: 1,
  },
  {
    no: 4,
    key: 'newBeyondAgeing',
    when: 'Lead is in New status beyond 3 days',
    action: 'Escalate to the assigned user and their manager',
    notify: ['assignedUser', 'manager'],
    channels: [CHANNELS.EMAIL],
    timing: TBC,
    timingDetail: 'AFL to confirm the day count and the digest schedule',
    open: true,
    required: true,
    phase: 1,
  },
  {
    no: 5,
    key: 'leadReassigned',
    when: 'Lead is re-assigned',
    action: 'Update ownership and notify both users',
    notify: ['previousOwner', 'newOwner', 'manager'],
    channels: [CHANNELS.IN_APP],
    timing: 'Immediately',
    required: true,
    phase: 2,
    remarks: 'Marked "Second phase" on the sheet',
  },
]

export const TRIGGER_BY_KEY = Object.fromEntries(TRIGGERS.map((t) => [t.key, t]))
