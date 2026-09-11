// ---------------------------------------------------------------------------
// Table pagination.
//
// One control for every long table, so page size, wording and keyboard
// behaviour cannot drift between screens. The hook owns the slicing; the
// component is presentation only.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const PAGE_SIZES = [25, 50, 100, 250]

/**
 * @param rows     the full, already-filtered row list
 * @param resetOn  values that should send the reader back to page 1 — the
 *                 filters. Without this, filtering while on page 7 shows an
 *                 empty table and looks like a bug.
 */
export function usePagination(rows, { initialSize = 25, resetOn = [] } = {}) {
  const [pageSize, setPageSize] = useState(initialSize)
  const [page, setPage] = useState(1)

  const total = rows.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1) }, resetOn)
  useEffect(() => { setPage(1) }, [pageSize])

  // Rows can shrink under a reader who is deep in the list — clamp rather than
  // showing a blank page.
  const current = Math.min(page, pageCount)
  const start = (current - 1) * pageSize

  const pageRows = useMemo(
    () => rows.slice(start, start + pageSize),
    [rows, start, pageSize],
  )

  return {
    pageRows,
    props: {
      page: current,
      pageCount,
      pageSize,
      total,
      from: total === 0 ? 0 : start + 1,
      to: Math.min(start + pageSize, total),
      onPage: setPage,
      onPageSize: setPageSize,
    },
  }
}

/** The numbered buttons: first, last, and a window around the current page. */
const pageWindow = (page, pageCount) => {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const out = new Set([1, pageCount, page, page - 1, page + 1])
  if (page <= 3) [2, 3, 4].forEach((n) => out.add(n))
  if (page >= pageCount - 2) [pageCount - 3, pageCount - 2, pageCount - 1].forEach((n) => out.add(n))
  const nums = [...out].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b)
  const withGaps = []
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) withGaps.push(`gap-${n}`)
    withGaps.push(n)
  })
  return withGaps
}

const n = (v) => v.toLocaleString('en-IN')

export default function Pagination({
  page, pageCount, pageSize, total, from, to, onPage, onPageSize, noun = 'rows', compact = false,
}) {
  if (!total) return null

  const btn =
    'flex h-7 min-w-[28px] items-center justify-center rounded-lg border border-af-border px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-af-border px-4 py-2.5">
      <p className="text-xs text-slate-400">
        Showing <strong className="font-semibold text-slate-600">{n(from)}–{n(to)}</strong> of {n(total)} {noun}
      </p>

      <div className="flex items-center gap-3">
        {!compact && (
          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            Rows
            <select
              value={pageSize}
              onChange={(e) => onPageSize(Number(e.target.value))}
              className="rounded-lg border border-af-border bg-white px-1.5 py-1 text-xs text-slate-600 outline-none focus:border-[#861D3F]"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className={`${btn} text-slate-500 hover:border-[#861D3F]/40 hover:text-[#861D3F]`}
          >
            <ChevronLeft size={13} />
          </button>

          {pageWindow(page, pageCount).map((p) =>
            typeof p === 'string' ? (
              <span key={p} className="px-1 text-xs text-slate-300">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPage(p)}
                aria-current={p === page ? 'page' : undefined}
                className={
                  p === page
                    ? `${btn} border-[#861D3F] bg-[#861D3F] text-white`
                    : `${btn} text-slate-500 hover:border-[#861D3F]/40 hover:text-[#861D3F]`
                }
              >
                {p}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => onPage(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
            className={`${btn} text-slate-500 hover:border-[#861D3F]/40 hover:text-[#861D3F]`}
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
