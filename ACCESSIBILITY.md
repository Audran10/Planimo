# Accessibilité — Planimo

## Référentiel choisi

RGAA 4.1 (Référentiel Général d'Amélioration de l'Accessibilité)

## Mesures mises en place

### Navigation

- Skip link « Aller au contenu principal » en début de page (`app/layout.tsx`), ciblant `#main-content` sur le layout dashboard et sur le layout auth.
- Navigation principale dans une balise `nav` avec `aria-label="Navigation principale"`.
- `aria-current="page"` sur le lien de navigation actif.
- Tous les éléments interactifs accessibles au clavier (Tab, Enter, Space) — y compris les zones cliquables du plan interactif SVG.

### Formulaires

- Labels associés à chaque champ via `htmlFor`/`id` (géré par le composant `Form` partagé).
- Champs en erreur avec `aria-invalid="true"` et `aria-describedby` (déjà géré nativement par `FormControl`/`useFormField`).
- Messages d'erreur avec `role="alert"` (ajouté une fois sur le composant `FormMessage` partagé — s'applique automatiquement à tous les formulaires) et un `id` unique.
- Champs requis avec `aria-required="true"` sur les formulaires : login, register, biens, appartements, locataires, documents, interventions.
- Bannières d'erreur serveur (globales, hors-champ) avec `role="alert"`.

### Composants interactifs

- Boutons icône avec `aria-label` descriptif : basculer le thème, fermer (dialog/sheet), supprimer, modifier, renommer, confirmer/annuler le renommage, menu d'options (3 points), télécharger, ouvrir le menu de navigation (mobile).
- Icônes décoratives (accompagnant un texte visible, ou purement illustratives) avec `aria-hidden="true"` dans l'ensemble des cartes, listes, en-têtes et états vides du codebase.
- Dialogs avec `DialogTitle` visible sur l'ensemble des formulaires modaux (aucun titre `sr-only` nécessaire — tous les dialogs ont déjà un titre visible).
- Zones du plan interactif avec `role="button"`, `tabIndex={0}`, `aria-label` (« Ouvrir la pièce {nom} ») et navigation clavier (Enter/Space).

### Tableaux

- En-têtes avec `scope="col"` (tableau des locataires).
- `aria-label="Liste des locataires actifs"` sur la table.

### Thème et contrastes

- Support dark/light mode natif.
- Couleur d'accent indigo (#6366F1) avec ratio de contraste suffisant sur fond blanc (4.54:1) et fond sombre.
- Texte `muted-foreground` vérifié pour un contraste minimum de 3:1.

## Limites connues

- Le plan interactif SVG reste complexe pour les lecteurs d'écran — chaque zone est atteignable et activable au clavier (Tab + Enter/Espace), et une description textuelle des pièces reste disponible dans le panel latéral (`RoomDetailPanel`), mais la représentation spatiale du plan lui-même n'est pas restituée.
- Les PDF uploadés ne sont pas accessibles nativement.
- Le tableau des documents (`DocumentsTable`) ne porte pas encore `scope="col"`/`aria-label` — seul le tableau des locataires était dans le périmètre de cette itération ; à traiter en cohérence dans une prochaine passe.
- Le bouton de suppression de membre (`RemoveMemberButton`) utilise un libellé contextuel (« Retirer ce membre ») plutôt que le libellé générique « Supprimer », afin de rester distinguable lorsque plusieurs boutons de ce type apparaissent dans une même liste.
