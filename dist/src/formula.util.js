"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AVAILABLE_FUNCTIONS = exports.FormulaError = void 0;
exports.tokenize = tokenize;
exports.extractNumbers = extractNumbers;
exports.parseFormula = parseFormula;
exports.evaluateFormula = evaluateFormula;
/** Erreur de syntaxe ou de sémantique dans la formule elle-même. */
class FormulaError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FormulaError';
    }
}
exports.FormulaError = FormulaError;
/** Signalée quand une variable citée n'a pas encore de réponse. */
class PendingValueError extends Error {
    constructor(reference) {
        super(`La réponse à « ${reference} » n'est pas encore disponible.`);
        this.reference = reference;
        this.name = 'PendingValueError';
    }
}
/** Fonctions reconnues, avec leur arité autorisée. */
const FUNCTIONS = {
    // Arithmétique et agrégation
    SUM: { minArgs: 1, maxArgs: 50 },
    AVG: { minArgs: 1, maxArgs: 50 },
    MIN: { minArgs: 1, maxArgs: 50 },
    MAX: { minArgs: 1, maxArgs: 50 },
    COUNT: { minArgs: 1, maxArgs: 50 },
    ROUND: { minArgs: 1, maxArgs: 2 },
    ABS: { minArgs: 1, maxArgs: 1 },
    FLOOR: { minArgs: 1, maxArgs: 1 },
    CEIL: { minArgs: 1, maxArgs: 1 },
    // Conditionnel
    IF: { minArgs: 3, maxArgs: 3 },
};
exports.AVAILABLE_FUNCTIONS = Object.keys(FUNCTIONS);
/** Opérateurs, avec leur priorité. Les comparateurs sont les moins prioritaires. */
const OPERATORS = {
    '||': { precedence: 1 },
    '&&': { precedence: 2 },
    '==': { precedence: 3 },
    '!=': { precedence: 3 },
    '<': { precedence: 4 },
    '>': { precedence: 4 },
    '<=': { precedence: 4 },
    '>=': { precedence: 4 },
    '+': { precedence: 5 },
    '-': { precedence: 5 },
    '*': { precedence: 6 },
    '/': { precedence: 6 },
    '%': { precedence: 6 },
};
/** Opérateurs à deux caractères, testés en priorité pour ne pas couper `>=` en `>` puis `=`. */
const TWO_CHAR_OPERATORS = ['<=', '>=', '==', '!=', '&&', '||'];
function tokenize(formula) {
    var _a, _b;
    const tokens = [];
    let index = 0;
    while (index < formula.length) {
        const char = formula[index];
        if (/\s/.test(char)) {
            index += 1;
            continue;
        }
        // Variable : {reference}
        if (char === '{') {
            const end = formula.indexOf('}', index);
            if (end === -1) {
                throw new FormulaError('Accolade fermante manquante après « { ».');
            }
            const reference = formula.slice(index + 1, end).trim();
            if (reference.length === 0) {
                throw new FormulaError('Référence vide : « {} » ne désigne aucune question.');
            }
            tokens.push({ type: 'variable', value: reference });
            index = end + 1;
            continue;
        }
        // Nombre (décimales acceptées)
        if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test((_a = formula[index + 1]) !== null && _a !== void 0 ? _a : ''))) {
            let end = index;
            while (end < formula.length && /[0-9.]/.test(formula[end]))
                end += 1;
            const raw = formula.slice(index, end);
            if (((_b = raw.match(/\./g)) !== null && _b !== void 0 ? _b : []).length > 1) {
                throw new FormulaError(`Nombre invalide : « ${raw} ».`);
            }
            tokens.push({ type: 'number', value: raw });
            index = end;
            continue;
        }
        // Nom de fonction
        if (/[A-Za-z_]/.test(char)) {
            let end = index;
            while (end < formula.length && /[A-Za-z0-9_]/.test(formula[end]))
                end += 1;
            const name = formula.slice(index, end).toUpperCase();
            if (!FUNCTIONS[name]) {
                throw new FormulaError(`Fonction inconnue : « ${name} ». Fonctions disponibles : ${exports.AVAILABLE_FUNCTIONS.join(', ')}.`);
            }
            tokens.push({ type: 'function', value: name });
            index = end;
            continue;
        }
        const twoChar = formula.slice(index, index + 2);
        if (TWO_CHAR_OPERATORS.includes(twoChar)) {
            tokens.push({ type: 'operator', value: twoChar });
            index += 2;
            continue;
        }
        if (OPERATORS[char]) {
            tokens.push({ type: 'operator', value: char });
            index += 1;
            continue;
        }
        if (char === '(') {
            tokens.push({ type: 'lparen', value: char });
            index += 1;
            continue;
        }
        if (char === ')') {
            tokens.push({ type: 'rparen', value: char });
            index += 1;
            continue;
        }
        if (char === ',') {
            tokens.push({ type: 'comma', value: char });
            index += 1;
            continue;
        }
        throw new FormulaError(`Caractère non autorisé dans une formule : « ${char} ».`);
    }
    return tokens;
}
class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.position = 0;
    }
    parse() {
        const node = this.parseExpression(0);
        if (this.position < this.tokens.length) {
            throw new FormulaError(`Élément inattendu après la fin de l'expression : « ${this.tokens[this.position].value} ».`);
        }
        return node;
    }
    peek() {
        return this.tokens[this.position];
    }
    consume() {
        const token = this.tokens[this.position];
        if (!token)
            throw new FormulaError('Formule incomplète.');
        this.position += 1;
        return token;
    }
    /** Analyse par priorité croissante (algorithme de précédence grimpante). */
    parseExpression(minPrecedence) {
        let left = this.parseUnary();
        while (true) {
            const token = this.peek();
            if (!token || token.type !== 'operator')
                break;
            const operator = OPERATORS[token.value];
            if (!operator || operator.precedence < minPrecedence)
                break;
            this.consume();
            // Tous les opérateurs sont associatifs à gauche : on exige une priorité strictement
            // supérieure à droite, sinon `10 - 3 - 2` donnerait 9 au lieu de 5.
            const right = this.parseExpression(operator.precedence + 1);
            left = { kind: 'binary', operator: token.value, left, right };
        }
        return left;
    }
    parseUnary() {
        const token = this.peek();
        if ((token === null || token === void 0 ? void 0 : token.type) === 'operator' && (token.value === '-' || token.value === '+')) {
            this.consume();
            return { kind: 'unary', operator: token.value, operand: this.parseUnary() };
        }
        return this.parsePrimary();
    }
    parsePrimary() {
        var _a;
        const token = this.consume();
        switch (token.type) {
            case 'number':
                return { kind: 'number', value: Number(token.value) };
            case 'variable':
                return { kind: 'variable', reference: token.value };
            case 'lparen': {
                const node = this.parseExpression(0);
                const closing = this.consume();
                if (closing.type !== 'rparen') {
                    throw new FormulaError('Parenthèse fermante manquante.');
                }
                return node;
            }
            case 'function': {
                const opening = this.consume();
                if (opening.type !== 'lparen') {
                    throw new FormulaError(`Parenthèse ouvrante attendue après « ${token.value} ».`);
                }
                const args = [];
                if (((_a = this.peek()) === null || _a === void 0 ? void 0 : _a.type) === 'rparen') {
                    this.consume();
                }
                else {
                    while (true) {
                        args.push(this.parseExpression(0));
                        const next = this.consume();
                        if (next.type === 'rparen')
                            break;
                        if (next.type !== 'comma') {
                            throw new FormulaError(`Virgule ou parenthèse attendue dans « ${token.value} ».`);
                        }
                    }
                }
                const signature = FUNCTIONS[token.value];
                if (args.length < signature.minArgs || args.length > signature.maxArgs) {
                    throw new FormulaError(`« ${token.value} » attend entre ${signature.minArgs} et ${signature.maxArgs} argument(s), ` +
                        `${args.length} fourni(s).`);
                }
                return { kind: 'call', name: token.value, args };
            }
            default:
                throw new FormulaError(`Élément inattendu : « ${token.value} ».`);
        }
    }
}
/* ============================================================================================
 * 3. LECTURE DES VALEURS
 * ========================================================================================== */
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
function extractNumbers(raw) {
    if (raw === null || raw === undefined || raw === '')
        return [];
    if (typeof raw === 'number')
        return Number.isFinite(raw) ? [raw] : [];
    if (typeof raw === 'boolean')
        return [raw ? 1 : 0];
    if (Array.isArray(raw))
        return raw.flatMap((entry) => extractNumbers(entry));
    if (typeof raw === 'object') {
        return Object.values(raw).flatMap((entry) => extractNumbers(entry));
    }
    const text = String(raw).trim();
    if (text.length === 0)
        return [];
    // Une réponse de grille est stockée sous forme de chaîne JSON : on tente de la relire
    // avant de renoncer.
    if (text.startsWith('{') || text.startsWith('[')) {
        try {
            return extractNumbers(JSON.parse(text));
        }
        catch {
            return [];
        }
    }
    // La virgule décimale est courante en saisie francophone.
    const parsed = Number(text.replace(',', '.'));
    return Number.isFinite(parsed) ? [parsed] : [];
}
/** Nombre de valeurs réellement renseignées, quel qu'en soit le type. */
function countAnswered(raw) {
    if (raw === null || raw === undefined || raw === '')
        return 0;
    if (Array.isArray(raw))
        return raw.filter((entry) => countAnswered(entry) > 0).length;
    if (typeof raw === 'string') {
        const text = raw.trim();
        if (text.startsWith('{') || text.startsWith('[')) {
            try {
                return countAnswered(JSON.parse(text));
            }
            catch {
                return 1;
            }
        }
        return text.length > 0 ? 1 : 0;
    }
    if (typeof raw === 'object') {
        return Object.values(raw).filter((entry) => countAnswered(entry) > 0)
            .length;
    }
    return 1;
}
/* ============================================================================================
 * 4. ÉVALUATION
 * ========================================================================================== */
/** Toutes les valeurs numériques portées par un nœud, pour les fonctions d'agrégation. */
function collectValues(node, scope) {
    if (node.kind === 'variable') {
        if (!(node.reference in scope)) {
            throw new PendingValueError(node.reference);
        }
        return extractNumbers(scope[node.reference]);
    }
    return [evaluateNode(node, scope)];
}
function evaluateNode(node, scope) {
    var _a, _b, _c, _d;
    switch (node.kind) {
        case 'number':
            return node.value;
        case 'variable': {
            if (!(node.reference in scope)) {
                throw new PendingValueError(node.reference);
            }
            const numbers = extractNumbers(scope[node.reference]);
            // Une variable seule vaut sa première valeur numérique. Employée dans SUM ou AVG,
            // elle sera en revanche développée en liste complète par collectValues.
            return numbers.length > 0 ? numbers[0] : 0;
        }
        case 'unary': {
            const operand = evaluateNode(node.operand, scope);
            return node.operator === '-' ? -operand : operand;
        }
        case 'binary': {
            const left = evaluateNode(node.left, scope);
            const right = evaluateNode(node.right, scope);
            switch (node.operator) {
                case '+': return left + right;
                case '-': return left - right;
                case '*': return left * right;
                case '/':
                    // Division par zéro : renvoyer Infinity donnerait une valeur absurde stockée dans
                    // les réponses. On refuse explicitement.
                    if (right === 0)
                        throw new FormulaError('Division par zéro.');
                    return left / right;
                case '%':
                    if (right === 0)
                        throw new FormulaError('Modulo par zéro.');
                    return left % right;
                case '<': return left < right ? 1 : 0;
                case '>': return left > right ? 1 : 0;
                case '<=': return left <= right ? 1 : 0;
                case '>=': return left >= right ? 1 : 0;
                case '==': return left === right ? 1 : 0;
                case '!=': return left !== right ? 1 : 0;
                case '&&': return left !== 0 && right !== 0 ? 1 : 0;
                case '||': return left !== 0 || right !== 0 ? 1 : 0;
                default:
                    throw new FormulaError(`Opérateur non pris en charge : « ${node.operator} ».`);
            }
        }
        case 'call': {
            if (node.name === 'IF') {
                const condition = evaluateNode(node.args[0], scope);
                // Seule la branche retenue est évaluée : `IF({q}>0, 100/{q}, 0)` ne doit pas
                // déclencher une division par zéro quand la condition est fausse.
                return condition !== 0
                    ? evaluateNode(node.args[1], scope)
                    : evaluateNode(node.args[2], scope);
            }
            if (node.name === 'COUNT') {
                return node.args.reduce((total, arg) => {
                    if (arg.kind === 'variable') {
                        if (!(arg.reference in scope))
                            throw new PendingValueError(arg.reference);
                        return total + countAnswered(scope[arg.reference]);
                    }
                    return total + 1;
                }, 0);
            }
            const values = node.args.flatMap((arg) => collectValues(arg, scope));
            switch (node.name) {
                case 'SUM':
                    return values.reduce((total, value) => total + value, 0);
                case 'AVG':
                    // Moyenne d'un ensemble vide : 0 plutôt que NaN, qui se propagerait dans tout
                    // le reste du calcul et produirait une réponse illisible.
                    return values.length === 0 ? 0 : values.reduce((t, v) => t + v, 0) / values.length;
                case 'MIN':
                    return values.length === 0 ? 0 : Math.min(...values);
                case 'MAX':
                    return values.length === 0 ? 0 : Math.max(...values);
                case 'ABS':
                    return Math.abs((_a = values[0]) !== null && _a !== void 0 ? _a : 0);
                case 'FLOOR':
                    return Math.floor((_b = values[0]) !== null && _b !== void 0 ? _b : 0);
                case 'CEIL':
                    return Math.ceil((_c = values[0]) !== null && _c !== void 0 ? _c : 0);
                case 'ROUND': {
                    const decimals = node.args.length > 1 ? Math.trunc(evaluateNode(node.args[1], scope)) : 0;
                    if (decimals < 0 || decimals > 10) {
                        throw new FormulaError('ROUND accepte entre 0 et 10 décimales.');
                    }
                    const factor = 10 ** decimals;
                    return Math.round(((_d = values[0]) !== null && _d !== void 0 ? _d : 0) * factor) / factor;
                }
                default:
                    throw new FormulaError(`Fonction non prise en charge : « ${node.name} ».`);
            }
        }
    }
}
/* ============================================================================================
 * 5. API PUBLIQUE
 * ========================================================================================== */
/**
 * Analyse une formule sans l'évaluer. Sert à valider la saisie du concepteur.
 * @returns la liste des références citées, pour vérifier qu'elles existent
 */
function parseFormula(formula) {
    if (!formula || formula.trim().length === 0) {
        throw new FormulaError('La formule est vide.');
    }
    if (formula.length > 500) {
        throw new FormulaError('La formule est trop longue (500 caractères maximum).');
    }
    const tokens = tokenize(formula);
    new Parser(tokens).parse();
    const references = [...new Set(tokens.filter((t) => t.type === 'variable').map((t) => t.value))];
    return { references };
}
/**
 * Évalue une formule.
 *
 * Ne lève jamais : renvoie toujours un `FormulaResult`. Un calcul est appelé à chaque frappe
 * dans le formulaire public, où une exception non rattrapée casserait l'affichage complet.
 */
function evaluateFormula(formula, scope) {
    try {
        const tokens = tokenize(formula);
        const ast = new Parser(tokens).parse();
        const value = evaluateNode(ast, scope);
        if (!Number.isFinite(value)) {
            return { value: null, error: 'Le résultat du calcul n’est pas un nombre valide.' };
        }
        // Arrondi de sécurité : 0.1 + 0.2 donnerait 0.30000000000000004, qui serait stocké tel
        // quel dans les réponses et polluerait tous les exports.
        return { value: Math.round(value * 1e10) / 1e10 };
    }
    catch (error) {
        if (error instanceof PendingValueError) {
            return { value: null, pending: true, error: error.message };
        }
        if (error instanceof FormulaError) {
            return { value: null, error: error.message };
        }
        return { value: null, error: 'Formule invalide.' };
    }
}
