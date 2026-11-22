import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWA';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          compact ? 'px-3 py-2 text-xs min-h-[40px]' : 'px-4 py-2.5 text-sm min-h-[44px]'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Installer sur Android</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            compact ? 'px-3 py-2 text-xs min-h-[40px]' : 'px-4 py-2.5 text-sm min-h-[44px]'
          }`}
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>Installer l&apos;app</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-[#140C2B] border border-white/15 p-6 text-slate-100 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold font-display">Installer VITROCASH</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-2 rounded-xl hover:bg-white/10 text-slate-400"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                1. Touchez le bouton <strong>Partager</strong> dans Safari.
                <br />
                2. Faites défiler et choisissez <strong>Sur l&apos;écran d&apos;accueil</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
