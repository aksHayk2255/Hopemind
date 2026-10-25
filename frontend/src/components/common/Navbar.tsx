import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Heart,
  Shield,
  Activity,
  Smile,
  MessageCircleHeart,
  TrendingUp,
  Settings,
  Users,
  LogOut,
  Bell,
  ChevronDown,
  UserCheck,
  CheckCircle2,
  CalendarCheck
} from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { NotificationItem } from '../../types';

interface NavbarProps {
  onOpenEmergency: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenEmergency }) => {
  const { user, logout, quickDemoLogin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifs, setShowNotifs] = useState<boolean>(false);
  const [showDemoMenu, setShowDemoMenu] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      try {
        const res = await userService.getNotifications();
        if (res && res.notifications) {
          setNotifications(res.notifications);
          setUnreadCount(res.notifications.filter((n) => !n.is_read).length);
        }
      } catch (err) {
        // Silently catch in dev
      }
    };
    fetchNotifs();
  }, [user, location.pathname]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
      if (demoRef.current && !demoRef.current.contains(e.target as Node)) {
        setShowDemoMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDemoSwitch = async (key: 'mother_priya' | 'mother_ananya' | 'doctor' | 'admin') => {
    setShowDemoMenu(false);
    const loggedUser = await quickDemoLogin(key);
    if (loggedUser.role === 'mother') {
      navigate('/mother');
    } else if (loggedUser.role === 'doctor') {
      navigate('/doctor');
    } else if (loggedUser.role === 'admin') {
      navigate('/admin');
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await userService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 border-b border-[#e8e7f7] bg-white/95 shadow-sm backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link to={user ? (user.role === 'mother' ? '/mother' : user.role === 'doctor' ? '/doctor' : '/admin') : '/'} className="flex items-center gap-2.5 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#4938b9] via-[#5b4bdb] to-[#e85d55] shadow-lg transition-transform group-hover:scale-105">
                <Heart className="w-5 h-5 text-white fill-white/20" />
              </div>
              <div>
                <span className="bg-gradient-to-r from-[#141326] via-[#4938b9] to-[#a93638] bg-clip-text text-xl font-bold tracking-tight text-transparent">
                  HopeMind
                </span>
                <span className="ml-2 hidden rounded-full border border-[#d6d0ff] bg-[#f5f3ff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#382b91] sm:inline-block">
                  Perinatal AI Care
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links based on user role */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {user.role === 'mother' && (
                <>
                  <Link
                    to="/mother"
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive('/mother')
                        ? 'bg-lavender-100 text-lavender-900'
                        : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Dashboard
                  </Link>
                  <Link
                    to="/mother/assessment"
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive('/mother/assessment')
                        ? 'bg-lavender-100 text-lavender-900'
                        : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    EPDS Screening
                  </Link>
                  <Link
                    to="/mother/mood"
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive('/mother/mood')
                        ? 'bg-lavender-100 text-lavender-900'
                        : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
                    }`}
                  >
                    <Smile className="w-3.5 h-3.5 text-teal-600" />
                    Daily Mood
                  </Link>
                  <Link
                    to="/mother/trends"
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive('/mother/trends')
                        ? 'bg-lavender-100 text-lavender-900'
                        : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                    Wellness Trends
                  </Link>
                  <Link
                    to="/mother/chat"
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive('/mother/chat')
                        ? 'bg-lavender-100 text-lavender-900'
                        : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
                    }`}
                  >
                    <MessageCircleHeart className="w-3.5 h-3.5 text-lavender-600" />
                    HopeBot Chat
                  </Link>
                  <Link
                    to="/mother/settings"
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive('/mother/settings')
                        ? 'bg-lavender-100 text-lavender-900'
                        : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Settings
                  </Link>
                </>
              )}

              {user.role === 'doctor' && (
                <>
                  <Link
                    to="/doctor"
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive('/doctor')
                        ? 'bg-teal-100 text-teal-900'
                        : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Clinical Dashboard
                  </Link>
                  <Link
                    to="/doctor/patients"
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive('/doctor/patients')
                        ? 'bg-teal-100 text-teal-900'
                        : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-teal-600" />
                    Patient Directory
                  </Link>
                  <Link
                    to="/doctor/follow-ups"
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive('/doctor/follow-ups')
                        ? 'bg-teal-100 text-teal-900'
                        : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
                    }`}
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Follow-Ups
                  </Link>
                </>
              )}

              {user.role === 'admin' && (
                <>
                  <Link
                    to="/admin"
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive('/admin')
                        ? 'bg-purple-100 text-purple-900'
                        : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Platform KPIs
                  </Link>
                  <Link
                    to="/admin/users"
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive('/admin/users')
                        ? 'bg-purple-100 text-purple-900'
                        : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    User Accounts
                  </Link>
                  <Link
                    to="/admin/audit"
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive('/admin/audit')
                        ? 'bg-purple-100 text-purple-900'
                        : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-teal-600" />
                    Audit Logs
                  </Link>
                </>
              )}
            </nav>
          )}

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 1-Click Demo Switcher (Awesome for viva & inspection) */}
            <div className="relative" ref={demoRef}>
              <button
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                title="Switch demo profile quickly"
              >
                <UserCheck className="w-3.5 h-3.5 text-lavender-600" />
                <span className="hidden sm:inline">Demo Switcher</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showDemoMenu && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white shadow-modal border border-slate-200 p-2 z-50 animate-fadeIn">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Instant Demo Login
                  </div>
                  <button
                    onClick={() => handleDemoSwitch('mother_priya')}
                    className="w-full text-left p-2 rounded-xl hover:bg-lavender-50 transition-colors flex items-center gap-2.5"
                  >
                    <div className="w-7 h-7 rounded-lg bg-lavender-100 text-lavender-700 flex items-center justify-center font-bold text-xs shrink-0">
                      PS
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Priya Sharma</p>
                      <p className="text-[11px] text-slate-500">Mother (Standard / Normal Risk)</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleDemoSwitch('mother_ananya')}
                    className="w-full text-left p-2 rounded-xl hover:bg-rose-50 transition-colors flex items-center gap-2.5"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
                      AP
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Ananya Patel</p>
                      <p className="text-[11px] text-rose-600 font-medium">Mother (High Risk • Q10 Flag)</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleDemoSwitch('doctor')}
                    className="w-full text-left p-2 rounded-xl hover:bg-teal-50 transition-colors flex items-center gap-2.5"
                  >
                    <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                      DR
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Dr. Sunita Sharma</p>
                      <p className="text-[11px] text-slate-500">Perinatal Psychiatrist</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleDemoSwitch('admin')}
                    className="w-full text-left p-2 rounded-xl hover:bg-purple-50 transition-colors flex items-center gap-2.5"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                      AD
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Administrator</p>
                      <p className="text-[11px] text-slate-500">System & ML Governance</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Emergency SOS Button */}
            <button
              onClick={onOpenEmergency}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 active:scale-95 text-white shadow-soft transition-all"
              title="24/7 Crisis Helplines"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>SOS Help</span>
            </button>

            {/* Notifications Dropdown (if logged in) */}
            {user && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="relative p-2 rounded-xl text-slate-600 hover:text-navy-900 hover:bg-slate-100 transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                  )}
                </button>

                {showNotifs && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white shadow-modal border border-slate-200 p-3 z-50 animate-fadeIn">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <span className="text-xs font-bold text-slate-800">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">No notifications yet</p>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-2.5 rounded-xl border text-xs transition-colors ${
                              notif.is_read
                                ? 'bg-slate-50/60 border-slate-100 text-slate-600'
                                : 'bg-lavender-50 border-lavender-200 text-slate-800 font-medium'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <p className="font-semibold">{notif.title}</p>
                              {!notif.is_read && (
                                <button
                                  onClick={() => handleMarkAsRead(notif.id)}
                                  className="text-[10px] text-lavender-700 hover:underline shrink-0"
                                >
                                  Read
                                </button>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Profile & Logout */}
            {user ? (
              <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
                <div className="text-right hidden lg:block">
                  <div className="text-xs font-semibold text-slate-900 leading-tight">
                    {user.full_name}
                  </div>
                  <div className="text-[10px] font-medium text-slate-500 capitalize">
                    {user.role}
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-lavender-200 bg-lavender-50 px-4 py-2 text-xs font-bold text-lavender-800 shadow-sm transition-colors hover:bg-lavender-100"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-lavender-600 hover:bg-lavender-700 text-white shadow-soft transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
