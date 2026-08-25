"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recomputeCalculatedAnswers = recomputeCalculatedAnswers;
exports.flattenQuestions = flattenQuestions;
const question_type_1 = require("./question-type");
const formula_util_1 = require("./formula.util");
/**
 * Recalcule toutes les questions de type CALCULATED d'une soumission.
 *
 * @param questions toutes les questions du questionnaire, dans l'ordre d'affichage
 * @param answers   réponses transmises par le client
 */
function recomputeCalculatedAnswers(questions, answers) {
    var _a;
    const calculated = questions.filter((question) => question.type === question_type_1.QuestionType.CALCULATED && question.formula);
    if (calculated.length === 0)
        return { answers, warnings: [] };
    const answerByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer]));
    const warnings = [];
    // Portée : tag -> réponse brute. Seules les questions portant un tag y figurent, puisque
    // c'est ainsi que les formules les désignent.
    const scope = {};
    for (const question of questions) {
        if (!question.dataTag)
            continue;
        const answer = answerByQuestionId.get(question.id);
        if (answer !== undefined)
            scope[question.dataTag] = answer.value;
    }
    // Traitement dans l'ordre d'affichage : une formule peut s'appuyer sur une question
    // calculée qui la précède, et sa valeur doit alors déjà être disponible dans la portée.
    const ordered = [...calculated].sort((a, b) => { var _a, _b; return ((_a = a.order) !== null && _a !== void 0 ? _a : 0) - ((_b = b.order) !== null && _b !== void 0 ? _b : 0); });
    const result = [...answers];
    for (const question of ordered) {
        const outcome = (0, formula_util_1.evaluateFormula)(question.formula, scope);
        if (outcome.value === null) {
            warnings.push(`« ${question.text} » n'a pas pu être calculée : ${(_a = outcome.error) !== null && _a !== void 0 ? _a : 'formule non évaluable'}`);
            continue;
        }
        const computed = String(outcome.value);
        // La valeur alimente la portée : une formule ultérieure peut s'en servir.
        if (question.dataTag)
            scope[question.dataTag] = computed;
        const existingIndex = result.findIndex((answer) => answer.questionId === question.id);
        if (existingIndex >= 0) {
            // La valeur transmise par le client est écrasée sans condition : c'est précisément
            // le point de ce recalcul.
            result[existingIndex] = { ...result[existingIndex], value: computed };
        }
        else {
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
function flattenQuestions(blocks) {
    const flattened = [];
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
