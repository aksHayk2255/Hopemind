import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, AlertTriangle, CalendarCheck, Check, Search, Users, X } from 'lucide-react';
import { adminService, AuditLogEntry, PlatformStatistics, SystemUser } from '../../services/adminService';
import { doctorService, DoctorPatientItem } from '../../services/doctorService';
import { collaborationService, Appointment, CareConnection } from '../../services/collaborationService';

type StaffRole = 'doctor' | 'admin';
const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString() : '—';

export function StaffDashboard({ role }: { role: StaffRole }) {
  const location = useLocation();
  const isAdmin = role === 'admin';
  const section = location.pathname.split('/')[2] || 'overview';
  const [stats, setStats] = useState<PlatformStatistics | null>(null);
  const [patients, setPatients] = useState<DoctorPatientItem[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [connections, setConnections] = useState<CareConnection[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (isAdmin) {
          if (section === 'users') {
            const result = await adminService.getUsers(query);
            if (active) setUsers(result.users);
          } else if (section === 'audit') {
            const result = await adminService.getAuditLogs();
            if (active) setAuditLogs(result.audit_logs);
          } else {
            const result = await adminService.getStats();
            if (active) setStats(result.platform_statistics);
          }
        } else if (section === 'connections') {
          const result = await collaborationService.getConnections();
          if (active) setConnections(result.connections);
        } else if (section === 'appointments') {
          const result = await collaborationService.getAppointments();
          if (active) setAppointments(result.appointments);
        } else if (section !== 'follow-ups') {
          const result = await doctorService.getPatients(query);
          if (active) setPatients(result.patients);
        } else {
          await doctorService.listFollowUps();
        }
      } catch (loadError) {
        console.error(loadError);
        if (active) setError('Unable to load this workspace. Please check that the care service is available and try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [isAdmin, section, query]);

  const title = isAdmin
    ? (section === 'users' ? 'User accounts' : section === 'audit' ? 'Audit logs' : 'Platform overview')
    : (section === 'patients' ? 'Patient directory' : section === 'connections' ? 'Connection requests' : section === 'appointments' ? 'Appointments' : section === 'follow-ups' ? 'Follow-up care' : 'Clinical dashboard');

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-700">{isAdmin ? 'Governance workspace' : 'Care team workspace'}</p>
          <h1 className="mt-1 text-3xl font-bold text-navy-950">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">Review the latest information and take the next appropriate action.</p>
        </div>
        {(section === 'patients' || section === 'users' || (!isAdmin && section === 'overview')) && (
          <label className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isAdmin ? 'Search users' : 'Search patients'} className="rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-400" />
          </label>
        )}
      </div>
      {error && <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {loading ? <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">Loading workspace…</div> : isAdmin ? <AdminContent section={section} stats={stats} users={users} auditLogs={auditLogs} /> : <DoctorContent section={section} patients={patients} appointments={appointments} connections={connections} onConnectionUpdate={(id, action) => { void collaborationService.updateConnection(id, action).then((result) => setConnections((items) => items.map((item) => item.id === id ? result.connection : item))).catch(() => setError('Unable to update this connection request.')); }} />}
    </main>
  );
}

function AdminContent({ section, stats, users, auditLogs }: { section: string; stats: PlatformStatistics | null; users: SystemUser[]; auditLogs: AuditLogEntry[] }) {
  if (section === 'users') return <Table headers={['Name', 'Email', 'Role', 'Status', 'Joined']} rows={users.map((user) => [user.full_name, user.email, user.role, user.is_active ? 'Active' : 'Inactive', formatDate(user.created_at)])} empty="No user accounts found." />;
  if (section === 'audit') return <Table headers={['Action', 'Resource', 'Status', 'Timestamp']} rows={auditLogs.map((log) => [log.action, log.resource_type, 'Recorded', formatDate(log.created_at)])} empty="No audit events found." />;
  const cards = stats ? [['Total users', stats.total_users, Users], ['Mothers', stats.mothers, Activity], ['High-risk screenings', stats.high_risk_screenings, AlertTriangle], ['Follow-ups', stats.total_follow_ups, CalendarCheck]] as const : [];
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value, Icon]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="h-5 w-5 text-purple-600" /><p className="mt-4 text-2xl font-bold text-navy-950">{value}</p><p className="text-sm text-slate-500">{label}</p></div>)}</div>;
}

function DoctorContent({ section, patients, appointments, connections, onConnectionUpdate }: { section: string; patients: DoctorPatientItem[]; appointments: Appointment[]; connections: CareConnection[]; onConnectionUpdate: (id: number, action: 'accept' | 'decline') => void }) {
  if (section === 'connections') return <div className="space-y-4">{connections.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No connection requests yet.</div> : connections.map((connection) => <div key={connection.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center"><div><p className="font-bold text-navy-950">{connection.mother_name || 'Mother'}</p><p className="mt-1 text-sm text-slate-500">Request status: <span className="font-semibold capitalize">{connection.status}</span></p></div>{connection.status === 'pending' && <div className="flex gap-2"><button type="button" onClick={() => onConnectionUpdate(connection.id, 'accept')} className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white"><Check className="h-4 w-4" /> Accept</button><button type="button" onClick={() => onConnectionUpdate(connection.id, 'decline')} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700"><X className="h-4 w-4" /> Decline</button></div>}</div>)}</div>;
  if (section === 'appointments') return <Table headers={['Patient', 'When', 'Mode', 'Status', 'Action']} rows={appointments.map((appointment) => [appointment.mother_name || 'Patient', formatDate(appointment.start_time), appointment.consultation_mode, appointment.status, appointment.status === 'requested' ? 'Confirm or decline in record' : '—'])} empty="No appointment requests found." />;
  if (section === 'follow-ups') return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><CalendarCheck className="mx-auto h-10 w-10 text-teal-600" /><h2 className="mt-3 text-lg font-bold">Follow-up scheduling</h2><p className="mt-2 text-sm text-slate-500">Select a patient from the directory to coordinate their next appointment.</p><Link to="/doctor/patients" className="mt-5 inline-block rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white">Open patients</Link></div>;
  return <Table headers={['Patient', 'Weeks postpartum', 'Latest screening', 'Status', 'Last updated']} rows={patients.map((patient) => [patient.full_name, String(patient.weeks_postpartum), patient.latest_assessment ? `${patient.latest_assessment.score} (${patient.latest_assessment.category})` : 'Not screened', patient.clinical_status.replace('_', ' '), formatDate(patient.latest_assessment?.created_at)])} empty="No assigned patients found." />;
}

function Table({ headers, rows, empty }: { headers: string[]; rows: string[][]; empty: string }) {
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{rows.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">{empty}</div> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{headers.map((header) => <th key={header} className="px-5 py-4 font-bold">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={index} className="hover:bg-slate-50">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-5 py-4 text-slate-700">{cell}</td>)}</tr>)}</tbody></table></div>}</div>;
}
