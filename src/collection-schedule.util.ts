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

export interface CollectionSchedule {
  /** Début de la période, incluse. */
  startDate?: Date | string | null;
  /** Fin de la période, incluse jusqu'à 23:59 locales. */
  endDate?: Date | string | null;
  /**
   * Jours autorisés, 0 = dimanche … 6 = samedi.
   * Vide ou absent = tous les jours.
   */
  collectionDays?: number[] | null;
  /** Heure d'ouverture au format `HH:mm`. Absente = pas de contrainte horaire. */
  collectionStartTime?: string | null;
  /** Heure de fermeture au format `HH:mm`. */
  collectionEndTime?: string | null;
  /** Fuseau IANA du lieu de collecte, ex. `Africa/Douala`. */
  timezone?: string | null;
  /** Message affiché quand la collecte est fermée. */
  unavailabilityMessage?: string | null;
}

export type ClosureReason =
  | 'BEFORE_START'
  | 'AFTER_END'
  | 'DAY_NOT_ALLOWED'
  | 'OUTSIDE_HOURS'
  | null;

export interface ScheduleVerdict {
  isOpen: boolean;
  reason: ClosureReason;
  /** Message destiné au répondant. `null` quand la collecte est ouverte. */
  message: string | null;
}

/** Fuseau appliqué à défaut. Le terrain principal est au Cameroun. */
export const DEFAULT_TIMEZONE = 'Africa/Douala';

/**
 * Composantes locales d'un instant dans un fuseau donné.
 *
 * `Intl` est employé plutôt qu'un décalage fixe : il connaît les changements d'heure, qu'un
 * décalage codé en dur ferait dériver deux fois par an dans les pays concernés.
 */
/**
 * L'environnement sait-il vraiment convertir vers un fuseau donné ?
 *
 * ⚠️ POINT CRITIQUE POUR REACT NATIVE.
 *
 * Sur Android, le moteur Hermes est compilé sans données ICU complètes dans certaines
 * configurations. `Intl.DateTimeFormat` existe alors, ne lève AUCUNE erreur, mais **ignore
 * l'option `timeZone`** : il renvoie l'heure locale de l'appareil.
 *
 * Un simple `try/catch` ne détecte pas ce cas — c'est précisément ce qui le rend dangereux.
 * Le contrôle ci-dessous convertit un instant connu et vérifie que le résultat correspond au
 * fuseau demandé.
 *
 * En cas d'échec, la conversion retombe sur l'heure de l'appareil. Sur le terrain, l'enquêteur
 * est presque toujours dans le fuseau de sa collecte : le repli est correct dans la quasi-
 * totalité des cas. Mais il cesse de l'être pour une supervision à distance, et c'est pourquoi
 * il est signalé plutôt que silencieux.
 */
export function hasTimezoneSupport(): boolean {
  try {
    // 2026-01-01T12:00:00Z vaut 13:00 à Douala (UTC+1) et 07:00 à New York (UTC-5).
    const reference = new Date('2026-01-01T12:00:00Z');

    const douala = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Douala',
      hour: '2-digit',
      hour12: false,
    }).format(reference);

    const newYork = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      hour12: false,
    }).format(reference);

    // Deux fuseaux distincts doivent donner deux heures distinctes. Si elles coïncident,
    // l'option `timeZone` est ignorée.
    return douala !== newYork;
  } catch {
    return false;
  }
}

/** Résultat mémoïsé : le contrôle est constant pour un environnement donné. */
let timezoneSupport: boolean | null = null;

export function isTimezoneAware(): boolean {
  if (timezoneSupport === null) timezoneSupport = hasTimezoneSupport();
  return timezoneSupport;
}

export function getLocalParts(
  instant: Date,
  timezone: string,
): { weekday: number; minutes: number; ymd: string } {
  let parts: Intl.DateTimeFormatPart[];

  // Environnement sans conversion de fuseau : on emploie l'heure de l'appareil plutôt que de
  // produire une heure fausse en prétendant qu'elle est celle du terrain.
  if (!isTimezoneAware()) {
    const weekday = instant.getDay();
    const pad = (value: number) => String(value).padStart(2, '0');

    return {
      weekday,
      minutes: instant.getHours() * 60 + instant.getMinutes(),
      ymd: `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`,
    };
  }

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
  } catch {
    // Fuseau inconnu : on retombe sur UTC plutôt que d'échouer. Une fenêtre décalée d'une
    // heure vaut mieux qu'une collecte refusée par une exception.
    return getLocalParts(instant, 'UTC');
  }

  const find = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

  const WEEKDAYS: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  const hour = Number(find('hour'));
  return {
    weekday: WEEKDAYS[find('weekday')] ?? 0,
    // `24` peut apparaître pour minuit selon l'environnement : ramené à 0.
    minutes: (hour % 24) * 60 + Number(find('minute')),
    ymd: `${find('year')}-${find('month')}-${find('day')}`,
  };
}

/** Convertit `HH:mm` en minutes depuis minuit. `null` si le format est invalide. */
export function parseTimeOfDay(value: string | null | undefined): number | null {
  if (!value) return null;

  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

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
export function evaluateSchedule(
  schedule: CollectionSchedule,
  now: Date = new Date(),
): ScheduleVerdict {
  const timezone = schedule.timezone || DEFAULT_TIMEZONE;
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
    const withinWindow =
      start <= end
        ? local.minutes >= start && local.minutes <= end
        : // Fenêtre à cheval sur minuit (22:00 – 02:00) : elle est ouverte si l'on est APRÈS
          // le début OU AVANT la fin. Traitée explicitement, sinon une enquête de nuit serait
          // fermée en permanence.
          local.minutes >= start || local.minutes <= end;

    if (!withinWindow) return closed('OUTSIDE_HOURS', schedule);
  } else if (start !== null && local.minutes < start) {
    return closed('OUTSIDE_HOURS', schedule);
  } else if (end !== null && local.minutes > end) {
    return closed('OUTSIDE_HOURS', schedule);
  }

  return { isOpen: true, reason: null, message: null };
}

function closed(reason: ClosureReason, schedule: CollectionSchedule): ScheduleVerdict {
  return {
    isOpen: false,
    reason,
    // Le message du concepteur prime : il connaît son terrain et peut indiquer quoi faire.
    message: schedule.unavailabilityMessage?.trim() || defaultMessage(reason, schedule),
  };
}

function defaultMessage(reason: ClosureReason, schedule: CollectionSchedule): string {
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
function toLocalYmd(value: Date | string | null | undefined, timezone: string): string | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return getLocalParts(date, timezone).ymd;
}

/**
 * Vérifie la cohérence d'une configuration, à la création de l'opération.
 *
 * @returns la liste des problèmes, vide si tout est correct
 */
export function validateSchedule(schedule: CollectionSchedule): string[] {
  const problems: string[] = [];

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
    problems.push(
      "Une seule borne horaire est renseignée. Précisez les deux, ou laissez-les vides pour n'imposer aucun horaire.",
    );
  }

  const days = schedule.collectionDays;
  if (Array.isArray(days) && days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    problems.push('Les jours de collecte doivent être compris entre 0 (dimanche) et 6 (samedi).');
  }

  return problems;
}
