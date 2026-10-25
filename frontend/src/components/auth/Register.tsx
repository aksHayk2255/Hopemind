import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, User, Mail, Lock, Phone, Baby, Stethoscope, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<UserRole>('mother');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Mother fields
  const [infantName, setInfantName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryType, setDeliveryType] = useState('vaginal');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Doctor fields
  const [specialization, setSpecialization] = useState('Perinatal Psychiatry');
  const [hospitalAffiliation, setHospitalAffiliation] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload: Record<string, any> = {
      full_name: fullName,
      email,
      password,
      role,
      phone
    };

    if (role === 'mother') {
      payload.infant_name = infantName;
      payload.delivery_date = deliveryDate || undefined;
      payload.delivery_type = deliveryType;
      payload.emergency_contact_name = emergencyName;
      payload.emergency_contact_phone = emergencyPhone;
    } else if (role === 'doctor') {
      payload.specialization = specialization;
      payload.hospital_affiliation = hospitalAffiliation;
      payload.license_number = licenseNumber;
    }

    try {
      const loggedUser = await register(payload);
      if (loggedUser.role === 'mother') navigate('/mother');
      else if (loggedUser.role === 'doctor') navigate('/doctor');
      else navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 subtle-gradient">
      <div className="max-w-xl w-full space-y-6">
        <div className="text-center">
          <div className="inline-flex w-14 h-14 rounded-3xl bg-gradient-to-tr from-lavender-600 via-lavender-500 to-teal-400 items-center justify-center shadow-card mb-3">
            <Heart className="w-7 h-7 text-white fill-white/20" />
          </div>
          <h2 className="text-3xl font-extrabold text-navy-950 tracking-tight">
            Create Your HopeMind Account
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Join a supportive clinical and emotional network for perinatal care
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-white p-8 rounded-3xl shadow-card border border-slate-200/80 space-y-6">
          {/* Role Selection Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Select Your Role
            </label>
            <div className="grid grid-cols-2 gap-3 p-1 rounded-2xl bg-slate-100">
              <button
                type="button"
                onClick={() => setRole('mother')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  role === 'mother'
                    ? 'bg-white text-lavender-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Baby className="w-4 h-4 text-lavender-600" />
                Mother / Caregiver
              </button>
              <button
                type="button"
                onClick={() => setRole('doctor')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  role === 'doctor'
                    ? 'bg-white text-teal-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Stethoscope className="w-4 h-4 text-teal-600" />
                Healthcare Provider
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-lavender-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-lavender-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-lavender-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-lavender-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Mother-Specific Onboarding Fields */}
            {role === 'mother' && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-lavender-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Baby className="w-3.5 h-3.5 text-lavender-600" />
                  Infant & Family Information
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Infant's Name</label>
                    <input
                      type="text"
                      value={infantName}
                      onChange={(e) => setInfantName(e.target.value)}
                      placeholder="e.g. Aarav"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-lavender-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Delivery Date</label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-lavender-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Emergency Contact Name</label>
                    <input
                      type="text"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="Spouse / Parent / Trusted Friend"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-lavender-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Emergency Contact Phone</label>
                    <input
                      type="tel"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="+91 ..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-lavender-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Doctor-Specific Onboarding Fields */}
            {role === 'doctor' && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                  Clinical Credentials
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Specialization</label>
                    <input
                      type="text"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="e.g. Perinatal Psychiatry"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Medical License Number</label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="e.g. MCI-2015-84920"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hospital / Clinic Affiliation</label>
                  <input
                    type="text"
                    value={hospitalAffiliation}
                    onChange={(e) => setHospitalAffiliation(e.target.value)}
                    placeholder="e.g. Apex Memorial Women & Child Hospital"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500 outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 min-h-12 py-3 rounded-xl bg-[#5b4bdb] hover:bg-[#4938b9] active:scale-[0.99] text-white font-semibold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Complete Registration'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2 text-xs text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-lavender-700 hover:underline">
              Sign In here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
