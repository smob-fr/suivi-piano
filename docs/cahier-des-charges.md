# Suivi Piano — Cahier des charges

> Document de travail, construit au fil des échanges. Cadrage fonctionnel terminé
> (§1–§13) ; §14 sauvegarde et §15 plan de construction restent à affiner en cours de
> développement.

## 1. Contexte et objectif

Application pour un professeur de piano : suivre ses élèves, son planning et les cours
effectués (date, durée, montant), avec des rappels, et produire la **synthèse mensuelle
des cours** qui sert à établir les factures.

**Ce n'est pas un logiciel de facturation ni de comptabilité.** Les factures et le suivi
des règlements se font dans **Indy** (outil externe déjà utilisé). L'appli ne suit pas
les encaissements. Elle fournit en revanche la **liste des cours à inclure dans
l'attestation crédit d'impôt** (la génération de l'attestation elle-même est hors
périmètre — voir §7).

## 2. Principes généraux

- **Application web installable (PWA)** : icône sur l'écran d'accueil Android, plein écran.
- **Fonctionne hors ligne.**
- **Données stockées uniquement sur l'appareil** (IndexedDB). Rien n'est envoyé sur un
  serveur. L'hébergement (GitHub Pages) ne sert que le code de l'application.
- **Sauvegarde/export** à la main de l'utilisateur (format à définir) — indispensable
  puisque les données ne vivent que sur le téléphone.
- **Saisie la plus simple possible**, en particulier pour l'enregistrement d'une séance.
- **Facturation et comptabilité externalisées** dans Indy — l'appli n'est qu'une source
  de synthèse.
- Langue : français.

## 3. Entités

| Entité | Rôle |
|---|---|
| **Élève** | Une personne à qui on donne cours (identité, créneau, niveau, progression). Ne porte pas de montant. |
| **Payeur / Foyer** | Qui paie (1 facture / foyer / mois). Peut regrouper plusieurs élèves (une famille). |
| **Séance** | Un cours donné = un évènement facturable : date, lieu, durée, **un montant**, mode de paiement, **facturée ou non**, élèves présents. |

Relations :

- Un **Élève** est rattaché soit à lui-même comme payeur, soit à un **Payeur**.
- Un **Payeur** peut être rattaché à plusieurs élèves (= foyer / famille).
- Une **Séance** concerne un payeur (ou un élève qui se paie lui-même) et **un ou
  plusieurs élèves présents**.

## 4. Fiche Élève

### Identité
- **Prénom** _(requis)_
- **Nom** _(requis)_
- **Élève mineur ?** _(case)_ → si coché, affiche le bloc **Représentant légal** :
  Prénom, Nom, Téléphone, Email _(optionnel)_
- **Téléphone**
- **Email** _(optionnel)_

### Adresse
- **N°**, **Rue**, **Complément** _(optionnel : bâtiment, interphone…)_, **Code postal**, **Ville**

### Cours
- **Lieu** : `Domicile de l'élève` / `Visio` / `Chez le professeur`
- **Créneau récurrent chaque semaine ?** _(case)_ — sert à générer l'agenda
- **Créneau(x)** : **Jour** + **Heure de début** + **Durée**
  - Durée par pas de 15 min : 15 / 30 / 45 / 60 / 75 / 90 — **défaut : 60**
  - Possibilité d'ajouter un **2ᵉ créneau** dans la semaine (rare mais prévu)

### Facturation
- **Payeur** : `L'élève lui-même` / `Un payeur existant` (liste) / `Nouveau payeur`
- **Tarif habituel** : montant fixe en € **par séance** — utilisé quand l'élève se paie
  lui-même. Pré-remplit l'écran de saisie, modifiable à chaque séance.
  _(Pour un foyer, le tarif habituel est porté par le Payeur — voir §5.)_
- **Mode de paiement habituel** : `Chèque` / `Virement` / `Liquide` / `CESU` / `CR-CESU`
- **Éligible crédit d'impôt** _(case)_

### Divers
- **Date de début des cours** _(optionnel)_
- **Statut** : `Actif` / `Archivé`
  - Archiver = retirer des listes courantes en gardant l'historique et les attestations.
  - **Suppression définitive** possible, avec confirmation explicite.
- **Notes** _(champ libre — inclut le niveau, l'année de pratique, le morceau en cours, etc.)_

## 5. Payeur / Foyer

Entité réutilisable, créée une fois et rattachée à un ou plusieurs élèves.

- **Prénom**, **Nom** _(peuvent différer de ceux de l'élève)_
- **Adresse** : N°, Rue, Complément, Code postal, Ville
  — raccourci **« même adresse que l'élève »**
- **Téléphone** _(optionnel)_, **Email** _(optionnel)_
- **Mode de paiement habituel** _(même liste que l'élève)_
- **Forfait habituel** _(optionnel, cas famille)_ : un **montant** + une **durée**
  (ex. _Famille Untel : 60 € / 2 h_). Pré-remplit l'écran de saisie.
- **Éligible crédit d'impôt** _(case)_

Exemple (mère + 2 enfants, visite de 2 h à domicile) :
3 fiches Élève distinctes (identité, créneau, progression propres à chacun) + 1 Payeur
« Famille Untel » rattaché aux 3, portant le forfait 60 € / 2 h.

## 6. Principe de saisie d'une séance

**Une séance = un montant.** Même écran pour un élève seul et pour une famille.

- On choisit l'élève **ou** le payeur.
- Sont pré-remplis : lieu, durée, montant, mode de paiement (depuis la fiche Élève ou le
  Payeur). Tout reste modifiable.
- On **coche les élèves présents** (un geste). Aucun montant par personne n'est saisi.
- On indique **payé** ou **non**.

Exemples :

| Cas | Séance |
|---|---|
| Élève seul | Léa · 30 € · 45 min · chèque · présents : Léa |
| Famille | Famille Untel · 60 € · 2 h · virement · présents : Marie, Tom |

Le marquage **« facturée »** n'est pas fait ici : il se fait plus tard, depuis la
synthèse mensuelle (§9), une fois la facture établie dans Indy.

_(Détail complet de l'écran séance : voir §8.)_

## 7. Liste des cours pour l'attestation crédit d'impôt

La **génération de l'attestation elle-même est hors périmètre** (faite par ailleurs).
L'appli fournit uniquement **la liste des cours à y inclure**.

Un cours est retenu s'il remplit **tous** ces critères :
- le **foyer** a l'interrupteur **« Éligible crédit d'impôt »** coché (§4/§5) ;
- statut **`Effectuée`** ;
- **lieu = `Domicile de l'élève`** (visio et cours chez le professeur exclus) ;
- **mode de paiement ≠ `Liquide`**.

Vue : par **foyer**, sur une **année civile** — liste des séances retenues (date, élève,
durée, montant) + **total € et total heures**. Données à reporter manuellement dans
l'attestation.

## 8. Séance / saisie d'un cours

### Cycle de vie
- **`Prévue`** : générée automatiquement à partir des créneaux récurrents, pour la semaine
  à venir. Apparaît dans l'agenda et dans les rappels « séances à saisir ».
- **`Effectuée`** : le cours a eu lieu. **Seul statut facturé.**
- **`Annulée`** : le cours n'a pas eu lieu. **Jamais facturé** (montant 0), quelle qu'en
  soit la raison (élève, professeur, absence non prévenue — aucune distinction).
- Une séance peut aussi être **supprimée purement et simplement**, sans aucune
  conséquence financière.

### Création
- **Automatique** : l'appli pré-remplit la semaine depuis les créneaux récurrents
  (statut `Prévue`).
- **Manuelle** : bouton **« + séance ponctuelle »** — cours d'essai, rattrapage, cours
  supplémentaire, stage de vacances.

### Champs
| Champ | Pré-rempli depuis | Note |
|---|---|---|
| Date + heure | le créneau | modifiable |
| Élève **ou** Payeur / Foyer | — | élève seul : direct |
| Élèves présents | tous cochés | on décoche les absents |
| Statut | `Prévue` puis `Effectuée` | ou `Annulée` |
| Durée | fiche élève / forfait | pas de 15 min |
| Lieu | fiche élève | Domicile / Visio / Chez le professeur |
| Montant | tarif habituel / forfait | **0** si `Annulée` (reste modifiable) |
| Mode de paiement | fiche élève / payeur | champ **informatif** ; sert au filtre de la liste crédit d'impôt (§7) |
| Facturée ? | non | passée à « oui » depuis la synthèse mensuelle (§9), pas ici |
| Commentaire | vide | **un seul champ libre** (travail fait / à faire) ; pour une famille, l'utilisateur y précise le prénom concerné |

### Rattrapage
- Depuis une séance `Annulée` : action **« Programmer un rattrapage »** → crée une séance
  ponctuelle (même élève, même durée, date pré-remplie à +7 jours), **liée** à la séance
  annulée (`rattrapageDe`). Les deux fiches affichent le lien ; le bouton disparaît une
  fois le rattrapage créé.
- Le rattrapage est une séance normale, **facturée au tarif habituel** (la séance annulée
  ne l'ayant pas été).
- Sinon : **supprimer** la séance annulée, sans rattrapage.

### Visite de foyer
- Quand plusieurs séances concernent le **même payeur le même jour**, l'écran séance
  affiche un bloc **« Visite du foyer »** : un seul statut, un seul montant (pré-rempli
  depuis le forfait du payeur), des cases **présent** par élève.
- À l'enregistrement : la séance qui **porte le montant** est le premier membre présent
  (pour que l'attestation crédit d'impôt la retienne) ; les autres passent à **0 €** et
  sont **rattachées** (`rattacheeA`). Un membre décoché passe en `Annulée`.

### Modification
- Toute séance, même passée, reste **ouvrable et modifiable sans limite de délai**
  (montant, présents, statut, facturée, commentaire).

## 9. Synthèse mensuelle pour facturation

L'appli **ne suit pas les encaissements** (gérés dans Indy). Elle produit la **synthèse
des cours du mois**, qui sert à établir les factures.

- **1 facture par foyer et par mois** → la synthèse est **groupée par foyer**.
- Pour un mois choisi, par foyer : liste des séances `Effectuées` — date, **libellé**
  (auto : « Cours de piano — {Prénom} {Nom} ({durée}) » ; Nom inclus car des élèves
  partagent le même prénom), montant — puis **sous-total foyer** et **total général**.
- Filtre **« non facturées »** (actif par défaut).
- Action : **marquer les séances sélectionnées comme `facturées`**, une fois la facture
  créée dans Indy → elles disparaissent des synthèses suivantes.
- **v1 : écran récap uniquement.** Exports (CSV, PDF par foyer) : envisagés plus tard.

Indy : pas d'API exploitable ni d'import structuré ; l'import PDF (OCR, une facture à la
fois) n'est pas fiable. La voie retenue est la **recopie** de la synthèse à l'écran vers
Indy.

## 10. Rappels

### Tableau de bord « à faire » (à l'ouverture de l'appli) — **acquis**
Toujours fiable, c'est la base. Éléments :
- **Séances à saisir** : cours passés encore en statut `Prévue`.
- **Cours du jour et de demain**.
- **Rattrapages à programmer** : séances `Annulée` sans rattrapage ni suppression —
  reste affiché tant que non traité (en attente de la disponibilité de l'élève).
- **Début de mois** : « faire la synthèse du mois précédent ».

### Rappel quotidien à heure fixe (appli fermée)
Contrainte : l'API de notification programmée à heure fixe (Notification Triggers) est
**abandonnée**. Une PWA seule ne peut pas garantir une notification quotidienne à une
heure précise.

**Décision — v1 : a) + b) ; c) en réserve.** _Fait._

- **a) Via le calendrier du téléphone** _(mécanisme principal)_ : Paramètres → bouton
  **« Ajouter le rappel au calendrier »** → télécharge un fichier **.ics** (évènement
  quotidien récurrent `RRULE:FREQ=DAILY` + alarme, à l'heure choisie). L'utilisateur
  l'ouvre pour l'importer dans l'agenda du téléphone. 100 % fiable, aucun serveur. Si
  l'heure change, re-télécharger.
- **b) Notifications best-effort** _(appoint)_ : bouton **« Activer les notifications »**
  (demande la permission + enregistre un Periodic Background Sync). Le service worker
  affiche alors une **notification générique** quand le navigateur le réveille — **sans
  garantie d'heure ni de jour**.
- **c) Push à heure fixe** _(en réserve, non développé)_ : mini-serveur gratuit
  (cron + web-push). À ajouter seulement si a) ne suffit pas.

**Paramètre :** heure du rappel quotidien, réglable — **défaut 19 h**.

### Ajouter un cours au calendrier — _optionnel, à valider à l'usage_
Bouton sur une séance : crée l'évènement dans l'agenda du téléphone (rappel à l'heure
pile avant le cours).

## 11. Tableau de bord (écran d'accueil)

Ordre d'affichage, de haut en bas :

1. **En-tête** : date du jour ; icône **Paramètres** en haut à droite.
2. **Carte « À faire »** — compacte, **un seul bloc affichant le nombre d'actions en
   attente** (l'agenda doit rester visible sans scroller). Au tap, ouverture du détail :
   - séances passées encore en `Prévue` (« à saisir ») ;
   - rattrapages à programmer (séances `Annulée` sans suite) — persistant ;
   - en début de mois : « faire la synthèse de {mois précédent} ».
   - 0 action → carte discrète « rien à faire ».
3. **Agenda du jour** — bien visible : cours d'aujourd'hui (heure · foyer/élève · lieu ·
   statut) puis **aperçu « Demain »**.
   - **Validation rapide** : un tap sur une séance `Prévue` (accueil ou agenda) ouvre une
     **popin** : « Valider ce cours (1 h — 45 €) » + bouton **OUI** (2 taps = fait),
     bouton **Modifier** (durée / montant dans la popin), bouton **Absent / annulé**,
     lien « Ouvrir la fiche complète ». Pour une visite de foyer : montant unique +
     élèves présents à cocher. Les séances déjà `Effectuée` / `Annulée` ouvrent la fiche.
4. **Chiffres du mois** — en bas : cours effectués, montant du mois, **reste à facturer**
   (= séances `Effectuées` non `facturées`). _Fait._
5. **Bouton « + séance ponctuelle »** — bouton flottant en bas à droite. _Fait._

**Navigation principale** — barre en bas, 5 entrées :
`Accueil` · `Agenda` · `Élèves` · `Séances` · `Synthèse` — Paramètres via l'en-tête.

L'onglet **Séances** est un écran séparé : historique de toutes les séances, tous élèves
confondus, avec filtres (statut, facturée / non, période, élève).

## 12. Agenda / planning

- **Vue Semaine par défaut** : les 7 jours, séances positionnées à l'heure, **couleur
  selon le statut** (`Prévue` / `Effectuée` / `Annulée`). Navigation semaine ± ; bouton
  « aujourd'hui ». Vues Jour et Liste également disponibles.
- **Génération automatique** : à partir des créneaux récurrents des élèves `Actifs`,
  l'appli crée les séances `Prévue` **jusqu'au 31 juillet de l'année scolaire en cours**
  (les créneaux sont valables de septembre à juillet). Regénérée au démarrage, à
  l'enregistrement d'un élève, à l'import CSV et au changement de période sans cours.
- **Regroupement foyer** : séances consécutives au même lieu affichées groupées
  (« Famille Untel — 14 h → 16 h · 3 élèves »).
- **Séances ponctuelles** : ajout direct sur un créneau libre.
- **Pas de chevauchement** : deux élèves actifs ne peuvent pas avoir des créneaux qui se
  recouvrent (même jour, plages horaires qui se croisent). L'enregistrement d'une fiche
  est refusé avec un message nommant l'élève déjà positionné ; l'import CSV le signale en
  avertissement. Les créneaux qui se suivent sans se recouvrir (visite d'un foyer) restent
  autorisés.
- **Périodes sans cours** (vacances scolaires, absences du professeur) : blocage d'une
  **plage de dates** → aucune séance générée dessus. Sort des séances `Prévue` déjà
  créées sur la plage : _à préciser au développement_ (suppression ou passage `Annulée`).
- **Jours fériés** (calendrier français) : **signalés visuellement uniquement**, sans
  blocage — on peut y placer des cours normalement.
- **Changement d'un créneau récurrent** : les séances déjà générées et non encore
  `Effectuée` sont mises à jour ; les séances passées ne bougent pas.

## 13. Paramètres

- **Heure du rappel quotidien** (défaut 19 h).
- Bouton **« Créer / mettre à jour le rappel dans mon calendrier »**.
- **Périodes sans cours** : gestion des plages de dates bloquées (vacances, absences).
- **Sauvegarde / export** des données (voir §14).
- Divers : à compléter au fil du développement.

## 14. Sauvegarde et données

Les données ne vivent que sur l'appareil.

- **Sauvegarde complète** : export d'un fichier **JSON** (toutes les entités) et
  ré-import. Filet de sécurité, présent dès la v1.
- **Rappel périodique** « pense à sauvegarder ».
- **Import CSV des élèves** : chargement en masse depuis un fichier CSV (l'utilisateur a
  beaucoup d'élèves ; la saisie une à une serait trop longue).
  - Un **modèle CSV** est téléchargeable depuis l'appli (en-têtes + exemples).
  - Colonnes : champs de la fiche élève + un bloc **payeur** :
    `payeur_prenom`, `payeur_nom`, `payeur_telephone`, `payeur_email`,
    `payeur_adr_numero`, `payeur_adr_rue`, `payeur_adr_complement`, `payeur_adr_cp`,
    `payeur_adr_ville`.
    - `payeur_prenom` / `payeur_nom` **vides** → l'élève est son propre payeur.
    - **renseignés** → payeur commun ; les lignes portant le **même couple
      prénom + nom** sont regroupées sous un seul foyer (c'est ce payeur qui figure sur
      l'attestation crédit d'impôt).
    - `payeur_adr_*` **vides** → l'adresse du payeur reprend celle de l'élève.
      **renseignées** → adresse propre du payeur (cas d'un grand-parent qui paie à une
      autre adresse). Modifiable ensuite dans l'appli.
  - Les en-têtes sont reconnus souplement (`foyer`, `payeur`, `rep_nom`… sont rattachés
    au bloc payeur).
  - Import avec **aperçu** ligne par ligne et signalement des erreurs / avertissements
    avant validation.
  - Séparateur `;` ou `,` détecté automatiquement ; encodage UTF-8.
- Plus tard éventuellement : export vers un fichier partagé (Drive), à la main de
  l'utilisateur.

## 15. Plan de construction v1

Ordre prévu, chaque étape étant testable sur le téléphone :

1. ✅ **Fondations** : modèle de données IndexedDB + export / import JSON.
2. ✅ **Élèves & Foyers** : liste (actifs / archivés), fiche élève complète, payeurs,
   import CSV.
3. ✅ **Créneaux & Agenda** : génération des séances `Prévue` (2 semaines glissantes),
   vues Semaine / Jour / Liste, regroupement foyer (visuel), périodes sans cours, jours
   fériés signalés. Accueil et écran Séance en version simple (statut, montant,
   commentaire, suppression, séance ponctuelle).
4. ✅ **Séances (compléments)** : visite de foyer (un seul montant, élèves présents cochés,
   le montant est porté par une séance présente pour l'attestation ; les autres passent à
   0 et sont rattachées), rattrapage lié depuis une séance annulée, onglet Séances
   (historique + filtres statut / facturée / élève / mois + total).
5. ✅ **Accueil & Rappels** : chiffres du mois, nudge début-de-mois, bouton flottant ;
   rappel calendrier (.ics récurrent) + notifications best-effort (permission + Periodic
   Background Sync + notification générique du service worker).
6. **Synthèse & Crédit d'impôt** : synthèse mensuelle par foyer + marquage `facturée`,
   liste des cours pour l'attestation (année civile, par foyer, totaux € + heures).
7. **Finitions** : paramètres, rappel de sauvegarde, ajustements d'ergonomie.
