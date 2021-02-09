# TODO

## Comparer nom du lien avec title de la page de destination
Dans urllib
  const dataStr = data.toString();
  const dataH1 = dataStr.match(/<h1.*?>(.*?)<\/h1>/im);
  console.log(self.domTag.text + " || " + dataH1[1]);


## Lien FILE://
+ Indiquer les problèmes potentiel dans les liens FILE://
  + espace devrait être remplacés par %20
  + \ par /
  
## Authentification Windows (single-sign-on)
+ Trouver une solution pour les single-sign-on
+ Voir à ajouter un popup pour login et password
+ voir à ajouter des paramèters d'extension pour le login et un popup pour le password
## Authentification 
Pistes de réflexion/analyse
+ https://www.example-code.com/nodejs/http_windows_integrated_authentication.asp
+ https://www.npmjs.com/package/node-sspi

## PROXY
+ Ajouter des propriétées à l'extension pour définir les paramètres
  + proxy settings
  + user ID
+ Créer un popup pour demander le mot de passer à l'utilisateur pour la vérifier des liens. Demandé une seule fois.
+ Lorsque l'erreur du status est 407 alors utiliser les options avec le proxy pour atteindre l'URL


## Lien relatif débutant par ../
+ Vérifier si le module "urllib" peut effectuer la recherche
+ Développer la validation à partir du {workspace}
+ Voir à pouvoir insérer un path local/réseau pour valider les liens relatifs
+ Vérifier s'il serait préférable de remplacer le ../ par la partie du path manquantes et tester le lien avec les fonctions existantes (validateLink). Permettrait de savoir si le lien fonctionne sur le serveur plutôt qu'être "présent" sur le serveur


## Validation accessibilité lien externes
+ Les expressions (external link et lien externe) ne semblent pas être validés correctement
+ ne pas valider si les expression sont présentes lorsque c'est un lien interne




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
