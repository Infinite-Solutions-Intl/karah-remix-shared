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
export const OTHER_ROW_LABEL_KEY = '__label';

export interface GridRowDefinition {
  id: string;
  label?: string | null;
  /** Ligne dont le libellé est saisi par le répondant. */
  isOther?: boolean | null;
  /** Invite affichée dans le champ de saisie libre. */
  otherPlaceholder?: string | null;
}

/** La ligne attend-elle un libellé du répondant ? */
export function isOtherRow(row: GridRowDefinition): boolean {
  return row.isOther === true;
}

/**
 * Libellé saisi par le répondant pour une ligne « Autre ».
 *
 * Renvoie une chaîne vide tant que rien n'a été saisi — jamais `undefined`, pour que le champ
 * reste contrôlé côté React.
 */
export function readOtherLabel(rawRow: unknown): string {
  if (!rawRow || typeof rawRow !== 'object' || Array.isArray(rawRow)) return '';

  const value = (rawRow as Record<string, unknown>)[OTHER_ROW_LABEL_KEY];
  return typeof value === 'string' ? value : '';
}

/**
 * Écrit le libellé saisi et renvoie le contenu complet de la ligne.
 *
 * Un libellé vidé est supprimé plutôt que conservé en chaîne vide : une ligne « Autre » sans
 * libellé ne doit pas compter comme renseignée.
 */
export function writeOtherLabel(rawRow: unknown, label: string): Record<string, unknown> {
  const row: Record<string, unknown> =
    rawRow && typeof rawRow === 'object' && !Array.isArray(rawRow)
      ? { ...(rawRow as Record<string, unknown>) }
      : {};

  if (label.trim().length === 0) delete row[OTHER_ROW_LABEL_KEY];
  else row[OTHER_ROW_LABEL_KEY] = label;

  return row;
}

/** Contenu d'une ligne débarrassé du libellé « Autre », pour ne traiter que les colonnes. */
export function stripOtherLabel(rawRow: unknown): Record<string, unknown> {
  if (!rawRow || typeof rawRow !== 'object' || Array.isArray(rawRow)) return {};

  const { [OTHER_ROW_LABEL_KEY]: _label, ...rest } = rawRow as Record<string, unknown>;
  return rest;
}

/**
 * Libellé à afficher pour une ligne, et à employer dans les exports.
 *
 * Pour une ligne « Autre » renseignée, c'est le texte du répondant : c'est lui l'information.
 * Sans saisie, on retombe sur le libellé du concepteur — « Autre marque » — plutôt que sur un
 * vide qui rendrait la colonne d'export incompréhensible.
 */
export function resolveRowLabel(row: GridRowDefinition, rawRow: unknown): string {
  if (isOtherRow(row)) {
    const typed = readOtherLabel(rawRow).trim();
    if (typed.length > 0) return typed;
  }

  return (row.label ?? '').trim() || row.id;
}

/**
 * Une ligne « Autre » cochée sans libellé est-elle incomplète ?
 *
 * C'est le seul contrôle propre à ces lignes : cocher « Spontané » sur « Autre marque » sans
 * préciser laquelle produit une donnée inexploitable — on sait qu'une marque existe, jamais
 * laquelle.
 */
export function isOtherRowIncomplete(row: GridRowDefinition, rawRow: unknown): boolean {
  if (!isOtherRow(row)) return false;

  const hasSelection = Object.values(stripOtherLabel(rawRow)).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return typeof value === 'string' && value.trim().length > 0;
  });

  return hasSelection && readOtherLabel(rawRow).trim().length === 0;
}
