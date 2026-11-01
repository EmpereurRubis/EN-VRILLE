import type { GameId } from "@en-vrille/shared";
import { mythos } from "./mythos.js";
import { products } from "./products.js";
import { accusations } from "./court.js";
import { whoQuestions } from "./who.js";
import { PROMPTS_EN } from "./translations.en.js";

export interface ContentItem {
  id: string;
  gameId: GameId;
  category: string;
  prompt: string;
  promptEn?: string;
  product?: { name: string; description: string; nameEn?: string; descriptionEn?: string };
  mediaUrl?: string;
  adult?: boolean;
}

function questions(
  gameId: GameId,
  groups: Record<string, [string, string][]>,
): ContentItem[] {
  return Object.entries(groups).flatMap(([category, prompts]) =>
    prompts.map(([id, prompt]) => ({
      id,
      gameId,
      category,
      prompt,
      promptEn: PROMPTS_EN[id],
      ...(["adulte", "soirée adulte"].includes(category)
        ? { adult: true }
        : {}),
    })),
  );
}

const scenes = [
  ["animaux", "Une réunion stratégique chez les pigeons."],
  ["espace", "Un astronaute découvre la laverie du bout de l’univers."],
  ["animaux", "La grenouille PDG présente les résultats du trimestre."],
  ["quotidien", "Une carotte passe un entretien d’embauche."],
  ["fantastique", "Le fantôme fait ses courses en caisse automatique."],
  ["animaux", "Un poulpe tente de quitter un appel vidéo."],
  ["fantastique", "Un dragon reçoit sa facture de chauffage."],
  ["animaux", "Un escargot subit un contrôle de vitesse."],
  ["quotidien", "Un robot apporte un gâteau beaucoup trop ambitieux."],
  ["fantastique", "Une sorcière passe son permis de balai."],
  ["espace", "Des extraterrestres découvrent la raclette."],
  ["animaux", "Un chat inaugure son propre monument."],
  ["quotidien", "Un cactus attend patiemment chez le coiffeur."],
  ["fantastique", "Un bonhomme de neige est maître-nageur."],
  ["animaux", "Deux canards négocient le dernier croissant."],
  ["quotidien", "Un grille-pain se produit devant une salle comble."],
  ["fantastique", "Un chevalier combat la notice d’un meuble."],
  ["animaux", "Un pingouin présente la météo tropicale."],
  ["espace", "La Lune a rendez-vous chez le dentiste."],
  ["quotidien", "Une baguette tente de passer le portique de sécurité."],
] as const;

export const CONTENT: ContentItem[] = [
  ...questions("mythos", mythos),
  ...Object.entries(products).flatMap(([category, entries]) =>
    entries.map(([id, name, description]) => ({
      id,
      gameId: "pitch" as const,
      category,
      prompt: `Vendez-nous : ${name}.`,
      product: { name, description },
    })),
  ),
  ...questions("court", accusations),
  ...questions("who", whoQuestions),
  ...scenes.map(([category, description], index) => ({
    id: `captions-${String(index + 1).padStart(3, "0")}`,
    gameId: "captions" as const,
    category,
    prompt: description,
    mediaUrl: `/media/scene-${String(index + 1).padStart(2, "0")}.svg`,
  })),
];

export const CATEGORIES = [
  ...new Set(CONTENT.map((item) => item.category)),
].sort((a, b) => a.localeCompare(b, "fr"));

export interface ContentFilter {
  gameId?: GameId;
  adult?: boolean;
  disabledCategories?: readonly string[];
  disabledIds?: readonly string[];
}

/** Apply this filter after combining built-in content and persisted admin overrides. */
export function filterContent(
  options: ContentFilter = {},
  library: readonly ContentItem[] = CONTENT,
): ContentItem[] {
  const categories = new Set(options.disabledCategories ?? []);
  const disabled = new Set(options.disabledIds ?? []);
  return library.filter(
    (item) =>
      (!options.gameId || item.gameId === options.gameId) &&
      (options.adult === true || !item.adult) &&
      !categories.has(item.category) &&
      !disabled.has(item.id),
  );
}

export const MEDIA_LICENSE = {
  identifier: "CC0-1.0",
  title: "Scènes originales EN VRILLE",
  creator: "Projet EN VRILLE",
  source: "Créées spécifiquement pour ce projet, sans médias tiers.",
  url: "https://creativecommons.org/publicdomain/zero/1.0/",
} as const;
