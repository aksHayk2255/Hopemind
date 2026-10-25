import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom';
import { Heart, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { EmergencyModal } from './components/common/EmergencyModal';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { MotherDashboard } from './components/mother/MotherDashboard';
import { AssessmentForm } from './components/mother/AssessmentForm';
import { AssessmentHistory } from './components/mother/AssessmentHistory';
import { MoodLogger } from './components/mother/MoodLogger';
import { MoodTrends } from './components/mother/MoodTrends';
import { HopeBotChat } from './components/mother/HopeBotChat';
import { PrivacySettings } from './components/mother/PrivacySettings';
import { StaffDashboard } from './components/staff/StaffDashboard';

function Home() {
  const { user } = useAuth();
  const destination = user ? `/${user.role}` : '/login';

  return (
    <main className="subtle-gradient flex-1">
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-lavender-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-lavender-800">
            <Sparkles className="h-3.5 w-3.5" />
            Compassionate care, powered by insight
          </div>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-navy-950 sm:text-6xl">
            Support for every step of your postpartum journey.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            HopeMind brings screening, daily mood tracking, an empathetic AI companion, and care-team coordination into one private space.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={destination} className="inline-flex items-center gap-2 rounded-2xl bg-lavender-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-lavender-200 transition hover:bg-lavender-700">
              {user ? 'Open my dashboard' : 'Login'}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {!user && <Link to="/register" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Register</Link>}
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-lavender-200 via-white to-teal-100 blur-2xl" />
          <div className="relative rounded-[2rem] border border-white bg-white/90 p-8 shadow-2xl">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-lavender-600 to-teal-400"><Heart className="h-6 w-6 fill-white/20 text-white" /></div>
              <div><p className="font-bold text-navy-950">Your care space</p><p className="text-xs text-slate-500">Private, supportive, always available</p></div>
            </div>
            {['Daily check-ins that meet you where you are', 'Evidence-based EPDS screening', 'A connected clinical care team'].map((item) => (
              <div key={item} className="mb-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                <ShieldCheck className="h-5 w-5 shrink-0 text-teal-600" />{item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function AppShell() {
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const openEmergency = () => setEmergencyOpen(true);

  return (
    <div className="flex min-h-screen flex-col bg-warm-50 text-navy-900">
      <Navbar onOpenEmergency={openEmergency} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/mother" element={<ProtectedRoute allowedRoles={['mother']}><MotherDashboard onOpenEmergency={openEmergency} /></ProtectedRoute>} />
        <Route path="/mother/assessment" element={<ProtectedRoute allowedRoles={['mother']}><AssessmentForm onOpenEmergency={openEmergency} /></ProtectedRoute>} />
        <Route path="/mother/history" element={<ProtectedRoute allowedRoles={['mother']}><AssessmentHistory /></ProtectedRoute>} />
        <Route path="/mother/mood" element={<ProtectedRoute allowedRoles={['mother']}><MoodLogger /></ProtectedRoute>} />
        <Route path="/mother/trends" element={<ProtectedRoute allowedRoles={['mother']}><MoodTrends /></ProtectedRoute>} />
        <Route path="/mother/chat" element={<ProtectedRoute allowedRoles={['mother']}><HopeBotChat onOpenEmergency={openEmergency} /></ProtectedRoute>} />
        <Route path="/mother/settings" element={<ProtectedRoute allowedRoles={['mother']}><PrivacySettings /></ProtectedRoute>} />
        <Route path="/doctor/*" element={<ProtectedRoute allowedRoles={['doctor']}><StaffDashboard role="doctor" /></ProtectedRoute>} />
        <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['admin']}><StaffDashboard role="admin" /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer onOpenEmergency={openEmergency} />
      <EmergencyModal isOpen={emergencyOpen} onClose={() => setEmergencyOpen(false)} />
    </div>
  );
}

export default function App() {
  return <BrowserRouter><AuthProvider><AppShell /></AuthProvider></BrowserRouter>;
}
