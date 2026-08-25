/**
 * Types de questions, redéclarés ici SANS dépendre de Prisma.
 *
 * Le paquet partagé est consommé par React Native, où `@prisma/client` n'a rien à faire :
 * il embarque un moteur de requêtes, des binaires natifs et une connexion à la base. Cette
 * énumération doit rester alignée sur `schema.prisma` — c'est le prix à payer pour que le
 * mobile puisse évaluer les mêmes règles que l'API.
 */
export enum QuestionType {
  SHORT_TEXT = 'SHORT_TEXT',
  LONG_TEXT = 'LONG_TEXT',
  NUMBER = 'NUMBER',
  DECIMAL = 'DECIMAL',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  URL = 'URL',
  DATE = 'DATE',
  TIME = 'TIME',
  DATETIME = 'DATETIME',
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  DROPDOWN = 'DROPDOWN',
  SLIDER = 'SLIDER',
  STAR = 'STAR',
  NPS = 'NPS',
  RANKING = 'RANKING',
  GRID_SINGLE = 'GRID_SINGLE',
  GRID_MULTIPLE = 'GRID_MULTIPLE',
  GRID_LIKERT = 'GRID_LIKERT',
  GRID_TEXT = 'GRID_TEXT',
  CALCULATED = 'CALCULATED',
  PHOTO = 'PHOTO',
  FILE = 'FILE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  SIGNATURE = 'SIGNATURE',
  GPS = 'GPS',
  INFO_TEXT = 'INFO_TEXT',
  DISPLAY_IMAGE = 'DISPLAY_IMAGE',
  BARCODE = 'BARCODE',
}
