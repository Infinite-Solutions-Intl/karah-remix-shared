"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatAnswerForExport = formatAnswerForExport;
const grid_other_row_util_1 = require("./grid-other-row.util");
/** Libellé lisible d'une ligne, en tenant compte d'une ligne « Autre » renseignée. */
function rowLabel(row, rawRow) {
    var _a;
    if (row.isOther && rawRow && typeof rawRow === 'object' && !Array.isArray(rawRow)) {
        const typed = rawRow[grid_other_row_util_1.OTHER_ROW_LABEL_KEY];
        if (typeof typed === 'string' && typed.trim().length > 0)
            return typed.trim();
    }
    return ((_a = row.label) !== null && _a !== void 0 ? _a : '').trim() || row.id;
}
/** Libellé d'une colonne à partir de la valeur enregistrée. */
function columnLabel(columns, storedValue) {
    var _a;
    const match = columns.find((column) => { var _a; return ((_a = column.value) !== null && _a !== void 0 ? _a : '').trim() === storedValue || column.id === storedValue; });
    return match ? ((_a = match.label) !== null && _a !== void 0 ? _a : '').trim() || storedValue : storedValue;
}
/** Libellé d'une option à partir de la valeur enregistrée. */
function optionLabel(options, storedValue) {
    const match = options === null || options === void 0 ? void 0 : options.find((option) => option.value === storedValue);
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
function formatAnswerForExport(rawValue, structure = {}) {
    var _a, _b, _c;
    if (rawValue === null || rawValue === undefined)
        return '';
    const text = String(rawValue).trim();
    if (text.length === 0)
        return '';
    // Réponse simple : rien à décoder, hormis la traduction éventuelle en libellé.
    if (!text.startsWith('{') && !text.startsWith('[')) {
        return optionLabel(structure.options, text);
    }
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch {
        // Valeur illisible : on la restitue brute plutôt que de perdre la donnée.
        return text;
    }
    // Choix multiple ou classement : liste de valeurs.
    if (Array.isArray(parsed)) {
        return parsed.map((entry) => optionLabel(structure.options, String(entry))).join(' ; ');
    }
    if (!parsed || typeof parsed !== 'object')
        return text;
    // Grille : une entrée par ligne.
    const grid = parsed;
    const rows = (_a = structure.rows) !== null && _a !== void 0 ? _a : [];
    const columns = (_b = structure.columns) !== null && _b !== void 0 ? _b : [];
    const parts = [];
    // On parcourt les lignes DÉCLARÉES, pour que l'ordre du fichier suive celui du
    // questionnaire plutôt que l'ordre de saisie.
    const orderedKeys = rows.length > 0 ? rows.map((row) => row.id) : Object.keys(grid);
    for (const key of orderedKeys) {
        const rawRow = grid[key];
        if (rawRow === undefined || rawRow === null)
            continue;
        const row = (_c = rows.find((candidate) => candidate.id === key)) !== null && _c !== void 0 ? _c : { id: key };
        const label = rowLabel(row, rawRow);
        // Grille à choix multiples : plusieurs colonnes cochées.
        if (Array.isArray(rawRow)) {
            if (rawRow.length === 0)
                continue;
            parts.push(`${label} : ${rawRow.map((v) => columnLabel(columns, String(v))).join(', ')}`);
            continue;
        }
        // Grille de saisie libre : une valeur par colonne.
        if (typeof rawRow === 'object') {
            const cells = Object.entries(rawRow).filter(([cellKey]) => cellKey !== grid_other_row_util_1.OTHER_ROW_LABEL_KEY);
            const rendered = cells
                .filter(([, value]) => String(value !== null && value !== void 0 ? value : '').trim().length > 0)
                .map(([cellKey, value]) => {
                var _a;
                const column = columns.find((candidate) => candidate.id === cellKey);
                const name = column ? ((_a = column.label) !== null && _a !== void 0 ? _a : '').trim() || cellKey : cellKey;
                if (Array.isArray(value)) {
                    return `${name}=${value.map((v) => columnLabel(columns, String(v))).join(', ')}`;
                }
                return `${name}=${String(value)}`;
            });
            if (rendered.length === 0)
                continue;
            parts.push(`${label} : ${rendered.join(' | ')}`);
            continue;
        }
        // Grille à choix simple : une seule colonne par ligne.
        const value = String(rawRow).trim();
        if (value.length === 0)
            continue;
        parts.push(`${label} : ${columnLabel(columns, value)}`);
    }
    return parts.join(' ; ');
}
