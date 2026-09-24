import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { signOut } from '../lib/supabase'

const navConfig = {
  membro: [
    { to:'/membro/dashboard',            label:'Dashboard' },
    { to:'/membro/aulas',                label:'Aulas disponíveis' },
    { to:'/membro/treino-personalizado', label:'Treino personalizado' },
    { to:'/membro/inscricoes',           label:'Minhas inscrições' },
    { to:'/membro/perfil',               label:'Perfil' },
  ],
  instrutor: [
    { to:'/instrutor/dashboard',         label:'Dashboard' },
    { to:'/instrutor/disponibilidade',   label:'Disponibilidade' },
    { to:'/instrutor/pedidos-treino',    label:'Pedidos de treino' },
    { to:'/instrutor/criar-aula',        label:'Criar aula' },
    { to:'/instrutor/inscritos',         label:'Inscritos' },
    { to:'/instrutor/gerir-aulas',       label:'Gerir aulas' },
  ],
  admin: [
    { to:'/admin/dashboard',             label:'Dashboard' },
    { to:'/admin/pedidos-pendentes',     label:'Pedidos pendentes' },
    { to:'/admin/membros',               label:'Membros' },
    { to:'/admin/estudios',              label:'Estúdios' },
    { to:'/admin/ocupacao-estudios',     label:'Ocupação de estúdios' },
    { to:'/admin/equipamentos',          label:'Equipamentos' },
    { to:'/admin/relatorios',            label:'Relatórios' },
  ],
}

const roleBadgeColor = { membro:'#2563EB', instrutor:'#10B981', admin:'#F59E0B' }
const roleLabel = { membro:'Membro', instrutor:'Instrutor', admin:'Administrador' }

export default function Layout({ role }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const nav = navConfig[role] || []
  const currentNav = nav.find(n => location.pathname === n.to || location.pathname.startsWith(n.to + '/'))
  const pageTitle = currentNav?.label || 'FitTrack'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()
    : 'U'

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">F</div>
          <span className="sidebar-logo-text">FitTrack</span>
        </div>

        <nav className="sidebar-nav">
          {nav.map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-signout" onClick={handleSignOut}>
            <span style={{ fontSize:14 }}>←</span>
            Sair da conta
          </div>
          <div className="sidebar-role" style={{ background: roleBadgeColor[role] }}>
            {roleLabel[role]}
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div style={{ flex:1 }}>
            <span style={{ fontSize:15, fontWeight:600, color:'var(--t1)' }}>{pageTitle}</span>
          </div>
          <div className="flex-center" style={{ gap:12 }}>
            <span style={{ fontSize:13, color:'var(--t2)' }}>{profile?.full_name}</span>
            <div className="avatar">{initials}</div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
