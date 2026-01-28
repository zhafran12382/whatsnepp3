import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, authHelpers } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch user profile from profiles table
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return data
    } catch (err) {
      console.error('Exception fetching profile:', err)
      return null
    }
  }

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          const profileData = await fetchProfile(session.user.id)
          setProfile(profileData)
        }
      } catch (err) {
        console.error('Auth init error:', err)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          const profileData = await fetchProfile(session.user.id)
          setProfile(profileData)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // Sign up function
  const signUp = async (username, password) => {
    setError(null)
    setLoading(true)
    
    try {
      const { data, error } = await authHelpers.signUp(username, password)
      
      if (error) {
        setError(error.message)
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (err) {
      const message = err.message || 'An unexpected error occurred'
      setError(message)
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }

  // Sign in function
  const signIn = async (username, password) => {
    setError(null)
    setLoading(true)
    
    try {
      const { data, error } = await authHelpers.signIn(username, password)
      
      if (error) {
        setError(error.message)
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (err) {
      const message = err.message || 'An unexpected error occurred'
      setError(message)
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }

  // Sign out function
  const signOut = async () => {
    setError(null)
    
    try {
      await authHelpers.signOut()
      setUser(null)
      setProfile(null)
      return { success: true }
    } catch (err) {
      const message = err.message || 'An unexpected error occurred'
      setError(message)
      return { success: false, error: message }
    }
  }

  // Update password function
  const updatePassword = async (newPassword) => {
    setError(null)
    
    try {
      const { error } = await authHelpers.updatePassword(newPassword)
      
      if (error) {
        setError(error.message)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err) {
      const message = err.message || 'An unexpected error occurred'
      setError(message)
      return { success: false, error: message }
    }
  }

  // Check username availability
  const checkUsername = async (username) => {
    return await authHelpers.checkUsernameAvailable(username)
  }

  const value = {
    user,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    updatePassword,
    checkUsername,
    clearError: () => setError(null)
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
