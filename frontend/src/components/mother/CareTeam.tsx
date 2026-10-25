import { useEffect, useState } from 'react';
import { CheckCircle2, Search, ShieldCheck, UserRound } from 'lucide-react';
import { collaborationService, CareConnection, Consent, Professional } from '../../services/collaborationService';

const categories: Array<{ key: Consent['category']; label: string; description: string }> = [
  { key: 'assessments', label: 'EPDS screening history', description: 'Your clinician can review questionnaire scores and dates.' },
  { key: 'mood', label: 'Mood and wellness trends', description: 'Your clinician can review mood and sleep trends, not private journal text.' },
  { key: 'reports', label: 'Selected clinical reports', description: 'Share reports you choose for care coordination.' },
];

export function CareTeam() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [connections, setConnections] = useState<CareConnection[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const [directory, team, consentResult] = await Promise.all([
      collaborationService.getProfessionals(query),
      collaborationService.getConnections(),
      collaborationService.getConsents(),
    ]);
    setProfessionals(directory.professionals);
    setConnections(team.connections);
    setConsents(consentResult.consents);
  };

  useEffect(() => { void load().catch(() => setMessage('Unable to load care-team information.')); }, []);

  const request = async (doctorId: number) => {
    try {
      await collaborationService.requestConnection(doctorId);
      setMessage('Connection request sent. Sharing remains off until you grant consent.');
      await load();
    } catch {
      setMessage('Unable to send this request. Please try again.');
    }
  };

  const toggleConsent = async (doctorId: number, category: Consent['category']) => {
    const existing = consents.find((item) => item.doctor_id === doctorId && item.category === category);
    try {
      await collaborationService.updateConsent(doctorId, category, existing?.status !== 'granted');
      await load();
    } catch {
      setMessage('Consent could not be updated. An accepted connection is required.');
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-semibold text-teal-700">Connected care</p>
        <h1 className="mt-1 text-3xl font-bold text-navy-950">Find your care team</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">A connection never grants automatic access. You decide which categories to share with each clinician.</p>
      </header>
      {message && <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">{message}</div>}
      <section className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void load(); }} placeholder="Search by specialization" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#5b4bdb]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {professionals.map((professional) => {
            const connection = connections.find((item) => item.doctor_id === professional.doctor_id);
            return <article key={professional.doctor_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lavender-100 text-lavender-700"><UserRound className="h-5 w-5" /></div><div><h2 className="font-bold text-navy-950">{professional.full_name}</h2><p className="text-sm text-slate-600">{professional.specialization}</p></div></div>
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-[11px] font-bold text-teal-700"><ShieldCheck className="h-3.5 w-3.5" /> Verified</span>
              </div>
              <p className="mt-4 text-sm text-slate-500">{professional.biography || 'Verified HopeMind care professional.'}</p>
              <p className="mt-3 text-xs text-slate-500">{professional.hospital_affiliation || 'Independent practice'} · {professional.verification.consultation_modes.join(', ')}</p>
              <button disabled={!!connection && ['pending', 'accepted'].includes(connection.status)} onClick={() => void request(professional.doctor_id)} className="mt-4 w-full rounded-xl bg-[#5b4bdb] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{connection?.status === 'accepted' ? 'Connected' : connection?.status === 'pending' ? 'Request pending' : 'Request connection'}</button>
            </article>;
          })}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-bold text-navy-950"><CheckCircle2 className="h-5 w-5 text-teal-600" /> Sharing permissions</h2>
        <p className="mt-1 text-sm text-slate-500">Journal entries and HopeBot conversations remain private.</p>
        <div className="mt-4 space-y-3">{connections.filter((item) => item.status === 'accepted').map((connection) => (
          <div key={connection.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="font-semibold text-slate-800">{connection.doctor_name}</p><div className="mt-3 grid gap-2 sm:grid-cols-3">{categories.map((category) => { const granted = consents.some((item) => item.doctor_id === connection.doctor_id && item.category === category.key && item.status === 'granted'); return <button key={category.key} type="button" title={category.description} onClick={() => void toggleConsent(connection.doctor_id, category.key)} className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold ${granted ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-slate-200 bg-white text-slate-600'}`}>{granted ? '✓ ' : ''}{category.label}</button>; })}</div></div>
        ))}</div>
      </section>
    </main>
  );
}
