import { useMemo, useState } from 'react'
import { UserPlus } from 'lucide-react'
import Modal, { CancelButton, inputCls, labelCls } from './Modal'
import { ROLES, ROLE_CODES, roleLabel } from '../../config/roles'
import { BRANCHES } from '../../data/geography'
import { createUser } from '../../logic/userStore'
import { USERS } from '../../data/crm'
import { auditEvents } from '../../logic/auditTrail'

const Field = ({ label, error, required, children }) => (
  <div>
    <label className={labelCls}>
      {label}
      {required && <span className="ml-0.5 text-[#861D3F]">*</span>}
    </label>
    {children}
    {error && <p className="mt-1 text-[10px] font-medium text-red-600">{error}</p>}
  </div>
)

/**
 * MOM 8 Sep: "User creation is restricted to Super Admin." The caller gates on
 * the role; this form only collects what the Input Sheet's user master needs.
 */
export default function CreateUserModal({ actor, onClose, onDone }) {
  const [form, setForm] = useState({ name: '', role: 'DST', email: '', phone: '', managerId: '', branchCode: '' })
  const [errors, setErrors] = useState({})

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // A reporting manager must sit above the new user in the hierarchy, so the
  // list is the roles the Input Sheet places directly over this one.
  const managers = useMemo(() => {
    const above = ROLES[form.role]?.reportsTo
    const pool = USERS.filter((u) => u.status !== 'Inactive' && u.role !== form.role)
    const direct = pool.filter((u) => u.role === above)
    return (direct.length ? direct : pool).slice(0, 200)
  }, [form.role])

  const needsBranch = ['DST', 'SM'].includes(form.role)

  const submit = () => {
    const { user, errors: errs } = createUser(form)
    if (!user) {
      setErrors(errs)
      return
    }
    auditEvents.userCreated(actor, user)
    onDone?.(user)
    onClose()
  }

  return (
    <Modal title="Create user" icon={UserPlus} onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Full name" required error={errors.name}>
          <input className={inputCls} value={form.name} onChange={set('name')} placeholder="e.g. Anjali Deshmukh" />
        </Field>

        <Field label="Role" required error={errors.role}>
          <select className={inputCls} value={form.role} onChange={set('role')}>
            {ROLE_CODES.map((c) => (
              <option key={c} value={c}>{c} — {roleLabel(c)}</option>
            ))}
          </select>
        </Field>

        <Field label="Email" required error={errors.email}>
          <input className={inputCls} value={form.email} onChange={set('email')} placeholder="name@axisfinance.in" />
        </Field>

        <Field label="Phone">
          <input className={inputCls} value={form.phone} onChange={set('phone')} placeholder="+91 ..." />
        </Field>

        <Field label="Reporting manager" error={errors.managerId}>
          <select className={inputCls} value={form.managerId} onChange={set('managerId')}>
            <option value="">— none (central role) —</option>
            {managers.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>
        </Field>

        <Field label="Branch" required={needsBranch} error={errors.branchCode}>
          <select className={inputCls} value={form.branchCode} onChange={set('branchCode')}>
            <option value="">— not branch-posted —</option>
            {BRANCHES.map((b) => (
              <option key={b.code} value={b.code}>{b.branch}</option>
            ))}
          </select>
        </Field>
      </div>

      <p className="mt-3 rounded-xl border border-af-border bg-af-bg px-3 py-2 text-[11px] text-slate-500">
        The user is created Active on the default demo password, entitled to all
        products until you restrict them, and joins the allocation pool for their
        branch immediately. AFL's real user master is MOM action A7.
      </p>

      <div className="mt-5 flex justify-end gap-2">
        <CancelButton onClick={onClose} />
        <button type="button" onClick={submit} className="btn-primary">Create user</button>
      </div>
    </Modal>
  )
}
