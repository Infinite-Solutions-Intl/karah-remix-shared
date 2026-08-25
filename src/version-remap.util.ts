/**
 * =============================================================================================
 * REMAPPAGE DE LA LOGIQUE LORS D'UNE DUPLICATION DE VERSION
 * =============================================================================================
 *
 * LE BUG CORRIGÉ ICI
 *
 * Créer une nouvelle version duplique les blocs, les questions et les options — qui reçoivent
 * tous de NOUVEAUX identifiants. La logique conditionnelle, elle, était recopiée telle quelle :
 * `logic: sourceQuestionnaire.logic`.
 *
 * Toutes les conditions de la nouvelle version pointaient donc vers les identifiants de
 * l'ANCIENNE. Aucune erreur n'était levée — le moteur écrivait simplement
 * `blockVisibility[identifiantMort] = false`, une clé ne correspondant à aucun bloc réel.
 *
 * Résultat : une section censée être masquée par défaut restait visible, et une question
 * conditionnelle s'affichait en permanence. Le questionnaire semblait correctement configuré
 * dans l'éditeur, et se comportait comme s'il n'avait aucune règle.
 *
 * LA CORRESPONDANCE
 *
 * Elle se fait sur `order`, comme partout ailleurs dans ce projet : c'est la seule clé commune
 * entre une entité source et sa copie, l'identifiant étant justement ce qui change.
 *
 * ---------------------------------------------------------------------------------------------
 * Module SANS DÉPENDANCE : exécutable et testable isolément.
 * =============================================================================================
 */

export interface VersionBlock {
  id: string;
  order: number;
  questions: Array<{ id: string; order: number; conditionalRules?: unknown }>;
}

/** Correspondance « identifiant d'origine -> identifiant de la copie ». */
export interface VersionIdMap {
  blocks: Map<string, string>;
  questions: Map<string, string>;
}

/**
 * Construit la correspondance entre les entités d'origine et leurs copies.
 *
 * Une entité sans contrepartie est simplement absente de la table : les règles qui la citent
 * seront écartées plus bas, plutôt que de pointer vers le vide.
 */
export function buildVersionIdMap(
  sourceBlocks: VersionBlock[],
  createdBlocks: VersionBlock[],
): VersionIdMap {
  const map: VersionIdMap = { blocks: new Map(), questions: new Map() };

  const createdByOrder = new Map(createdBlocks.map((block) => [block.order, block]));

  for (const sourceBlock of sourceBlocks) {
    const createdBlock = createdByOrder.get(sourceBlock.order);
    if (!createdBlock) continue;

    map.blocks.set(sourceBlock.id, createdBlock.id);

    const createdQuestionsByOrder = new Map(
      createdBlock.questions.map((question) => [question.order, question]),
    );

    for (const sourceQuestion of sourceBlock.questions) {
      const createdQuestion = createdQuestionsByOrder.get(sourceQuestion.order);
      if (createdQuestion) map.questions.set(sourceQuestion.id, createdQuestion.id);
    }
  }

  return map;
}

interface Condition {
  questionId?: string;
  [key: string]: unknown;
}

interface Rules {
  conditions?: Condition[];
  [key: string]: unknown;
}

interface GlobalRule extends Rules {
  targetId?: string;
  targetType?: 'BLOCK' | 'QUESTION';
}

/**
 * Réécrit les conditions d'une question pour la nouvelle version.
 *
 * @returns les règles remappées, ou `null` si aucune condition n'a survécu.
 *
 * Une condition citant une question absente de la copie est ÉCARTÉE plutôt que conservée
 * telle quelle. Garder un identifiant mort produirait une condition qui ne peut jamais être
 * vraie : la question conditionnée disparaîtrait définitivement du formulaire, ce qui est plus
 * grave que de perdre la condition.
 */
export function remapQuestionRules<T extends Rules>(rules: T | null | undefined, map: VersionIdMap): T | null {
  if (!rules || !Array.isArray(rules.conditions) || rules.conditions.length === 0) return null;

  const conditions: Condition[] = [];
  for (const condition of rules.conditions) {
    if (!condition.questionId) continue;
    const remapped = map.questions.get(condition.questionId);
    if (remapped) conditions.push({ ...condition, questionId: remapped });
  }

  if (conditions.length === 0) return null;

  const result: Rules = { ...rules, conditions };

  // L'opérateur logique n'a plus d'objet s'il ne reste qu'une condition, et le serveur
  // l'exige à partir de deux.
  if (conditions.length < 2) delete result.logicalOperator;
  else if (result.logicalOperator !== 'OR') result.logicalOperator = 'AND';

  return result as T;
}

/**
 * Réécrit les règles globales du questionnaire.
 *
 * Une règle dont la CIBLE a disparu est écartée : sans cible, elle ne peut rien masquer ni
 * afficher, et la conserver donnerait au concepteur l'illusion d'une configuration active.
 */
export function remapGlobalRules(logic: unknown, map: VersionIdMap): { rules: GlobalRule[] } | null {
  const rules = extractRules(logic);
  if (rules.length === 0) return null;

  const remapped = rules
    .map((rule) => {
      const targetMap = rule.targetType === 'BLOCK' ? map.blocks : map.questions;
      const targetId = rule.targetId ? targetMap.get(rule.targetId) : undefined;
      if (!targetId) return null;

      const withConditions = remapQuestionRules(rule, map);
      if (!withConditions) return null;

      return { ...withConditions, targetId } as GlobalRule;
    })
    .filter((rule): rule is GlobalRule => rule !== null);

  return remapped.length > 0 ? { rules: remapped } : null;
}

/** Lit les règles globales quelle que soit la forme sous laquelle elles ont été stockées. */
function extractRules(logic: unknown): GlobalRule[] {
  if (!logic || typeof logic !== 'object') return [];
  if (Array.isArray(logic)) return logic as GlobalRule[];

  const wrapper = logic as { rules?: unknown };
  return Array.isArray(wrapper.rules) ? (wrapper.rules as GlobalRule[]) : [];
}

/**
 * Recense les règles perdues lors de la duplication.
 *
 * Sert à informer le concepteur plutôt qu'à corriger : une règle écartée l'a été parce que sa
 * cible ou sa source n'existe plus, ce que seul un humain peut trancher.
 */
export function countDroppedRules(logic: unknown, map: VersionIdMap): number {
  const before = extractRules(logic).length;
  const after = remapGlobalRules(logic, map)?.rules.length ?? 0;
  return Math.max(0, before - after);
}
