/* ===== YOUR TMDB API KEY =====
   1. Create a TMDB account and request an API key:
      https://www.themoviedb.org/settings/api
   2. Paste the v3 API Key between the quotes below.
   Note: a browser-only app exposes this key to visitors. Use a backend
   proxy and environment variable before deploying a public production app. */
// Paste your TMDB API Key (v3 auth) between these quotes before running the app.
const TMDB_API_KEY = "http://127.0.0.1:8000/api/movies/";

"use strict";

/* ==========================================================================
   MovieFinder
   Layers (each has one job):
     1. Config       - constants
     2. State        - what the app currently knows
     3. API service  - talks to TMDB, nothing else
     4. Storage      - saves favorites in localStorage
     5. UI           - builds and updates what the user sees
   Data flow: user event -> API service -> state -> UI re-render
   ========================================================================== */

/* ---------- 1. Config ---------- */
const API_BASE_URL = "http://127.0.0.1:8000/api/movies/";
const IMG_CARD = "https://image.tmdb.org/t/p/w342";
const IMG_DETAIL = "https://image.tmdb.org/t/p/w500";
const FAVORITES_KEY = "speedmoviefinder:favorites";
const DEBOUNCE_MS = 400;

/* ---------- 2. State ---------- */
const state = {
  view: "browse",       // "browse" or "favorites"
  query: "",            // current search text ("" means show popular)
  page: 1,
  totalPages: 1,
  movies: [],           // movies shown in the browse view
  loading: false,
  browseRequest: 0,     // counter used to ignore outdated responses
  modalRequest: 0,
  favorites: [],
};

/* ---------- DOM references ---------- */
const byId = (id) => document.getElementById(id);

const els = {
  tabBrowse: byId("tab-browse"),
  tabFavorites: byId("tab-favorites"),
  favCount: byId("fav-count"),
  searchWrap: byId("search-wrap"),
  searchInput: byId("search-input"),
  sectionTitle: byId("section-title"),
  message: byId("message"),
  grid: byId("grid"),
  loader: byId("loader"),
  loadMore: byId("load-more"),
  modal: byId("modal"),
  modalBody: byId("modal-body"),
  modalClose: byId("modal-close"),
};

/* ---------- 3. API service ---------- */
async function apiGet(path, params = {}) {
  const url = new URL(API_BASE_URL + path);

  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(name, String(value));
    }
  }

  let response;

  try {
    response = await fetch(url.toString());
  } catch (error) {
    throw new Error("Network error. Check your internet connection and try again.");
  }

  if (response.status === 404) {
    throw new Error("That movie could not be found.");
  }

  if (!response.ok) {
    throw new Error("Something went wrong (error " + response.status + ").");
  }

  return response.json();
}


function fetchMovies(query, page) {
  return apiGet("", {
    query: query,
    page: page
  });
}


function fetchMovieDetails(id) {
  return apiGet(id + "/");
}

/* ---------- 4. Storage ---------- */
function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites));
  } catch (error) {
    // Storage can be full or blocked (private mode). The app still works without it.
  }
}

/* ---------- Helpers ---------- */
function debounce(fn, delay) {
  let timer = null;
  return function () {
    const args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () { fn.apply(null, args); }, delay);
  };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function yearOf(movie) {
  return movie.release_date ? movie.release_date.slice(0, 4) : "N/A";
}

function ratingOf(movie) {
  return typeof movie.vote_average === "number" && movie.vote_average > 0
    ? movie.vote_average.toFixed(1)
    : "NR";
}

function formatRuntime(minutes) {
  if (!minutes) return "N/A";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? hours + "h " + mins + "m" : mins + "m";
}

// Keep only the fields we need, so favorites stay small in localStorage.
function toSummary(movie) {
  return {
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path || null,
    release_date: movie.release_date || "",
    vote_average: typeof movie.vote_average === "number" ? movie.vote_average : 0,
  };
}

function isFavorite(id) {
  return state.favorites.some(function (movie) { return movie.id === id; });
}

/* ---------- 5. UI ---------- */
function createPoster(path, title, baseUrl) {
  if (!path) return el("div", "poster no-poster", "No image");
  const img = document.createElement("img")
  img.className = "poster";
  img.src = baseUrl + path;
  img.alt = title + " poster";
  img.loading = "lazy";
  img.addEventListener("error", function () {
    img.replaceWith(el("div", "poster no-poster", "No image"));
  });
  return img;
}

function setFavButtonState(button) {
  const saved = isFavorite(Number(button.dataset.favId));
  button.classList.toggle("is-saved", saved);
  button.setAttribute("aria-pressed", String(saved));
  if (button.classList.contains("fav-btn")) {
    button.textContent = saved ? "\u2665" : "\u2661";
    button.setAttribute("aria-label", saved ? "Remove from favorites" : "Add to favorites");
  } else {
    button.textContent = saved ? "\u2665 Saved to favorites" : "\u2661 Add to favorites";
  }
}

function createFavButton(movie, compact) {
  const button = el("button", compact ? "fav-btn" : "fav-large");
  button.type = "button";
  button.dataset.favId = String(movie.id);
  setFavButtonState(button);
  button.addEventListener("click", function (event) {
    event.stopPropagation();
    toggleFavorite(movie);
  });
  return button;
}

function toggleFavorite(movie) {
  const summary = toSummary(movie);
  if (isFavorite(summary.id)) {
    state.favorites = state.favorites.filter(function (item) { return item.id !== summary.id; });
  } else {
    state.favorites = [summary].concat(state.favorites);
  }
  saveFavorites();
  refreshFavoriteUI();
}

function refreshFavoriteUI() {
  els.favCount.textContent = String(state.favorites.length);
  if (state.view === "favorites") renderFavorites();
  document.querySelectorAll("[data-fav-id]").forEach(function (button) {
    setFavButtonState(button);
  });
}

function createCard(movie) {
  const card = el("article", "card");

  const open = el("button", "card-open");
  open.type = "button";
  open.addEventListener("click", function () { openModal(movie.id); });

  const info = el("div", "card-info");
  info.append(
    el("h3", "card-title", movie.title),
    el("p", "card-meta", yearOf(movie) + " \u2022 \u2605 " + ratingOf(movie))
  );
  open.append(createPoster(movie.poster_path, movie.title, IMG_CARD), info);

  card.append(open, createFavButton(movie, true));
  return card;
}

function renderGrid(list) {
  els.grid.replaceChildren.apply(els.grid, list.map(function (movie) { return createCard(movie); }));
}

function showMessage(text, isError) {
  els.message.textContent = text;
  els.message.classList.toggle("error", Boolean(isError));
  els.message.classList.remove("hidden");
}

function hideMessage() {
  els.message.textContent = "";
  els.message.classList.add("hidden");
}

function updateLoadMore() {
  const show =
    state.view === "browse" &&
    !state.loading &&
    state.movies.length > 0 &&
    state.page < state.totalPages;
  els.loadMore.classList.toggle("hidden", !show);
}

function setLoading(isLoading) {
  state.loading = isLoading;
  els.loader.classList.toggle("hidden", !isLoading);
  updateLoadMore();
}

function updateTitle() {
  if (state.view === "favorites") {
    els.sectionTitle.textContent = "Your favorites (" + state.favorites.length + ")";
  } else {
    els.sectionTitle.textContent = state.query
      ? 'Results for "' + state.query + '"'
      : "Popular right now";
  }
}

function renderFavorites() {
  updateTitle();
  renderGrid(state.favorites);
  if (state.favorites.length === 0) {
    showMessage("You have no favorites yet. Tap the heart on any movie to save it here.", false);
  } else {
    hideMessage();
  }
}

/* ---------- Loading movies ---------- */
async function loadMovies(reset) {
  const requestId = ++state.browseRequest;
  const nextPage = reset ? 1 : state.page + 1;

  if (reset) {
    state.movies = [];
    state.page = 1;
    state.totalPages = 1;
    renderGrid([]);
  }

  hideMessage();
  setLoading(true);

  try {
    const data = await fetchMovies(state.query, nextPage);
    if (requestId !== state.browseRequest) return; // a newer request replaced this one

    const incoming = Array.isArray(data.results) ? data.results : [];
    const known = new Set(state.movies.map(function (movie) { return movie.id; }));
    state.movies = state.movies.concat(incoming.filter(function (movie) { return !known.has(movie.id); }));
    state.page = data.page || nextPage;
    state.totalPages = data.total_pages || 1;

    renderGrid(state.movies);
    if (state.movies.length === 0) {
      showMessage('No movies found for "' + state.query + '". Try a different title.', false);
    }
  } catch (error) {
    if (requestId !== state.browseRequest) return;
    showMessage(error.message, true);
  } finally {
    if (requestId === state.browseRequest) setLoading(false);
  }
}

/* ---------- Views ---------- */
function switchView(view) {
  state.view = view;
  state.browseRequest += 1; // cancel any request still in flight
  setLoading(false);
  hideMessage();

  const isBrowse = view === "browse";
  els.tabBrowse.classList.toggle("active", isBrowse);
  els.tabFavorites.classList.toggle("active", !isBrowse);
  els.tabBrowse.setAttribute("aria-selected", String(isBrowse));
  els.tabFavorites.setAttribute("aria-selected", String(!isBrowse));
  els.searchWrap.classList.toggle("hidden", !isBrowse);

  if (isBrowse) {
    updateTitle();
    if (state.movies.length > 0) {
      renderGrid(state.movies);
      updateLoadMore();
    } else {
      loadMovies(true);
    }
  } else {
    renderFavorites();
    updateLoadMore();
  }
}

/* ---------- Detail modal ---------- */
let lastFocused = null;

function renderModal(movie) {
  const layout = el("div", "detail");
  const info = el("div", "detail-info");

  info.append(el("h2", "detail-title", movie.title));
  if (movie.tagline) info.append(el("p", "detail-tagline", movie.tagline));

  info.append(
    el(
      "p",
      "detail-meta",
      yearOf(movie) + "  \u2022  " + formatRuntime(movie.runtime) + "  \u2022  \u2605 " + ratingOf(movie)
    )
  );

  if (Array.isArray(movie.genres) && movie.genres.length > 0) {
    const chips = el("div", "chips");
    movie.genres.forEach(function (genre) { chips.append(el("span", "chip", genre.name)); });
    info.append(chips);
  }

  info.append(el("p", "detail-overview", movie.overview || "No overview available."));
  info.append(createFavButton(movie, false));

  layout.append(createPoster(movie.poster_path, movie.title, IMG_DETAIL), info);
  els.modalBody.replaceChildren(layout);
}

async function openModal(id) {
  const requestId = ++state.modalRequest;
  lastFocused = document.activeElement;

  els.modalBody.replaceChildren(el("p", "modal-status", "Loading details..."));
  els.modal.classList.remove("hidden");
  document.body.classList.add("no-scroll");
  els.modalClose.focus();

  try {
    const movie = await fetchMovieDetails(id);
    if (requestId !== state.modalRequest) return;
    renderModal(movie);
  } catch (error) {
    if (requestId !== state.modalRequest) return;
    els.modalBody.replaceChildren(el("p", "modal-status error", error.message));
  }
}

function closeModal() {
  if (els.modal.classList.contains("hidden")) return;
  state.modalRequest += 1; // ignore any details still loading
  els.modal.classList.add("hidden");
  document.body.classList.remove("no-scroll");
  if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  lastFocused = null;
}

/* ---------- Events & start-up ---------- */
const handleSearch = debounce(function () {
  const query = els.searchInput.value.trim();
  if (query === state.query) return;
  state.query = query;
  updateTitle();
  loadMovies(true);
}, DEBOUNCE_MS);

function init() {
  state.favorites = loadFavorites();
  els.favCount.textContent = String(state.favorites.length);

  els.searchInput.addEventListener("input", handleSearch);
  els.tabBrowse.addEventListener("click", function () { switchView("browse"); });
  els.tabFavorites.addEventListener("click", function () { switchView("favorites"); });
  els.loadMore.addEventListener("click", function () { loadMovies(false); });

  els.modalClose.addEventListener("click", closeModal);
  els.modal.addEventListener("click", function (event) {
    if (event.target.hasAttribute("data-close")) closeModal();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeModal();
  });

  switchView("browse");
}

document.addEventListener("DOMContentLoaded", init);
