import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

export default function InstructorCriarAula() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name:'', type:'Yoga', scheduled_at:'', duration_min:60, max_capacity:15, location:'', description:'' })
  const [errors, setErrors] = useState({})
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Nome da aula é obrigatório'
    if (!form.scheduled_at) e.scheduled_at = 'Data e hora obrigatórias'
    else if (new Date(form.scheduled_at) < new Date()) e.scheduled_at = 'A data não pode ser no passado'
    if (form.duration_min < 15) e.duration_min = 'Mínimo 15 minutos'
    if (form.max_capacity < 1) e.max_capacity = 'Mínimo 1 participante'
    return e
  }

  async function handleCreate(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    const { error } = await supabase.from('classes').insert({
      ...form, instructor_id: profile?.id, status:'confirmed', enrolled_count:0
    })
    if (error) setMsg('Erro ao criar aula: ' + error.message)
    else {
      setMsg('Aula criada com sucesso!')
      setForm({ name:'', type:'Yoga', scheduled_at:'', duration_min:60, max_capacity:15, location:'', description:'' })
      setErrors({})
      setTimeout(() => navigate('/instrutor/gerir-aulas'), 1500)
    }
    setSaving(false)
  }

  const Field = ({ label, error, children }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
      {error && <div style={{ color:'var(--red)', fontSize:11, marginTop:4 }}>{error}</div>}
    </div>
  )

  return (
    <div>
      <div className="flex-between mb-6">
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Criar nova aula</h1>
          <p style={{ color:'var(--t2)' }}>Preenche os dados para agendar uma aula de grupo</p>
        </div>
      </div>

      {msg && <div className={`alert ${msg.includes('Erro')?'alert-error':'alert-success'} mb-4`}>{msg}</div>}

      <div className="card" style={{ maxWidth:680 }}>
        <form onSubmit={handleCreate}>
          <Field label="Nome da aula *" error={errors.name}>
            <input className="form-input" placeholder="ex: Yoga Matinal, Spinning Power..." value={form.name} onChange={e=>set('name',e.target.value)} />
          </Field>

          <div className="form-row">
            <Field label="Modalidade" error={errors.type}>
              <select className="form-select" value={form.type} onChange={e=>set('type',e.target.value)}>
                {['Yoga','Spinning','Pilates','CrossFit','Natação','Dança','Musculação','Funcional'].map(t=><option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Data e hora *" error={errors.scheduled_at}>
              <input className="form-input" type="datetime-local" value={form.scheduled_at} onChange={e=>set('scheduled_at',e.target.value)} min={new Date().toISOString().slice(0,16)} />
            </Field>
          </div>

          <div className="form-row">
            <Field label="Duração (minutos) *" error={errors.duration_min}>
              <select className="form-select" value={form.duration_min} onChange={e=>set('duration_min',parseInt(e.target.value))}>
                {[30,45,60,75,90,120].map(d=><option key={d} value={d}>{d} minutos</option>)}
              </select>
            </Field>
            <Field label="Capacidade máxima *" error={errors.max_capacity}>
              <input className="form-input" type="number" min={1} max={100} value={form.max_capacity} onChange={e=>set('max_capacity',parseInt(e.target.value)||1)} />
            </Field>
          </div>

          <Field label="Local / Estúdio">
            <input className="form-input" placeholder="ex: Studio A, Gym Floor..." value={form.location} onChange={e=>set('location',e.target.value)} />
          </Field>

          <Field label="Descrição">
            <textarea className="form-input" rows={3} placeholder="Descreve o que os participantes podem esperar..." value={form.description} onChange={e=>set('description',e.target.value)} style={{ resize:'vertical' }} />
          </Field>

          <div style={{ display:'flex', gap:12, marginTop:4 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving?'A criar...':'Criar aula'}</button>
            <button className="btn btn-secondary" type="button" onClick={()=>navigate('/instrutor/gerir-aulas')}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
