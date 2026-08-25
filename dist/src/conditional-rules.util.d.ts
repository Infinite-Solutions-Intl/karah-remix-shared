/**
 * =============================================================================================
 * LECTURE DES RÈGLES CONDITIONNELLES
 * =============================================================================================
 *
 * Le champ `conditionalRules` d'une question a été enregistré sous TROIS formes différentes
 * selon l'époque :
 *
 *   1. objet unique      { conditions, action, logicalOperator }   <- ce que l'éditeur écrit
 *   2. tableau           [ { conditions, action }, … ]
 *   3. objet enveloppe   { rules: [ { conditions, action }, … ] }
 *
 * Le moteur de validation ne lisait que la troisième. Les règles écrites par l'éditeur
 * n'étaient donc jamais évaluées : une question masquée par sa propre condition restait
 * considérée comme visible et obligatoire, et la soumission était refusée avec
 * « La question obligatoire … n'a pas été répondue » — pour une question que le répondant
 * n'avait jamais vue.
 *
 * Cette fonction accepte les trois formes. Elle est le pendant exact de
 * `normalizeQuestionRules` côté client (`features/public-survey/logicEngine.ts`) : les deux
 * moteurs doivent lire les mêmes données de la même façon, sans quoi le formulaire se
 * comporte différemment de ce que le serveur validera.
 * =============================================================================================
 */
export interface NormalizedRule {
    conditions?: Array<{
        questionId?: string;
        operator?: string;
        value?: unknown;
    }>;
    action?: string;
    logicalOperator?: string;
}
/** Ramène `conditionalRules`, quelle que soit sa forme, à une liste de règles exploitables. */
export declare function normalizeConditionalRules(raw: unknown): NormalizedRule[];
/**
 * Opérateur logique effectif d'une règle.
 *
 * `AND` par défaut, et non `OR`. L'éditeur affiche « ET » sans écrire la valeur tant que
 * l'utilisateur n'a pas touché au sélecteur : une règle à trois conditions se retrouvait donc
 * évaluée en `OU` alors que l'écran annonçait `ET`. Le formulaire se comportait à l'inverse
 * de ce qui était configuré.
 */
export declare function effectiveLogicalOperator(rule: NormalizedRule): 'AND' | 'OR';
