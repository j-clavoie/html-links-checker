# TODO LIST

## Définir les erreurs
+ Refaire le structure des erreurs et la façon des les affichers pour les regrouper et les trier correctement

## Lien relatif débutant par ../
+ Vérifier si le module "urllib" peut effectuer la recherche
+ Développer la validation à partir du {workspace}
+ Voir à pouvoir insérer un path local/réseau pour valider les liens relatifs
+ Vérifier s'il serait préférable de remplacer le ../ par la partie du path manquantes et tester le lien avec les fonctions existantes (validateLink). Permettrait de savoir si le lien fonctionne sur le serveur plutôt qu'être "présent" sur le serveur


## Validation accessibilité lien externes
+ Les expressions (external link et lien externe) ne semblent pas être validés correctement
+ ne pas valider si les expression sont présentes lorsque c'est un lien interne


## Authentification
+ Trouver une solution pour les single-sign-on
+ Voir à ajouter un popup pour login et password
+ voir à ajouter des paramèters d'extension pour le login et un popup pour le password


## Lien FILE://
+ Indiquer les problèmes potentiel dans les liens FILE://
  + espace devrait être remplacés par %20
  + \ par /

## Quick fix
+ Développer les quick fix :
  + corriger les liens redirigés
  + supprimer les liens
    + qui ne fonctionnent pas
    + qui n'ont pas de nom (voir à aller chercher le "title" de l'URL et l'ajouter automatiquement dans le &lt;a&gt;&lt;/a&gt;)
  + Approuver une erreur (faux positif) pour la supprimer de la liste des erreurs dans l'onglet "Problems"
  + Afficher la liste des ancrages disponibles pour sélectionner celui qui est le bon

**Références:**
+ https://stackoverflow.com/questions/43328582/how-to-implement-quickfix-via-a-language-server
+ https://github.com/YuanboXue-Amber/endevor-scl-support/blob/master/server/src/CodeActionProvider.ts
+ https://code.visualstudio.com/api/references/vscode-api#CodeActionKind
