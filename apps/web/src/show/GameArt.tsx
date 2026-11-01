import type { GameId } from '@en-vrille/shared';
import { translate, useI18n, type Language } from '../i18n';

/** Business logic knows an ID; all replaceable art lives behind this manifest. */
export const GAME_ART: Record<GameId, { src: string; color: string; second: string }> = {
  mythos: { src: '/game-art/mythos.svg', color: '#d9b5ff', second: '#ffda66' },
  pitch: { src: '/game-art/pitch.svg', color: '#ffb366', second: '#62e4d3' },
  court: { src: '/game-art/court.svg', color: '#e7bd73', second: '#c05873' },
  who: { src: '/game-art/who.svg', color: '#9cb8ff', second: '#ffa2d8' },
  captions: { src: '/game-art/captions.svg', color: '#e8c382', second: '#df5363' },
};
export function GameArt({ gameId, variant = 'card', className = '', decorative = false }: { gameId: GameId; variant?: 'card' | 'hero' | 'thumb'; className?: string; decorative?: boolean }) {
  const { language } = useI18n();
  return <img className={`game-key-art game-key-art-${variant} ${className}`} src={GAME_ART[gameId].src} alt={decorative ? '' : translate(`games.${gameId}.name`, language)} draggable={false} loading={variant === 'hero' ? 'eager' : 'lazy'}/>;
}
export function GameLogo({ gameId, language: forcedLanguage, className = '' }: { gameId: GameId; language?: Language; className?: string }) {
  const personal = useI18n();
  return <span className={`game-logo game-logo-${gameId} ${className}`}>{translate(`games.${gameId}.name`, forcedLanguage || personal.language)}</span>;
}
