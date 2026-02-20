import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { UserProvider, useUser } from './context/UserContext'
import Layout from './components/Layout'
import LoginScreen from './components/LoginScreen'
import Today from './pages/Today'
import Leaderboard from './pages/Leaderboard'
import History from './pages/History'

function AppRoutes() {
  const { user } = useUser()

  if (!user) return <LoginScreen />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppRoutes />
      </UserProvider>
    </BrowserRouter>
  )
}
