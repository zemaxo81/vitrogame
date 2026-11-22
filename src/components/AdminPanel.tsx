import React, { useState } from 'react';
import { ArrowLeft, Menu, X } from 'lucide-react';
import {
  AppConfig,
  AppState,
  TicketDefinition,
  TicketStatus,
  TicketsConfig,
} from '../types/vitrocash';
import { AdminGamesSections } from './admin/AdminGamesSections';
import { AdminHistoryStatsSections } from './admin/AdminHistoryStatsSections';
import { AdminSystemSections } from './admin/AdminSystemSections';
import { AdminTicketsSection } from './admin/AdminTicketsSection';

const ADMIN_SECTIONS = [
  { id: 'dashboard', label: '1. Tableau de bord' },
  { id: 'general', label: '2. Paramètres généraux' },
  { id: 'player', label: '3. Joueur' },
  { id: 'balances', label: '4. Soldes et compteurs' },
  { id: 'rewards', label: '5. Récompenses' },
  { id: 'tickets', label: '6. Tickets' },
  { id: 'wheel', label: '7. Roue' },
  { id: 'slots', label: '8. Bandit manchot' },
  { id: 'lottery', label: '9. Loterie' },
  { id: 'stopwatch', label: '10. Chronomètre' },
  { id: 'milestones', label: '11. Paliers' },
  { id: 'history', label: '12. Historique' },
  { id: 'stats', label: '13. Statistiques' },
  { id: 'appearance', label: '14. Apparence' },
  { id: 'sounds', label: '15. Sons' },
  { id: 'animations', label: '16. Animations' },
  { id: 'splash', label: '17. Écran de chargement' },
  { id: 'security', label: '18. Sécurité' },
  { id: 'backups', label: '19. Sauvegardes' },
  { id: 'reset', label: '20. Réinitialisation' },
] as const;

type AdminSectionId = (typeof ADMIN_SECTIONS)[number]['id'];

interface AdminPanelProps {
  state: AppState;
  now: number;
  onExitAdmin: () => void;
  onUpdateConfig: (section: keyof AppConfig, value: unknown, auditSummary: string) => void;
  onSaveTicket: (ticket: TicketDefinition, isNew: boolean) => void;
  onDuplicateTicket: (ticketId: string) => void;
  onSetTicketStatus: (ticketId: string, status: TicketStatus) => void;
  onDeleteTicket: (ticketId: string) => void;
  onValidateMilestone: (milestoneId: string, note?: string) => void;
  onRejectMilestone: (milestoneId: string, note?: string) => void;
  onForceLotteryDrawNow: () => void;
  onRestoreBackup: (restoredState: AppState) => void;
  onRecordBackup: (nextState: AppState) => void;
  onTotalTestDataReset: () => void;
  onRestoreDefaultParamsOnly: () => void;
  onPreviewSplash: () => void;
  manualStopwatchPaused: boolean;
  onToggleStopwatchPause: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  state,
  now,
  onExitAdmin,
  onUpdateConfig,
  onSaveTicket,
  onDuplicateTicket,
  onSetTicketStatus,
  onDeleteTicket,
  onValidateMilestone,
  onRejectMilestone,
  onForceLotteryDrawNow,
  onRestoreBackup,
  onRecordBackup,
  onTotalTestDataReset,
  onRestoreDefaultParamsOnly,
  onPreviewSplash,
  manualStopwatchPaused,
  onToggleStopwatchPause,
}) => {
  const [activeSection, setActiveSection] = useState<AdminSectionId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pendingCount = state.milestones.filter((m) => m.status === 'PENDING').length;

  const selectSection = (id: AdminSectionId) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#090414] text-slate-100 flex flex-col relative z-10">
      <header className="sticky top-0 z-30 vc-glass-chrome border-b border-amber-400/30 px-3.5 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="p-2 rounded-xl bg-white/8 border border-amber-400/30 hover:bg-white/15 text-slate-200 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
            aria-label="Menu administration"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <span className="font-display font-extrabold text-sm tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-400 to-sky-300 truncate">
            ADMIN · JEAN
          </span>
        </div>

        <button
          type="button"
          onClick={onExitAdmin}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl bg-white/8 hover:bg-white/15 border border-amber-400/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] text-xs font-semibold text-white cursor-pointer whitespace-nowrap shrink-0 active:translate-y-px"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{state.config.general.playerName}</span>
        </button>
      </header>

      <div className="flex-1 w-full flex flex-col relative">
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex justify-center">
            <div
              className="fixed inset-0 bg-black/75"
              onClick={() => setMobileMenuOpen(false)}
            />
            <nav className="relative z-10 w-full max-w-[340px] mr-auto sm:mr-0 bg-[#120926] border-r border-amber-400/35 p-4 space-y-1 overflow-y-auto h-full">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
                <span className="font-display font-bold text-sm text-amber-300">20 Rubriques</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {ADMIN_SECTIONS.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => selectSection(sec.id)}
                  className={`w-full text-left px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                    activeSection === sec.id
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="truncate">{sec.label}</span>
                  {sec.id === 'milestones' && pendingCount > 0 && (
                    <span className="font-mono-tabular font-bold">({pendingCount})</span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        )}

        <main className="flex-1 min-w-0 p-3.5 pb-12">
          <div className="mb-4">
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value as AdminSectionId)}
              aria-label="Choisir une rubrique administration"
              className="w-full min-h-[44px] rounded-xl bg-[#140C2B] border-[1.5px] border-amber-400/50 px-3 text-sm font-semibold text-amber-300"
            >
              {ADMIN_SECTIONS.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.label}
                </option>
              ))}
            </select>
          </div>

          {(activeSection === 'dashboard' ||
            activeSection === 'balances' ||
            activeSection === 'rewards' ||
            activeSection === 'history' ||
            activeSection === 'stats') && (
            <AdminHistoryStatsSections
              section={activeSection}
              state={state}
              now={now}
              onJumpSection={(s) => selectSection(s as AdminSectionId)}
              onUpdateConfig={onUpdateConfig}
            />
          )}

          {activeSection === 'tickets' && (
            <AdminTicketsSection
              catalog={state.ticketsCatalog}
              ticketsConfig={state.config.tickets}
              onUpdateTicketsConfig={(cfg: TicketsConfig) =>
                onUpdateConfig('tickets', cfg, 'Modification paramètres fréquence tickets')
              }
              onSaveTicket={onSaveTicket}
              onDuplicateTicket={onDuplicateTicket}
              onSetStatus={onSetTicketStatus}
              onDeleteTicket={onDeleteTicket}
            />
          )}

          {(activeSection === 'wheel' ||
            activeSection === 'slots' ||
            activeSection === 'lottery' ||
            activeSection === 'stopwatch' ||
            activeSection === 'milestones') && (
            <AdminGamesSections
              section={activeSection}
              state={state}
              onUpdateConfig={onUpdateConfig}
              onValidateMilestone={onValidateMilestone}
              onRejectMilestone={onRejectMilestone}
              onForceLotteryDrawNow={onForceLotteryDrawNow}
              manualStopwatchPaused={manualStopwatchPaused}
              onToggleStopwatchPause={onToggleStopwatchPause}
            />
          )}

          {(activeSection === 'general' ||
            activeSection === 'player' ||
            activeSection === 'appearance' ||
            activeSection === 'sounds' ||
            activeSection === 'animations' ||
            activeSection === 'splash' ||
            activeSection === 'security' ||
            activeSection === 'backups' ||
            activeSection === 'reset') && (
            <AdminSystemSections
              section={activeSection}
              state={state}
              onUpdateConfig={onUpdateConfig}
              onRestoreBackup={onRestoreBackup}
              onRecordBackup={onRecordBackup}
              onTotalTestDataReset={onTotalTestDataReset}
              onRestoreDefaultParamsOnly={onRestoreDefaultParamsOnly}
              onPreviewSplash={onPreviewSplash}
            />
          )}
        </main>
      </div>
    </div>
  );
};
