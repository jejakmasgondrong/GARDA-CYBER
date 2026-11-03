import { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { ChartCard, Select, Button } from '../ui';
import { useLiveData } from '../../hooks/useLiveStore';
import { platform } from '../../platform/usePlatform';
import { PLAYBOOKS, getPlaybook, guessPlaybook, playbookKey } from '../../lib/playbooks';
import type { Incident } from '../../types';
import '../../styles/live.css';

interface Saved {
  template: string;
  done: string[];
}

function load(incident: Incident): Saved {
  const fallback: Saved = { template: guessPlaybook(`${incident.title} ${incident.summary ?? ''}`), done: [] };
  const raw = platform.storage.getItem(playbookKey(incident.id));
  if (!raw) return fallback;
  try {
    const p = JSON.parse(raw) as Partial<Saved>;
    if (typeof p.template === 'string' && getPlaybook(p.template) && Array.isArray(p.done)) {
      return { template: p.template, done: p.done.filter((x): x is string => typeof x === 'string') };
    }
  } catch { /* data rusak: pakai default */ }
  return fallback;
}

export function PlaybookPanel({ className = '' }: { className?: string }) {
  const { incidents, errors } = useLiveData();
  const active = useMemo(() => (incidents?.items ?? []).filter(i => i.status !== 'closed'), [incidents]);

  const [incidentId, setIncidentId] = useState('');
  const incident = active.find(i => i.id === incidentId) ?? null;
  const [state, setState] = useState<Saved | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  // Pilih insiden pertama bila belum ada pilihan valid
  useEffect(() => {
    if (!incident && active.length > 0) setIncidentId(active[0].id);
  }, [incident, active]);

  // Muat checklist saat insiden berganti
  useEffect(() => {
    setSaveFailed(false);
    setState(incident ? load(incident) : null);
    // hanya saat id berganti, bukan tiap polling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident?.id]);

  const persist = (next: Saved) => {
    if (!incident) return;
    setState(next);
    const json = JSON.stringify(next);
    platform.storage.setItem(playbookKey(incident.id), json);
    setSaveFailed(platform.storage.getItem(playbookKey(incident.id)) !== json);
  };

  const playbook = state ? getPlaybook(state.template) : undefined;
  const doneCount = playbook && state ? playbook.steps.filter(s => state.done.includes(s.id)).length : 0;

  const toggle = (stepId: string) => {
    if (!state) return;
    const done = state.done.includes(stepId) ? state.done.filter(x => x !== stepId) : [...state.done, stepId];
    persist({ ...state, done });
  };

  const reset = () => {
    if (!incident) return;
    platform.storage.removeItem(playbookKey(incident.id));
    setSaveFailed(false);
    setState({ template: guessPlaybook(`${incident.title} ${incident.summary ?? ''}`), done: [] });
  };

  return (
    <ChartCard
      title="Playbook Respons"
      subtitle="Checklist langkah penanganan per insiden"
      className={className}
      loading={!incidents && !errors.incidents}
      error={!incidents ? errors.incidents : null}
      empty={incidents !== null && active.length === 0}
      emptyMessage="Tidak ada insiden aktif untuk diberi checklist."
    >
      <div className="space-y-3">
        <Select
          label="Insiden"
          value={incident?.id ?? ''}
          onChange={e => setIncidentId(e.target.value)}
          options={active.map(i => ({ value: i.id, label: i.title }))}
        />
        {state && (
          <Select
            label="Template"
            value={state.template}
            onChange={e => persist({ ...state, template: e.target.value })}
            options={PLAYBOOKS.map(p => ({ value: p.id, label: p.name }))}
          />
        )}

        {playbook && state && (
          <>
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--gc-text-secondary)]">Progres</span>
                <span className="font-medium text-[var(--gc-text)]">{doneCount}/{playbook.steps.length} langkah</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--gc-surface)]">
                <div className="h-full rounded-full bg-[var(--gc-primary)]" style={{ width: `${(doneCount / playbook.steps.length) * 100}%` }} />
              </div>
            </div>

            <ul className="max-h-[260px] space-y-1 overflow-y-auto">
              {playbook.steps.map(s => {
                const checked = state.done.includes(s.id);
                return (
                  <li key={s.id}>
                    <label className="flex min-h-touch cursor-pointer items-start gap-3 rounded-gc px-2 py-2 hover:bg-[var(--gc-surface)]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(s.id)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--gc-primary)]"
                      />
                      <span className={`text-xs leading-relaxed ${checked ? 'text-[var(--gc-text-secondary)] line-through' : 'text-[var(--gc-text)]'}`}>{s.text}</span>
                    </label>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between gap-3">
              <p className={`text-[11px] ${saveFailed ? 'text-[var(--gc-warning)]' : 'text-[var(--gc-text-secondary)]'}`}>
                {saveFailed ? 'Checklist gagal disimpan di browser ini.' : 'Checklist tersimpan di browser ini.'}
              </p>
              <Button variant="secondary" size="sm" leftIcon={<RotateCcw className="h-3.5 w-3.5" />} onClick={reset} className="min-h-touch">
                Reset checklist
              </Button>
            </div>
          </>
        )}
      </div>
    </ChartCard>
  );
}
