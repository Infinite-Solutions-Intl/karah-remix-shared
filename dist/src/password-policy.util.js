"use strict";
/**
 * =============================================================================================
 * COMPLEXITÉ DES MOTS DE PASSE
 * =============================================================================================
 *
 * Placée dans le paquet partagé pour une raison précise : la règle doit être **identique** à
 * l'écran et au serveur. Une politique plus stricte côté serveur produit un refus incompréhensible
 * après une saisie que l'interface avait validée ; l'inverse laisse passer des mots de passe que
 * l'interface prétendait exiger.
 *
 * POURQUOI PAS UNE SEULE EXPRESSION RÉGULIÈRE
 *
 * Une regex unique répond « non » sans dire pourquoi. Chaque exigence est donc vérifiée
 * séparément, pour que l'utilisateur sache **ce qui manque** — il faut sinon deviner, et l'on
 * finit par abandonner ou par choisir un mot de passe plus faible mais accepté par tâtonnement.
 *
 * ---------------------------------------------------------------------------------------------
 * Module SANS DÉPENDANCE : exécutable dans Node, dans un navigateur et dans React Native.
 * =============================================================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PASSWORD_PATTERN = exports.PASSWORD_MAX_LENGTH = exports.PASSWORD_MIN_LENGTH = void 0;
exports.checkPasswordStrength = checkPasswordStrength;
exports.describePasswordProblems = describePasswordProblems;
exports.estimatePasswordScore = estimatePasswordScore;
/** Longueur minimale exigée. */
exports.PASSWORD_MIN_LENGTH = 8;
/**
 * Longueur maximale.
 *
 * bcrypt ignore silencieusement tout ce qui dépasse 72 octets : accepter davantage donnerait
 * l'illusion d'un mot de passe plus long qu'il ne l'est réellement.
 */
exports.PASSWORD_MAX_LENGTH = 72;
/**
 * Expression régulière équivalente, pour les cas où une seule règle est nécessaire —
 * décorateur `@Matches`, attribut `pattern` d'un champ HTML.
 *
 * Elle exprime la même chose que les contrôles individuels ci-dessous, mais sans pouvoir dire
 * ce qui manque. À réserver aux endroits qui ne peuvent pas afficher de détail.
 */
exports.PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[\s\S]{8,72}$/;
/**
 * Vérifie un mot de passe, exigence par exigence.
 *
 * @param previousPassword ancien mot de passe EN CLAIR, quand il est connu — cas d'un
 *        changement où l'utilisateur saisit les deux. Absent lors d'une réinitialisation, où
 *        l'ancien n'est jamais transmis : la comparaison se fait alors côté serveur, contre
 *        l'empreinte stockée.
 */
function checkPasswordStrength(password, previousPassword) {
    const value = password !== null && password !== void 0 ? password : '';
    const requirements = [
        {
            key: 'length',
            label: `Au moins ${exports.PASSWORD_MIN_LENGTH} caractères`,
            satisfied: value.length >= exports.PASSWORD_MIN_LENGTH && value.length <= exports.PASSWORD_MAX_LENGTH,
        },
        {
            key: 'lowercase',
            label: 'Une lettre minuscule',
            satisfied: /[a-z]/.test(value),
        },
        {
            key: 'uppercase',
            label: 'Une lettre majuscule',
            satisfied: /[A-Z]/.test(value),
        },
        {
            key: 'digit',
            label: 'Un chiffre',
            satisfied: /\d/.test(value),
        },
        {
            key: 'special',
            // Tout ce qui n'est ni lettre ni chiffre, y compris l'espace et les caractères accentués
            // hors alphabet latin de base. Restreindre à une liste fermée écarterait des claviers
            // entiers, sans rien apporter à la solidité.
            label: 'Un caractère spécial',
            satisfied: /[^A-Za-z0-9]/.test(value),
        },
    ];
    // L'exigence n'apparaît QUE si l'ancien mot de passe est connu : l'afficher lors d'une
    // réinitialisation demanderait à l'utilisateur de comparer avec un mot de passe qu'il a
    // justement oublié.
    if (previousPassword) {
        requirements.push({
            key: 'different',
            label: "Différent de l'ancien mot de passe",
            satisfied: value.length > 0 && value !== previousPassword,
        });
    }
    const missing = requirements.filter((r) => !r.satisfied).map((r) => r.label);
    return {
        isValid: missing.length === 0 && value.length > 0,
        requirements,
        missing,
    };
}
/**
 * Message d'erreur unique, pour les contextes qui n'affichent pas le détail.
 *
 * `null` quand le mot de passe convient.
 */
function describePasswordProblems(password, previousPassword) {
    const result = checkPasswordStrength(password, previousPassword);
    if (result.isValid)
        return null;
    return `Le mot de passe doit respecter : ${result.missing.join(', ').toLowerCase()}.`;
}
/**
 * Indicateur de robustesse, de 0 à 4.
 *
 * Purement indicatif — il ne conditionne rien. Un mot de passe conforme est accepté quel que
 * soit son score : ajouter un seuil caché contredirait les exigences affichées, ce qui est
 * exactement ce que cette interface cherche à éviter.
 */
function estimatePasswordScore(password) {
    const value = password !== null && password !== void 0 ? password : '';
    if (value.length === 0)
        return 0;
    let score = 0;
    if (value.length >= exports.PASSWORD_MIN_LENGTH)
        score += 1;
    if (value.length >= 12)
        score += 1;
    const families = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(value)).length;
    if (families >= 3)
        score += 1;
    if (families === 4)
        score += 1;
    // Suites évidentes et répétitions : elles gonflent la longueur sans rien apporter.
    if (/(.)\1{2,}/.test(value) || /(?:012|123|234|345|456|567|678|789|abc|qwe|aze)/i.test(value)) {
        score = Math.max(0, score - 1);
    }
    return Math.min(4, score);
}
