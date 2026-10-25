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