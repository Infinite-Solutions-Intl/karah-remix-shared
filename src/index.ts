/**
 * =============================================================================================
 * @karah/shared — MOTEUR COMMUN À L'API, AU WEB ET AU MOBILE
 * =============================================================================================
 *
 * POURQUOI CE PAQUET EXISTE
 *
 * Le même questionnaire est évalué à trois endroits : le serveur qui valide, le formulaire web
 * qui affiche, l'application mobile qui collecte hors ligne. Tant que chacun portait sa propre
 * copie des règles, elles divergeaient — et ce projet en a fait les frais plusieurs fois :
 *
 *   - une condition lue sous une forme par le client et sous une autre par le serveur, si bien
 *     qu'aucune règle globale n'était appliquée ;
 *   - un `??` au lieu d'un `||` sur une valeur de colonne, qui rendait le contrôle serveur
 *     incompatible avec ce que l'interface envoyait ;
 *   - un opérateur logique par défaut différent de part et d'autre.
 *
 * Chacun de ces défauts venait de la même cause : deux copies d'une règle finissent toujours
 * par diverger. Ce paquet supprime la cause.
 *
 * COMMENT L'EMPLOYER
 *
 *   1. `pnpm build` ici, puis dans chaque projet :
 *      `pnpm add file:../karah-shared`  (ou un registre privé si vous en avez un)
 *   2. Remplacer les copies locales par des imports depuis `@karah/shared`.
 *
 * RÈGLE À TENIR
 *
 * Ce paquet ne dépend de RIEN — ni Prisma, ni NestJS, ni React, ni aucune API de navigateur.
 * C'est ce qui lui permet de tourner dans Node, dans un navigateur et dans React Native. Toute
 * dépendance ajoutée ici casserait l'un des trois, souvent sans erreur de compilation : la
 * panne n'apparaîtrait qu'à l'exécution, sur l'appareil d'un enquêteur.
 * =============================================================================================
 */

/* ------------------------------------------------- Sécurité */
export * from './password-policy.util';

/* ------------------------------------------------- Types partagés */
export * from './question-type';

/* ------------------------------------------------- Logique conditionnelle */
export * from './global-logic.util';
export * from './conditional-rules.util';
export * from './jump-engine.util';

/* ------------------------------------------------- Réponses et comparaisons */
export * from './multi-value-answer.util';
export * from './grid-column-value.util';
export * from './grid-other-row.util';

/* ------------------------------------------------- Calculs */
export * from './formula.util';
export * from './calculated-answer.util';

/* ------------------------------------------------- Collecte */
export * from './collection-schedule.util';
export * from './submission-status.util';

/*
 * `geofence` et `jump-engine` exportent tous deux un type `Position`, avec des sens
 * différents — coordonnées géographiques d'un côté, rang d'une question de l'autre. Le
 * réexport est donc explicite, et le type géographique renommé pour lever l'ambiguïté chez
 * les consommateurs.
 */
export {
  MAX_USABLE_ACCURACY_METERS,
  distanceInMeters,
  evaluatePosition,
  hasPosition,
  describeVerdict,
} from './geofence.util';
export type {
  GpsFlag,
  SiteGeofence,
  GeofenceVerdict,
  Position as GeoPosition,
} from './geofence.util';

/* ------------------------------------------------- Exploitation */
export * from './answer-export.util';
export * from './version-remap.util';
