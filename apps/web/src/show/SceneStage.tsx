import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Crown, Eye, Gavel, Gamepad2, Home, Megaphone, MessageCircle, Pause, Play, RotateCcw, SkipForward, Sparkles, Users } from 'lucide-react';
import { DEFAULT_CONFIG, GAMES, type Ack, type ClientEvents, type GameId, type RoomSnapshot } from '@en-vrille/shared';
import { Presenter, type PresenterExpression } from './Presenter';
import { useShowPreferences } from './audio';
import { FullscreenButton } from './controls';
import { desktop, serverResource } from '../backend';

export type ShowRequest = (event: keyof ClientEvents, payload?: unknown) => Promise<Ack>;
export interface SceneStageProps { room: RoomSnapshot; host: boolean; request: ShowRequest; onController?: () => void; onMenu?: () => void }
const gameIcons = { mythos: MessageCircle, pitch: Megaphone, court: Gavel, who: Eye, captions: Sparkles };
const courtSteps: Record<string, string> = { accusation: 'L’accusation', defense: 'La défense', questions: 'Les témoins et le jury', final: 'Derniers arguments' };
const courtInstructions: Record<string, string> = { accusation: 'Procureur, exposez les faits. Aussi ridicules soient-ils.', defense: 'Avocat, sauvez la réputation de votre client. Si possible.', questions: 'Le juge distribue la parole aux témoins et aux jurés.', final: 'Accusation, défense, accusé : une dernière chance de convaincre le jury.' };
const phaseLabels: Record<RoomSnapshot['phase'], string> = { lobby: 'En coulisses', 'party-intro': 'À l’antenne', intro: 'Le prochain jeu', rules: 'Les règles du jeu', writing: 'À vos idées', prepare: 'Préparation', presenting: 'En direct', reveal: 'La révélation', voting: 'Le public décide', results: 'Les résultats', leaderboard: 'Le classement', transition: 'La suite du programme', podium: 'La grande finale' };
const quips = {
  writing: ['Les bonnes idées arrivent. Les mauvaises aussi, heureusement.', 'Le service qualité a quitté le plateau. Profitez-en.', 'Une réponse brillante ? On accepte aussi les autres.'],
  voting: ['La démocratie a rarement eu autant de choses à se reprocher.', 'Un petit vote pour vous. Un grand doute pour l’humanité.', 'Votez avec votre cœur. Le bon sens est en pause.'],
  reveal: ['Anonymat garanti. Dignité beaucoup moins.', 'Le niveau monte. Ou alors le sol descend.', 'C’est à ce moment précis que tout part en vrille.'],
  results: ['Les chiffres ont parlé. Ils demandent à rester anonymes.', 'Les points sont officiels. Les excuses restent libres.', 'Applaudissements autorisés. Mauvaise foi également.'],
};
function hash(text: string) { let n = 0; for (const c of text) n = ((n << 5) - n + c.charCodeAt(0)) | 0; return Math.abs(n); }
function useServerTime(room: RoomSnapshot) {
  const [now, setNow] = useState(Date.now());
  const offset = useRef(room.serverTime - Date.now());
  useEffect(() => { offset.current = room.serverTime - Date.now(); }, [room.serverTime]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(timer); }, []);
  return room.paused ? room.pausedAt ?? room.serverTime : now + offset.current;
}
export function getRuleCards(room: RoomSnapshot) {
  const id = room.round?.gameId || room.playlist[room.gameIndex]?.gameId || 'mythos';
  const shared = room.config.noPoints ? 'Ce soir, on joue pour le plaisir : aucun point n’est attribué.' : 'Le barème est ajusté par l’équilibrage et le coefficient choisis par l’hôte.';
  const cards: Record<GameId, { title: string; text: string; example?: string }[]> = {
    mythos: [
      { title: 'La vérité ? Facultative.', text: 'Inventez l’explication la plus drôle à une question franchement douteuse.' },
      { title: 'Chacun sa petite invention', text: 'Écrivez sur votre manette. Votre réponse reste privée jusqu’à la révélation.', example: 'Pourquoi les chaussettes disparaissent ? « Elles préparent un coup d’État. »' },
      { title: 'Le chrono tourne', text: `Vous avez ${room.config.answerSeconds} secondes. Dès que tout le monde a répondu, le plateau continue.` },
      { title: 'Place aux mythos', text: 'Les réponses apparaissent une par une, sans les noms de leurs auteurs.' },
      { title: 'Le public tranche', text: `Votez sur votre manette pour votre réponse préférée en ${room.config.voteSeconds} secondes. Vous ne pouvez pas voter pour vous.` },
      { title: 'Le prix du grand n’importe quoi', text: room.config.noPoints ? shared : `100 points par vote reçu et 150 pour la ou les réponses en tête. ${shared}` },
    ],
    pitch: [
      { title: 'Téléachat sous haute tension', text: 'Convainquez le public qu’un produit invendable va révolutionner sa vie.' },
      { title: 'Votre produit vous attend', text: room.playlist[room.gameIndex]?.pitchMode === 'invented' ? 'Inventez un produit. Un autre joueur devra le vendre, et vous vendrez le sien.' : 'Chaque vendeur reçoit un produit absurde à découvrir sur sa manette.', example: 'Le parapluie d’intérieur : enfin un toit sous votre toit.' },
      { title: 'Préparez votre argumentaire', text: `${room.config.answerSeconds} secondes pour préparer votre démonstration. Signalez que vous êtes prêt sur la manette.` },
      { title: 'Le micro est à vous', text: 'Un vendeur à la fois. Le chrono est un repère : seul l’hôte passe au vendeur suivant.' },
      { title: 'Trois notes, zéro pitié', text: 'Évaluez chaque autre vendeur de 1 à 5 en humour, conviction et créativité.' },
      { title: 'Qui a fait fortune ?', text: room.config.noPoints ? shared : `La moyenne des notes × 100, et un bonus de 100 à l’inventeur si son produit atteint 4/5. ${shared}` },
    ],
    court: [
      { title: 'Silence dans le chaos', text: 'Un crime absurde, une défense douteuse, un verdict décidé par le jury.' },
      { title: 'À chacun son rôle', text: 'Accusé, procureur, avocat, juge, jurés et témoins : consultez votre rôle privé sur la manette.' },
      { title: 'Préparez votre intervention', text: `Vous avez ${room.config.answerSeconds} secondes. Vos notes restent privées, même après le procès.` },
      { title: 'Respectez le tour de parole', text: 'Le plateau indique qui parle. L’hôte donne le signal pour la suite ; le chrono ne coupe personne.' },
      { title: 'Le verdict est secret', text: 'Seuls les jurés votent coupable ou innocent. Les autres participants désignent la meilleure intervention.' },
      { title: 'La justice récompense', text: room.config.noPoints ? shared : `300 points au procureur si coupable, sinon à l’avocat et l’accusé. 150 pour la meilleure intervention. Égalité : innocent. ${shared}` },
    ],
    who: [
      { title: 'Vous vous connaissez si bien…', text: 'Désignez la personne qui correspond le mieux à la question du plateau.' },
      { title: 'Regardez-vous sans rien dire', text: 'La question est commune. Le vote reste sur votre manette.', example: 'Qui parmi nous pourrait se perdre dans son propre salon ?' },
      { title: 'Le temps de soupçonner', text: `Vous disposez de ${room.config.voteSeconds} secondes. Le vote se ferme dès que tout le monde a choisi.` },
      { title: 'Un choix assumé', text: room.config.allowSelfVoteWho ? 'Vous pouvez voter pour vous. Quelle lucidité.' : 'Vous ne pouvez pas voter pour vous. Vos amis s’en chargeront.' },
      { title: 'Le grand dévoilement', text: 'Découvrez la répartition des votes et les personnes les plus désignées.' },
      { title: 'L’instinct collectif', text: room.config.noPoints || room.config.whoNoPoints ? 'Ce jeu se déroule sans points : seulement des regards et des souvenirs.' : `100 points si votre vote suit la majorité, 50 aux personnes les plus désignées. ${shared}` },
    ],
    captions: [
      { title: 'Une image. Votre pire réplique.', text: 'Inventez le sous-titre qui transforme cette scène en chef-d’œuvre douteux.' },
      { title: 'Le cinéma vous remercie', text: 'Regardez bien l’image commune, puis écrivez votre réplique sur la manette.', example: '« Je vous avais dit de ne pas nourrir le photocopieur. »' },
      { title: 'Action !', text: `${room.config.answerSeconds} secondes pour écrire. Dès que toutes les répliques sont prêtes, on projette.` },
      { title: 'La séance commence', text: 'Les sous-titres sont révélés un par un sur l’image, sans leurs auteurs.' },
      { title: 'Le prix du public', text: `Votez pour votre réplique préférée en ${room.config.voteSeconds} secondes. Votre propre texte est exclu.` },
      { title: 'Et le sous-titre gagnant…', text: room.config.noPoints ? shared : `100 points par vote et 150 pour la ou les meilleures répliques. ${shared}` },
    ],
  };
  return cards[id];
}
function Progress({ room }: { room: RoomSnapshot }) {
  return <div className="show-participation">{room.progress.map(p => <div key={p.kind} className="show-progress"><div><span>{p.label}</span><strong>{p.completed}<small> / {p.total}</small></strong></div><div className="show-progress-track" role="progressbar" aria-label={p.label} aria-valuenow={p.completed} aria-valuemin={0} aria-valuemax={p.total || 1}><span style={{ width: `${p.total ? Math.min(100, p.completed / p.total * 100) : 0}%` }}/></div></div>)}</div>;
}
function Rules({ room, elapsed }: { room: RoomSnapshot; elapsed: number }) {
  const cards = getRuleCards(room), duration = room.deadline ? room.deadline - room.phaseStartedAt : 21000;
  const index = Math.min(cards.length - 1, Math.floor(elapsed / Math.max(2000, duration / cards.length)));
  return <div className="show-rule-layout"><div className="show-rule-steps">{cards.map((c, i) => <div key={c.title} className={i === index ? 'is-current' : i < index ? 'is-complete' : ''}><span>{i < index ? <Check size={14}/> : `0${i + 1}`}</span><p>{c.title}</p></div>)}</div><AnimatePresence mode="wait"><motion.article key={index} className="show-rule-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><span className="show-eyebrow">Comment ça se passe · {index + 1}/{cards.length}</span><h2>{cards[index].title}</h2><p>{cards[index].text}</p>{cards[index].example && <blockquote>{cards[index].example}</blockquote>}</motion.article></AnimatePresence></div>;
}
function Cast({ room }: { room: RoomSnapshot }) {
  const roles = room.round?.roles; if (!roles) return null;
  const entries = [ ['Accusé', roles.accused], ['Procureur', roles.prosecutor], ['Défense', roles.defense], ['Juge', roles.judge], ...roles.jurors.map(id => ['Juré', id]), ...roles.witnesses.map(id => ['Témoin', id]) ];
  return <div className="show-cast">{entries.map(([role, id], i) => { const p = room.players.find(p => p.id === id); return p && <motion.div key={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .15 }}><span className="show-avatar" style={{ background: p.color }}>{p.avatar}</span><span><small>{role}</small><strong>{p.name}</strong></span></motion.div>; })}</div>;
}
function PublicMedia({ url, label }: { url: string; label: string }) {
  const { reducedMotion } = useShowPreferences();
  return /\.(mp4|webm)(\?|$)/i.test(url) ? <video src={serverResource(url)} aria-label={label} autoPlay={!reducedMotion} controls={reducedMotion} muted loop playsInline/> : <img src={serverResource(url)} alt={label}/>;
}
function Participation({ room }: { room: RoomSnapshot }) {
  const round = room.round!;
  const presenting = room.phase === 'presenting';
  const speaker = room.players.find(p => p.id === round.currentSpeakerId);
  return <div className={`show-action-layout ${round.gameId === 'captions' ? 'is-cinema' : ''}`}>
    {round.mediaUrl && <div className="show-cinema"><PublicMedia url={round.mediaUrl} label="Scène à sous-titrer"/><span className="show-film-label">EN VRILLE PICTURES · PRISE {room.roundNumber}</span></div>}
    <article className="show-question"><span className="show-eyebrow">{round.category}{round.gameId === 'court' ? ' · dossier confidentiel' : ''}</span><h2>{round.prompt}</h2>
      {presenting && speaker && <div className="show-speaker"><span className="show-avatar" style={{ background: speaker.color }}>{speaker.avatar}</span><div><small>{round.gameId === 'court' ? courtSteps[round.courtStep || ''] || 'À la barre' : 'Votre vendeur en direct'}</small><h3>{speaker.name}</h3></div><span className="show-mic-bars" aria-hidden><i/><i/><i/></span></div>}
      {presenting && round.gameId === 'court' && <p className="show-court-instruction">{courtInstructions[round.courtStep || '']}</p>}
      {presenting && round.currentProduct && <div className="show-product"><span>Vu à la télé · absolument invraisemblable</span><h3>{round.currentProduct.name}</h3><p>{round.currentProduct.description}</p><b>Indispensable ? Non. Inoubliable ? Oui.</b></div>}
      {!presenting && <div className="show-phone-instruction"><Gamepad2 size={25}/><span>{room.phase === 'writing' ? 'Écrivez votre réponse sur votre manette.' : room.phase === 'prepare' ? 'Préparez votre intervention puis indiquez que vous êtes prêt.' : 'Faites votre choix sur votre manette.'}</span></div>}
      {round.gameId === 'court' && room.phase === 'prepare' && <Cast room={room}/>}
      {room.phase === 'voting' && round.gameId === 'court' && <div className="show-verdict-box"><Gavel size={32}/><p>Le jury délibère en secret.<br/><strong>Coupable ou innocent ?</strong></p></div>}
      {room.phase === 'voting' && ['mythos', 'captions'].includes(round.gameId) && <div className="show-answer-grid">{round.answers.map((a, index) => <div className="show-answer-mini" key={a.id}><b>{String.fromCharCode(65 + index)}</b><span>{a.text}</span></div>)}</div>}
      {room.phase === 'voting' && round.gameId === 'pitch' && <div className="show-product-grid">{round.products?.map((p, i) => <div key={`${p.sellerId}-${i}`}><small>{room.players.find(player => player.id === p.sellerId)?.name}</small><strong>{p.name}</strong></div>)}</div>}
      {room.phase === 'voting' && round.gameId === 'who' && <div className="show-suspects">{room.players.filter(p => !p.spectator).map(p => <div key={p.id}><span className="show-avatar" style={{ background: p.color }}>{p.avatar}</span><strong>{p.name}</strong></div>)}</div>}
    </article>
  </div>;
}
function Reveal({ room, elapsed }: { room: RoomSnapshot; elapsed: number }) {
  const round = room.round!, duration = room.deadline ? room.deadline - room.phaseStartedAt : 15000;
  const spacing = Math.max(900, duration / Math.max(1, round.answers.length));
  const count = Math.min(round.answers.length, Math.floor(elapsed / spacing) + 1);
  const current = round.answers[Math.max(0, count - 1)];
  return <div className={`show-reveal ${round.gameId === 'captions' ? 'show-screening' : ''}`}><h2>{round.prompt}</h2>
    {round.mediaUrl && <div className="show-cinema"><PublicMedia url={round.mediaUrl} label="Image des sous-titres"/><AnimatePresence mode="wait"><motion.blockquote key={current?.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{current?.text}</motion.blockquote></AnimatePresence></div>}
    <div className="show-reveal-answers">{round.answers.slice(0, count).map((a, i) => <motion.div className={i === count - 1 ? 'is-new' : ''} key={a.id} initial={{ opacity: 0, y: 20, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }}><span>{String.fromCharCode(65 + i)}</span><p>{a.text}</p></motion.div>)}</div>
    {!round.answers.length && <p>Aucune réponse à révéler cette fois. Le spectacle continue.</p>}<span className="show-anonymous-note">Les auteurs gardent leur identité secrète jusqu’aux résultats.</span>
  </div>;
}
function Results({ room, elapsed }: { room: RoomSnapshot; elapsed: number }) {
  const round = room.round!, answers = round.answers;
  const count = Math.max(1, Math.floor(elapsed / Math.max(700, 6500 / Math.max(1, answers.length))) + 1);
  const rows = room.players.filter(p => !p.spectator && (p.delta > 0 || round.results.some(r => r.playerId === p.id))).sort((a, b) => b.delta - a.delta);
  const voteTotal = Object.values(round.voteCounts || {}).reduce((a, b) => a + b, 0);
  return <div className="show-results"><div className="show-result-title"><span className="show-eyebrow">Le public a parlé</span><h2>{round.gameId === 'court' ? round.verdict === 'guilty' ? 'Coupable !' : 'Innocent !' : round.gameId === 'who' ? round.title || 'Vous êtes démasqués.' : 'Avouez. C’était vous.'}</h2></div>
    {round.gameId === 'who' ? <div className="show-vote-bars">{room.players.filter(p => !p.spectator).sort((a, b) => (round.voteCounts?.[b.id] || 0) - (round.voteCounts?.[a.id] || 0)).map((p, i) => <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * .25 }}><span className="show-avatar" style={{ background: p.color }}>{p.avatar}</span><div><strong>{p.name}</strong><div className="show-vote-track"><motion.i initial={{ width: 0 }} animate={{ width: `${voteTotal ? (round.voteCounts?.[p.id] || 0) / voteTotal * 100 : 0}%` }}/></div></div><b>{round.voteCounts?.[p.id] || 0}<small> vote{(round.voteCounts?.[p.id] || 0) > 1 ? 's' : ''}</small></b></motion.div>)}</div> : ['mythos', 'captions'].includes(round.gameId) ? <div className="show-authors">{answers.slice(0, count).map(a => { const author = room.players.find(p => p.id === a.authorId); return <motion.article key={a.id} initial={{ opacity: 0, rotateX: 20 }} animate={{ opacity: 1, rotateX: 0 }}><p>« {a.text} »</p><div><span className="show-avatar" style={{ background: author?.color }}>{author?.avatar}</span><strong>{author?.name || 'Auteur'}</strong><b>{round.voteCounts?.[a.id] || 0} voix</b></div></motion.article>; })}</div> : round.gameId === 'pitch' ? <div className="show-product-grid">{round.products?.map((p, i) => <motion.article key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * .4 }}><h3>{p.name}</h3><p>Vendu par <strong>{room.players.find(player => player.id === p.sellerId)?.name}</strong></p>{p.creatorId && <p>Inventé par <strong>{room.players.find(player => player.id === p.creatorId)?.name}</strong></p>}<b>{round.results.find(r => r.playerId === p.sellerId && r.rating !== undefined)?.rating || 0}/5</b></motion.article>)}</div> : <div className="show-verdict-results"><Gavel size={54}/><p>{round.voteCounts?.guilty || 0} coupable · {round.voteCounts?.innocent || 0} innocent</p><span>{round.verdict === 'guilty' ? 'L’accusation remporte le procès.' : 'La défense et l’accusé remportent le procès. L’égalité profite à la défense.'}</span></div>}
    {!room.config.noPoints && room.scoresVisible && rows.length > 0 && <div className="show-score-gains">{rows.map(p => <div key={p.id}><strong>{p.name}</strong><b>+{p.delta}</b><small>{round.results.filter(r => r.playerId === p.id).map(r => r.reason).join(' · ')}</small></div>)}</div>}
    {!room.config.noPoints && !room.scoresVisible && <p className="show-scores-hidden">Les points restent en coulisses jusqu’au classement prévu par l’hôte.</p>}
  </div>;
}
function Leaderboard({ room }: { room: RoomSnapshot }) {
  return <div className="show-leaderboard"><span className="show-eyebrow">Rien n’est encore joué</span><h2>Ça bouge au classement.</h2><div>{room.players.filter(p => !p.spectator).sort((a, b) => a.rank - b.rank).map(p => <motion.div layout key={p.id} className={p.rank === 1 ? 'is-first' : ''}><strong className="show-rank">{p.rank === 1 ? <Crown size={25}/> : String(p.rank).padStart(2, '0')}</strong><span className="show-avatar" style={{ background: p.color }}>{p.avatar}</span><b>{p.name}</b><span className="show-rank-change">{p.previousRank > p.rank ? `↑ ${p.previousRank - p.rank}` : p.previousRank && p.previousRank < p.rank ? `↓ ${p.rank - p.previousRank}` : '—'}</span><strong className="show-score">{p.score}<small> pts</small></strong>{p.delta > 0 && <span className="show-gain">+{p.delta}</span>}</motion.div>)}</div></div>;
}
function Podium({ room, elapsed, host, request, onMenu }: { room: RoomSnapshot; elapsed: number; host: boolean; request: ShowRequest; onMenu?: () => void }) {
  const players = room.players.filter(p => !p.spectator), sorted = [...players].sort((a, b) => a.rank - b.rank);
  const revealRank = elapsed < 2000 ? 3 : elapsed < 4500 ? 2 : 1;
  const maxWins = Math.max(0, ...players.map(p => p.roundWins));
  const tied = sorted.filter(p => p.rank === 1).length > 1;
  return <div className="show-finale"><span className="show-eyebrow">C’était EN VRILLE</span><h2>{room.config.noPoints ? 'Une équipe. Beaucoup de dossiers.' : elapsed < 4500 ? 'Le suspense est insoutenable…' : tied ? 'Des champions ex æquo !' : `${sorted[0]?.name || 'Le chaos'} remporte la soirée !`}</h2>
    {room.config.noPoints ? <div className="show-finale-team">{players.map(p => <div key={p.id}><span className="show-avatar" style={{ background: p.color }}>{p.avatar}</span><strong>{p.name}</strong></div>)}</div> : <div className="show-podium">{[2, 1, 3].map(rank => <div className={`show-podium-place place-${rank}`} key={rank}>{sorted.filter(p => p.rank === rank).map(p => <motion.div className="show-podium-person" key={p.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: revealRank <= rank ? 1 : 0, y: revealRank <= rank ? 0 : 18 }}><span className="show-avatar" style={{ background: p.color }}>{p.avatar}</span><h3>{revealRank <= rank ? p.name : ''}</h3><strong>{revealRank <= rank ? p.score : ''}<small> pts</small></strong></motion.div>)}<span className="show-podium-block">{rank === 1 ? <Crown size={36}/> : rank}</span></div>)}</div>}
    {elapsed >= 6000 && <motion.div className="show-finale-stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{players.map(p => <article key={p.id}><strong>{p.name}</strong><p>{p.roundWins} manche{p.roundWins > 1 ? 's' : ''} remportée{p.roundWins > 1 ? 's' : ''} · {p.gameWins} jeu{p.gameWins > 1 ? 'x' : ''} gagné{p.gameWins > 1 ? 's' : ''}</p>{p.bestGame && <span>Meilleur jeu : {GAMES.find(g => g.id === p.bestGame)?.shortName}</span>}{maxWins > 0 && p.roundWins === maxWins && <b>Le plus de manches remportées</b>}</article>)}</motion.div>}
    {!room.config.noPoints && elapsed >= 6000 && <ol className="show-final-ranking" aria-label="Classement final complet">{sorted.map(p => <li key={p.id}><b>{p.rank}</b><span>{p.name}</span><strong>{p.score.toLocaleString('fr-FR')} <small>pts</small></strong></li>)}</ol>}
    <div className="show-finale-actions">{host && <><button className="show-primary" onClick={() => void request('room:replay')}><RotateCcw size={18}/>Rejouer avec cette équipe</button><button className="show-secondary" onClick={async () => { const result = await request('room:replay'); if (result.ok) await request('room:configure', structuredClone(DEFAULT_CONFIG)); }}><Sparkles size={18}/>Préparer une nouvelle soirée</button></>}{onMenu && <button className="show-secondary" onClick={onMenu}><Home size={18}/>Menu principal</button>}</div>
  </div>;
}
export function SceneStage({ room, host, request, onController, onMenu }: SceneStageProps) {
  const now = useServerTime(room), elapsed = Math.max(0, now - room.phaseStartedAt);
  const { preferences, reducedMotion, cue, speak, stopVoice } = useShowPreferences();
  const [rulesOpen, setRulesOpen] = useState(false);
  const rulesDialog = useRef<HTMLElement | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!rulesOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = rulesDialog.current;
    dialog?.querySelector<HTMLElement>('button')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setRulesOpen(false); }
      if (event.key === 'Tab') {
        const focusable = dialog?.querySelectorAll<HTMLElement>('button, a, input, select, textarea, [tabindex="0"]');
        if (!focusable?.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus(); };
  }, [rulesOpen]);
  const round = room.round, info = GAMES.find(g => g.id === round?.gameId), Icon = gameIcons[round?.gameId || 'mythos'];
  const remaining = room.deadline ? Math.max(0, Math.ceil((room.deadline - now) / 1000)) : null;
  const lastSeconds = remaining !== null && remaining <= 10 && ['writing', 'prepare', 'voting'].includes(room.phase);
  const quip = useMemo(() => {
    if (room.phase === 'party-intro') return 'Bienvenue sur le seul plateau où perdre le fil fait partie des règles.';
    if (room.phase === 'podium') return 'Un tonnerre d’applaudissements pour cette équipe. Vous avez officiellement fait dérailler la soirée.';
    if (room.phase === 'rules') return 'Les règles sont simples. Votre interprétation le sera beaucoup moins.';
    if (room.phase === 'intro') return `Prochain arrêt : ${info?.name || 'le chaos'}. Gardez vos manettes à portée de main.`;
    if (room.phase === 'presenting') return 'Le micro est ouvert. L’hôte garde la main sur le prochain tour de parole.';
    const group = quips[room.phase as keyof typeof quips] || quips.writing;
    return group[hash(`${room.code}${round?.id}${room.phase}`) % group.length];
  }, [room.phase, room.code, round?.id, info?.name]);
  useEffect(() => { cue(room.phase === 'podium' ? 'win' : room.phase === 'reveal' ? 'reveal' : 'round'); speak(quip); return stopVoice; }, [room.phaseStartedAt, cue, speak, stopVoice, quip, room.phase]);
  useEffect(() => { if (room.paused) stopVoice(); }, [room.paused, stopVoice]);
  const ruleIndex = room.phase === 'rules' ? Math.min(5, Math.floor(elapsed / Math.max(2000, ((room.deadline || room.phaseStartedAt + 21000) - room.phaseStartedAt) / 6))) : -1;
  useEffect(() => { if (ruleIndex < 0) return; const card = getRuleCards(room)[ruleIndex]; speak(`${card.title}. ${card.text}`); return stopVoice; }, [ruleIndex, room.round?.id, speak, stopVoice]);
  const warned = useRef('');
  useEffect(() => { if (lastSeconds && warned.current !== `${room.phaseStartedAt}`) { warned.current = `${room.phaseStartedAt}`; cue('tick'); speak('Dix secondes. Faites confiance à votre première mauvaise idée.'); } }, [lastSeconds, room.phaseStartedAt, cue, speak]);
  const expression: PresenterExpression = room.phase === 'podium' ? 'victory' : room.phase === 'reveal' ? 'surprised' : room.phase === 'results' ? 'mocking' : room.phase === 'leaderboard' ? 'enthusiastic' : lastSeconds ? 'impatient' : room.awaitingHost ? 'suspense' : room.paused ? 'disappointed' : 'happy';
  const action = async (event: keyof ClientEvents, payload?: unknown) => { const result = await request(event, payload); setError(result.ok ? '' : result.error || 'Action indisponible.'); };
  return <section className={`show-stage game-${round?.gameId || 'mythos'} ${reducedMotion ? 'show-reduced-motion' : ''}`} style={{ '--show-game': info?.color || '#ef4454' } as CSSProperties} aria-label="Scène TV publique">
    <div className="show-stage-top"><div className="show-live"><i/>EN VRILLE <span>LE PLATEAU</span></div><div className="show-stage-episode">{info ? <><Icon size={16}/>{info.shortName} <span>Manche {room.roundNumber}/{room.totalRounds}</span></> : <><Users size={16}/>{room.players.filter(p => !p.spectator).length} joueurs en coulisses</>}</div><div className="show-stage-code">Salon <b>{room.code}</b><FullscreenButton/></div></div>
    <div className="show-stage-banner"><span><i/>{phaseLabels[room.phase]}</span>{room.paused ? <strong className="show-paused">Plateau en pause</strong> : remaining !== null && <strong className={lastSeconds ? 'show-timer is-urgent' : 'show-timer'} aria-label={`${remaining} secondes restantes`}>{String(Math.floor(remaining / 60)).padStart(2, '0')}<span>:</span>{String(remaining % 60).padStart(2, '0')}</strong>}</div>
    <div className="show-stage-main"><main className="show-stage-content">
      {room.phase === 'lobby' && <div className="show-lobby"><span className="show-eyebrow">Les coulisses du chaos</span><h1>La soirée attend<br/>ses vedettes.</h1><div className="show-lobby-invite"><div><QRCodeSVG value={room.inviteUrl} size={130} bgColor="#ffffff" fgColor="#171518" marginSize={2}/></div><div><span>Scannez. Rejoignez. Dérapez.</span><strong data-testid="room-code">{room.code}</strong><p>Ouvrez le lien sur votre téléphone et choisissez votre pseudo.</p><a className="invite-url show-public-invite" href={room.inviteUrl} onClick={(event) => { if (desktop) { event.preventDefault(); void desktop.openExternal(room.inviteUrl).catch(() => setError("Ouvrez ce lien dans le navigateur de votre téléphone.")); } }}>{room.inviteUrl}</a></div></div><div className="show-lobby-players">{room.players.filter(p => !p.spectator).map(p => <motion.div key={p.id} initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }}><span className="show-avatar" style={{ background: p.color }}>{p.avatar}</span><strong>{p.name}</strong><small>{p.ready ? 'Prêt !' : !p.connected ? 'Reconnexion…' : 'En coulisses'}</small></motion.div>)}</div></div>}
      {room.phase === 'party-intro' && <div className="show-programme"><span className="show-eyebrow">Ce soir, dans EN VRILLE</span><h1>Le programme<br/>des hostilités.</h1><div>{room.playlist.map((item, i) => { const game = GAMES.find(g => g.id === item.gameId)!, GameIcon = gameIcons[item.gameId]; return <motion.article key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .25 }}><span>0{i + 1}</span><GameIcon size={24}/><strong>{game.shortName}</strong><small>{item.rounds} manche{item.rounds > 1 ? 's' : ''}</small></motion.article>; })}</div><p>Votre téléphone est votre manette. Le plateau s’occupe du spectacle.</p></div>}
      {room.phase === 'intro' && <div className="show-game-intro"><div className="show-game-symbol"><Icon size={84} strokeWidth={1.5}/></div><span className="show-eyebrow">Jeu {room.gameIndex + 1} sur {room.playlist.length}</span><h1>{info?.name}</h1><p>{info?.description}</p><div className="show-countdown" aria-label="Début imminent">{remaining && remaining <= 3 ? remaining : 'À VOUS DE JOUER'}</div></div>}
      {room.phase === 'rules' && <Rules room={room} elapsed={elapsed}/>}
      {['writing', 'prepare', 'presenting', 'voting'].includes(room.phase) && round && <Participation room={room}/>}
      {room.phase === 'reveal' && round && <Reveal room={room} elapsed={elapsed}/>}
      {room.phase === 'results' && round && <Results room={room} elapsed={elapsed}/>}
      {room.phase === 'leaderboard' && <Leaderboard room={room}/>}
      {room.phase === 'transition' && <div className="show-transition"><Sparkles size={55}/><span className="show-eyebrow">Changement de décor</span><h1>On reprend<br/>nos esprits ?</h1><p>{room.message}</p>{room.playlist[room.gameIndex + 1] && <strong>À suivre : {GAMES.find(g => g.id === room.playlist[room.gameIndex + 1].gameId)?.name}</strong>}</div>}
      {room.phase === 'podium' && <Podium room={room} elapsed={elapsed} host={host} request={request} onMenu={onMenu}/>}
    </main><aside className="show-presenter-wing"><div className="show-wing-tag">VOTRE MAÎTRE DU CHAOS</div><Presenter expression={expression}/><span className="show-presenter-name">VRILL<span>À VOTRE SERVICE. À VOS RISQUES.</span></span>{preferences.subtitles && <p className="show-quip" aria-live="polite">{lastSeconds ? 'Dernières secondes. La perfection est surcotée.' : quip}</p>}</aside></div>
    <footer className="show-stage-bottom"><Progress room={room}/>{room.manualAdvanceRequired && <p className="show-oral-note">{room.phase === 'presenting' ? room.awaitingHost ? 'Le chrono est terminé. Prenez le temps de conclure.' : 'Le chrono est indicatif.' : 'Avance automatique désactivée.'} <strong>L’hôte donne le signal pour la suite.</strong></p>}{!room.progress.length && !room.manualAdvanceRequired && <span className="show-bottom-note">Le spectacle est ici. Vos choix restent sur votre manette.</span>}</footer>
    <div className="show-reactions" aria-label="Réactions du public"><AnimatePresence>{room.reactions.map((r, index) => <motion.span key={r.id} initial={{ opacity: 0, y: 35, scale: .5 }} animate={{ opacity: 1, y: -20 - index % 3 * 25, scale: 1 }} exit={{ opacity: 0, y: -90 }} style={{ left: `${10 + hash(r.id) % 70}%` }}>{r.reaction}</motion.span>)}</AnimatePresence></div>
    <div className="show-controls">{onController && <button className="show-secondary" onClick={onController}><Gamepad2 size={17}/>{host ? 'Régie / ma manette' : 'Ma manette'}</button>}{host && room.phase !== 'lobby' && room.phase !== 'podium' && <><button className="show-secondary" onClick={() => void action('room:pause', { paused: !room.paused })}>{room.paused ? <Play size={17}/> : <Pause size={17}/>} {room.paused ? 'Reprendre' : 'Pause'}</button><button className="show-primary" aria-label="Étape suivante" onClick={() => void action('room:advance')}><SkipForward size={17}/>{room.manualAdvanceRequired ? 'Prendre la suite' : 'Étape suivante'}</button></>}{room.phase !== 'lobby' && room.phase !== 'podium' && <button className="show-secondary" onClick={() => setRulesOpen(true)}>Revoir les règles</button>}{host && room.phase === 'lobby' && <button className="show-primary" onClick={() => void action('room:start')}><Play size={17}/>Lancer la soirée</button>}</div>
    {error && <p className="show-error" role="alert">{error}</p>}
    {rulesOpen && <div className="show-rules-backdrop"><section ref={rulesDialog} role="dialog" aria-modal="true" aria-label="Rappel des règles"><div><h2>{info?.name}</h2><button className="show-secondary" onClick={() => setRulesOpen(false)}>Fermer</button></div><ol>{getRuleCards(room).map(c => <li key={c.title}><h3>{c.title}</h3><p>{c.text}</p></li>)}</ol><p>La partie continue pendant ce rappel. L’hôte peut la mettre en pause.</p></section></div>}
  </section>;
}
