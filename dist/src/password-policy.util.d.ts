/**
 * =============================================================================================
 * COMPLEXITÉ DES MOTS DE PASSE
 * =============================================================================================
 *
 * Placée dans le paquet partagé pour une raison précise : la règle doit être **identique** à
 * l'écran et au serveur. Une politique plus stricte côté serveur produit un refus incompréhensible
 * après une saisie que l'interface avait validée ; l'inverse laisse passer des mots de passe que
 * l'interface prétendait exiger.
 *
 * POURQUOI PAS UNE SEULE EXPRESSION RÉGULIÈRE
 *
 * Une regex unique répond « non » sans dire pourquoi. Chaque exigence est donc vérifiée
 * séparément, pour que l'utilisateur sache **ce qui manque** — il faut sinon deviner, et l'on
 * finit par abandonner ou par choisir un mot de passe plus faible mais accepté par tâtonnement.
 *
 * ---------------------------------------------------------------------------------------------
 * Module SANS DÉPENDANCE : exécutable dans Node, dans un navigateur et dans React Native.
 * =============================================================================================
 */
/** Longueur minimale exigée. */
export declare const PASSWORD_MIN_LENGTH = 8;
/**
 * Longueur maximale.
 *
 * bcrypt ignore silencieusement tout ce qui dépasse 72 octets : accepter davantage donnerait
 * l'illusion d'un mot de passe plus long qu'il ne l'est réellement.
 */
export declare const PASSWORD_MAX_LENGTH = 72;
/**
 * Expression régulière équivalente, pour les cas où une seule règle est nécessaire —
 * décorateur `@Matches`, attribut `pattern` d'un champ HTML.
 *
 * Elle exprime la même chose que les contrôles individuels ci-dessous, mais sans pouvoir dire
 * ce qui manque. À réserver aux endroits qui ne peuvent pas afficher de détail.
 */
export declare const PASSWORD_PATTERN: RegExp;
export interface PasswordRequirement {
    /** Identifiant stable, utilisable comme clé de traduction. */
    key: 'length' | 'lowercase' | 'uppercase' | 'digit' | 'special' | 'different';
    label: string;
    satisfied: boolean;
}
export interface PasswordCheckResult {
    isValid: boolean;
    requirements: PasswordRequirement[];
    /** Exigences non satisfaites, pour un message concis. */
    missing: string[];
}
/**
 * Vérifie un mot de passe, exigence par exigence.
 *
 * @param previousPassword ancien mot de passe EN CLAIR, quand il est connu — cas d'un
 *        changement où l'utilisateur saisit les deux. Absent lors d'une réinitialisation, où
 *        l'ancien n'est jamais transmis : la comparaison se fait alors côté serveur, contre
 *        l'empreinte stockée.
 */
export declare function checkPasswordStrength(password: string, previousPassword?: string | null): PasswordCheckResult;
/**
 * Message d'erreur unique, pour les contextes qui n'affichent pas le détail.
 *
 * `null` quand le mot de passe convient.
 */
export declare function describePasswordProblems(password: string, previousPassword?: string | null): string | null;
/**
 * Indicateur de robustesse, de 0 à 4.
 *
 * Purement indicatif — il ne conditionne rien. Un mot de passe conforme est accepté quel que
 * soit son score : ajouter un seuil caché contredirait les exigences affichées, ce qui est
 * exactement ce que cette interface cherche à éviter.
 */
export declare function estimatePasswordScore(password: string): number;
