import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
}

// Password strength calculator
const calculatePasswordStrength = (password) => {
  let strength = 0
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  }

  if (checks.length) strength += 1
  if (checks.lowercase && checks.uppercase) strength += 1
  if (checks.numbers) strength += 1
  if (checks.special) strength += 1
  if (password.length >= 12) strength += 1

  return {
    score: Math.min(strength, 4),
    checks,
    label: ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][Math.min(strength, 4)],
    color: ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'][Math.min(strength, 4)]
  }
}

const Register = () => {
  const navigate = useNavigate()
  const { user, signUp, checkUsername, loading, error, clearError } = useAuth()
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  })
  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState(null) // null, 'checking', 'available', 'taken'
  const [passwordStrength, setPasswordStrength] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/chat')
    }
  }, [user, navigate])

  // Clear errors when form data changes
  useEffect(() => {
    clearError?.()
  }, [formData, clearError])

  // Debounced username check
  useEffect(() => {
    const username = formData.username.trim()
    
    if (!username || username.length < 3) {
      setUsernameStatus(null)
      return
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameStatus(null)
      setFormErrors(prev => ({
        ...prev,
        username: 'Username can only contain letters, numbers, and underscores'
      }))
      return
    }

    setFormErrors(prev => ({ ...prev, username: '' }))
    setUsernameStatus('checking')

    const timeoutId = setTimeout(async () => {
      try {
        const result = await checkUsername(username)
        if (result.available) {
          setUsernameStatus('available')
        } else {
          setUsernameStatus('taken')
        }
      } catch (err) {
        console.error('Username check error:', err)
        setUsernameStatus(null)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [formData.username, checkUsername])

  // Update password strength
  useEffect(() => {
    if (formData.password) {
      setPasswordStrength(calculatePasswordStrength(formData.password))
    } else {
      setPasswordStrength(null)
    }
  }, [formData.password])

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear specific field error
    setFormErrors(prev => ({
      ...prev,
      [name]: ''
    }))
  }, [])

  const validateForm = () => {
    const errors = {}
    const { username, password, confirmPassword } = formData

    // Username validation
    if (!username.trim()) {
      errors.username = 'Username is required'
    } else if (username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters'
    } else if (username.trim().length > 20) {
      errors.username = 'Username must be less than 20 characters'
    } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      errors.username = 'Username can only contain letters, numbers, and underscores'
    } else if (usernameStatus === 'taken') {
      errors.username = 'This username is already taken'
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    // Confirm password validation
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setFormErrors({})

    const { username, password } = formData

    try {
      const result = await signUp(username.trim(), password)

      if (result.success) {
        // Show success and redirect to chat
        navigate('/chat')
      } else {
        // Handle specific error messages
        const errorMessage = result.error || 'Failed to create account'
        setFormErrors({ submit: errorMessage })
      }
    } catch (err) {
      console.error('Registration error:', err)
      setFormErrors({ submit: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Back button */}
        <motion.div variants={itemVariants} className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </motion.div>

        {/* Card */}
        <motion.div
          variants={itemVariants}
          className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8 shadow-2xl"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 mb-4 shadow-lg"
              whileHover={{ scale: 1.05, rotate: -5 }}
            >
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
            <p className="text-slate-400">Join WhatsNep and start chatting</p>
          </div>

          {/* Error messages */}
          <AnimatePresence>
            {(formErrors.submit || error) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-6"
              >
                <p className="text-red-400 text-sm text-center">{formErrors.submit || error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                  className={`w-full bg-slate-900/50 border rounded-xl pl-12 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                    formErrors.username 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                      : usernameStatus === 'available'
                      ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                      : usernameStatus === 'taken'
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20'
                  }`}
                  autoComplete="username"
                />
                {/* Username status indicator */}
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  {usernameStatus === 'checking' && (
                    <svg className="w-5 h-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {usernameStatus === 'available' && (
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {usernameStatus === 'taken' && (
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </span>
              </div>
              {formErrors.username && (
                <p className="mt-2 text-sm text-red-400">{formErrors.username}</p>
              )}
              {usernameStatus === 'available' && !formErrors.username && (
                <p className="mt-2 text-sm text-green-400">Username is available!</p>
              )}
              {usernameStatus === 'taken' && !formErrors.username && (
                <p className="mt-2 text-sm text-red-400">This username is already taken</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  className={`w-full bg-slate-900/50 border rounded-xl pl-12 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                    formErrors.password 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20'
                  }`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {formErrors.password && (
                <p className="mt-2 text-sm text-red-400">{formErrors.password}</p>
              )}
              
              {/* Password strength indicator */}
              {passwordStrength && (
                <div className="mt-3">
                  <div className="flex gap-1 mb-2">
                    {[0, 1, 2, 3].map((index) => (
                      <div
                        key={index}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          index < passwordStrength.score 
                            ? passwordStrength.color 
                            : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${
                    passwordStrength.score < 2 ? 'text-red-400' : 
                    passwordStrength.score < 3 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    Password strength: {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </span>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className={`w-full bg-slate-900/50 border rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                    formErrors.confirmPassword 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                      : formData.confirmPassword && formData.password === formData.confirmPassword
                      ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                      : 'border-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20'
                  }`}
                  autoComplete="new-password"
                />
              </div>
              {formErrors.confirmPassword && (
                <p className="mt-2 text-sm text-red-400">{formErrors.confirmPassword}</p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && !formErrors.confirmPassword && (
                <p className="mt-2 text-sm text-green-400">Passwords match!</p>
              )}
            </div>

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={isSubmitting || loading || usernameStatus === 'taken' || usernameStatus === 'checking'}
              className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              whileHover={{ scale: isSubmitting || loading ? 1 : 1.02 }}
              whileTap={{ scale: isSubmitting || loading ? 1 : 0.98 }}
            >
              {isSubmitting || loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-slate-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Register
