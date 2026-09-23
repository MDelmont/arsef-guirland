# Guirlande — Art et Ficelles

1. Double-cliquez sur **Ouvrir la guirlande.cmd** (Node.js doit être installé).
2. Placez vos images PNG dans **fanions**, dans ce dossier.
3. Actualisez la page : les ajouts et suppressions sont détectés automatiquement.

Les 12 PNG initiaux sont déjà copiés. Les originaux et le dossier de référence restent intacts.
Les noms déterminent l’ordre : `001.png`, `002.png`, `003.png`… Les noms libres fonctionnent aussi, avec un tri alphabétique et numérique.
Utilisez de préférence des PNG transparents, sans marge autour du fanion, avec l’attache au bord supérieur.

Faites défiler pour dessiner la corde et révéler les fanions. Cliquez sur un fanion pour l’agrandir ; naviguez avec la molette (vers le bas : suivant, vers le haut : précédent), les flèches, les touches du clavier ou un glissement horizontal. La molette avance d’un fanion à la fois et attend la fin de la transition. Échap ferme le zoom.

Le serveur est accessible uniquement sur cet ordinateur. Fermez sa fenêtre pour l’arrêter.
L’ouverture directe de `index.html` utilise la liste enregistrée lors du dernier lancement du serveur. Pour détecter de nouvelles images, utilisez le lanceur.
Les polices Google nécessitent Internet ; des polices de remplacement sont utilisées hors connexion.

`animation.js` reprend les calculs du tracé et de la caméra de la référence ; `app.js` assure le rendu sans React. `style.css` adapte la présentation et le mobile. `build.cjs` sert uniquement à régénérer les fichiers issus de la référence pendant le développement ; il n’est pas nécessaire à l’utilisation.
