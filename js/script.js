"use strict";

// ═══════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════
const MODES_FR = {
  flag2country: "Quel pays ?",
  country2flag: "Quel drapeau ?",
  flag2capital: "Drapeau → Capitale",
  "write-country": "Écrire le pays",
  "write-capital": "Écrire la capitale",
  map: "Carte monde",
};
const MEDALS = ["🥇", "🥈", "🥉"];
const REGION_FR = {
  Europe: "Europe",
  Americas: "Amériques",
  Asia: "Asie",
  Africa: "Afrique",
  Oceania: "Océanie",
  Antarctic: "Antarctique",
};
const LS_KEY = "geoquiz-board-v2";

// ═══════════════════════════════════════════
//  GLOBAL STATE
// ═══════════════════════════════════════════
let countries = [];
let geoData = null;
let geoLayers = {};
let foundSet = new Set();
let leafletMap = null;
let mapReady = false;

// Quiz
let pool = [],
  questions = [],
  curIdx = 0,
  okCount = 0,
  errCount = 0,
  answered = false;
let selMode = "flag2country",
  selRegion = "all",
  selN = 10;
// Last quiz result for saving
let lastResult = null;

// Board
let boardData = { entries: [], classes: [] };
let bFilterClass = "all",
  bFilterMode = "all",
  bSortBy = "pct";
let bPendingDel = null;
let addPanelOpen = false;

// ═══════════════════════════════════════════
//  NAV
// ═══════════════════════════════════════════
const TABS = ["menu", "quiz", "map", "board"];
function goTo(id) {
  // Masquer tous les screens
  document.querySelectorAll(".screen").forEach((s) => {
    s.classList.remove("active");
    s.style.display = "none";
  });
  // Afficher le bon
  const el = document.getElementById("s-" + id);
  el.classList.add("active");
  // display selon le type
  if (id === "map") el.style.display = "flex";
  else if (id === "results") el.style.display = "flex";
  else if (id === "loader") el.style.display = "flex";
  else el.style.display = "block";

  document
    .querySelectorAll(".nav-tab")
    .forEach((t, i) => t.classList.toggle("active", TABS[i] === id));
  if (id === "map") initMap();
  if (id === "board") {
    refreshAddClassSel();
    renderBoard();
  }
}

// ── THEME TOGGLE ──
function getMapColors() {
  const isLight =
    document.documentElement.getAttribute("data-theme") === "light";
  return {
    land: isLight ? "#c8d8b0" : "#1e1e2e",
    border: isLight ? "#8aaa6a" : "#3a3a55",
    found: isLight ? "#2d7a4a" : "#1a3a2a",
    foundBorder: isLight ? "#1a5a32" : "#5ecf8a",
  };
}
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = theme === "light" ? "☀️" : "🌙";
  localStorage.setItem("gq-theme", theme);
  // Re-styler la carte si elle est initialisée
  if (Object.keys(geoLayers).length > 0) {
    const c = getMapColors();
    Object.entries(geoLayers).forEach(([id, layer]) => {
      if (foundSet.has(id)) {
        layer.setStyle({
          fillColor: c.found,
          fillOpacity: 0.92,
          color: c.foundBorder,
          weight: 1.2,
        });
      } else {
        layer.setStyle({
          fillColor: c.land,
          fillOpacity: 0.9,
          color: c.border,
          weight: 0.8,
        });
      }
    });
  }
}
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(current === "dark" ? "light" : "dark");
}
// Appliquer le thème sauvegardé au chargement
applyTheme(localStorage.getItem("gq-theme") || "dark");

// Table de secours pour les noms FR des pays qui peuvent manquer dans l'API
const FR_NAMES = {
  AFG: "Afghanistan",
  ALB: "Albanie",
  DZA: "Algérie",
  AND: "Andorre",
  AGO: "Angola",
  ATG: "Antigua-et-Barbuda",
  ARG: "Argentine",
  ARM: "Arménie",
  AUS: "Australie",
  AUT: "Autriche",
  AZE: "Azerbaïdjan",
  BHS: "Bahamas",
  BHR: "Bahreïn",
  BGD: "Bangladesh",
  BRB: "Barbade",
  BLR: "Biélorussie",
  BEL: "Belgique",
  BLZ: "Belize",
  BEN: "Bénin",
  BTN: "Bhoutan",
  BOL: "Bolivie",
  BIH: "Bosnie-Herzégovine",
  BWA: "Botswana",
  BRA: "Brésil",
  BRN: "Brunei",
  BGR: "Bulgarie",
  BFA: "Burkina Faso",
  BDI: "Burundi",
  CPV: "Cap-Vert",
  KHM: "Cambodge",
  CMR: "Cameroun",
  CAN: "Canada",
  CAF: "Centrafrique",
  TCD: "Tchad",
  CHL: "Chili",
  CHN: "Chine",
  CYP: "Chypre",
  COL: "Colombie",
  COM: "Comores",
  COG: "Congo",
  COD: "RD Congo",
  CRI: "Costa Rica",
  CIV: "Côte d'Ivoire",
  HRV: "Croatie",
  CUB: "Cuba",
  DNK: "Danemark",
  DJI: "Djibouti",
  DOM: "République dominicaine",
  ECU: "Équateur",
  EGY: "Égypte",
  SLV: "Salvador",
  GNQ: "Guinée équatoriale",
  ERI: "Érythrée",
  EST: "Estonie",
  SWZ: "Eswatini",
  ETH: "Éthiopie",
  FJI: "Fidji",
  FIN: "Finlande",
  FRA: "France",
  GAB: "Gabon",
  GMB: "Gambie",
  GEO: "Géorgie",
  DEU: "Allemagne",
  GHA: "Ghana",
  GRC: "Grèce",
  GRD: "Grenade",
  GTM: "Guatemala",
  GIN: "Guinée",
  GNB: "Guinée-Bissau",
  GUY: "Guyana",
  HTI: "Haïti",
  HND: "Honduras",
  HUN: "Hongrie",
  ISL: "Islande",
  IND: "Inde",
  IDN: "Indonésie",
  IRN: "Iran",
  IRQ: "Irak",
  IRL: "Irlande",
  ISR: "Israël",
  ITA: "Italie",
  JAM: "Jamaïque",
  JPN: "Japon",
  JOR: "Jordanie",
  KAZ: "Kazakhstan",
  KEN: "Kenya",
  KIR: "Kiribati",
  PRK: "Corée du Nord",
  KOR: "Corée du Sud",
  KWT: "Koweït",
  KGZ: "Kirghizistan",
  LAO: "Laos",
  LVA: "Lettonie",
  LBN: "Liban",
  LSO: "Lesotho",
  LBR: "Liberia",
  LBY: "Libye",
  LIE: "Liechtenstein",
  LTU: "Lituanie",
  LUX: "Luxembourg",
  MDG: "Madagascar",
  MWI: "Malawi",
  MYS: "Malaisie",
  MDV: "Maldives",
  MLI: "Mali",
  MLT: "Malte",
  MHL: "Îles Marshall",
  MRT: "Mauritanie",
  MUS: "Maurice",
  MEX: "Mexique",
  FSM: "Micronésie",
  MDA: "Moldavie",
  MCO: "Monaco",
  MNG: "Mongolie",
  MNE: "Monténégro",
  MAR: "Maroc",
  MOZ: "Mozambique",
  MMR: "Myanmar",
  NAM: "Namibie",
  NRU: "Nauru",
  NPL: "Népal",
  NLD: "Pays-Bas",
  NZL: "Nouvelle-Zélande",
  NIC: "Nicaragua",
  NER: "Niger",
  NGA: "Nigéria",
  MKD: "Macédoine du Nord",
  NOR: "Norvège",
  OMN: "Oman",
  PAK: "Pakistan",
  PLW: "Palaos",
  PSE: "Palestine",
  PAN: "Panama",
  PNG: "Papouasie-Nouvelle-Guinée",
  PRY: "Paraguay",
  PER: "Pérou",
  PHL: "Philippines",
  POL: "Pologne",
  PRT: "Portugal",
  QAT: "Qatar",
  ROU: "Roumanie",
  RUS: "Russie",
  RWA: "Rwanda",
  KNA: "Saint-Christophe-et-Niévès",
  LCA: "Sainte-Lucie",
  VCT: "Saint-Vincent-et-les-Grenadines",
  WSM: "Samoa",
  SMR: "Saint-Marin",
  STP: "Sao Tomé-et-Principe",
  SAU: "Arabie saoudite",
  SEN: "Sénégal",
  SRB: "Serbie",
  SYC: "Seychelles",
  SLE: "Sierra Leone",
  SGP: "Singapour",
  SVK: "Slovaquie",
  SVN: "Slovénie",
  SLB: "Îles Salomon",
  SOM: "Somalie",
  ZAF: "Afrique du Sud",
  SSD: "Soudan du Sud",
  ESP: "Espagne",
  LKA: "Sri Lanka",
  SDN: "Soudan",
  SUR: "Suriname",
  SWE: "Suède",
  CHE: "Suisse",
  SYR: "Syrie",
  TWN: "Taïwan",
  TJK: "Tadjikistan",
  TZA: "Tanzanie",
  THA: "Thaïlande",
  TLS: "Timor oriental",
  TGO: "Togo",
  TON: "Tonga",
  TTO: "Trinité-et-Tobago",
  TUN: "Tunisie",
  TUR: "Turquie",
  TKM: "Turkménistan",
  TUV: "Tuvalu",
  UGA: "Ouganda",
  UKR: "Ukraine",
  ARE: "Émirats arabes unis",
  GBR: "Royaume-Uni",
  USA: "États-Unis",
  URY: "Uruguay",
  UZB: "Ouzbékistan",
  VUT: "Vanuatu",
  VAT: "Vatican",
  VEN: "Venezuela",
  VNM: "Viêt Nam",
  YEM: "Yémen",
  ZMB: "Zambie",
  ZWE: "Zimbabwe",
  DMA: "Dominique",
  BES: "Pays-Bas caribéens",
  SXM: "Saint-Martin (partie néerlandaise)",
  CUW: "Curaçao",
  ABW: "Aruba",
  GRL: "Groenland",
  FRO: "Îles Féroé",
  GIB: "Gibraltar",
  IMN: "Île de Man",
  JEY: "Jersey",
  GGY: "Guernesey",
  NCL: "Nouvelle-Calédonie",
  PYF: "Polynésie française",
  REU: "La Réunion",
  MYT: "Mayotte",
  GUF: "Guyane française",
  GLP: "Guadeloupe",
  MTQ: "Martinique",
  SPM: "Saint-Pierre-et-Miquelon",
  WLF: "Wallis-et-Futuna",
  MAF: "Saint-Martin (partie française)",
  BLM: "Saint-Barthélemy",
  ESH: "Sahara occidental",
  FLK: "Îles Malouines",
  SHN: "Sainte-Hélène",
  TCA: "Îles Turques-et-Caïques",
  VGB: "Îles Vierges britanniques",
  VIR: "Îles Vierges américaines",
  PRI: "Porto Rico",
  GUM: "Guam",
  ASM: "Samoa américaines",
  MNP: "Îles Mariannes du Nord",
  UMI: "Îles mineures éloignées des États-Unis",
  HKG: "Hong Kong",
  MAC: "Macao",
  CXR: "Île Christmas",
  CCK: "Îles Cocos",
  NFK: "Île Norfolk",
  PCN: "Îles Pitcairn",
  IOT: "Territoire britannique de l'océan Indien",
  ATF: "Terres australes françaises",
  HMD: "Île Heard-et-Îles MacDonald",
  BMU: "Bermudes",
  CYM: "Îles Caïmans",
  MSR: "Montserrat",
  AIA: "Anguilla",
  NIU: "Niue",
  COK: "Îles Cook",
  TKL: "Tokelau",
  CXR: "Île Christmas",
  // Pays dont le nom anglais de l'API est trompeur
  CZE: "République tchèque",
  XKX: "Kosovo",
  COD: "République démocratique du Congo",
  MKD: "Macédoine du Nord",
  PSE: "Palestine",
  VAT: "Vatican",
  TWN: "Taïwan",
  IRN: "Iran",
  LAO: "Laos",
  VNM: "Viêt Nam",
  PRK: "Corée du Nord",
  KOR: "Corée du Sud",
  GBR: "Royaume-Uni",
  USA: "États-Unis",
  ARE: "Émirats arabes unis",
  SAU: "Arabie saoudite",
  BOL: "Bolivie",
  VEN: "Venezuela",
  SWZ: "Eswatini",
  TLS: "Timor oriental",
  CPV: "Cap-Vert",
};

// Traductions françaises des capitales (cca3 → capitale en FR)
const FR_CAPITALS = {
  AFG: "Kaboul",
  ALB: "Tirana",
  DZA: "Alger",
  AND: "Andorre-la-Vieille",
  AGO: "Luanda",
  ATG: "Saint-Jean",
  ARG: "Buenos Aires",
  ARM: "Erevan",
  AUS: "Canberra",
  AUT: "Vienne",
  AZE: "Bakou",
  BHS: "Nassau",
  BHR: "Manama",
  BGD: "Dacca",
  BRB: "Bridgetown",
  BLR: "Minsk",
  BEL: "Bruxelles",
  BLZ: "Belmopan",
  BEN: "Porto-Novo",
  BTN: "Thimphou",
  BOL: "Sucre",
  BIH: "Sarajevo",
  BWA: "Gaborone",
  BRA: "Brasilia",
  BRN: "Bandar Seri Begawan",
  BGR: "Sofia",
  BFA: "Ouagadougou",
  BDI: "Gitega",
  CPV: "Praia",
  KHM: "Phnom Penh",
  CMR: "Yaoundé",
  CAN: "Ottawa",
  CAF: "Bangui",
  TCD: "N'Djaména",
  CHL: "Santiago",
  CHN: "Pékin",
  COL: "Bogota",
  COM: "Moroni",
  COG: "Brazzaville",
  COD: "Kinshasa",
  CRI: "San José",
  HRV: "Zagreb",
  CUB: "La Havane",
  CYP: "Nicosie",
  CZE: "Prague",
  DNK: "Copenhague",
  DJI: "Djibouti",
  DOM: "Saint-Domingue",
  ECU: "Quito",
  EGY: "Le Caire",
  SLV: "San Salvador",
  GNQ: "Malabo",
  ERI: "Asmara",
  EST: "Tallinn",
  SWZ: "Mbabane",
  ETH: "Addis-Abeba",
  FJI: "Suva",
  FIN: "Helsinki",
  FRA: "Paris",
  GAB: "Libreville",
  GMB: "Banjul",
  GEO: "Tbilissi",
  DEU: "Berlin",
  GHA: "Accra",
  GRC: "Athènes",
  GRD: "Saint-Georges",
  GTM: "Guatemala",
  GIN: "Conakry",
  GNB: "Bissau",
  GUY: "Georgetown",
  HTI: "Port-au-Prince",
  HND: "Tegucigalpa",
  HUN: "Budapest",
  ISL: "Reykjavik",
  IND: "New Delhi",
  IDN: "Jakarta",
  IRN: "Téhéran",
  IRQ: "Bagdad",
  IRL: "Dublin",
  ISR: "Jérusalem",
  ITA: "Rome",
  JAM: "Kingston",
  JPN: "Tokyo",
  JOR: "Amman",
  KAZ: "Astana",
  KEN: "Nairobi",
  KIR: "Tarawa du Sud",
  PRK: "Pyongyang",
  KOR: "Séoul",
  XKX: "Pristina",
  KWT: "Koweït",
  KGZ: "Bichkek",
  LAO: "Vientiane",
  LVA: "Riga",
  LBN: "Beyrouth",
  LSO: "Maseru",
  LBR: "Monrovia",
  LBY: "Tripoli",
  LIE: "Vaduz",
  LTU: "Vilnius",
  LUX: "Luxembourg",
  MDG: "Antananarivo",
  MWI: "Lilongwe",
  MYS: "Kuala Lumpur",
  MDV: "Malé",
  MLI: "Bamako",
  MLT: "La Valette",
  MHL: "Majuro",
  MRT: "Nouakchott",
  MUS: "Port-Louis",
  MEX: "Mexico",
  FSM: "Palikir",
  MDA: "Chișinău",
  MCO: "Monaco",
  MNG: "Oulan-Bator",
  MNE: "Podgorica",
  MAR: "Rabat",
  MOZ: "Maputo",
  MMR: "Naypyidaw",
  NAM: "Windhoek",
  NRU: "Yaren",
  NPL: "Katmandou",
  NLD: "Amsterdam",
  NZL: "Wellington",
  NIC: "Managua",
  NER: "Niamey",
  NGA: "Abuja",
  MKD: "Skopje",
  NOR: "Oslo",
  OMN: "Mascate",
  PAK: "Islamabad",
  PLW: "Ngerulmud",
  PAN: "Panama",
  PNG: "Port Moresby",
  PRY: "Asuncion",
  PER: "Lima",
  PHL: "Manille",
  POL: "Varsovie",
  PRT: "Lisbonne",
  QAT: "Doha",
  ROU: "Bucarest",
  RUS: "Moscou",
  RWA: "Kigali",
  KNA: "Basseterre",
  LCA: "Castries",
  VCT: "Kingstown",
  WSM: "Apia",
  SMR: "Saint-Marin",
  STP: "São Tomé",
  SAU: "Riyad",
  SEN: "Dakar",
  SRB: "Belgrade",
  SLE: "Freetown",
  SGP: "Singapour",
  SVK: "Bratislava",
  SVN: "Ljubljana",
  SLB: "Honiara",
  SOM: "Mogadiscio",
  ZAF: "Pretoria",
  SSD: "Djouba",
  ESP: "Madrid",
  LKA: "Sri Jayawardenepura Kotte",
  SDN: "Khartoum",
  SUR: "Paramaribo",
  SWE: "Stockholm",
  CHE: "Berne",
  SYR: "Damas",
  TWN: "Taipei",
  TJK: "Douchanbé",
  TZA: "Dodoma",
  THA: "Bangkok",
  TLS: "Dili",
  TGO: "Lomé",
  TON: "Nuku'alofa",
  TTO: "Port-d'Espagne",
  TUN: "Tunis",
  TUR: "Ankara",
  TKM: "Achgabat",
  TUV: "Funafuti",
  UGA: "Kampala",
  UKR: "Kiev",
  ARE: "Abou Dabi",
  GBR: "Londres",
  USA: "Washington",
  URY: "Montevideo",
  UZB: "Tachkent",
  VUT: "Port-Vila",
  VEN: "Caracas",
  VNM: "Hanoï",
  YEM: "Sanaa",
  ZMB: "Lusaka",
  ZWE: "Harare",
  ATF: "Port-aux-Français",
  BES: "Kralendijk",
  BLM: "Gustavia",
  CUW: "Willemstad",
  GLP: "Basse-Terre",
  GUF: "Cayenne",
  MTQ: "Fort-de-France",
  MYT: "Mamoudzou",
  NCL: "Nouméa",
  PYF: "Papeete",
  REU: "Saint-Denis",
  SPM: "Saint-Pierre",
  SXM: "Philipsburg",
  MAF: "Marigot",
};

// ═══════════════════════════════════════════
//  LOAD API DATA
// ═══════════════════════════════════════════
async function loadAll() {
  const bar = document.getElementById("lbar"),
    txt = document.getElementById("ltxt");
  try {
    bar.style.width = "20%";
    txt.textContent = "Connexion aux APIs…";
    const [cRes, gRes] = await Promise.all([
      fetch(
        "https://restcountries.com/v3.1/all?fields=name,capital,flags,cca2,cca3,region,population",
      ),
      fetch(
        "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json",
      ),
    ]);
    bar.style.width = "65%";
    txt.textContent = "Traitement…";
    const [cData, gRaw] = await Promise.all([cRes.json(), gRes.json()]);

    countries = cData
      .filter((c) => c.capital?.length && c.flags && c.name?.common)
      .map((c) => {
        // Priorité : table FR manuelle > traduction API > nom commun anglais
        const nameFr =
          FR_NAMES[c.cca3] || c.name.translations?.fra?.common || c.name.common;
        return {
          name: c.name.common,
          nameFr,
          capital: c.capital[0],
          capitalFr: FR_CAPITALS[c.cca3] || c.capital[0],
          flag: c.flags.png || c.flags.svg || "",
          cca2: (c.cca2 || "").toLowerCase(),
          cca3: c.cca3 || "",
          region: c.region || "",
          aliases: buildAliases(c.name, nameFr, c.cca3),
        };
      });
    geoData = gRaw;

    bar.style.width = "100%";
    txt.textContent = `${countries.length} pays chargés !`;
    await sleep(350);

    loadBoard();
    buildCountryList();
    buildNameIndex(); // index nom→pays pour la carte

    // Cacher le loader et montrer le menu — compatible CodePen
    const loader = document.getElementById("s-loader");
    loader.classList.remove("active");
    loader.style.display = "none";

    const menu = document.getElementById("s-menu");
    menu.classList.add("active");
    menu.style.display = "block";

    document.querySelectorAll(".nav-tab")[0].classList.add("active");
    document.getElementById("pillInfo").textContent =
      `${countries.length} pays disponibles`;
  } catch (e) {
    txt.textContent = "Erreur — vérifiez votre connexion.";
    document.getElementById("lbar").style.background = "var(--error)";
    console.error(e);
  }
}

// Formes alternatives françaises supplémentaires (pour le fuzzy match carte/quiz)
const FR_ALIASES = {
  CZE: ["Tchéquie", "Rep. tchèque", "Rép. tchèque"],
  COD: ["RDC", "Congo RDC", "Congo démocratique", "Rép. dém. du Congo"],
  COG: ["Congo Brazzaville", "République du Congo"],
  PRK: ["Corée Nord", "Corée-du-Nord"],
  KOR: ["Corée Sud", "Corée-du-Sud"],
  GBR: ["Angleterre", "Grande-Bretagne", "UK"],
  USA: ["Amérique", "États Unis", "Etats-Unis", "Etats Unis", "US"],
  ARE: ["Émirats", "Emirats"],
  SAU: ["Arabie Saoudite"],
  RUS: ["Fédération de Russie"],
  IRN: ["Perse"],
  MMR: ["Birmanie"],
  SWZ: ["Swaziland"],
  TLS: ["Timor-Leste", "Timor-Oriental"],
  MKD: ["Macédoine"],
  CPV: ["Cap Vert"],
  STP: ["São Tomé", "Sao Tome"],
  TTO: ["Trinité et Tobago", "Trinidad"],
  KNA: ["Saint-Kitts"],
  VCT: ["Saint-Vincent"],
  TZA: ["Tanzanie"],
  BIH: ["Bosnie", "Herzégovine"],
  ZAF: ["Afrique du sud"],
  GNQ: ["Guinée-Equatoriale"],
  PNG: ["Papouasie"],
  CHN: ["Chine populaire"],
  TWN: ["Formose", "Taiwan"],
  VNM: ["Vietnam", "Viet Nam"],
  PSE: ["Territoires palestiniens", "Gaza"],
  XKX: ["Republique du Kosovo"],
  UKR: ["Ukraïne"],
  MDA: ["Moldavie", "Moldova"],
  BLR: ["Bélarus", "Belarus"],
  KAZ: ["Kazakstan"],
  UZB: ["Ouzbekistan"],
  TKM: ["Turkmenistan"],
  KGZ: ["Kirghizie"],
  TJK: ["Tadjikistan"],
  AZE: ["Azerbaidjan"],
  MNG: ["Mongolie extérieure"],
};

function buildAliases(name, nameFr, cca3) {
  // Stocker les formes BRUTES (non normalisées) — la normalisation se fait à la recherche
  const s = new Set();
  const add = (v) => {
    if (v && v.trim()) s.add(v.trim());
  };
  add(name.common);
  add(name.official);
  add(nameFr);
  if (name.translations) {
    Object.values(name.translations).forEach((t) => {
      add(t.common);
      add(t.official);
    });
  }
  // Ajouter les formes alternatives françaises
  if (cca3 && FR_ALIASES[cca3]) FR_ALIASES[cca3].forEach(add);
  return [...s];
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ═══════════════════════════════════════════
//  FUZZY MATCH
// ═══════════════════════════════════════════
function norm(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function lev(a, b) {
  const m = a.length,
    n = b.length;
  if (Math.abs(m - n) > 3) return 99; // optimisation : skip si trop différent
  const d = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i ? (j ? 0 : i) : j)),
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] =
        a[i - 1] === b[j - 1]
          ? d[i - 1][j - 1]
          : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
  return d[m][n];
}
function fuzzy(input, target) {
  const a = norm(input),
    b = norm(target);
  if (!a || !b) return false;
  if (a === b) return true;
  // Tolérance aux fautes de frappe uniquement — PAS de substring match
  // pour éviter "mali" → "somalia", "niger" → "nigeria", etc.
  const maxDist = a.length <= 4 ? 0 : a.length <= 6 ? 1 : 2;
  return lev(a, b) <= maxDist;
}
function matchCountry(input, c, field = "name") {
  const a = norm(input);
  if (!a) return false;
  if (field === "name") {
    // Tester le nom FR en premier (priorité), puis EN, puis aliases
    const candidates = [c.nameFr, c.name, ...c.aliases];
    return candidates.some((v) => v && fuzzy(input, v));
  } else {
    return (
      (c.capitalFr && fuzzy(input, c.capitalFr)) ||
      (c.capital && fuzzy(input, c.capital))
    );
  }
}

// ═══════════════════════════════════════════
//  MENU
// ═══════════════════════════════════════════
document.querySelectorAll(".mode-card").forEach((card) => {
  card.addEventListener("click", () => {
    document
      .querySelectorAll(".mode-card")
      .forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    selMode = card.dataset.mode;
  });
});
document.querySelectorAll("#regionPills .pill").forEach((b) => {
  b.addEventListener("click", () => {
    document
      .querySelectorAll("#regionPills .pill")
      .forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    selRegion = b.dataset.region;
  });
});
document.querySelectorAll("#qcPills .pill").forEach((b) => {
  b.addEventListener("click", () => {
    document
      .querySelectorAll("#qcPills .pill")
      .forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    selN = parseInt(b.dataset.n);
  });
});

// ═══════════════════════════════════════════
//  QUIZ
// ═══════════════════════════════════════════
function startQuiz() {
  pool = countries.filter((c) => selRegion === "all" || c.region === selRegion);
  if (pool.length < 4) {
    toast("Pas assez de pays pour ce filtre.", "err");
    return;
  }
  questions = shuffle(pool).slice(0, Math.min(selN, pool.length));
  curIdx = 0;
  okCount = 0;
  errCount = 0;
  answered = false;
  lastResult = null;
  goTo("quiz");
  updateStats();
  renderQ();
}

function renderQ() {
  answered = false;
  const c = questions[curIdx];
  document.getElementById("fb").className = "feedback";
  document.getElementById("fb").textContent = "";
  document.getElementById("nextBtn").className = "next-btn";
  document.getElementById("ansGrid").innerHTML = "";
  document.getElementById("ansGrid").style.display = "grid";
  document.getElementById("inpW").style.display = "none";
  document.getElementById("flagWrap").style.display = "none";
  document.getElementById("qSub").style.display = "none";
  updateProg();
  updateStats();

  const lbls = {
    flag2country: "Quel pays ?",
    country2flag: "Quel drapeau ?",
    flag2capital: "Quelle est la capitale ?",
    "write-country": "Écrivez le pays",
    "write-capital": "Écrivez la capitale",
  };
  document.getElementById("qLbl").textContent = lbls[selMode] || "Question";

  if (selMode === "flag2country") {
    showFlag(c);
    document.getElementById("qTxt").textContent =
      "À quel pays appartient ce drapeau ?";
    renderMCQ(getOpts(c, 4), c, (o) => o.nameFr || o.name);
  } else if (selMode === "country2flag") {
    document.getElementById("qTxt").textContent =
      `Quel est le drapeau de ${c.nameFr || c.name} ?`;
    renderFlagMCQ(getOpts(c, 4), c);
  } else if (selMode === "flag2capital") {
    showFlag(c);
    document.getElementById("qTxt").textContent =
      "Quelle est la capitale de ce pays ?";
    document.getElementById("qSub").textContent = c.nameFr || c.name;
    document.getElementById("qSub").style.display = "block";
    renderMCQ(getOpts(c, 4), c, (o) => o.capitalFr || o.capital);
  } else if (selMode === "write-country") {
    showFlag(c);
    document.getElementById("qTxt").textContent =
      "Quel pays représente ce drapeau ?";
    showInp("Nom du pays…");
  } else if (selMode === "write-capital") {
    showFlag(c);
    document.getElementById("qTxt").textContent =
      `Quelle est la capitale de ${c.nameFr || c.name} ?`;
    showInp("Capitale…");
  }
}

function showFlag(c) {
  document.getElementById("flagImg").src = c.flag;
  document.getElementById("flagImg").alt = c.name;
  document.getElementById("flagImg").style.display = "none";
  document.getElementById("flagSkel").style.display = "block";
  document.getElementById("flagWrap").style.display = "block";
  document.getElementById("flagImg").onload = () => {
    document.getElementById("flagSkel").style.display = "none";
    document.getElementById("flagImg").style.display = "block";
  };
  document.getElementById("flagImg").onerror = () => {
    const c2 = questions[curIdx];
    if (c2 && c2.cca2)
      document.getElementById("flagImg").src =
        `https://flagcdn.com/w320/${c2.cca2}.png`;
  };
}

function getOpts(c, n) {
  return shuffle(pool.filter((x) => x.name !== c.name))
    .slice(0, n - 1)
    .concat(c);
}

function renderMCQ(opts, correctC, labelFn) {
  const grid = document.getElementById("ansGrid");
  const sorted = shuffle(opts);
  sorted.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "ans-btn";
    btn.textContent = labelFn(opt);
    btn.addEventListener("click", (e) => {
      if (answered) return;
      addRipple(btn, e);
      resolveMCQ(opt.name === correctC.name, btn, sorted, correctC, labelFn);
    });
    grid.appendChild(btn);
  });
}

function renderFlagMCQ(opts, correctC) {
  const grid = document.getElementById("ansGrid");
  const sorted = shuffle(opts);
  sorted.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "ans-btn";
    btn.style.cssText = "flex-direction:column;padding:.65rem;";
    const img = document.createElement("img");
    img.className = "flag-opt";
    img.src = opt.flag;
    img.alt = opt.name;
    img.onerror = () => {
      img.src = `https://flagcdn.com/w160/${opt.cca2}.png`;
    };
    // Label caché par défaut — révélé après réponse
    const lbl = document.createElement("span");
    lbl.style.cssText =
      "font-size:.68rem;color:var(--muted);margin-top:.2rem;visibility:hidden;";
    lbl.textContent = opt.nameFr || opt.name;
    btn.append(img, lbl);
    btn.addEventListener("click", (e) => {
      if (answered) return;
      addRipple(btn, e);
      resolveFlagMCQ(opt.name === correctC.name, btn, sorted, correctC);
    });
    grid.appendChild(btn);
  });
}

function resolveMCQ(ok, btn, opts, correctC, labelFn) {
  answered = true;
  document.querySelectorAll(".ans-btn").forEach((b) => (b.disabled = true));
  if (ok) {
    btn.classList.add("correct");
    okCount++;
    showFb(true, "✓ Correct !");
  } else {
    btn.classList.add("wrong");
    errCount++;
    const ct = labelFn(correctC);
    document.querySelectorAll(".ans-btn").forEach((b) => {
      if (b.textContent === ct) b.classList.add("correct");
    });
    showFb(false, `✗ C'était : ${ct}`);
  }
  updateStats();
  document.getElementById("nextBtn").className = "next-btn show";
}

function resolveFlagMCQ(ok, btn, opts, correctC) {
  answered = true;
  document.querySelectorAll(".ans-btn").forEach((b) => {
    b.disabled = true;
    // Révéler tous les labels
    const lbl = b.querySelector("span");
    if (lbl) lbl.style.visibility = "visible";
  });
  if (ok) {
    btn.classList.add("correct");
    okCount++;
    showFb(true, "✓ Correct !");
  } else {
    btn.classList.add("wrong");
    errCount++;
    document
      .querySelectorAll(".ans-btn")
      [opts.indexOf(correctC)]?.classList.add("correct");
    showFb(false, `✗ C'était : ${correctC.nameFr || correctC.name}`);
  }
  updateStats();
  document.getElementById("nextBtn").className = "next-btn show";
}

function showInp(ph) {
  document.getElementById("ansGrid").style.display = "none";
  document.getElementById("inpW").style.display = "flex";
  const inp = document.getElementById("txtIn");
  inp.value = "";
  inp.className = "txt-in";
  inp.disabled = false;
  inp.placeholder = ph;
  inp.focus();
  inp.onkeydown = (e) => {
    if (e.key === "Enter") submitTxt();
  };
}

function submitTxt() {
  if (answered) return;
  const c = questions[curIdx],
    val = document.getElementById("txtIn").value.trim();
  if (!val) return;
  answered = true;
  document.getElementById("txtIn").disabled = true;
  const ok =
    selMode === "write-country"
      ? matchCountry(val, c, "name")
      : matchCountry(val, c, "capital");
  document.getElementById("txtIn").className =
    "txt-in " + (ok ? "correct" : "wrong");
  if (ok) {
    okCount++;
    showFb(true, "✓ Correct !");
  } else {
    errCount++;
    showFb(
      false,
      `✗ C'était : ${selMode === "write-country" ? c.nameFr || c.name : c.capitalFr || c.capital}`,
    );
  }
  updateStats();
  document.getElementById("nextBtn").className = "next-btn show";
}

function nextQ() {
  curIdx++;
  if (curIdx >= questions.length) {
    showResults();
    return;
  }
  const card = document.getElementById("qcard");
  card.style.animation = "none";
  requestAnimationFrame(() => {
    card.style.animation = "";
    renderQ();
  });
}

function showFb(ok, msg) {
  const el = document.getElementById("fb");
  el.className = "feedback " + (ok ? "correct" : "wrong");
  el.textContent = msg;
}
function updateProg() {
  document.getElementById("progB").style.width =
    (curIdx / questions.length) * 100 + "%";
  document.getElementById("sN").textContent =
    `${curIdx + 1}/${questions.length}`;
}
function updateStats() {
  document.getElementById("sOk").textContent = okCount;
  document.getElementById("sErr").textContent = errCount;
}

// ═══════════════════════════════════════════
//  RESULTS + SAVE
// ═══════════════════════════════════════════
function showResults() {
  goTo("results");
  const total = questions.length,
    p = Math.round((okCount / total) * 100);
  const circ = 2 * Math.PI * 70;
  document.getElementById("arcPct").textContent = p + "%";
  const fg = document.getElementById("arcFg");
  fg.style.strokeDasharray = circ;
  fg.style.strokeDashoffset = circ;
  setTimeout(() => {
    fg.style.strokeDashoffset = circ - (p / 100) * circ;
  }, 50);

  const msgs = [
    [100, "🏆 Parfait !", "Géographe hors pair !"],
    [80, "🌟 Excellent !", "Très belle maîtrise !"],
    [60, "👏 Bien joué !", "Bonne connaissance !"],
    [40, "📚 Pas mal !", "Encore un peu d'entraînement."],
    [0, "🌍 Courage !", "Le monde n'a pas de secrets si on s'entraîne."],
  ];
  const [, title, sub] = msgs.find(([t]) => p >= t);
  document.getElementById("resTitle").textContent = title;
  document.getElementById("resSub").textContent = sub;
  document.getElementById("resDet").textContent =
    `${okCount} bonne${okCount > 1 ? "s" : ""} réponse${okCount > 1 ? "s" : ""} sur ${total}`;

  lastResult = { score: okCount, total, mode: selMode };
  refreshSaveClasseSel();
}

function refreshSaveClasseSel() {
  const sel = document.getElementById("saveClasseSel");
  const noClass = document.getElementById("saveNoClass");
  const classes = boardData.classes || [];
  sel.innerHTML =
    '<option value="">— Choisis ta classe —</option>' +
    classes.map((c) => `<option value="${c}">${c}</option>`).join("");
  noClass.style.display = classes.length === 0 ? "block" : "none";
  sel.style.display = classes.length === 0 ? "none" : "";
}

function saveScore() {
  if (!lastResult) {
    toast("Aucun score à enregistrer", "err");
    return;
  }
  const name = document.getElementById("saveName").value.trim();
  const classe = document.getElementById("saveClasseSel").value;
  if (!name) {
    toast("⚠️ Entre ton prénom !", "err");
    return;
  }
  if (!classe) {
    toast("⚠️ Choisis ta classe !", "err");
    return;
  }
  pushEntry({
    name,
    classe,
    mode: lastResult.mode,
    score: lastResult.score,
    total: lastResult.total,
  });
  toast(`✅ Score de ${name} enregistré !`);
  document.getElementById("saveName").value = "";
  document.getElementById("saveClasseSel").value = "";
  lastResult = null;
}

// ═══════════════════════════════════════════
//  MAP
// ═══════════════════════════════════════════
// Table de correction : cca3 restcountries → id du GeoJSON Johan
// Le GeoJSON de Johan utilise parfois d'anciens codes ISO ou des variantes
const CCA3_TO_GEO = {
  AND: "AND",
  ARE: "ARE",
  AFG: "AFG",
  ATG: "ATG",
  AIA: "AIA",
  ALB: "ALB",
  ARM: "ARM",
  AGO: "AGO",
  ATA: "ATA",
  ARG: "ARG",
  ASM: "ASM",
  AUT: "AUT",
  AUS: "AUS",
  ABW: "ABW",
  AZE: "AZE",
  BIH: "BIH",
  BRB: "BRB",
  BGD: "BGD",
  BEL: "BEL",
  BFA: "BFA",
  BGR: "BGR",
  BHR: "BHR",
  BDI: "BDI",
  BEN: "BEN",
  BLM: "BLM",
  BMU: "BMU",
  BRN: "BRN",
  BOL: "BOL",
  BES: "BES",
  BRA: "BRA",
  BHS: "BHS",
  BTN: "BTN",
  BVT: "BVT",
  BWA: "BWA",
  BLR: "BLR",
  BLZ: "BLZ",
  CAN: "CAN",
  CCK: "CCK",
  COD: "COD",
  CAF: "CAF",
  COG: "COG",
  CHE: "CHE",
  CIV: "CIV",
  COK: "COK",
  CHL: "CHL",
  CMR: "CMR",
  CHN: "CHN",
  COL: "COL",
  CRI: "CRI",
  CUB: "CUB",
  CPV: "CPV",
  CXR: "CXR",
  CYP: "CYP",
  CZE: "CZE",
  DEU: "DEU",
  DJI: "DJI",
  DNK: "DNK",
  DMA: "DMA",
  DOM: "DOM",
  DZA: "DZA",
  ECU: "ECU",
  EST: "EST",
  EGY: "EGY",
  ESH: "ESH",
  ERI: "ERI",
  ESP: "ESP",
  ETH: "ETH",
  FIN: "FIN",
  FJI: "FJI",
  FLK: "FLK",
  FSM: "FSM",
  FRO: "FRO",
  FRA: "FRA",
  GAB: "GAB",
  GBR: "GBR",
  GRD: "GRD",
  GEO: "GEO",
  GUF: "GUF",
  GGY: "GGY",
  GHA: "GHA",
  GIB: "GIB",
  GRL: "GRL",
  GMB: "GMB",
  GIN: "GIN",
  GLP: "GLP",
  GNQ: "GNQ",
  GRC: "GRC",
  GTM: "GTM",
  GUM: "GUM",
  GNB: "GNB",
  GUY: "GUY",
  HKG: "HKG",
  HMD: "HMD",
  HND: "HND",
  HRV: "HRV",
  HTI: "HTI",
  HUN: "HUN",
  IDN: "IDN",
  IRL: "IRL",
  ISR: "ISR",
  IMN: "IMN",
  IND: "IND",
  IOT: "IOT",
  IRQ: "IRQ",
  IRN: "IRN",
  ISL: "ISL",
  ITA: "ITA",
  JEY: "JEY",
  JAM: "JAM",
  JOR: "JOR",
  JPN: "JPN",
  KEN: "KEN",
  KGZ: "KGZ",
  KHM: "KHM",
  KIR: "KIR",
  COM: "COM",
  KNA: "KNA",
  PRK: "PRK",
  KOR: "KOR",
  KWT: "KWT",
  CYM: "CYM",
  KAZ: "KAZ",
  LAO: "LAO",
  LBN: "LBN",
  LCA: "LCA",
  LIE: "LIE",
  LKA: "LKA",
  LBR: "LBR",
  LSO: "LSO",
  LTU: "LTU",
  LUX: "LUX",
  LVA: "LVA",
  LBY: "LBY",
  MAR: "MAR",
  MCO: "MCO",
  MDA: "MDA",
  MNE: "MNE",
  MAF: "MAF",
  MDG: "MDG",
  MHL: "MHL",
  MKD: "MKD",
  MLI: "MLI",
  MMR: "MMR",
  MNG: "MNG",
  MAC: "MAC",
  MNP: "MNP",
  MTQ: "MTQ",
  MRT: "MRT",
  MSR: "MSR",
  MLT: "MLT",
  MUS: "MUS",
  MDV: "MDV",
  MWI: "MWI",
  MEX: "MEX",
  MYS: "MYS",
  MOZ: "MOZ",
  NAM: "NAM",
  NCL: "NCL",
  NER: "NER",
  NFK: "NFK",
  NGA: "NGA",
  NIC: "NIC",
  NLD: "NLD",
  NOR: "NOR",
  NPL: "NPL",
  NRU: "NRU",
  NIU: "NIU",
  NZL: "NZL",
  OMN: "OMN",
  PAN: "PAN",
  PER: "PER",
  PYF: "PYF",
  PNG: "PNG",
  PHL: "PHL",
  PAK: "PAK",
  POL: "POL",
  SPM: "SPM",
  PCN: "PCN",
  PRI: "PRI",
  PSE: "PSE",
  PRT: "PRT",
  PLW: "PLW",
  PRY: "PRY",
  QAT: "QAT",
  REU: "REU",
  ROU: "ROU",
  SRB: "SRB",
  RUS: "RUS",
  RWA: "RWA",
  SAU: "SAU",
  SLB: "SLB",
  SYC: "SYC",
  SDN: "SDN",
  SWE: "SWE",
  SGP: "SGP",
  SHN: "SHN",
  SVN: "SVN",
  SJM: "SJM",
  SVK: "SVK",
  SLE: "SLE",
  SMR: "SMR",
  SEN: "SEN",
  SOM: "SOM",
  SUR: "SUR",
  SSD: "SSD",
  STP: "STP",
  SLV: "SLV",
  SXM: "SXM",
  SYR: "SYR",
  SWZ: "SWZ",
  TCA: "TCA",
  TCD: "TCD",
  ATF: "ATF",
  TGO: "TGO",
  THA: "THA",
  TJK: "TJK",
  TKL: "TKL",
  TLS: "TLS",
  TKM: "TKM",
  TUN: "TUN",
  TON: "TON",
  TUR: "TUR",
  TTO: "TTO",
  TUV: "TUV",
  TWN: "TWN",
  TZA: "TZA",
  UKR: "UKR",
  UGA: "UGA",
  UMI: "UMI",
  USA: "USA",
  URY: "URY",
  UZB: "UZB",
  VAT: "VAT",
  VCT: "VCT",
  VEN: "VEN",
  VGB: "VGB",
  VIR: "VIR",
  VNM: "VNM",
  VUT: "VUT",
  WLF: "WLF",
  WSM: "WSM",
  YEM: "YEM",
  MYT: "MYT",
  ZAF: "ZAF",
  ZMB: "ZMB",
  ZWE: "ZWE",
  // Corrections Johan GeoJSON (codes anciens/différents)
  ROU: "ROU", // Roumanie — Johan utilise aussi ROU maintenant
  MKD: "MKD", // Macédoine du Nord
  SWZ: "SWZ", // Eswatini (ex-Swaziland)
  TLS: "TLS", // Timor-Leste
  COD: "COD", // RD Congo (Johan a parfois ZAR)
  SSD: "SSD", // Soudan du Sud
  XKX: "XKX", // Kosovo (pas de code ISO officiel)
};

// Codes que Johan utilise différemment de restcountries
const GEO_OVERRIDE = {
  // restcountries_cca3 : geojson_id
  ROU: "ROU",
  COD: "COD", // restcountries utilise COD, Johan aussi
  SSD: "SSD",
  PSE: "PSE",
  TWN: "TWN",
  XKX: "XKX",
  MKD: "MKD",
};

function getGeoId(cca3) {
  return GEO_OVERRIDE[cca3] || cca3;
}

// Index nom normalisé → pays (construit après chargement des pays)
let nameToCountry = {};

function buildNameIndex() {
  nameToCountry = {};
  countries.forEach((c) => {
    // Indexer toutes les formes brutes des noms (aliases contient des strings bruts)
    c.aliases.forEach((rawName) => {
      if (rawName) nameToCountry[norm(rawName)] = c;
    });
    // S'assurer que nameFr et name sont bien indexés
    if (c.nameFr) nameToCountry[norm(c.nameFr)] = c;
    if (c.name) nameToCountry[norm(c.name)] = c;
  });
}

// Index geoJSON name → cca3, construit lors du chargement du GeoJSON
let geoNameToCca3 = {}; // norm(feat.properties.name) → cca3

function initMap() {
  if (mapReady || !geoData) return;
  mapReady = true;

  leafletMap = L.map("leaflet-map", {
    center: [20, 10],
    zoom: 2,
    minZoom: 2,
    maxZoom: 7,
    maxBounds: [
      [-85, -180],
      [85, 180],
    ],
    maxBoundsViscosity: 1.0,
    worldCopyJump: false,
    zoomControl: true,
  });

  // Charger le GeoJSON et stocker les layers
  L.geoJSON(geoData, {
    style: () => {
      const c = getMapColors();
      return {
        fillColor: c.land,
        fillOpacity: 0.9,
        color: c.border,
        weight: 0.8,
      };
    },
    onEachFeature: (feat, layer) => {
      const geoId = feat.id; // ex: "CAN", "MEX", "FRA"
      geoLayers[geoId] = layer;
      // Aussi indexer par nom normalisé du GeoJSON
      if (feat.properties?.name)
        geoNameToCca3[norm(feat.properties.name)] = geoId;
    },
  }).addTo(leafletMap);

  updateMapStats();
  document.getElementById("mapInp").addEventListener("keydown", (e) => {
    if (e.key === "Enter") mapSubmit();
  });
}

function findGeoLayer(cca3) {
  if (!cca3) return null;
  const up = cca3.toUpperCase();
  // 1. Direct par cca3
  if (geoLayers[up]) return geoLayers[up];
  // 2. Via table de correction
  const corrected = getGeoId(up);
  if (geoLayers[corrected]) return geoLayers[corrected];
  // 3. Chercher par le nom français/anglais du pays dans l'index GeoJSON
  const c = countries.find((x) => x.cca3 === cca3);
  if (c) {
    const candidates = [c.nameFr, c.name, ...c.aliases];
    for (const name of candidates) {
      const geoId = geoNameToCca3[norm(name)];
      if (geoId && geoLayers[geoId]) return geoLayers[geoId];
    }
  }
  return null;
}

function mapSubmit() {
  const inp = document.getElementById("mapInp");
  const val = inp.value.trim();
  if (!val) return;

  // Recherche : d'abord exact dans l'index, puis fuzzy sur nameFr/name
  const nVal = norm(val);
  let match = nameToCountry[nVal]; // exact match normalisé
  if (!match) {
    // Fuzzy : parcourir les pays, priorité nameFr
    match =
      countries.find((c) => fuzzy(val, c.nameFr)) ||
      countries.find((c) => fuzzy(val, c.name));
  }

  if (!match) {
    setMapFb("❌ Pays introuvable — tapez le nom en français.", "err");
    inp.classList.add("flash-err");
    setTimeout(() => inp.classList.remove("flash-err"), 600);
    return;
  }
  if (foundSet.has(match.cca3)) {
    setMapFb(`✓ ${match.nameFr || match.name} déjà trouvé !`, "hint");
    inp.value = "";
    return;
  }

  foundSet.add(match.cca3);
  inp.value = "";
  inp.classList.add("flash-ok");
  setTimeout(() => inp.classList.remove("flash-ok"), 600);
  setMapFb(
    `✅ ${match.nameFr || match.name} — capitale : ${match.capitalFr || match.capital}`,
    "ok",
  );

  const layer = findGeoLayer(match.cca3);
  if (layer) {
    const c = getMapColors();
    layer.setStyle({
      fillColor: c.found,
      fillOpacity: 0.92,
      color: c.foundBorder,
      weight: 1.2,
    });
    placeFlagMarker(match, layer);
    try {
      leafletMap.fitBounds(layer.getBounds(), {
        padding: [40, 40],
        maxZoom: 5,
        animate: true,
      });
    } catch (e) {}
  }

  updateMapStats();
  buildCountryList(); // rebuild complet pour révéler le pays dans la sidebar
}

// ── Markers drapeaux ──
let flagMarkers = {}; // cca3 → L.Marker

// Calcule le centroïde réel d'un feature GeoJSON (moyenne pondérée des coords)
function getFeatureCentroid(feat) {
  try {
    const coords = [];
    const collect = (ring) => ring.forEach((pt) => coords.push(pt));
    const geom = feat.feature ? feat.feature.geometry : feat.geometry;
    if (!geom) return null;
    if (geom.type === "Polygon") {
      collect(geom.coordinates[0]);
    } else if (geom.type === "MultiPolygon") {
      // Prendre le plus grand polygone (plus grande aire)
      let best = null,
        bestArea = 0;
      geom.coordinates.forEach((poly) => {
        const ring = poly[0];
        // Aire approximative = nb de points × amplitude
        const lngs = ring.map((p) => p[0]),
          lats = ring.map((p) => p[1]);
        const area =
          (Math.max(...lngs) - Math.min(...lngs)) *
          (Math.max(...lats) - Math.min(...lats));
        if (area > bestArea) {
          bestArea = area;
          best = ring;
        }
      });
      if (best) collect(best);
    }
    if (!coords.length) return null;
    const lng = coords.reduce((s, p) => s + p[0], 0) / coords.length;
    const lat = coords.reduce((s, p) => s + p[1], 0) / coords.length;
    return L.latLng(lat, lng);
  } catch (e) {
    return null;
  }
}

function placeFlagMarker(country, layer) {
  try {
    // Centroïde réel du polygone, pas juste le centre de la bounding box
    const center = getFeatureCentroid(layer) || layer.getBounds().getCenter();
    const icon = L.divIcon({
      className: "flag-marker",
      html: `<div class="flag-marker-inner"><img src="${country.flag}" alt="${country.nameFr}" onerror="this.src='https://flagcdn.com/w40/${country.cca2}.png'"></div>`,
      iconSize: [32, 22],
      iconAnchor: [16, 11],
    });
    const marker = L.marker(center, {
      icon,
      interactive: false,
      zIndexOffset: 500,
    });
    marker.addTo(leafletMap);
    flagMarkers[country.cca3] = marker;
  } catch (e) {}
}

function removeAllFlagMarkers() {
  Object.values(flagMarkers).forEach((m) => {
    try {
      leafletMap.removeLayer(m);
    } catch (e) {}
  });
  flagMarkers = {};
}

function setMapFb(msg, type) {
  const el = document.getElementById("mapFb");
  el.className = "map-fb " + type;
  el.textContent = msg;
  clearTimeout(setMapFb._t);
  setMapFb._t = setTimeout(() => {
    el.className = "map-fb";
    el.textContent = "";
  }, 3000);
}

function updateMapStats() {
  const total = countries.length,
    found = foundSet.size;
  document.getElementById("mFound").textContent = found;
  document.getElementById("mTotal").textContent = total;
  document.getElementById("mPct").textContent =
    Math.round((found / total) * 100) + "%";
}

function resetMap() {
  if (!confirm("Réinitialiser la carte ?")) return;
  foundSet.clear();
  Object.values(geoLayers).forEach((l) => {
    const c = getMapColors();
    l.setStyle({
      fillColor: c.land,
      fillOpacity: 0.9,
      color: c.border,
      weight: 0.8,
    });
  });
  document
    .querySelectorAll(".ctag.found")
    .forEach((t) => t.classList.remove("found"));
  removeAllFlagMarkers();
  updateMapStats();
  buildCountryList();
  if (leafletMap) leafletMap.setView([20, 10], 2);
}

function buildCountryList(filterR = "all") {
  const list = document.getElementById("countriesList");
  list.innerHTML = "";
  const byR = {};
  countries.forEach((c) => {
    if (filterR !== "all" && c.region !== filterR) return;
    const r = c.region || "Other";
    if (!byR[r]) byR[r] = [];
    byR[r].push(c);
  });
  Object.entries(byR)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([region, arr]) => {
      const foundArr = arr.filter((c) => foundSet.has(c.cca3));
      const sec = document.createElement("div");
      sec.className = "region-section";
      const hd = document.createElement("div");
      hd.className = "region-h";
      hd.dataset.region = region;
      hd.innerHTML = `${REGION_FR[region] || region}<span class="rcount">${foundArr.length}/${arr.length}</span>`;
      sec.appendChild(hd);
      arr
        .sort((a, b) => (a.nameFr || a.name).localeCompare(b.nameFr || b.name))
        .forEach((c) => {
          const tag = document.createElement("span");
          if (foundSet.has(c.cca3)) {
            // Pays trouvé → afficher nom + drapeau
            tag.className = "ctag found";
            tag.dataset.cca3 = c.cca3;
            tag.innerHTML = `<img src="${c.flag}" style="width:14px;height:auto;border-radius:2px;vertical-align:middle;" onerror="this.style.display='none'"> ${c.nameFr || c.name}`;
          } else {
            // Pas encore trouvé → point d'interrogation
            tag.className = "ctag hidden-country";
            tag.dataset.cca3 = c.cca3;
            tag.innerHTML = `<span style="opacity:.3">?</span>`;
            tag.title = "";
          }
          sec.appendChild(tag);
        });
      list.appendChild(sec);
    });
}

function updateRegionCounts() {
  document.querySelectorAll(".region-h").forEach((hd) => {
    const r = hd.dataset.region;
    if (!r) return;
    const arr = countries.filter((c) => c.region === r);
    const f = arr.filter((c) => foundSet.has(c.cca3)).length;
    const span = hd.querySelector(".rcount");
    if (span) span.textContent = `${f}/${arr.length}`;
  });
  // Révéler les pays trouvés dans la sidebar
  foundSet.forEach((cca3) => {
    const tag = document.querySelector(`.ctag[data-cca3="${cca3}"]`);
    if (tag && !tag.classList.contains("found")) {
      const c = countries.find((x) => x.cca3 === cca3);
      if (c) {
        tag.className = "ctag found";
        tag.innerHTML = `<img src="${c.flag}" style="width:14px;height:auto;border-radius:2px;vertical-align:middle;" onerror="this.style.display='none'"> ${c.nameFr || c.name}`;
      }
    }
  });
}

function mapRegion(region, btn) {
  document
    .querySelectorAll(".rtab")
    .forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  buildCountryList(region);
  if (!leafletMap) return;
  if (region === "all") {
    leafletMap.setView([20, 10], 2);
    return;
  }
  let bounds = null;
  countries
    .filter((c) => c.region === region)
    .forEach((c) => {
      const l = findGeoLayer(c.cca3);
      if (l) {
        try {
          bounds = bounds ? bounds.extend(l.getBounds()) : l.getBounds();
        } catch (e) {}
      }
    });
  if (bounds) leafletMap.fitBounds(bounds, { padding: [30, 30] });
}

// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
//  FIREBASE — Realtime Database
// ═══════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyDvngJrbB6-g4IJTN2k1nbFVIb7bAqytHE",
  authDomain: "geoquiz-676ac.firebaseapp.com",
  databaseURL:
    "https://geoquiz-676ac-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "geoquiz-676ac",
  storageBucket: "geoquiz-676ac.firebasestorage.app",
  messagingSenderId: "22397346126",
  appId: "1:22397346126:web:46840ab5deff5812437e1f",
  measurementId: "G-JC9WQRJQJM",
};

// Init Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const scoresRef = db.ref("scores");

// Écoute en temps réel → met à jour boardData.entries + affichage dès qu'un score arrive
scoresRef.on("value", (snapshot) => {
  const data = snapshot.val() || {};
  const entries = Object.values(data);
  boardData.entries = entries;
  // Rafraîchir si l'onglet classement est visible
  if (document.getElementById("s-board").style.display !== "none") {
    refreshAddClassSel();
    renderBoard();
  }
  // Rafraîchir aussi les selects de sauvegarde
  refreshSaveClasseSel();
});

function loadBoard() {
  // Rien à faire — Firebase écoute en temps réel via scoresRef.on()
}

async function saveBoard() {
  // Rien à faire — chaque pushEntry écrit directement dans Firebase
}

async function pushEntry(obj) {
  const entry = {
    id: Date.now() + "_" + Math.random().toString(36).slice(2),
    ts: Date.now(),
    ...obj,
  };
  // Écriture dans Firebase
  try {
    await scoresRef.child(entry.id).set(entry);
  } catch (e) {
    toast("❌ Erreur de connexion Firebase", "err");
    console.error(e);
  }
}

// helpers
function pct(s, t) {
  return t > 0 ? Math.round((s / t) * 100) : 0;
}
function gColor(p) {
  return p >= 90
    ? "#4caf78"
    : p >= 70
      ? "#f5c842"
      : p >= 50
        ? "#e8a23a"
        : "#e8533a";
}
function gEmoji(p) {
  return p === 100
    ? "🏆"
    : p >= 90
      ? "🌟"
      : p >= 70
        ? "👏"
        : p >= 50
          ? "📚"
          : "💪";
}
function fmtDate(ts) {
  const d = new Date(ts);
  return (
    d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }) +
    " " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
}

function bestPerStudent(list) {
  const map = {};
  list.forEach((e) => {
    const p = pct(e.score, e.total);
    if (!map[e.name] || p > pct(map[e.name].score, map[e.name].total))
      map[e.name] = e;
  });
  return Object.values(map).sort(
    (a, b) => pct(b.score, b.total) - pct(a.score, a.total),
  );
}

function bSort(s, btn) {
  bSortBy = s;
  document
    .querySelectorAll("#s-board .bfg:last-child .pill")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderBoard();
}

function renderBoard() {
  const filtered = boardData.entries
    .filter((e) => bFilterClass === "all" || e.classe === bFilterClass)
    .filter((e) => bFilterMode === "all" || e.mode === bFilterMode)
    .sort((a, b) => {
      if (bSortBy === "pct")
        return pct(b.score, b.total) - pct(a.score, a.total);
      if (bSortBy === "date") return b.ts - a.ts;
      return a.name.localeCompare(b.name);
    });
  const ranked = bestPerStudent(filtered);

  // Stats
  const avg = filtered.length
    ? Math.round(
        filtered.reduce((s, e) => s + pct(e.score, e.total), 0) /
          filtered.length,
      )
    : 0;
  const best = filtered.length
    ? Math.max(...filtered.map((e) => pct(e.score, e.total)))
    : 0;
  document.getElementById("bStats").innerHTML = [
    ["👤", ranked.length, "Élèves"],
    ["🎯", filtered.length, "Parties"],
    ["📊", avg + "%", "Moyenne"],
    ["🏆", best + "%", "Record"],
  ]
    .map(
      ([icon, val, lbl]) =>
        `<div class="bstat"><span class="bstat-icon">${icon}</span><span class="bstat-val">${val}</span><span class="bstat-lbl">${lbl}</span></div>`,
    )
    .join("");

  // Class pills
  document.getElementById("bClassPills").innerHTML = [
    "all",
    ...boardData.classes,
  ]
    .map(
      (c) =>
        `<button class="pill${bFilterClass === c ? " active" : ""}" onclick="bSetClass('${c}',this)">${c === "all" ? "Toutes" : c}</button>`,
    )
    .join("");

  // Mode pills
  document.getElementById("bModePills").innerHTML =
    `<button class="pill${bFilterMode === "all" ? " active" : ""}" onclick="bSetMode('all',this)">Tous</button>` +
    Object.entries(MODES_FR)
      .map(
        ([k, v]) =>
          `<button class="pill${bFilterMode === k ? " active" : ""}" onclick="bSetMode('${k}',this)">${v}</button>`,
      )
      .join("");

  // Podium
  const pw = document.getElementById("podiumWrap");
  if (ranked.length >= 3) {
    const order = [ranked[1], ranked[0], ranked[2]];
    const heights = [95, 125, 75],
      barClrs = ["#9090a0", "#f5c842", "#c87941"],
      realPos = [1, 0, 2];
    pw.innerHTML = `<div class="podium">${order
      .map((e, i) => {
        const p = pct(e.score, e.total);
        return `<div class="pod-item"><span class="pod-medal">${MEDALS[realPos[i]]}</span><span class="pod-name">${e.name}</span><span class="pod-pct" style="color:${gColor(p)}">${p}%</span><span class="pod-classe">${e.classe}</span><div class="pod-bar" style="height:${heights[i]}px;background:${barClrs[i]};opacity:.85"></div></div>`;
      })
      .join("")}</div>`;
  } else {
    pw.innerHTML = "";
  }

  // Table
  const body = document.getElementById("bBody");
  if (!filtered.length) {
    body.innerHTML =
      '<div class="empty-board">Aucun score enregistré.<br>Jouez un quiz et sauvegardez votre score, ou ajoutez-en un manuellement.</div>';
    return;
  }
  body.innerHTML = filtered
    .map((e, i) => {
      const p = pct(e.score, e.total);
      const ri = ranked.findIndex(
        (r) => r.name === e.name && r.classe === e.classe,
      );
      const rankDisp =
        bSortBy === "pct" && ri >= 0 && ri < 3
          ? MEDALS[ri]
          : `<span style="color:var(--muted)">${i + 1}</span>`;
      return `<div class="btr">
      <span class="tc-rank">${rankDisp}</span>
      <span class="tc-name" style="font-weight:500">${gEmoji(p)} ${e.name}</span>
      <span class="tc-classe"><span class="cbadge">${e.classe}</span></span>
      <span class="tc-mode" style="color:var(--muted);font-size:.74rem">${MODES_FR[e.mode] || e.mode}</span>
      <span class="tc-score" style="color:var(--muted);font-size:.76rem">${e.score}/${e.total}</span>
      <span class="tc-pct"><span class="pct-n" style="color:${gColor(p)}">${p}%</span></span>
      <span class="tc-date" style="color:var(--muted);font-size:.72rem">${fmtDate(e.ts)}</span>
    </div>`;
    })
    .join("");
}

function bSetClass(c, btn) {
  bFilterClass = c;
  document
    .querySelectorAll("#bClassPills .pill")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderBoard();
}
function bSetMode(m, btn) {
  bFilterMode = m;
  document
    .querySelectorAll("#bModePills .pill")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderBoard();
}
function bAskDel(id) {
  bPendingDel = id;
  renderBoard();
}
function bCancelDel() {
  bPendingDel = null;
  renderBoard();
}
async function bConfirmDel(id) {
  try {
    await scoresRef.child(id).remove();
  } catch (e) {
    toast("❌ Erreur suppression", "err");
    return;
  }
  bPendingDel = null;
  toast("🗑️ Score supprimé");
}
async function resetBoard() {
  if (!confirm("Effacer tout le classement ?")) return;
  try {
    await scoresRef.remove();
  } catch (e) {
    toast("❌ Erreur réinitialisation", "err");
    return;
  }
  bFilterClass = "all";
  bFilterMode = "all";
  toast("🗑️ Classement réinitialisé");
}

// Add panel
function toggleAddPanel() {
  addPanelOpen = !addPanelOpen;
  document.getElementById("addPanel").classList.toggle("open", addPanelOpen);
}

function refreshAddClassSel() {
  const sel = document.getElementById("aCsel");
  if (!sel) return;
  sel.innerHTML =
    '<option value="">— Choisir —</option>' +
    (boardData.classes || [])
      .map((c) => `<option value="${c}">${c}</option>`)
      .join("");
  const newF = document.getElementById("aNewF");
  if (newF) newF.style.display = "none";
}
function addManual() {
  const name = document.getElementById("aN").value.trim();
  const sv = document.getElementById("aCsel").value,
    nv = document.getElementById("aNew").value.trim();
  const classe = sv === "__new__" || sv === "" ? nv : sv;
  const mode = document.getElementById("aMode").value;
  const score = parseInt(document.getElementById("aScore").value);
  const total = parseInt(document.getElementById("aTotal").value);
  if (!name) {
    toast("⚠️ Entrez un prénom", "err");
    return;
  }
  if (!classe) {
    toast("⚠️ Choisissez ou créez une classe", "err");
    return;
  }
  if (isNaN(score) || isNaN(total) || score < 0 || total < 1 || score > total) {
    toast("⚠️ Score invalide", "err");
    return;
  }
  pushEntry({ name, classe, mode, score, total });
  document.getElementById("aN").value = "";
  document.getElementById("aScore").value = "";
  toast(`✅ Score de ${name} enregistré !`);
  refreshAddClassSel();
  renderBoard();
}

// JSON export/import
function exportJSON() {
  const blob = new Blob([JSON.stringify(boardData, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `geoquiz-classement-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("⬇️ Fichier exporté !");
}
function importJSON(input) {
  const file = input.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = async (e) => {
    try {
      const d = JSON.parse(e.target.result);
      if (!d.entries || !d.classes) throw new Error();
      const existing = new Set(boardData.entries.map((e) => e.id));
      const newE = d.entries.filter((e) => !existing.has(e.id));
      // Écrire dans Firebase
      const updates = {};
      newE.forEach((entry) => {
        updates[entry.id] = entry;
      });
      await scoresRef.update(updates);
      toast(`✅ ${newE.length} score(s) importé(s) !`);
      refreshAddClassSel();
      renderBoard();
    } catch {
      toast("❌ Fichier JSON invalide", "err");
    }
  };
  r.readAsText(file);
  input.value = "";
}

// ═══════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function addRipple(btn, e) {
  const r = document.createElement("span");
  r.className = "ripple";
  const rect = btn.getBoundingClientRect(),
    sz = Math.max(rect.width, rect.height) * 2;
  r.style.cssText = `width:${sz}px;height:${sz}px;left:${e.clientX - rect.left - sz / 2}px;top:${e.clientY - rect.top - sz / 2}px`;
  btn.appendChild(r);
  setTimeout(() => r.remove(), 550);
}

function toast(msg, type = "ok") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = type;
  el.style.display = "block";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.style.display = "none"), 2800);
}

// ═══════════════════════════════════════════
//  ADMIN — Gestion des classes
// ═══════════════════════════════════════════
const ADMIN_PWD = "prof2024"; // ← change ce mot de passe !
const classesRef = db.ref("classes");

// Écoute en temps réel les classes
classesRef.on("value", (snapshot) => {
  const data = snapshot.val() || {};
  boardData.classes = Object.values(data).sort();
  refreshSaveClasseSel();
  refreshAddClassSel();
  renderAdminClasses();
});

function openAdmin() {
  document.getElementById("adminOverlay").classList.add("open");
  document.getElementById("adminLogin").style.display = "block";
  document.getElementById("adminPanel").style.display = "none";
  document.getElementById("adminPwdInp").value = "";
  document.getElementById("adminPwdErr").style.display = "none";
  setTimeout(() => document.getElementById("adminPwdInp").focus(), 100);
}

function closeAdmin() {
  document.getElementById("adminOverlay").classList.remove("open");
}

function checkAdminPwd() {
  const val = document.getElementById("adminPwdInp").value;
  if (val === ADMIN_PWD) {
    document.getElementById("adminLogin").style.display = "none";
    document.getElementById("adminPanel").style.display = "block";
    renderAdminClasses();
  } else {
    document.getElementById("adminPwdErr").style.display = "block";
    document.getElementById("adminPwdInp").value = "";
    document.getElementById("adminPwdInp").focus();
  }
}

function renderAdminClasses() {
  const el = document.getElementById("adminClassesList");
  if (!el) return;
  const classes = boardData.classes || [];
  if (classes.length === 0) {
    el.innerHTML =
      '<div style="color:var(--muted);font-size:.8rem;text-align:center;padding:.8rem">Aucune classe. Ajoutez-en une ci-dessous.</div>';
    return;
  }
  el.innerHTML = classes
    .map(
      (c) => `
    <div class="classe-row">
      <span>🏫 ${c}</span>
      <button class="del-classe" onclick="adminDelClasse('${c.replace(/'/g, "\\'")}')">🗑 Supprimer</button>
    </div>`,
    )
    .join("");
}

async function adminAddClasse() {
  const inp = document.getElementById("adminNewClasse");
  const name = inp.value.trim();
  if (!name) {
    toast("⚠️ Entrez un nom de classe", "err");
    return;
  }
  if (boardData.classes.includes(name)) {
    toast("⚠️ Cette classe existe déjà", "err");
    return;
  }
  const id = name.replace(/[^a-zA-Z0-9]/g, "_");
  await classesRef.child(id).set(name);
  inp.value = "";
  toast(`✅ Classe "${name}" ajoutée !`);
}

async function adminDelClasse(name) {
  if (!confirm(`Supprimer la classe "${name}" ?`)) return;
  const id = name.replace(/[^a-zA-Z0-9]/g, "_");
  await classesRef.child(id).remove();
  toast(`🗑️ Classe "${name}" supprimée`);
}

// ═══════════════════════════════════════════
//  EXPOSE GLOBALS — requis pour CodePen
// ═══════════════════════════════════════════
window.openAdmin = openAdmin;
window.toggleTheme = toggleTheme;
window.closeAdmin = closeAdmin;
window.checkAdminPwd = checkAdminPwd;
window.adminAddClasse = adminAddClasse;
window.adminDelClasse = adminDelClasse;
window.goTo = goTo;
window.startQuiz = startQuiz;
window.submitTxt = submitTxt;
window.nextQ = nextQ;
window.saveScore = saveScore;
window.mapSubmit = mapSubmit;
window.mapRegion = mapRegion;
window.resetMap = resetMap;
window.bSort = bSort;
window.bSetClass = bSetClass;
window.bSetMode = bSetMode;
window.bAskDel = bAskDel;
window.bCancelDel = bCancelDel;
window.bConfirmDel = bConfirmDel;
window.resetBoard = resetBoard;
window.toggleAddPanel = toggleAddPanel;
function onAddClasseSel() {} // stub — plus de nouvelle classe manuelle
window.onAddClasseSel = onAddClasseSel;
window.addManual = addManual;
window.exportJSON = exportJSON;
window.importJSON = importJSON;

// ═══════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════
loadAll();
