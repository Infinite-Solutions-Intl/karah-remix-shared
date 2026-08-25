import {
  checkPasswordStrength, describePasswordProblems, estimatePasswordScore,
  PASSWORD_PATTERN, PASSWORD_MIN_LENGTH,
} from '../src/password-policy.util';
let passed = 0, failed = 0;
function check(n: string, f: () => void) {
  try { f(); passed++; console.log('  ok   ' + n); } catch (e: any) { failed++; console.log('  FAIL ' + n + '\n       ' + e.message); }
}
function eq(a: unknown, b: unknown) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)}`); }

console.log('\n— exigences —');
check('mot de passe conforme accepté', () => eq(checkPasswordStrength('Karah2026!').isValid, true));
check('trop court refusé', () => {
  const r = checkPasswordStrength('Ka1!');
  eq(r.isValid, false);
  if (!r.missing.some((m) => m.includes(String(PASSWORD_MIN_LENGTH)))) throw new Error(r.missing.join());
});
check('sans majuscule', () => eq(checkPasswordStrength('karah2026!').isValid, false));
check('sans minuscule', () => eq(checkPasswordStrength('KARAH2026!').isValid, false));
check('sans chiffre', () => eq(checkPasswordStrength('KarahSurvey!').isValid, false));
check('sans caractère spécial', () => eq(checkPasswordStrength('KarahSurvey2026').isValid, false));
check('vide', () => eq(checkPasswordStrength('').isValid, false));
check('au-delà de 72 octets refusé (bcrypt tronque en silence)', () =>
  eq(checkPasswordStrength('Aa1!' + 'x'.repeat(80)).isValid, false));

console.log('\n— message : ce qui MANQUE est nommé —');
check('chaque manque est listé', () => {
  const r = checkPasswordStrength('karah');
  eq(r.missing.length >= 4, true);
});
check('message unique lisible', () => {
  const m = describePasswordProblems('karah');
  if (!m?.includes('majuscule')) throw new Error(m ?? 'null');
});
check('aucun message si conforme', () => eq(describePasswordProblems('Karah2026!'), null));

console.log('\n— différent de l\'ancien —');
check('exigence absente si l\'ancien est inconnu', () => {
  const r = checkPasswordStrength('Karah2026!');
  eq(r.requirements.some((x) => x.key === 'different'), false);
});
check('identique à l\'ancien : refusé', () => {
  const r = checkPasswordStrength('Karah2026!', 'Karah2026!');
  eq(r.isValid, false);
  if (!r.missing.some((m) => m.includes('ancien'))) throw new Error(r.missing.join());
});
check('différent de l\'ancien : accepté', () =>
  eq(checkPasswordStrength('Karah2027?', 'Karah2026!').isValid, true));

console.log('\n— expression régulière équivalente —');
check('cohérente avec les contrôles individuels', () => {
  for (const p of ['Karah2026!', 'aB3$aaaa', 'Zz9#zzzzzzzz']) {
    eq(PASSWORD_PATTERN.test(p), checkPasswordStrength(p).isValid);
  }
  for (const p of ['karah2026!', 'KARAH2026!', 'KarahSurvey', 'Ka1!']) {
    eq(PASSWORD_PATTERN.test(p), checkPasswordStrength(p).isValid);
  }
});

console.log('\n— indicateur de robustesse —');
check('progresse avec la qualité', () => {
  eq(estimatePasswordScore(''), 0);
  if (estimatePasswordScore('Karah2026!') < 3) throw new Error('score trop bas');
  if (estimatePasswordScore('K2r@hSurvey2026!') < 4) throw new Error('score trop bas');
});
check('pénalise les suites et répétitions', () => {
  if (estimatePasswordScore('Aaa123456!') >= estimatePasswordScore('Xk7#mQp2!')) {
    throw new Error('la suite évidente n\'est pas pénalisée');
  }
});
check('purement indicatif : un score bas ne bloque pas', () => {
  const weak = 'aB3$aaaa';
  eq(checkPasswordStrength(weak).isValid, true);
});

console.log(`\n${passed} réussis, ${failed} échoués\n`);
if (failed > 0) { process.exitCode = 1; throw new Error('échecs'); }
