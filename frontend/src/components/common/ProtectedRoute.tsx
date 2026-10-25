import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Heart } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-warm-50 p-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-lavender-600 to-teal-400 flex items-center justify-center shadow-soft animate-bounce">
          <Heart className="w-7 h-7 text-white fill-white/20" />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-700 animate-pulse">Loading HopeMind...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to the appropriate home base for their actual role
    if (user.role === 'mother') return <Navigate to="/mother" replace />;
    if (user.role === 'doctor') return <Navigate to="/doctor" replace />;
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};
