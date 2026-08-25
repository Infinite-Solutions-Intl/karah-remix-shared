# Karah — Horaires de collecte, édition des comptes, mode dégradé, paquet partagé

---

## 1. Fenêtre de collecte : jours, heures, message

Quatre champs ajoutés à l'opération : jours autorisés, heure d'ouverture, heure de fermeture,
**fuseau horaire**. `unavailabilityMessage` existait déjà et sert désormais.

### Le fuseau n'est pas un détail

« 08:00 – 17:00 » ne veut rien dire sans fuseau. Votre serveur tourne en **UTC**, le terrain est
à **Douala (UTC+1)**. Sans conversion, une fenêtre 08:00–17:00 s'appliquerait en réalité de
09:00 à 18:00 locales — et **refuserait toutes les collectes de la première heure de la
matinée**, sans que personne comprenne pourquoi.

Chaque opération porte donc son fuseau, pré-rempli avec celui de l'appareil du concepteur.
L'évaluation se fait dans l'heure locale du terrain. Un test vérifie explicitement qu'une
soumission à 08:05 locales est acceptée.

### Deux cas traités qui se seraient retournés contre vous

**Le dernier jour.** Une date de fin pointe sur minuit. Comparée telle quelle, elle aurait
fermé la collecte dès le matin du dernier jour. La comparaison porte sur la date seule.

**Les fenêtres de nuit.** « 22:00 – 02:00 » évaluée naïvement (`≥ 22h ET ≤ 02h`) serait fermée
en permanence. Traitée explicitement.

**En cas de configuration incohérente, la collecte reste OUVERTE.** Fermer par défaut sur une
donnée mal saisie bloquerait une opération entière sans explication — bien pire que d'accepter
une réponse hors horaire.

---

## 2. Blocage des soumissions, jamais des synchronisations

C'est la distinction que vous avez posée, et elle est appliquée à la lettre.

| | Soumis à la fenêtre |
|---|---|
| Formulaire public, saisie en ligne | **oui** |
| Synchronisation mobile | **jamais** |

Une collecte faite à 16 h sur le terrain peut remonter à 21 h, quand l'enquêteur retrouve du
réseau. La refuser détruirait un travail légitime pour une raison qui ne le concerne pas.

Le contrôle est donc posé **aux points d'entrée directs uniquement**, jamais sur le chemin de
synchronisation. C'est écrit dans le code, dans la migration et dans le README du paquet
partagé — pour qu'aucune relecture future ne l'ajoute « par cohérence ».

---

## 3. Modification d'un utilisateur

`PATCH /users/:id` — nom, prénom, email, téléphone, mot de passe, rôle, activation.

**Trois garde-fous**, chacun pour une raison précise :

- **Dernier compte CLIENT** — rétrograder ou désactiver le seul administrateur d'une entreprise
  la laisserait sans personne pour la gérer, **y compris pour annuler l'action**. Refusé.
- **Adresse déjà prise** — sans contrôle, l'erreur remonterait en 500 illisible.
- **Mot de passe** — haché, et les sessions ouvertes sont coupées. Un mot de passe changé doit
  l'être partout, sinon un appareil resté connecté continuerait d'accéder au compte.

Distinct de `/auth/change-password`, qui exige l'ancien mot de passe : ici c'est une
réinitialisation par un responsable, pas un changement par l'intéressé.

Le cloisonnement s'applique : un responsable d'entreprise ne modifie que ses propres comptes.

---

## 4. Modification d'une entreprise

`PATCH /entreprises/:id` existait, mais acceptait un `Partial<CreateEntrepriseDto>` — donc
`adminEmail` et `adminPassword`, **qui passaient la validation sans jamais être traités**. Un
appelant pouvait croire avoir changé le mot de passe de l'administrateur alors qu'il ne se
passait rien.

DTO dédié. Le service filtrait déjà ces champs — le filtrage est conservé par précaution — et
le **code de recrutement** est désormais explicitement non modifiable : il est déjà diffusé sur
des affiches et des liens, le changer les rendrait inopérants sans prévenir personne.

---

## 5. Synchronisation en mode dégradé

`POST /submissions/sync/degraded` — enregistre les collectes **sans aucun contrôle de validité**,
avec le statut `DEGRADED`.

Vous avez raison sur le fond : une donnée bloquée dans un téléphone finit par disparaître avec
l'appareil, une réinstallation ou un changement d'enquêteur. Mieux vaut une collecte imparfaite
mais récupérable qu'une collecte parfaite qui n'arrive jamais.

**Ce qui reste vérifié**, et qui n'est pas négociable :

- le droit d'écrire sur cette opération ;
- l'existence du questionnaire ;
- l'unicité de l'identifiant.

Ce sont des contrôles d'**autorisation** et d'intégrité référentielle, pas de qualité. Les lever
ouvrirait la porte à l'écriture dans n'importe quelle opération.

**Trois précautions :**

- Statut **distinct de `COMPLETED`** : ces collectes doivent être reprises à part, jamais
  confondues avec des données validées.
- **Ne comptent pas dans les quotas** : les compter gonflerait l'avancement avec des données
  dont on ignore la validité.
- **Position marquée `NOT_VERIFIED`** : elle n'a pas été contrôlée non plus, et l'analyse ne
  doit pas la prendre pour une position validée.
- **Idempotent** : une collecte déjà passée en mode normal n'est **pas** écrasée par sa version
  dégradée. Ce serait une régression silencieuse.

---

## 6. `@karah/shared` — le moteur commun aux trois plateformes

Un paquet npm à part, consommable par l'API, le web **et React Native**.

### Pourquoi c'était nécessaire

Ce projet a payé plusieurs fois le prix de la duplication :

- une condition globale lue sous une forme par le client et sous une autre par le serveur — si
  bien qu'**aucune règle globale n'était appliquée** sur le formulaire public ;
- un `??` au lieu d'un `||` sur une valeur de colonne, rendant le contrôle serveur incompatible
  avec ce que l'interface envoyait ;
- un opérateur logique par défaut différent de part et d'autre.

Chacun venait de la même cause : **deux copies d'une règle finissent toujours par diverger.**

### Ce qu'il contient

Logique conditionnelle et sauts · comparaison des réponses à valeurs multiples · grilles ·
formules et champs calculés · fenêtre de collecte · règles de statut · contrôle de zone GPS ·
mise en forme pour l'export · remappage de version.

### La règle à tenir

**Zéro dépendance.** Ni Prisma, ni NestJS, ni React, ni API de navigateur. C'est ce qui lui
permet de tourner dans les trois environnements.

C'est pourquoi `QuestionType` y est **redéclaré** au lieu d'être importé de Prisma — qui
embarque un moteur de requêtes et des binaires natifs, inutilisables sur mobile. Cette
énumération doit rester alignée sur `schema.prisma` : c'est le prix à payer, très inférieur à
celui de la divergence.

Toute dépendance ajoutée casserait l'un des trois **sans erreur de compilation** : la panne
n'apparaîtrait qu'à l'exécution, sur l'appareil d'un enquêteur.

### Pour le développeur mobile

```bash
cd karah-shared && pnpm install && pnpm build
cd ../mobile      && pnpm add file:../karah-shared
```

Un registre privé est préférable dès que le mobile est développé sur un autre poste : `file:`
suppose une arborescence partagée.

Le README documente l'usage et signale **deux points à trancher avec lui** :

1. Le mobile **purge** les réponses des questions masquées, le web les **conserve**. Si une
   condition dépend d'une question elle-même masquée, les deux peuvent aboutir à des
   visibilités différentes. Mon avis : conserver, comme le web.
2. `evaluateSchedule` sert à décider si l'on peut **ouvrir** un questionnaire, jamais si l'on
   peut **envoyer** ce qui est déjà collecté.

---

## Vérification

**23 tests** sur le moteur d'horaires, dont le piège du fuseau, le dernier jour et les fenêtres
de nuit. Ils tournent dans le paquet partagé (`pnpm test`), donc les trois plateformes héritent
de la même garantie.

Typage validé par sonde sur les deux projets ; le paquet compile en mode `strict`.
Aucun import corrompu. i18n synchronisée : 755 clés de part et d'autre.

### Migrations

```bash
cd karah-backend && npx prisma migrate deploy && npx prisma generate && pnpm build
```

Deux migrations : champs de fenêtre de collecte, et valeur `DEGRADED`. Aucune reprise de données.

### À tester

1. **Horaires** — poser 08:00–17:00 avec `Africa/Douala`, puis soumettre depuis le lien public
   à 07:30 locales : refusé avec votre message. À 08:30 : accepté.
2. **Le test qui compte** — synchroniser un lot mobile **hors horaire** : il doit passer.
3. **Dernier administrateur** — tenter de rétrograder le seul compte CLIENT d'une entreprise :
   refusé avec un message explicite.
4. **Mode dégradé** — envoyer une collecte volontairement invalide sur `/sync/degraded` : elle
   doit être enregistrée en `DEGRADED`, sans faire bouger le quota.
