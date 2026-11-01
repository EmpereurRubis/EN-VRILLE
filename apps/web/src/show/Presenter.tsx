export type PresenterExpression = 'happy' | 'surprised' | 'mocking' | 'impatient' | 'disappointed' | 'enthusiastic' | 'suspense' | 'victory';
export function Presenter({ expression = 'happy', className = '' }: { expression?: PresenterExpression; className?: string }) {
  const wide = expression === 'surprised' || expression === 'suspense';
  const wink = expression === 'mocking' || expression === 'victory';
  return <svg viewBox="0 0 340 370" className={`show-presenter expression-${expression} ${className}`} role="img" aria-label={`Vrill, le présentateur : ${{ happy: 'joyeux', surprised: 'surpris', mocking: 'malicieux', impatient: 'impatient', disappointed: 'déçu', enthusiastic: 'enthousiaste', suspense: 'suspense', victory: 'victorieux' }[expression]}`}>
    <ellipse className="presenter-shadow" cx="172" cy="344" rx="92" ry="11" fill="#000" opacity=".22"/>
    <g className="presenter-body">
      <path d="m111 257-22 63-27 3m157-69 25 66 28 3" stroke="#161417" strokeWidth="19" strokeLinecap="round" fill="none"/>
      <path d="m94 173-44 21-14-31m214 8 44-26 7-35" stroke="#161417" strokeWidth="16" strokeLinecap="round" fill="none"/>
      <path d="m285 109 16-5 11 14m-287 44 11-9 12 10" stroke="#fff0df" strokeWidth="16" strokeLinecap="round" fill="none"/>
      <path d="M142 38c7-24 34-26 43-2l16 43 45 3c27 2 37 28 23 46l-26 35 15 52c7 23-8 45-32 45l-48-1-36 31c-19 16-45 6-48-18l-7-42-34-24c-22-15-21-42 2-55l35-20 8-48c4-22 25-31 45-19l18 11" fill="#ee3448" stroke="#151416" strokeWidth="7" strokeLinejoin="round"/>
      <path d="m126 56 19 14m59 31 28 1" stroke="#ff8892" strokeWidth="7" strokeLinecap="round"/>
      <g className="presenter-eyes">
        <ellipse cx="137" cy="149" rx="24" ry={wide ? 35 : 30} fill="#fff3de" stroke="#171518" strokeWidth="5"/>
        {wink ? <path d="m174 145 13-9 13 10" stroke="#171518" strokeWidth="7" strokeLinecap="round" fill="none"/> : <ellipse cx="190" cy="145" rx="24" ry={wide ? 35 : 30} fill="#fff3de" stroke="#171518" strokeWidth="5"/>}
        <ellipse cx={expression === 'impatient' ? 127 : 143} cy="151" rx="7" ry={wide ? 12 : 10} fill="#171518"/>
        {!wink && <ellipse cx={expression === 'impatient' ? 181 : 195} cy="148" rx="7" ry={wide ? 12 : 10} fill="#171518"/>}
        {expression === 'impatient' && <path d="m112 123 46 8m12-4 43-13" stroke="#171518" strokeWidth="7" strokeLinecap="round"/>}
        {expression === 'disappointed' && <path d="m112 116 43-12m18 1 40 11" stroke="#171518" strokeWidth="7" strokeLinecap="round"/>}
      </g>
      {wide ? <ellipse cx="165" cy="207" rx="15" ry="21" fill="#171518"/> : expression === 'disappointed' ? <path d="M140 218q25-25 48-3" stroke="#171518" strokeWidth="6" strokeLinecap="round" fill="none"/> : expression === 'impatient' ? <path d="m145 209 38-3" stroke="#171518" strokeWidth="6" strokeLinecap="round"/> : <path d="M133 199q31 53 65-6-32 11-65 6" stroke="#171518" strokeWidth="5" fill="#171518" strokeLinejoin="round"/>}
      {!wide && expression !== 'disappointed' && expression !== 'impatient' && <path d="m145 205 40-4" stroke="#fff3de" strokeWidth="7" strokeLinecap="round"/>}
      <path d="m140 260 24-18 16 16 17-17 19 17" stroke="#171518" strokeWidth="7" fill="none" strokeLinejoin="round"/>
      <path d="m164 244 15 12-3 22-16-5Z" fill="#171518"/>
    </g>
    {(expression === 'victory' || expression === 'enthusiastic') && <g className="presenter-sparks" fill="#ffd76d"><path d="m54 59 5 15 16 2-12 10 3 16-13-8-14 8 4-16-12-11 16-1Z"/><path d="m272 38 5 14 15 2-12 9 4 15-13-8-12 8 3-15-11-10 15-1Z"/></g>}
    {expression === 'suspense' && <path d="m267 74 4-23m-17 29-8-18m33 31 17-13" stroke="#ffdb72" strokeWidth="5" strokeLinecap="round"/>}
  </svg>;
}
