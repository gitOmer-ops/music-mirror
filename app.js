const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";
const SCOPE = "user-top-read";
const STORAGE_CLIENT = "music_mirror_client_id";
const STORAGE_VERIFIER = "music_mirror_pkce_verifier";

const palette = ["#1ed760", "#ff5a7a", "#f3b14b", "#35c5d8", "#8a6bff", "#f7f1e8"];

const archetypes = [
  {
    name: "Neon Main Character",
    condition: (s) => s.energy > 0.68 && s.danceability > 0.58 && s.valence > 0.52,
    tagline: "High-gloss hooks, late-night confidence, zero skips.",
    ego: "The Flashbulb Romantic",
    truth: "You make ordinary errands feel like a trailer sequence and believe momentum solves at least half of heartbreak.",
  },
  {
    name: "Velvet Time Traveler",
    condition: (s) => s.acousticness > 0.35 && s.valence < 0.55,
    tagline: "Warm textures, old souls, and beautifully specific longing.",
    ego: "The Archive Heart",
    truth: "You remember rooms by the songs that were playing in them and trust a crackly intro more than a clean alibi.",
  },
  {
    name: "Bassline Strategist",
    condition: (s) => s.danceability > 0.68 && s.energy > 0.58,
    tagline: "Rhythm-first taste with a tactical sense of drama.",
    ego: "The Afterhours Architect",
    truth: "You read the room by its BPM and can rescue a quiet night with one devastating queue decision.",
  },
  {
    name: "Soft Chaos Poet",
    condition: (s) => s.valence < 0.42 && s.energy < 0.56,
    tagline: "Tender spirals, cinematic sadness, immaculate bridges.",
    ego: "The Rain Scene Auteur",
    truth: "You are emotionally fluent, suspicious of easy endings, and excellent at finding beauty in the second verse.",
  },
  {
    name: "Solar Pop Optimist",
    condition: (s) => s.valence > 0.62 && s.energy > 0.52,
    tagline: "Bright choruses, open windows, main-stage serotonin.",
    ego: "The Chorus Collector",
    truth: "You chase lift-off moments and have an uncanny talent for making people believe the day can still turn around.",
  },
  {
    name: "Midnight Minimalist",
    condition: (s) => s.energy < 0.45 && s.acousticness < 0.35,
    tagline: "Sparse beats, cool edges, no wasted emotion.",
    ego: "The Blue Hour Ghost",
    truth: "You prefer mystery over volume and know the most powerful part of a song can be the space it leaves open.",
  },
  {
    name: "Genre Shapeshifter",
    condition: (s) => s.genreSpread > 0.72,
    tagline: "Restless curiosity with a passport full of sound.",
    ego: "The Frequency Nomad",
    truth: "You refuse to be algorithmically pinned down and treat every playlist like a door into another version of yourself.",
  },
  {
    name: "Cathartic Firestarter",
    condition: (s) => s.energy > 0.7 && s.valence < 0.5,
    tagline: "Big feelings, bigger drums, extremely necessary volume.",
    ego: "The Thunder Confessor",
    truth: "You process emotion through impact, then emerge clearer, sharper, and ready to rewrite the scene.",
  },
  {
    name: "Golden Hour Curator",
    condition: () => true,
    tagline: "Balanced taste with a gift for atmosphere.",
    ego: "The Mood Sommelier",
    truth: "You know how to choose the exact song that makes a moment feel intentional without making it feel staged.",
  },
];

const demoProfile = {
  artists: [
    { name: "SZA", genres: ["r&b", "pop", "neo soul"] },
    { name: "Tame Impala", genres: ["psychedelic pop", "indie"] },
    { name: "The Weeknd", genres: ["pop", "r&b", "synthpop"] },
    { name: "Fred again..", genres: ["house", "electronic"] },
    { name: "Lana Del Rey", genres: ["art pop", "dream pop"] },
  ],
  tracks: [
    { name: "Good Days", artist: "SZA", features: { energy: 0.52, valence: 0.41, danceability: 0.44, acousticness: 0.50, tempo: 121 } },
    { name: "The Less I Know The Better", artist: "Tame Impala", features: { energy: 0.74, valence: 0.79, danceability: 0.64, acousticness: 0.01, tempo: 117 } },
    { name: "Blinding Lights", artist: "The Weeknd", features: { energy: 0.73, valence: 0.33, danceability: 0.51, acousticness: 0.00, tempo: 171 } },
    { name: "Marea", artist: "Fred again..", features: { energy: 0.82, valence: 0.36, danceability: 0.79, acousticness: 0.02, tempo: 127 } },
    { name: "West Coast", artist: "Lana Del Rey", features: { energy: 0.59, valence: 0.36, danceability: 0.52, acousticness: 0.19, tempo: 124 } },
  ],
};

const $ = (selector) => document.querySelector(selector);

function setStatus(message) {
  $("#authStatus").textContent = message;
}

function showLoading(copy = "Finding the patterns hiding inside your recent obsessions.") {
  $("#profileView").hidden = true;
  $("#loadingView").hidden = false;
  $("#loadingCopy").textContent = copy;
}

function hideLoading() {
  $("#loadingView").hidden = true;
}

function randomString(length = 64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((byte) => chars[byte % chars.length]).join("");
}

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  return crypto.subtle.digest("SHA-256", data);
}

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function connectSpotify() {
  const clientId = $("#clientId").value.trim();
  if (!clientId) {
    setStatus("Paste and save your Spotify client ID first.");
    $("#clientId").focus();
    return;
  }

  localStorage.setItem(STORAGE_CLIENT, clientId);
  const verifier = randomString();
  const challenge = base64UrlEncode(await sha256(verifier));
  sessionStorage.setItem(STORAGE_VERIFIER, verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SCOPE,
    redirect_uri: location.origin + location.pathname,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });
  location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  const verifier = sessionStorage.getItem(STORAGE_VERIFIER);
  const clientId = localStorage.getItem(STORAGE_CLIENT);
  if (!verifier || !clientId) throw new Error("Missing OAuth verifier. Start the Spotify connection again.");

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: location.origin + location.pathname,
    code_verifier: verifier,
  });

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error("Spotify did not accept the login. Check your redirect URI and client ID.");
  return response.json();
}

async function spotifyGet(path, token, params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE}${path}${query ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Spotify request failed for ${path}.`);
  return response.json();
}

async function fetchSpotifyProfile(token) {
  const [artists, tracks] = await Promise.all([
    spotifyGet("/me/top/artists", token, { limit: 20, time_range: "medium_term" }),
    spotifyGet("/me/top/tracks", token, { limit: 20, time_range: "medium_term" }),
  ]);

  const ids = tracks.items.map((track) => track.id).filter(Boolean);
  let featureMap = new Map();
  if (ids.length) {
    try {
      const features = await spotifyGet("/audio-features", token, { ids: ids.join(",") });
      featureMap = new Map(features.audio_features.filter(Boolean).map((feature) => [feature.id, feature]));
    } catch (error) {
      setStatus("Spotify top data loaded. Mood is estimated because audio features are unavailable for this app.");
    }
  }

  return {
    artists: artists.items.map((artist) => ({ name: artist.name, genres: artist.genres || [] })),
    tracks: tracks.items.map((track) => ({
      name: track.name,
      artist: track.artists.map((artist) => artist.name).join(", "),
      features: featureMap.get(track.id) || estimateFeatures(track, artists.items),
    })),
  };
}

function estimateFeatures(track, artists) {
  const artistGenres = artists.flatMap((artist) => artist.genres || []).join(" ");
  const popBoost = /pop|dance|house|edm|club/i.test(artistGenres) ? 0.18 : 0;
  const softBoost = /folk|acoustic|singer|indie/i.test(artistGenres) ? 0.18 : 0;
  const popularity = (track.popularity || 55) / 100;
  return {
    energy: clamp(0.36 + popularity * 0.36 + popBoost - softBoost),
    valence: clamp(0.34 + popularity * 0.28),
    danceability: clamp(0.42 + popBoost + popularity * 0.25),
    acousticness: clamp(0.18 + softBoost),
    tempo: 96 + Math.round(popularity * 54),
  };
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function average(values, fallback = 0) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
}

function analyzeProfile(profile) {
  const tracks = profile.tracks.filter((track) => track.features);
  const genreCounts = new Map();
  profile.artists.forEach((artist) => {
    artist.genres.forEach((genre) => genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1));
  });

  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const scores = {
    energy: average(tracks.map((track) => track.features.energy), 0.58),
    valence: average(tracks.map((track) => track.features.valence), 0.52),
    danceability: average(tracks.map((track) => track.features.danceability), 0.56),
    acousticness: average(tracks.map((track) => track.features.acousticness), 0.22),
    tempo: average(tracks.map((track) => track.features.tempo), 118),
    genreSpread: topGenres.length ? clamp(topGenres.length / 7 + Math.min(0.22, genreCounts.size / 80)) : 0.42,
  };

  const archetype = archetypes.find((item) => item.condition(scores));
  const intensity = Math.round((scores.energy * 0.34 + scores.danceability * 0.24 + (1 - scores.acousticness) * 0.18 + scores.genreSpread * 0.24) * 100);
  const moodIndex = clamp(scores.energy * 0.5 + scores.danceability * 0.28 + (scores.tempo / 190) * 0.22);
  const moodTitle = moodIndex > 0.72 ? "Electric pulse" : moodIndex > 0.55 ? "Radiant motion" : moodIndex > 0.38 ? "Velvet drift" : "Blue hush";

  return {
    ...scores,
    archetype,
    topGenres: topGenres.length ? topGenres : [{ name: "pop", count: 2 }, { name: "indie", count: 1 }, { name: "r&b", count: 1 }],
    intensity,
    moodIndex,
    moodTitle,
    tasteCopy: makeTasteCopy(scores),
    truth: buildTruth(archetype, scores),
    artists: profile.artists.slice(0, 5),
    tracks: profile.tracks.slice(0, 5),
  };
}

function makeTasteCopy(scores) {
  if (scores.energy > 0.68 && scores.valence < 0.48) return "catharsis with excellent lighting";
  if (scores.danceability > 0.66) return "romantic chaos with perfect pacing";
  if (scores.acousticness > 0.38) return "soft-focus nostalgia and lyrical weather";
  if (scores.genreSpread > 0.72) return "restless range and passport-stamp playlists";
  if (scores.valence > 0.62) return "solar confidence and chorus therapy";
  return "cinematic feeling with a clean sense of timing";
}

function buildTruth(archetype, scores) {
  const modifiers = [];
  if (scores.energy > 0.66) modifiers.push("You trust big entrances.");
  if (scores.valence < 0.46) modifiers.push("You like joy with a shadow under it.");
  if (scores.danceability > 0.64) modifiers.push("Your instincts arrive on-beat.");
  if (scores.acousticness > 0.34) modifiers.push("You keep a private museum of feelings.");
  return `${archetype.truth} ${modifiers.slice(0, 2).join(" ")}`.trim();
}

function renderProfile(analysis) {
  hideLoading();
  $("#profileView").hidden = false;
  $("#shareDate").textContent = new Date().getFullYear();
  $("#archetypeName").textContent = analysis.archetype.name;
  $("#archetypeTagline").textContent = analysis.archetype.tagline;
  $("#alterEgoName").textContent = analysis.archetype.ego;
  $("#alterEgoCopy").textContent = makeAlterEgoCopy(analysis);
  $("#moodTitle").textContent = analysis.moodTitle;
  $("#moodNeedle").style.left = `${Math.round(analysis.moodIndex * 100)}%`;
  $("#tasteScore").textContent = `${analysis.intensity}%`;
  $("#tasteCopy").textContent = analysis.tasteCopy;
  $("#truthCopy").textContent = analysis.truth;
  $("#genrePie").style.background = buildPie(analysis.topGenres);
  $("#genreList").innerHTML = analysis.topGenres
    .slice(0, 4)
    .map((genre) => `<li>${titleCase(genre.name)}</li>`)
    .join("");
  $("#metricGrid").innerHTML = [
    ["Energy", analysis.energy],
    ["Mood lift", analysis.valence],
    ["Dance pull", analysis.danceability],
    ["Acoustic tint", analysis.acousticness],
  ]
    .map(([label, value]) => `<article class="metric-card"><strong>${Math.round(value * 100)}</strong><span>${label}</span></article>`)
    .join("");
  $("#artistList").innerHTML = analysis.artists.map((artist) => `<li>${artist.name}</li>`).join("");
  $("#trackList").innerHTML = analysis.tracks.map((track) => `<li>${track.name} - ${track.artist}</li>`).join("");
}

function makeAlterEgoCopy(analysis) {
  const firstGenre = titleCase(analysis.topGenres[0]?.name || "pop");
  return `A ${firstGenre} coded persona with ${analysis.moodTitle.toLowerCase()} energy and a suspiciously strong sense of track order.`;
}

function buildPie(genres) {
  const total = genres.reduce((sum, genre) => sum + genre.count, 0) || 1;
  let cursor = 0;
  const stops = genres.map((genre, index) => {
    const start = cursor;
    cursor += (genre.count / total) * 100;
    return `${palette[index % palette.length]} ${start.toFixed(1)}% ${cursor.toFixed(1)}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function titleCase(value) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function handleOAuthReturn() {
  const params = new URLSearchParams(location.search);
  const code = params.get("code");
  const error = params.get("error");
  if (error) setStatus(`Spotify login stopped: ${error}`);
  if (!code) return;

  history.replaceState({}, document.title, location.origin + location.pathname);
  showLoading("Spotify connected. Building the profile from your top tracks and artists.");
  try {
    const token = await exchangeCodeForToken(code);
    const profile = await fetchSpotifyProfile(token.access_token);
    renderProfile(analyzeProfile(profile));
    setStatus("Spotify profile generated.");
  } catch (error) {
    hideLoading();
    setStatus(error.message);
  }
}

function useDemo() {
  showLoading("Loading a demo profile with enough drama to test the share card.");
  setTimeout(() => {
    renderDemoProfile();
  }, 450);
}

async function renderDemoProfile() {
  renderProfile(analyzeProfile(demoProfile));
  setStatus("Demo profile generated. Connect Spotify when you are ready.");
  if (new URLSearchParams(location.search).has("exportTest")) {
    const blob = await getCardBlob();
    document.body.dataset.exportBytes = String(blob.size);
  }
}

function saveClientId() {
  const clientId = $("#clientId").value.trim();
  if (!clientId) return setStatus("Paste a client ID first.");
  localStorage.setItem(STORAGE_CLIENT, clientId);
  setStatus("Client ID saved in this browser.");
}

function drawRoundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
}

function getRenderedData() {
  return {
    archetype: $("#archetypeName").textContent,
    tagline: $("#archetypeTagline").textContent,
    ego: $("#alterEgoName").textContent,
    egoCopy: $("#alterEgoCopy").textContent,
    mood: $("#moodTitle").textContent,
    score: $("#tasteScore").textContent,
    taste: $("#tasteCopy").textContent,
    truth: $("#truthCopy").textContent,
    genres: [...$("#genreList").querySelectorAll("li")].map((li) => li.textContent),
  };
}

function renderCardCanvas() {
  const data = getRenderedData();
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, 1200, 1200);
  bg.addColorStop(0, "#19321f");
  bg.addColorStop(0.44, "#171315");
  bg.addColorStop(1, "#331721");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 1200);

  const glow = ctx.createRadialGradient(230, 160, 10, 230, 160, 420);
  glow.addColorStop(0, "rgba(30,215,96,.38)");
  glow.addColorStop(1, "rgba(30,215,96,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1200, 1200);

  ctx.fillStyle = "#f7f1e8";
  ctx.font = "700 28px Inter, Arial";
  ctx.fillText("MUSIC MIRROR", 80, 86);
  ctx.fillText(String(new Date().getFullYear()), 1048, 86);

  const disc = ctx.createConicGradient(0, 250, 260);
  palette.forEach((color, index) => disc.addColorStop(index / (palette.length - 1), color));
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(250, 260, 130, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#171315";
  ctx.beginPath();
  ctx.arc(250, 260, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(247,241,232,.72)";
  ctx.lineWidth = 18;
  ctx.stroke();

  ctx.fillStyle = "#b8b2aa";
  ctx.font = "800 26px Inter, Arial";
  ctx.fillText("LISTENING ARCHETYPE", 430, 170);
  ctx.fillStyle = "#f7f1e8";
  ctx.font = "900 76px Inter, Arial";
  wrapText(ctx, data.archetype, 430, 250, 650, 78, 2);
  ctx.font = "400 31px Inter, Arial";
  wrapText(ctx, data.tagline, 430, 414, 620, 40, 2);

  ctx.fillStyle = "rgba(0,0,0,.25)";
  drawRoundRect(ctx, 80, 520, 1040, 178, 18);
  ctx.fill();
  ctx.fillStyle = "#b8b2aa";
  ctx.font = "800 24px Inter, Arial";
  ctx.fillText("ALTER EGO", 120, 575);
  ctx.fillStyle = "#f7f1e8";
  ctx.font = "900 46px Inter, Arial";
  ctx.fillText(data.ego, 120, 632);
  ctx.font = "400 27px Inter, Arial";
  wrapText(ctx, data.egoCopy, 120, 676, 950, 34, 1);

  ctx.fillStyle = "rgba(255,255,255,.08)";
  drawRoundRect(ctx, 80, 738, 500, 245, 18);
  ctx.fill();
  ctx.fillStyle = "#b8b2aa";
  ctx.font = "800 24px Inter, Arial";
  ctx.fillText("GENRE DNA", 120, 792);
  data.genres.slice(0, 4).forEach((genre, index) => {
    ctx.fillStyle = palette[index];
    ctx.beginPath();
    ctx.arc(138, 844 + index * 38, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f7f1e8";
    ctx.font = "700 28px Inter, Arial";
    ctx.fillText(genre, 166, 854 + index * 38);
  });

  ctx.fillStyle = "rgba(255,255,255,.08)";
  drawRoundRect(ctx, 620, 738, 500, 245, 18);
  ctx.fill();
  ctx.fillStyle = "#b8b2aa";
  ctx.font = "800 24px Inter, Arial";
  ctx.fillText("TASTE SAYS", 660, 792);
  ctx.fillStyle = "#1ed760";
  ctx.font = "900 82px Inter, Arial";
  ctx.fillText(data.score, 660, 882);
  ctx.fillStyle = "#f7f1e8";
  ctx.font = "400 30px Inter, Arial";
  wrapText(ctx, data.taste, 660, 930, 380, 34, 1);

  ctx.fillStyle = "#b8b2aa";
  ctx.font = "800 24px Inter, Arial";
  ctx.fillText("WHAT YOUR TASTE SAYS ABOUT YOU", 80, 1058);
  ctx.fillStyle = "#f7f1e8";
  ctx.font = "400 32px Inter, Arial";
  wrapText(ctx, data.truth, 80, 1110, 1040, 39, 2);
  return canvas;
}

async function getCardBlob() {
  return new Promise((resolve) => renderCardCanvas().toBlob(resolve, "image/png", 0.95));
}

async function downloadImage() {
  const blob = await getCardBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "music-mirror-profile.png";
  link.click();
  URL.revokeObjectURL(url);
}

async function shareImage() {
  const blob = await getCardBlob();
  const file = new File([blob], "music-mirror-profile.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title: "My Music Mirror profile", text: "My Spotify taste has been decoded.", files: [file] });
    return;
  }
  await downloadImage();
  setStatus("Sharing is not available here, so the image was downloaded.");
}

function resetApp() {
  sessionStorage.removeItem(STORAGE_VERIFIER);
  $("#profileView").hidden = true;
  $("#loadingView").hidden = true;
  setStatus("Ready for a fresh read.");
}

function bindEvents() {
  $("#clientId").value = localStorage.getItem(STORAGE_CLIENT) || "";
  $("#saveClient").addEventListener("click", saveClientId);
  $("#connectSpotify").addEventListener("click", connectSpotify);
  $("#useDemo").addEventListener("click", useDemo);
  $("#shareImage").addEventListener("click", shareImage);
  $("#downloadImage").addEventListener("click", downloadImage);
  $("#resetApp").addEventListener("click", resetApp);
}

bindEvents();
if (new URLSearchParams(location.search).has("demo")) {
  renderDemoProfile();
} else {
  handleOAuthReturn();
}
