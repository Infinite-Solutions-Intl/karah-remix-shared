# @karah/shared

Moteur de validation, de logique conditionnelle et de règles de collecte, **partagé par les
trois parties de la plateforme** : l'API (NestJS), le web (React) et le mobile (React Native).

---

## Pourquoi ce paquet existe

Le même questionnaire est évalué à trois endroits : le serveur qui **valide**, le formulaire web
qui **affiche**, l'application mobile qui **collecte hors ligne**.

Tant que chacun portait sa propre copie des règles, elles divergeaient. Ce projet en a fait les
frais à plusieurs reprises :

- une condition globale lue sous une forme par le client et sous une autre par le serveur — si
  bien qu'**aucune règle globale n'était appliquée** sur le formulaire public ;
- un `??` au lieu d'un `||` sur une valeur de colonne, qui rendait le contrôle serveur
  incompatible avec ce que l'interface envoyait ;
- un opérateur logique par défaut différent de part et d'autre, faisant l'inverse de ce que
  l'écran annonçait.

Chacun venait de la même cause : **deux copies d'une règle finissent toujours par diverger.**

---

## Installation

```bash
# Dans ce dossier
pnpm install && pnpm build

# Dans chaque projet consommateur
pnpm add file:../karah-shared
```

Un registre privé (npm, GitHub Packages, Verdaccio) est préférable dès que le mobile est
développé sur un autre poste : `file:` suppose une arborescence partagée.

---

## Utilisation

```ts
import {
  evaluateSchedule,       // la collecte est-elle ouverte ?
  evaluateFormula,        // champs calculés
  answerContains,         // comparaison sur réponses à valeurs multiples
  evaluatePosition,       // contrôle de zone GPS
  requiresCompleteAnswers,// la complétude est-elle exigée pour ce statut ?
  readGlobalRules,        // lecture de la logique, quelle que soit sa forme en base
} from '@karah/shared';
```

### Exemple : afficher la même chose que ce que le serveur validera

```ts
const verdict = evaluateSchedule(operation);
if (!verdict.isOpen) {
  showMessage(verdict.message);   // message identique à celui du serveur
  return;
}
```

---

## Ce que couvre le paquet

| Domaine | Modules |
|---|---|
| Logique conditionnelle | `global-logic`, `conditional-rules`, `jump-engine` |
| Réponses et comparaisons | `multi-value-answer`, `grid-column-value`, `grid-other-row` |
| Calculs | `formula`, `calculated-answer` |
| Collecte | `collection-schedule`, `submission-status`, `geofence` |
| Exploitation | `answer-export`, `version-remap` |

---

## La règle à tenir

**Ce paquet ne dépend de rien.** Ni Prisma, ni NestJS, ni React, ni aucune API de navigateur.

C'est ce qui lui permet de tourner dans Node, dans un navigateur et dans React Native. Toute
dépendance ajoutée ici casserait l'un des trois — souvent **sans erreur de compilation** : la
panne n'apparaîtrait qu'à l'exécution, sur l'appareil d'un enquêteur.

C'est pourquoi `QuestionType` y est redéclaré au lieu d'être importé de Prisma. Cette
énumération doit rester alignée sur `schema.prisma` : c'est le prix à payer, et il est bien
inférieur à celui de la divergence.

### Tests

```bash
pnpm test
```

Sans Jest ni Vitest, délibérément : les imposer obligerait chaque consommateur — dont React
Native — à composer avec cet outillage.

---

## Note pour le développement mobile

Deux points valent d'être signalés :

**Le mobile purge les réponses des questions masquées avant l'envoi ; le web les conserve.**
Chaque client reste cohérent avec lui-même, mais si une condition dépend d'une question
elle-même masquée, les deux peuvent aboutir à des visibilités différentes. Mon avis : conserver,
comme le web — le serveur sait de toute façon ne pas valider ce qui est invisible.

**La fenêtre de collecte ne s'applique JAMAIS à la synchronisation.** Une collecte faite à 16 h
sur le terrain peut remonter à 21 h. `evaluateSchedule` sert à décider si l'on peut *ouvrir* un
questionnaire, jamais à décider si l'on peut *envoyer* ce qui est déjà collecté.
