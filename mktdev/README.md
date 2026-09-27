# MKTDEV

Fork personnalisé de DeepSeek Harness, construit sur l'écosystème DeepSeek Harness.

Ce dépôt est un fork de `deepseek-ai/deepseek-harness`, maintenu par l'organisation
[SahelCyBER](https://github.com/SahelCyBER). Il ajoute une identité de marque MKTDEV
au Web UI sans modifier une seule ligne du cœur amont.

## Ce que fait cette personnalisation

- Le badge rond au drapeau du Niger et le nom MKTDEV remplacent le marqueur de secours de la
  barre latérale, avec le même badge que sur l'accueil.
- La palette bronze, or et sable remplace les bleus et les gris froids de l'amont, en clair
  comme en sombre.
- Le titre de l'onglet et le favicon portent l'identité MKTDEV.
- L'interface est en français, sur les 52 namespaces du client.
- Sur l'accueil, un badge rond au drapeau du Niger remplace le poisson DeepSeek, et le titre
  devient « MKTDEV IDE ».
- Tout le texte atteint au moins 4,5:1 sur son fond, dans les deux modes.

Le reste est inchangé : la boucle d'agent, les sessions, les outils, les connecteurs et
les profils se comportent exactement comme en amont.

## Démarrer

La branche `mktdev` porte les personnalisations ; `master` reste le miroir de l'amont.

```sh
git checkout mktdev
pnpm install
./mktdev/launch.sh
```

Le serveur écoute sur `http://127.0.0.1:3080`. Pour un lancement sans reconstruction :

```sh
./mktdev/launch.sh --prod
```

### Accès et authentification

`dsh web` refuse l'URL racine seule : il attend le jeton imprimé au démarrage, sous la
forme `http://127.0.0.1:3080/?token=...`. Le launcher ouvre automatiquement cette URL, il
n'y a donc rien à faire dans le cas normal.

Si vous ouvrez `http://127.0.0.1:3080` à la main sans jeton, le serveur répond
`dsh web authentication required; reopen the URL printed by dsh web`. Ce n'est pas une
panne. La première visite avec le jeton dépose un cookie signé, valable trente jours,
lié à l'autorité `127.0.0.1:3080` et signé par un secret conservé dans
`$DSH_HOME/.credentials.yaml`. Passé cette première visite, l'URL nue fonctionne, y
compris après un redémarrage du serveur.

Le jeton, lui, est propre au processus : il change à chaque lancement. Avec `--no-open`,
il reste disponible dans la sortie du launcher.

## Comment l'isolation fonctionne

DeepSeek Harness est bâti sur une architecture « tout est un plugin ». Le projet expose
donc un point d'extension officiel pour l'identité de marque, et c'est celui-là qui est
utilisé ici.

| Surface | Mécanisme | Fichier |
|---|---|---|
| Marque et nom dans la barre latérale | Occupation des slots `sidebar.brand.mark` et `sidebar.brand.name` | `branding/client.js` |
| Palette et favicon | Table d'injection `webserver/index-inject` | `branding/palette.css`, généré par `branding/build-palette.mjs` |
| Marque de l'accueil | Occupation du slot `conversation.hero.brand.mark` | `branding/client.js` |
| Lisibilité | Tokens de texte calibrés dans la palette | `branding/build-palette.mjs` |
| Titre de l'onglet | Variable de build `DSH_CLIENT_TITLE` | `launch.sh` |
| Langue française | Enregistrement de la langue et des dictionnaires via `ctx.locale` | `locale-fr/client.js`, généré depuis `locale-fr/dictionaries/` |
| Branchement | Overlay `--patch` | `overlay.yml` |

Deux points méritent d'être connus :

1. `overlay.yml` insère une ligne dont le nom est un **chemin relatif**. C'est ce qui
   permet à un bundle hors arborescence de fonctionner : le Loader résout le chemin à
   côté du fichier de patch, puis lit `branding/package.json` pour découvrir la
   déclaration `dsh.client` et servir la moitié navigateur.
2. La ligne `ui-brand-official` est désactivée explicitement. Elle ne s'enregistre en
   amont que sous `DSH_CLIENT_BUILD_PROFILE=official`, mais la désactiver rend la
   composition sans ambiguïté.

`branding/cordis.patch.yml` existe pour la seconde voie d'installation, celle du Plugin
Manager (`install_bundle`) et de `dsh plugin --profile web add <chemin>`. Le launcher,
lui, n'installe rien dans le profil. Le pack de langue suit le même schéma avec
`locale-fr/cordis.patch.yml`.

## Passer l'interface en français

Le français est livré par un pack de langue dans `locale-fr/`, qui suit le contrat
officiel des language packs : il déclare la langue, puis enregistre ses dictionnaires.

```js
ctx.locale.addLanguage({ id: 'fr', label: 'Français', fallback: 'en' })
ctx.locale.register('common', 'fr', { cancel: 'Annuler' })
```

Deux propriétés de ce mécanisme méritent d'être connues.

Un couple namespace et langue ne peut être enregistré qu'une fois. Le pack ne peut donc
pas réécrire l'anglais amont, il l'enrichit d'une langue supplémentaire. C'est ce qui
garantit qu'une mise à jour amont ne peut pas être écrasée par erreur.

La résolution se fait clé par clé le long de la chaîne de repli. Toute clé non traduite
retombe sur l'anglais, sans écran cassé ni texte manquant. La couverture peut donc
s'étendre progressivement, namespace par namespace.

La langue s'active seule si le navigateur demande le français. Sinon elle se choisit une
fois dans Paramètres, Général, Langue, et le choix est conservé.

L'avis d'accueil est une traduction fidèle : l'avertissement de pré-version est conservé
volontairement, car ce texte décrit le statut du logiciel à la personne qui le lit.
`welcomeBody` dans `locale-fr/client.js` est l'endroit où le modifier si besoin.

### Périmètre traduit

L'interface entière : les 52 namespaces du client, soit 2180 chaînes. Accueil, barre
latérale, conversation, trajectoire, panneaux latéraux, paramètres, planification,
livrables, sélecteur de modèle, raccourcis, et le lexique partagé dont dépendent tous
les autres.

Les dictionnaires sont les fichiers JSON de `locale-fr/dictionaries/`, un par namespace.
Ils sont la source de vérité : modifiez une traduction là, puis régénérez le bundle servi.

```sh
node mktdev/locale-fr/build.mjs
```

`locale-fr/client.js` est un fichier généré, à ne pas éditer à la main. Le bundle servi
doit être un script classique autonome, donc les dictionnaires y sont intégrés.

Après une mise à jour amont, de nouvelles chaînes apparaissent. Le contrôle suivant lit
les dictionnaires amont du dépôt et indique précisément ce qui reste à traduire, ce qui
a disparu, et sort en erreur s'il manque quelque chose :

```sh
node mktdev/locale-fr/check-coverage.mjs
```

## Palette et lisibilité

La charte MKTDEV remplace les bleus et les gris froids de l'amont par du bronze, de l'or et
du sable. Elle est **générée** par `branding/build-palette.mjs` vers `palette.css`, pour
deux raisons : les rampes de gris de l'amont comptent une cinquantaine de pas, et il faut
pouvoir les recalculer après une mise à jour amont.

```sh
node mktdev/branding/build-palette.mjs
```

Le principe : chaque pas des rampes froides est relu depuis le thème amont, puis réécrit
**dans la même clarté** avec une teinte chaude. C'est ce qui préserve les relations de
contraste du produit tout en déplaçant la teinte. Les rampes d'accent, les alias nommés par
la charte et les dégradés sont, eux, explicites.

| Rôle | Valeur |
|---|---|
| Primaire bronze | `#7B5C3A` |
| Secondaire or | `#C49A3C` |
| Or clair | `#E8C860` |
| Bronze foncé | `#8B6B4A` |
| Bronze profond | `#5C3D20` |
| Or foncé | `#A07830` |
| Fond clair sable | `#F9F6F1` |
| Fond carte | `#F5F0E8` |
| Fond SVG | `#F3EDE4` |
| Nuit, mode sombre | `#06090D` |
| Texte principal | `#0D1117` |
| Texte secondaire | `#4A4035` |

### Lisibilité

Le mode sombre amont était bon, le mode jour non : ses textes secondaires descendaient à
2,13:1 sur blanc et 1,26:1 pour le rôle estompé, pour un seuil lisible de 4,5:1. C'est la
cause du gris clair sur gris clair.

La charte propose `#A89B8A` pour le texte tertiaire. Mesuré sur le fond sable, ce ton
plafonne à 2,52:1, donc les rôles de libellé ont été assombris jusqu'à dépasser le seuil,
en conservant l'ordre du primaire vers l'estompé :

| Token | Sur sable | Sur carte |
|---|---|---|
| `--dsw-alias-label-primary` | `#0D1117` 17,6:1 | 16,7:1 |
| `--dsw-alias-label-secondary` | `#4A4035` 9,4:1 | 8,9:1 |
| `--dsw-alias-label-tertiary` | `#6E6151` 5,6:1 | 5,3:1 |
| `--dsw-alias-label-caption` | `#756A5A` 4,9:1 | 4,7:1 |
| `--dsw-alias-label-dimmed` | `#7F7363` 4,2:1 | 4,0:1 |

Mesuré ensuite sur les écrans réels, **aucun texte ne passe sous 4,5:1** : le pire cas est à
5,30:1 en clair et 4,82:1 en sombre. Le rôle estompé est le seul volontairement plus bas,
puisque c'est sa fonction.

### Le bouton principal

La charte prévoit un dégradé or pour les boutons. Je ne l'ai pas retenu pour le bouton
principal, et c'est le seul écart assumé à votre palette : un dégradé qui va de l'or clair
au bronze profond ne peut porter **aucune** couleur de texte unique à 4,5:1. Le blanc y
mesure 2,61:1 sur l'or et le brun foncé 3,36:1 sur le bronze foncé. Impossible de gagner
sur les deux extrémités.

Le bouton principal est donc en dégradé **bronze** avec texte blanc, ce qui donne 4,88:1 au
pas le plus clair et 9,80:1 au plus foncé, et correspond à votre règle « primaire bronze
pour les boutons, or pour le survol et les badges ». Votre dégradé or est conservé sous
`--mktdev-degrade-or`, disponible pour l'artwork et les accents.

### Marque

Le badge rond au drapeau du Niger est un seul composant, monté sur deux surfaces : la barre
latérale via `sidebar.brand.mark`, et l'accueil via `conversation.hero.brand.mark`, un slot
déclaré par `dsh-client-ui-conversation` et que l'amont laisse sur un poisson animé. Les
deux surfaces affichent donc littéralement la même marque.

Les diamètres diffèrent parce que les tailles demandées par l'hôte sont mesurées pour les
marques amont : 24 px dans la barre latérale, à la place du monogramme qu'elle portait, et
62 pour cent de la taille demandée sur l'accueil, où le poisson était plus large.

Le titre de l'accueil est la clé `hero.headline` du namespace `conversation`. Sa valeur
française vaut « MKTDEV IDE ».

## Synchroniser avec l'amont

La règle qui rend les mises à jour indolores : **`master` reste identique à l'amont, et
les personnalisations vivent sur la branche `mktdev`**.

```sh
git fetch upstream --prune
git checkout master
git merge --ff-only upstream/master
git push origin master

git checkout mktdev
git rebase master
git push --force-with-lease origin mktdev
```

`master` ne reçoit que des avance rapides. Aucune de nos modifications n'y est committée,
donc ce `merge --ff-only` ne peut pas produire de conflit. Comme les seules
personnalisations sont dans `mktdev/`, leur rebase sur un `master` mis à jour ne peut pas
entrer en conflit avec une évolution du cœur : un conflit signalerait un point
d'extension retiré en amont, et la réparation reste locale à `mktdev/`.

Le remote `upstream` est configuré en lecture seule : sa URL de push vaut
`DISABLED_NO_PUSH`, donc un `git push upstream` accidentel échoue au lieu de proposer une
branche. `origin` pointe vers le fork `SahelCyBER/MKTDEV`.

Si une évolution amont renomme un slot ou une variable, la réparation est locale à
`mktdev/` : rien à démêler dans un diff de cœur.

## Limites connues

- Le poisson animé de l'écran d'accueil de conversation n'est pas remplacé. Il appartient
  à `dsh-client-ui-conversation` et reste sur son rendu amont.
- La palette surcharge les rampes d'accent et de surface en préservant l'ordre de
  luminance, afin de ne pas dégrader les contrastes. Une vérification visuelle reste
  recommandée après toute mise à jour amont des tokens.
- Le titre se fixe au moment du build. Le modifier impose de relancer le script.
- Un pack de langue ne peut pas remplacer l'anglais ou le chinois amont, seulement les
  compléter. Toute clé absente d'un dictionnaire français retombe sur l'anglais. Après
  une mise à jour amont qui introduit de nouvelles chaînes, celles-ci apparaîtront en
  anglais jusqu'à leur traduction : le repli évite l'écran cassé, il ne le traduit pas.
  Le contrôle se fait avec `node mktdev/locale-fr/check-coverage.mjs`, qui liste ce qui
  reste à traduire et sort en erreur s'il manque une clé.
- Les valeurs issues des données et non de l'interface restent telles quelles : noms de
  modèles, titres de sessions, et les niveaux d'effort de raisonnement fournis par le
  catalogue de modèles, comme « High ».
- Le mot « Plugins » est conservé, par choix de glossaire.
- Le titre « MKTDEV IDE » est une valeur française, portée par le dictionnaire
  `conversation`. Comme un pack de langue ne peut pas réécrire l'anglais amont, basculer
  l'interface en anglais restaurerait « Into the Unknown ». C'est un choix assumé : ce
  fork est francophone.
- Le badge de l'accueil reprend la classe de géométrie imposée par l'hôte mais fixe son
  propre diamètre, à 62 pour cent de la taille demandée, qui est mesurée pour le poisson
  amont. Son rendu n'a pas été vérifié sur mobile.
- Le monogramme M n'apparaît plus dans l'interface, puisque le badge au drapeau l'a remplacé
  dans la barre latérale. Il survit dans le favicon et dans les icônes de bundle, sous
  `branding/icon.svg` et `locale-fr/icon.svg`.
- La palette ne recolore pas les couleurs d'état : le rouge d'erreur, le vert de succès et
  le rouge des différences de fichier sont conservés. Les remplacer par du bronze
  supprimerait le signal d'erreur, ce qui nuirait à la lecture des écrans de diagnostic.
  Dites-le si vous les voulez chauds malgré tout.
