/**
 * =============================================================================================
 * VÉRIFICATION DE POSITION
 * =============================================================================================
 *
 * CE QUE PRÉVOIT LE FONCTIONNEMENT
 *
 *   - Opération SANS site   : aucune contrainte. Position collectée, non requise.
 *   - Opération AVEC sites  : la présence sur un site assigné est vérifiée à l'ouverture du
 *                             questionnaire. Hors périmètre, l'enquêteur peut CONTINUER MALGRÉ
 *                             TOUT, la collecte portant alors la mention d'un échec de
 *                             vérification.
 *   - Formulaire public     : position collectée si le navigateur l'autorise, non requise.
 *
 * CE QUE FAISAIT LE CODE
 *
 * Une position hors périmètre faisait ÉCHOUER la soumission. « Continuer malgré tout » n'avait
 * donc aucun effet : l'enquêteur remplissait son questionnaire, et le serveur le rejetait à la
 * synchronisation — après coup, loin du terrain, sans possibilité de refaire la collecte.
 *
 * LE PRINCIPE RETENU
 *
 * Une position douteuse est un problème de QUALITÉ, pas de validité. La collecte est acceptée
 * et marquée ; c'est à l'analyse de décider quoi en faire. Refuser à la collecte fait perdre
 * une donnée qu'on ne pourra jamais reconstituer.
 *
 * ---------------------------------------------------------------------------------------------
 * Module SANS DÉPENDANCE : exécutable et testable isolément.
 * =============================================================================================
 */
/** Motif d'un marquage. `null` = position vérifiée et conforme. */
export type GpsFlag = 'OUT_OF_ZONE' | 'NO_POSITION' | 'LOW_ACCURACY' | null;
export interface Position {
    latitude?: number | null;
    longitude?: number | null;
    accuracy?: number | null;
}
export interface SiteGeofence {
    latitude: number;
    longitude: number;
    /** Rayon de couverture, en mètres. */
    radius: number;
}
/**
 * Seuil de précision au-delà duquel une position n'est pas exploitable pour un contrôle de zone.
 *
 * 50 mètres : en deçà, l'incertitude du capteur reste petite devant le rayon d'un site de
 * collecte. Au-delà, conclure « hors zone » ou « dans la zone » relèverait du hasard.
 */
export declare const MAX_USABLE_ACCURACY_METERS = 50;
/** Une position exploitable est-elle disponible ? */
export declare function hasPosition(position: Position | null | undefined): boolean;
/**
 * Distance en mètres entre deux points (formule de haversine).
 *
 * Le rayon terrestre moyen suffit ici : sur les distances en jeu — quelques centaines de
 * mètres — l'écart avec un modèle ellipsoïdal est bien inférieur à la précision du capteur.
 */
export declare function distanceInMeters(fromLat: number, fromLon: number, toLat: number, toLon: number): number;
export interface GeofenceVerdict {
    /** La collecte est-elle enregistrée avec une position considérée comme vérifiée ? */
    isValid: boolean;
    flag: GpsFlag;
    /** Distance au centre du site, quand elle a pu être calculée. */
    distanceMeters?: number;
}
/**
 * Évalue une position au regard du site attendu.
 *
 * **Ne lève jamais.** C'est le point central de la correction : le résultat est un constat de
 * qualité, pas une autorisation. La collecte est enregistrée quoi qu'il arrive.
 *
 * @param site `null` pour une opération sans site : aucune contrainte n'est alors applicable.
 */
export declare function evaluatePosition(position: Position | null | undefined, site: SiteGeofence | null | undefined): GeofenceVerdict;
/**
 * Message destiné à l'enquêteur avant l'ouverture du questionnaire.
 *
 * Renvoie `null` quand la position est conforme : il n'y a alors rien à signaler.
 */
export declare function describeVerdict(verdict: GeofenceVerdict, siteName?: string): string | null;
