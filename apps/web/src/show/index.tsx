import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowRight, Gamepad2, HelpCircle, LogIn, Power, Settings, Sparkles, Users } from 'lucide-react';
import { GAMES } from '@en-vrille/shared';
import { Presenter } from './Presenter';
import { useShowPreferences } from './audio';
import { FullscreenButton } from './controls';
import { desktop } from '../backend';
export { ShowProvider, ShowSettings, useShowPreferences } from './audio';
export { Presenter, type PresenterExpression } from './Presenter';
export { SceneStage, getRuleCards, type ShowRequest } from './SceneStage';
export { FullscreenButton } from './controls';

export function IntroSplash() {
  const { reducedMotion, cue } = useShowPreferences();
  const [visible, setVisible] = useState(() => { try { return !sessionStorage.getItem('vrille-opening-seen'); } catch { return true; } });
  const dismiss = () => { setVisible(false); try { sessionStorage.setItem('vrille-opening-seen', '1'); } catch { /* Private browsing may reject writes. */ } };
  useEffect(() => {
    if (!visible) return;
    if (reducedMotion) { dismiss(); return; }
    const timer = setTimeout(dismiss, 1700); return () => clearTimeout(timer);
  }, [visible, reducedMotion]);
  if (!visible || reducedMotion) return null;
  return <div className="show-opening" role="dialog" aria-label="Générique EN VRILLE"><motion.div initial={{ opacity: 0, scale: .75, rotate: -7 }} animate={{ opacity: 1, scale: 1, rotate: -3 }} transition={{ type: 'spring', damping: 13 }}><span>LE CALME AVANT LE CHAOS</span><strong>EN<br/>VRILLE<em>✳</em></strong><p>La soirée va déraper.</p></motion.div><button onClick={() => { cue('confirm'); dismiss(); }}>Passer le générique <ArrowRight size={17}/></button></div>;
}
export function MainMenu({ onCreate, onJoin, onRules, onSettings, onCredits }: { onCreate: () => void; onJoin: () => void; onRules: () => void; onSettings: () => void; onCredits: () => void }) {
  const { reducedMotion, cue } = useShowPreferences();
  const click = (callback: () => void) => { cue('confirm'); callback(); };
  return <section className={`show-menu ${reducedMotion ? 'show-reduced-motion' : ''}`} aria-label="Menu principal EN VRILLE">
    <div className="show-menu-grain" aria-hidden/>
    <div className="show-menu-top"><span><i/>LE PARTY GAME QUI DÉRAILLE</span><FullscreenButton/></div>
    <div className="show-menu-layout"><div className="show-menu-copy"><span className="show-menu-kicker"><Sparkles size={16}/>VOS AMIS. VOS PIRES IDÉES.</span><h1>Ce soir,<br/>on part<br/><em>EN VRILLE.</em></h1><p>Cinq jeux, un plateau, zéro filtre.<br/>Votre téléphone devient votre manette.</p><div className="show-menu-primary-actions"><button className="show-menu-play" aria-label="Créer une partie" onClick={() => click(onCreate)}><span><PlayMark/>Créer une partie</span><ArrowRight size={24}/></button><button className="show-menu-join" aria-label="Rejoindre un salon" onClick={() => click(onJoin)}><LogIn size={20}/>Rejoindre un salon</button></div><div className="show-menu-details"><span><Users size={17}/>3 à 12 joueurs</span><span><Gamepad2 size={17}/>Sur place ou à distance</span></div></div><div className="show-menu-art"><span className="show-menu-sticker">LE BON SENS<br/>EST EN PAUSE <ArrowDownRight size={22}/></span><div className="show-menu-orbit orbit-one"/><div className="show-menu-orbit orbit-two"/><Presenter expression="enthusiastic"/><div className="show-menu-speech">« Vous êtes prêts ?<br/>Moi non plus. »</div><span className="show-menu-presenter-tag">VRILL <small>VOTRE MAÎTRE DU CHAOS</small></span></div></div>
    <div className="show-menu-bottom"><div className="show-menu-games" aria-label="Cinq mini-jeux inclus">{GAMES.map((g, i) => <span key={g.id}><b>0{i + 1}</b>{g.shortName}</span>)}</div><nav aria-label="Options du jeu"><button onClick={() => click(onRules)}><HelpCircle size={17}/>Comment jouer</button><button onClick={() => click(onSettings)}><Settings size={17}/>Réglages</button><button onClick={onCredits}>Crédits</button>{desktop && <button onClick={() => void desktop?.quit()}><Power size={17}/>Quitter</button>}</nav></div>
  </section>;
}
function PlayMark() { return <svg width="20" height="23" viewBox="0 0 20 23" aria-hidden><path d="M2 2 18 11.5 2 21Z" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/></svg>; }
