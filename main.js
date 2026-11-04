"use strict";

const video = document.getElementById("video");
const channelSelect = document.getElementById("channelSelect");
const statusText = document.getElementById("status");

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

// ===== Adult channels (embedded - no external file needed) =====
const adultPlaylist = `#EXTM3U
#EXTINF:-1 group-title="Adult",AdultIPTV Live Cams
http://cdn.adultiptv.net/livecams.m3u8
#EXTINF:-1 group-title="Adult",AdultIPTV MILF
http://cdn.adultiptv.net/milf.m3u8
#EXTINF:-1 group-title="Adult",AdultIPTV Big Tits
http://cdn.adultiptv.net/bigtits.m3u8
#EXTINF:-1 group-title="Adult",AdultIPTV Big Ass
http://cdn.adultiptv.net/bigass.m3u8
#EXTINF:-1 group-title="Adult",AdultIPTV Hardcore
http://cdn.adultiptv.net/hardcore.m3u8
#EXTINF:-1 group-title="Adult",AdultIPTV Lesbian
http://cdn.adultiptv.net/lesbian.m3u8
#EXTINF:-1 group-title="Adult",AdultIPTV Asian
http://cdn.adultiptv.net/asian.m3u8
#EXTINF:-1 group-title="Adult",AdultIPTV Latina
http://cdn.adultiptv.net/latina.m3u8
#EXTINF:-1 group-title="Adult",AdultIPTV Blonde
http://cdn.adultiptv.net/blonde.m3u8
#EXTINF:-1 group-title="Adult",AdultIPTV Brunette
http://cdn.adultiptv.net/brunette.m3u8
#EXTINF:-1 group-title="Adult",AdultIPTV Fetish
http://cdn.adultiptv.net/fetish.m3u8
#EXTINF:-1 group-title="Adult",AdultIPTV Pornstar
http://cdn.adultiptv.net/pornstar.m3u8
#EXTINF:-1 group-title="Adult",AdultIPTV POV
http://cdn.adultiptv.net/pov.m3u8
#EXTINF:-1 group-title="Adult",AdultIPTV Threesome
http://cdn.adultiptv.net/threesome.m3u8
#EXTINF:-1 group-title="Adult",AdultIPTV Anal
http://cdn.adultiptv.net/anal.m3u8
#EXTINF:-1 group-title="Adult",AdultIPTV Blowjob
http://cdn.adultiptv.net/blowjob.m3u8
#EXTINF:-1 group-title="Adult",AdultIPTV Interracial
http://cdn.adultiptv.net/interracial.m3u8
#EXTINF:-1 group-title="Adult",AdultIPTV Teen 18+
http://cdn.adultiptv.net/teen.m3u8
#EXTINF:-1 group-title="Adult",AdultIPTV Gay
http://cdn.adultiptv.net/gay.m3u8
#EXTINF:-1 group-title="Adult",AdultIPTV Russian
http://cdn.adultiptv.net/russian.m3u8`;

function setStatus(message, isError = false) {
  statusText.innerHTML = `<span>✦ ${message}</span>`;
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
        channels.push({
          name: currentName,
          url: line
        });
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
      setStatus(`දැන් ධාවනය වෙමින්: ${channelName}`);
    }
  } catch (error) {
    if (requestId === playbackRequest) {
      setStatus("චැනල් එක සූදානම්. Play බොත්තම ඔබන්න.");
    }
  }
}

function playChannel() {
  const videoSrc = channelSelect.value;
  const selectedOption = channelSelect.options[channelSelect.selectedIndex];
  const channelName = selectedOption ? selectedOption.textContent : "Selected channel";
  const requestId = ++playbackRequest;

  resetPlayback();

  if (!videoSrc) {
    setStatus("Play කිරීමට චැනල් එකක් තෝරන්න.");
    return;
  }

  setStatus(`${channelName} පූරණය වෙමින්...`);

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
      abrBandWidthFactor: 0.75,
      abrBandWidthUpFactor: 0.65,
      manifestLoadingTimeOut: 12000,
      manifestLoadingMaxRetry: 3,
      levelLoadingTimeOut: 12000,
      levelLoadingMaxRetry: 3,
      fragLoadingTimeOut: 15000,
      fragLoadingMaxRetry: 4
    });

    hls.loadSource(videoSrc);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      attemptPlayback(channelName, requestId);
    });

    hls.on(Hls.Events.ERROR, function (event, data) {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad();
            setStatus("Network error... නැවත උත්සාහ කරමින්", true);
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            setStatus("Media error... නැවත උත්සාහ කරමින්", true);
            break;
          default:
            setStatus("Stream එක load වුණේ නැහැ. වෙනත් channel එකක් try කරන්න.", true);
            hls.destroy();
            break;
        }
      }
    });

    return;
  }

  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = videoSrc;
    video.addEventListener("loadedmetadata", () => attemptPlayback(channelName, requestId), { once: true });
  }
}

async function loadChannels(playlistUrl, categoryName) {
  if (abortController) abortController.abort();
  abortController = new AbortController();

  channelSelect.disabled = true;
  channelSelect.innerHTML = `<option value="">ලැයිස්තුව ලබාගනිමින්...</option>`;
  setStatus(`${categoryName} ලැයිස්තුව ලබාගනිමින්... කරුණාකර රැඳී සිටින්න.`);

  try {
    const response = await fetch(playlistUrl, { signal: abortController.signal });
    if (!response.ok) throw new Error("Playlist request failed");

    const playlistText = await response.text();
    const channels = parsePlaylist(playlistText);

    if (channels.length === 0) throw new Error("No channels found");

    const fragment = document.createDocumentFragment();
    fragment.appendChild(new Option(`${categoryName} චැනල් එකක් තෝරන්න...`, ""));

    const uniqueChannels = [];
    const seen = new Set();

    for (const ch of channels) {
      const key = ch.name.toLowerCase();
      if (!seen.has(key) && ch.url.startsWith("http")) {
        seen.add(key);
        uniqueChannels.push(ch);
      }
    }

    uniqueChannels.sort((a, b) => a.name.localeCompare(b.name));

    for (const channel of uniqueChannels) {
      fragment.appendChild(new Option(channel.name, channel.url));
    }

    channelSelect.replaceChildren(fragment);
    channelSelect.disabled = false;
    setStatus(`${categoryName} චැනල් ${uniqueChannels.length.toLocaleString()}ක් ලබාගත්තා. චැනල් එකක් තෝරන්න.`);
  } catch (error) {
    if (error.name !== "AbortError") {
      channelSelect.replaceChildren(new Option("ලැයිස්තුව ලබාගත නොහැක", ""));
      setStatus(`${categoryName} ලැයිස්තුව ලබාගැනීමට නොහැක. Link එක පරීක්ෂා කරන්න.`, true);
      console.error(error);
    }
  }
}

// Local / embedded playlist load කරන්න
function loadLocalPlaylist(playlistText, categoryName) {
  channelSelect.disabled = true;
  channelSelect.innerHTML = `<option value="">ලැයිස්තුව ලබාගනිමින්...</option>`;
  setStatus(`${categoryName} ලැයිස්තුව ලබාගනිමින්...`);

  const channels = parsePlaylist(playlistText);

  if (channels.length === 0) {
    channelSelect.replaceChildren(new Option("Channels නැත", ""));
    setStatus("Channels හමු නොවුණා.", true);
    return;
  }

  const fragment = document.createDocumentFragment();
  fragment.appendChild(new Option(`${categoryName} චැනල් එකක් තෝරන්න...`, ""));

  const uniqueChannels = [];
  const seen = new Set();

  for (const ch of channels) {
    const key = ch.name.toLowerCase();
    if (!seen.has(key) && ch.url.startsWith("http")) {
      seen.add(key);
      uniqueChannels.push(ch);
    }
  }

  uniqueChannels.sort((a, b) => a.name.localeCompare(b.name));

  for (const channel of uniqueChannels) {
    fragment.appendChild(new Option(channel.name, channel.url));
  }

  channelSelect.replaceChildren(fragment);
  channelSelect.disabled = false;
  setStatus(`${categoryName} චැනල් ${uniqueChannels.length}ක් ලබාගත්තා. චැනල් එකක් තෝරන්න.`);
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
  loadChannels("https://iptv-org.github.io/iptv/categories/sports.m3u", "Sports ⚽");
});

btnMovie.addEventListener("click", () => {
  setActiveButton(btnMovie);
  loadChannels("https://iptv-org.github.io/iptv/categories/movies.m3u", "Movies 🎬");
});

btnMusic.addEventListener("click", () => {
  setActiveButton(btnMusic);
  loadChannels("https://iptv-org.github.io/iptv/categories/music.m3u", "Music 🎵");
});

btnPreach.addEventListener("click", () => {
  setActiveButton(btnPreach);
  loadChannels("https://iptv-org.github.io/iptv/categories/religious.m3u", "Preaching ✝️");
});

btnSrilanka.addEventListener("click", () => {
  setActiveButton(btnSrilanka);
  loadChannels("https://iptv-org.github.io/iptv/countries/lk.m3u", "Sri Lanka 🇱🇰");
});

btnAnimal.addEventListener("click", () => {
  setActiveButton(btnAnimal);
  loadChannels("https://iptv-org.github.io/iptv/categories/documentary.m3u", "Animals & Nature 🦁");
});

// 7. Adult 18+ (Password Protected + Embedded)
btnAdult.addEventListener("click", () => {
  setActiveButton(btnAdult);

  const correctPassword = "mylife2026";
  const userPassword = prompt("18+ channels බලන්න password එක ඇතුළත් කරන්න:");

  if (userPassword === correctPassword) {
    // Password නිවැරදි → embedded list load කරනවා (file අවශ්‍ය නැහැ)
    loadLocalPlaylist(adultPlaylist, "Adult 18+ 🔥");
  } else if (userPassword !== null) {
    setStatus("Password වැරදියි. Access denied.", true);
    channelSelect.innerHTML = `<option value="">Access Denied</option>`;
    channelSelect.disabled = true;
  } else {
    setStatus("18+ access cancelled.");
  }
});

channelSelect.addEventListener("change", playChannel);

window.addEventListener("DOMContentLoaded", () => {
  if (btnSport) {
    setActiveButton(btnSport);
    loadChannels("https://iptv-org.github.io/iptv/categories/sports.m3u", "Sports ⚽");
  }
});
