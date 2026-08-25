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
    questions: Array<{
        id: string;
        order: number;
        conditionalRules?: unknown;
    }>;
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
export declare function buildVersionIdMap(sourceBlocks: VersionBlock[], createdBlocks: VersionBlock[]): VersionIdMap;
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
export declare function remapQuestionRules<T extends Rules>(rules: T | null | undefined, map: VersionIdMap): T | null;
/**
 * Réécrit les règles globales du questionnaire.
 *
 * Une règle dont la CIBLE a disparu est écartée : sans cible, elle ne peut rien masquer ni
 * afficher, et la conserver donnerait au concepteur l'illusion d'une configuration active.
 */
export declare function remapGlobalRules(logic: unknown, map: VersionIdMap): {
    rules: GlobalRule[];
} | null;
/**
 * Recense les règles perdues lors de la duplication.
 *
 * Sert à informer le concepteur plutôt qu'à corriger : une règle écartée l'a été parce que sa
 * cible ou sa source n'existe plus, ce que seul un humain peut trancher.
 */
export declare function countDroppedRules(logic: unknown, map: VersionIdMap): number;
export {};
