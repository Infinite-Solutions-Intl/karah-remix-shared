import { QuestionType } from './question-type';
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
export declare function recomputeCalculatedAnswers(questions: CalculableQuestion[], answers: IncomingAnswer[]): RecomputeResult;
/**
 * Aplatit les blocs d'un questionnaire en une liste de questions ordonnée.
 *
 * L'ordre global est reconstruit à partir du rang du bloc puis de celui de la question :
 * sans cela, deux questions de rang 1 dans deux blocs différents seraient traitées comme
 * simultanées, et une formule pourrait être évaluée avant sa source.
 */
export declare function flattenQuestions(blocks: Array<{
    order: number;
    questions: Array<{
        id: string;
        type: QuestionType;
        text: string;
        order: number;
        dataTag?: string | null;
        formula?: string | null;
    }>;
}>): CalculableQuestion[];
