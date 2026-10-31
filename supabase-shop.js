// Supabase : authentification, catalogue, panier, commandes, administration.
(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dt = m => (m / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 3 }) + " DT";
const SHIP = 8000; // 8 DT en millimes (doit rester egal a la valeur de supabase-orders.sql)
const ST = { new: "Nouvelle", preparing: "En préparation", done: "Terminée", cancelled: "Annulée" };
const okImg = u => /^https:\/\//.test(u) || (/^[\w\-./]+$/.test(u) && !u.includes(".."));
const param = k => new URLSearchParams(location.search).get(k);

// ===== CATEGORIES DE CADEAUX (modifiables ici : une seule liste pour le site ET l'admin) =====
const CATEGORIES = [
  { k: "anniversaire", label: "Anniversaire", icon: "🎂" },
  { k: "bebe-naissance", label: "Bébé & naissance", icon: "👶" },
  { k: "amoureux", label: "Cadeaux amoureux", icon: "💖" },
  { k: "fete-des-meres", label: "Fête des mères", icon: "🌷" },
  { k: "fete-des-peres", label: "Fête des pères", icon: "👔" },
  { k: "mariage", label: "Mariage & fiançailles", icon: "💍" },
  { k: "remerciement", label: "Remerciement", icon: "✨" },
  { k: "autres", label: "Autres occasions", icon: "🎁" }
];
const slugify = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const catOf = p => CATEGORIES.find(c => c.k === slugify(p.category) || slugify(c.label) === slugify(p.category)) || CATEGORIES[CATEGORIES.length - 1];
const siteUrl = () => location.href.replace(/[?#].*$/, "").replace(/[^/]*$/, "");
const safeNext = n => (/^[a-z-]+\.html$/.test(n || "") ? n : "compte.html");
const errMsg = e => {
  const m = (e && e.message) || "";
  if (/Invalid login/i.test(m)) return "E-mail ou mot de passe incorrect.";
  if (/not confirmed/i.test(m)) return "Adresse e-mail pas encore confirmée.";
  if (/price_changed/.test(m)) return "Les prix ont changé : revenez au panier pour actualiser.";
  if (/unavailable_product/.test(m)) return "Un produit n’est plus disponible.";
  if (/invalid_shipping/.test(m)) return "Coordonnées de livraison incomplètes.";
  if (/invalid_cart/.test(m)) return "Panier invalide.";
  if (/not_authenticated/.test(m)) return "Veuillez vous connecter.";
  if (/rate limit/i.test(m)) return "Trop de tentatives : patientez avant de réessayer.";
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "Problème de réseau. Réessayez.";
  return m || "Une erreur est survenue.";
};
const show = h => { $("#app").innerHTML = h; };
const hero = (t, s = "") => `<section class="page-hero compact"><h1>${t}</h1>${s ? `<p>${s}</p>` : ""}</section>`;
const box = h => `<section class="section shop-box">${h}<p id="msg" role="status"></p></section>`;
const msg = (t, ok) => { const m = $("#msg"); if (m) { m.textContent = t; m.className = "msg " + (ok ? "ok" : "err"); } };
async function busy(btn, fn) {
  if (btn.disabled) return;
  btn.disabled = true;
  try { await fn(); } catch (e) { msg(errMsg(e), false); } finally { btn.disabled = false; }
}
const toLogin = next => { sessionStorage.setItem("memora-next", next); location.replace("login.html"); };

// ---------- Panier local (ids + quantites seulement ; les prix viennent de la base) ----------
const Cart = {
  get() { try { return JSON.parse(localStorage.getItem("memora-cart")) || {}; } catch { return {}; } },
  set(c) { localStorage.setItem("memora-cart", JSON.stringify(c)); updateNav(); },
  add(id) { const c = this.get(); c[id] = Math.min((c[id] || 0) + 1, 99); this.set(c); },
  setQty(id, q) { const c = this.get(); if (!(q > 0)) delete c[id]; else c[id] = Math.min(Math.floor(q), 99); this.set(c); },
  clear() { localStorage.removeItem("memora-cart"); updateNav(); },
  count() { return Object.values(this.get()).reduce((a, b) => a + b, 0); }
};
async function cartLines() {
  const c = Cart.get(), ids = Object.keys(c);
  if (!ids.length) return { lines: [], sub: 0 };
  const { data, error } = await sb.from("products").select("id,name,price_millimes").in("id", ids);
  if (error) throw error;
  ids.filter(i => !data.some(p => p.id === i)).forEach(i => Cart.setQty(i, 0));
  const lines = data.map(p => ({ ...p, qty: c[p.id] }));
  return { lines, sub: lines.reduce((s, l) => s + l.price_millimes * l.qty, 0) };
}

// ---------- Session ----------
let session = null, isAdmin = false;
async function loadUser() {
  session = null; isAdmin = false;
  const { data: { session: s } } = await sb.auth.getSession();
  if (!s) return;
  const { data: { user }, error } = await sb.auth.getUser(); // verifie aupres du serveur
  if (error || !user) { await sb.auth.signOut(); return; }
  session = s;
  const { data: r } = await sb.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  isAdmin = !!r && r.role === "admin";
}
function updateNav() {
  const nav = $(".main-nav"); if (!nav) return;
  nav.querySelectorAll("[data-inj]").forEach(n => n.remove());
  const add = (h, t) => { const a = document.createElement("a"); a.href = h; a.textContent = t; a.dataset.inj = "1"; nav.appendChild(a); return a; };
  add("panier.html", `Panier (${Cart.count()})`);
  if (session) {
    add("compte.html", "Mon compte");
    if (isAdmin) add("admin.html", "Admin");
    add("#", "Déconnexion").onclick = async e => { e.preventDefault(); await sb.auth.signOut(); location.href = "index.html"; };
  } else add("login.html", "Connexion");
}

// ---------- Commandes (affichage) ----------
const orderHtml = (o, adm) => {
  const s = o.shipping || {};
  return `<details class="order"><summary><strong>${esc(o.reference)}</strong> · ${new Date(o.created_at).toLocaleString("fr-FR")}${adm ? " · " + esc(s.name) : ""} · ${dt(o.total_millimes)} · ${esc(ST[o.status] || o.status)}</summary>
  <ul>${(o.items || []).map(i => `<li>${esc(i.qty)} × ${esc(i.name)} — ${dt(i.unit_millimes)}</li>`).join("")}</ul>
  <p>Sous-total ${dt(o.subtotal_millimes)} · Livraison ${dt(o.shipping_millimes)} · <strong>Total ${dt(o.total_millimes)}</strong></p>
  <p>Livraison : ${esc(s.name)}, ${esc(s.phone)}, ${esc(s.address)}, ${esc(s.city)}<br>Paiement : simulation (aucun débit)</p>
  ${adm ? `<label>Statut <select data-st>${Object.entries(ST).map(([k, v]) => `<option value="${k}"${k === o.status ? " selected" : ""}>${v}</option>`).join("")}</select></label>
  <button class="button" data-save="${esc(o.id)}" data-upd="${esc(o.updated_at)}">Enregistrer</button>` : ""}</details>`;
};

// ---------- Pages ----------
const pages = {};
pages.catalog = async () => {
  const b = $("#catalog"); if (!b) return;
  b.innerHTML = "<p>Chargement du catalogue…</p>";
  const { data, error } = await sb.from("products").select("*").order("id");
  if (error) { b.innerHTML = `<p class="msg err">${esc(errMsg(error))}</p>`; return; }
  if (!data.length) { b.innerHTML = "<p>Aucun produit disponible pour le moment.</p>"; return; }

  const counts = {}; data.forEach(p => { const k = catOf(p).k; counts[k] = (counts[k] || 0) + 1; });
  const tones = ["rose", "blue", "gold"];
  const tiles = $("#cat-tiles"), chips = $("#cat-chips"), title = $("#cat-title"), count = $("#cat-count");
  const cats = CATEGORIES;
  if (tiles) tiles.innerHTML = [{ k: "all", label: "Tout voir", icon: "✳", n: data.length }, ...cats.map(c => ({ ...c, n: counts[c.k] || 0 }))].map((c, i) =>
    `<button type="button" class="cat-tile tone-${tones[i % 3]}" data-cat="${esc(c.k)}"><span class="cat-icon">${c.icon}</span><strong>${esc(c.label)}</strong><small>${c.n ? c.n + " idée" + (c.n > 1 ? "s" : "") : "Bientôt"}</small><span class="cat-go">→</span></button>`).join("");
  if (chips) chips.innerHTML = [{ k: "all", label: "Tout" }, ...cats].map(c =>
    `<button type="button" class="cat-chip" data-cat="${esc(c.k)}">${esc(c.label)}</button>`).join("");

  b.innerHTML = data.map(p => { const c = catOf(p); return `<article class="product-card" data-cat="${c.k}"><div class="product-visual">${okImg(p.image) ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" class="product-img" loading="lazy">` : `<span class="no-img">♡</span>`}<span class="product-badge">${esc(c.label)}</span></div><div class="product-info"><h3 class="product-title">${esc(p.name)}</h3><p class="product-price">${dt(p.price_millimes)}</p><button class="button button-dark" data-add="${esc(p.id)}">Ajouter au panier</button></div></article>`; }).join("") + `<p class="catalog-empty" hidden>Aucun cadeau dans cette catégorie pour le moment.</p>`;

  const select = (k, scroll) => {
    if (k !== "all" && !cats.some(c => c.k === k)) k = "all";
    let shown = 0;
    b.querySelectorAll(".product-card").forEach(card => { const ok = k === "all" || card.dataset.cat === k; card.hidden = !ok; if (ok) shown++; });
    b.querySelector(".catalog-empty").hidden = shown > 0;
    document.querySelectorAll("[data-cat]").forEach(el => { if (!el.classList.contains("product-card")) el.classList.toggle("active", el.dataset.cat === k); });
    const c = cats.find(x => x.k === k);
    if (title) title.textContent = c ? c.label : "Tous les cadeaux";
    if (count) count.textContent = shown + " idée" + (shown > 1 ? "s" : "");
    try { history.replaceState(null, "", k === "all" ? location.pathname : "?cat=" + encodeURIComponent(k)); } catch {}
    if (scroll) $("#produits-liste").scrollIntoView({ behavior: "smooth", block: "start" });
  };
  document.querySelectorAll("#cat-tiles [data-cat]").forEach(el => el.onclick = () => select(el.dataset.cat, true));
  document.querySelectorAll("#cat-chips [data-cat]").forEach(el => el.onclick = () => select(el.dataset.cat, false));
  select(param("cat") || "all", false);

  b.onclick = e => {
    const x = e.target.closest("[data-add]"); if (!x) return;
    Cart.add(x.dataset.add); x.textContent = "Ajouté ✓";
    setTimeout(() => { x.textContent = "Ajouter au panier"; }, 1200);
  };
};

pages.panier = async () => {
  const { lines, sub } = await cartLines();
  if (!lines.length) return show(hero("Votre panier") + box(`<p>Votre panier est vide.</p><a class="button" href="produits.html">Voir les idées cadeaux</a>`));
  show(hero("Votre panier") + box(`<div class="table-wrap"><table class="shop-table"><thead><tr><th>Produit</th><th>Prix</th><th>Qté</th><th>Total</th></tr></thead><tbody>${lines.map(l => `<tr><td>${esc(l.name)}</td><td>${dt(l.price_millimes)}</td><td><input type="number" min="0" max="99" value="${l.qty}" data-qty="${esc(l.id)}" aria-label="Quantité : ${esc(l.name)}"></td><td>${dt(l.price_millimes * l.qty)}</td></tr>`).join("")}</tbody></table></div><p>Sous-total : ${dt(sub)}<br>Livraison : ${dt(SHIP)}<br><strong>Total : ${dt(sub + SHIP)}</strong></p><a class="button button-dark" href="checkout.html">Passer commande</a>`));
  $("#app").onchange = e => { const q = e.target.closest("[data-qty]"); if (q) { Cart.setQty(q.dataset.qty, +q.value); pages.panier(); } };
};

pages.checkout = async () => {
  if (!session) return toLogin("checkout.html");
  const { lines, sub } = await cartLines();
  if (!lines.length) return location.replace("panier.html");
  const total = sub + SHIP, m = session.user.user_metadata || {};
  show(hero("Valider la commande", "Paiement en démonstration : aucun débit, aucune donnée bancaire.") + box(`<form id="f" class="shop-form">
  <label>Nom complet<input name="name" required maxlength="100" value="${esc(((m.first_name || "") + " " + (m.last_name || "")).trim())}"></label>
  <label>Téléphone<input name="phone" type="tel" required maxlength="30"></label>
  <label>Adresse<input name="address" required maxlength="250"></label>
  <label>Ville<input name="city" required maxlength="100"></label>
  <p>Paiement : simulation. Sous-total ${dt(sub)} + livraison ${dt(SHIP)} = <strong>${dt(total)}</strong></p>
  <button class="button button-dark" type="submit">Confirmer la commande</button></form>`));
  $("#f").onsubmit = e => {
    e.preventDefault();
    busy($("button", e.target), async () => {
      let id = sessionStorage.getItem("memora-attempt");
      if (!id) { id = crypto.randomUUID(); sessionStorage.setItem("memora-attempt", id); } // meme id si on reessaie
      const ship = Object.fromEntries(new FormData(e.target));
      const { data, error } = await sb.rpc("create_demo_order", { p_attempt_id: id, p_items: lines.map(l => ({ id: l.id, qty: l.qty })), p_shipping: ship, p_expected_total: total });
      if (error) throw error;
      sessionStorage.removeItem("memora-attempt"); Cart.clear(); // panier vide seulement apres succes
      location.href = "confirmation.html?ref=" + encodeURIComponent(data.reference);
    });
  };
};

pages.confirmation = async () => {
  if (!session) return toLogin("compte.html");
  const { data, error } = await sb.from("orders").select("*").eq("reference", param("ref") || "").maybeSingle();
  show(hero("Commande enregistrée") + box(error ? `<p>${esc(errMsg(error))}</p>` : !data ? "<p>Commande introuvable.</p>" : `<p>Merci ! Référence <strong>${esc(data.reference)}</strong>. Paiement simulé : aucun débit n’a eu lieu.</p>${orderHtml(data, false)}<p><a class="button" href="compte.html">Mon historique</a></p>`));
};

pages.compte = async () => {
  if (!session) return toLogin("compte.html");
  const u = session.user, m = u.user_metadata || {};
  const { data, error } = await sb.from("orders").select("*").eq("user_id", u.id).order("created_at", { ascending: false }).limit(100);
  show(hero("Mon compte") + box(`<p><strong>${esc(((m.first_name || "") + " " + (m.last_name || "")).trim() || "—")}</strong><br>${esc(u.email)}</p><h2>Mes commandes</h2>${error ? `<p>${esc(errMsg(error))}</p>` : !data.length ? "<p>Aucune commande pour le moment.</p>" : `<p><small>Les 100 dernières commandes sont affichées.</small></p>` + data.map(o => orderHtml(o, false)).join("")}`));
};

pages.signup = () => {
  if (param("next")) sessionStorage.setItem("memora-next", param("next"));
  show(hero("Créer un compte") + box(`<form id="f" class="shop-form">
  <label>Prénom<input name="first_name" required maxlength="60"></label>
  <label>Nom<input name="last_name" required maxlength="60"></label>
  <label>E-mail<input name="email" type="email" required autocomplete="email"></label>
  <label>Mot de passe (8 caractères min.)<input name="password" type="password" minlength="8" required autocomplete="new-password"></label>
  <label>Confirmer le mot de passe<input name="confirm" type="password" minlength="8" required autocomplete="new-password"></label>
  <button class="button button-dark" type="submit">Créer mon compte</button> <a href="login.html">J’ai déjà un compte</a></form>`));
  $("#f").onsubmit = e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    if (v.password !== v.confirm) return msg("Les mots de passe ne correspondent pas.", false);
    busy($("button", e.target), async () => {
      const { error } = await sb.auth.signUp({ email: v.email.trim(), password: v.password, options: { data: { first_name: v.first_name.trim(), last_name: v.last_name.trim() }, emailRedirectTo: siteUrl() + "login.html" } });
      if (error) throw error;
      location.href = "verification.html?email=" + encodeURIComponent(v.email.trim());
    });
  };
};

pages.verification = () => {
  const em = param("email") || "";
  show(hero("Vérifiez votre e-mail") + box(`<p>Nous avons demandé l’envoi d’un e-mail de confirmation${em ? " à <strong>" + esc(em) + "</strong>" : ""}. Il peut mettre quelques minutes ou arriver dans les courriers indésirables ; nous ne pouvons pas vérifier qu’il est arrivé. Cliquez sur le lien qu’il contient, puis connectez-vous.</p>${em ? `<button class="button" id="rs">Renvoyer l’e-mail</button> ` : ""}<a class="button button-dark" href="login.html">Me connecter</a>`));
  const r = $("#rs"); if (r) r.onclick = () => busy(r, async () => { const { error } = await sb.auth.resend({ type: "signup", email: em, options: { emailRedirectTo: siteUrl() + "login.html" } }); if (error) throw error; msg("Nouvelle demande envoyée. Patientez quelques minutes.", true); });
};

pages.login = () => {
  if (param("next")) sessionStorage.setItem("memora-next", param("next"));
  const go = () => { const n = sessionStorage.getItem("memora-next"); sessionStorage.removeItem("memora-next"); location.replace(safeNext(n)); };
  if (session) return go();
  show(hero("Connexion") + box(`<form id="f" class="shop-form">
  <label>E-mail<input name="email" type="email" required autocomplete="email"></label>
  <label>Mot de passe<input name="password" type="password" required autocomplete="current-password"></label>
  <button class="button button-dark" type="submit">Se connecter</button> <a href="signup.html">Créer un compte</a></form>`));
  $("#f").onsubmit = e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    busy($("button", e.target), async () => {
      const { error } = await sb.auth.signInWithPassword({ email: v.email.trim(), password: v.password });
      if (error) throw error;
      go();
    });
  };
};

pages.admin = async () => {
  if (!session) return toLogin("admin.html");
  if (!isAdmin) return show(hero("Administration") + box("<p>Cette page est réservée à l’administrateur. Votre compte est un compte client.</p>"));
  const stOpts = Object.entries(ST).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
  show(hero("Administration") + `<section class="section shop-box"><h2>Gestion des commandes</h2>
  <p><button class="button" id="ref">Actualiser</button> <label>Statut <select id="flt"><option value="">Tous les statuts</option>${stOpts}</select></label></p>
  <div id="ol"></div><button class="button" id="more" hidden>Chargement de la suite</button></section>
  <section class="section shop-box"><h2 id="pt">Ajouter un produit</h2><form id="pf" class="shop-form">
  <label>Identifiant (a-z, 0-9, -)<input name="id" required pattern="[a-z0-9-]+" maxlength="60"></label>
  <label>Nom<input name="name" required maxlength="150"></label>
  <label>Catégorie<select name="category" required>${CATEGORIES.map(c => `<option>${c.label}</option>`).join("")}</select></label>
  <label>Prix (DT)<input name="price" type="number" min="0" step="0.001" required></label>
  <label>Image (fichier du site ou URL https)<input name="image" required maxlength="300"></label>
  <label>Description<textarea name="description" rows="3"></textarea></label>
  <label>Caractéristiques (une par ligne)<textarea name="features" rows="3"></textarea></label>
  <label><input type="checkbox" name="available" checked> Visible dans la boutique</label>
  <button class="button button-dark" type="submit">Enregistrer</button> <button class="button" type="button" id="nw">Nouveau produit</button></form>
  <h2>Produits enregistrés</h2><div id="pl"></div><p id="msg" role="status"></p></section>`);
  let off = 0, prods = [], editing = null;
  const loadOrders = async reset => {
    if (reset) { off = 0; $("#ol").innerHTML = "<p>Chargement…</p>"; }
    let q = sb.from("orders").select("*").order("created_at", { ascending: false }).range(off, off + 49);
    if ($("#flt").value) q = q.eq("status", $("#flt").value);
    const { data, error } = await q;
    if (error) return msg(errMsg(error), false);
    if (reset) $("#ol").innerHTML = data.length ? "" : "<p>Aucune commande.</p>";
    $("#ol").insertAdjacentHTML("beforeend", data.map(o => orderHtml(o, true)).join(""));
    off += data.length; $("#more").hidden = data.length < 50;
  };
  const loadProds = async () => {
    const { data, error } = await sb.from("products").select("*").order("id");
    if (error) return msg(errMsg(error), false);
    prods = data;
    $("#pl").innerHTML = data.length ? data.map(p => `<p class="prow"><strong>${esc(p.name)}</strong> · ${dt(p.price_millimes)}${p.available ? "" : " · masqué"} <button class="button" data-edit="${esc(p.id)}">Modifier</button> <button class="button" data-del="${esc(p.id)}">Supprimer</button></p>`).join("") : "<p>Aucun produit.</p>";
  };
  const reset = () => { editing = null; $("#pf").reset(); $("#pf").id.disabled = false; $("#pt").textContent = "Ajouter un produit"; };
  $("#flt").onchange = () => loadOrders(true);
  $("#nw").onclick = reset;
  $("#pf").onsubmit = e => {
    e.preventDefault();
    const f = e.target, v = Object.fromEntries(new FormData(f));
    const price = Math.round(parseFloat(String(v.price).replace(",", ".")) * 1000);
    const id = editing || (v.id || "").trim();
    if (!/^[a-z0-9-]+$/.test(id)) return msg("Identifiant invalide.", false);
    if (!Number.isFinite(price) || price < 0) return msg("Prix invalide.", false);
    if (!okImg(v.image.trim())) return msg("Image : fichier du site ou URL https uniquement.", false);
    const row = { name: v.name.trim(), category: v.category.trim(), description: v.description.trim(), price_millimes: price, image: v.image.trim(), features: v.features.split("\n").map(s => s.trim()).filter(Boolean), available: f.available.checked };
    busy($("button[type=submit]", f), async () => {
      const { error } = editing ? await sb.from("products").update(row).eq("id", id) : await sb.from("products").insert({ id, ...row });
      if (error) throw error;
      msg("Produit enregistré.", true); reset(); await loadProds();
    });
  };
  $("#app").onclick = e => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.id === "ref") return busy(t, () => loadOrders(true));
    if (t.id === "more") return busy(t, () => loadOrders(false));
    if (t.dataset.save) return busy(t, async () => {
      const status = t.parentElement.querySelector("[data-st]").value;
      const { data, error } = await sb.from("orders").update({ status }).eq("id", t.dataset.save).eq("updated_at", t.dataset.upd).select("id");
      if (error) throw error;
      if (!data.length) { msg("Cette commande a été modifiée entre-temps : liste actualisée, réessayez.", false); }
      else msg("Statut enregistré.", true);
      await loadOrders(true);
    });
    if (t.dataset.edit) {
      const p = prods.find(x => x.id === t.dataset.edit); if (!p) return;
      const f = $("#pf"); editing = p.id; $("#pt").textContent = "Modifier le produit";
      f.id.value = p.id; f.id.disabled = true; f.name.value = p.name; f.category.value = catOf(p).label;
      f.price.value = p.price_millimes / 1000; f.image.value = p.image; f.description.value = p.description;
      f.features.value = (p.features || []).join("\n"); f.available.checked = p.available; f.scrollIntoView();
    }
    if (t.dataset.del && confirm("Supprimer ce produit définitivement ?")) busy(t, async () => {
      const { error } = await sb.from("products").delete().eq("id", t.dataset.del);
      if (error) throw error;
      msg("Produit supprimé.", true); await loadProds();
    });
  };
  await Promise.all([loadOrders(true), loadProds()]);
};

(async () => {
  if (typeof sb === "undefined") { console.error("Client Supabase absent : vérifiez l’ordre des scripts."); return; }
  try { await loadUser(); } catch (e) { console.error(e); }
  updateNav();
  const fn = pages[document.body.dataset.page];
  if (fn) { try { await fn(); } catch (e) { const a = $("#app"); const m = `<p class="msg err">${esc(errMsg(e))}</p>`; if (a) a.innerHTML = m; else if ($("#catalog")) $("#catalog").innerHTML = m; } }
})();
})();
