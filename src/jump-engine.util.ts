/**
 * =============================================================================================
 * SAUT DE SECTION (« Sauter vers »)
 * =============================================================================================
 *
 * CE QUE SIGNIFIE UN SAUT
 *
 * Une règle « Sauter vers X » s'appuie sur une ou plusieurs questions et désigne une cible.
 * Lorsque la condition est remplie, le répondant passe directement à la cible : tout ce qui se
 * trouve ENTRE la question qui déclenche le saut et cette cible est écarté du parcours.
 *
 * L'origine du saut n'est pas stockée explicitement — la règle ne contient qu'une cible et des
 * conditions. On la déduit donc de la question source la plus AVANCÉE parmi les conditions :
 * c'est celle qui, une fois répondue, permet de trancher. Sauter avant elle n'aurait pas de
 * sens, puisque la condition ne pourrait pas encore être évaluée.
 *
 * CE QUI ARRIVE AUX SECTIONS SAUTÉES
 *
 * Elles disparaissent du parcours, et **toutes leurs questions deviennent facultatives** — y
 * compris celles marquées obligatoires. Une question qu'on ne voit pas ne peut pas être exigée.
 *
 * En revanche, les réponses déjà saisies sont **conservées** : si le répondant remplit une
 * section puis revient en arrière modifier une réponse qui déclenche un saut par-dessus cette
 * section, son travail n'est pas effacé. Il redevient visible — et de nouveau pris en compte —
 * s'il annule le saut.
 *
 * SAUT VERS L'ARRIÈRE
 *
 * Une cible située AVANT l'origine est ignorée. Le formulaire s'affichant d'une seule traite,
 * un saut arrière n'a aucune traduction visuelle et créerait surtout une boucle : la condition
 * resterait vraie, le répondant serait renvoyé indéfiniment au même endroit.
 *
 * ---------------------------------------------------------------------------------------------
 * ⚠️ COPIE CONFORME de `frontend/src/features/public-survey/jumpEngine.ts`.
 *
 * Le formulaire décide ce qu'il AFFICHE, le serveur décide ce qu'il EXIGE. Les deux doivent
 * conclure la même chose : si le serveur ignorait les sauts, il réclamerait une réponse à une
 * question que le répondant n'a jamais vue — le défaut exact déjà corrigé pour les règles
 * locales. Toute modification est à reporter à l'identique dans l'autre fichier.
 *
 * Module SANS DÉPENDANCE : exécutable et testable isolément.
 * =============================================================================================
 */

export interface JumpBlock {
  id: string;
  order: number;
  questions: Array<{ id: string; order: number }>;
}

export interface JumpRule {
  targetId?: string;
  targetType?: 'BLOCK' | 'QUESTION';
  action?: string;
  conditions?: Array<{ questionId?: string }>;
}

/** Position d'affichage : rang du bloc, puis rang de la question dans ce bloc. */
export interface Position {
  blockOrder: number;
  questionOrder: number;
}

/** Négatif si `a` précède `b`. */
export function comparePositions(a: Position, b: Position): number {
  if (a.blockOrder !== b.blockOrder) return a.blockOrder - b.blockOrder;
  return a.questionOrder - b.questionOrder;
}

/** Position de chaque question, indexée par identifiant. */
export function buildQuestionPositions(blocks: JumpBlock[]): Map<string, Position> {
  const positions = new Map<string, Position>();

  for (const block of blocks) {
    for (const question of block.questions) {
      positions.set(question.id, { blockOrder: block.order, questionOrder: question.order });
    }
  }

  return positions;
}

/**
 * Origine d'un saut : la question source la plus avancée parmi les conditions de la règle.
 *
 * Avec plusieurs conditions, c'est la dernière posée qui détermine le moment où le saut peut
 * s'appliquer : tant qu'elle n'est pas atteinte, la règle n'est pas décidable.
 */
export function findJumpOrigin(
  rule: JumpRule,
  positions: Map<string, Position>,
): Position | null {
  let latest: Position | null = null;

  for (const condition of rule.conditions ?? []) {
    if (!condition.questionId) continue;
    const position = positions.get(condition.questionId);
    if (!position) continue;
    if (!latest || comparePositions(position, latest) > 0) latest = position;
  }

  return latest;
}

/**
 * Blocs écartés du parcours par les sauts actifs.
 *
 * @param activeJumps règles de saut dont la condition est REMPLIE (évaluée par l'appelant :
 *                    ce module ne connaît pas les réponses)
 * @returns l'ensemble des identifiants de blocs à masquer
 */
export function computeSkippedBlocks(
  blocks: JumpBlock[],
  activeJumps: JumpRule[],
  positions: Map<string, Position>,
): Set<string> {
  const skipped = new Set<string>();

  for (const rule of activeJumps) {
    if (!rule.targetId) continue;

    const origin = findJumpOrigin(rule, positions);
    // Sans origine identifiable, on ne saute rien : masquer des sections au hasard serait
    // bien pire que d'ignorer une règle mal formée.
    if (!origin) continue;

    const target = resolveTargetPosition(rule, blocks, positions);
    if (!target) continue;

    // Saut vers l'arrière : ignoré (voir l'en-tête de ce fichier).
    if (comparePositions(target, origin) <= 0) continue;

    for (const block of blocks) {
      // Le bloc contenant l'origine n'est jamais sauté : le répondant y est, et il vient
      // d'y répondre.
      if (block.order <= origin.blockOrder) continue;
      // Le bloc cible est la destination : on s'y rend, on ne le saute pas.
      if (block.order >= target.blockOrder) continue;

      skipped.add(block.id);
    }
  }

  return skipped;
}

/**
 * Position de la cible d'une règle.
 *
 * Une cible de type QUESTION est ramenée au bloc qui la contient : le parcours se déplace
 * par sections, et masquer la moitié d'un bloc produirait un affichage incompréhensible.
 */
function resolveTargetPosition(
  rule: JumpRule,
  blocks: JumpBlock[],
  positions: Map<string, Position>,
): Position | null {
  if (rule.targetType === 'QUESTION') {
    return positions.get(rule.targetId as string) ?? null;
  }

  const block = blocks.find((candidate) => candidate.id === rule.targetId);
  return block ? { blockOrder: block.order, questionOrder: -1 } : null;
}

/**
 * Questions rendues facultatives par le masquage de leur bloc.
 *
 * Vaut aussi bien pour un saut que pour un masquage conditionnel : dans les deux cas, la
 * section n'est pas parcourue, donc rien de ce qu'elle contient ne peut être exigé.
 */
export function collectOptionalQuestions(
  blocks: JumpBlock[],
  hiddenBlockIds: Set<string>,
): string[] {
  return blocks
    .filter((block) => hiddenBlockIds.has(block.id))
    .flatMap((block) => block.questions.map((question) => question.id));
}
