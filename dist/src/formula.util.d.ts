/**
 * =============================================================================================
 * ÉVALUATEUR DE FORMULES — QUESTIONS DE TYPE CALCULATED
 * =============================================================================================
 *
 * Permet à une question de calculer sa valeur à partir des réponses précédentes :
 *
 *   {q_prix} * {q_quantite}
 *   ROUND({q_total} / {q_effectif}, 2)
 *   IF({q_age} >= 18, 1, 0)
 *   SUM({q_grille_depenses})
 *
 * ---------------------------------------------------------------------------------------------
 * POURQUOI UN ANALYSEUR ÉCRIT À LA MAIN, ET SURTOUT PAS `eval`
 *
 * Une formule est saisie dans l'interface de conception, stockée en base, puis exécutée
 * côté serveur ET côté client (navigateur, application mobile). Passer par `eval` ou
 * `new Function` reviendrait à offrir une exécution de code arbitraire à quiconque peut
 * créer un questionnaire — et à propager ce code jusque sur les téléphones des enquêteurs.
 *
 * Cet analyseur ne connaît que des nombres, cinq opérateurs, six comparateurs et une liste
 * fermée de fonctions. Il n'a aucun accès à l'environnement d'exécution. Tout ce qu'il ne
 * comprend pas est une erreur de syntaxe, jamais une instruction.
 *
 * Il est également SANS DÉPENDANCE : ni NestJS, ni Prisma, ni React. C'est ce qui permet de
 * le partager entre le backend et le frontend, et de l'exécuter isolément pour le tester.
 * =============================================================================================
 */
/** Valeurs disponibles pour l'évaluation : référence de question -> réponse brute. */
export type FormulaScope = Record<string, unknown>;
export interface FormulaResult {
    /** Résultat numérique, ou null si la formule n'est pas calculable en l'état. */
    value: number | null;
    /**
     * Raison pour laquelle le calcul n'a pas abouti. Distingue l'attente légitime
     * (« une réponse manque encore ») de l'erreur de conception (« fonction inconnue »).
     */
    error?: string;
    /** Vrai lorsque le calcul échoue simplement parce qu'une réponse n'est pas encore saisie. */
    pending?: boolean;
}
/** Erreur de syntaxe ou de sémantique dans la formule elle-même. */
export declare class FormulaError extends Error {
    constructor(message: string);
}
type TokenType = 'number' | 'variable' | 'operator' | 'function' | 'comma' | 'lparen' | 'rparen';
interface Token {
    type: TokenType;
    value: string;
}
export declare const AVAILABLE_FUNCTIONS: string[];
export declare function tokenize(formula: string): Token[];
/**
 * Convertit une réponse brute en liste de nombres.
 *
 * Une seule réponse peut porter plusieurs valeurs : c'est tout l'intérêt de l'agrégation
 * sur grille. `SUM({q_depenses})` additionne alors toutes les cellules numériques de la
 * grille, sans qu'il faille citer chaque ligne une par une.
 *
 * Formats reconnus :
 *   "42"                          -> [42]
 *   ["1", "3"]                    -> [1, 3]                (choix multiple)
 *   { "row_a": "2", "row_b": "5" } -> [2, 5]               (grille)
 *   { "row_a": ["1", "2"] }       -> [1, 2]                (grille à choix multiples)
 *
 * Les valeurs non numériques sont ignorées plutôt que de faire échouer le calcul : une
 * grille mêlant du texte et des chiffres reste ainsi agrégeable sur sa partie numérique.
 */
export declare function extractNumbers(raw: unknown): number[];
/**
 * Analyse une formule sans l'évaluer. Sert à valider la saisie du concepteur.
 * @returns la liste des références citées, pour vérifier qu'elles existent
 */
export declare function parseFormula(formula: string): {
    references: string[];
};
/**
 * Évalue une formule.
 *
 * Ne lève jamais : renvoie toujours un `FormulaResult`. Un calcul est appelé à chaque frappe
 * dans le formulaire public, où une exception non rattrapée casserait l'affichage complet.
 */
export declare function evaluateFormula(formula: string, scope: FormulaScope): FormulaResult;
export {};
