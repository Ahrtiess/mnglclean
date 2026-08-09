# Modèle d'email de confirmation client (à coller dans EmailJS)

**Champ "To Email" du template :** `{{to_email}}`

**Champ "Subject" (objet) :**
Confirmation de votre rendez-vous — MNGL Clean

**Corps du message :**

Bonjour {{to_name}},

Votre rendez-vous chez MNGL Clean est confirmé. Voici le récapitulatif :

Prestation : {{service}}
Date : {{date}}
Heure : {{heure}}
Numéro de réservation : {{booking_id}}

Merci de conserver ce numéro, il vous sera demandé en cas de modification.

Besoin d'annuler ? Cliquez simplement sur ce lien, aucune démarche supplémentaire :
{{cancel_link}}

Si cet email s'est retrouvé dans vos spams / courriers indésirables, pensez à le marquer comme "non indésirable" — cela nous aide aussi à ce que nos prochains messages arrivent bien dans votre boîte de réception.

À très bientôt,
L'équipe MNGL Clean
contact@mnglclean.fr

---

## Petit plus pour éviter les spams (réglage EmailJS, une fois)
Dans **Email Templates → ton template → onglet Settings**, vérifie que :
- **"From Name"** est bien `MNGL Clean` (pas "Contact Us" par défaut)
- **"Reply To"** est réglé sur `{{to_email}}` si le champ existe, pour que si le client répond, ça t'arrive à toi et non pas dans le vide

Ces deux réglages, avec le petit mot dans l'email lui-même, aident les boîtes mail à comprendre que c'est un email légitime au fil des envois — l'atterrissage en spam s'améliore naturellement avec le temps et le nombre d'envois.
