# Annulation de rendez-vous — comment ça marche

## Le client annule
Il reçoit un email de confirmation (si EmailJS est configuré, voir plus bas)
contenant un lien **"Annuler ce rendez-vous"**. En cliquant dessus, ça ouvre
le site avec la fenêtre d'annulation déjà pré-remplie — il n'a plus qu'à
cliquer une fois sur "Annuler ce rendez-vous" pour confirmer.

Sans EmailJS configuré, le client n'a pas d'email automatique, mais il garde
son numéro de réservation affiché à l'écran juste après avoir réservé, et
peut toujours annuler via le lien "Annuler un rendez-vous" en bas du site
(numéro + email à saisir manuellement).

## Toi, tu annules
Ton email d'alerte (celui que tu reçois déjà à chaque réservation) contient
un lien **"🔗 Annuler ce rendez-vous (1 clic)"**. Un clic dessus ouvre le
site avec l'annulation pré-remplie pour CE rendez-vous précis — un seul clic
pour confirmer, et c'est fait.

Tu peux aussi, si tu as configuré le Google Sheet partagé (voir plus bas),
annuler directement en supprimant la ligne ou en changeant la colonne
`status` en `annule`.

---

## Configuration 1 — Email de confirmation au client (EmailJS)
Sans ça, seul TOI reçois un email ; le client voit juste sa confirmation à
l'écran. Pour que le client reçoive aussi un email (avec son lien
d'annulation), suis les instructions en haut du fichier `main.js`, section
"EMAIL DE CONFIRMATION AU CLIENT" : créer un compte gratuit sur
[emailjs.com](https://www.emailjs.com), connecter ta boîte mail, créer un
template, et coller 3 identifiants dans `main.js`. ~10 minutes, une seule
fois.

## Configuration 2 — Calendrier partagé (Google Sheets)
Sans ça, chaque réservation ne "bloque" le créneau que sur l'appareil du
client qui a réservé — deux clients sur deux téléphones différents pourraient
en théorie réserver le même créneau. Pour un vrai calendrier partagé, où toi
et n'importe quel client pouvez annuler depuis n'importe quel appareil, suis
les instructions du fichier `apps-script.gs` : créer un Google Sheet, coller
le script fourni, le déployer, et coller l'URL obtenue dans `main.js`
(`GOOGLE_SCRIPT_URL`). ~10 minutes, une seule fois.

Les deux configurations sont indépendantes : tu peux activer l'une, l'autre,
les deux, ou aucune — le site fonctionne dans tous les cas, avec plus ou
moins d'automatisation selon ce qui est branché.

## Configuration 3 — Suivi des visites (Google Analytics)
Pour voir combien de personnes visitent ton site (pas les réservations —
juste le trafic : nombre de visiteurs, d'où ils viennent, quelle page ils
regardent), voici comment brancher **Google Analytics** (gratuit, standard,
et donne bien plus d'infos qu'un compteur maison) :

1. Va sur [analytics.google.com](https://analytics.google.com), connecte-toi
   avec un compte Google (le même que pour Gmail par exemple)
2. Crée un compte, puis une "propriété" pour ton site (il te demandera le
   nom du site et l'URL — `mnglclean.fr`)
3. Il va te donner un identifiant qui ressemble à `G-ABC1234XYZ`
4. Ouvre `index.html`, cherche les 2 endroits où c'est écrit
   `G-XXXXXXXXXX` (tout en haut, section "GOOGLE ANALYTICS") et remplace
   les deux par ton vrai identifiant
5. Remets le fichier en ligne sur GitHub

Ensuite, pour voir les stats : retourne sur analytics.google.com, ton site
apparaîtra avec le nombre de visiteurs, en direct ou sur le temps que tu
veux. Ça met généralement 24 à 48h avant d'afficher les premières données.

