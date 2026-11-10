"use strict";

const video = document.getElementById("video");
const statusText = document.getElementById("status");
const cardsContainer = document.getElementById("cards");
const rowTitle = document.getElementById("rowTitle");

let hls = null;
let playbackRequest = 0;
let abortController = null;

const btnSport    = document.getElementById("btn-sport");
const btnMovie    = document.getElementById("btn-movie");
const btnMusic    = document.getElementById("btn-music");
const btnPreach   = document.getElementById("btn-preach");
const btnSrilanka = document.getElementById("btn-srilanka");
const btnAnimal   = document.getElementById("btn-animal");
const btnAdult    = document.getElementById("btn-adult");
const btnUnlock   = document.getElementById("btn-unlock");

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
  if (!statusText) return;
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
      if (currentName) channels.push({ name: currentName, url: line });
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
  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}

async function attemptPlayback(channelName, requestId) {
  try {
    await video.play();
    if (requestId === playbackRequest) setStatus("▶ Now Playing: " + channelName);
  } catch (e) {
    if (requestId === playbackRequest) setStatus("Channel ready. Press Play on the video.");
  }
}

function playChannel(url, channelName) {
  const requestId = ++playbackRequest;
  resetPlayback();

  document.querySelectorAll(".card").forEach(c => c.classList.remove("playing"));
  const activeCard = document.querySelector('.card[data-url="' + url.replace(/"/g, '\\"') + '"]');
  if (activeCard) activeCard.classList.add("playing");

  setStatus("Loading: " + channelName + "...");

  if (window.Hls && Hls.isSupported()) {
    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      maxBufferLength: 18,
      maxMaxBufferLength: 35,
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 6,
      startLevel: -1
    });

    hls.loadSource(url);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, function () {
      attemptPlayback(channelName, requestId);
    });

    hls.on(Hls.Events.ERROR, function (event, data) {
      if (data.fatal) {
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
          setStatus("Network error... retrying", true);
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
          setStatus("Media error... retrying", true);
        } else {
          setStatus("Stream failed. Try another channel.", true);
          hls.destroy();
        }
      }
    });
    return;
  }

  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
    video.addEventListener("loadedmetadata", function () {
      attemptPlayback(channelName, requestId);
    }, { once: true });
  } else {
    setStatus("HLS not supported in this browser", true);
  }
}

function renderCards(channels, categoryName) {
  if (!cardsContainer) return;
  cardsContainer.innerHTML = "";
  if (rowTitle) rowTitle.textContent = categoryName;

  if (!channels.length) {
    cardsContainer.innerHTML = '<div class="empty-msg">No channels found</div>';
    return;
  }

  channels.forEach(function (ch, i) {
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-url", ch.url);

    const poster = document.createElement("div");
    poster.className = "card-poster";
    poster.textContent = emojis[i % emojis.length];

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = ch.name;
    title.title = ch.name;

    card.appendChild(poster);
    card.appendChild(title);

    card.addEventListener("click", function () {
      playChannel(ch.url, ch.name);
    });

    cardsContainer.appendChild(card);
  });
}

function uniqueChannels(channels) {
  const seen = new Set();
  const unique = [];
  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i];
    const key = ch.name.toLowerCase();
    if (!seen.has(key) && ch.url.indexOf("http") === 0) {
      seen.add(key);
      unique.push(ch);
    }
  }
  unique.sort(function (a, b) { return a.name.localeCompare(b.name); });
  return unique;
}

async function loadChannels(playlistUrl, categoryName) {
  if (abortController) abortController.abort();
  abortController = new AbortController();

  if (cardsContainer) cardsContainer.innerHTML = '<div class="empty-msg">Loading channels...</div>';
  setStatus(categoryName + " loading...");

  try {
    const response = await fetch(playlistUrl, { signal: abortController.signal });
    if (!response.ok) throw new Error("Failed");
    const text = await response.text();
    const channels = uniqueChannels(parsePlaylist(text));
    renderCards(channels, categoryName);
    setStatus(channels.length + " channels loaded. Click a card to play.");
  } catch (err) {
    if (err.name !== "AbortError") {
      if (cardsContainer) cardsContainer.innerHTML = '<div class="empty-msg">Failed to load channels</div>';
      setStatus("Failed to load playlist. Open via http:// (not file://)", true);
      console.error(err);
    }
  }
}

function loadLocalPlaylist(playlistText, categoryName) {
  const channels = uniqueChannels(parsePlaylist(playlistText));
  renderCards(channels, categoryName);
  setStatus(channels.length + " channels loaded. Click a card to play.");
}

function setActiveButton(activeBtn) {
  [btnSport, btnMovie, btnMusic, btnPreach, btnSrilanka, btnAnimal, btnAdult].forEach(function (btn) {
    if (btn) btn.classList.remove("active");
  });
  if (activeBtn) activeBtn.classList.add("active");
  resetPlayback();
}

if (btnSport) btnSport.addEventListener("click", function () {
  setActiveButton(btnSport);
  loadChannels("https://iptv-org.github.io/iptv/categories/sports.m3u", "⚽ Sports Channels");
});

if (btnMovie) btnMovie.addEventListener("click", function () {
  setActiveButton(btnMovie);
  loadChannels("https://iptv-org.github.io/iptv/categories/movies.m3u", "🎬 Movies Channels");
});

if (btnMusic) btnMusic.addEventListener("click", function () {
  setActiveButton(btnMusic);
  loadChannels("https://iptv-org.github.io/iptv/categories/music.m3u", "🎵 Music Channels");
});

if (btnPreach) btnPreach.addEventListener("click", function () {
  setActiveButton(btnPreach);
  loadChannels("https://iptv-org.github.io/iptv/categories/religious.m3u", "✝️ Preaching Channels");
});

if (btnSrilanka) btnSrilanka.addEventListener("click", function () {
  setActiveButton(btnSrilanka);
  loadChannels("https://iptv-org.github.io/iptv/countries/lk.m3u", "🇱🇰 Sri Lanka Channels");
});

if (btnAnimal) btnAnimal.addEventListener("click", function () {
  setActiveButton(btnAnimal);
  loadChannels("https://iptv-org.github.io/iptv/categories/documentary.m3u", "🦁 Animals & Nature");
});

if (btnUnlock) btnUnlock.addEventListener("click", function () {
  const pw = prompt("18+ unlock කරන්න password එක ඇතුළත් කරන්න:");
  if (pw === "mylife2026") {
    if (btnAdult) btnAdult.style.display = "inline-flex";
    btnUnlock.style.display = "none";
    setStatus("18+ unlocked ✅");
  } else if (pw !== null) {
    setStatus("Password වැරදියි. Access denied.", true);
  }
});

if (btnAdult) btnAdult.addEventListener("click", function () {
  setActiveButton(btnAdult);
  loadLocalPlaylist(adultPlaylist, "🔥 Adult 18+");
});

window.addEventListener("DOMContentLoaded", function () {
  if (btnSport) {
    setActiveButton(btnSport);
    loadChannels("https://iptv-org.github.io/iptv/categories/sports.m3u", "⚽ Sports Channels");
  }
});
