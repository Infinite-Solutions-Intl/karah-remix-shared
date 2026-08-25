/**
 * =============================================================================================
 * CE QUE CHAQUE STATUT DE SOUMISSION EXIGE
 * =============================================================================================
 *
 * LE BUG CORRIGÉ ICI
 *
 * La complétude des questions obligatoires était vérifiée pour TOUS les statuts sauf
 * `IN_PROGRESS`. Un refus ou un abandon — qui n'a par nature aucune réponse — était donc
 * rejeté au motif qu'une question obligatoire manquait.
 *
 * Conséquence sur le terrain : trois des quatre états terminaux ne se synchronisaient jamais.
 * Seule une collecte intégralement remplie passait. Les refus s'accumulaient indéfiniment dans
 * la file du mobile, et le taux de refus — donnée précieuse pour évaluer la qualité d'un
 * échantillon — n'existait tout simplement pas côté serveur.
 *
 * LE PRINCIPE
 *
 * Exiger des réponses n'a de sens que si l'enquêteur a effectivement pu les poser. Un refus
 * signifie qu'il n'a pas pu ; un abandon, qu'il n'a pas terminé. Dans les deux cas, l'absence
 * de réponse est l'information, pas une erreur.
 *
 * Seul `COMPLETED` affirme « j'ai posé toutes les questions » — c'est donc le seul statut pour
 * lequel la complétude se vérifie.
 *
 * ---------------------------------------------------------------------------------------------
 * Module SANS DÉPENDANCE : exécutable et testable isolément.
 * =============================================================================================
 */

/** Reprise de l'énumération Prisma, sans en dépendre pour rester testable. */
export type SubmissionStatusValue =
  | 'DEGRADED'
  | 'IN_PROGRESS'
  | 'PARTIAL'
  | 'COMPLETED'
  | 'REJECTED'
  | 'VALIDATED'
  | 'CANCELLED';

/**
 * Faut-il exiger une réponse à chaque question obligatoire ?
 *
 * Uniquement pour `COMPLETED`. Tolérer les manques ailleurs viderait ce statut de son sens :
 * on ne pourrait plus distinguer une collecte intégrale d'une collecte à moitié remplie, et
 * les quotas ne voudraient plus rien dire.
 *
 * `VALIDATED` et `REJECTED` sont des décisions de superviseur portant sur une collecte déjà
 * enregistrée : revérifier sa complétude à ce stade empêcherait de rejeter formellement une
 * collecte justement parce qu'elle est incomplète.
 */
export function requiresCompleteAnswers(status: SubmissionStatusValue): boolean {
  return status === 'COMPLETED';
}

/**
 * La soumission compte-t-elle dans le quota atteint d'une affectation ?
 *
 * Un refus ou un abandon est enregistré et exploitable à l'analyse, mais ne constitue pas une
 * collecte réalisée. Le faire compter gonflerait artificiellement l'avancement — un enquêteur
 * pourrait « atteindre » son quota sans avoir recueilli la moindre donnée.
 */
export function countsTowardQuota(status: SubmissionStatusValue): boolean {
  // DEGRADED est volontairement exclu : la collecte n'a subi aucun contrôle, la compter
  // reviendrait à gonfler l'avancement avec des données dont on ignore la validité.
  return status === 'COMPLETED' || status === 'VALIDATED';
}

/**
 * Le parcours est-il terminé ?
 *
 * `IN_PROGRESS` est le seul état repris plus tard : c'est un brouillon que l'enquêteur
 * rouvrira. Tous les autres sont définitifs de son point de vue, même incomplets.
 */
export function isTerminalStatus(status: SubmissionStatusValue): boolean {
  return status !== 'IN_PROGRESS';
}

/**
 * Les réponses fournies doivent-elles être contrôlées (type, format, bornes) ?
 *
 * Toujours — quel que soit le statut. Ne pas exiger de réponse est une chose ; accepter
 * n'importe quoi en est une autre. Une valeur transmise finit dans les exports et les
 * statistiques : si elle est présente, elle doit être correcte.
 */
export function requiresAnswerFormatChecks(): boolean {
  return true;
}
