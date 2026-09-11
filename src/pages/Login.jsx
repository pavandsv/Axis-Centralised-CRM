import { useState } from 'react'
import { ArrowRight, BarChart3, Check, CircleUserRound, Shield, Users, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { USERS, liveLeads } from '../data/crm'
import { ROLES, ROLE_CODES, roleBadgeCode } from '../config/roles'
import { visibleLeads, scopeDescription } from '../logic/visibility'
import { LOGO_ON_DARK, LOGO_WORDMARK } from '../assets/brand'

const BLURB = {
  BH: 'National command — entire organisation',
  NH: 'Vertical head — entire organisation',
  ZH: 'Zone roll-up, and the out-of-geography queue',
  RH: 'Region roll-up and everyone below',
  AH: 'Area roll-up and everyone below',
  SM: 'Branch team — SLA and follow-up enforcement',
  DST: 'Own leads only — capture and customer engagement',
  HO: 'Head office — pan organisation, product entitlement per user',
  PRODUCT_TEAM: 'Campaign upload and pan-organisation view',
  IT: 'Audit and configuration only — no customer data',
  SUPER: 'Full access including user administration',
}

const HIGHLIGHTS = [
  { icon: Users, title: '11 roles, real hierarchy', sub: 'Each level sees only its own line, downward' },
  { icon: Zap, title: 'Rule-driven allocation', sub: 'Pincode → branch → round robin, balanced by load' },
  { icon: Shield, title: 'DPDP aware', sub: 'Phone and address not downloadable, DST to RH' },
  { icon: BarChart3, title: 'Everything derived', sub: 'No hardcoded figures — widgets drill to their own list' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(false)

  // One representative user per role, so the client can walk the whole hierarchy.
  // ROLE_CODES is already the Input Sheet's own order — BH is level 1 down to
  // DST at level 7 — but listing the four central roles straight after DST read
  // as though HO and the Super User sat BELOW the most junior sales role. They
  // sit outside the sales line entirely, so the list is grouped and the sales
  // levels are numbered.
  const profiles = ROLE_CODES.map((code) => {
    const candidates = USERS.filter((u) => u.role === code && u.status !== 'Inactive')
    // Prefer someone who actually owns data, so no demo profile opens empty.
    const withData = candidates.find((u) => visibleLeads(u, liveLeads()).length > 0)
    const user = withData || candidates[0]
    return user ? { user, meta: ROLES[code], leadCount: visibleLeads(user, liveLeads()).length } : null
  }).filter(Boolean)

  const selected = profiles.find((p) => p.user.id === selectedId)

  const handleSignIn = async () => {
    if (!selectedId) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 550))
    login(selectedId)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex bg-white">
      <div
        className="hidden lg:flex w-[440px] flex-shrink-0 flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(165deg, #5D1028 0%, #861D3F 55%, #A42B55 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div className="relative z-10 flex flex-col h-full px-11 py-12">
          <img
            src={LOGO_WORDMARK}
            alt="Axis Finance"
            className="h-9 w-auto object-contain mb-12"
            style={LOGO_ON_DARK}
          />
          <div className="flex-1">
            <h1 className="text-white text-[34px] font-bold leading-tight tracking-tight mb-4">
              From campaign
              <br />
              <span className="text-white/55">to disbursal.</span>
            </h1>
            <p className="text-white/60 text-[15px] leading-relaxed mb-9">
              Centralised lead-to-closure CRM. Pincode-driven routing, hierarchy-scoped
              dashboards and rule-based escalation — built to the Axis Finance requirement sheet.
            </p>
            <div className="space-y-4">
              {HIGHLIGHTS.map(({ icon: Icon, title, sub }) => (
                <div key={title} className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon size={16} className="text-white/80" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{title}</p>
                    <p className="text-white/45 text-xs mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-white/50 text-xs">
            Fristine Infotech · Digital Synergy Ventures Group
            <br />
            Version 2.0 · Requirement build · Confidential
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto relative" style={{ background: '#F6F8FC' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full" style={{ background: 'radial-gradient(circle, rgba(134,29,63,0.06) 0%, transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[0.35]" style={{ backgroundImage: 'radial-gradient(circle, #861D3F 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        <div className="w-full max-w-[540px] relative z-10">
          <div className="bg-white rounded-3xl shadow-[0_4px_32px_rgba(0,0,0,0.09)] border border-gray-100">
            <div className="px-8 pt-7 pb-5 border-b border-gray-100">
              <h2 className="text-gray-900 text-2xl font-bold tracking-tight">Sign in</h2>
              <p className="text-gray-400 text-sm mt-1">
                Pick any of the 11 roles — the lead count shows what that role can see
              </p>
            </div>

            <div className="px-3 pt-3 pb-1 max-h-[420px] overflow-y-auto no-scrollbar">
              {profiles.map(({ user, meta, leadCount }, i) => {
                const active = selectedId === user.id
                const prev = profiles[i - 1]
                const heading =
                  i === 0
                    ? 'Sales hierarchy — highest to lowest'
                    : !prev.meta.central && meta.central
                      ? 'Central & administration — outside the sales line'
                      : null
                return (
                  <div key={`g-${user.id}`}>
                  {heading && (
                    <p className="px-3 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-wider text-gray-300">
                      {heading}
                    </p>
                  )}
                  <button
                    key={user.id}
                    onClick={() => setSelectedId(active ? null : user.id)}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl mb-1 text-left transition-all duration-150 group
                      ${active ? 'bg-[#FDF0F4] border border-[#861D3F]/[0.18]' : 'border border-transparent hover:bg-gray-50'}`}
                  >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${active ? 'bg-[#861D3F]' : 'bg-gray-100'}`}>
                      <CircleUserRound size={20} className={active ? 'text-white' : 'text-gray-400'} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-sm font-semibold truncate ${active ? 'text-[#861D3F]' : 'text-gray-800'}`}>{user.name}</p>
                        <span
                          title={meta.name}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap ${active ? 'bg-[#861D3F] text-white' : 'bg-gray-100 text-gray-500'}`}
                        >
                          {roleBadgeCode(meta.code)}
                        </span>
                        {meta.level && (
                          <span className="flex-shrink-0 text-[10px] font-medium text-gray-300">
                            L{meta.level}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs truncate">{BLURB[meta.code]}</p>
                      <p className="text-gray-300 text-[10px] mt-0.5 truncate">{scopeDescription(user)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold ${active ? 'text-[#861D3F]' : 'text-gray-700'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {leadCount.toLocaleString('en-IN')}
                      </p>
                      <p className="text-gray-300 text-[10px]">leads</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${active ? 'bg-[#861D3F]' : 'border border-gray-200'}`}>
                      {active ? <Check size={11} className="text-white" strokeWidth={3} /> : null}
                    </div>
                  </button>
                  </div>
                )
              })}
            </div>

            <div className="px-6 pb-6 pt-4">
              <button
                onClick={handleSignIn}
                disabled={!selectedId || loading}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-150
                  ${selectedId ? 'bg-[#861D3F] text-white hover:bg-[#A42B55] active:scale-[0.98] shadow-[0_4px_16px_rgba(134,29,63,0.3)]' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…
                  </>
                ) : selectedId ? (
                  <>
                    Continue as {selected?.user.name.split(' ')[0]} <ArrowRight size={15} />
                  </>
                ) : (
                  'Select a role to continue'
                )}
              </button>
              <p className="text-center text-gray-300 text-[11px] mt-3.5">
                Demo environment · {liveLeads().length.toLocaleString('en-IN')} illustrative leads · you can switch role after signing in
              </p>
            </div>
          </div>
          <p className="text-center text-gray-300 text-xs mt-5">Powered by Fristine Infotech · Zoho CRM Solution</p>
        </div>
      </div>
    </div>
  )
}
