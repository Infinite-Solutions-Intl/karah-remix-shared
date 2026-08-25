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
    options?: Array<{
        value: string;
        text: string;
    }>;
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
export declare function formatAnswerForExport(rawValue: unknown, structure?: ExportQuestionStructure): string;
