// supabase-client.js
// Initialisation unique du client Supabase pour Memora

// Remplacez ces valeurs par les vôtres (récupérées depuis les paramètres de votre projet Supabase)
const SUPABASE_URL = 'https://ehmnwonvpctulbebohbo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_kk_uAH_bVt5OqV8uP5lxhw_M0tplAyu';

// Vérification de sécurité de base pour éviter les plantages silencieux
if (!SUPABASE_URL || SUPABASE_URL.includes('VOTRE_')) {
    console.warn("⚠️ Veuillez configurer votre SUPABASE_URL dans supabase-client.js");
}

// Création et exportation globale du client Supabase
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Intercepter l'envoi du formulaire
document.querySelector('form').addEventListener('submit', async (e) => {
  e.preventDefault(); // Empêcher le rechargement de la page

  // Récupérer les valeurs saisies par le client
  const nom = document.querySelector('#nom').value;
  const telephone = document.querySelector('#telephone').value;

  // Envoyer à la table 'orders' dans Supabase
  const { data, error } = await supabase
    .from('orders')
    .insert([{ nom: nom, telephone: telephone }]);

  if (error) {
    alert('Erreur lors de la commande : ' + error.message);
  } else {
    alert('Commande envoyée avec succès !');
  }
});