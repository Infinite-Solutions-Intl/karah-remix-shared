"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const password_policy_util_1 = require("../src/password-policy.util");
let passed = 0, failed = 0;
function check(n, f) {
    try {
        f();
        passed++;
        console.log('  ok   ' + n);
    }
    catch (e) {
        failed++;
        console.log('  FAIL ' + n + '\n       ' + e.message);
    }
}
function eq(a, b) { if (JSON.stringify(a) !== JSON.stringify(b))
    throw new Error(`attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)}`); }
console.log('\n— exigences —');
check('mot de passe conforme accepté', () => eq((0, password_policy_util_1.checkPasswordStrength)('Karah2026!').isValid, true));
check('trop court refusé', () => {
    const r = (0, password_policy_util_1.checkPasswordStrength)('Ka1!');
    eq(r.isValid, false);
    if (!r.missing.some((m) => m.includes(String(password_policy_util_1.PASSWORD_MIN_LENGTH))))
        throw new Error(r.missing.join());
});
check('sans majuscule', () => eq((0, password_policy_util_1.checkPasswordStrength)('karah2026!').isValid, false));
check('sans minuscule', () => eq((0, password_policy_util_1.checkPasswordStrength)('KARAH2026!').isValid, false));
check('sans chiffre', () => eq((0, password_policy_util_1.checkPasswordStrength)('KarahSurvey!').isValid, false));
check('sans caractère spécial', () => eq((0, password_policy_util_1.checkPasswordStrength)('KarahSurvey2026').isValid, false));
check('vide', () => eq((0, password_policy_util_1.checkPasswordStrength)('').isValid, false));
check('au-delà de 72 octets refusé (bcrypt tronque en silence)', () => eq((0, password_policy_util_1.checkPasswordStrength)('Aa1!' + 'x'.repeat(80)).isValid, false));
console.log('\n— message : ce qui MANQUE est nommé —');
check('chaque manque est listé', () => {
    const r = (0, password_policy_util_1.checkPasswordStrength)('karah');
    eq(r.missing.length >= 4, true);
});
check('message unique lisible', () => {
    const m = (0, password_policy_util_1.describePasswordProblems)('karah');
    if (!(m === null || m === void 0 ? void 0 : m.includes('majuscule')))
        throw new Error(m !== null && m !== void 0 ? m : 'null');
});
check('aucun message si conforme', () => eq((0, password_policy_util_1.describePasswordProblems)('Karah2026!'), null));
console.log('\n— différent de l\'ancien —');
check('exigence absente si l\'ancien est inconnu', () => {
    const r = (0, password_policy_util_1.checkPasswordStrength)('Karah2026!');
    eq(r.requirements.some((x) => x.key === 'different'), false);
});
check('identique à l\'ancien : refusé', () => {
    const r = (0, password_policy_util_1.checkPasswordStrength)('Karah2026!', 'Karah2026!');
    eq(r.isValid, false);
    if (!r.missing.some((m) => m.includes('ancien')))
        throw new Error(r.missing.join());
});
check('différent de l\'ancien : accepté', () => eq((0, password_policy_util_1.checkPasswordStrength)('Karah2027?', 'Karah2026!').isValid, true));
console.log('\n— expression régulière équivalente —');
check('cohérente avec les contrôles individuels', () => {
    for (const p of ['Karah2026!', 'aB3$aaaa', 'Zz9#zzzzzzzz']) {
        eq(password_policy_util_1.PASSWORD_PATTERN.test(p), (0, password_policy_util_1.checkPasswordStrength)(p).isValid);
    }
    for (const p of ['karah2026!', 'KARAH2026!', 'KarahSurvey', 'Ka1!']) {
        eq(password_policy_util_1.PASSWORD_PATTERN.test(p), (0, password_policy_util_1.checkPasswordStrength)(p).isValid);
    }
});
console.log('\n— indicateur de robustesse —');
check('progresse avec la qualité', () => {
    eq((0, password_policy_util_1.estimatePasswordScore)(''), 0);
    if ((0, password_policy_util_1.estimatePasswordScore)('Karah2026!') < 3)
        throw new Error('score trop bas');
    if ((0, password_policy_util_1.estimatePasswordScore)('K2r@hSurvey2026!') < 4)
        throw new Error('score trop bas');
});
check('pénalise les suites et répétitions', () => {
    if ((0, password_policy_util_1.estimatePasswordScore)('Aaa123456!') >= (0, password_policy_util_1.estimatePasswordScore)('Xk7#mQp2!')) {
        throw new Error('la suite évidente n\'est pas pénalisée');
    }
});
check('purement indicatif : un score bas ne bloque pas', () => {
    const weak = 'aB3$aaaa';
    eq((0, password_policy_util_1.checkPasswordStrength)(weak).isValid, true);
});
console.log(`\n${passed} réussis, ${failed} échoués\n`);
if (failed > 0) {
    process.exitCode = 1;
    throw new Error('échecs');
}
