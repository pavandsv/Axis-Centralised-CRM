import { createPortal } from 'react-dom'
import { useState } from 'react'
import { ArrowLeftRight, Lock, PencilLine, Route, Trash2, X } from 'lucide-react'
import { StatusBadge, ProductBadge, AgeingBadge } from './Badges'
import { daysAged, formatINR, TODAY } from '../data/crm'
import { can, PII_DOWNLOAD_BLOCKED_ROLES } from '../config/roles'
import { maskPan } from '../data/masters'
import { ASSIGNMENT_RULES } from '../config/assignmentRules'
import { auditLog } from '../data/crm'
import { auditFor, auditForEntity } from '../logic/audit'
import { getSessionEvents } from '../logic/auditTrail'
import { ReassignLeadModal, DeleteLeadModal } from './modals/ReassignLeadModal'
import UpdateLeadModal from './modals/UpdateLeadModal'
import { USERS } from '../data/crm'

const Row = ({ label, value, mono }) => (
  <div className="flex justify-between gap-3 border-b border-af-border/40 py-1.5 last:border-0">
    <p className="flex-shrink-0 text-xs text-slate-400">{label}</p>
    <p className={`text-right text-xs font-semibold text-gray-800 ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</p>
  </div>
)

const Block = ({ title, children }) => (
  <div className="rounded-2xl border border-af-border bg-af-bg p-4">
    <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{title}</p>
    {children}
  </div>
)

export default function LeadDetailDrawer({ lead, role, currentUser, onClose, onChanged }) {
  const [tab, setTab] = useState('overview')
  const [action, setAction] = useState(null)
  const rule = ASSIGNMENT_RULES.find((r) => r.no === lead.assignmentRuleNo)
  // PAN is masked for the roles that cannot export contact detail.
  const maskPii = PII_DOWNLOAD_BLOCKED_ROLES.includes(role)

  const tabs = ['overview', 'routing', 'history', 'audit']

  // The same append-only trail the Audit screen shows, filtered to this lead and
  // redacted for the reader's role.
  const auditRows = auditForEntity(
    auditFor([...getSessionEvents(), ...auditLog()], { role, id: 'viewer' }, TODAY),
    lead.leadId,
  )

  return createPortal(
    <div className="fixed inset-0 z-[9995] flex justify-end" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="animate-slide-up relative z-10 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-af-border px-6 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{lead.firstName} {lead.lastName}</h2>
              <ProductBadge product={lead.product} />
              <StatusBadge status={lead.leadStatus} />
              <AgeingBadge days={daysAged(lead)} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono font-semibold text-[#861D3F]">{lead.leadId}</span>
              <span className="text-slate-200">·</span>
              <span className="text-slate-400">{lead.mobileNumber}</span>
              <span className="text-slate-200">·</span>
              <span className="text-slate-400">{lead.city}, {lead.state}</span>
              <span className="text-slate-200">·</span>
              <span className="font-semibold text-emerald-700">{formatINR(lead.offerAmount)}</span>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {can(role, 'editLead') && (
              <button
                onClick={() => setAction('update')}
                className="btn-primary flex items-center gap-1.5 px-2.5 py-2 text-[11px]"
              >
                <PencilLine size={13} /> Update status
              </button>
            )}
            {can(role, 'reassignLead') && (
              <button
                onClick={() => setAction('reassign')}
                className="flex items-center gap-1.5 rounded-xl border border-af-border px-2.5 py-2 text-[11px] font-semibold text-slate-600 transition-all hover:border-[#861D3F]/30 hover:text-[#861D3F]"
              >
                <ArrowLeftRight size={13} /> Re-assign
              </button>
            )}
            {can(role, 'deleteLead') && (
              <button
                onClick={() => setAction('delete')}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 px-2.5 py-2 text-[11px] font-semibold text-red-600 transition-all hover:bg-red-50"
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
            <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-xl border border-af-border text-slate-400 transition-all hover:bg-af-bg hover:text-gray-700">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1 border-b border-af-border px-6 py-2.5">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-xl px-4 py-1.5 text-xs font-semibold capitalize transition-all duration-150
                ${tab === t ? 'bg-[#861D3F] text-white' : 'text-slate-500 hover:bg-af-bg hover:text-gray-700'}`}
            >
              {t}
            </button>
          ))}
          {!can(role, 'editLead') && (
            <span className="ml-2 flex items-center gap-1 text-[10px] font-medium text-slate-400">
              <Lock size={10} /> Read-only for {role}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Block title="Customer">
                  <Row label="Name" value={`${lead.firstName} ${lead.lastName}`} />
                  <Row label="Mobile" value={lead.mobileNumber} mono />
                  <Row label="Alternate" value={lead.alternateMobile} mono />
                  <Row label="Email" value={lead.emailId} />
                  <Row label="Date of birth" value={lead.dateOfBirth} />
                  <Row label="Occupation" value={lead.occupation} />
                  <Row label="PAN" value={lead.panNumber ? (maskPii ? maskPan(lead.panNumber) : lead.panNumber) : null} mono />
                  <Row label="UCIC" value={lead.ucic} mono />
                </Block>
                <Block title="Offer">
                  <Row label="Portfolio" value={lead.portfolio} />
                  <Row label="Product" value={lead.product} />
                  <Row label="Offer amount" value={formatINR(lead.offerAmount)} />
                  <Row label="Offer valid till" value={lead.offerValidTill} />
                  <Row label="LAN no." value={lead.lanNo} mono />
                  <Row label="Duplicate flag" value={lead.duplicateFlag} />
                  <Row label="Next follow-up" value={lead.nextFollowUpDate} />
                  <Row label="Reason" value={lead.reason ? `${lead.reasonCode} — ${lead.reason}` : null} />
                </Block>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Block title="Geography — derived from pincode">
                  <Row label="Pincode" value={lead.pincode} mono />
                  <Row label="City" value={lead.city} />
                  <Row label="District" value={lead.district} />
                  <Row label="State" value={lead.state} />
                  <Row label="Branch" value={lead.branch} />
                  <Row label="Region" value={lead.region} />
                  <Row label="Zone" value={lead.zone} />
                </Block>
                <Block title="Attribution">
                  <Row label="Lead source" value={lead.leadSource} />
                  <Row label="Campaign" value={lead.campaignName} />
                  <Row label="Campaign ID" value={lead.campaignId} mono />
                  <Row label="Created" value={lead.leadCreatedDate.replace('T', ' ')} />
                  <Row label="Status updated" value={lead.statusUpdatedOn.replace('T', ' ')} />
                  <Row label="Last modified by" value={lead.lastModifiedBy} />
                </Block>
              </div>
            </div>
          )}

          {tab === 'routing' && (
            <div className="space-y-4">
              {/* Why this lead sits where it does — the allocation rule, shown. */}
              <div className="rounded-2xl border border-[#861D3F]/15 bg-[#FDF0F4] p-4">
                <div className="flex items-center gap-2">
                  <Route size={15} className="text-[#861D3F]" />
                  <p className="text-sm font-semibold text-[#861D3F]">
                    Rule {lead.assignmentRuleNo} — {lead.assignmentRuleName}
                  </p>
                </div>
                <p className="mt-1 text-xs text-[#861D3F]/80">{rule?.condition}</p>
              </div>

              <Block title="Allocation">
                <Row label="Outcome" value={lead.assignmentOutcome} />
                <Row label="Assigned to" value={lead.assignedToName} />
                <Row label="Selection" value={lead.assignmentStrategy} />
                <Row label="Pool size" value={lead.assignmentPoolSize || '—'} />
                <Row label="Parked with" value={lead.parkedWith || '—'} />
                <Row label="Reason" value={lead.parkedReason} />
              </Block>

              <Block title="Reporting chain on this lead">
                <Row label="SM" value={lead.smId} mono />
                <Row label="AH" value={lead.ahId} mono />
                <Row label="RH" value={lead.rhId} mono />
                <Row label="ZH" value={lead.zhId} mono />
              </Block>

              <Block title="Ageing">
                <Row label="Days in current status" value={daysAged(lead)} />
                <Row label="First response" value={lead.firstResponseHours != null ? `${lead.firstResponseHours} h` : 'Not contacted'} />
                <Row label="Within 3-day rule" value={lead.slaBreached ? 'No — breached' : 'Yes'} />
              </Block>
            </div>
          )}

          {tab === 'audit' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                {auditRows.length} audit {auditRows.length === 1 ? 'entry' : 'entries'} for {lead.leadId} · append-only
              </p>
              {auditRows.map((r) => (
                <div key={r.id} className="rounded-xl border border-af-border bg-af-bg px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800">{r.actionLabel || r.action}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{r.detail}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[11px] font-medium text-slate-600">{r.actorName}</p>
                      <p className="text-[10px] text-slate-400">{r.ts.replace('T', ' ')}</p>
                      <p className="font-mono text-[9px] text-slate-300">{r.ip}</p>
                    </div>
                  </div>
                </div>
              ))}
              {!auditRows.length && <p className="py-8 text-center text-sm text-slate-400">No audit entries visible to your role</p>}
            </div>
          )}

          {tab === 'history' && (
            <div>
              {(lead.timeline || []).map((e, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full border-2 border-white bg-[#861D3F] shadow-sm" />
                    {i < lead.timeline.length - 1 && <div className="mt-1 w-0.5 flex-1 bg-af-border" />}
                  </div>
                  <div className="flex-1 pb-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{e.action}</p>
                        {e.detail && <p className="mt-0.5 text-xs text-slate-500">{e.detail}</p>}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs font-medium text-slate-500">{e.actor}</p>
                        <p className="text-[10px] text-slate-400">{e.ts.replace('T', ' ')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
      {action === 'update' && (
        <UpdateLeadModal
          lead={lead}
          currentUser={currentUser}
          onClose={() => setAction(null)}
          onDone={({ lead: updated, task }) => {
            onChanged?.(`${updated.leadId} → ${updated.leadStatus}${task ? ` · follow-up task ${task.taskId} raised` : ''}`)
          }}
        />
      )}

      {action === 'reassign' && (
        <ReassignLeadModal
          lead={lead}
          currentUser={currentUser}
          onClose={() => setAction(null)}
          onDone={({ from, to }) => {
            onChanged?.(`${lead.leadId} re-assigned${from ? ` from ${from.name}` : ''} to ${to.name}. Both parties notified (trigger 5).`)
            onClose()
          }}
        />
      )}
      {action === 'delete' && (
        <DeleteLeadModal
          lead={lead}
          currentUser={currentUser}
          onClose={() => setAction(null)}
          onDone={({ reason }) => {
            onChanged?.(`${lead.leadId} deleted. The audit trail retains the full history.`)
            onClose()
          }}
        />
      )}
    </div>,
    document.body,
  )
}
