import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { AuthContext, useAuth } from './lib/auth'

import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Register from './pages/Register'
import Layout from './components/Layout'

// Member pages
import MemberDashboard from './pages/member/Dashboard'
import MemberAulas from './pages/member/Aulas'
import MemberTreinoPersonalizado from './pages/member/TreinoPersonalizado'
import MemberInscricoes from './pages/member/Inscricoes'
import MemberPerfil from './pages/member/Perfil'

// Instructor pages
import InstructorDashboard from './pages/instructor/Dashboard'
import InstructorCriarAula from './pages/instructor/CriarAula'
import InstructorInscritos from './pages/instructor/Inscritos'
import InstructorGerirAulas from './pages/instructor/GerirAulas'
import InstructorDisponibilidade from './pages/instructor/Disponibilidade'
import InstructorPedidosTreino from './pages/instructor/PedidosTreino'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminMembros from './pages/admin/Membros'
import AdminEquipamentos from './pages/admin/Equipamentos'
import AdminRelatorios from './pages/admin/Relatorios'
import { AdminPedidosPendentes, AdminEstudios, AdminOcupacaoEstudios } from './pages/admin/workflow'

function LoadingScreen() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', color:'#6366F1', fontSize:16 }}>
      A carregar...
    </div>
  )
}

function homeForRole(role) {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'instrutor') return '/instrutor/dashboard'
  return '/membro/dashboard'
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()
  if (loading || (user && (!profile || profile.id !== user.id))) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={homeForRole(profile.role)} replace />
  }
  return children
}

function PublicRoute({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading || (user && (!profile || profile.id !== user.id))) return <LoadingScreen />
  if (user) return <Navigate to={homeForRole(profile.role)} replace />
  return children
}

function HomeRoute() {
  const { user, profile, loading } = useAuth()
  if (loading || (user && (!profile || profile.id !== user.id))) return <LoadingScreen />
  return <Navigate to={user ? homeForRole(profile.role) : '/login'} replace />
}

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true)
      setUser(session?.user ?? null)
      setProfile(null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error || !data) {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setLoading(false)
      return
    }
    setProfile(data)
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, setProfile }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Membro */}
          <Route path="/membro" element={<ProtectedRoute allowedRoles={['membro']}><Layout role="membro" /></ProtectedRoute>}>
            <Route path="dashboard" element={<MemberDashboard />} />
            <Route path="aulas" element={<MemberAulas />} />
            <Route path="treino-personalizado" element={<MemberTreinoPersonalizado />} />
            <Route path="inscricoes" element={<MemberInscricoes />} />
            <Route path="perfil" element={<MemberPerfil />} />
          </Route>

          {/* Instrutor */}
          <Route path="/instrutor" element={<ProtectedRoute allowedRoles={['instrutor']}><Layout role="instrutor" /></ProtectedRoute>}>
            <Route path="dashboard" element={<InstructorDashboard />} />
            <Route path="disponibilidade" element={<InstructorDisponibilidade />} />
            <Route path="pedidos-treino" element={<InstructorPedidosTreino />} />
            <Route path="criar-aula" element={<InstructorCriarAula />} />
            <Route path="inscritos" element={<InstructorInscritos />} />
            <Route path="gerir-aulas" element={<InstructorGerirAulas />} />
          </Route>

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Layout role="admin" /></ProtectedRoute>}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="pedidos-pendentes" element={<AdminPedidosPendentes />} />
            <Route path="membros" element={<AdminMembros />} />
            <Route path="estudios" element={<AdminEstudios />} />
            <Route path="ocupacao-estudios" element={<AdminOcupacaoEstudios />} />
            <Route path="equipamentos" element={<AdminEquipamentos />} />
            <Route path="relatorios" element={<AdminRelatorios />} />
          </Route>

          <Route path="/" element={<HomeRoute />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
