import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export const inputCls =
  'w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#861D3F]/20 focus:border-[#861D3F]/40 transition-all'
export const selectCls = inputCls + ' pr-10 appearance-none cursor-pointer'
export const labelCls = 'text-slate-500 text-xs font-medium mb-1.5 block'

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`

export const selectStyle = {
  backgroundImage: CHEVRON,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
}

export function CancelButton({ onClick, label = 'Cancel' }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
    >
      {label}
    </button>
  )
}

export function SubmitButton({ onClick, children, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors
        ${
          disabled
            ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
            : 'bg-[#861D3F] text-white hover:bg-[#A42B55]'
        }`}
    >
      {children}
    </button>
  )
}

export default function Modal({
  title,
  icon: Icon,
  iconBg = 'bg-[#FDF0F4]',
  iconColor = 'text-[#861D3F]',
  onClose,
  children,
}) {
  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        style={{ zIndex: -1 }}
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] overflow-hidden animate-slide-up">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon size={18} className={iconColor} />
          </div>
          <h2 className="text-gray-900 text-base font-bold flex-1">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-gray-700 hover:bg-slate-50 transition-all"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
