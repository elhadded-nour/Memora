// Menu mobile : ouvre ou ferme la navigation.
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.textContent = isOpen ? "✕" : "☰";
  });
}

// Affiche l'année actuelle dans le pied de page.
document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

// Filtre les cartes sur la page des idées cadeaux.
const filterButtons = document.querySelectorAll(".filter-btn");
const productCards = document.querySelectorAll(".product-card");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedFilter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    productCards.forEach((card) => {
      const shouldShow = selectedFilter === "all" || card.dataset.category === selectedFilter;
      card.hidden = !shouldShow;
    });
  });
});

// Le formulaire montre une confirmation locale : il n'envoie pas de message.
const contactForm = document.querySelector("#contact-form");
const formFeedback = document.querySelector("#form-feedback");

if (contactForm && formFeedback) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    formFeedback.textContent = "Merci ! Le formulaire fonctionne en mode démonstration, mais aucun message n’a été envoyé. Ajoutez un service de réception avant la mise en ligne.";
  });
}
