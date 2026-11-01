import { showText } from './text';
import { useEffect, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { desktop } from '../backend';
import { useI18n } from '../i18n';
export function FullscreenButton() {
  const { language } = useI18n(), fr = language === 'fr';
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
  const toggle = async () => { try { if (desktop) { setFullscreen(await desktop.setFullscreen(!fullscreen)); setError(''); return; } if (document.fullscreenElement) await document.exitFullscreen(); else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); else { setError(showText(language,'ui.078')); return; } setError(''); } catch { setError(showText(language,'ui.079')); } };
  const label = fullscreen ? showText(language,'ui.080') : showText(language,'ui.081');
  return <span className="show-fullscreen-wrap"><button type="button" className="show-icon-button" aria-label={label} title={label} onClick={() => void toggle()}>{fullscreen ? <Minimize size={18}/> : <Maximize size={18}/>}</button>{error && <span className="show-fullscreen-error" role="status">{error}</span>}</span>;
}
