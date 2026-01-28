import { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// Chat message component
const ChatMessage = ({ message, isOwn, showTimestamp }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.2 }}
    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}
  >
    <div
      className={`max-w-[70%] px-4 py-2 rounded-2xl ${
        isOwn
          ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded-br-sm'
          : 'bg-slate-700 text-white rounded-bl-sm'
      }`}
    >
      <p className="break-words">{message.content}</p>
      {showTimestamp && (
        <p className={`text-xs mt-1 ${isOwn ? 'text-indigo-100' : 'text-slate-400'}`}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  </motion.div>
)

// Contact item component
const ContactItem = ({ contact, isActive, onClick, unreadCount }) => (
  <motion.button
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
      isActive
        ? 'bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30'
        : 'hover:bg-slate-700/50'
    }`}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="relative">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white font-semibold text-lg">
        {contact.username.charAt(0).toUpperCase()}
      </div>
      {contact.is_online && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800" />
      )}
    </div>
    <div className="flex-1 text-left min-w-0">
      <p className="font-medium text-white truncate">{contact.username}</p>
      <p className="text-sm text-slate-400 truncate">
        {contact.is_online ? 'Online' : 'Offline'}
      </p>
    </div>
    {unreadCount > 0 && (
      <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
        {unreadCount}
      </div>
    )}
  </motion.button>
)

const Chat = () => {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // State
  const [contacts, setContacts] = useState([])
  const [selectedContact, setSelectedContact] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSettings, setShowSettings] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [typingTimeout, setTypingTimeout] = useState(null)

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch contacts (users with previous conversations)
  useEffect(() => {
    if (!user) return

    const fetchContacts = async () => {
      try {
        // Get all users the current user has chatted with
        const { data: sentMessages } = await supabase
          .from('messages')
          .select('receiver_id')
          .eq('sender_id', user.id)

        const { data: receivedMessages } = await supabase
          .from('messages')
          .select('sender_id')
          .eq('receiver_id', user.id)

        // Get unique user IDs
        const userIds = new Set()
        sentMessages?.forEach(m => userIds.add(m.receiver_id))
        receivedMessages?.forEach(m => userIds.add(m.sender_id))

        if (userIds.size > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', Array.from(userIds))

          setContacts(profiles || [])
        }
      } catch (err) {
        console.error('Error fetching contacts:', err)
      }
    }

    fetchContacts()

    // Subscribe to new messages to update contacts
    const subscription = supabase
      .channel('contacts-updates')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      }, () => {
        fetchContacts()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  // Fetch messages for selected contact
  useEffect(() => {
    if (!user || !selectedContact) {
      setMessages([])
      return
    }

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true })

        if (error) throw error
        setMessages(data || [])
      } catch (err) {
        console.error('Error fetching messages:', err)
      }
    }

    fetchMessages()

    // Subscribe to new messages
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        const newMsg = payload.new
        // Check if message is between current user and selected contact
        if (
          (newMsg.sender_id === user.id && newMsg.receiver_id === selectedContact.id) ||
          (newMsg.sender_id === selectedContact.id && newMsg.receiver_id === user.id)
        ) {
          setMessages(prev => [...prev, newMsg])
        }
      })
      .subscribe()

    // Subscribe to typing status
    const typingChannel = supabase
      .channel('typing')
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.userId === selectedContact.id) {
          setIsTyping(true)
          setTimeout(() => setIsTyping(false), 3000)
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
      typingChannel.unsubscribe()
    }
  }, [user, selectedContact])

  // Search users
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', user?.id)
        .limit(10)

      if (error) throw error
      setSearchResults(data || [])
    } catch (err) {
      console.error('Error searching users:', err)
    }
  }, [searchQuery, user])

  useEffect(() => {
    const timeoutId = setTimeout(handleSearch, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, handleSearch])

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedContact) return

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedContact.id,
          content: newMessage.trim()
        })

      if (error) throw error
      setNewMessage('')
      inputRef.current?.focus()
    } catch (err) {
      console.error('Error sending message:', err)
    }
  }

  // Handle typing indicator
  const handleTyping = () => {
    if (typingTimeout) clearTimeout(typingTimeout)
    
    supabase.channel('typing').send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id }
    })

    setTypingTimeout(setTimeout(() => {}, 3000))
  }

  // Handle sign out
  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // Select a user from search results
  const handleSelectUser = (selectedUser) => {
    setSelectedContact(selectedUser)
    setSearchQuery('')
    setSearchResults([])
    
    // Add to contacts if not already there
    if (!contacts.find(c => c.id === selectedUser.id)) {
      setContacts(prev => [...prev, selectedUser])
    }
    
    // Hide sidebar on mobile
    if (window.innerWidth < 768) {
      setShowSidebar(false)
    }
  }

  if (!user) return null

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="w-full md:w-80 lg:w-96 bg-slate-800/50 backdrop-blur-xl border-r border-slate-700/50 flex flex-col absolute md:relative z-20 h-full"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                    WhatsNep
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={() => setShowSettings(true)}
                    className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </motion.button>
                  <motion.button
                    onClick={handleSignOut}
                    className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-slate-400 hover:text-red-400"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </motion.button>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="md:hidden p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                  {searchResults.map(result => (
                    <button
                      key={result.id}
                      onClick={() => handleSelectUser(result)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white text-sm">
                        {result.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white">{result.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Contacts list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {contacts.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p>No contacts yet</p>
                  <p className="text-sm mt-1">Search for users to start chatting</p>
                </div>
              ) : (
                contacts.map(contact => (
                  <ContactItem
                    key={contact.id}
                    contact={contact}
                    isActive={selectedContact?.id === contact.id}
                    onClick={() => {
                      setSelectedContact(contact)
                      if (window.innerWidth < 768) setShowSidebar(false)
                    }}
                    unreadCount={0}
                  />
                ))
              )}
            </div>

            {/* User profile footer */}
            <div className="p-4 border-t border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white font-semibold">
                  {profile?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{profile?.username || 'User'}</p>
                  <p className="text-xs text-green-400">Online</p>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        {selectedContact ? (
          <>
            <div className="p-4 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(true)}
                className="md:hidden p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white font-semibold">
                  {selectedContact.username.charAt(0).toUpperCase()}
                </div>
                {selectedContact.is_online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800" />
                )}
              </div>
              <div>
                <p className="font-medium text-white">{selectedContact.username}</p>
                <p className="text-sm text-slate-400">
                  {isTyping ? (
                    <span className="text-green-400">typing...</span>
                  ) : selectedContact.is_online ? (
                    'Online'
                  ) : (
                    'Offline'
                  )}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p>No messages yet</p>
                    <p className="text-sm mt-1">Start the conversation!</p>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isOwn={message.sender_id === user.id}
                    showTimestamp={
                      index === messages.length - 1 ||
                      messages[index + 1]?.sender_id !== message.sender_id
                    }
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700/50 bg-slate-800/30">
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    handleTyping()
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
                <motion.button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  whileHover={{ scale: newMessage.trim() ? 1.05 : 1 }}
                  whileTap={{ scale: newMessage.trim() ? 0.95 : 1 }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </motion.button>
              </div>
            </form>
          </>
        ) : (
          // No chat selected
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <button
                onClick={() => setShowSidebar(true)}
                className="md:hidden mb-4 p-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 mb-6"
              >
                <svg className="w-12 h-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </motion.div>
              <h2 className="text-xl font-semibold text-white mb-2">Welcome to WhatsNep</h2>
              <p>Select a contact or search for users to start chatting</p>
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// Settings Modal Component
const SettingsModal = ({ onClose }) => {
  const { updatePassword, profile } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsSubmitting(true)
    const result = await updatePassword(newPassword)

    if (result.success) {
      setSuccess('Password updated successfully!')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      setError(result.error || 'Failed to update password')
    }
    setIsSubmitting(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-800 rounded-2xl border border-slate-700/50 p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Profile info */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-slate-900/50 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xl">
            {profile?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-medium text-white text-lg">{profile?.username || 'User'}</p>
            <p className="text-sm text-slate-400">Account settings</p>
          </div>
        </div>

        {/* Change password form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="font-medium text-white">Change Password</h3>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-400 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              placeholder="Confirm new password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-lg disabled:opacity-50 transition-all"
          >
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default Chat
