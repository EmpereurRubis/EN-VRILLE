/**
 * Artwork source: original EN VRILLE vector illustrations, dedicated to CC0-1.0.
 * No photographs, external fonts, stock assets or remote resources are used.
 * Run `node packages/content/scripts/create-media.mjs` from the repository root.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const destination = fileURLToPath(new URL("../media/", import.meta.url));
mkdirSync(destination, { recursive: true });
const ink = "#28223e";
const p = {
  violet: "#aa8bff",
  lavender: "#e1d5ff",
  pink: "#ffa0bf",
  mint: "#9ce6c3",
  yellow: "#ffd56c",
  peach: "#ffb48b",
  blue: "#8bd5ed",
  cream: "#fff7e6",
  ink,
};
const attr = (fill, stroke = ink, sw = 5) =>
  `fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`;
const path = (d, fill = "none", sw = 5, stroke = ink) =>
  `<path d="${d}" ${attr(fill, stroke, sw)}/>`;
const ellipse = (x, y, rx, ry, fill, sw = 5) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${attr(fill, ink, sw)}/>`;
const circle = (x, y, r, fill, sw = 5) => ellipse(x, y, r, r, fill, sw);
const rect = (x, y, w, h, fill, radius = 12, sw = 5) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ${attr(fill, ink, sw)}/>`;
const line = (x1, y1, x2, y2, stroke = ink, sw = 5) =>
  `<path d="M${x1} ${y1}L${x2} ${y2}" ${attr("none", stroke, sw)}/>`;
const group = (x, y, scale, drawing, rotation = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})">${drawing}</g>`;
function face(x, y, size = 1, mood = "happy") {
  const mouth =
    mood === "shock"
      ? ellipse(0, 24, 9, 13, ink, 0)
      : mood === "worry"
        ? path("M-17 25Q0 10 17 25", "none", 4)
        : mood === "flat"
          ? line(-13, 22, 13, 22, ink, 4)
          : path("M-18 16Q0 40 18 16", "none", 4);
  return group(
    x,
    y,
    size,
    `${ellipse(-20, 0, 4, 7, ink, 0)}${ellipse(20, 0, 4, 7, ink, 0)}${mouth}${mood === "worry" ? path("M-31 -13L-13 -20M13 -20L31 -13", "none", 4) : ""}${ellipse(-33, 15, 10, 5, "#f58fa8", 0)}${ellipse(33, 15, 10, 5, "#f58fa8", 0)}`,
  );
}
const sweat = (x, y, s = 1) =>
  group(x, y, s, path("M0 -17C-20 7-13 23 0 23S20 7 0 -17", p.blue, 3));
function stars() {
  return [
    [130, 75],
    [735, 55],
    [845, 145],
    [70, 245],
    [600, 95],
  ]
    .map(([x, y]) =>
      path(`M${x - 8} ${y}h16M${x} ${y - 8}v16`, "none", 3, "#ffffff"),
    )
    .join("");
}
function room(wall = p.lavender, floor = "#c6b4ef") {
  return `${rect(-5, -5, 970, 610, wall, 0, 0)}${path("M0 430H960V600H0Z", floor, 0)}${line(0, 430, 960, 430, ink, 4)}`;
}
function frame(x, y, w, h, body, fill = p.cream) {
  return `${rect(x, y, w, h, fill, 10)}${body}`;
}
function plant(x, y, s = 1) {
  return group(
    x,
    y,
    s,
    `${path("M-28 0Q-88 -70-48 -88Q-8 -80 0 -25M5 -5Q20 -105 62 -100Q83 -50 5 -5", p.mint)}${line(0, 20, 0, -55)}${path("M-43 6H43L30 71H-30Z", p.peach)}`,
  );
}
function pigeon(x, y, s = 1, facing = 1, tie = false) {
  const draw = `${path("M-55 30Q-80 -15-55 -55Q-39 -73-12 -48Q20 -89 43 -54Q72 -14 49 37Q27 77-25 64Z", "#a7a6c8")}${ellipse(-16, 28, 36, 35, "#9292b6")}${path("M34 -24L74 -13L36 0", p.yellow)}${circle(24, -31, 5, ink, 0)}${path("M0 -29Q10 -25 17 -23", "none", 4)}${line(-20, 63, -21, 82, p.peach, 7)}${line(15, 63, 16, 82, p.peach, 7)}${path("M-33 83h25M5 83h25", "none", 5)}${tie ? path("M5 0l13 14-7 33-17-28Z", p.pink, 3) : ""}`;
  return `<g transform="translate(${x} ${y}) scale(${s * facing} ${s})">${draw}</g>`;
}
function frog(x, y, s = 1) {
  return group(
    x,
    y,
    s,
    `${ellipse(0, 40, 75, 70, p.mint)}${circle(-42, -24, 28, p.mint)}${circle(42, -24, 28, p.mint)}${ellipse(0, 2, 76, 46, p.mint)}${circle(-42, -28, 9, p.cream, 3)}${circle(42, -28, 9, p.cream, 3)}${circle(-40, -27, 4, ink, 0)}${circle(40, -27, 4, ink, 0)}${path("M-34 10Q0 44 34 10", "none", 4)}${path("M-62 40L-17 28L0 72L20 28L64 43L53 110H-53Z", "#53517e")}${path("M-15 30L0 47L17 31L10 66H-6Z", p.yellow, 3)}`,
  );
}
function duck(x, y, s = 1, flip = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s * flip} ${s})">${ellipse(0, 32, 60, 45, p.yellow)}${circle(20, -23, 39, p.yellow)}${path("M47 -23L91 -13L49 1Z", p.peach)}${circle(28, -35, 5, ink, 0)}${path("M-36 20Q-4 -3 15 32Q-8 57-36 20", "#ffbc5c")}${path("M-20 77v14m-13 0h25M20 77v14m-13 0h25", "none", 5)}</g>`;
}
function cat(x, y, s = 1, color = p.peach, mood = "happy") {
  return group(
    x,
    y,
    s,
    `${ellipse(0, 56, 50, 62, color)}${path("M-49 3L-54 -64L-21 -42Q0 -54 23 -42L55 -63L50 5Q36 48 0 46Q-38 44-49 3Z", color)}${face(0, -7, 0.75, mood)}${path("M-44 12h-31M44 12h31M-44 23l-30 7M44 23l30 7", "none", 3)}${path("M41 84Q105 65 80 28", "none", 15, color)}${path("M-34 113h25M11 113h25", "none", 8)}`,
  );
}
function alien(x, y, s = 1, color = p.mint, mood = "shock") {
  return group(
    x,
    y,
    s,
    `${ellipse(0, 65, 52, 58, "#68658e")}${ellipse(0, 0, 61, 56, color)}${ellipse(-24, -7, 12, 20, ink, 0)}${ellipse(24, -7, 12, 20, ink, 0)}${mood === "shock" ? ellipse(0, 29, 10, 12, ink, 0) : path("M-17 24Q0 41 17 24", "none", 4)}${line(-26, -51, -42, -75)}${line(26, -51, 42, -75)}${circle(-44, -78, 8, color, 3)}${circle(44, -78, 8, color, 3)}`,
  );
}
function bunny(x, y, s = 1) {
  return group(
    x,
    y,
    s,
    `${ellipse(0, 64, 52, 60, p.cream)}${ellipse(-23, -62, 15, 47, p.cream)}${ellipse(23, -62, 15, 47, p.cream)}${ellipse(-23, -66, 5, 26, p.pink, 0)}${ellipse(23, -66, 5, 26, p.pink, 0)}${ellipse(0, 0, 52, 47, p.cream)}${face(0, -5, 0.65)}${path("M-42 52L0 92L42 52L43 122H-43Z", "#73749b")}`,
  );
}
function table(x, y, w, h = 55) {
  return `${rect(x, y, w, h, p.peach, 16)}${path(`M${x + 25} ${y + h}v115M${x + w - 25} ${y + h}v115`, "none", 12)}`;
}
function paper(x, y, w, h, rotation = 0) {
  return group(
    x,
    y,
    1,
    `${rect(0, 0, w, h, p.cream, 4, 3)}${[0.24, 0.4, 0.56, 0.72].map((t) => line(w * 0.18, h * t, w * 0.82, h * t, "#888099", 3)).join("")}`,
    rotation,
  );
}
function scene(title, body, note) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600" role="img" aria-labelledby="title desc"><title id="title">${title}</title><desc id="desc">${note}</desc><metadata>Original artwork by Projet EN VRILLE. CC0-1.0. Created specifically for EN VRILLE. No third-party media.</metadata><defs><filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="0" flood-color="#28223e" flood-opacity="0.12"/></filter><pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2" fill="#ffffff" opacity=".14"/></pattern></defs>${body}<rect width="960" height="600" fill="url(#dots)" pointer-events="none"/><rect x="12" y="12" width="936" height="576" rx="24" fill="none" stroke="#28223e" stroke-opacity=".12" stroke-width="3"/></svg>`;
}

const scenes = [
  [
    "Conseil des pigeons",
    `${room()}${frame(330, 60, 360, 190, `${line(370, 215, 370, 100)}${line(370, 215, 645, 215)}${path("M386 196L449 182L490 191L544 137L621 99", "none", 8, p.violet)}${path("M598 100h25v25", "none", 7, p.violet)}${[420, 470, 530, 590].map((x, i) => ellipse(x, 105 + (i % 2) * 15, 7, 4, p.yellow, 2)).join("")}`)}${pigeon(215, 340, 1.35, 1, true)}${pigeon(770, 350, 1.25, -1, true)}${pigeon(500, 300, 0.9, 1, true)}${table(180, 402, 610, 65)}${rect(386, 327, 140, 87, "#7f7b9e", 8)}${circle(456, 367, 13, p.cream, 3)}${path("M369 418h174l-18 12H385Z", p.lavender, 3)}${ellipse(659, 410, 48, 13, p.cream, 3)}${circle(641, 404, 9, p.yellow, 2)}${circle(665, 407, 10, p.yellow, 2)}${paper(245, 413, 73, 44, -6)}`,
    "Trois pigeons en cravate entourent une table de réunion et un graphique de miettes en hausse.",
  ],

  [
    "Laverie orbitale",
    `${room("#333353", "#666184")}${circle(775, 134, 79, "#181e3d")}${circle(799, 111, 34, p.yellow, 0)}${stars()}${rect(88, 224, 244, 292, p.cream, 20)}${rect(115, 248, 190, 42, p.lavender, 5)}${[140, 170, 200].map((x) => circle(x, 269, 6, p.violet, 2)).join("")}${circle(210, 391, 84, "#8984a5")}${circle(210, 391, 64, "#32375d")}${path("M161 390Q180 342 231 372Q261 406 210 431Q162 443 161 390", p.blue, 3)}${circle(200, 393, 20, p.pink, 3)}${group(540, 309, 1.1, `${rect(-63, 37, 126, 160, p.cream, 24)}${ellipse(0, 0, 88, 87, p.cream)}${ellipse(0, 0, 65, 57, "#62658d")}${face(0, -4, 0.9, "worry")}${rect(-35, 90, 70, 48, p.blue, 8, 3)}${line(-44, 190, -50, 221)}${line(44, 190, 50, 221)}${path("M-61 76L-114 21M61 76l63-20", "none", 25, p.cream)}${path("M-128 0l31-2 10 40-24 6-14-18Z", p.pink, 4)}`)}${sweat(635, 296, 0.7)}${group(770, 300, 1, `${path("M0 0h42v65h-63v-25H0Z", p.mint)}${circle(12, 19, 5, p.violet, 0)}`, -24)}${group(376, 117, 0.8, path("M0 0h42v65h-63v-25H0Z", p.yellow), 27)}`,
    "Un astronaute inquiet tient une chaussette devant une machine à laver contenant une petite galaxie.",
  ],

  [
    "La grenouille du trimestre",
    `${room("#c9e8d4", "#8bbeac")}${frame(555, 65, 300, 190, `${line(590, 220, 590, 107)}${path("M611 195L663 178L710 191L799 112", "none", 8, "#629e8b")}${[626, 686, 759].map((x, i) => `${ellipse(x, 114 + i * 13, 9, 5, "#73749b", 2)}${line(x - 2, 110, x - 7, 102, "#73749b", 2)}${line(x + 2, 110, x + 7, 102, "#73749b", 2)}`).join("")}`)}${rect(312, 198, 265, 264, "#67658b", 32)}${frog(448, 302, 1.4)}${table(220, 431, 530, 64)}${paper(296, 441, 113, 48, -5)}${rect(570, 370, 59, 66, p.cream, 6)}${path("M629 389Q663 385 654 409Q644 425 630 416", "none", 5)}${ellipse(85, 504, 72, 23, "#79b99d", 4)}${path("M55 497L87 506L99 484", "#9ed4aa", 3)}${plant(836, 413, 0.8)}${line(394, 431, 343, 406, p.mint, 18)}${line(515, 431, 564, 400, p.mint, 18)}`,
    "Une grenouille en costume dirige une réunion depuis un fauteuil immense, devant un graphique de mouches.",
  ],

  [
    "Entretien vitaminé",
    `${room("#ffe6c1", "#f5bb92")}${frame(77, 66, 218, 145, `${circle(184, 131, 41, p.yellow, 3)}${path("M169 119l15 27 15-27", "none", 6, p.cream)}`)}${bunny(708, 315, 1.1)}${rect(184, 335, 177, 158, p.violet, 21)}${path("M212 280Q274 234 326 287L284 453Q273 482 255 450Z", p.peach)}${path("M248 276Q208 199 238 177Q264 209 267 259Q271 181 303 178Q319 214 282 266Q324 208 348 233Q336 267 291 281", p.mint)}${face(273, 322, 0.65, "worry")}${sweat(334, 328, 0.6)}${line(230, 451, 206, 486)}${line(280, 451, 300, 486)}${rect(132, 459, 72, 53, "#8a6188", 5)}${path("M151 459v-13h29v13", "none", 4)}${table(448, 393, 403, 55)}${paper(512, 400, 104, 44, 4)}${rect(759, 346, 15, 48, p.blue, 3, 3)}${ellipse(766, 344, 20, 7, p.blue, 3)}${line(710, 398, 654, 376, p.cream, 18)}`,
    "Une carotte nerveuse et son attaché-case font face à un recruteur lapin derrière son bureau.",
  ],

  [
    "La caisse de l’au-delà",
    `${room("#d5d9ff", "#a7add6")}${rect(558, 142, 250, 310, p.mint, 20)}${rect(590, 176, 186, 122, "#595a82", 9)}${path("M642 241l27 21 50-53", "none", 10, p.mint)}${rect(610, 324, 147, 33, "#797691", 4)}${path("M670 356v145l18-12 15 12 16-14 16 14V356", p.cream, 3)}${[380, 401, 424, 450].map((y) => line(680, y, 724, y, "#9992ad", 3)).join("")}${path("M179 420V274Q179 184 261 186Q345 185 345 274V422L317 401L289 422L262 402L234 424L208 405Z", p.cream)}${face(263, 264, 0.9, "shock")}${line(333, 322, 434, 343, p.cream, 22)}${path("M394 343Q409 315 438 341Q444 372 399 363Z", p.yellow)}${rect(85, 381, 101, 113, p.blue, 8)}${path("M99 381v-33h73v33", "none", 6)}${path("M117 380l-5-45M134 380l10-51M153 381l15-37", "none", 11, p.mint)}${circle(845, 485, 27, p.peach, 3)}${line(845, 470, 845, 485, ink, 3)}${line(845, 485, 853, 491, ink, 3)}`,
    "Un fantôme interloqué essaie de scanner une banane. Une caisse automatique imprime un reçu démesuré.",
  ],

  [
    "Poulpe en visioconférence",
    `${room("#c6e5f4", "#95bdcf")}${frame(
      90,
      70,
      315,
      210,
      `${[0, 1, 2, 3, 4, 5]
        .map((n) => {
          const x = 108 + (n % 3) * 96,
            y = 88 + Math.floor(n / 3) * 88;
          return `${rect(x, y, 84, 77, n === 4 ? p.pink : p.lavender, 7, 2)}${circle(x + 42, y + 28, 15, n === 4 ? p.yellow : p.cream, 2)}${path(`M${x + 20} ${y + 66}q22-33 44 0`, n === 4 ? p.yellow : p.cream, 2)}`;
        })
        .join("")}`,
    )}${ellipse(638, 306, 106, 91, p.pink)}${face(638, 305, 1, "worry")}${sweat(753, 299, 0.7)}${["M573 350Q510 280 440 335Q410 350 420 380", "M573 360Q470 350 450 420Q410 445 390 415", "M573 370Q500 430 450 435Q430 465 400 455", "M573 380Q560 470 520 486Q480 490 500 462", "M703 350Q760 285 800 315Q830 360 800 369", "M703 360Q825 360 840 408Q860 440 835 450", "M703 370Q780 420 770 442Q750 464 730 452", "M703 380Q720 480 690 490Q670 490 665 468"].map((d) => path(d, "none", 27) + path(d, "none", 18, p.pink)).join("")}${table(95, 460, 755, 42)}${rect(283, 421, 228, 35, p.cream, 6)}${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => line(300 + i * 27, 429, 300 + i * 27, 449, "#aaa2b6", 3)).join("")}${rect(737, 400, 48, 57, p.yellow, 5)}${path("M785 411q35-2 29 24q-5 19-29 12", "none", 5)}${group(487, 401, 1, `${rect(-20, -39, 40, 70, p.violet, 7)}${circle(0, 22, 3, p.cream, 0)}`, 17)}`,
    "Un poulpe débordé manipule un clavier, un téléphone et une tasse sous une mosaïque de visioconférence.",
  ],

  [
    "Chauffage de dragon",
    `${room("#ffe0d3", "#dbaa9c")}${rect(77, 81, 172, 150, p.blue, 12)}${line(163, 84, 163, 229)}${line(80, 155, 245, 155)}${path("M94 198l25-30 32 30M175 132l19-24 29 24", "none", 4, p.cream)}${group(364, 319, 1.35, `${path("M-54 85Q-115 60-93-19L-46 13L-26-62L7-20Q68-48 76 3Q128 20 88 50L70 97Z", p.mint)}${path("M-52 20L-95-25L-111 27L-81 59Z", p.violet)}${path("M-18-41L-28-77L5-53M25-29L38-64L52-30", p.yellow)}${circle(46, 4, 6, ink, 0)}${path("M31 -9L56-16", "none", 4)}${path("M54 50Q66 41 80 44", "none", 4)}${path("M-54 103l-24 21M31 99l25 20", "none", 16, p.mint)}`)}${path("M468 343Q496 312 484 295Q519 307 508 335Q535 318 528 307Q569 346 528 370Z", p.peach)}${table(524, 399, 310, 53)}${paper(603, 278, 116, 233, -6)}${path("M628 456l16 8 16-9 16 8 16-8", "none", 3, p.ink)}${rect(751, 357, 57, 44, p.violet, 6)}${[0, 1, 2].map((i) => circle(765 + i * 14, 379, 3, p.cream, 0)).join("")}${sweat(497, 282, 0.8)}`,
    "Un dragon souffle une petite flamme de panique en découvrant une facture de chauffage interminable.",
  ],

  [
    "Excès de lenteur",
    `${room("#c4e9e7", "#a7caae")}${path("M0 432L960 356V600H0Z", "#8588a4", 0)}${path("M0 536L960 460", "none", 7, p.cream)}${path("M80 528l90-7M315 509l90-7M550 490l90-7M785 472l90-7", "none", 10, p.yellow)}${rect(714, 82, 151, 114, p.cream, 12)}${circle(789, 139, 42, p.cream, 7)}${line(789, 111, 789, 140, ink, 6)}${line(789, 140, 808, 148, ink, 6)}${line(788, 198, 788, 360, ink, 8)}${group(353, 395, 1.3, `${path("M-98 14Q-60 4-15 10L54 2Q66-38 86-34Q105-30 101 10Q155 28 114 48H-86Z", p.mint)}${circle(-12, -24, 62, p.peach)}${path("M-8-62Q-58-67-49-20Q-39 13-4 4Q24-4 6-24Q-11-37-20-18", "none", 5)}${line(79, -30, 74, -60)}${line(99, -25, 111, -56)}${circle(73, -62, 7, p.cream, 3)}${circle(112, -58, 7, p.cream, 3)}${circle(74, -62, 2, ink, 0)}${circle(111, -58, 2, ink, 0)}${path("M58 21Q76 35 90 20", "none", 4)}`)}${pigeon(720, 337, 1.3, -1, true)}${path("M661 309l-51-17-13 20 53 27Z", "#646786", 4)}${paper(602, 368, 44, 60, 15)}${path("M314 447l-35 5M278 428l-50 7", "none", 4, p.cream)}`,
    "Un pigeon policier dirige un radar vers un escargot souriant sur une route déserte.",
  ],

  [
    "Livraison de gâteau",
    `${room("#ffe5bd", "#dec19c")}${[0, 1, 2, 3, 4, 5, 6].map((i) => path(`M${80 + i * 125} 91l34 47 34-47`, [p.violet, p.pink, p.mint][i % 3], 3)).join("")}${group(276, 336, 1, `${rect(-65, -80, 130, 114, p.blue, 17)}${rect(-55, 44, 110, 127, "#9caec7", 14)}${line(-16, -80, -16, -109)}${circle(-16, -116, 10, p.pink, 3)}${circle(-27, -34, 13, p.cream, 3)}${circle(28, -34, 13, p.cream, 3)}${circle(-27, -34, 4, ink, 0)}${circle(28, -34, 4, ink, 0)}${path("M-24 6h48", "none", 5)}${line(55, 85, 134, 106, p.blue, 24)}${line(-55, 85, -94, 122, p.blue, 24)}${line(-29, 170, -29, 196, ink, 16)}${line(29, 170, 29, 196, ink, 16)}${circle(0, 102, 17, p.yellow, 3)}`)}${rect(393, 470, 287, 28, "#787391", 8)}${circle(425, 523, 20, "#67607d", 4)}${circle(647, 523, 20, "#67607d", 4)}${path("M421 498v25M650 498v25", "none", 7)}${rect(416, 370, 245, 100, p.pink, 13)}${path("M418 389Q439 420 457 392Q477 426 498 391Q520 423 539 392Q560 422 580 391Q600 419 620 392Q641 422 660 389", p.cream, 3)}${rect(453, 282, 170, 88, p.mint, 12)}${rect(479, 205, 117, 77, p.violet, 12)}${rect(510, 153, 57, 52, p.yellow, 8)}${path("M539 153v-27", "none", 5)}${path("M538 125Q514 107 537 90Q561 111 538 125", p.peach, 3)}${cat(808, 385, 0.95, p.peach, "shock")}${sweat(851, 359, 0.7)}${path("M414 369l232 0", "none", 3)}`,
    "Un robot transporte un gâteau de cinq étages. Un chat invité observe la tour avec une peur très raisonnable.",
  ],

  [
    "Permis de balai",
    `${room("#d6dbfa", "#a1b8ce")}${path("M0 368Q480 271 960 368V600H0Z", "#8bbea9", 0)}${[160, 390, 670].map((x, i) => `${path(`M${x} ${480 - i * 30}l24-66 24 66Z`, p.peach)}${line(x + 11, 455 - i * 30, x + 37, 455 - i * 30, p.cream, 7)}`).join("")}${group(416, 239, 1, `${path("M-89 89L22 0L80 111Z", "#737093")}${circle(0, -10, 43, p.peach)}${face(0, -15, 0.65, "worry")}${path("M-57-40L-3-143L48-38Z", p.violet)}${ellipse(-3, -41, 77, 13, p.violet)}${path("M-40 67l-26 52 78 15", "none", 17, p.peach)}${path("M-33 116l-45 63M12 131l37 50", "none", 16, "#5a577a")}`)}${path("M219 403L622 288", "none", 12, "#a97563")}${path("M166 375L243 363L270 418L193 454Z", p.yellow)}${path("M186 391l63-9M195 411l61-12M207 432l55-16", "none", 3, "#b28e5b")}${path("M114 256q78-50 153-10", "none", 4, p.cream)}${group(782, 347, 1.1, `${ellipse(0, 29, 58, 66, p.cream)}${path("M-48-10L-55-73L-16-47L17-47L55-73L48-10Z", "#aba0bb")}${circle(-23, -13, 22, p.cream, 4)}${circle(23, -13, 22, p.cream, 4)}${circle(-23, -13, 8, ink, 0)}${circle(23, -13, 8, ink, 0)}${path("M-11 9L0 27L11 9Z", p.yellow, 3)}${rect(-46, 70, 92, 68, p.peach, 6)}${path("M-29 94l14 13 33-27", "none", 5)}`)}`,
    "Une sorcière avec casque de protection slalome en balai entre des cônes, sous le regard d’un moniteur hibou.",
  ],

  [
    "Raclette du troisième type",
    `${room("#2d3155", "#686184")}${circle(472, 119, 71, "#151c37")}${circle(491, 113, 37, p.blue, 0)}${stars()}${alien(194, 308, 1.3, p.mint, "shock")}${alien(775, 308, 1.2, p.blue, "shock")}${table(286, 401, 390, 57)}${rect(371, 348, 219, 50, "#5d526e", 10)}${rect(389, 325, 182, 23, p.cream, 8)}${[0, 1, 2].map((i) => `${path(`M${428 + i * 42} 317q-20-28 0-48q16-17 0-35`, "none", 4, p.cream)}${ellipse(412 + i * 59, 366, 19, 5, p.yellow, 2)}`).join("")}${line(270, 380, 383, 363, p.mint, 16)}${line(686, 373, 598, 345, p.blue, 16)}${path("M600 346Q570 400 540 439", "none", 6, p.yellow)}${path("M544 439Q553 407 575 399", "none", 4, p.yellow)}${ellipse(332, 431, 37, 12, p.cream, 3)}${ellipse(634, 435, 37, 12, p.cream, 3)}${circle(320, 426, 10, p.yellow, 2)}${circle(340, 429, 9, p.yellow, 2)}${sweat(856, 280, 0.7)}`,
    "Deux extraterrestres découvrent un appareil à raclette et suivent du regard un fil de fromage interminable.",
  ],

  [
    "Inauguration féline",
    `${room("#ffe7c8", "#cdbbb2")}${path("M0 428h960", "none", 5)}${rect(349, 372, 247, 145, "#b2a9b8", 8)}${rect(323, 355, 299, 34, "#ccc3cc", 7)}${cat(471, 227, 1.22, "#aaa0ba", "flat")}${path("M425 136l-12-47 34 22 23-35 21 35 36-22-12 47Z", p.yellow)}${rect(388, 431, 167, 49, "#d8d1dd", 6, 3)}${path("M414 456h114", "none", 5, "#aaa0ba")}${cat(174, 379, 0.85, p.peach)}${path("M134 405l83-18", "none", 13, p.pink)}${cat(784, 382, 0.85, p.cream)}${path("M754 400l73 25", "none", 13, p.violet)}${path("M201 426Q388 378 471 423Q625 474 754 427", "none", 14, p.pink)}${path("M456 416l30 31M485 416l-30 31", "none", 4)}${[120, 246, 684, 833].map((x, i) => `${path(`M${x} ${96 + (i % 2) * 30}l10 19-14 12`, "none", 5, [p.pink, p.violet, p.mint, p.yellow][i])}`).join("")}`,
    "Deux chats inaugurent une grande statue de chat couronné. Le ruban rose traverse le piédestal.",
  ],

  [
    "Coupe épineuse",
    `${room("#f6d4e6", "#d0acc8")}${frame(108, 60, 310, 274, `${rect(127, 78, 271, 236, "#b9dce5", 11, 3)}${path("M149 120l68-23M303 302l65-24", "none", 10, p.cream)}`)}${rect(200, 335, 194, 111, p.violet, 22)}${line(297, 447, 297, 521, ink, 14)}${line(237, 521, 356, 521, ink, 13)}${group(294, 284, 1, `${path("M-39 105V-58Q-39-104 0-104Q41-103 41-58V20H57V-18Q57-43 79-43Q101-43 101-17V38Q101 67 40 67V105Z", p.mint)}${path("M-40 39H-74Q-101 39-101 7V-29Q-101-54-79-54Q-57-54-57-29V-3H-40", p.mint)}${face(0, -36, 0.65, "flat")}${[-22, 20].flatMap((x) => [-70, -5, 54].map((y) => line(x, y, x + 8, y - 10, "#568a77", 3))).join("")}${path("M-52 105H54L41 167H-39Z", p.peach)}`)}${bunny(697, 326, 1.14)}${line(654, 388, 530, 300, p.cream, 18)}${circle(518, 282, 13, p.lavender, 3)}${circle(534, 302, 13, p.lavender, 3)}${path("M528 293l37-27M528 293l6-43", "none", 4)}${sweat(767, 307, 0.8)}${rect(744, 456, 105, 17, p.cream, 5)}${line(766, 447, 766, 409, ink, 3)}${line(791, 447, 791, 409, ink, 3)}`,
    "Un cactus assis devant un miroir attend sa coupe. Un coiffeur lapin hésite avec ses ciseaux.",
  ],

  [
    "Sauveteur en sursis",
    `${room("#bae4f2", "#e9d1a9")}${circle(793, 99, 48, p.yellow, 4)}${[
      0, 1, 2, 3, 4, 5, 6, 7,
    ]
      .map((i) => {
        const a = (i * Math.PI) / 4;
        return line(
          793 + Math.cos(a) * 65,
          99 + Math.sin(a) * 65,
          793 + Math.cos(a) * 82,
          99 + Math.sin(a) * 82,
          p.yellow,
          5,
        );
      })
      .join(
        "",
      )}${path("M0 458Q300 426 560 460Q780 487 960 455V600H0Z", p.blue, 0)}${path("M15 509q45-25 90 0t90 0t90 0M621 538q45-25 90 0t90 0t90 0", "none", 4, p.cream)}${path("M330 499L364 254H525L566 499M347 397h203M358 318h177", "none", 10, "#8c7895")}${rect(345, 250, 199, 23, p.cream, 5)}${group(444, 204, 1, `${circle(0, 11, 58, p.cream)}${circle(0, -64, 43, p.cream)}${path("M-25-96q25-28 52 0", "none", 16, p.peach)}${circle(-16, -68, 4, ink, 0)}${circle(16, -68, 4, ink, 0)}${path("M-4-56l40 9-40 6Z", p.peach, 3)}${path("M-31-30Q0-8 27-29", "none", 4)}${[0, 1].map((i) => circle(0, 6 + i * 25, 4, ink, 0)).join("")}${path("M-38-2l-61 21M38-2l58 21", "none", 6, "#8d7b6b")}${path("M-42 42Q-63 71-49 84M33 44q19 21 8 32", "none", 6, p.blue)}`)}${ellipse(216, 463, 70, 23, p.pink, 4)}${ellipse(216, 460, 37, 11, p.blue, 3)}${duck(728, 433, 0.6, -1)}${sweat(506, 164, 0.7)}${rect(79, 343, 58, 62, p.peach, 5)}${line(107, 405, 107, 454, ink, 5)}`,
    "Un bonhomme de neige maître-nageur fond sur sa chaise au bord d’une piscine en plein soleil.",
  ],

  [
    "Négociation du croissant",
    `${room("#dce6d9", "#b9b5a5")}${frame(351, 56, 254, 128, `${path("M397 133q77-75 166 0q-66-26-166 0", p.yellow, 4)}${path("M432 110l14 14M468 99l9 20M510 103l-8 20", "none", 3)}`)}${duck(210, 328, 1.25, 1)}${duck(751, 328, 1.25, -1)}${path("M167 377l38 42 38-42", "none", 13, p.violet)}${path("M713 377l37 42 38-42", "none", 13, p.violet)}${table(298, 413, 367, 59)}${ellipse(483, 407, 80, 15, p.cream, 3)}${path("M419 393Q435 338 477 356Q519 336 546 393Q516 369 485 393Q449 368 419 393Z", p.yellow, 4)}${path("M449 362l8 18M482 355v23M516 361l-9 19", "none", 3)}${paper(351, 430, 61, 34, -9)}${paper(566, 429, 53, 36, 5)}${rect(142, 482, 83, 56, "#6b6387", 6)}${path("M161 480v-13h42v13", "none", 4)}${rect(740, 482, 83, 56, "#6b6387", 6)}${path("M759 480v-13h42v13", "none", 4)}`,
    "Deux canards cravatés, leurs mallettes au sol, négocient autour du dernier croissant.",
  ],

  [
    "Le grille-pain en scène",
    `${room("#302b49", "#6d4e75")}${path("M32 0Q170 203 94 416L0 505V0Z", "#a45b91", 5)}${path("M928 0Q790 203 866 416L960 505V0Z", "#a45b91", 5)}${path("M475 35L228 433H729L510 35Z", "#ffebac", 0)}${ellipse(477, 454, 232, 49, "#e7bc91", 0)}${group(461, 325, 1.3, `${rect(-83, -45, 166, 111, p.peach, 22)}${rect(-57, -65, 114, 23, "#5f5368", 10)}${path("M-42-65V-98Q-42-122 0-122Q44-122 44-98V-65Z", p.cream)}${path("M-30-80v-20Q0-119 32-100v20", "none", 4, "#d4ac7c")}${face(0, 5, 0.75)}${circle(60, 36, 8, p.violet, 3)}${path("M-81 6l-39-25M81 4l35-47", "none", 8, p.peach)}${line(-44, 67, -44, 89, ink, 7)}${line(44, 67, 44, 89, ink, 7)}`)}${line(632, 311, 632, 461, ink, 7)}${ellipse(632, 302, 16, 26, "#77728e", 4)}${ellipse(632, 465, 39, 8, "#5e5877", 4)}${[93, 191, 300, 421, 548, 674, 786, 890].map((x, i) => `${circle(x, 556 - (i % 2) * 11, 44, "#3a314c", 0)}${ellipse(x, 609, 60, 45, "#3a314c", 0)}`).join("")}${[185, 752, 680].map((x, i) => path(`M${x} ${150 + i * 44}l13-8 8 16`, "none", 4, p.yellow)).join("")}`,
    "Un grille-pain chante sous les projecteurs d’un théâtre. Deux tranches de pain dépassent de son dos.",
  ],

  [
    "Chevalier du meuble en kit",
    `${room("#e7e0f4", "#c3b3b0")}${path("M72 430V153l76-52 76 52v277", p.lavender, 4)}${path("M107 429V207q41-51 82 0v222", "#a9a2bd", 4)}${group(385, 338, 1.18, `${path("M-51 28L-61 117H58L46 24Z", "#a4aabe")}${rect(-51, -62, 102, 90, "#b9bfce", 20)}${rect(-51, -26, 102, 29, "#767b94", 8, 3)}${line(-25, -20, -25, -2, p.cream, 4)}${line(0, -20, 0, -2, p.cream, 4)}${line(25, -20, 25, -2, p.cream, 4)}${path("M3-63Q-6-109 32-115Q64-110 42-80", p.pink)}${line(-30, 117, -40, 155, ink, 15)}${line(32, 117, 41, 155, ink, 15)}${path("M-52 46l-49 49M48 47l75 10", "none", 20, "#a4aabe")}`)}${paper(514, 295, 147, 163, -13)}${path("M546 330l41-8 9 39-41 8ZM542 402l73-18M556 431l72-17", "none", 4, "#a8a0b4")}${path("M708 403l111 4-21-91-48-23-9 108M723 407l-12 107M810 409l31 106", "none", 12, p.peach)}${rect(652, 486, 154, 53, "#c49a78", 3)}${path("M667 486l21-39 82 0 20 39", "none", 4)}${line(101, 528, 199, 474, ink, 5)}${path("M94 531l-20 10 12 12 20-13Z", p.blue, 3)}${circle(592, 511, 10, p.violet, 3)}`,
    "Un chevalier en armure consulte une notice incompréhensible devant une chaise assemblée de travers.",
  ],

  [
    "Météo tropicale",
    `${room("#f8d9b1", "#c9a8a8")}${frame(355, 66, 502, 313, `${rect(375, 86, 462, 273, p.blue, 6, 0)}${path("M403 167l70-46 85 26 61 80-44 54-113-27-50-37Z", p.mint, 3)}${circle(689, 160, 39, p.yellow, 3)}${circle(777, 265, 31, p.yellow, 3)}${path("M659 294h37M677 277v35", "none", 5, p.cream)}${path("M746 125h37M765 107v35", "none", 5, p.cream)}`)}${group(212, 349, 1.2, `${ellipse(0, 24, 67, 108, "#45425e")}${ellipse(0, 49, 48, 75, p.cream)}${ellipse(0, -38, 53, 58, "#45425e")}${ellipse(-22, -39, 19, 24, p.cream, 0)}${ellipse(22, -39, 19, 24, p.cream, 0)}${circle(-20, -40, 5, ink, 0)}${circle(20, -40, 5, ink, 0)}${path("M-17-24L0-10L19-24Z", p.peach, 3)}${path("M-47 26Q-94 46-71 100M46 24l72-42", "none", 16, "#45425e")}${ellipse(-31, 135, 25, 10, p.peach, 3)}${ellipse(31, 135, 25, 10, p.peach, 3)}${path("M-8 5L8 5L18 61L1 79L-14 61Z", p.pink, 3)}`)}${line(344, 317, 493, 205, ink, 5)}${sweat(275, 304, 0.7)}${sweat(152, 333, 0.5)}${plant(865, 430, 0.85)}${rect(611, 432, 155, 75, p.cream, 8)}${path("M641 476q18-47 36 0q18-47 36 0q18-47 30 0", "none", 5, p.peach)}`,
    "Un pingouin en cravate transpire devant une carte météo où tous les soleils annoncent la canicule.",
  ],

  [
    "Sourire lunaire",
    `${room("#d3d9ee", "#a6b5ce")}${rect(88, 76, 187, 127, p.cream, 12)}${path("M132 112q-16 25 0 52l19-16 20 16q16-30-1-52q-19-10-38 0", p.blue, 3)}${rect(313, 390, 363, 75, p.mint, 24)}${path("M342 465l-14 69M632 465l20 69", "none", 11)}${rect(281, 259, 115, 167, p.mint, 22)}${group(410, 281, 1.05, `${path("M37-98Q-79-82-80 12Q-78 96 26 109Q-35 47-21-15Q-11-58 37-98Z", p.yellow)}${circle(-42, -19, 5, ink, 0)}${ellipse(-43, 35, 18, 25, p.cream, 3)}${path("M-59 35h32M-43 11v48", "none", 3)}${circle(-45, -62, 10, "#e4b652", 0)}${circle(-63, 8, 7, "#e4b652", 0)}`)}${alien(759, 338, 1, p.blue, "happy")}${path("M709 398l-95-69", "none", 17, p.blue)}${line(612, 332, 518, 300, ink, 5)}${ellipse(509, 295, 14, 10, p.cream, 3)}${path("M570 227L648 171L721 214", "none", 11, "#969ab2")}${ellipse(560, 235, 41, 18, p.cream, 4)}${path("M526 247l-43 70M572 251l-16 78", "none", 3, p.cream)}${rect(781, 450, 89, 45, p.cream, 8)}${line(823, 495, 823, 541, ink, 5)}${path("M793 469h65", "none", 4)}`,
    "Une lune en croissant, bouche ouverte, s’installe dans un fauteuil de dentiste tenu par un extraterrestre.",
  ],

  [
    "Baguette sous contrôle",
    `${room("#dae2ed", "#aebacb")}${rect(422, 105, 200, 360, p.violet, 8)}${rect(452, 136, 140, 329, "#d4e5e8", 3)}${circle(472, 122, 6, p.pink, 2)}${circle(497, 122, 6, p.yellow, 2)}${circle(523, 122, 6, p.mint, 2)}${path("M433 482H635", "none", 13, "#655d7f")}${group(515, 287, 1, `${rect(-30, -146, 60, 296, p.yellow, 29)}${[-85, -29, 27, 83].map((y) => path(`M-20 ${y + 16}l40-28`, "none", 7, p.peach)).join("")}${face(0, -8, 0.55, "worry")}${path("M-28 61l-55 24M28 61l55 24", "none", 8, p.yellow)}${line(-15, 147, -28, 170, ink, 6)}${line(15, 147, 28, 170, ink, 6)}`, -13)}${pigeon(765, 341, 1.2, -1, true)}${rect(714, 357, 35, 61, p.cream, 5)}${line(720, 371, 742, 371, ink, 3)}${line(720, 386, 742, 386, ink, 3)}${table(70, 410, 281, 48)}${rect(116, 362, 185, 49, "#85839e", 8)}${path("M125 363q80-55 165 0", p.cream, 4)}${rect(171, 338, 61, 27, p.yellow, 5)}${line(640, 186, 675, 171, p.pink, 5)}${line(645, 217, 684, 221, p.pink, 5)}${sweat(582, 290, 0.6)}${path("M81 509h233", "none", 8, "#69748c")}`,
    "Une baguette dotée de petits bras traverse le portique d’un aéroport, sous le regard d’un pigeon de sécurité.",
  ],
];

for (let index = 0; index < scenes.length; index++) {
  const [title, body, note] = scenes[index];
  writeFileSync(
    `${destination}/scene-${String(index + 1).padStart(2, "0")}.svg`,
    scene(title, body, note),
    "utf8",
  );
}
console.log(`${scenes.length} original SVG scenes written to ${destination}`);
