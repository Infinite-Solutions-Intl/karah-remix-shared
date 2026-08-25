"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeVerdict = exports.hasPosition = exports.evaluatePosition = exports.distanceInMeters = exports.MAX_USABLE_ACCURACY_METERS = void 0;
/* ------------------------------------------------- Sécurité */
__exportStar(require("./password-policy.util"), exports);
/* ------------------------------------------------- Types partagés */
__exportStar(require("./question-type"), exports);
/* ------------------------------------------------- Logique conditionnelle */
__exportStar(require("./global-logic.util"), exports);
__exportStar(require("./conditional-rules.util"), exports);
__exportStar(require("./jump-engine.util"), exports);
/* ------------------------------------------------- Réponses et comparaisons */
__exportStar(require("./multi-value-answer.util"), exports);
__exportStar(require("./grid-column-value.util"), exports);
__exportStar(require("./grid-other-row.util"), exports);
/* ------------------------------------------------- Calculs */
__exportStar(require("./formula.util"), exports);
__exportStar(require("./calculated-answer.util"), exports);
/* ------------------------------------------------- Collecte */
__exportStar(require("./collection-schedule.util"), exports);
__exportStar(require("./submission-status.util"), exports);
/*
 * `geofence` et `jump-engine` exportent tous deux un type `Position`, avec des sens
 * différents — coordonnées géographiques d'un côté, rang d'une question de l'autre. Le
 * réexport est donc explicite, et le type géographique renommé pour lever l'ambiguïté chez
 * les consommateurs.
 */
var geofence_util_1 = require("./geofence.util");
Object.defineProperty(exports, "MAX_USABLE_ACCURACY_METERS", { enumerable: true, get: function () { return geofence_util_1.MAX_USABLE_ACCURACY_METERS; } });
Object.defineProperty(exports, "distanceInMeters", { enumerable: true, get: function () { return geofence_util_1.distanceInMeters; } });
Object.defineProperty(exports, "evaluatePosition", { enumerable: true, get: function () { return geofence_util_1.evaluatePosition; } });
Object.defineProperty(exports, "hasPosition", { enumerable: true, get: function () { return geofence_util_1.hasPosition; } });
Object.defineProperty(exports, "describeVerdict", { enumerable: true, get: function () { return geofence_util_1.describeVerdict; } });
/* ------------------------------------------------- Exploitation */
__exportStar(require("./answer-export.util"), exports);
__exportStar(require("./version-remap.util"), exports);
