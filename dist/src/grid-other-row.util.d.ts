/**
 * =============================================================================================
 * LIGNE « AUTRE » SUR UNE GRILLE
 * =============================================================================================
 *
 * LE BESOIN
 *
 * L'option « Autre » existait sur les questions à choix simple et multiple, mais pas sur les
 * grilles — alors que c'est là qu'elle manque le plus. Le cas typique :
 *
 *     Quelles marques connaissez-vous ?        Spontané   Assisté
 *       ROKA                                      ☐          ☐
 *       Blue Band                                 ☐          ☐
 *       Autre marque : ______________             ☐          ☐
 *
 * Sans cette ligne, une marque non répertoriée ne peut tout simplement pas être saisie : la
 * donnée est perdue au moment même où elle est la plus intéressante, puisqu'elle échappe à la
 * liste prévue.
 *
 * LE MODÈLE RETENU
 *
 * Une ligne « Autre » est une ligne ordinaire portant `isOther: true`. Elle se comporte comme
 * les autres — mêmes colonnes, mêmes cases à cocher — mais son LIBELLÉ est saisi par le
 * répondant au lieu d'être fixé par le concepteur.
 *
 * Ce choix est délibéré : conserver les colonnes signifie qu'« Autre marque » peut être cochée
 * Spontané ou Assisté comme n'importe quelle autre. Une ligne à part, en simple champ texte,
 * aurait perdu cette information.
 *
 * Le texte saisi est enregistré sous une clé dédiée dans la réponse, à côté des cellules :
 *
 *     { "row_autre": { "__label": "Margarine Dinor", "c_spontane": ["x"] } }
 *
 * Le préfixe `__` évite toute collision avec un identifiant de colonne, qui ne commence jamais
 * par un underscore.
 *
 * ---------------------------------------------------------------------------------------------
 * ⚠️ COPIE CONFORME de `frontend/src/features/public-survey/gridOtherRow.util.ts`.
 * Le formulaire et la validation doivent lire la même donnée de la même façon.
 *
 * Module SANS DÉPENDANCE : exécutable et testable isolément.
 * =============================================================================================
 */
/** Clé sous laquelle le libellé saisi par le répondant est enregistré. */
export declare const OTHER_ROW_LABEL_KEY = "__label";
export interface GridRowDefinition {
    id: string;
    label?: string | null;
    /** Ligne dont le libellé est saisi par le répondant. */
    isOther?: boolean | null;
    /** Invite affichée dans le champ de saisie libre. */
    otherPlaceholder?: string | null;
}
/** La ligne attend-elle un libellé du répondant ? */
export declare function isOtherRow(row: GridRowDefinition): boolean;
/**
 * Libellé saisi par le répondant pour une ligne « Autre ».
 *
 * Renvoie une chaîne vide tant que rien n'a été saisi — jamais `undefined`, pour que le champ
 * reste contrôlé côté React.
 */
export declare function readOtherLabel(rawRow: unknown): string;
/**
 * Écrit le libellé saisi et renvoie le contenu complet de la ligne.
 *
 * Un libellé vidé est supprimé plutôt que conservé en chaîne vide : une ligne « Autre » sans
 * libellé ne doit pas compter comme renseignée.
 */
export declare function writeOtherLabel(rawRow: unknown, label: string): Record<string, unknown>;
/** Contenu d'une ligne débarrassé du libellé « Autre », pour ne traiter que les colonnes. */
export declare function stripOtherLabel(rawRow: unknown): Record<string, unknown>;
/**
 * Libellé à afficher pour une ligne, et à employer dans les exports.
 *
 * Pour une ligne « Autre » renseignée, c'est le texte du répondant : c'est lui l'information.
 * Sans saisie, on retombe sur le libellé du concepteur — « Autre marque » — plutôt que sur un
 * vide qui rendrait la colonne d'export incompréhensible.
 */
export declare function resolveRowLabel(row: GridRowDefinition, rawRow: unknown): string;
/**
 * Une ligne « Autre » cochée sans libellé est-elle incomplète ?
 *
 * C'est le seul contrôle propre à ces lignes : cocher « Spontané » sur « Autre marque » sans
 * préciser laquelle produit une donnée inexploitable — on sait qu'une marque existe, jamais
 * laquelle.
 */
export declare function isOtherRowIncomplete(row: GridRowDefinition, rawRow: unknown): boolean;
