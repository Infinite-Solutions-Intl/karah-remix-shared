"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const collection_schedule_util_1 = require("../src/collection-schedule.util");
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
// Douala = UTC+1
const at = (utc) => new Date(utc);
console.log('\n— fuseau horaire —');
check('10:00 UTC = 11:00 à Douala', () => {
    const p = (0, collection_schedule_util_1.getLocalParts)(at('2026-08-24T10:00:00Z'), 'Africa/Douala');
    eq(p.minutes, 11 * 60);
});
check('fuseau inconnu : repli sur UTC, jamais d\'exception', () => {
    const p = (0, collection_schedule_util_1.getLocalParts)(at('2026-08-24T10:00:00Z'), 'Mars/Olympus');
    eq(p.minutes, 10 * 60);
});
check('jour de la semaine', () => eq((0, collection_schedule_util_1.getLocalParts)(at('2026-08-24T10:00:00Z'), 'UTC').weekday, 1)); // lundi
console.log('\n— heures —');
const HOURS = { collectionStartTime: '08:00', collectionEndTime: '17:00', timezone: 'Africa/Douala' };
check('dans la fenêtre', () => eq((0, collection_schedule_util_1.evaluateSchedule)(HOURS, at('2026-08-24T09:00:00Z')).isOpen, true)); // 10h locales
check('avant l\'ouverture', () => {
    const v = (0, collection_schedule_util_1.evaluateSchedule)(HOURS, at('2026-08-24T05:00:00Z')); // 06h locales
    eq(v.isOpen, false);
    eq(v.reason, 'OUTSIDE_HOURS');
});
check('après la fermeture', () => {
    const v = (0, collection_schedule_util_1.evaluateSchedule)(HOURS, at('2026-08-24T18:00:00Z')); // 19h locales
    eq(v.isOpen, false);
    eq(v.reason, 'OUTSIDE_HOURS');
});
check('bornes incluses', () => {
    eq((0, collection_schedule_util_1.evaluateSchedule)(HOURS, at('2026-08-24T07:00:00Z')).isOpen, true); // 08:00 pile
    eq((0, collection_schedule_util_1.evaluateSchedule)(HOURS, at('2026-08-24T16:00:00Z')).isOpen, true); // 17:00 pile
});
check('LE PIÈGE DU FUSEAU : 08:00 locales acceptées', () => {
    // Sans conversion, 07:00 UTC serait vu comme 07:00 et refusé
    eq((0, collection_schedule_util_1.evaluateSchedule)(HOURS, at('2026-08-24T07:05:00Z')).isOpen, true);
});
check('fenêtre à cheval sur minuit (enquête de nuit)', () => {
    const night = { collectionStartTime: '22:00', collectionEndTime: '02:00', timezone: 'UTC' };
    eq((0, collection_schedule_util_1.evaluateSchedule)(night, at('2026-08-24T23:00:00Z')).isOpen, true);
    eq((0, collection_schedule_util_1.evaluateSchedule)(night, at('2026-08-24T01:00:00Z')).isOpen, true);
    eq((0, collection_schedule_util_1.evaluateSchedule)(night, at('2026-08-24T12:00:00Z')).isOpen, false);
});
check('aucune heure définie : toujours ouvert', () => eq((0, collection_schedule_util_1.evaluateSchedule)({ timezone: 'UTC' }, at('2026-08-24T03:00:00Z')).isOpen, true));
console.log('\n— jours —');
const WEEKDAYS = { collectionDays: [1, 2, 3, 4, 5], timezone: 'UTC' };
check('lundi autorisé', () => eq((0, collection_schedule_util_1.evaluateSchedule)(WEEKDAYS, at('2026-08-24T10:00:00Z')).isOpen, true));
check('dimanche refusé', () => {
    const v = (0, collection_schedule_util_1.evaluateSchedule)(WEEKDAYS, at('2026-08-23T10:00:00Z'));
    eq(v.isOpen, false);
    eq(v.reason, 'DAY_NOT_ALLOWED');
});
check('liste vide = tous les jours', () => eq((0, collection_schedule_util_1.evaluateSchedule)({ collectionDays: [], timezone: 'UTC' }, at('2026-08-23T10:00:00Z')).isOpen, true));
console.log('\n— période —');
check('avant le début', () => {
    const v = (0, collection_schedule_util_1.evaluateSchedule)({ startDate: '2026-09-01', timezone: 'UTC' }, at('2026-08-24T10:00:00Z'));
    eq(v.isOpen, false);
    eq(v.reason, 'BEFORE_START');
});
check('après la fin', () => {
    const v = (0, collection_schedule_util_1.evaluateSchedule)({ endDate: '2026-08-01', timezone: 'UTC' }, at('2026-08-24T10:00:00Z'));
    eq(v.isOpen, false);
    eq(v.reason, 'AFTER_END');
});
check('DERNIER JOUR inclus jusqu\'au soir', () => {
    // La date de fin pointe sur minuit : sans comparaison par date, tout le 24 serait refusé
    const v = (0, collection_schedule_util_1.evaluateSchedule)({ endDate: '2026-08-24T00:00:00Z', timezone: 'UTC' }, at('2026-08-24T22:00:00Z'));
    eq(v.isOpen, true);
});
check('premier jour inclus dès le matin', () => eq((0, collection_schedule_util_1.evaluateSchedule)({ startDate: '2026-08-24T00:00:00Z', timezone: 'UTC' }, at('2026-08-24T06:00:00Z')).isOpen, true));
console.log('\n— messages —');
check('message du concepteur prioritaire', () => {
    const v = (0, collection_schedule_util_1.evaluateSchedule)({ collectionDays: [1], unavailabilityMessage: 'Revenez lundi.', timezone: 'UTC' }, at('2026-08-23T10:00:00Z'));
    eq(v.message, 'Revenez lundi.');
});
check('message par défaut sinon', () => {
    var _a, _b;
    const v = (0, collection_schedule_util_1.evaluateSchedule)(HOURS, at('2026-08-24T20:00:00Z'));
    if (!((_a = v.message) === null || _a === void 0 ? void 0 : _a.includes('08:00')))
        throw new Error((_b = v.message) !== null && _b !== void 0 ? _b : 'null');
});
check('ouvert : aucun message', () => eq((0, collection_schedule_util_1.evaluateSchedule)(HOURS, at('2026-08-24T09:00:00Z')).message, null));
console.log('\n— robustesse : jamais d\'exception, ouvert par défaut —');
check('configuration incohérente n\'entraîne pas de fermeture', () => {
    eq((0, collection_schedule_util_1.evaluateSchedule)({ collectionStartTime: 'abc', collectionEndTime: '99:99', timezone: 'UTC' }).isOpen, true);
    eq((0, collection_schedule_util_1.evaluateSchedule)({ startDate: 'pas-une-date', timezone: 'UTC' }).isOpen, true);
    eq((0, collection_schedule_util_1.evaluateSchedule)({}).isOpen, true);
});
console.log('\n— analyse et contrôle —');
check('parseTimeOfDay', () => {
    eq((0, collection_schedule_util_1.parseTimeOfDay)('08:30'), 510);
    eq((0, collection_schedule_util_1.parseTimeOfDay)('0:00'), 0);
    eq((0, collection_schedule_util_1.parseTimeOfDay)('23:59'), 1439);
    eq((0, collection_schedule_util_1.parseTimeOfDay)('24:00'), null);
    eq((0, collection_schedule_util_1.parseTimeOfDay)('8h30'), null);
    eq((0, collection_schedule_util_1.parseTimeOfDay)(''), null);
});
check('validateSchedule détecte les erreurs', () => {
    eq((0, collection_schedule_util_1.validateSchedule)({ collectionStartTime: '08:00', collectionEndTime: '17:00' }), []);
    if ((0, collection_schedule_util_1.validateSchedule)({ collectionStartTime: '8h' }).length === 0)
        throw new Error('format non détecté');
    if ((0, collection_schedule_util_1.validateSchedule)({ collectionStartTime: '08:00' }).length === 0)
        throw new Error('borne seule non signalée');
    if ((0, collection_schedule_util_1.validateSchedule)({ collectionDays: [9] }).length === 0)
        throw new Error('jour invalide non détecté');
});
console.log(`\n${passed} réussis, ${failed} échoués\n`);
if (failed > 0) {
    process.exitCode = 1;
    throw new Error('échecs');
}
