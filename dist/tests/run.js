"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Lanceur des tests du paquet partagé.
 *
 * Volontairement sans dépendance : ajouter Jest ou Vitest ici obligerait chaque consommateur —
 * dont React Native — à composer avec cet outillage. Un simple fichier exécutable par Node
 * tourne partout, et c'est tout ce dont ces modules ont besoin.
 */
require("./schedule.test");
require("./password.test");
