import { createClient } from '@supabase/supabase-js'

// Supabase configuration
// Set these environment variables in your .env file (see .env.example)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  )
}

// Create Supabase client with session storage for auto-logout on tab close
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    // Use sessionStorage for auto-logout on tab close
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Auth helper functions
export const authHelpers = {
  /**
   * Sign up a new user with username and password
   * Uses email format: username@whatsnep.local for Supabase compatibility
   */
  async signUp(username, password) {
    // First check if username is available
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.toLowerCase())
      .single()

    if (existingUser) {
      return { 
        data: null, 
        error: { message: 'Username already taken. Please choose a different one.' } 
      }
    }

    // Create auth user with username as email (using @whatsnep.local domain)
    const email = `${username.toLowerCase()}@whatsnep.local`
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase()
        }
      }
    })

    if (error) {
      // Handle specific Supabase errors
      if (error.message.includes('already registered')) {
        return {
          data: null,
          error: { message: 'Username already taken. Please choose a different one.' }
        }
      }
      return { data: null, error }
    }

    // Create profile entry
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          username: username.toLowerCase(),
          created_at: new Date().toISOString()
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
      }
    }

    return { data, error: null }
  },

  /**
   * Sign in with username and password
   */
  async signIn(username, password) {
    const email = `${username.toLowerCase()}@whatsnep.local`
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return {
          data: null,
          error: { message: 'Invalid username or password.' }
        }
      }
      return { data: null, error }
    }

    // Update user's online status
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq('id', data.user.id)
    }

    return { data, error: null }
  },

  /**
   * Sign out the current user
   */
  async signOut() {
    // Update user's offline status
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase
        .from('profiles')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', user.id)
    }

    return await supabase.auth.signOut()
  },

  /**
   * Update user's password
   */
  async updatePassword(newPassword) {
    return await supabase.auth.updateUser({ password: newPassword })
  },

  /**
   * Check if username is available
   */
  async checkUsernameAvailable(username) {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.toLowerCase())
      .single()

    // If no data and error is "no rows", username is available
    if (!data && error?.code === 'PGRST116') {
      return { available: true, error: null }
    }

    if (error && error.code !== 'PGRST116') {
      return { available: false, error }
    }

    return { available: false, error: null }
  },

  /**
   * Get current session
   */
  async getSession() {
    return await supabase.auth.getSession()
  }
}

export default supabase
