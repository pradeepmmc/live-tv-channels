"use strict";

const video = document.getElementById("video");
const channelSelect = document.getElementById("channelSelect");
const statusText = document.getElementById("status");

let hls = null;
let playbackRequest = 0;
let abortController = null;

// බොත්තම් හඳුනාගැනීම
const btnSport = document.getElementById("btn-sport");
const btnMovie = document.getElementById("btn-movie");
const btnMusic = document.getElementById("btn-music");

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
      currentName = line.slice(line.lastIndexOf(",") + 1).trim();
      continue;
    }
    if (/^https?:\/\//i.test(line)) {
      channels.push({ name: currentName || "Unknown Channel", url: line });
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
    if (requestId === playbackRequest) setStatus(`දැන් ධාවනය වෙමින්: ${channelName}`);
  } catch (error) {
    if (requestId === playbackRequest) setStatus("චැනල් එක සූදානම්. Play බොත්තම ඔබන්න.");
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
    hls = new Hls({ enableWorker: true, backBufferLength: 30 });
    hls.on(Hls.Events.MANIFEST_PARSED, () => attemptPlayback(channelName, requestId));
    hls.loadSource(videoSrc);
    hls.attachMedia(video);
    return;
  }
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = videoSrc;
    video.addEventListener("loadedmetadata", () => attemptPlayback(channelName, requestId), { once: true });
    return;
  }
}

async function loadChannels(playlistUrl, categoryName) {
  if (abortController) abortController.abort(); // කලින් load වෙන එකක් තියෙනම් නවත්වන්න
  abortController = new AbortController();
  
  channelSelect.disabled = true;
  channelSelect.innerHTML = '<option value="">ලැයිස්තුව ලබාගනිමින්...</option>';
  setStatus(`${categoryName} ලැයිස්තුව ලබාගනිමින්... කරුණාකර රැඳී සිටින්න.`);

  try {
    // අදාළ m3u ෆයිල් එක load කිරීම
    const response = await fetch(playlistUrl, { signal: abortController.signal });
    if (!response.ok) throw new Error("Playlist request failed");

    const playlistText = await response.text();
    const channels = parsePlaylist(playlistText);

    if (channels.length === 0) throw new Error("No channels found");

    const fragment = document.createDocumentFragment();
    fragment.appendChild(new Option(`${categoryName} චැනල් එකක් තෝරන්න...`, ""));
    for (const channel of channels) {
      fragment.appendChild(new Option(channel.name, channel.url));
    }
    
    channelSelect.replaceChildren(fragment);
    channelSelect.disabled = false;
    setStatus(`${categoryName} චැනල් ${channels.length.toLocaleString()}ක් ලබාගත්තා. චැනල් එකක් තෝරන්න.`);
  } catch (error) {
    if (error.name !== "AbortError") {
      channelSelect.replaceChildren(new Option("ලැයිස්තුව ලබාගත නොහැක", ""));
      setStatus(`${categoryName} ලැයිස්තුව ලබාගැනීමට නොහැක.`, true);
    }
  }
}

// බොත්තම් වලට ක්‍රියාකාරීත්වය එකතු කිරීම
function setActiveButton(activeBtn) {
  [btnSport, btnMovie, btnMusic].forEach(btn => btn.classList.remove("active"));
  activeBtn.classList.add("active");
  resetPlayback(); // අලුත් කැටගරි එකක් තෝරනකොට ප්ලේ වෙන වීඩියෝව නවත්වන්න
}

btnSport.addEventListener("click", () => {
  setActiveButton(btnSport);
  loadChannels("sport.m3u", "Sports ⚽");
});

btnMovie.addEventListener("click", () => {
  setActiveButton(btnMovie);
  loadChannels("movie.m3u", "Movies 🎬");
});

btnMusic.addEventListener("click", () => {
  setActiveButton(btnMusic);
  loadChannels("music.m3u", "Music 🎵");
});

channelSelect.addEventListener("change", playChannel);
