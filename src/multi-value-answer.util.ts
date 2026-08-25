/**
 * =============================================================================================
 * COMPARER UNE CONDITION À UNE RÉPONSE À VALEURS MULTIPLES
 * =============================================================================================
 *
 * Certaines réponses portent PLUSIEURS valeurs : choix multiple, classement, grilles. Elles
 * sont enregistrées sous forme de chaîne JSON :
 *
 *   choix multiple  ->  '["option_1","option_3"]'
 *   classement      ->  '["option_2","option_1","option_3"]'
 *   grille          ->  '{"ligne_1":"colonne_2"}'
 *
 * LE DÉFAUT CORRIGÉ ICI
 *
 * L'opérateur CONTAINS travaillait sur la chaîne brute :
 *
 *   '["option_1","option_3"]'.includes('option_1')   // vrai
 *
 * Cela fonctionne — par accident. Dès que les options dépassent la dizaine, `option_1` est
 * contenu dans `option_10`, `option_11`… et la condition devient vraie pour des réponses qui
 * ne la satisfont pas. Un questionnaire à onze options suffit à déclencher le problème, sans
 * aucun message.
 *
 * La comparaison porte désormais sur les valeurs RÉELLEMENT sélectionnées, extraites du JSON.
 *
 * ---------------------------------------------------------------------------------------------
 * ⚠️ COPIE CONFORME de `frontend/src/features/public-survey/multiValueAnswer.util.ts`.
 * Les deux moteurs doivent comparer de la même façon, sinon le formulaire affiche autre chose
 * que ce que le serveur validera.
 *
 * Module SANS DÉPENDANCE : exécutable et testable isolément.
 * =============================================================================================
 */

/**
 * Extrait la liste des valeurs sélectionnées d'une réponse, quelle que soit sa forme.
 *
 * Une réponse simple renvoie une liste d'un élément : le reste du moteur peut ainsi traiter
 * tous les types de la même façon, sans distinguer les cas.
 */
export function extractSelectedValues(rawAnswer: unknown): string[] {
  if (rawAnswer === null || rawAnswer === undefined) return [];

  if (Array.isArray(rawAnswer)) {
    return rawAnswer.flatMap((entry) => extractSelectedValues(entry));
  }

  if (typeof rawAnswer === 'object') {
    // Grille : les valeurs sont les cellules cochées, les clés étant les lignes.
    return Object.values(rawAnswer as Record<string, unknown>).flatMap((entry) =>
      extractSelectedValues(entry),
    );
  }

  const text = String(rawAnswer).trim();
  if (text.length === 0) return [];

  // Réponse multivaluée : elle est enregistrée sous forme de chaîne JSON.
  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      return extractSelectedValues(JSON.parse(text));
    } catch {
      // JSON invalide : on retombe sur la chaîne brute plutôt que de perdre la réponse.
      return [text];
    }
  }

  return [text];
}

/**
 * La réponse contient-elle la valeur attendue ?
 *
 * Comparaison insensible à la casse, comme le faisait l'ancienne implémentation par
 * sous-chaîne : la modifier silencieusement changerait le comportement de conditions déjà en
 * production.
 *
 * Une réponse à valeur unique reste couverte : « contient » y équivaut à « est égal à », ce
 * qui est le sens attendu.
 */
export function answerContains(rawAnswer: unknown, expected: unknown): boolean {
  if (expected === null || expected === undefined) return false;

  const target = String(expected).trim().toLowerCase();
  if (target.length === 0) return false;

  const selected = extractSelectedValues(rawAnswer).map((entry) => entry.trim().toLowerCase());

  // Correspondance EXACTE sur un élément, et non sous-chaîne : `option_1` ne doit pas
  // correspondre à `option_10`.
  if (selected.includes(target)) return true;

  // Repli par sous-chaîne réservé au TEXTE LIBRE, où « contient » garde son sens littéral —
  // « Douala » dans « Douala 5e ».
  //
  // Il est délibérément écarté pour une réponse issue d'une liste fermée : c'est là que se
  // logeait le défaut que ce module corrige, `option_1` étant contenu dans `option_10`.
  if (isStructuredAnswer(rawAnswer)) return false;

  return selected.length === 1 && selected[0].includes(target);
}

/**
 * La réponse provient-elle d'une liste fermée (choix multiple, classement, grille) ?
 *
 * Reconnue à sa forme : ces réponses sont enregistrées en JSON, alors qu'une saisie libre est
 * une chaîne ordinaire.
 */
function isStructuredAnswer(rawAnswer: unknown): boolean {
  if (Array.isArray(rawAnswer) || (rawAnswer !== null && typeof rawAnswer === 'object')) return true;

  if (typeof rawAnswer !== 'string') return false;
  const text = rawAnswer.trim();
  if (!text.startsWith('[') && !text.startsWith('{')) return false;

  try {
    JSON.parse(text);
    return true;
  } catch {
    // JSON invalide : traité comme du texte libre, faute de mieux.
    return false;
  }
}

/** La réponse est-elle l'une des valeurs attendues ? (opérateur IN) */
export function answerIsIn(rawAnswer: unknown, expected: unknown): boolean {
  const candidates = (Array.isArray(expected) ? expected : [expected])
    .filter((entry) => entry !== null && entry !== undefined)
    .map((entry) => String(entry).trim().toLowerCase());

  if (candidates.length === 0) return false;

  const selected = extractSelectedValues(rawAnswer).map((entry) => entry.trim().toLowerCase());
  return selected.some((entry) => candidates.includes(entry));
}

/**
 * Égalité stricte entre une réponse et une valeur attendue.
 *
 * Sur une réponse multivaluée, l'égalité exige que la sélection se réduise à cette seule
 * valeur — « est égal à Vert » signifie « Vert et rien d'autre ». Pour « Vert parmi d'autres »,
 * c'est CONTAINS qu'il faut employer.
 */
export function answerEquals(rawAnswer: unknown, expected: unknown): boolean {
  if (expected === null || expected === undefined) return false;

  const target = String(expected).trim().toLowerCase();
  const selected = extractSelectedValues(rawAnswer).map((entry) => entry.trim().toLowerCase());

  return selected.length === 1 && selected[0] === target;
}
