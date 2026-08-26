# Déploiement de `@karah/shared`

Dépôt : **`Infinite-Solutions-Intl/karah-remix-shared`**
Consommateurs : l'API et le web (Railway), le mobile (EAS).

---

## Le problème que ces étapes résolvent

`pnpm add file:../karah-shared` fonctionne sur votre poste, où les dossiers sont côte à côte.
**Il échoue sur Railway** : Railway clone **un seul** dépôt, le dossier voisin n'existe pas.
L'installation s'arrête sur `ENOENT`.

Il faut donc rendre le paquet accessible depuis n'importe où.

---

## ÉTAPE 1 — Pousser le paquet et l'étiqueter

```bash
cd karah-shared

git init
git add .
git commit -m "Moteur partagé v1.0.0"

git remote add origin https://github.com/Infinite-Solutions-Intl/karah-remix-shared.git
git branch -M main
git push -u origin main

git tag v1.0.0
git push --tags          # ← indispensable : `git push` seul n'envoie PAS les tags
```

### Pourquoi le tag est indispensable

Sans lui, vos trois applications suivent la branche `main`. Une modification poussée un mardi
soir partirait en production **au déploiement suivant de n'importe laquelle**, sans que vous
l'ayez décidé — et vous en découvririez l'effet avant la cause.

Avec un tag, chaque application monte de version **quand vous le décidez**. Vous pouvez corriger
une règle, la déployer d'abord sur l'API, vérifier, puis suivre avec le web.

### Vérification

```bash
git ls-remote --tags https://github.com/Infinite-Solutions-Intl/karah-remix-shared.git
```

Le tag `v1.0.0` doit apparaître. **S'il manque, l'étape 3 échouera.**

---

## ÉTAPE 2 — Public ou privé ?

Ce paquet ne contient **aucun secret** : ni clé, ni accès base, ni donnée client. Uniquement de
la logique de validation.

| | Public | Privé |
|---|---|---|
| Railway | rien à faire | jeton à configurer |
| EAS (mobile) | rien à faire | secret EAS à créer |
| Poste de développement | rien à faire | authentification GitHub |

**Le rendre public supprime toute la plomberie de jetons.** C'est ce que je recommande, sauf
contrainte de votre côté.

S'il doit rester privé, voyez l'**étape 6**.

---

## ÉTAPE 3 — Déclarer la dépendance

Dans le `package.json` de l'**API**, du **web** et du **mobile** :

```json
{
  "dependencies": {
    "@karah/shared": "github:Infinite-Solutions-Intl/karah-remix-shared#v1.0.0"
  }
}
```

Puis :

```bash
pnpm install
git add package.json pnpm-lock.yaml && git commit -m "Ajout de @karah/shared"
```

> **Committez le lockfile.** C'est lui qui garantit que Railway installe exactement ce que vous
> avez testé.

---

## ÉTAPE 4 — Déployer sur Railway

**Rien à configurer.** Railway clone votre dépôt, lance `pnpm install`, qui :

1. clone `karah-remix-shared` au tag `v1.0.0` ;
2. exécute le script **`prepare`** — c'est lui qui compile `src/` vers `dist/`.

Aucune variable d'environnement, aucun jeton, aucune commande de build supplémentaire.

> Le script `prepare` existe précisément pour cela. Sans lui, `dist/` serait absent et vos
> applications échoueraient avec `Cannot find module '@karah/shared'` — **après un déploiement
> réussi**, donc en production.

### Vérification après déploiement

Ouvrez un formulaire public dont la fenêtre de collecte est fermée. Le message
d'indisponibilité vient du paquet : son apparition prouve que la dépendance est résolue **et**
fonctionnelle.

---

## ÉTAPE 5 — Le mobile (React Native / Expo)

L'installation est identique. Deux points méritent votre attention.

### 5.1 — Metro et les liens symboliques

En dépendance Git, le paquet est copié dans `node_modules` comme un dossier ordinaire : Metro le
traite sans configuration. **C'est l'argument principal contre le monorepo pour le mobile**, où
les liens symboliques demandent une configuration Metro spécifique, source de pannes difficiles
à diagnostiquer.

### 5.2 — ⚠️ Les fuseaux horaires sur Android — à vérifier en premier

`evaluateSchedule` s'appuie sur `Intl.DateTimeFormat` avec l'option `timeZone`. Sur Android, le
moteur **Hermes est parfois compilé sans données ICU complètes** : `Intl` existe, ne lève aucune
erreur, mais **ignore silencieusement `timeZone`** et renvoie l'heure de l'appareil.

Un `try/catch` ne détecte pas ce cas — c'est ce qui le rend dangereux.

Le paquet expose `isTimezoneAware()`, qui convertit un instant connu vers **deux** fuseaux et
vérifie que les résultats diffèrent. À appeler au démarrage :

```ts
import { isTimezoneAware } from '@karah/shared';

if (!isTimezoneAware()) {
  console.warn(
    "Fuseaux non pris en charge : les horaires de collecte suivront l'heure de l'appareil.",
  );
}
```

**Si le contrôle échoue :**

- **Expo** — vérifier `expo-localization` et la version du SDK ; les récentes activent
  `hermes-intl`.
- **React Native nu** — variante d'Hermes avec ICU dans `android/app/build.gradle`, ou polyfill
  `@formatjs/intl-datetimeformat` avec ses données de fuseaux.

En pratique, l'enquêteur est presque toujours dans le fuseau de sa collecte : le repli est
correct. Il cesse de l'être pour une supervision à distance — d'où l'avertissement plutôt qu'un
comportement silencieux.

---

## ÉTAPE 6 — Si le dépôt reste privé

**Railway** — un `.npmrc` committé à la racine de chaque projet :

```
//github.com/:_authToken=${GITHUB_TOKEN}
```

et `GITHUB_TOKEN` (jeton à portée `repo`) dans les variables Railway.

**EAS** :

```bash
eas secret:create --scope project --name GITHUB_TOKEN --value ghp_xxx
```

⚠️ **Le `.npmrc` se committe, pas le jeton.** La syntaxe `${GITHUB_TOKEN}` lit la variable à
l'installation : c'est ce qui permet de versionner le fichier sans exposer le secret.

---

## ÉTAPE 7 — Faire évoluer le paquet

```bash
cd karah-shared
# … modifications …

npm test                 # les tests DOIVENT passer : trois plateformes en dépendent
git commit -am "Correction de X"
git tag v1.1.0
git push && git push --tags
```

Puis, dans chaque projet, **quand vous le décidez** :

```bash
pnpm add github:Infinite-Solutions-Intl/karah-remix-shared#v1.1.0
```

### Quelle numérotation

| Changement | Version |
|---|---|
| Correction sans changement de comportement | `1.0.1` |
| Nouvelle fonction, comportement existant inchangé | `1.1.0` |
| Comportement modifié ou fonction retirée | `2.0.0` |

Le dernier cas mérite attention : une règle de validation qui change **modifie ce que le serveur
accepte**. Déployez l'API d'abord, vérifiez, puis les clients.

---

## ÉTAPE 8 — Passer à un registre npm (plus tard)

La dépendance Git suffit longtemps. Un registre devient utile quand l'installation ralentit ou
que vous voulez éviter la compilation chez le consommateur.

Le workflow `.github/workflows/publish.yml` est **déjà fourni** : il publie sur GitHub Packages
à chaque tag. Il suffira de changer la dépendance en `"@karah/shared": "^1.1.0"` et d'ajouter :

```
@karah:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

---

## Intégration continue

Deux workflows dans `.github/workflows/` :

**`ci.yml`** — sur chaque poussée : compile, teste, et **vérifie la règle fondatrice** :

- aucune dépendance d'exécution dans `package.json` ;
- aucun import externe dans `src/`.

Ce dernier contrôle est le plus important du dépôt. Une dépendance ajoutée ici casserait React
Native ou le navigateur — souvent **sans erreur de compilation** : la panne n'apparaîtrait qu'à
l'exécution, sur l'appareil d'un enquêteur, loin de tout débogueur.

**`publish.yml`** — sur chaque tag : publie sur GitHub Packages, tests obligatoires d'abord.

---

## Récapitulatif

```
github.com/Infinite-Solutions-Intl/karah-remix-shared   ← paquet, tags v1.x.x
                          ▲          ▲          ▲
                          │          │          │
                     karah-api   karah-web   karah-mobile
                     (Railway)   (Railway)   (EAS)
```

## En cas de problème

| Symptôme | Cause | Correction |
|---|---|---|
| `ENOENT ../karah-shared` | dépendance encore en `file:` | passer à `github:` (étape 3) |
| `Couldn't find match for v1.0.0` | tag absent | `git push --tags` |
| `Cannot find module '@karah/shared'` à l'exécution | `dist/` non compilé | vérifier le script `prepare` |
| `403` à l'installation sur Railway | dépôt privé sans jeton | étape 6, ou rendre public |
| Horaires décalés sur Android | `Intl` sans données de fuseaux | étape 5.2 |
