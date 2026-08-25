import { QuestionType } from './question-type';
import { evaluateFormula } from './formula.util';

/**
 * =============================================================================================
 * RECALCUL DES QUESTIONS CALCULÉES, CÔTÉ SERVEUR
 * =============================================================================================
 *
 * POURQUOI RECALCULER ALORS QUE LE CLIENT L'A DÉJÀ FAIT
 *
 * Le formulaire public et l'application mobile calculent la valeur en direct, pour que le
 * répondant la voie s'actualiser pendant qu'il saisit. Mais cette valeur transite ensuite par
 * le réseau : elle peut être modifiée, volontairement ou par un client obsolète dont la
 * formule ne correspond plus à celle du questionnaire.
 *
 * Or une valeur calculée finit dans les exports et les statistiques. On ne fait donc jamais
 * confiance au client sur ce point : la valeur transmise est ignorée, et remplacée par celle
 * que le serveur calcule à partir des réponses réellement reçues.
 *
 * C'est le même parti pris que pour `logicEngine`, dont l'évaluation est dupliquée des deux
 * côtés : le client pour l'ergonomie, le serveur pour la vérité.
 *
 * POURQUOI STOCKER LA VALEUR PLUTÔT QUE LA RECALCULER À L'ANALYSE
 *
 * Une valeur stockée apparaît directement dans l'export CSV, sans traitement. Recalculer à
 * l'analyse supposerait de rejouer les formules sur chaque ligne, dans chaque outil.
 *
 * Contrepartie assumée : modifier une formule ne rétroagit pas sur les soumissions déjà
 * enregistrées. C'est cohérent avec le versionnement des questionnaires, où changer la
 * structure impose déjà de créer une nouvelle version.
 * =============================================================================================
 */

/** Question telle que chargée depuis la base, réduite à ce dont le recalcul a besoin. */
export interface CalculableQuestion {
  id: string;
  type: QuestionType;
  text: string;
  dataTag?: string | null;
  formula?: string | null;
  /** Rang d'affichage global, pour traiter les formules dans le bon ordre. */
  order?: number;
}

/** Une réponse transmise par le client. */
export interface IncomingAnswer {
  questionId: string;
  value: string;
  [key: string]: unknown;
}

export interface RecomputeResult {
  answers: IncomingAnswer[];
  /**
   * Formules n'ayant pas pu aboutir. Non bloquant : une question calculée dépendant d'une
   * question conditionnelle non affichée n'a légitimement pas de valeur. Refuser la
   * soumission entière pour cette raison ferait perdre une collecte terrain complète.
   */
  warnings: string[];
}

/**
 * Recalcule toutes les questions de type CALCULATED d'une soumission.
 *
 * @param questions toutes les questions du questionnaire, dans l'ordre d'affichage
 * @param answers   réponses transmises par le client
 */
export function recomputeCalculatedAnswers(
  questions: CalculableQuestion[],
  answers: IncomingAnswer[],
): RecomputeResult {
  const calculated = questions.filter(
    (question) => question.type === QuestionType.CALCULATED && question.formula,
  );

  if (calculated.length === 0) return { answers, warnings: [] };

  const answerByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer]));
  const warnings: string[] = [];

  // Portée : tag -> réponse brute. Seules les questions portant un tag y figurent, puisque
  // c'est ainsi que les formules les désignent.
  const scope: Record<string, unknown> = {};
  for (const question of questions) {
    if (!question.dataTag) continue;
    const answer = answerByQuestionId.get(question.id);
    if (answer !== undefined) scope[question.dataTag] = answer.value;
  }

  // Traitement dans l'ordre d'affichage : une formule peut s'appuyer sur une question
  // calculée qui la précède, et sa valeur doit alors déjà être disponible dans la portée.
  const ordered = [...calculated].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const result = [...answers];

  for (const question of ordered) {
    const outcome = evaluateFormula(question.formula as string, scope);

    if (outcome.value === null) {
      warnings.push(
        `« ${question.text} » n'a pas pu être calculée : ${outcome.error ?? 'formule non évaluable'}`,
      );
      continue;
    }

    const computed = String(outcome.value);

    // La valeur alimente la portée : une formule ultérieure peut s'en servir.
    if (question.dataTag) scope[question.dataTag] = computed;

    const existingIndex = result.findIndex((answer) => answer.questionId === question.id);

    if (existingIndex >= 0) {
      // La valeur transmise par le client est écrasée sans condition : c'est précisément
      // le point de ce recalcul.
      result[existingIndex] = { ...result[existingIndex], value: computed };
    } else {
      result.push({ questionId: question.id, value: computed });
    }
  }

  return { answers: result, warnings };
}

/**
 * Aplatit les blocs d'un questionnaire en une liste de questions ordonnée.
 *
 * L'ordre global est reconstruit à partir du rang du bloc puis de celui de la question :
 * sans cela, deux questions de rang 1 dans deux blocs différents seraient traitées comme
 * simultanées, et une formule pourrait être évaluée avant sa source.
 */
export function flattenQuestions(
  blocks: Array<{
    order: number;
    questions: Array<{
      id: string;
      type: QuestionType;
      text: string;
      order: number;
      dataTag?: string | null;
      formula?: string | null;
    }>;
  }>,
): CalculableQuestion[] {
  const flattened: CalculableQuestion[] = [];
  let cursor = 0;

  const orderedBlocks = [...blocks].sort((a, b) => a.order - b.order);

  for (const block of orderedBlocks) {
    const orderedQuestions = [...block.questions].sort((a, b) => a.order - b.order);
    for (const question of orderedQuestions) {
      flattened.push({
        id: question.id,
        type: question.type,
        text: question.text,
        dataTag: question.dataTag,
        formula: question.formula,
        order: cursor,
      });
      cursor += 1;
    }
  }

  return flattened;
}
