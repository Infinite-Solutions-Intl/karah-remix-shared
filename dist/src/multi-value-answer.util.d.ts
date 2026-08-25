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
export declare function extractSelectedValues(rawAnswer: unknown): string[];
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
export declare function answerContains(rawAnswer: unknown, expected: unknown): boolean;
/** La réponse est-elle l'une des valeurs attendues ? (opérateur IN) */
export declare function answerIsIn(rawAnswer: unknown, expected: unknown): boolean;
/**
 * Égalité stricte entre une réponse et une valeur attendue.
 *
 * Sur une réponse multivaluée, l'égalité exige que la sélection se réduise à cette seule
 * valeur — « est égal à Vert » signifie « Vert et rien d'autre ». Pour « Vert parmi d'autres »,
 * c'est CONTAINS qu'il faut employer.
 */
export declare function answerEquals(rawAnswer: unknown, expected: unknown): boolean;
