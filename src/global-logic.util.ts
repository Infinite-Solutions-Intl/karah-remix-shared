/**
 * =============================================================================================
 * LECTURE DE LA LOGIQUE GLOBALE D'UN QUESTIONNAIRE
 * =============================================================================================
 *
 * LE BUG CORRIGÉ ICI
 *
 * Le champ `Questionnaire.logic` a été écrit sous DEUX formes différentes selon le chemin
 * emprunté :
 *
 *   - à la création           -> { "rules": [ … ] }
 *   - via `updateQuestionnaireLogic` -> [ … ]        (le tableau nu)
 *
 * Or les deux moteurs d'évaluation ne lisaient que la première : `logic?.rules ?? []`. Sur un
 * questionnaire dont les règles avaient été modifiées après coup — c'est-à-dire la totalité de
 * ceux édités depuis l'interface — `logic.rules` valait `undefined`, la liste de règles était
 * vide, et **aucune condition globale n'était appliquée**.
 *
 * Le symptôme trompait : l'éditeur affichait correctement les règles, la base les contenait
 * bien, mais le formulaire public se comportait comme s'il n'y en avait aucune. Une section
 * censée être masquée par défaut restait visible en permanence.
 *
 * ⚠️ COPIE CONFORME de `frontend/src/features/public-survey/globalLogic.util.ts`.
 * Les deux moteurs doivent lire la même donnée de la même façon, sinon le formulaire affiche
 * autre chose que ce que le serveur validera.
 *
 * Cette fonction accepte les deux formes. C'est le pendant exact de `normalizeQuestionRules`
 * pour les conditions locales, qui avait déjà dû traiter la même divergence.
 * =============================================================================================
 */

/** Extrait la liste des règles globales, quelle que soit la forme du stockage. */
export function readGlobalRules<T>(logic: unknown): T[] {
  if (!logic || typeof logic !== 'object') return [];

  // Forme « tableau nu », produite par la mise à jour de la logique depuis l'éditeur.
  if (Array.isArray(logic)) return logic as T[];

  // Forme enveloppée, produite à la création du questionnaire.
  const wrapper = logic as { rules?: unknown };
  if (Array.isArray(wrapper.rules)) return wrapper.rules as T[];

  return [];
}

/**
 * Forme canonique pour l'écriture : toujours `{ rules: [...] }`.
 *
 * Uniformiser à l'écriture ne suffit pas — les questionnaires déjà en base gardent leur
 * ancienne forme — mais cela empêche le problème de se reproduire, et rend la donnée
 * prévisible pour tout ce qui la lira plus tard.
 */
export function toCanonicalLogic<T>(rules: T[]): { rules: T[] } | null {
  return rules.length > 0 ? { rules } : null;
}
