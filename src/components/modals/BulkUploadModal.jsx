import { useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from 'lucide-react'
import Modal, { CancelButton } from './Modal'
import { USERS, resolvePincode } from '../../data/crm'
import { LEAD_SOURCES, OCCUPATIONS, PORTFOLIOS, PRODUCTS } from '../../data/masters'
import { createLead } from '../../logic/leadStore'
import { download } from '../../logic/exportCsv'
import { ordinalSteps } from '../../theme/chartTheme'

/** The template columns — the same mandatory set the manual form enforces. */
const TEMPLATE = [
  'Lead first name', 'Lead last name', 'Mobile Number', 'Email ID', 'Lead Source',
  'Pincode', 'Portfolio', 'Product', 'Occupation', 'Offer Amount', 'UCIC',
]
const SAMPLE = [
  ['Ananya', 'Deshpande', '9820011234', 'ananya.d@example.com', 'Website', '400051', 'Retail Personal Loans', 'Diwali Special Loan', 'Salaried — Private Sector', '250000', ''],
  ['Ravi', 'Menon', '9845567890', '', 'Landing page', '560034', 'Retail Home Loans', 'Home Purchase Loan', 'Salaried — MNC', '4500000', '812345678'],
]

/** Minimal CSV parse — quoted fields included, which Excel exports produce. */
function parseCsv(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') inQuotes = false
      else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''))
}

function validateRow(cells, header) {
  const get = (name) => String(cells[header.indexOf(name)] ?? '').trim()
  const rec = {
    firstName: get('Lead first name'),
    lastName: get('Lead last name'),
    mobileNumber: get('Mobile Number'),
    emailId: get('Email ID'),
    leadSource: get('Lead Source'),
    pincode: get('Pincode'),
    portfolio: get('Portfolio'),
    product: get('Product'),
    occupation: get('Occupation'),
    offerAmount: get('Offer Amount'),
    ucic: get('UCIC'),
  }
  const errors = []
  if (!rec.firstName) errors.push('first name missing')
  if (!rec.lastName) errors.push('last name missing')
  if (!/^[6-9]\d{9}$/.test(rec.mobileNumber)) errors.push('mobile must be 10 digits starting 6–9')
  if (!/^\d{6}$/.test(rec.pincode)) errors.push('pincode must be 6 digits')
  if (!LEAD_SOURCES.includes(rec.leadSource)) errors.push(`lead source not in master`)
  if (!PORTFOLIOS.includes(rec.portfolio)) errors.push('portfolio not in master')
  const product = PRODUCTS.find((p) => p.name === rec.product)
  if (!product) errors.push('product not in master')
  else if (product.portfolio !== rec.portfolio) errors.push('product does not belong to that portfolio')
  if (!OCCUPATIONS.includes(rec.occupation)) errors.push('occupation not in master')
  if (rec.emailId && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(rec.emailId)) errors.push('invalid email')
  return { rec: { ...rec, productCode: product?.code }, errors }
}

/**
 * Bulk upload. Each valid row goes through the SAME create path as the manual
 * form, so every uploaded lead is de-duplicated, routed by the assignment rules
 * and given its auto-task — rather than being inserted raw.
 */
export default function BulkUploadModal({ currentUser, onClose, onDone }) {
  const [state, setState] = useState('idle')
  const [file, setFile] = useState(null)
  const [report, setReport] = useState(null)
  const inputRef = useRef(null)

  const downloadTemplate = () => {
    const csv = [TEMPLATE.join(','), ...SAMPLE.map((r) => r.join(','))].join('\n')
    download('axis-lead-upload-template.csv', csv)
  }

  const handleFile = async (f) => {
    if (!f) return
    setFile(f)
    setState('processing')
    const text = await f.text()
    const rows = parseCsv(text)
    if (!rows.length) {
      setReport({ header: [], accepted: [], rejected: [], missingCols: TEMPLATE })
      setState('done')
      return
    }
    const header = rows[0].map((h) => h.trim())
    const missingCols = TEMPLATE.filter((c) => !header.includes(c))
    const accepted = []
    const rejected = []

    if (!missingCols.length) {
      for (const [i, cells] of rows.slice(1).entries()) {
        const { rec, errors } = validateRow(cells, header)
        if (errors.length) {
          rejected.push({ line: i + 2, name: `${rec.firstName} ${rec.lastName}`.trim() || '(blank)', errors })
          continue
        }
        const outcome = createLead(
          { ...rec, campaignId: '', campaignName: 'Bulk upload', dateOfBirth: '', alternateMobile: '', panNumber: '' },
          USERS,
          currentUser,
        )
        accepted.push({ line: i + 2, ...outcome })
      }
    }

    setReport({ header, missingCols, accepted, rejected })
    setState('done')
  }

  const summary = report
    ? {
        total: report.accepted.length + report.rejected.length,
        assigned: report.accepted.filter((a) => a.decision.outcome === 'assigned').length,
        parked: report.accepted.filter((a) => a.decision.outcome !== 'assigned').length,
        duplicates: report.accepted.filter((a) => a.duplicate.isDuplicate).length,
      }
    : null

  return (
    <Modal title="Bulk Upload Leads" icon={Upload} onClose={onClose}>
      {state === 'idle' && (
        <>
          <p className="mb-4 text-xs leading-relaxed text-slate-500">
            Every valid row goes through the same path as a manually created lead — de-duplicated,
            routed by the live assignment rules, and given its auto-task. Invalid rows are reported
            and skipped, never partially imported.
          </p>
          <button onClick={downloadTemplate} className="btn-secondary mb-4 flex items-center gap-1.5 px-3 py-2 text-xs">
            <Download size={13} /> Download the CSV template
          </button>
          <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 transition-all hover:border-[#861D3F]/40 hover:bg-[#FDF0F4]/30">
            <FileSpreadsheet size={24} className="mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">{file ? file.name : 'Click to choose a .csv file'}</p>
            <p className="mt-0.5 text-xs text-slate-300">{TEMPLATE.length} columns · header row required</p>
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>
        </>
      )}

      {state === 'processing' && (
        <div className="flex flex-col items-center py-10">
          <div className="mb-3 h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#861D3F]" />
          <p className="text-sm font-medium text-slate-600">Validating and routing rows…</p>
        </div>
      )}

      {state === 'done' && report && (
        <div className="space-y-4">
          {report.missingCols.length > 0 ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <XCircle size={15} className="text-red-600" />
                <p className="text-sm font-semibold text-red-800">File rejected — columns missing</p>
              </div>
              <p className="mt-1 text-xs text-red-700">Missing: {report.missingCols.join(', ')}</p>
              <p className="mt-2 text-[11px] text-red-600">Nothing was imported. Download the template and try again.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2">
                {[
                  ['Rows', summary.total],
                  ['Imported', report.accepted.length],
                  ['Rejected', report.rejected.length],
                  ['Parked', summary.parked],
                ].map(([label, value], i) => (
                  <div key={label} className="rounded-xl border border-af-border bg-af-bg px-2 py-2 text-center">
                    <p className="text-lg font-bold leading-none text-slate-800">{value}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{label}</p>
                  </div>
                ))}
              </div>

              {report.accepted.length > 0 && (
                <div className="rounded-2xl border border-af-border bg-af-bg p-3.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <p className="text-xs font-semibold text-gray-800">Imported and routed</p>
                  </div>
                  <div className="mt-2 max-h-40 space-y-1 overflow-auto">
                    {report.accepted.map((a) => (
                      <p key={a.lead.leadId} className="text-[11px] text-slate-600">
                        <span className="font-mono">{a.lead.leadId}</span> {a.lead.firstName} {a.lead.lastName} —
                        rule {a.decision.ruleNo} {a.decision.outcome === 'assigned' ? `→ ${a.lead.assignedToName}` : `→ parked (${a.decision.reason})`}
                        {a.duplicate.isDuplicate ? ' · flagged duplicate' : ''}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {report.rejected.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-600" />
                    <p className="text-xs font-semibold text-amber-800">Rejected rows — not imported</p>
                  </div>
                  <div className="mt-2 max-h-40 space-y-1 overflow-auto">
                    {report.rejected.map((r) => (
                      <p key={r.line} className="text-[11px] text-amber-800">
                        Line {r.line} · {r.name} — {r.errors.join('; ')}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <CancelButton onClick={() => { onDone?.(report); onClose() }} label={state === 'done' ? 'Close' : 'Cancel'} />
        {state === 'done' && report && !report.missingCols.length && (
          <button
            onClick={() => { setState('idle'); setFile(null); setReport(null) }}
            className="flex-1 rounded-xl bg-[#861D3F] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#A42B55]"
          >
            Upload another file
          </button>
        )}
      </div>
    </Modal>
  )
}
