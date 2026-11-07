"use strict";

const video = document.getElementById("video");
const statusText = document.getElementById("status");
const cardsContainer = document.getElementById("cards");
const rowTitle = document.getElementById("rowTitle");

let hls = null;
let playbackRequest = 0;
let abortController = null;

// Buttons
const btnSport    = document.getElementById("btn-sport");
const btnMovie    = document.getElementById("btn-movie");
const btnMusic    = document.getElementById("btn-music");
const btnPreach   = document.getElementById("btn-preach");
const btnSrilanka = document.getElementById("btn-srilanka");
const btnAnimal   = document.getElementById("btn-animal");
const btnAdult    = document.getElementById("btn-adult");
const btnUnlock   = document.getElementById("btn-unlock");

// Adult embedded playlist
const adultPlaylist = `#EXTM3U
#EXTINF:-1,AdultIPTV Live Cams
http://cdn.adultiptv.net/livecams.m3u8
#EXTINF:-1,AdultIPTV MILF
http://cdn.adultiptv.net/milf.m3u8
#EXTINF:-1,AdultIPTV Big Tits
http://cdn.adultiptv.net/bigtits.m3u8
#EXTINF:-1,AdultIPTV Big Ass
http://cdn.adultiptv.net/bigass.m3u8
#EXTINF:-1,AdultIPTV Hardcore
http://cdn.adultiptv.net/hardcore.m3u8
#EXTINF:-1,AdultIPTV Lesbian
http://cdn.adultiptv.net/lesbian.m3u8
#EXTINF:-1,AdultIPTV Asian
http://cdn.adultiptv.net/asian.m3u8
#EXTINF:-1,AdultIPTV Latina
http://cdn.adultiptv.net/latina.m3u8
#EXTINF:-1,AdultIPTV Blonde
http://cdn.adultiptv.net/blonde.m3u8
#EXTINF:-1,AdultIPTV Brunette
http://cdn.adultiptv.net/brunette.m3u8
#EXTINF:-1,AdultIPTV Fetish
http://cdn.adultiptv.net/fetish.m3u8
#EXTINF:-1,AdultIPTV Pornstar
http://cdn.adultiptv.net/pornstar.m3u8
#EXTINF:-1,AdultIPTV POV
http://cdn.adultiptv.net/pov.m3u8
#EXTINF:-1,AdultIPTV Threesome
http://cdn.adultiptv.net/threesome.m3u8
#EXTINF:-1,AdultIPTV Anal
http://cdn.adultiptv.net/anal.m3u8
#EXTINF:-1,AdultIPTV Blowjob
http://cdn.adultiptv.net/blowjob.m3u8
#EXTINF:-1,AdultIPTV Interracial
http://cdn.adultiptv.net/interracial.m3u8
#EXTINF:-1,AdultIPTV Teen 18+
http://cdn.adultiptv.net/teen.m3u8
#EXTINF:-1,AdultIPTV Gay
http://cdn.adultiptv.net/gay.m3u8
#EXTINF:-1,AdultIPTV Russian
http://cdn.adultiptv.net/russian.m3u8`;

const emojis = ["📺", "🎬", "🔴", "▶️", "📡", "🎥", "💿", "🎧", "🏆", "⭐"];

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("error", isError);
}

function parsePlaylist(playlistText) {
  const channels = [];
  let currentName = "";

  for (const rawLine of playlistText.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line.startsWith("#EXTINF:")) {
      const commaIndex = line.lastIndexOf(",");
      currentName = commaIndex !== -1 ? line.slice(commaIndex + 1).trim() : "Unknown";
      continue;
    }

    if (/^https?:\/\//i.test(line)) {
      if (currentName) {
        channels.push({ name: currentName, url: line });
      }
      currentName = "";
    }
  }
  return channels;
}

function resetPlayback() {
  if (hls) {
    hls.destroy();
    hls = null;
  }
  video.pause();
  video.removeAttribute("src");
  video.load();
}

async function attemptPlayback(channelName, requestId) {
  try {
    await video.play();
    if (requestId === playbackRequest) {
      setStatus(`▶ Now Playing: ${channelName}`);
    }
  } catch (error) {
    if (requestId === playbackRequest) {
      setStatus("Channel ready. Press Play on the video.");
    }
  }
}

function playChannel(url, channelName) {
  const requestId = ++playbackRequest;
  resetPlayback();

  // Highlight active card
  document.querySelectorAll(".card").forEach(c => c.classList.remove("playing"));
  const activeCard = document.querySelector(`.card[data-url="${CSS.escape(url)}"]`);
  if (activeCard) activeCard.classList.add("playing");

  setStatus(`Loading: ${channelName}...`);

  if (window.Hls && Hls.isSupported()) {
    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      maxBufferLength: 18,
      maxMaxBufferLength: 35,
      maxBufferSize: 25 * 1000 * 1000,
      maxBufferHole: 0.4,
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 6,
      liveDurationInfinity: true,
      startLevel: -1,
      abrEwmaDefaultEstimate: 500000,
      manifestLoadingTimeOut: 12000,
      manifestLoadingMaxRetry: 3,
      levelLoadingTimeOut: 12000,
      fragLoadingTimeOut: 15000,
      fragLoadingMaxRetry: 4
    });

    hls.loadSource(url);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      attemptPlayback(channelName, requestId);
    });

    hls.on(Hls.Events.ERROR, function (event, data) {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad();
            setStatus("Network error... retrying", true);
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            setStatus("Media error... retrying", true);
            break;
          default:
            setStatus("Stream failed. Try another channel.", true);
            hls.destroy();
            break;
        }
      }
    });
    return;
  }

  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
    video.addEventListener("loadedmetadata", () => attemptPlayback(channelName, requestId), { once: true });
  }
}

function renderCards(channels, categoryName) {
  cardsContainer.innerHTML = "";
  rowTitle.textContent = categoryName;

  if (!channels.length) {
    cardsContainer.innerHTML = `<div class="empty-msg">No channels found</div>`;
    return;
  }

  channels.forEach((ch, i) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.url = ch.url;

    const poster = document.createElement("div");
    poster.className = "card-poster";
    poster.textContent = emojis[i % emojis.length];

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = ch.name;
    title.title = ch.name;

    card.appendChild(poster);
    card.appendChild(title);

    card.addEventListener("click", () => {
      playChannel(ch.url, ch.name);
    });

    cardsContainer.appendChild(card);
  });
}

async function loadChannels(playlistUrl, categoryName) {
  if (abortController) abortController.abort();
  abortController = new AbortController();

  cardsContainer.innerHTML = `<div class="empty-msg">Loading channels...</div>`;
  setStatus(`${categoryName} loading...`);

  try {
    const response = await fetch(playlistUrl, { signal: abortController.signal });
    if (!response.ok) throw new Error("Failed to load playlist");

    const text = await response.text();
    const channels = parsePlaylist(text);

    // Unique by name
    const seen = new Set();
    const unique = [];
    for (const ch of channels) {
      const key = ch.name.toLowerCase();
      if (!seen.has(key) && ch.url.startsWith("http")) {
        seen.add(key);
        unique.push(ch);
      }
    }
    unique.sort((a, b) => a.name.localeCompare(b.name));

    renderCards(unique, categoryName);
    setStatus(`${unique.length} channels loaded. Click a card to play.`);
  } catch (err) {
    if (err.name !== "AbortError") {
      cardsContainer.innerHTML = `<div class="empty-msg">Failed to load channels</div>`;
      setStatus("Failed to load playlist", true);
      console.error(err);
    }
  }
}

function loadLocalPlaylist(playlistText, categoryName) {
  const channels = parsePlaylist(playlistText);
  const seen = new Set();
  const unique = [];
  for (const ch of channels) {
    const key = ch.name.toLowerCase();
    if (!seen.has(key) && ch.url.startsWith("http")) {
      seen.add(key);
      unique.push(ch);
    }
  }
  unique.sort((a, b) => a.name.localeCompare(b.name));
  renderCards(unique, categoryName);
  setStatus(`${unique.length} channels loaded. Click a card to play.`);
}

function setActiveButton(activeBtn) {
  [btnSport, btnMovie, btnMusic, btnPreach, btnSrilanka, btnAnimal, btnAdult].forEach(btn => {
    if (btn) btn.classList.remove("active");
  });
  if (activeBtn) activeBtn.classList.add("active");
  resetPlayback();
}

// ===== Categories =====

btnSport.addEventListener("click", () => {
  setActiveButton(btnSport);
  loadChannels("https://iptv-org.github.io/iptv/categories/sports.m3u", "⚽ Sports Channels");
});

btnMovie.addEventListener("click", () => {
  setActiveButton(btnMovie);
  loadChannels("https://iptv-org.github.io/iptv/categories/movies.m3u", "🎬 Movies Channels");
});

btnMusic.addEventListener("click", () => {
  setActiveButton(btnMusic);
  loadChannels("https://iptv-org.github.io/iptv/categories/music.m3u", "🎵 Music Channels");
});

btnPreach.addEventListener("click", () => {
  setActiveButton(btnPreach);
  loadChannels("https://iptv-org.github.io/iptv/categories/religious.m3u", "✝️ Preaching Channels");
});

btnSrilanka.addEventListener("click", () => {
  setActiveButton(btnSrilanka);
  loadChannels("https://iptv-org.github.io/iptv/countries/lk.m3u", "🇱🇰 Sri Lanka Channels");
});

btnAnimal.addEventListener("click", () => {
  setActiveButton(btnAnimal);
  loadChannels("https://iptv-org.github.io/iptv/categories/documentary.m3u", "🦁 Animals & Nature");
});

// Unlock 18+
btnUnlock.addEventListener("click", () => {
  const correctPassword = "mylife2026";
  const userPassword = prompt("18+ unlock කරන්න password එක ඇතුළත් කරන්න:");

  if (userPassword === correctPassword) {
    btnAdult.style.display = "inline-flex";
    btnUnlock.style.display = "none";
    setStatus("18+ unlocked ✅");
  } else if (userPassword !== null) {
    setStatus("Password වැරදියි. Access denied.", true);
  }
});

// Adult (after unlock)
btnAdult.addEventListener("click", () => {
  setActiveButton(btnAdult);
  loadLocalPlaylist(adultPlaylist, "🔥 Adult 18+");
});

// Page load → Sports
window.addEventListener("DOMContentLoaded", () => {
  if (btnSport) {
    setActiveButton(btnSport);
    loadChannels("https://iptv-org.github.io/iptv/categories/sports.m3u", "⚽ Sports Channels");
  }
});"use strict";

const video = document.getElementById("video");
const statusText = document.getElementById("status");
const cardsContainer = document.getElementById("cards");
const rowTitle = document.getElementById("rowTitle");

let hls = null;
let playbackRequest = 0;
let abortController = null;

// Buttons
const btnSport    = document.getElementById("btn-sport");
const btnMovie    = document.getElementById("btn-movie");
const btnMusic    = document.getElementById("btn-music");
const btnPreach   = document.getElementById("btn-preach");
const btnSrilanka = document.getElementById("btn-srilanka");
const btnAnimal   = document.getElementById("btn-animal");
const btnAdult    = document.getElementById("btn-adult");
const btnUnlock   = document.getElementById("btn-unlock");

// Adult embedded playlist
const adultPlaylist = `#EXTM3U
#EXTINF:-1,AdultIPTV Live Cams
http://cdn.adultiptv.net/livecams.m3u8
#EXTINF:-1,AdultIPTV MILF
http://cdn.adultiptv.net/milf.m3u8
#EXTINF:-1,AdultIPTV Big Tits
http://cdn.adultiptv.net/bigtits.m3u8
#EXTINF:-1,AdultIPTV Big Ass
http://cdn.adultiptv.net/bigass.m3u8
#EXTINF:-1,AdultIPTV Hardcore
http://cdn.adultiptv.net/hardcore.m3u8
#EXTINF:-1,AdultIPTV Lesbian
http://cdn.adultiptv.net/lesbian.m3u8
#EXTINF:-1,AdultIPTV Asian
http://cdn.adultiptv.net/asian.m3u8
#EXTINF:-1,AdultIPTV Latina
http://cdn.adultiptv.net/latina.m3u8
#EXTINF:-1,AdultIPTV Blonde
http://cdn.adultiptv.net/blonde.m3u8
#EXTINF:-1,AdultIPTV Brunette
http://cdn.adultiptv.net/brunette.m3u8
#EXTINF:-1,AdultIPTV Fetish
http://cdn.adultiptv.net/fetish.m3u8
#EXTINF:-1,AdultIPTV Pornstar
http://cdn.adultiptv.net/pornstar.m3u8
#EXTINF:-1,AdultIPTV POV
http://cdn.adultiptv.net/pov.m3u8
#EXTINF:-1,AdultIPTV Threesome
http://cdn.adultiptv.net/threesome.m3u8
#EXTINF:-1,AdultIPTV Anal
http://cdn.adultiptv.net/anal.m3u8
#EXTINF:-1,AdultIPTV Blowjob
http://cdn.adultiptv.net/blowjob.m3u8
#EXTINF:-1,AdultIPTV Interracial
http://cdn.adultiptv.net/interracial.m3u8
#EXTINF:-1,AdultIPTV Teen 18+
http://cdn.adultiptv.net/teen.m3u8
#EXTINF:-1,AdultIPTV Gay
http://cdn.adultiptv.net/gay.m3u8
#EXTINF:-1,AdultIPTV Russian
http://cdn.adultiptv.net/russian.m3u8`;

const emojis = ["📺", "🎬", "🔴", "▶️", "📡", "🎥", "💿", "🎧", "🏆", "⭐"];

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("error", isError);
}

function parsePlaylist(playlistText) {
  const channels = [];
  let currentName = "";

  for (const rawLine of playlistText.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line.startsWith("#EXTINF:")) {
      const commaIndex = line.lastIndexOf(",");
      currentName = commaIndex !== -1 ? line.slice(commaIndex + 1).trim() : "Unknown";
      continue;
    }

    if (/^https?:\/\//i.test(line)) {
      if (currentName) {
        channels.push({ name: currentName, url: line });
      }
      currentName = "";
    }
  }
  return channels;
}

function resetPlayback() {
  if (hls) {
    hls.destroy();
    hls = null;
  }
  video.pause();
  video.removeAttribute("src");
  video.load();
}

async function attemptPlayback(channelName, requestId) {
  try {
    await video.play();
    if (requestId === playbackRequest) {
      setStatus(`▶ Now Playing: ${channelName}`);
    }
  } catch (error) {
    if (requestId === playbackRequest) {
      setStatus("Channel ready. Press Play on the video.");
    }
  }
}

function playChannel(url, channelName) {
  const requestId = ++playbackRequest;
  resetPlayback();

  // Highlight active card
  document.querySelectorAll(".card").forEach(c => c.classList.remove("playing"));
  const activeCard = document.querySelector(`.card[data-url="${CSS.escape(url)}"]`);
  if (activeCard) activeCard.classList.add("playing");

  setStatus(`Loading: ${channelName}...`);

  if (window.Hls && Hls.isSupported()) {
    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      maxBufferLength: 18,
      maxMaxBufferLength: 35,
      maxBufferSize: 25 * 1000 * 1000,
      maxBufferHole: 0.4,
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 6,
      liveDurationInfinity: true,
      startLevel: -1,
      abrEwmaDefaultEstimate: 500000,
      manifestLoadingTimeOut: 12000,
      manifestLoadingMaxRetry: 3,
      levelLoadingTimeOut: 12000,
      fragLoadingTimeOut: 15000,
      fragLoadingMaxRetry: 4
    });

    hls.loadSource(url);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      attemptPlayback(channelName, requestId);
    });

    hls.on(Hls.Events.ERROR, function (event, data) {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad();
            setStatus("Network error... retrying", true);
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            setStatus("Media error... retrying", true);
            break;
          default:
            setStatus("Stream failed. Try another channel.", true);
            hls.destroy();
            break;
        }
      }
    });
    return;
  }

  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
    video.addEventListener("loadedmetadata", () => attemptPlayback(channelName, requestId), { once: true });
  }
}

function renderCards(channels, categoryName) {
  cardsContainer.innerHTML = "";
  rowTitle.textContent = categoryName;

  if (!channels.length) {
    cardsContainer.innerHTML = `<div class="empty-msg">No channels found</div>`;
    return;
  }

  channels.forEach((ch, i) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.url = ch.url;

    const poster = document.createElement("div");
    poster.className = "card-poster";
    poster.textContent = emojis[i % emojis.length];

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = ch.name;
    title.title = ch.name;

    card.appendChild(poster);
    card.appendChild(title);

    card.addEventListener("click", () => {
      playChannel(ch.url, ch.name);
    });

    cardsContainer.appendChild(card);
  });
}

async function loadChannels(playlistUrl, categoryName) {
  if (abortController) abortController.abort();
  abortController = new AbortController();

  cardsContainer.innerHTML = `<div class="empty-msg">Loading channels...</div>`;
  setStatus(`${categoryName} loading...`);

  try {
    const response = await fetch(playlistUrl, { signal: abortController.signal });
    if (!response.ok) throw new Error("Failed to load playlist");

    const text = await response.text();
    const channels = parsePlaylist(text);

    // Unique by name
    const seen = new Set();
    const unique = [];
    for (const ch of channels) {
      const key = ch.name.toLowerCase();
      if (!seen.has(key) && ch.url.startsWith("http")) {
        seen.add(key);
        unique.push(ch);
      }
    }
    unique.sort((a, b) => a.name.localeCompare(b.name));

    renderCards(unique, categoryName);
    setStatus(`${unique.length} channels loaded. Click a card to play.`);
  } catch (err) {
    if (err.name !== "AbortError") {
      cardsContainer.innerHTML = `<div class="empty-msg">Failed to load channels</div>`;
      setStatus("Failed to load playlist", true);
      console.error(err);
    }
  }
}

function loadLocalPlaylist(playlistText, categoryName) {
  const channels = parsePlaylist(playlistText);
  const seen = new Set();
  const unique = [];
  for (const ch of channels) {
    const key = ch.name.toLowerCase();
    if (!seen.has(key) && ch.url.startsWith("http")) {
      seen.add(key);
      unique.push(ch);
    }
  }
  unique.sort((a, b) => a.name.localeCompare(b.name));
  renderCards(unique, categoryName);
  setStatus(`${unique.length} channels loaded. Click a card to play.`);
}

function setActiveButton(activeBtn) {
  [btnSport, btnMovie, btnMusic, btnPreach, btnSrilanka, btnAnimal, btnAdult].forEach(btn => {
    if (btn) btn.classList.remove("active");
  });
  if (activeBtn) activeBtn.classList.add("active");
  resetPlayback();
}

// ===== Categories =====

btnSport.addEventListener("click", () => {
  setActiveButton(btnSport);
  loadChannels("https://iptv-org.github.io/iptv/categories/sports.m3u", "⚽ Sports Channels");
});

btnMovie.addEventListener("click", () => {
  setActiveButton(btnMovie);
  loadChannels("https://iptv-org.github.io/iptv/categories/movies.m3u", "🎬 Movies Channels");
});

btnMusic.addEventListener("click", () => {
  setActiveButton(btnMusic);
  loadChannels("https://iptv-org.github.io/iptv/categories/music.m3u", "🎵 Music Channels");
});

btnPreach.addEventListener("click", () => {
  setActiveButton(btnPreach);
  loadChannels("https://iptv-org.github.io/iptv/categories/religious.m3u", "✝️ Preaching Channels");
});

btnSrilanka.addEventListener("click", () => {
  setActiveButton(btnSrilanka);
  loadChannels("https://iptv-org.github.io/iptv/countries/lk.m3u", "🇱🇰 Sri Lanka Channels");
});

btnAnimal.addEventListener("click", () => {
  setActiveButton(btnAnimal);
  loadChannels("https://iptv-org.github.io/iptv/categories/documentary.m3u", "🦁 Animals & Nature");
});

// Unlock 18+
btnUnlock.addEventListener("click", () => {
  const correctPassword = "mylife2026";
  const userPassword = prompt("18+ unlock කරන්න password එක ඇතුළත් කරන්න:");

  if (userPassword === correctPassword) {
    btnAdult.style.display = "inline-flex";
    btnUnlock.style.display = "none";
    setStatus("18+ unlocked ✅");
  } else if (userPassword !== null) {
    setStatus("Password වැරදියි. Access denied.", true);
  }
});

// Adult (after unlock)
btnAdult.addEventListener("click", () => {
  setActiveButton(btnAdult);
  loadLocalPlaylist(adultPlaylist, "🔥 Adult 18+");
});

// Page load → Sports
window.addEventListener("DOMContentLoaded", () => {
  if (btnSport) {
    setActiveButton(btnSport);
    loadChannels("https://iptv-org.github.io/iptv/categories/sports.m3u", "⚽ Sports Channels");
  }
});
