import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Analytics from './pages/Analytics'
import Tasks from './pages/Tasks'
import Audit from './pages/Audit'
import UserAdmin from './pages/UserAdmin'
import Customer360 from './pages/Customer360'

function ProtectedApp() {
  const { currentUser } = useAuth()
  if (!currentUser) return <Navigate to="/login" replace />

  return (
    <Layout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/admin" element={<UserAdmin />} />
        <Route path="/customer360" element={<Customer360 />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

function AppRoutes() {
  const { currentUser } = useAuth()
  return (
    <Routes>
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
