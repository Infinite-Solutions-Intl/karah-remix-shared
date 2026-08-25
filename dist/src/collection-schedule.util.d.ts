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
export type ClosureReason = 'BEFORE_START' | 'AFTER_END' | 'DAY_NOT_ALLOWED' | 'OUTSIDE_HOURS' | null;
export interface ScheduleVerdict {
    isOpen: boolean;
    reason: ClosureReason;
    /** Message destiné au répondant. `null` quand la collecte est ouverte. */
    message: string | null;
}
/** Fuseau appliqué à défaut. Le terrain principal est au Cameroun. */
export declare const DEFAULT_TIMEZONE = "Africa/Douala";
/**
 * Composantes locales d'un instant dans un fuseau donné.
 *
 * `Intl` est employé plutôt qu'un décalage fixe : il connaît les changements d'heure, qu'un
 * décalage codé en dur ferait dériver deux fois par an dans les pays concernés.
 */
export declare function getLocalParts(instant: Date, timezone: string): {
    weekday: number;
    minutes: number;
    ymd: string;
};
/** Convertit `HH:mm` en minutes depuis minuit. `null` si le format est invalide. */
export declare function parseTimeOfDay(value: string | null | undefined): number | null;
/**
 * La collecte est-elle ouverte à cet instant ?
 *
 * @param now instant à évaluer, par défaut maintenant
 *
 * Ne lève jamais : une configuration incohérente laisse la collecte OUVERTE. Fermer par défaut
 * sur une donnée mal saisie bloquerait une opération entière sans que personne comprenne
 * pourquoi — bien pire que d'accepter une réponse hors horaire.
 */
export declare function evaluateSchedule(schedule: CollectionSchedule, now?: Date): ScheduleVerdict;
/**
 * Vérifie la cohérence d'une configuration, à la création de l'opération.
 *
 * @returns la liste des problèmes, vide si tout est correct
 */
export declare function validateSchedule(schedule: CollectionSchedule): string[];
