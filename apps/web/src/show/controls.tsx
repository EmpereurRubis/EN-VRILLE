import { useEffect, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { desktop } from '../backend';
export function FullscreenButton() {
  const [fullscreen, setFullscreen] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    if (desktop) {
      void desktop.isFullscreen?.().then(setFullscreen).catch(() => {});
      return desktop.onFullscreenChange?.(setFullscreen);
    }
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  const toggle = async () => { try { if (desktop) { setFullscreen(await desktop.setFullscreen(!fullscreen)); setError(''); return; } if (document.fullscreenElement) await document.exitFullscreen(); else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); else { setError('Utilisez le plein écran de votre navigateur.'); return; } setError(''); } catch { setError('Le plein écran est indisponible sur cet appareil.'); } };
  return <span className="show-fullscreen-wrap"><button type="button" className="show-icon-button" aria-label={fullscreen ? 'Quitter le plein écran' : 'Passer en plein écran'} title={fullscreen ? 'Quitter le plein écran' : 'Passer en plein écran'} onClick={() => void toggle()}>{fullscreen ? <Minimize size={18}/> : <Maximize size={18}/>}</button>{error && <span className="show-fullscreen-error" role="status">{error}</span>}</span>;
}
