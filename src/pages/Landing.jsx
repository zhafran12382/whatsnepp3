import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'

// Animation variants for elements
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      staggerChildren: 0.2
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
}

const floatVariants = {
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
}

// Chat bubble icon component
const ChatBubble = ({ className, delay = 0 }) => (
  <motion.div
    className={`absolute ${className}`}
    variants={floatVariants}
    animate="animate"
    style={{ animationDelay: `${delay}s` }}
  >
    <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 backdrop-blur-sm border border-white/10 flex items-center justify-center">
      <svg className="w-8 h-8 md:w-12 md:h-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    </div>
  </motion.div>
)

const Landing = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/chat')
    }
  }, [user, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Floating chat bubbles */}
      <ChatBubble className="top-20 left-10 md:left-20" delay={0} />
      <ChatBubble className="top-40 right-16 md:right-32" delay={1} />
      <ChatBubble className="bottom-32 left-20 md:left-40" delay={2} />
      <ChatBubble className="bottom-20 right-10 md:right-20" delay={0.5} />

      {/* Main content */}
      <motion.div
        className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo and title */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 md:w-28 md:h-28 rounded-3xl bg-gradient-to-br from-indigo-500 to-cyan-400 mb-6 shadow-2xl shadow-indigo-500/25"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-10 h-10 md:w-14 md:h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4">
            WhatsNep
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-md mx-auto">
            Simple. Secure. Beautiful.
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-3 gap-4 md:gap-8 mb-12 max-w-lg"
        >
          {[
            { icon: '🔒', title: 'Secure', desc: 'End-to-end private' },
            { icon: '⚡', title: 'Fast', desc: 'Real-time messaging' },
            { icon: '✨', title: 'Simple', desc: 'Easy to use' }
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              className="text-center p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <span className="text-2xl md:text-3xl mb-2 block">{feature.icon}</span>
              <h3 className="font-semibold text-white text-sm md:text-base">{feature.title}</h3>
              <p className="text-xs md:text-sm text-slate-400">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4"
        >
          <motion.button
            onClick={() => navigate('/register')}
            className="px-8 py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Get Started
          </motion.button>
          <motion.button
            onClick={() => navigate('/login')}
            className="px-8 py-4 rounded-2xl font-semibold text-white bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Sign In
          </motion.button>
        </motion.div>

        {/* Footer */}
        <motion.p
          variants={itemVariants}
          className="absolute bottom-6 text-slate-500 text-sm"
        >
          © 2024 WhatsNep. Private messaging made simple.
        </motion.p>
      </motion.div>
    </div>
  )
}

export default Landing
