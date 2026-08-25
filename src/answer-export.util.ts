import { OTHER_ROW_LABEL_KEY } from './grid-other-row.util';

/**
 * =============================================================================================
 * MISE EN FORME DES RÉPONSES POUR L'EXPORT
 * =============================================================================================
 *
 * LE PROBLÈME
 *
 * L'export écrivait la valeur brute de la réponse dans la cellule. Pour un choix multiple, un
 * classement ou une grille, cette valeur est une chaîne JSON :
 *
 *     "{""r_roka"":{""c_prix"":""1500""},""r_beta"":{""c_prix"":""900""}}"
 *
 * Illisible dans un tableur, et inexploitable sans retraitement — alors que l'export est
 * précisément ce qui doit permettre d'exploiter la collecte.
 *
 * Le problème s'aggrave avec la grille de saisie libre, dont chaque ligne contient désormais
 * une valeur par colonne : sans mise en forme, la cellule devient un objet imbriqué.
 *
 * LE PARTI PRIS
 *
 * Une seule cellule par question, dont le contenu est rendu lisible. Éclater chaque grille en
 * autant de colonnes que de croisements produirait des fichiers à plusieurs centaines de
 * colonnes, dont la plupart vides — et rendrait l'en-tête dépendant du questionnaire, donc
 * instable d'une version à l'autre.
 *
 * ---------------------------------------------------------------------------------------------
 * Module SANS DÉPENDANCE : exécutable et testable isolément.
 * =============================================================================================
 */

export interface ExportRow {
  id: string;
  label?: string | null;
  isOther?: boolean | null;
}

export interface ExportColumn {
  id: string;
  label?: string | null;
  value?: string | null;
}

export interface ExportQuestionStructure {
  rows?: ExportRow[];
  columns?: ExportColumn[];
  /** Options d'une question à choix, pour retrouver un libellé à partir d'une valeur. */
  options?: Array<{ value: string; text: string }>;
}

/** Libellé lisible d'une ligne, en tenant compte d'une ligne « Autre » renseignée. */
function rowLabel(row: ExportRow, rawRow: unknown): string {
  if (row.isOther && rawRow && typeof rawRow === 'object' && !Array.isArray(rawRow)) {
    const typed = (rawRow as Record<string, unknown>)[OTHER_ROW_LABEL_KEY];
    if (typeof typed === 'string' && typed.trim().length > 0) return typed.trim();
  }
  return (row.label ?? '').trim() || row.id;
}

/** Libellé d'une colonne à partir de la valeur enregistrée. */
function columnLabel(columns: ExportColumn[], storedValue: string): string {
  const match = columns.find(
    (column) => (column.value ?? '').trim() === storedValue || column.id === storedValue,
  );
  return match ? (match.label ?? '').trim() || storedValue : storedValue;
}

/** Libellé d'une option à partir de la valeur enregistrée. */
function optionLabel(
  options: Array<{ value: string; text: string }> | undefined,
  storedValue: string,
): string {
  const match = options?.find((option) => option.value === storedValue);
  return match ? match.text : storedValue;
}

/**
 * Rend une réponse lisible pour un tableur.
 *
 * Les valeurs enregistrées sont remplacées par leurs LIBELLÉS : un export contenant
 * `option_1` oblige à consulter le questionnaire pour être compris, ce qui lui retire une
 * bonne part de son intérêt.
 *
 * Une valeur sans libellé correspondant est conservée telle quelle plutôt qu'effacée : mieux
 * vaut une donnée brute qu'une case vide.
 */
export function formatAnswerForExport(
  rawValue: unknown,
  structure: ExportQuestionStructure = {},
): string {
  if (rawValue === null || rawValue === undefined) return '';

  const text = String(rawValue).trim();
  if (text.length === 0) return '';

  // Réponse simple : rien à décoder, hormis la traduction éventuelle en libellé.
  if (!text.startsWith('{') && !text.startsWith('[')) {
    return optionLabel(structure.options, text);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Valeur illisible : on la restitue brute plutôt que de perdre la donnée.
    return text;
  }

  // Choix multiple ou classement : liste de valeurs.
  if (Array.isArray(parsed)) {
    return parsed.map((entry) => optionLabel(structure.options, String(entry))).join(' ; ');
  }

  if (!parsed || typeof parsed !== 'object') return text;

  // Grille : une entrée par ligne.
  const grid = parsed as Record<string, unknown>;
  const rows = structure.rows ?? [];
  const columns = structure.columns ?? [];

  const parts: string[] = [];

  // On parcourt les lignes DÉCLARÉES, pour que l'ordre du fichier suive celui du
  // questionnaire plutôt que l'ordre de saisie.
  const orderedKeys = rows.length > 0 ? rows.map((row) => row.id) : Object.keys(grid);

  for (const key of orderedKeys) {
    const rawRow = grid[key];
    if (rawRow === undefined || rawRow === null) continue;

    const row = rows.find((candidate) => candidate.id === key) ?? { id: key };
    const label = rowLabel(row, rawRow);

    // Grille à choix multiples : plusieurs colonnes cochées.
    if (Array.isArray(rawRow)) {
      if (rawRow.length === 0) continue;
      parts.push(`${label} : ${rawRow.map((v) => columnLabel(columns, String(v))).join(', ')}`);
      continue;
    }

    // Grille de saisie libre : une valeur par colonne.
    if (typeof rawRow === 'object') {
      const cells = Object.entries(rawRow as Record<string, unknown>).filter(
        ([cellKey]) => cellKey !== OTHER_ROW_LABEL_KEY,
      );

      const rendered = cells
        .filter(([, value]) => String(value ?? '').trim().length > 0)
        .map(([cellKey, value]) => {
          const column = columns.find((candidate) => candidate.id === cellKey);
          const name = column ? (column.label ?? '').trim() || cellKey : cellKey;

          if (Array.isArray(value)) {
            return `${name}=${value.map((v) => columnLabel(columns, String(v))).join(', ')}`;
          }
          return `${name}=${String(value)}`;
        });

      if (rendered.length === 0) continue;
      parts.push(`${label} : ${rendered.join(' | ')}`);
      continue;
    }

    // Grille à choix simple : une seule colonne par ligne.
    const value = String(rawRow).trim();
    if (value.length === 0) continue;
    parts.push(`${label} : ${columnLabel(columns, value)}`);
  }

  return parts.join(' ; ');
}
