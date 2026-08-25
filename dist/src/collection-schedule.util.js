"use strict";
/**
 * =============================================================================================
 * FENÊTRE DE COLLECTE — JOURS ET HEURES D'OUVERTURE
 * =============================================================================================
 *
 * Une opération peut n'accepter les réponses que certains jours et à certaines heures : une
 * enquête de sortie de caisse n'a pas de sens à trois heures du matin, et une enquête en
 * entreprise se fait aux horaires de bureau.
 *
 * CE QUI EST BLOQUÉ, ET CE QUI NE L'EST PAS
 *
 *   - **Bloqué** : la soumission directe — formulaire public, saisie en ligne. Elle a lieu
 *     maintenant, la fenêtre s'applique maintenant.
 *   - **JAMAIS bloqué** : la synchronisation mobile. Une collecte faite à 16 h sur le terrain
 *     peut très bien remonter à 21 h, quand l'enquêteur retrouve du réseau. La refuser
 *     détruirait un travail légitime pour une raison qui n'a rien à voir avec lui.
 *
 * C'est la distinction centrale de ce module, et la raison pour laquelle la vérification est
 * posée aux points d'entrée directs, jamais sur le chemin de synchronisation.
 *
 * LE FUSEAU HORAIRE
 *
 * « 08:00 – 17:00 » ne veut rien dire sans fuseau. Le serveur tourne en UTC, le terrain est à
 * Douala (UTC+1) : sans conversion, une fenêtre 08:00–17:00 s'appliquerait en réalité de 09:00
 * à 18:00 locales, et refuserait les premières collectes de la matinée.
 *
 * Chaque opération porte donc son fuseau, et l'évaluation se fait dans l'heure LOCALE du lieu
 * de collecte.
 *
 * ---------------------------------------------------------------------------------------------
 * Module SANS DÉPENDANCE : exécutable et testable isolément.
 * =============================================================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TIMEZONE = void 0;
exports.getLocalParts = getLocalParts;
exports.parseTimeOfDay = parseTimeOfDay;
exports.evaluateSchedule = evaluateSchedule;
exports.validateSchedule = validateSchedule;
/** Fuseau appliqué à défaut. Le terrain principal est au Cameroun. */
exports.DEFAULT_TIMEZONE = 'Africa/Douala';
/**
 * Composantes locales d'un instant dans un fuseau donné.
 *
 * `Intl` est employé plutôt qu'un décalage fixe : il connaît les changements d'heure, qu'un
 * décalage codé en dur ferait dériver deux fois par an dans les pays concernés.
 */
function getLocalParts(instant, timezone) {
    var _a;
    let parts;
    try {
        parts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            weekday: 'short',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).formatToParts(instant);
    }
    catch {
        // Fuseau inconnu : on retombe sur UTC plutôt que d'échouer. Une fenêtre décalée d'une
        // heure vaut mieux qu'une collecte refusée par une exception.
        return getLocalParts(instant, 'UTC');
    }
    const find = (type) => { var _a, _b; return (_b = (_a = parts.find((part) => part.type === type)) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''; };
    const WEEKDAYS = {
        Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const hour = Number(find('hour'));
    return {
        weekday: (_a = WEEKDAYS[find('weekday')]) !== null && _a !== void 0 ? _a : 0,
        // `24` peut apparaître pour minuit selon l'environnement : ramené à 0.
        minutes: (hour % 24) * 60 + Number(find('minute')),
        ymd: `${find('year')}-${find('month')}-${find('day')}`,
    };
}
/** Convertit `HH:mm` en minutes depuis minuit. `null` si le format est invalide. */
function parseTimeOfDay(value) {
    if (!value)
        return null;
    const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!match)
        return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59)
        return null;
    return hours * 60 + minutes;
}
/**
 * La collecte est-elle ouverte à cet instant ?
 *
 * @param now instant à évaluer, par défaut maintenant
 *
 * Ne lève jamais : une configuration incohérente laisse la collecte OUVERTE. Fermer par défaut
 * sur une donnée mal saisie bloquerait une opération entière sans que personne comprenne
 * pourquoi — bien pire que d'accepter une réponse hors horaire.
 */
function evaluateSchedule(schedule, now = new Date()) {
    const timezone = schedule.timezone || exports.DEFAULT_TIMEZONE;
    const local = getLocalParts(now, timezone);
    // --- Période
    const startYmd = toLocalYmd(schedule.startDate, timezone);
    if (startYmd && local.ymd < startYmd) {
        return closed('BEFORE_START', schedule);
    }
    const endYmd = toLocalYmd(schedule.endDate, timezone);
    // Comparaison sur la DATE seule : une fin au 31 mars doit inclure toute la journée du 31,
    // alors que la date stockée pointe sur son minuit.
    if (endYmd && local.ymd > endYmd) {
        return closed('AFTER_END', schedule);
    }
    // --- Jours
    const days = schedule.collectionDays;
    if (Array.isArray(days) && days.length > 0 && !days.includes(local.weekday)) {
        return closed('DAY_NOT_ALLOWED', schedule);
    }
    // --- Heures
    const start = parseTimeOfDay(schedule.collectionStartTime);
    const end = parseTimeOfDay(schedule.collectionEndTime);
    if (start !== null && end !== null) {
        const withinWindow = start <= end
            ? local.minutes >= start && local.minutes <= end
            : // Fenêtre à cheval sur minuit (22:00 – 02:00) : elle est ouverte si l'on est APRÈS
                // le début OU AVANT la fin. Traitée explicitement, sinon une enquête de nuit serait
                // fermée en permanence.
                local.minutes >= start || local.minutes <= end;
        if (!withinWindow)
            return closed('OUTSIDE_HOURS', schedule);
    }
    else if (start !== null && local.minutes < start) {
        return closed('OUTSIDE_HOURS', schedule);
    }
    else if (end !== null && local.minutes > end) {
        return closed('OUTSIDE_HOURS', schedule);
    }
    return { isOpen: true, reason: null, message: null };
}
function closed(reason, schedule) {
    var _a;
    return {
        isOpen: false,
        reason,
        // Le message du concepteur prime : il connaît son terrain et peut indiquer quoi faire.
        message: ((_a = schedule.unavailabilityMessage) === null || _a === void 0 ? void 0 : _a.trim()) || defaultMessage(reason, schedule),
    };
}
function defaultMessage(reason, schedule) {
    switch (reason) {
        case 'BEFORE_START':
            return "Cette collecte n'a pas encore commencé.";
        case 'AFTER_END':
            return 'Cette collecte est terminée.';
        case 'DAY_NOT_ALLOWED':
            return "La collecte n'est pas ouverte aujourd'hui.";
        case 'OUTSIDE_HOURS':
            return schedule.collectionStartTime && schedule.collectionEndTime
                ? `La collecte est ouverte de ${schedule.collectionStartTime} à ${schedule.collectionEndTime}.`
                : 'La collecte est fermée à cette heure.';
        default:
            return 'La collecte est actuellement fermée.';
    }
}
/** Date d'une valeur, exprimée dans le fuseau local, au format `YYYY-MM-DD`. */
function toLocalYmd(value, timezone) {
    if (!value)
        return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime()))
        return null;
    return getLocalParts(date, timezone).ymd;
}
/**
 * Vérifie la cohérence d'une configuration, à la création de l'opération.
 *
 * @returns la liste des problèmes, vide si tout est correct
 */
function validateSchedule(schedule) {
    const problems = [];
    const start = schedule.collectionStartTime;
    const end = schedule.collectionEndTime;
    if (start && parseTimeOfDay(start) === null) {
        problems.push("L'heure d'ouverture doit être au format HH:mm.");
    }
    if (end && parseTimeOfDay(end) === null) {
        problems.push('L\'heure de fermeture doit être au format HH:mm.');
    }
    // Une seule des deux bornes est acceptée — « à partir de 08:00 » est une contrainte
    // légitime — mais on le signale, car c'est plus souvent un oubli qu'une intention.
    if (Boolean(start) !== Boolean(end)) {
        problems.push("Une seule borne horaire est renseignée. Précisez les deux, ou laissez-les vides pour n'imposer aucun horaire.");
    }
    const days = schedule.collectionDays;
    if (Array.isArray(days) && days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
        problems.push('Les jours de collecte doivent être compris entre 0 (dimanche) et 6 (samedi).');
    }
    return problems;
}
