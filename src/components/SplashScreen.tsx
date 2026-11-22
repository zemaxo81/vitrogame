import React, { useEffect, useRef, useState } from 'react';
import { SplashConfig } from '../types/vitrocash';
import { CoinArtwork } from './CoinArtwork';
import { VitrocashLogo3D } from './VitrocashLogo3D';

interface SplashScreenProps {
  config: SplashConfig;
  appName: string;
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ config, appName, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!config.enabled || config.durationSeconds <= 0) {
      onCompleteRef.current();
      return;
    }

    const totalMs = Math.max(500, config.durationSeconds * 1000);
    const start = Date.now();
    let rafId = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      setProgress(100);
      onCompleteRef.current();
    };

    const timeoutId = window.setTimeout(finish, totalMs + 60);

    const tick = () => {
      if (finished) return;
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      setProgress(pct);
      if (elapsed >= totalMs) {
        finish();
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      finished = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [config.enabled, config.durationSeconds]);

  if (!config.enabled) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black text-white overflow-hidden select-none flex justify-center"
      aria-label="Écran de chargement VITROCASH"
    >
      <div className="relative w-full max-w-[430px] h-full flex flex-col items-center justify-between sm:border-x sm:border-amber-400/25">
        {/* Subtle ambient light halos on pure black */}
        {config.glowEnabled && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 24%, rgba(91,33,182,0.28) 0%, transparent 48%), radial-gradient(circle at 50% 76%, rgba(37,99,235,0.22) 0%, rgba(245,158,11,0.12) 30%, transparent 60%)',
            }}
          />
        )}

        {/* Upper Section: 3D VITROCASH Logo */}
        <div
          className="relative z-10 w-full flex flex-col items-center px-4"
          style={{ marginTop: `${config.logoTopPercent}vh` }}
        >
          <VitrocashLogo3D
            text={appName}
            variant="splash"
            sizePx={config.logoSizePx}
            glowEnabled={config.glowEnabled}
            reflectionEnabled={config.reflectionEnabled}
            animated
          />
          <p className="mt-4 text-[11px] tracking-[0.22em] uppercase text-slate-400">
            Crédits fictifs · Hors connexion
          </p>
        </div>

        {/* Lower Section: Large Animated Virtual Coin */}
        <div
          className="relative z-10 flex flex-col items-center"
          style={{ marginBottom: `${config.coinBottomPercent}vh` }}
        >
          <CoinArtwork
            model={config.coinModel}
            sizePx={config.coinSizePx}
            glowEnabled={config.glowEnabled}
            reflectionEnabled={config.reflectionEnabled}
            rotationSpeedSeconds={config.rotationSpeedSeconds}
            rotationDirection={config.rotationDirection}
            animated
          />

          <div className="mt-8 w-44 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 via-sky-400 to-amber-400 transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
