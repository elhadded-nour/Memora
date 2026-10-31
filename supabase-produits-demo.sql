-- Produits de démonstration Memora (2 par catégorie)
-- À exécuter dans Supabase > SQL Editor. Relançable : les produits déjà présents ne sont pas dupliqués.
-- Les prix sont en millimes (45000 = 45 DT). Les images sont des chemins à remplacer
-- par vos vraies photos (dossier images/) ; sans fichier, le site affiche un ♡.

insert into public.products (id, name, category, description, price_millimes, image, features, available) values
  ('anniversaire-coffret-surprise', 'Coffret Anniversaire Surprise', 'Anniversaire', 'Un coffret festif préparé avec soin, avec carte personnalisée.', 45000, 'images/anniversaire-1.jpg', ARRAY['Emballage cadeau inclus', 'Carte personnalisée', 'Composition au choix'], true),
  ('anniversaire-bougie-carte', 'Bougie parfumée & carte', 'Anniversaire', 'Une bougie parfumée accompagnée d''un petit mot pour souhaiter un joyeux anniversaire.', 28000, 'images/anniversaire-2.jpg', ARRAY['Parfum au choix', 'Carte avec message'], true),
  ('bebe-coffret-naissance', 'Coffret Naissance', 'Bébé & naissance', 'Un coffret tout doux pour accueillir bébé et féliciter les parents.', 65000, 'images/bebe-1.jpg', ARRAY['Emballage cadeau inclus', 'Prénom personnalisable'], true),
  ('bebe-doudou-body', 'Doudou & body brodé', 'Bébé & naissance', 'Un doudou moelleux et un body avec le prénom de bébé.', 55000, 'images/bebe-2.jpg', ARRAY['Broderie du prénom', 'Matières douces'], true),
  ('amoureux-love-box', 'Love Box', 'Cadeaux amoureux', 'Une boîte romantique pour dire je t''aime autrement.', 70000, 'images/amoureux-1.jpg', ARRAY['Message personnalisé', 'Emballage cadeau inclus'], true),
  ('amoureux-bracelet-grave', 'Bracelet gravé', 'Cadeaux amoureux', 'Un bracelet avec une gravure à vos initiales ou une date.', 38000, 'images/amoureux-2.jpg', ARRAY['Gravure personnalisée', 'Livré dans un écrin'], true),
  ('meres-coffret-douceur', 'Coffret Maman Douceur', 'Fête des mères', 'Un coffret plein de douceur pour gâter maman.', 60000, 'images/meres-1.jpg', ARRAY['Emballage cadeau inclus', 'Carte personnalisée'], true),
  ('meres-fleurs-seches', 'Bouquet de fleurs séchées & carte', 'Fête des mères', 'Un joli bouquet qui dure, avec un message pour maman.', 35000, 'images/meres-2.jpg', ARRAY['Fleurs séchées', 'Carte avec message'], true),
  ('peres-coffret-cafe', 'Coffret Papa Café', 'Fête des pères', 'Un coffret pour les pauses café de papa.', 55000, 'images/peres-1.jpg', ARRAY['Emballage cadeau inclus', 'Carte personnalisée'], true),
  ('peres-porte-cles', 'Porte-clés gravé', 'Fête des pères', 'Un porte-clés avec une gravure personnelle.', 20000, 'images/peres-2.jpg', ARRAY['Gravure personnalisée'], true),
  ('mariage-coffret-maries', 'Coffret Jeunes Mariés', 'Mariage & fiançailles', 'Un beau coffret pour féliciter les futurs ou jeunes mariés.', 90000, 'images/mariage-1.jpg', ARRAY['Emballage cadeau inclus', 'Message personnalisé'], true),
  ('mariage-cadre-photo', 'Cadre photo personnalisé', 'Mariage & fiançailles', 'Un cadre avec vos noms et la date de l''événement.', 45000, 'images/mariage-2.jpg', ARRAY['Texte personnalisable'], true),
  ('merci-petit-coffret', 'Petit coffret Merci', 'Remerciement', 'Une petite attention pour dire merci avec le sourire.', 25000, 'images/merci-1.jpg', ARRAY['Emballage cadeau inclus', 'Carte Merci'], true),
  ('merci-carte-chocolats', 'Carte & chocolats', 'Remerciement', 'Une carte personnalisée accompagnée de chocolats.', 18000, 'images/merci-2.jpg', ARRAY['Message personnalisé'], true),
  ('autres-boite-surprise', 'Boîte cadeau surprise', 'Autres occasions', 'Une boîte surprise pour faire plaisir, même sans occasion.', 40000, 'images/autres-1.jpg', ARRAY['Composition selon budget', 'Emballage cadeau inclus'], true),
  ('autres-emballage-carte', 'Emballage cadeau & carte personnalisée', 'Autres occasions', 'La touche finale pour rendre votre cadeau encore plus personnel.', 12000, 'images/autres-2.jpg', ARRAY['Papier et ruban au choix', 'Message personnalisé'], true)
on conflict (id) do nothing;