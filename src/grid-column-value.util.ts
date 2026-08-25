/**
 * =============================================================================================
 * VALEUR EFFECTIVE D'UNE COLONNE DE GRILLE
 * =============================================================================================
 *
 * LE BUG CORRIGÉ
 *
 * Le code écrivait partout `col.value ?? col.label`. L'opérateur `??` ne bascule que sur `null`
 * et `undefined` — **pas sur la chaîne vide**. Or une colonne créée dans l'éditeur naît avec
 * `value: ''`, et ce vide n'était jamais remplacé si le concepteur ne renseignait que le
 * libellé.
 *
 * Conséquences en cascade, toutes constatées lors des tests :
 *
 *   1. Toutes les colonnes sans valeur partageaient la même valeur effective : `''`. Cliquer
 *      sur l'une cochait visuellement les autres — d'où la « sélection incorrecte au
 *      chargement / au premier clic » sur les questions de type échelle.
 *
 *   2. Sur une grille à réponses multiples, la case cochée valait `''` pour plusieurs colonnes.
 *      Le tableau des sélections accumulait alors des valeurs indiscernables, et le contrôle
 *      « maximum N par ligne » se déclenchait sur une ligne que le répondant croyait
 *      correctement remplie.
 *
 *   3. Les réponses enregistrées contenaient `""` au lieu du libellé : inexploitables à
 *      l'analyse.
 *
 * LA CORRECTION
 *
 * Une seule fonction, partagée par le formulaire, l'éditeur et la validation serveur. Le
 * repli se fait sur toute valeur vide, pas seulement sur `null`.
 *
 * ---------------------------------------------------------------------------------------------
 * ⚠️ COPIE CONFORME de `frontend/src/features/public-survey/gridColumnValue.util.ts`.
 * Le formulaire et la validation doivent résoudre la même valeur, sinon le serveur refuse une
 * réponse que l'interface présentait comme correcte.
 *
 * Module SANS DÉPENDANCE : exécutable et testable isolément.
 * =============================================================================================
 */

export interface GridColumnLike {
  id?: string;
  label?: string | null;
  value?: string | null;
}

/**
 * Valeur réellement enregistrée quand cette colonne est cochée.
 *
 * Ordre de repli : la valeur explicite, puis le libellé, puis l'identifiant. Ce dernier recours
 * évite qu'une colonne mal configurée produise une réponse vide — indiscernable des autres, et
 * inexploitable à l'analyse.
 */
export function resolveColumnValue(column: GridColumnLike): string {
  const value = typeof column.value === 'string' ? column.value.trim() : '';
  if (value.length > 0) return value;

  const label = typeof column.label === 'string' ? column.label.trim() : '';
  if (label.length > 0) return label;

  return column.id ?? '';
}

/**
 * Détecte les colonnes qui produiraient la même valeur enregistrée.
 *
 * Deux colonnes indiscernables rendent les réponses ambiguës : impossible de savoir laquelle a
 * été cochée. Le contrôle porte sur la valeur EFFECTIVE, donc après repli — c'est précisément
 * ce que l'ancien contrôle manquait, puisqu'il comparait des valeurs brutes toutes vides.
 */
export function findDuplicateColumnValues(columns: GridColumnLike[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const column of columns) {
    const value = resolveColumnValue(column).toLowerCase();
    if (value.length === 0) continue;
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  return [...duplicates];
}

/** Détecte les colonnes portant le même LIBELLÉ, sources de confusion à l'affichage. */
export function findDuplicateColumnLabels(columns: GridColumnLike[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const column of columns) {
    const label = (column.label ?? '').trim().toLowerCase();
    if (label.length === 0) continue;
    if (seen.has(label)) duplicates.add(label);
    seen.add(label);
  }

  return [...duplicates];
}

/**
 * Une case supplémentaire peut-elle être cochée sur cette ligne ?
 *
 * L'interface laissait cocher sans limite, et seul le serveur refusait — après coup, à l'envoi,
 * pour une question que le répondant croyait correctement remplie. Mieux vaut empêcher le geste
 * que le sanctionner.
 *
 * @param maxPerRow `undefined` = aucune limite
 */
export function canSelectMore(
  currentSelection: unknown,
  maxPerRow: number | undefined | null,
): boolean {
  if (maxPerRow === undefined || maxPerRow === null) return true;

  const count = Array.isArray(currentSelection) ? currentSelection.length : 0;
  return count < maxPerRow;
}
