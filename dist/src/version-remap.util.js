"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildVersionIdMap = buildVersionIdMap;
exports.remapQuestionRules = remapQuestionRules;
exports.remapGlobalRules = remapGlobalRules;
exports.countDroppedRules = countDroppedRules;
/**
 * Construit la correspondance entre les entités d'origine et leurs copies.
 *
 * Une entité sans contrepartie est simplement absente de la table : les règles qui la citent
 * seront écartées plus bas, plutôt que de pointer vers le vide.
 */
function buildVersionIdMap(sourceBlocks, createdBlocks) {
    const map = { blocks: new Map(), questions: new Map() };
    const createdByOrder = new Map(createdBlocks.map((block) => [block.order, block]));
    for (const sourceBlock of sourceBlocks) {
        const createdBlock = createdByOrder.get(sourceBlock.order);
        if (!createdBlock)
            continue;
        map.blocks.set(sourceBlock.id, createdBlock.id);
        const createdQuestionsByOrder = new Map(createdBlock.questions.map((question) => [question.order, question]));
        for (const sourceQuestion of sourceBlock.questions) {
            const createdQuestion = createdQuestionsByOrder.get(sourceQuestion.order);
            if (createdQuestion)
                map.questions.set(sourceQuestion.id, createdQuestion.id);
        }
    }
    return map;
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
function remapQuestionRules(rules, map) {
    if (!rules || !Array.isArray(rules.conditions) || rules.conditions.length === 0)
        return null;
    const conditions = [];
    for (const condition of rules.conditions) {
        if (!condition.questionId)
            continue;
        const remapped = map.questions.get(condition.questionId);
        if (remapped)
            conditions.push({ ...condition, questionId: remapped });
    }
    if (conditions.length === 0)
        return null;
    const result = { ...rules, conditions };
    // L'opérateur logique n'a plus d'objet s'il ne reste qu'une condition, et le serveur
    // l'exige à partir de deux.
    if (conditions.length < 2)
        delete result.logicalOperator;
    else if (result.logicalOperator !== 'OR')
        result.logicalOperator = 'AND';
    return result;
}
/**
 * Réécrit les règles globales du questionnaire.
 *
 * Une règle dont la CIBLE a disparu est écartée : sans cible, elle ne peut rien masquer ni
 * afficher, et la conserver donnerait au concepteur l'illusion d'une configuration active.
 */
function remapGlobalRules(logic, map) {
    const rules = extractRules(logic);
    if (rules.length === 0)
        return null;
    const remapped = rules
        .map((rule) => {
        const targetMap = rule.targetType === 'BLOCK' ? map.blocks : map.questions;
        const targetId = rule.targetId ? targetMap.get(rule.targetId) : undefined;
        if (!targetId)
            return null;
        const withConditions = remapQuestionRules(rule, map);
        if (!withConditions)
            return null;
        return { ...withConditions, targetId };
    })
        .filter((rule) => rule !== null);
    return remapped.length > 0 ? { rules: remapped } : null;
}
/** Lit les règles globales quelle que soit la forme sous laquelle elles ont été stockées. */
function extractRules(logic) {
    if (!logic || typeof logic !== 'object')
        return [];
    if (Array.isArray(logic))
        return logic;
    const wrapper = logic;
    return Array.isArray(wrapper.rules) ? wrapper.rules : [];
}
/**
 * Recense les règles perdues lors de la duplication.
 *
 * Sert à informer le concepteur plutôt qu'à corriger : une règle écartée l'a été parce que sa
 * cible ou sa source n'existe plus, ce que seul un humain peut trancher.
 */
function countDroppedRules(logic, map) {
    var _a, _b;
    const before = extractRules(logic).length;
    const after = (_b = (_a = remapGlobalRules(logic, map)) === null || _a === void 0 ? void 0 : _a.rules.length) !== null && _b !== void 0 ? _b : 0;
    return Math.max(0, before - after);
}
