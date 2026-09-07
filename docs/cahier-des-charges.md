# Suivi Piano — Cahier des charges

> Document de travail, construit au fil des échanges. Les sections marquées _À définir_
> seront complétées ensuite.

## 1. Contexte et objectif

Application pour un professeur de piano : suivre ses élèves, son planning, les cours
effectués (date, durée, montant) et les paiements, avec des rappels.

**Ce n'est pas un logiciel de facturation** : pas d'édition de factures. On enregistre
les cours donnés et les règlements. Une **attestation fiscale annuelle** (crédit d'impôt
services à la personne) pourra être produite par payeur.

## 2. Principes généraux

- **Application web installable (PWA)** : icône sur l'écran d'accueil Android, plein écran.
- **Fonctionne hors ligne.**
- **Données stockées uniquement sur l'appareil** (IndexedDB). Rien n'est envoyé sur un
  serveur. L'hébergement (GitHub Pages) ne sert que le code de l'application.
- **Sauvegarde/export** à la main de l'utilisateur (format à définir) — indispensable
  puisque les données ne vivent que sur le téléphone.
- **Saisie la plus simple possible**, en particulier pour l'enregistrement d'une séance.
- Langue : français.

## 3. Entités

| Entité | Rôle |
|---|---|
| **Élève** | Une personne à qui on donne cours (identité, créneau, niveau, progression). Ne porte pas de montant. |
| **Payeur / Foyer** | Qui paie et reçoit l'attestation fiscale. Peut regrouper plusieurs élèves (une famille). |
| **Séance** | Un cours donné = un évènement facturable : date, lieu, durée, **un montant**, mode de paiement, payé ou non, élèves présents. |

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
| Élève seul | Léa · 30 € · 45 min · chèque · payé |
| Famille | Famille Untel · 60 € · 2 h · virement · payé · présents : Marie, Tom |

_(Détail complet de l'écran séance : voir §8, à définir.)_

## 7. Attestation crédit d'impôt (principe)

Calculée **à partir des séances, regroupées par Payeur**, sur une année civile :
total payé + nombre d'heures. Conforme à une attestation de services à la personne :
**aucun détail par élève n'est requis**.

Répartition par élève (parts égales) possible **uniquement** pour des statistiques de
revenu internes, jamais au moment de la saisie.

## 8. Séance / saisie d'un cours — _À définir (point 3)_

Points à traiter : statut présent / absent / annulé, cours de rattrapage, commentaire
sur le travail fait / à faire, séance hors créneau habituel, modification a posteriori.

## 9. Suivi des paiements — _À définir (point 4)_

Granularité (par séance, par mois, par forfait), état payé / dû, rapprochement des
règlements, modes de paiement à distinguer.

## 10. Rappels — _À définir (point 5)_

Types de rappels utiles (cours du jour à saisir, élève absent à reprogrammer, paiement
en retard…), mécanisme technique (tableau de bord à l'ouverture + notifications
best-effort + export agenda).

## 11. Tableau de bord — _À définir (point 6)_

Ce que le professeur voit à l'ouverture de l'application.

## 12. Agenda / planning — _À définir_

Génération de la semaine à partir des créneaux récurrents, regroupement visuel des
séances d'un même foyer à la même adresse, séances ponctuelles.
