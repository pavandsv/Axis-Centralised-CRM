// ---------------------------------------------------------------------------
// Territory Master — MOM 8 Sep: retained as an Admin-only tab.
//
// This is the file the whole allocation engine turns on: a lead's pincode
// resolves to a branch, which resolves to region and zone, which decides who
// the lead is assigned to. Pincodes with no branch land in the OGL queue, so
// they are surfaced here rather than buried.
//
// AFL owes the real mapping (MOM action A6); the counts below are the stand-in
// the POC routes on, and the banner says so.
// ---------------------------------------------------------------------------
import { useMemo, useState } from 'react'
import { AlertTriangle, Map, Search } from 'lucide-react'
import { BRANCHES, PINCODE_MAP, REGIONS, UNMAPPED_PINCODES, ZONES } from '../../data/geography'
import Pagination, { usePagination } from '../Pagination'

export default function TerritoryMaster() {
  const [query, setQuery] = useState('')
  const [zone, setZone] = useState('all')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return BRANCHES.filter(
      (b) =>
        (zone === 'all' || b.zone === zone) &&
        (!q ||
          b.branch.toLowerCase().includes(q) ||
          b.code.toLowerCase().includes(q) ||
          b.region.toLowerCase().includes(q) ||
          b.state.toLowerCase().includes(q) ||
          b.pincodes.some((p) => p.includes(q))),
    )
  }, [query, zone])

  const { pageRows, props: pageProps } = usePagination(rows, { resetOn: [query, zone] })
  const pincodeCount = Object.keys(PINCODE_MAP).length

  const stats = [
    { label: 'Zones', value: ZONES.length },
    { label: 'Regions', value: REGIONS.length },
    { label: 'Branches', value: BRANCHES.length },
    { label: 'Mapped pincodes', value: pincodeCount },
    { label: 'Unmapped → OGL', value: UNMAPPED_PINCODES.length, warn: true },
  ]

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="card px-4 py-3">
            <p
              className={`text-xl font-bold leading-none ${s.warn && s.value ? 'text-amber-600' : 'text-slate-800'}`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {s.value}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search branch, code, region, state or pincode"
            className="h-9 w-full rounded-xl border border-af-border bg-white pl-9 pr-3 text-sm outline-none focus:border-[#861D3F]"
          />
        </div>
        <select
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          className="h-9 rounded-xl border border-af-border bg-white px-3 text-sm text-slate-600 outline-none focus:border-[#861D3F]"
        >
          <option value="all">All zones</option>
          {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        <span className="text-xs text-slate-400">{rows.length} of {BRANCHES.length} branches</span>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-af-border px-4 py-3.5">
          <Map size={15} className="text-[#861D3F]" />
          <h3 className="section-title">Territory Master — pincode drives allocation</h3>
          <span className="ml-auto text-xs text-slate-400">Admin only</span>
        </div>
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-af-bg">
              <tr className="border-b border-af-border">
                {['Branch', 'Code', 'Region', 'Zone', 'State / district', 'Pincodes'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((b) => (
                <tr key={b.code} className="tbl-row">
                  <td className="px-3 py-2.5 text-xs font-semibold text-gray-800">{b.branch}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{b.code}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600">{b.region}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{b.zone}</td>
                  <td className="px-3 py-2.5 text-[11px] text-slate-500">{b.state} · {b.district}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {b.pincodes.map((p) => (
                        <span key={p} className="rounded border border-af-border bg-af-bg px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">No branch matches that search</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination {...pageProps} noun="branches" />
      </div>

      {UNMAPPED_PINCODES.length > 0 && (
        <div className="card mt-4 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-af-border px-4 py-3.5">
            <AlertTriangle size={15} className="text-amber-600" />
            <h3 className="section-title">Pincodes with no branch — these leads go to the OGL queue</h3>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            {UNMAPPED_PINCODES.map((p) => (
              <span
                key={p.pincode}
                className="flex items-baseline gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700"
              >
                <span className="font-mono font-semibold">{p.pincode}</span>
                <span className="text-amber-600/80">{p.city}, {p.state}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-[11px] text-slate-400">
        MOM action A6 — AFL to provide the final pincode to branch and region
        mapping. The table above is the working set the POC routes on.
      </p>
    </>
  )
}
