import fr from './locales/fr.json';
import en from './locales/en.json';
import type { GameId, RoomSnapshot } from '@en-vrille/shared';
import type { Language } from '../i18n';
const dictionaries = { fr, en };
export function showText(language: Language, key: string, params: Record<string, string | number> = {}) {
  const value = (dictionaries[language] as Record<string,unknown>)[key] ?? (fr as Record<string,unknown>)[key];
  return String(typeof value === 'string' ? value : key).replace(/\{(\w+)\}/g, (whole, name: string) => String(params[name] ?? whole));
}
export function ruleCards(room: RoomSnapshot) {
  const lang = room.config.language || 'fr', id = room.round?.gameId || room.playlist[room.gameIndex]?.gameId || 'mythos';
  return dictionaries[lang].rules[id as GameId].map((card,index) => ({title:card.title,text:(index===5&&(room.config.noPoints||(id==='who'&&room.config.whoNoPoints))?showText(lang,'rules.noPoints'):card.text+(index===5?' '+showText(lang,'rules.balance'):'')).replace(/\{answer\}/g,String(room.config.answerSeconds)).replace(/\{vote\}/g,String(room.config.voteSeconds))}));
}
