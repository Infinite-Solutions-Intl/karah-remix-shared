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
export const MAX_USABLE_ACCURACY_METERS = 50;

/** Une position exploitable est-elle disponible ? */
export function hasPosition(position: Position | null | undefined): boolean {
  return (
    !!position &&
    typeof position.latitude === 'number' &&
    typeof position.longitude === 'number' &&
    Number.isFinite(position.latitude) &&
    Number.isFinite(position.longitude)
  );
}

/**
 * Distance en mètres entre deux points (formule de haversine).
 *
 * Le rayon terrestre moyen suffit ici : sur les distances en jeu — quelques centaines de
 * mètres — l'écart avec un modèle ellipsoïdal est bien inférieur à la précision du capteur.
 */
export function distanceInMeters(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): number {
  const EARTH_RADIUS = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const deltaLat = toRadians(toLat - fromLat);
  const deltaLon = toRadians(toLon - fromLon);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(deltaLon / 2) ** 2;

  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(a)));
}

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
export function evaluatePosition(
  position: Position | null | undefined,
  site: SiteGeofence | null | undefined,
): GeofenceVerdict {
  // Opération sans site : rien à vérifier. Une position absente n'est pas une anomalie.
  if (!site) {
    return { isValid: true, flag: null };
  }

  if (!hasPosition(position)) {
    // L'enquêteur a refusé la géolocalisation, ou le capteur n'a rien renvoyé. La collecte
    // reste recevable, mais rien ne permet d'affirmer qu'elle a eu lieu sur le site.
    return { isValid: false, flag: 'NO_POSITION' };
  }

  const accuracy = position!.accuracy;
  if (typeof accuracy === 'number' && accuracy > MAX_USABLE_ACCURACY_METERS) {
    // Position trop imprécise pour trancher : on ne conclut pas « hors zone », ce qui serait
    // une accusation infondée, mais on signale que la vérification n'a pas pu aboutir.
    return { isValid: false, flag: 'LOW_ACCURACY' };
  }

  const distance = distanceInMeters(
    position!.latitude as number,
    position!.longitude as number,
    site.latitude,
    site.longitude,
  );

  if (distance > site.radius) {
    return { isValid: false, flag: 'OUT_OF_ZONE', distanceMeters: Math.round(distance) };
  }

  return { isValid: true, flag: null, distanceMeters: Math.round(distance) };
}

/**
 * Message destiné à l'enquêteur avant l'ouverture du questionnaire.
 *
 * Renvoie `null` quand la position est conforme : il n'y a alors rien à signaler.
 */
export function describeVerdict(verdict: GeofenceVerdict, siteName?: string): string | null {
  switch (verdict.flag) {
    case 'OUT_OF_ZONE':
      return (
        `Vous n'êtes pas dans le périmètre${siteName ? ` du site « ${siteName} »` : ''}` +
        (verdict.distanceMeters ? ` (${verdict.distanceMeters} m du centre)` : '') +
        '. Vous pouvez continuer, la collecte sera signalée comme non vérifiée.'
      );
    case 'NO_POSITION':
      return (
        "Votre position n'a pas pu être déterminée. Vous pouvez continuer, la collecte sera " +
        'signalée comme non vérifiée.'
      );
    case 'LOW_ACCURACY':
      return (
        `Le signal GPS est trop imprécis (plus de ${MAX_USABLE_ACCURACY_METERS} m). ` +
        "Attendez un meilleur signal, ou continuez : la collecte sera signalée comme non vérifiée."
      );
    default:
      return null;
  }
}
