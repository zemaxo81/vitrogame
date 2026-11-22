import React, { useState } from 'react';
import { Archive, Check, Copy, Edit3, Plus, Power, Trash2, Upload, X } from 'lucide-react';
import { DEFAULT_TICKET_PROBABILITIES, TICKET_MECHANIC_META } from '../../data/defaults';
import { formatEuro, generateUid } from '../../engine/rng';
import { resolveTicketMechanic } from '../../engine/scratchBoard';
import {
  ProbabilityTier,
  RenewalMode,
  TicketDefinition,
  TicketMechanic,
  TicketStatus,
  TicketsConfig,
} from '../../types/vitrocash';
import { TicketArtwork } from '../TicketArtwork';

interface AdminTicketsSectionProps {
  catalog: TicketDefinition[];
  ticketsConfig: TicketsConfig;
  onUpdateTicketsConfig: (cfg: TicketsConfig) => void;
  onSaveTicket: (ticket: TicketDefinition, isNew: boolean) => void;
  onDuplicateTicket: (ticketId: string) => void;
  onSetStatus: (ticketId: string, status: TicketStatus) => void;
  onDeleteTicket: (ticketId: string) => void;
}

const ILLUSTRATION_KEYS = [
  'crown',
  'diamond',
  'chest',
  'moon',
  'galaxy',
  'compass',
  'leaf',
  'crystal',
  'flame',
  'star',
  'key',
  'bolt',
  'labyrinth',
  'castle',
  'planet',
  'ruby',
  'sapphire',
  'eclipse',
  'dragon',
  'aurora',
  'mask',
  'pyramid',
  'nebula',
  'tiara',
  'sword',
];

export const AdminTicketsSection: React.FC<AdminTicketsSectionProps> = ({
  catalog,
  ticketsConfig,
  onUpdateTicketsConfig,
  onSaveTicket,
  onDuplicateTicket,
  onSetStatus,
  onDeleteTicket,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | TicketStatus>('all');
  const [editing, setEditing] = useState<{ ticket: TicketDefinition; isNew: boolean } | null>(null);

  const visibleTickets = catalog.filter((t) =>
    filterStatus === 'all' ? true : t.status === filterStatus,
  );

  const startNewTicket = () => {
    const now = Date.now();
    setEditing({
      isNew: true,
      ticket: {
        id: generateUid('tk'),
        name: 'NOUVEAU TICKET',
        theme: 'Édition Spéciale',
        description: 'Ticket personnalisé ajouté par Jean.',
        illustrationKey: 'star',
        mechanic: 'fetiche_numbers',
        primaryColor: '#1E1042',
        secondaryColor: '#312E81',
        accentColor: '#FBBF24',
        status: 'active',
        probabilities: DEFAULT_TICKET_PROBABILITIES.map((p) => ({ ...p, id: generateUid('tier') })),
        createdAt: now,
        updatedAt: now,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            6. Catalogue des Tickets ({catalog.length})
          </h2>
          <p className="text-xs text-slate-400">
            Actifs : {catalog.filter((t) => t.status === 'active').length} · Inactifs :{' '}
            {catalog.filter((t) => t.status === 'inactive').length} · Archivés :{' '}
            {catalog.filter((t) => t.status === 'archived').length}
          </p>
        </div>
        <button
          type="button"
          onClick={startNewTicket}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un ticket</span>
        </button>
      </div>

      {/* Ticket Frequency & Renewal Settings */}
      <div className="rounded-2xl vc-card-relief p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <label className="block">
          <span className="text-slate-300 block mb-1">Tickets par série</span>
          <input
            type="number"
            min={1}
            max={10}
            value={ticketsConfig.batchSize}
            onChange={(e) =>
              onUpdateTicketsConfig({
                ...ticketsConfig,
                batchSize: Math.max(1, Number(e.target.value)),
              })
            }
            className="w-full min-h-[40px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
          />
        </label>
        <label className="block">
          <span className="text-slate-300 block mb-1">Intervalle (heures)</span>
          <input
            type="number"
            min={1}
            max={72}
            value={ticketsConfig.intervalHours}
            onChange={(e) =>
              onUpdateTicketsConfig({
                ...ticketsConfig,
                intervalHours: Math.max(1, Number(e.target.value)),
              })
            }
            className="w-full min-h-[40px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
          />
        </label>
        <label className="block">
          <span className="text-slate-300 block mb-1">Mode de renouvellement</span>
          <select
            value={ticketsConfig.renewalMode}
            onChange={(e) =>
              onUpdateTicketsConfig({
                ...ticketsConfig,
                renewalMode: e.target.value as RenewalMode,
              })
            }
            className="w-full min-h-[40px] rounded-xl bg-black/40 border border-white/15 px-3 text-white"
          >
            <option value="FIXED_INTERVAL">Intervalles fixes (indépendant)</option>
            <option value="AFTER_CONSUMPTION">Après consommation de la série</option>
          </select>
        </label>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {(['all', 'active', 'inactive', 'archived'] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-semibold cursor-pointer ${
              filterStatus === st
                ? 'bg-blue-600 text-white'
                : 'bg-[#140C2B] text-slate-300 border border-white/10 hover:bg-white/10'
            }`}
          >
            {st === 'all' ? 'Tous' : st === 'active' ? 'Actifs' : st === 'inactive' ? 'Inactifs' : 'Archivés'}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      <div className="grid grid-cols-1 gap-2.5">
        {visibleTickets.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl vc-card-relief p-4 flex flex-col justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <TicketArtwork ticket={t} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display font-bold text-sm text-white truncate">{t.name}</h3>
                  <span className="text-[11px] font-medium text-slate-300 shrink-0">
                    {t.status === 'active'
                      ? 'Actif'
                      : t.status === 'inactive'
                        ? 'Désactivé'
                        : 'Archivé'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {t.theme} · {TICKET_MECHANIC_META[resolveTicketMechanic(t)].shortLabel} ·{' '}
                  {t.probabilities.length} paliers
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditing({ ticket: JSON.parse(JSON.stringify(t)), isNew: false })}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modifier</span>
              </button>
              <button
                type="button"
                onClick={() => onDuplicateTicket(t.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg bg-white/10 hover:bg-white/15 text-xs text-sky-300 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Dupliquer</span>
              </button>
              <button
                type="button"
                onClick={() => onSetStatus(t.id, t.status === 'active' ? 'inactive' : 'active')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg bg-white/10 hover:bg-white/15 text-xs text-amber-300 cursor-pointer"
              >
                <Power className="w-3.5 h-3.5" />
                <span>{t.status === 'active' ? 'Désactiver' : 'Activer'}</span>
              </button>
              {t.status !== 'archived' && (
                <button
                  type="button"
                  onClick={() => onSetStatus(t.id, 'archived')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-300 cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archiver</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onDeleteTicket(t.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-xs text-rose-300 cursor-pointer ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <TicketEditorModal
          initialTicket={editing.ticket}
          isNew={editing.isNew}
          onCancel={() => setEditing(null)}
          onSave={(saved) => {
            onSaveTicket(saved, editing.isNew);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
};

const TicketEditorModal: React.FC<{
  initialTicket: TicketDefinition;
  isNew: boolean;
  onCancel: () => void;
  onSave: (ticket: TicketDefinition) => void;
}> = ({ initialTicket, isNew, onCancel, onSave }) => {
  const [draft, setDraft] = useState<TicketDefinition>(initialTicket);
  const [error, setError] = useState<string | null>(null);

  const probSum = Math.round(draft.probabilities.reduce((s, p) => s + p.probability, 0) * 100) / 100;

  const updateTier = (idx: number, patch: Partial<ProbabilityTier>) => {
    setDraft((prev) => ({
      ...prev,
      probabilities: prev.probabilities.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    }));
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraft((prev) => ({ ...prev, customImageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!draft.name.trim()) {
      setError('Le nom du ticket est obligatoire.');
      return;
    }
    if (Math.abs(probSum - 100) > 0.05) {
      setError(`La somme des probabilités doit être égale à 100 % (actuellement ${probSum} %).`);
      return;
    }
    onSave({ ...draft, name: draft.name.trim(), updatedAt: Date.now() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3">
      <div className="w-full max-w-[400px] max-h-[90vh] overflow-y-auto rounded-3xl vc-card-relief p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-white">
            {isNew ? 'Nouveau ticket' : `Modifier · ${initialTicket.name}`}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="block">
            <span className="text-slate-300 block mb-1">Nom du ticket</span>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white"
            />
          </label>
          <label className="block">
            <span className="text-slate-300 block mb-1">Thème</span>
            <input
              type="text"
              value={draft.theme}
              onChange={(e) => setDraft({ ...draft, theme: e.target.value })}
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-slate-300 block mb-1">Description</span>
            <input
              type="text"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white"
            />
          </label>
          <label className="block">
            <span className="text-slate-300 block mb-1">Illustration vectorielle intégrée</span>
            <select
              value={draft.illustrationKey}
              onChange={(e) => setDraft({ ...draft, illustrationKey: e.target.value })}
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white"
            >
              {ILLUSTRATION_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-slate-300 block mb-1">Type de jeu à gratter (mécanique)</span>
            <select
              value={resolveTicketMechanic(draft)}
              onChange={(e) =>
                setDraft({ ...draft, mechanic: e.target.value as TicketMechanic })
              }
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white"
            >
              {(Object.keys(TICKET_MECHANIC_META) as TicketMechanic[]).map((mKey) => (
                <option key={mKey} value={mKey}>
                  {TICKET_MECHANIC_META[mKey].label}
                </option>
              ))}
            </select>
          </label>
          <div className="block sm:col-span-2">
            <span className="text-slate-300 block mb-1">Image locale personnalisée</span>
            <div className="flex items-center gap-2">
              <label className="flex-1 min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 flex items-center gap-2 text-sky-300 cursor-pointer hover:border-sky-400/50">
                <Upload className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {draft.customImageUrl ? 'Image chargée (remplacer)' : 'Importer image locale'}
                </span>
                <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
              </label>
              {draft.customImageUrl && (
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, customImageUrl: undefined })}
                  className="px-2.5 min-h-[42px] rounded-xl bg-rose-500/15 text-rose-300 cursor-pointer"
                >
                  Retirer
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:col-span-2">
            <label className="block">
              <span className="text-slate-300 block mb-1">Couleur 1</span>
              <input
                type="color"
                value={draft.primaryColor}
                onChange={(e) => setDraft({ ...draft, primaryColor: e.target.value })}
                className="w-full h-10 rounded-lg bg-black/40 border border-white/15"
              />
            </label>
            <label className="block">
              <span className="text-slate-300 block mb-1">Couleur 2</span>
              <input
                type="color"
                value={draft.secondaryColor}
                onChange={(e) => setDraft({ ...draft, secondaryColor: e.target.value })}
                className="w-full h-10 rounded-lg bg-black/40 border border-white/15"
              />
            </label>
            <label className="block">
              <span className="text-slate-300 block mb-1">Accent</span>
              <input
                type="color"
                value={draft.accentColor}
                onChange={(e) => setDraft({ ...draft, accentColor: e.target.value })}
                className="w-full h-10 rounded-lg bg-black/40 border border-white/15"
              />
            </label>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-white">Probabilités et gains (€ / %)</span>
            <div className="flex items-center gap-3">
              {Math.abs(probSum - 100) > 0.05 && probSum > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      probabilities: prev.probabilities.map((p) => ({
                        ...p,
                        probability: Math.round((p.probability / probSum) * 1000) / 10,
                      })),
                    }))
                  }
                  className="text-amber-300 hover:underline cursor-pointer"
                >
                  Normaliser à 100 %
                </button>
              )}
              <span
                className={`font-mono-tabular font-bold ${
                  Math.abs(probSum - 100) <= 0.05 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                Total : {probSum} %
              </span>
            </div>
          </div>
          <div className="space-y-2">
            {draft.probabilities.map((tier, idx) => (
              <div key={tier.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tier.amount}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    updateTier(idx, { amount: v, label: formatEuro(v) });
                  }}
                  className="col-span-5 min-h-[38px] rounded-lg bg-black/40 border border-white/15 px-2.5 font-mono-tabular text-amber-300"
                />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={tier.probability}
                  onChange={(e) => updateTier(idx, { probability: Number(e.target.value) })}
                  className="col-span-5 min-h-[38px] rounded-lg bg-black/40 border border-white/15 px-2.5 font-mono-tabular text-sky-300"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      probabilities: prev.probabilities.filter((_, i) => i !== idx),
                    }))
                  }
                  disabled={draft.probabilities.length <= 1}
                  className="col-span-2 min-h-[38px] rounded-lg bg-rose-500/15 text-rose-300 flex items-center justify-center cursor-pointer disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setDraft((prev) => ({
                ...prev,
                probabilities: [
                  ...prev.probabilities,
                  { id: generateUid('tier'), amount: 0, probability: 0, label: '0,00 €' },
                ],
              }))
            }
            className="text-xs text-sky-300 hover:underline cursor-pointer"
          >
            + Ajouter un palier de gain
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/15 border border-rose-400/40 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 min-h-[44px] rounded-xl bg-white/10 text-xs font-semibold text-white cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Enregistrer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
