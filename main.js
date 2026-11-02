"use strict";

const PLAYLIST_URL = "https://iptv-org.github.io/iptv/index.m3u";

const video = document.getElementById("video");
const channelSelect = document.getElementById("channelSelect");
const statusText = document.getElementById("status");

let hls = null;
let playbackRequest = 0;

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

    // Public HTTPS pages cannot play insecure HTTP streams because browsers
    // block them as mixed content, so only HTTPS stream URLs are listed.
    if (/^https:\/\//i.test(line)) {
      channels.push({
        name: currentName || "Unknown Channel",
        url: line
      });
      currentName = "";
    } else if (/^http:\/\//i.test(line)) {
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
      setStatus("චැනල් එක සූදානම්. Browser autoplay සීමාව නිසා video එකේ Play බොත්තම ඔබන්න.");
    }
  }
}

function handleFatalHlsError(errorData, requestId) {
  if (requestId !== playbackRequest) return;

  const isNetworkError = errorData.type === Hls.ErrorTypes.NETWORK_ERROR;
  const message = isNetworkError
    ? "මෙම චැනල් එකට සම්බන්ධ විය නොහැක. Stream එක offline වී ඇති හෝ CORS මගින් block වී ඇති විය හැක. වෙනත් චැනල් එකක් තෝරන්න."
    : "මෙම video stream එක play කිරීමට නොහැක. වෙනත් චැනල් එකක් තෝරන්න.";

  setStatus(message, true);

  if (hls) {
    hls.destroy();
    hls = null;
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
      backBufferLength: 30
    });

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (requestId === playbackRequest) {
        attemptPlayback(channelName, requestId);
      }
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        handleFatalHlsError(data, requestId);
      }
    });

    hls.loadSource(videoSrc);
    hls.attachMedia(video);
    return;
  }

  // Safari and other browsers with built-in HLS support.
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = videoSrc;
    video.addEventListener("loadedmetadata", () => {
      if (requestId === playbackRequest) {
        attemptPlayback(channelName, requestId);
      }
    }, { once: true });
    return;
  }

  setStatus("මෙම browser එකට HLS playback සහාය නොදක්වයි. නවීන Chrome, Firefox හෝ Safari භාවිතා කරන්න.", true);
}

async function loadChannels() {
  channelSelect.disabled = true;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(PLAYLIST_URL, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Playlist request failed with HTTP ${response.status}`);
    }

    const playlistText = await response.text();
    const channels = parsePlaylist(playlistText);

    if (channels.length === 0) {
      throw new Error("No HTTPS channels found in the playlist");
    }

    const fragment = document.createDocumentFragment();
    fragment.appendChild(new Option("කැමති චැනල් එකක් තෝරන්න...", ""));

    for (const channel of channels) {
      fragment.appendChild(new Option(channel.name, channel.url));
    }

    channelSelect.replaceChildren(fragment);
    channelSelect.disabled = false;
    setStatus(`HTTPS චැනල් ${channels.length.toLocaleString()}ක් ලබාගත්තා. Play කිරීමට චැනල් එකක් තෝරන්න.`);
  } catch (error) {
    console.error("Unable to load channel playlist:", error);
    channelSelect.replaceChildren(new Option("චැනල් ලැයිස්තුව ලබාගත නොහැක", ""));
    const message = error.name === "AbortError"
      ? "චැනල් ලැයිස්තුව ලැබීමට වැඩි කාලයක් ගතවුණා. Internet සම්බන්ධතාවය පරීක්ෂා කර පිටුව reload කරන්න."
      : "චැනල් ලැයිස්තුව ලබාගැනීමට නොහැක. Internet සම්බන්ධතාවය පරීක්ෂා කර පිටුව reload කරන්න.";
    setStatus(message, true);
  } finally {
    clearTimeout(timeoutId);
  }
}

channelSelect.addEventListener("change", playChannel);

video.addEventListener("error", () => {
  if (video.currentSrc) {
    setStatus("Video stream එක load කිරීමට නොහැක. චැනල් එක offline වී ඇති විය හැක; වෙනත් චැනල් එකක් තෝරන්න.", true);
  }
});

window.addEventListener("beforeunload", () => {
  if (hls) hls.destroy();
});

loadChannels();
