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

