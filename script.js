/* =========================================================
CONFIGURATION — chargée depuis config.json
========================================================= */

/*
 * On stocke ici la configuration qui sera lue depuis
 * le fichier config.json. Elle vaut null au départ,
 * et sera remplie au tout début de l'initialisation.
 */
let CONFIG = null;

/*
 * Réglages qui dépendent de la config.
 * On les déclare avec `let` (et pas `const`) car leur valeur
 * sera écrasée après le chargement de config.json.
 */
let CLICK_RADIUS = 70;         // valeur par défaut, remplacée après loadConfig()
let READING_DELAY = 1300;      // idem
let currentLang = "fr";        // sera remplacé par CONFIG.defaultLanguage

/*
 * Fonction qui va chercher config.json et le range dans CONFIG.
 * Elle est `async` car fetch() prend du temps.
 */
async function loadConfig() {

    const response = await fetch("config.json");

    if (!response.ok) {
        throw new Error(`Impossible de charger config.json (${response.status})`);
    }

    CONFIG = await response.json();

    /* On applique les réglages issus du fichier. */
    CLICK_RADIUS  = CONFIG.clickRadius;
    READING_DELAY = CONFIG.readingDelay;
    currentLang   = CONFIG.defaultLanguage;

    console.log("Config chargée :", CONFIG);

}

/* =========================================================
MODE SOMBRE
========================================================= */

const themeButton = document.querySelector("#theme-toggle");

themeButton.addEventListener("click", function () {

    document.body.classList.toggle("dark");

    updateThemeButtonLabel();

});

/*
 * Met à jour le libellé du bouton de thème
 * en tenant compte de la langue ET de l'état actuel.
 */
function updateThemeButtonLabel() {

    const isDark = document.body.classList.contains("dark");
    const key = isDark ? "buttons.lightMode" : "buttons.darkMode";

    const translations = translationsCache[currentLang];

    if (translations) {
        const value = getNestedValue(translations, key);
        if (typeof value === "string") {
            themeButton.textContent = value;
        }
    }

}

/* =========================================================
SECTIONS DU CV — OUVERTURE / FERMETURE
========================================================= */

const sections = document.querySelectorAll(".cv-section");

sections.forEach(function (section) {

    const button = section.querySelector(".section-title");

    button.addEventListener("click", function () {
        openSection(section);
    });

});

function openSection(sectionToOpen) {

    const wasOpen = sectionToOpen.classList.contains("open");

    sections.forEach(function (section) {

        /* On ferme toutes les sections. */
        section.classList.remove("open");

        /* Si celle cliquée était fermée, on la rouvre. */
        if (section === sectionToOpen && !wasOpen) {
            section.classList.add("open");
        }

    });

}

/* =========================================================
NAVIGATION — OUVERTURE AUTOMATIQUE DE LA SECTION CIBLÉE
========================================================= */

document.querySelectorAll("nav a").forEach(function (link) {

    link.addEventListener("click", function () {

        const href = link.getAttribute("href") || "";

        /* On ne traite que les ancres internes (#xxx). */
        if (!href.startsWith("#")) {
            return;
        }

        const targetId = href.slice(1);
        const targetSection = document.getElementById(targetId);

        if (!targetSection) {
            return;
        }

        /*
         * On laisse le scroll natif se faire,
         * puis on ouvre la section après 50 ms.
         */
        setTimeout(function () {
            openSection(targetSection);
        }, 50);

    });

});

/* =========================================================
MOUSTIQUE
========================================================= */

const fly = document.querySelector("#fly");
const impact = document.querySelector("#impact");

let currentSection = null;
let isEscaping = false;

/* Mémorise l'instant de la dernière esquive (anti-rebond). */
let lastEscapeTime = 0;

/* Renvoie un entier aléatoire entre min et max inclus. */
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* Renvoie la liste de toutes les sections du CV. */
function getSectionTargets() {
    return Array.from(document.querySelectorAll(".cv-section"));
}

/* Place le moustique au centre, puis le déplace vers une section. */
function placeFlyInitially() {

    const targets = getSectionTargets();

    if (targets.length === 0) return;

    fly.style.left = `${window.innerWidth / 2}px`;
    fly.style.top = `${window.innerHeight / 2}px`;

    requestAnimationFrame(function () {
        moveFlyToSection(targets[0]);
    });

}

/* Déplace le moustique vers une position aléatoire de la section. */
function moveFlyToSection(section) {

    const sectionRect = section.getBoundingClientRect();
    const padding = 35;

    let minX = sectionRect.left + padding;
    let maxX = sectionRect.right - padding;

    let minY = Math.max(100, sectionRect.top + padding);
    let maxY = Math.min(window.innerHeight - 70, sectionRect.bottom - padding);

    let x, y;

    if (maxX > minX) {
        x = random(minX, maxX);
    } else {
        x = window.innerWidth / 2;
    }

    if (maxY > minY) {
        y = random(minY, maxY);
    } else {
        y = random(120, window.innerHeight - 100);
    }

    fly.style.left = `${x}px`;
    fly.style.top = `${y}px`;

    currentSection = section;

}

/* Trouve la carte (.card) sous le point (x, y). */
function findCardAtPoint(x, y) {

    const cards = Array.from(document.querySelectorAll(".card"));

    for (let i = cards.length - 1; i >= 0; i--) {

        const rect = cards[i].getBoundingClientRect();

        if (
            x >= rect.left && x <= rect.right &&
            y >= rect.top  && y <= rect.bottom
        ) {
            return cards[i];
        }

    }

    return null;

}

/* Ajoute un cratère sur la carte au point (x, y). */
function leaveCraterAtPoint(x, y) {

    const card = findCardAtPoint(x, y);
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const localX = x - rect.left;
    const localY = y - rect.top;

    const crater = document.createElement("span");
    crater.className = "crater";
    crater.style.left = `${localX}px`;
    crater.style.top = `${localY}px`;

    card.appendChild(crater);

}

/* Joue l'animation du champignon atomique au point (x, y). */
function playMiniMushroom(x, y) {

    impact.classList.remove("show");
    void impact.offsetWidth;

    impact.style.left = `${x}px`;
    impact.style.top = `${y}px`;

    impact.innerHTML = '<span class="halo"></span>';

    void impact.offsetWidth;

    impact.classList.add("show");

}

/* Fait s'échapper le moustique, joue l'explosion et le cratère. */
function escapeFly(originX, originY) {

    if (isEscaping) return;

    isEscaping = true;
    lastEscapeTime = Date.now();

    /* Position de référence : celle passée, ou celle du moustique. */
    let x = originX;
    let y = originY;

    if (typeof x !== "number" || typeof y !== "number") {
        const rect = fly.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
    }

    const targets = getSectionTargets();
    if (targets.length === 0) {
        isEscaping = false;
        return;
    }

    /* Choisir une autre section que la section courante. */
    let candidates = targets.filter(s => s !== currentSection);
    if (candidates.length === 0) candidates = targets;

    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const targetRect = target.getBoundingClientRect();

    /* Étape 1 : le moustique part. */
    if (targetRect.bottom < 0 || targetRect.top > window.innerHeight) {

        target.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => moveFlyToSection(target), 350);

    } else {

        moveFlyToSection(target);

    }

    /* Étape 2 : explosion + cratère après 120 ms. */
    setTimeout(function () {
        playMiniMushroom(x, y);
        leaveCraterAtPoint(x, y);
    }, 120);

    /* Étape 3 : on libère le verrou après READING_DELAY ms. */
    setTimeout(function () {
        isEscaping = false;
        impact.classList.remove("show");
    }, READING_DELAY);

}

/* Clic près du moustique : on le fait s'échapper. */
document.addEventListener("click", function (event) {

    /* Anti-rebond : on ignore les clics pendant 300 ms après une esquive. */
    if (Date.now() - lastEscapeTime < 300) return;

    const rect = fly.getBoundingClientRect();
    const flyX = rect.left + rect.width / 2;
    const flyY = rect.top + rect.height / 2;

    const dx = event.clientX - flyX;
    const dy = event.clientY - flyY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < CLICK_RADIUS) {
        escapeFly(event.clientX, event.clientY);
    }

});

/* =========================================================
WARNING LIENS SUSPECTS
========================================================= */

const warningOverlay = document.querySelector("#warning-overlay");

document.addEventListener("click", function (event) {

    /* Anti-rebond : on ignore si on vient de faire une esquive. */
    if (Date.now() - lastEscapeTime < 300) return;

    const link = event.target.closest("a");
    if (!link) return;

    const href = link.getAttribute("href") || "";
    const isGithub = href.includes("github.com");
    const isExternal = link.getAttribute("target") === "_blank";

    if (!isGithub && !isExternal) return;

    event.preventDefault();

    warningOverlay.classList.add("show");
    warningOverlay.setAttribute("aria-hidden", "false");

});

document.addEventListener("keydown", function (event) {

    if (event.key !== "Escape") return;
    if (!warningOverlay.classList.contains("show")) return;

    warningOverlay.classList.remove("show");
    warningOverlay.setAttribute("aria-hidden", "true");

});

/* =========================================================
INITIALISATION
========================================================= */

/*
 * IMPORTANT : on attend que la config soit chargée
 * avant de faire quoi que ce soit d'autre (langue, etc.).
 * On utilise DOMContentLoaded (le HTML est prêt)
 * et on est dans une fonction async pour pouvoir utiliser await.
 */
document.addEventListener("DOMContentLoaded", async function () {

    try {

        /* 1. Charger config.json → remplit CONFIG + réglages. */
        await loadConfig();

        /* 2. Charger et appliquer la langue par défaut. */
        await changeLanguage(currentLang);

    } catch (error) {

        console.error("Erreur d'initialisation :", error);

    }

});

/* Placement initial du moustique, une fois la page chargée. */
window.addEventListener("load", function () {

    sections.forEach(s => s.classList.remove("open"));

    setTimeout(function () {
        placeFlyInitially();
    }, 400);

});

/* Repositionner le moustique quand la fenêtre change de taille. */
window.addEventListener("resize", function () {

    if (currentSection) {
        moveFlyToSection(currentSection);
    }

});

/* =========================================================
TÉLÉCHARGEMENT DU CV (impression PDF)
========================================================= */

const downloadButton = document.querySelector("#download-cv");

if (downloadButton) {

    downloadButton.addEventListener("click", function (event) {

        event.preventDefault();
        window.print();

    });

} else {

    console.warn(
        "Bouton #download-cv introuvable. " +
        "Vérifie que le HTML contient bien un <button id=\"download-cv\">."
    );

}

/* =========================================================
INTERNATIONALISATION (i18n) — Chargement JSON
========================================================= */

const langButton = document.querySelector("#lang-toggle");

/* Cache des traductions déjà chargées : { fr: {...}, ko: {...} } */
const translationsCache = {};

/*
 * Charge un fichier locales/<lang>.json.
 * Renvoie une promesse qui résout avec l'objet JSON.
 */
async function loadTranslations(lang) {

    if (translationsCache[lang]) {
        return translationsCache[lang];
    }

    const response = await fetch(`locales/${lang}.json`);

    if (!response.ok) {
        throw new Error(`Impossible de charger locales/${lang}.json (${response.status})`);
    }

    const data = await response.json();
    translationsCache[lang] = data;

    return data;

}

/*
 * Parcourt les éléments [data-i18n] et [data-i18n-html],
 * récupère la valeur dans les traductions via la clé,
 * et l'injecte dans l'élément.
 *
 * - data-i18n      → textContent (sécurisé)
 * - data-i18n-html → innerHTML   (autorise <strong>, <em>…)
 */
function applyTranslations(translations) {

    document.querySelectorAll("[data-i18n]").forEach(function (el) {

        const key = el.getAttribute("data-i18n");
        const value = getNestedValue(translations, key);

        if (typeof value === "string") {
            el.textContent = value;
        } else {
            console.warn(`Traduction manquante pour la clé : ${key}`);
        }

    });

    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {

        const key = el.getAttribute("data-i18n-html");
        const value = getNestedValue(translations, key);

        if (typeof value === "string") {
            el.innerHTML = value;
        } else {
            console.warn(`Traduction manquante pour la clé : ${key}`);
        }

    });

    /* Mise à jour de l'attribut lang du <html>. */
    document.documentElement.setAttribute("lang", currentLang);

}

/*
 * Récupère une valeur imbriquée dans un objet
 * à partir d'une clé du type "sections.about.p1".
 */
function getNestedValue(obj, key) {

    const parts = key.split(".");

    let current = obj;

    for (const part of parts) {

        if (current === undefined || current === null) {
            return undefined;
        }

        current = current[part];

    }

    return current;

}

/*
 * Change la langue : charge les traductions
 * et les applique à la page.
 */
async function changeLanguage(lang) {

    try {

        const translations = await loadTranslations(lang);

        currentLang = lang;

        applyTranslations(translations);

        /* Met à jour le libellé du bouton de langue. */
        if (langButton) {
            langButton.textContent = (lang === "fr") ? "🌐 한국어" : "🌐 Français";
        }

        /* Met à jour le libellé du bouton de thème. */
        updateThemeButtonLabel();

    } catch (error) {

        console.error("Erreur de chargement des traductions :", error);

    }

}

/*
 * Clic sur le bouton de langue : bascule FR ⇄ KO.
 */
if (langButton) {

    langButton.addEventListener("click", function () {

        const nextLang = (currentLang === "fr") ? "ko" : "fr";
        changeLanguage(nextLang);

    });

}