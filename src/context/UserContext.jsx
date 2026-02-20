import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('fwf_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  // Hydrate avatar from DB if not in stored session (handles existing sessions)
  useEffect(() => {
    if (!user?.id || user.avatar !== undefined) return
    supabase.from('players').select('avatar').eq('id', user.id).single().then(({ data }) => {
      if (data) {
        setUser(prev => {
          const updated = { ...prev, avatar: data.avatar }
          localStorage.setItem('fwf_user', JSON.stringify(updated))
          return updated
        })
      }
    })
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const login = (userData) => {
    setUser(userData)
    localStorage.setItem('fwf_user', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('fwf_user')
  }

  const updateUser = (userData) => {
    setUser(userData)
    localStorage.setItem('fwf_user', JSON.stringify(userData))
  }

  return (
    <UserContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
