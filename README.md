# WhatsNep 💬

A modern, secure, and beautiful chat application built with React, Tailwind CSS, Supabase, and Framer Motion.

![WhatsNep](https://img.shields.io/badge/WhatsNep-Chat%20App-6366f1?style=for-the-badge)

## ✨ Features

### Design & UI
- **Modern minimalist design** with smooth animations
- **Gradient color scheme** (deep purple to cyan) with dark mode
- **Responsive layout** for desktop, tablet, and mobile
- **Framer Motion animations** throughout the app
- **Beautiful micro-interactions** on all user actions

### Authentication
- **Simple sign up** with username and password
- **Real-time username availability check**
- **Password strength indicator**
- **Auto-logout** when tab/browser is closed (session-based)
- **Password change** functionality

### Chat Features
- **Direct messaging** between users
- **User search** to find and start conversations
- **Real-time messaging** with typing indicators
- **Online/offline status** display
- **Message timestamps**
- **Chat history** persistence
- **Contact list** in sidebar

### Security
- **Supabase Authentication** for secure user management
- **Session-based storage** for auto-logout on tab close
- **Password encryption** handled by Supabase
- **Input validation** to prevent injection attacks

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- A Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/zhafran12382/whatsnepp3.git
cd whatsnepp3
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Add your Supabase credentials to `.env`:
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

5. Set up your Supabase database with the required tables (see Database Setup below)

6. Start the development server:
```bash
npm run dev
```

### Database Setup

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  receiver_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Messages policies
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Enable realtime for messages
ALTER publication supabase_realtime ADD TABLE messages;
ALTER publication supabase_realtime ADD TABLE profiles;
```

## 🛠 Tech Stack

- **Frontend**: React.js 18
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Authentication**: Supabase Auth
- **Animations**: Framer Motion
- **Routing**: React Router DOM 7
- **Build Tool**: Vite

## 📁 Project Structure

```
src/
├── components/       # Reusable UI components
├── contexts/         # React contexts (Auth)
├── hooks/            # Custom React hooks
├── lib/              # Utilities and Supabase client
├── pages/            # Page components
│   ├── Landing.jsx   # Welcome page
│   ├── Login.jsx     # Login page
│   ├── Register.jsx  # Sign up page
│   └── Chat.jsx      # Main chat dashboard
├── App.jsx           # Main app with routing
├── main.jsx          # Entry point
└── index.css         # Global styles
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📄 License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Design inspired by modern chat applications
- Built with love using open-source technologies
