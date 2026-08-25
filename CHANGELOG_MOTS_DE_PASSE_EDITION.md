# Karah — Interfaces de mot de passe et d'édition des comptes

Vous aviez raison : les endpoints existaient, les écrans non.

---

## 1. Politique de mot de passe — placée dans le paquet partagé

Six exigences : **8 caractères minimum**, une minuscule, une majuscule, un chiffre, un caractère
spécial, et **différent de l'ancien**.

### Pourquoi dans `@karah/shared`

La règle doit être **identique à l'écran et au serveur**. Une politique plus stricte côté serveur
produit un refus incompréhensible après une saisie que l'interface avait validée ; l'inverse
laisse passer ce que l'interface prétendait exiger. Le mobile héritera de la même règle sans rien
réécrire.

### Pourquoi pas une seule expression régulière

Vous demandiez une regex — elle est fournie (`PASSWORD_PATTERN`) et sert là où une seule règle
suffit : décorateur `@Matches`, attribut `pattern`.

Mais une regex répond « non » **sans dire pourquoi**. L'interface vérifie donc chaque exigence
séparément et affiche **en direct ce qui manque**. Sans cela, on essaie des variantes au hasard
et l'on finit par choisir un mot de passe plus faible mais accepté par tâtonnement — l'inverse
de ce qu'une politique de complexité cherche à obtenir.

### Deux détails qui comptent

**Maximum 72 caractères.** bcrypt ignore silencieusement tout ce qui dépasse : accepter
davantage donnerait l'illusion d'un mot de passe plus long qu'il ne l'est.

**L'indicateur de robustesse ne bloque rien.** Un mot de passe conforme est accepté quel que soit
son score. Un seuil caché contredirait les exigences affichées.

---

## 2. Un défaut trouvé côté serveur

**Ni la réinitialisation ni le changement ne vérifiaient que le mot de passe change réellement.**
Seule la longueur minimale était contrôlée — pas la complexité, pas la différence avec l'ancien.

Un mot de passe compromis pouvait donc être « réinitialisé » à l'identique : rien n'était
corrigé, alors que tout laissait croire le contraire.

Corrigé sur les deux chemins. À la réinitialisation, l'utilisateur ne transmet pas l'ancien — il
l'a justement oublié — donc la comparaison se fait **contre l'empreinte stockée**.

---

## 3. Les écrans livrés

| Écran | Adresse |
|---|---|
| Mot de passe oublié | `/mot-de-passe-oublie` — public |
| Nouveau mot de passe | `/reinitialiser-mot-de-passe?token=…` — public |
| Mes informations, mot de passe, suppression | Profil → onglet **Mon compte** |
| Modifier une entreprise | Fiche entreprise → **Modifier** |

Le lien « Mot de passe oublié ? » est placé **sous le champ de mot de passe** de la connexion :
c'est là qu'on le cherche, au moment précis où l'on constate ne plus s'en souvenir.

### Points de conception

**La confirmation d'envoi est la même que l'adresse existe ou non.** Répondre « adresse
inconnue » transformerait la page en outil de vérification de comptes : il suffirait d'essayer
des adresses pour savoir qui est inscrit — information précieuse pour préparer du hameçonnage.

**Un jeton absent est signalé d'emblée**, pas au moment de l'envoi. Remplir un formulaire entier
pour apprendre que le lien était incomplet est décourageant, et l'on n'y peut rien à ce stade.

**Seuls les champs réellement modifiés sont envoyés.** Transmettre l'objet complet écraserait une
modification faite entre-temps — un responsable qui corrige un numéro pendant que l'intéressé
change son nom.

**Le changement d'adresse est signalé** : elle sert à se connecter, et la conséquence ne doit pas
se découvrir à la tentative suivante.

**Le code de recrutement n'est pas modifiable** depuis l'édition d'entreprise : il est déjà
diffusé sur des affiches et des liens, le changer les rendrait inopérants sans prévenir personne.
Pour cesser de recevoir des candidatures, l'interrupteur suffit — le code reste valide.

**L'onglet « Mon compte » n'apparaît que sur son propre profil.** Modifier le mot de passe d'un
collègue passe par l'écran des utilisateurs, où le contexte est celui de l'administration.

---

## 4. Sur la vérification

**41 tests, aucun échec** — 18 nouveaux sur la politique de mot de passe, dont un qui vérifie que
**la regex et les contrôles détaillés donnent le même verdict**. C'est le test qui garde les deux
formes alignées ; sans lui, elles divergeraient à la première modification.

Le contrôle de typage est validé par sonde à chaque livraison. Il a trouvé trois erreurs de mon
fait cette fois, toutes corrigées, plus un `vite-env.d.ts` incomplet qui faisait échouer le typage
des variables d'environnement.

Aucun import corrompu. i18n synchronisée : 811 clés de part et d'autre, aucune clé manquante.

---

## À tester

1. **Complexité** — saisir `karah123` : les exigences manquantes doivent s'afficher en rouge et
   le bouton rester désactivé.
2. **Différent de l'ancien** — dans « Changer mon mot de passe », saisir le même des deux côtés :
   l'exigence doit apparaître **avant** l'envoi.
3. **Réinitialisation à l'identique** — via le lien reçu par courriel, redonner le mot de passe
   actuel : le serveur doit le refuser, même sans que l'ancien ait été transmis.
4. **Adresse inconnue** — demander une réinitialisation pour une adresse qui n'existe pas :
   l'écran de confirmation doit être identique à celui d'une adresse valide.
5. **Édition de profil** — modifier un seul champ, puis vérifier dans l'onglet Réseau qu'un seul
   champ part dans la requête.
