import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Bell,
  CalendarCheck,
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  MessageCircleHeart,
  Shield,
  Smile,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { NotificationItem } from '../../types';

interface NavbarProps {
  onOpenEmergency: () => void;
}

type DemoAccount = 'mother_priya' | 'mother_ananya' | 'doctor' | 'admin';

const motherLinks = [
  { to: '/mother', label: 'Dashboard', icon: Activity },
  { to: '/mother/assessment', label: 'Screening', icon: Heart },
  { to: '/mother/mood', label: 'Mood & Wellness', icon: Smile },
  { to: '/mother/care-team', label: 'Care team', icon: Users },
  { to: '/mother/appointments', label: 'Appointments', icon: CalendarCheck },
  { to: '/mother/chat', label: 'HopeBot', icon: MessageCircleHeart },
  { to: '/mother/settings', label: 'Settings', icon: Shield },
];

export const Navbar: React.FC<NavbarProps> = ({ onOpenEmergency }) => {
  const { user, logout, quickDemoLogin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openMenu, setOpenMenu] = useState<'notifications' | 'profile' | 'demo' | 'mobile' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const response = await userService.getNotifications();
        if (response?.notifications) {
          setNotifications(response.notifications);
          setUnreadCount(response.notifications.filter((item) => !item.is_read).length);
        }
      } catch (error) {
        console.error('Unable to load notifications', error);
      }
    };

    fetchNotifications();
  }, [user, location.pathname]);

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', closeMenus);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeMenus);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/mother' && location.pathname.startsWith(`${path}/`));

  const homePath = user
    ? user.role === 'mother'
      ? '/mother'
      : user.role === 'doctor'
        ? '/doctor'
        : '/admin'
    : '/';

  const handleDemoSwitch = async (account: DemoAccount) => {
    setOpenMenu(null);
    const loggedUser = await quickDemoLogin(account);
    navigate(loggedUser.role === 'mother' ? '/mother' : loggedUser.role === 'doctor' ? '/doctor' : '/admin');
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await userService.markNotificationRead(id);
      setNotifications((current) =>
        current.map((notification) => (notification.id === id ? { ...notification, is_read: true } : notification)),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (error) {
      console.error('Unable to mark notification as read', error);
    }
  };

  const linkClass = (path: string) =>
    `inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
      isActive(path)
        ? 'bg-[#f5f3ff] text-[#382b91] shadow-sm'
        : 'text-slate-600 hover:bg-slate-50 hover:text-[#141326]'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-[#e8e7f7] bg-white/95 backdrop-blur-md">
      <div ref={menuRef} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[4.25rem] items-center justify-between gap-3">
          <Link to={homePath} className="flex min-w-0 items-center gap-2.5" aria-label="HopeMind home">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#5b4bdb] shadow-sm">
              <Heart className="h-5 w-5 fill-white/20 text-white" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xl font-bold tracking-tight text-[#141326]">HopeMind</span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5b4bdb] sm:block">
                Perinatal AI Care
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {user && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === 'notifications' ? null : 'notifications')}
                  className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-50 hover:text-[#141326]"
                  aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                  aria-expanded={openMenu === 'notifications'}
                >
                  <Bell className="h-[18px] w-[18px]" />
                  {unreadCount > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />}
                </button>
                {openMenu === 'notifications' && (
                  <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                    <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-800">Notifications</span>
                      {unreadCount > 0 && <span className="text-[10px] font-semibold text-rose-600">{unreadCount} new</span>}
                    </div>
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="py-4 text-center text-xs text-slate-400">No notifications yet</p>
                      ) : (
                        notifications.map((notification) => (
                          <div key={notification.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 text-xs">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-slate-800">{notification.title}</p>
                              {!notification.is_read && (
                                <button type="button" onClick={() => handleMarkAsRead(notification.id)} className="shrink-0 text-[10px] text-[#5b4bdb] hover:underline">
                                  Read
                                </button>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] text-slate-600">{notification.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {user && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')}
                  className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-left hover:bg-slate-50"
                  aria-label="Open profile menu"
                  aria-expanded={openMenu === 'profile'}
                >
                  <span className="hidden text-right sm:block">
                    <span className="block max-w-32 truncate text-xs font-semibold text-slate-900">{user.full_name}</span>
                    <span className="block text-[10px] capitalize text-slate-500">{user.role}</span>
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f3ff] text-xs font-bold text-[#5b4bdb]">
                    {user.full_name.slice(0, 1).toUpperCase()}
                  </span>
                  <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
                </button>
                {openMenu === 'profile' && (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    <p className="px-3 py-2 text-xs font-semibold text-slate-800">{user.full_name}</p>
                    {user.role === 'mother' && (
                      <Link to="/mother/settings" onClick={() => setOpenMenu(null)} className="block rounded-xl px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">
                        Privacy & account settings
                      </Link>
                    )}
                    <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50">
                      <LogOut className="h-3.5 w-3.5" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onOpenEmergency}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#e85d55] px-2.5 text-xs font-bold text-white hover:bg-[#c94743] sm:px-3"
              aria-label="Open emergency support"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">SOS Help</span>
            </button>

            {!user && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link to="/login" className="whitespace-nowrap rounded-xl border border-[#d6d0ff] bg-[#f5f3ff] px-2.5 py-2 text-xs font-bold text-[#382b91] hover:bg-[#e9e5ff] sm:px-3.5">
                  Login
                </Link>
                <Link to="/register" className="whitespace-nowrap rounded-xl bg-[#5b4bdb] px-2.5 py-2 text-xs font-bold text-white hover:bg-[#4938b9] sm:px-3.5">
                  Register
                </Link>
              </div>
            )}

            {user && (
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === 'demo' ? null : 'demo')}
                className="hidden h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 lg:flex"
                aria-label="Open demo account menu"
                aria-expanded={openMenu === 'demo'}
              >
                <UserCheck className="h-4 w-4 text-[#5b4bdb]" /> Demo <ChevronDown className="h-3 w-3" />
              </button>
            )}

            {user?.role === 'mother' && (
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === 'mobile' ? null : 'mobile')}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-50 md:hidden"
                aria-label="Open navigation menu"
                aria-expanded={openMenu === 'mobile'}
              >
                {openMenu === 'mobile' ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>

        {openMenu === 'demo' && (
          <div className="absolute right-4 mt-1 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl sm:right-6 lg:right-8">
            {([
              ['mother_priya', 'Priya Sharma', 'Mother (Normal)'],
              ['mother_ananya', 'Ananya Patel', 'Mother (High Risk)'],
              ['doctor', 'Dr. Sunita Sharma', 'Perinatal Psychiatrist'],
              ['admin', 'Administrator', 'AI Governance'],
            ] as [DemoAccount, string, string][]).map(([account, name, description]) => (
              <button key={account} type="button" onClick={() => handleDemoSwitch(account)} className="flex w-full items-center gap-2 rounded-xl p-2 text-left hover:bg-slate-50">
                <UserCheck className="h-4 w-4 shrink-0 text-[#5b4bdb]" />
                <span><span className="block text-xs font-semibold text-slate-800">{name}</span><span className="block text-[10px] text-slate-500">{description}</span></span>
              </button>
            ))}
          </div>
        )}

        {user?.role === 'mother' && (
          <nav aria-label="Primary navigation" className="hidden items-center gap-1 overflow-x-auto border-t border-slate-100 py-2 md:flex">
            {motherLinks.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className={linkClass(to)} aria-current={isActive(to) ? 'page' : undefined}>
                <Icon className="h-[17px] w-[17px]" />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            ))}
            <Link to="/mother/trends" className={`ml-auto ${linkClass('/mother/trends')}`}>
              <TrendingUp className="h-[17px] w-[17px]" /> <span className="whitespace-nowrap">Wellness Trends</span>
            </Link>
          </nav>
        )}

        {user?.role === 'doctor' && (
          <nav aria-label="Clinical navigation" className="hidden items-center gap-1 overflow-x-auto border-t border-slate-100 py-2 md:flex">
            <Link to="/doctor" className={linkClass('/doctor')}><Activity className="h-[17px] w-[17px]" /> Clinical Dashboard</Link>
            <Link to="/doctor/patients" className={linkClass('/doctor/patients')}><Users className="h-[17px] w-[17px]" /> Patient Directory</Link>
            <Link to="/doctor/follow-ups" className={linkClass('/doctor/follow-ups')}><CalendarCheck className="h-[17px] w-[17px]" /> Follow-Ups</Link>
          </nav>
        )}

        {user?.role === 'admin' && (
          <nav aria-label="Administration navigation" className="hidden items-center gap-1 overflow-x-auto border-t border-slate-100 py-2 md:flex">
            <Link to="/admin" className={linkClass('/admin')}><Activity className="h-[17px] w-[17px]" /> Platform KPIs</Link>
            <Link to="/admin/users" className={linkClass('/admin/users')}><Users className="h-[17px] w-[17px]" /> User Accounts</Link>
            <Link to="/admin/audit" className={linkClass('/admin/audit')}><Shield className="h-[17px] w-[17px]" /> Audit Logs</Link>
          </nav>
        )}

        {user?.role === 'mother' && openMenu === 'mobile' && (
          <nav aria-label="Mobile navigation" className="border-t border-slate-100 py-2 md:hidden">
            {motherLinks.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} onClick={() => setOpenMenu(null)} className={`w-full ${linkClass(to)}`} aria-current={isActive(to) ? 'page' : undefined}>
                <Icon className="h-[17px] w-[17px]" /> {label}
              </Link>
            ))}
            <Link to="/mother/trends" onClick={() => setOpenMenu(null)} className={`w-full ${linkClass('/mother/trends')}`}>
              <TrendingUp className="h-[17px] w-[17px]" /> Wellness Trends
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
};
