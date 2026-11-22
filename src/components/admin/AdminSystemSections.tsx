import React, { useState } from 'react';
import { AlertTriangle, BellRing, Copy, Download, Eye, RotateCcw, Upload, Volume2 } from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import {
  getNotificationPermissionState,
  NotificationPermState,
  requestRenewalNotificationPermission,
  sendSystemRenewalNotification,
} from '../../notifications/renewalNotifier';
import { createBackupEnvelope, parseAndVerifyBackup } from '../../storage/localDb';
import { AppConfig, AppState, CoinModelId } from '../../types/vitrocash';
import { CoinArtwork } from '../CoinArtwork';
import { PWAInstallButton } from '../PWAInstallButton';

interface AdminSystemSectionsProps {
  section:
    | 'general'
    | 'player'
    | 'appearance'
    | 'sounds'
    | 'animations'
    | 'splash'
    | 'security'
    | 'backups'
    | 'reset';
  state: AppState;
  onUpdateConfig: (section: keyof AppConfig, value: unknown, auditSummary: string) => void;
  onRestoreBackup: (restoredState: AppState) => void;
  onRecordBackup: (nextState: AppState) => void;
  onTotalTestDataReset: () => void;
  onRestoreDefaultParamsOnly: () => void;
  onPreviewSplash: () => void;
}

export const AdminSystemSections: React.FC<AdminSystemSectionsProps> = ({
  section,
  state,
  onUpdateConfig,
  onRestoreBackup,
  onRecordBackup,
  onTotalTestDataReset,
  onRestoreDefaultParamsOnly,
  onPreviewSplash,
}) => {
  const [newCode, setNewCode] = useState(state.config.security.adminCode);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [pastedJson, setPastedJson] = useState('');
  const [pendingRestore, setPendingRestore] = useState<{ state: AppState; exportedAt?: number } | null>(
    null,
  );
  const [confirmTotalReset, setConfirmTotalReset] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermState>(() =>
    getNotificationPermissionState(),
  );
  const [notifTestMsg, setNotifTestMsg] = useState<string | null>(null);

  if (section === 'general') {
    const cfg = state.config.general;
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white">2. Paramètres Généraux</h2>
        <div className="rounded-2xl vc-card-relief p-4 space-y-3 text-xs">
          <label className="block">
            <span className="text-slate-300 block mb-1">Nom de l&apos;application</span>
            <input
              type="text"
              value={cfg.appName}
              onChange={(e) =>
                onUpdateConfig('general', { ...cfg, appName: e.target.value }, 'Modification nom app')
              }
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white"
            />
          </label>
          <label className="block">
            <span className="text-slate-300 block mb-1">Mention crédits fictifs</span>
            <textarea
              rows={2}
              value={cfg.disclaimerText}
              onChange={(e) =>
                onUpdateConfig(
                  'general',
                  { ...cfg, disclaimerText: e.target.value },
                  'Modification mention crédits fictifs',
                )
              }
              className="w-full rounded-xl bg-black/40 border border-white/15 p-3 text-white"
            />
          </label>
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
            <span className="text-slate-400">
              Mode hors connexion actif (IndexedDB + Cache PWA local).
            </span>
            <PWAInstallButton compact />
          </div>
        </div>

        <div className="rounded-2xl vc-card-relief p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-300" />
                <span>Notifications de renouvellement des jeux</span>
              </h3>
              <p className="text-slate-400 mt-0.5">
                Statut appareil :{' '}
                <strong className="text-slate-200">
                  {notifPerm === 'granted'
                    ? 'Autorisées'
                    : notifPerm === 'denied'
                      ? 'Refusées dans les réglages navigateur'
                      : notifPerm === 'default'
                        ? 'En attente d’autorisation'
                        : 'Non supportées sur ce navigateur'}
                </strong>
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                let perm = notifPerm;
                if (perm === 'default') {
                  perm = await requestRenewalNotificationPermission();
                  setNotifPerm(perm);
                }
                const sent = await sendSystemRenewalNotification([
                  {
                    key: 'tickets',
                    label: 'Tickets à Gratter',
                    renewalId: 'test',
                    attemptsRestored: state.config.tickets.batchSize,
                  },
                ]);
                setNotifTestMsg(
                  sent
                    ? 'Notification envoyée : « VITROCASH : Un jeu est de nouveau accessible !!! »'
                    : 'Permission système non accordée (l’alerte intégrée dans l’application reste toujours active).',
                );
              }}
              className="px-4 py-2 min-h-[42px] rounded-xl vc-btn-gold font-bold text-xs cursor-pointer"
            >
              Activer / Tester la notification
            </button>
          </div>
          {notifTestMsg && (
            <p className="text-amber-200 bg-black/30 rounded-xl px-3 py-2 border border-amber-400/25">
              {notifTestMsg}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (section === 'player') {
    const cfg = state.config.general;
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white">3. Profil Joueur (Erika)</h2>
        <div className="rounded-2xl vc-card-relief p-4 space-y-3 text-xs">
          <label className="block">
            <span className="text-slate-300 block mb-1">Prénom affiché</span>
            <input
              type="text"
              value={cfg.playerName}
              onChange={(e) =>
                onUpdateConfig('general', { ...cfg, playerName: e.target.value }, 'Modification prénom joueur')
              }
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white"
            />
          </label>
          <label className="block">
            <span className="text-slate-300 block mb-1">Sous-titre d&apos;accueil</span>
            <input
              type="text"
              value={cfg.welcomeSubtitle}
              onChange={(e) =>
                onUpdateConfig(
                  'general',
                  { ...cfg, welcomeSubtitle: e.target.value },
                  'Modification sous-titre accueil',
                )
              }
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white"
            />
          </label>
        </div>
      </div>
    );
  }

  if (section === 'appearance') {
    const cfg = state.config.appearance;
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white">14. Apparence</h2>
        <div className="rounded-2xl vc-card-relief p-4 space-y-3 text-xs">
          <label className="block">
            <span className="text-slate-300 block mb-1">Intensité des reflets lumineux</span>
            <select
              value={cfg.glowIntensity}
              onChange={(e) =>
                onUpdateConfig(
                  'appearance',
                  { ...cfg, glowIntensity: e.target.value },
                  'Modification intensité lumineuse',
                )
              }
              className="w-full min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 text-white"
            >
              <option value="low">Subtile</option>
              <option value="medium">Équilibrée</option>
              <option value="high">Intense</option>
            </select>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={cfg.compactCards}
              onChange={(e) =>
                onUpdateConfig(
                  'appearance',
                  { ...cfg, compactCards: e.target.checked },
                  'Toggle cartes compactes',
                )
              }
              className="w-4 h-4 accent-amber-400"
            />
            <span className="text-slate-200">Mode cartes compactes sur l&apos;accueil</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={cfg.showDisclaimerBanner}
              onChange={(e) =>
                onUpdateConfig(
                  'appearance',
                  { ...cfg, showDisclaimerBanner: e.target.checked },
                  'Affichage bannière crédits fictifs',
                )
              }
              className="w-4 h-4 accent-amber-400"
            />
            <span className="text-slate-200">Afficher la mention crédits fictifs sur l&apos;accueil</span>
          </label>
        </div>
      </div>
    );
  }

  if (section === 'sounds') {
    const cfg = state.config.sounds;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-white">15. Sons</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => soundEngine.playWheelPeg(cfg)}
              className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[38px] rounded-xl bg-white/10 text-xs text-white cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Test Roue</span>
            </button>
            <button
              type="button"
              onClick={() => soundEngine.playWin(cfg, true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[38px] rounded-xl bg-sky-600 text-xs font-semibold text-white cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Test Victoire</span>
            </button>
          </div>
        </div>
        <div className="rounded-2xl vc-card-relief p-4 space-y-3 text-xs">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-200 font-semibold">Activer les sons généraux</span>
            <input
              type="checkbox"
              checked={cfg.masterEnabled}
              onChange={(e) =>
                onUpdateConfig('sounds', { ...cfg, masterEnabled: e.target.checked }, 'Toggle sons généraux')
              }
              className="w-4 h-4 accent-amber-400"
            />
          </label>
          <label className="block">
            <span className="text-slate-300 block mb-1">
              Volume global ({Math.round(cfg.volume * 100)} %)
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={cfg.volume}
              onChange={(e) =>
                onUpdateConfig('sounds', { ...cfg, volume: Number(e.target.value) }, 'Réglage volume')
              }
              className="w-full accent-amber-400"
            />
          </label>
          {(
            [
              ['ticketsEnabled', 'Sons Tickets à gratter'],
              ['wheelEnabled', 'Sons Grande Roue'],
              ['slotsEnabled', 'Sons Bandit manchot'],
              ['lotteryEnabled', 'Sons Loterie'],
              ['victoryEnabled', 'Effets sonores de victoire'],
            ] as const
          ).map(([field, label]) => (
            <label key={field} className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-300">{label}</span>
              <input
                type="checkbox"
                checked={cfg[field]}
                onChange={(e) =>
                  onUpdateConfig('sounds', { ...cfg, [field]: e.target.checked }, `Toggle ${label}`)
                }
                className="w-4 h-4 accent-amber-400"
              />
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (section === 'animations') {
    const cfg = state.config.animations;
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white">16. Animations & Vibrations</h2>
        <div className="rounded-2xl vc-card-relief p-4 space-y-3 text-xs">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-200 font-semibold">Activer les animations</span>
            <input
              type="checkbox"
              checked={cfg.masterEnabled}
              onChange={(e) =>
                onUpdateConfig(
                  'animations',
                  { ...cfg, masterEnabled: e.target.checked },
                  'Toggle animations',
                )
              }
              className="w-4 h-4 accent-amber-400"
            />
          </label>
          <label className="block">
            <span className="text-slate-300 block mb-1">Intensité des animations</span>
            <select
              value={cfg.intensity}
              onChange={(e) =>
                onUpdateConfig('animations', { ...cfg, intensity: e.target.value }, 'Intensité animations')
              }
              className="w-full min-h-[40px] rounded-xl bg-black/40 border border-white/15 px-3 text-white"
            >
              <option value="subtle">Subtile</option>
              <option value="normal">Normale</option>
              <option value="dynamic">Dynamique</option>
            </select>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-300">Lumières et LED décoratives</span>
            <input
              type="checkbox"
              checked={cfg.lightsEnabled}
              onChange={(e) =>
                onUpdateConfig('animations', { ...cfg, lightsEnabled: e.target.checked }, 'Toggle lumières')
              }
              className="w-4 h-4 accent-amber-400"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-300">Vibrations tactiles (si supportées)</span>
            <input
              type="checkbox"
              checked={cfg.hapticsEnabled}
              onChange={(e) =>
                onUpdateConfig('animations', { ...cfg, hapticsEnabled: e.target.checked }, 'Toggle vibrations')
              }
              className="w-4 h-4 accent-amber-400"
            />
          </label>
          <label className="block">
            <span className="text-slate-300 block mb-1">Intensité des vibrations</span>
            <select
              value={cfg.hapticsIntensity}
              onChange={(e) =>
                onUpdateConfig(
                  'animations',
                  { ...cfg, hapticsIntensity: e.target.value },
                  'Intensité vibrations',
                )
              }
              className="w-full min-h-[40px] rounded-xl bg-black/40 border border-white/15 px-3 text-white"
            >
              <option value="light">Légère</option>
              <option value="medium">Moyenne</option>
              <option value="strong">Forte</option>
            </select>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="block">
              <span className="text-slate-300 block mb-1">Durée rotation Roue (ms)</span>
              <input
                type="number"
                step={200}
                min={1000}
                max={10000}
                value={cfg.wheelSpinDurationMs}
                onChange={(e) =>
                  onUpdateConfig(
                    'animations',
                    { ...cfg, wheelSpinDurationMs: Math.max(1000, Number(e.target.value)) },
                    'Modification durée roue',
                  )
                }
                className="w-full min-h-[40px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
              />
            </label>
            <label className="block">
              <span className="text-slate-300 block mb-1">Durée Bandit manchot (ms)</span>
              <input
                type="number"
                step={200}
                min={800}
                max={6000}
                value={cfg.slotSpinDurationMs}
                onChange={(e) =>
                  onUpdateConfig(
                    'animations',
                    { ...cfg, slotSpinDurationMs: Math.max(800, Number(e.target.value)) },
                    'Modification durée bandit manchot',
                  )
                }
                className="w-full min-h-[40px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (section === 'splash') {
    const cfg = state.config.splash;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-white">17. Écran de Chargement</h2>
          <button
            type="button"
            onClick={onPreviewSplash}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Prévisualiser</span>
          </button>
        </div>

        <div className="rounded-2xl bg-black border-[1.5px] border-amber-400/45 p-4 flex items-center justify-center">
          <CoinArtwork
            model={cfg.coinModel}
            sizePx={110}
            glowEnabled={cfg.glowEnabled}
            reflectionEnabled={cfg.reflectionEnabled}
            rotationSpeedSeconds={cfg.rotationSpeedSeconds}
            rotationDirection={cfg.rotationDirection}
            animated
          />
        </div>

        <div className="rounded-2xl vc-card-relief p-4 space-y-3 text-xs">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-200 font-semibold">Activer l&apos;écran de chargement</span>
            <input
              type="checkbox"
              checked={cfg.enabled}
              onChange={(e) =>
                onUpdateConfig('splash', { ...cfg, enabled: e.target.checked }, 'Toggle écran chargement')
              }
              className="w-4 h-4 accent-amber-400"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-slate-300 block mb-1">Durée (secondes)</span>
              <input
                type="number"
                min={1}
                max={15}
                value={cfg.durationSeconds}
                onChange={(e) =>
                  onUpdateConfig(
                    'splash',
                    { ...cfg, durationSeconds: Math.max(1, Number(e.target.value)) },
                    'Modification durée chargement',
                  )
                }
                className="w-full min-h-[40px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
              />
            </label>
            <label className="block">
              <span className="text-slate-300 block mb-1">Modèle de pièce</span>
              <select
                value={cfg.coinModel}
                onChange={(e) =>
                  onUpdateConfig(
                    'splash',
                    { ...cfg, coinModel: e.target.value as CoinModelId },
                    'Changement modèle pièce chargement',
                  )
                }
                className="w-full min-h-[40px] rounded-xl bg-black/40 border border-white/15 px-3 text-white"
              >
                <option value="imperial_gold">Or Impérial</option>
                <option value="electric_diamond">Diamant Électrique</option>
                <option value="violet_crystal">Cristal Violet</option>
                <option value="platinum_eclipse">Platine Éclipse</option>
              </select>
            </label>
            <label className="block">
              <span className="text-slate-300 block mb-1">Taille Logo ({cfg.logoSizePx} px)</span>
              <input
                type="range"
                min={24}
                max={64}
                value={cfg.logoSizePx}
                onChange={(e) =>
                  onUpdateConfig('splash', { ...cfg, logoSizePx: Number(e.target.value) }, 'Taille logo')
                }
                className="w-full accent-amber-400"
              />
            </label>
            <label className="block">
              <span className="text-slate-300 block mb-1">Position haute Logo ({cfg.logoTopPercent} %)</span>
              <input
                type="range"
                min={5}
                max={35}
                value={cfg.logoTopPercent}
                onChange={(e) =>
                  onUpdateConfig(
                    'splash',
                    { ...cfg, logoTopPercent: Number(e.target.value) },
                    'Position haute logo',
                  )
                }
                className="w-full accent-amber-400"
              />
            </label>
            <label className="block">
              <span className="text-slate-300 block mb-1">Taille Pièce ({cfg.coinSizePx} px)</span>
              <input
                type="range"
                min={90}
                max={240}
                value={cfg.coinSizePx}
                onChange={(e) =>
                  onUpdateConfig('splash', { ...cfg, coinSizePx: Number(e.target.value) }, 'Taille pièce')
                }
                className="w-full accent-amber-400"
              />
            </label>
            <label className="block">
              <span className="text-slate-300 block mb-1">Position basse Pièce ({cfg.coinBottomPercent} %)</span>
              <input
                type="range"
                min={5}
                max={35}
                value={cfg.coinBottomPercent}
                onChange={(e) =>
                  onUpdateConfig(
                    'splash',
                    { ...cfg, coinBottomPercent: Number(e.target.value) },
                    'Position basse pièce',
                  )
                }
                className="w-full accent-amber-400"
              />
            </label>
            <label className="block">
              <span className="text-slate-300 block mb-1">Vitesse rotation ({cfg.rotationSpeedSeconds} s)</span>
              <input
                type="range"
                min={1}
                max={8}
                step={0.2}
                value={cfg.rotationSpeedSeconds}
                onChange={(e) =>
                  onUpdateConfig(
                    'splash',
                    { ...cfg, rotationSpeedSeconds: Number(e.target.value) },
                    'Vitesse rotation pièce',
                  )
                }
                className="w-full accent-amber-400"
              />
            </label>
            <label className="block">
              <span className="text-slate-300 block mb-1">Sens de rotation</span>
              <select
                value={cfg.rotationDirection}
                onChange={(e) =>
                  onUpdateConfig(
                    'splash',
                    { ...cfg, rotationDirection: e.target.value as 'normal' | 'reverse' },
                    'Sens rotation pièce',
                  )
                }
                className="w-full min-h-[40px] rounded-xl bg-black/40 border border-white/15 px-3 text-white"
              >
                <option value="normal">Horaire</option>
                <option value="reverse">Anti-horaire</option>
              </select>
            </label>
          </div>
          <label className="flex items-center justify-between cursor-pointer pt-1">
            <span className="text-slate-300">Effets lumineux et halo</span>
            <input
              type="checkbox"
              checked={cfg.glowEnabled}
              onChange={(e) =>
                onUpdateConfig('splash', { ...cfg, glowEnabled: e.target.checked }, 'Halo splash')
              }
              className="w-4 h-4 accent-amber-400"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-300">Reflets métalliques animés</span>
            <input
              type="checkbox"
              checked={cfg.reflectionEnabled}
              onChange={(e) =>
                onUpdateConfig(
                  'splash',
                  { ...cfg, reflectionEnabled: e.target.checked },
                  'Reflets splash',
                )
              }
              className="w-4 h-4 accent-amber-400"
            />
          </label>
        </div>
      </div>
    );
  }

  if (section === 'security') {
    const cfg = state.config.security;
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white">18. Sécurité de l&apos;Administration</h2>
        <div className="rounded-2xl vc-card-relief p-4 space-y-3 text-xs">
          <label className="block">
            <span className="text-slate-300 block mb-1">Code administrateur actuel</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="flex-1 min-h-[42px] rounded-xl bg-black/40 border border-white/15 px-3 font-mono-tabular text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (newCode.trim().length < 4) {
                    setCodeMsg('Le code doit contenir au moins 4 caractères.');
                    return;
                  }
                  onUpdateConfig(
                    'security',
                    { ...cfg, adminCode: newCode.trim() },
                    'Modification code administrateur',
                  );
                  setCodeMsg('Code administrateur mis à jour.');
                }}
                className="px-4 min-h-[42px] rounded-xl bg-amber-500 text-slate-950 font-bold cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </label>
          {codeMsg && <p className="text-emerald-300">{codeMsg}</p>}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <label className="block">
              <span className="text-slate-300 block mb-1">Essais max avant verrouillage</span>
              <input
                type="number"
                min={2}
                max={10}
                value={cfg.maxFailedAttempts}
                onChange={(e) =>
                  onUpdateConfig(
                    'security',
                    { ...cfg, maxFailedAttempts: Math.max(2, Number(e.target.value)) },
                    'Modification essais max sécurité',
                  )
                }
                className="w-full min-h-[40px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
              />
            </label>
            <label className="block">
              <span className="text-slate-300 block mb-1">Durée blocage (secondes)</span>
              <input
                type="number"
                min={10}
                max={600}
                value={cfg.lockoutSeconds}
                onChange={(e) =>
                  onUpdateConfig(
                    'security',
                    { ...cfg, lockoutSeconds: Math.max(10, Number(e.target.value)) },
                    'Modification durée blocage sécurité',
                  )
                }
                className="w-full min-h-[40px] rounded-xl bg-black/40 border border-white/15 px-3 text-white font-mono-tabular"
              />
            </label>
          </div>
          <p className="text-[11px] text-slate-400">
            Remarque : ce code local protège l&apos;accès sur l&apos;appareil contre les erreurs ou ouvertures
            accidentelles et ne constitue pas une sécurité inviolable.
          </p>
        </div>
      </div>
    );
  }

  if (section === 'backups') {
    const handleExport = () => {
      const { envelope, nextState } = createBackupEnvelope(state);
      const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vitrocash-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onRecordBackup(nextState);
      setBackupMessage('Sauvegarde exportée avec succès (intégrité vérifiée).');
    };

    const handleCopy = async () => {
      const { envelope, nextState } = createBackupEnvelope(state);
      try {
        await navigator.clipboard.writeText(JSON.stringify(envelope));
        onRecordBackup(nextState);
        setBackupMessage('Sauvegarde JSON copiée dans le presse-papiers.');
      } catch {
        setBackupMessage('Copie directe refusée par le navigateur — utilisez l\'export .json.');
      }
    };

    const verifyRawJson = (raw: string) => {
      const res = parseAndVerifyBackup(raw);
      if (!res.valid || !res.state) {
        setBackupMessage(res.error ?? 'Sauvegarde invalide.');
        setPendingRestore(null);
      } else {
        setPendingRestore({ state: res.state, exportedAt: res.exportedAt });
        setBackupMessage('Sauvegarde vérifiée. Confirmez la restauration ci-dessous.');
      }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => verifyRawJson(String(reader.result ?? ''));
      reader.readAsText(file);
    };

    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white">19. Sauvegardes & Restauration</h2>
        <div className="rounded-2xl vc-card-relief p-4 space-y-4 text-xs">
          <div className="text-slate-300">
            Dernière sauvegarde :{' '}
            <strong className="text-white">
              {state.lastBackupAt ? new Date(state.lastBackupAt).toLocaleString('fr-FR') : 'Jamais effectuée'}
            </strong>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exporter (.json)</span>
            </button>

            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>Copier JSON</span>
            </button>

            <label className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Importer fichier</span>
              <input type="file" accept=".json,application/json" onChange={handleFileSelect} className="hidden" />
            </label>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/10">
            <span className="text-slate-300 block">Ou coller une sauvegarde JSON :</span>
            <textarea
              rows={3}
              value={pastedJson}
              onChange={(e) => setPastedJson(e.target.value)}
              placeholder='{"app":"VITROCASH", ...}'
              className="w-full rounded-xl bg-black/40 border border-white/15 p-2.5 font-mono-tabular text-[11px] text-white"
            />
            <button
              type="button"
              disabled={!pastedJson.trim()}
              onClick={() => verifyRawJson(pastedJson.trim())}
              className="px-3.5 py-2 min-h-[38px] rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white font-semibold cursor-pointer"
            >
              Vérifier le JSON collé
            </button>
          </div>

          {backupMessage && (
            <div className="rounded-xl bg-black/35 border border-white/10 p-3 text-slate-200">
              {backupMessage}
            </div>
          )}

          {pendingRestore && (
            <div className="rounded-xl bg-amber-500/15 border border-amber-400/40 p-3.5 space-y-2">
              <div className="font-semibold text-amber-200">
                Confirmer la restauration (exportée le{' '}
                {pendingRestore.exportedAt
                  ? new Date(pendingRestore.exportedAt).toLocaleString('fr-FR')
                  : 'inconnu'}
                ) ?
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onRestoreBackup(pendingRestore.state);
                    setPendingRestore(null);
                    setPastedJson('');
                    setBackupMessage('Données restaurées et vérifiées avec succès.');
                  }}
                  className="px-4 py-2 min-h-[40px] rounded-xl bg-amber-500 text-slate-950 font-bold cursor-pointer"
                >
                  Confirmer la restauration
                </button>
                <button
                  type="button"
                  onClick={() => setPendingRestore(null)}
                  className="px-4 py-2 min-h-[40px] rounded-xl bg-white/10 text-white cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            La désinstallation de l&apos;application ou l&apos;effacement des données du navigateur/téléphone
            peut entraîner la perte des données locales non sauvegardées.
          </p>
        </div>
      </div>
    );
  }

  // Section 20: Reset
  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl font-bold text-white">20. Réinitialisation Contrôlée</h2>

      <div className="rounded-2xl vc-card-relief p-5 space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h3 className="font-bold text-sm text-white">Remise à zéro des données de jeu et de test</h3>
            <p className="text-slate-300 leading-relaxed">
              Efface uniquement : solde du cycle, total cumulé, historiques de résultats, compteurs de
              tentatives, progression du chronomètre, statistiques et paliers.
              <br />
              <strong>Conserve intégralement</strong> : les 25+ tickets et illustrations, paramètres des jeux,
              calendrier, code administrateur, apparence, sons, animations et écran de chargement.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setConfirmTotalReset(true)}
          className="w-full sm:w-auto px-5 py-3 min-h-[46px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-xs tracking-wide cursor-pointer"
        >
          RÉINITIALISATION TOTALE DES DONNÉES DE TEST
        </button>

        {confirmTotalReset && (
          <div className="rounded-xl bg-black/50 border border-rose-400/40 p-4 space-y-3 text-xs">
            <p className="font-semibold text-rose-200">
              Confirmez-vous la réinitialisation ? Il est recommandé d&apos;exporter une sauvegarde au préalable.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const { envelope, nextState } = createBackupEnvelope(state);
                  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `vitrocash-avant-reset-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  onRecordBackup(nextState);
                }}
                className="px-3.5 py-2 min-h-[40px] rounded-xl bg-amber-500 text-slate-950 font-bold cursor-pointer"
              >
                Sauvegarder d&apos;abord
              </button>
              <button
                type="button"
                onClick={() => {
                  onTotalTestDataReset();
                  setConfirmTotalReset(false);
                }}
                className="px-3.5 py-2 min-h-[40px] rounded-xl bg-rose-600 text-white font-bold cursor-pointer"
              >
                Confirmer la réinitialisation
              </button>
              <button
                type="button"
                onClick={() => setConfirmTotalReset(false)}
                className="px-3.5 py-2 min-h-[40px] rounded-xl bg-white/10 text-white cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl vc-card-relief p-5 space-y-3 text-xs">
        <h3 className="font-bold text-sm text-white">Restauration des paramètres par défaut</h3>
        <p className="text-slate-400">
          Restaure les réglages d&apos;usine (probabilités, délais, sons, animations, chargement) sans
          supprimer les historiques ni les crédits fictifs d&apos;Erika.
        </p>
        <button
          type="button"
          onClick={onRestoreDefaultParamsOnly}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Restaurer les paramètres par défaut</span>
        </button>
      </div>
    </div>
  );
};
