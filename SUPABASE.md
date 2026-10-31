# Memora — Supabase + Vercel

Boutique en ligne de cadeaux (HTML / CSS / JavaScript) connectée à Supabase (authentification + base de données) et publiée sur Vercel. Le paiement est une **simulation** : aucun débit, aucune donnée bancaire.

- Site publié : https://memora-site-ten.vercel.app
- Project URL Supabase : https://ehmnwonvpctulbebohbo.supabase.co
- Clé utilisée dans le site : **Publishable key** (`sb_publishable_…`). Aucune clé `sb_secret_` / `service_role` ni mot de passe de base dans le code.

## 1. Architecture

| Élément | Emplacement | Rôle |
|---|---|---|
| HTML, CSS, JavaScript, images | Dossier du projet, puis Vercel | Présenter le site et les formulaires |
| Supabase Auth | Supabase | Comptes, mots de passe, sessions, e-mail de confirmation |
| `products` | Base Supabase | Catalogue (catégories par occasion) |
| `user_roles` | Base Supabase | Identifier les administrateurs |
| `orders` | Base Supabase | Commandes |
| Panier | Navigateur | Articles avant validation |

Vercel héberge le site ; Supabase héberge l'authentification et la base. Les fichiers `.sql` ne sont pas exécutés automatiquement : ils se lancent à la main dans le SQL Editor de Supabase.

## 2. Fichiers du projet

- Pages : `index.html`, `produits.html`, `signup.html`, `login.html`, `verification.html`, `compte.html`, `panier.html`, `checkout.html`, `confirmation.html`, `admin.html` (+ `produit-vedette.html`, `a-propos.html`, `contact.html`)
- `style.css`, `shop.css`, `script.js`
- `supabase-client.js` : URL + clé publique + client (une seule initialisation)
- `supabase-shop.js` : authentification, catalogue, panier, commandes, administration
- `supabase-setup.sql`, `supabase-orders.sql`, `supabase-admin.sql`, `supabase-produits-demo.sql`
- `images/` et `images/categories/`

Ordre de chargement des scripts (avec `defer`) : bibliothèque Supabase v2 → `supabase-client.js` → `supabase-shop.js` → `script.js`.

## 3. Mise en place Supabase

1. Créer le projet sur supabase.com ; garder le mot de passe de la base en privé (jamais dans le code).
2. Connect → copier **Project URL** et **Publishable key** dans `supabase-client.js`.
3. SQL Editor, dans cet ordre :
   1. `supabase-setup.sql` : tables `products` et `user_roles`, fonction `is_admin()`, droits, RLS (base neuve uniquement)
   2. `supabase-orders.sql` : table `orders`, droits, RLS, fonction `create_demo_order` (relançable sans supprimer les commandes)
   3. `supabase-produits-demo.sql` : produits de démonstration (2 par catégorie)
4. Vérifier dans Table Editor : `products`, `user_roles`, `orders`, avec RLS activé.

## 4. Authentification

Authentication → URL Configuration :
- **Site URL** : `https://memora-site-ten.vercel.app`
- **Redirect URLs** : `http://localhost:8000/verification.html`, `https://memora-site-ten.vercel.app/verification.html`, `https://memora-site-ten.vercel.app/login.html`

Parcours : `signup.html` → e-mail de confirmation → clic sur le lien → `login.html` → `compte.html`.
Test local : `python -m http.server 8000` puis `http://localhost:8000` (pas `file:///`).

## 5. Compte administrateur

1. Créer et confirmer un compte, puis Authentication → Users → copier l'UUID.
2. Dans `supabase-admin.sql`, remplacer `VOTRE-UUID` par cet UUID et exécuter dans le SQL Editor.
3. Se déconnecter puis se reconnecter : le lien « Admin » apparaît.

L'attribution du rôle se fait uniquement dans le SQL Editor, jamais depuis le navigateur.

## 6. Sécurité

- RLS activé sur `products`, `orders`, `user_roles`.
- Visiteur : lit uniquement les produits disponibles, aucune commande.
- Client : lit uniquement ses propres commandes ; ne peut modifier ni rôle, ni prix, ni statut.
- Admin : gère les produits et consulte toutes les commandes ; seul le statut d'une commande est modifiable ; un changement concurrent est signalé (`updated_at`).
- Les montants sont calculés par la base (`create_demo_order`) à partir du catalogue ; la même tentative de commande ne crée jamais de doublon.
- Aucune clé secrète dans le navigateur.

## 7. Déploiement Vercel

Dossier du projet déployé sur Vercel (preset **Other**, commande de build vide, racine = dossier contenant `index.html`). Après toute modification des fichiers, redéployer.

## 8. Tests réalisés

| Profil | Vérification | Résultat |
|---|---|---|
| Visiteur | Voit les produits, aucune commande, invité à se connecter | À compléter |
| Client A | Commande de démo, historique, panier vidé après succès, pas de page admin | À compléter |
| Client B | Ne voit pas les commandes de A, ne peut rien modifier | À compléter |
| Admin | CRUD produits (avec confirmation), toutes les commandes, changement de statut | À compléter |

## 9. Erreurs rencontrées

- `permission denied for table orders` (page admin) : droits manquants sur la table → `grant select on public.orders to authenticated;` et `grant update (status) on public.orders to authenticated;`.
- Catalogue vide : `supabase-setup.sql` ou `supabase-produits-demo.sql` non exécuté, ou RLS.
- Lien de confirmation vers une mauvaise adresse : Site URL / Redirect URLs.
- Pas de lien Admin : mauvais UUID, script non exécuté, ou reconnexion oubliée.
