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
  return dictionaries[lang].rules[id as GameId].map((card,index) => {
    const untimed=(!room.config.answerSeconds&&card.text.includes('{answer}'))||(!room.config.voteSeconds&&card.text.includes('{vote}'));
    let description=index===5&&(room.config.noPoints||(id==='who'&&room.config.whoNoPoints))?showText(lang,'rules.noPoints'):card.text+(index===5?' '+showText(lang,'rules.balance'):'');
    if(!room.config.answerSeconds)description=description.replace(/Vous avez \{answer\} secondes\./g,'Prenez votre temps : aucune limite.').replace(/You have \{answer\} seconds\./g,'Take your time: there is no time limit.');
    if(!room.config.voteSeconds)description=description.replace(/en \{vote\} secondes/g,'sans limite de temps').replace(/in \{vote\} seconds/g,'without a time limit').replace(/Vous avez \{vote\} secondes\./g,'Le vote est sans limite de temps.').replace(/You have \{vote\} seconds\./g,'Voting has no time limit.');
    return {title:untimed?(lang==='fr'?'À votre rythme':'Take your time'):card.title,text:description.replace(/\{answer\}/g,String(room.config.answerSeconds)).replace(/\{vote\}/g,String(room.config.voteSeconds))};
  });
}
