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

À très bientôt,
L'équipe MNGL Clean
