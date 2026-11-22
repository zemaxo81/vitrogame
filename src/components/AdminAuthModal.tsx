import React, { useState } from 'react';
import { Lock, ShieldAlert, X } from 'lucide-react';
import { SecurityConfig, SecurityLockoutState } from '../types/vitrocash';

interface AdminAuthModalProps {
  securityConfig: SecurityConfig;
  lockout: SecurityLockoutState;
  now: number;
  onSuccess: () => void;
  onFailedAttempt: () => void;
  onClose: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  securityConfig,
  lockout,
  now,
  onSuccess,
  onFailedAttempt,
  onClose,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isLocked = lockout.lockedUntil !== null && now < lockout.lockedUntil;
  const remainingLockSec = isLocked
    ? Math.max(1, Math.ceil((lockout.lockedUntil! - now) / 1000))
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    if (code.trim() === securityConfig.adminCode) {
      setError(null);
      onSuccess();
    } else {
      onFailedAttempt();
      setCode('');
      setError('Code administrateur incorrect.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl vc-card-relief p-6 text-slate-100 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-300/40 vc-icon-medallion flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white">Espace Jean</h3>
              <p className="text-xs text-slate-400">Accès administration local</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-code-input" className="block text-xs font-medium text-slate-300 mb-1.5">
              Code administrateur
            </label>
            <input
              id="admin-code-input"
              type="password"
              value={code}
              disabled={isLocked}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Saisir le code"
              autoFocus
              className="w-full min-h-[46px] rounded-xl bg-black/40 border border-white/15 px-3.5 text-sm font-mono-tabular text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {isLocked ? (
            <div className="rounded-xl bg-rose-500/15 border border-rose-400/40 p-3 text-xs text-rose-200 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Trop de tentatives erronées. Accès temporairement verrouillé pendant{' '}
                <strong className="font-mono-tabular">{remainingLockSec} s</strong>.
              </span>
            </div>
          ) : (
            error && (
              <div className="rounded-xl bg-rose-500/15 border border-rose-400/40 px-3 py-2 text-xs text-rose-200">
                {error} (Essai {lockout.failedAttempts}/{securityConfig.maxFailedAttempts})
              </div>
            )
          )}

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Protection locale anti-essais répétés. Ce code stocké sur l&apos;appareil protège l&apos;accès
            quotidien mais ne constitue pas un chiffrement matériel inviolable.
          </p>

          <button
            type="submit"
            disabled={isLocked || !code.trim()}
            className="w-full min-h-[48px] rounded-xl vc-btn-gold disabled:bg-slate-800 disabled:bg-none disabled:text-slate-500 disabled:shadow-none font-bold text-sm cursor-pointer"
          >
            Déverrouiller
          </button>
        </form>
      </div>
    </div>
  );
};
