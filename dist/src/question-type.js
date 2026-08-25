"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionType = void 0;
/**
 * Types de questions, redéclarés ici SANS dépendre de Prisma.
 *
 * Le paquet partagé est consommé par React Native, où `@prisma/client` n'a rien à faire :
 * il embarque un moteur de requêtes, des binaires natifs et une connexion à la base. Cette
 * énumération doit rester alignée sur `schema.prisma` — c'est le prix à payer pour que le
 * mobile puisse évaluer les mêmes règles que l'API.
 */
var QuestionType;
(function (QuestionType) {
    QuestionType["SHORT_TEXT"] = "SHORT_TEXT";
    QuestionType["LONG_TEXT"] = "LONG_TEXT";
    QuestionType["NUMBER"] = "NUMBER";
    QuestionType["DECIMAL"] = "DECIMAL";
    QuestionType["EMAIL"] = "EMAIL";
    QuestionType["PHONE"] = "PHONE";
    QuestionType["URL"] = "URL";
    QuestionType["DATE"] = "DATE";
    QuestionType["TIME"] = "TIME";
    QuestionType["DATETIME"] = "DATETIME";
    QuestionType["SINGLE_CHOICE"] = "SINGLE_CHOICE";
    QuestionType["MULTIPLE_CHOICE"] = "MULTIPLE_CHOICE";
    QuestionType["DROPDOWN"] = "DROPDOWN";
    QuestionType["SLIDER"] = "SLIDER";
    QuestionType["STAR"] = "STAR";
    QuestionType["NPS"] = "NPS";
    QuestionType["RANKING"] = "RANKING";
    QuestionType["GRID_SINGLE"] = "GRID_SINGLE";
    QuestionType["GRID_MULTIPLE"] = "GRID_MULTIPLE";
    QuestionType["GRID_LIKERT"] = "GRID_LIKERT";
    QuestionType["GRID_TEXT"] = "GRID_TEXT";
    QuestionType["CALCULATED"] = "CALCULATED";
    QuestionType["PHOTO"] = "PHOTO";
    QuestionType["FILE"] = "FILE";
    QuestionType["AUDIO"] = "AUDIO";
    QuestionType["VIDEO"] = "VIDEO";
    QuestionType["SIGNATURE"] = "SIGNATURE";
    QuestionType["GPS"] = "GPS";
    QuestionType["INFO_TEXT"] = "INFO_TEXT";
    QuestionType["DISPLAY_IMAGE"] = "DISPLAY_IMAGE";
    QuestionType["BARCODE"] = "BARCODE";
})(QuestionType || (exports.QuestionType = QuestionType = {}));
