import { chain } from "https://cdn.jsdelivr.net/npm/@shlappas/itertools@2.1.1/dist/index.esm.js";

const video = document.getElementById("video");
const videoControls = document.getElementById("video-controls");
const playButton = document.getElementById("play");
const playbackIcons = document.querySelectorAll(".playback-icons use");
const capture = document.getElementById("toggle-camera");
const captureIcons = document.querySelectorAll(".toggle-camera-icons use");
const lock = document.getElementById("toggle-lock");
const lockIcons = document.querySelectorAll(".toggle-lock-icons use");
const timeElapsed = document.getElementById("time-elapsed");
const duration = document.getElementById("duration");
const progressBar = document.getElementById("progress-bar");
const seek = document.getElementById("seek");
const seekTooltip = document.getElementById("seek-tooltip");
const volumeButton = document.getElementById("volume-button");
const volumeIcons = document.querySelectorAll(".volume-button use");
const volumeMute = document.querySelector('use[href="#volume-mute"]');
const volumeLow = document.querySelector('use[href="#volume-low"]');
const volumeHigh = document.querySelector('use[href="#volume-high"]');
const volume = document.getElementById("volume");
const playbackAnimation = document.getElementById("playback-animation");
const fullscreenButton = document.getElementById("fullscreen-button");
const videoContainer = document.getElementById("video-container");
const fullscreenIcons = fullscreenButton.querySelectorAll("use");
const pipButton = document.getElementById("pip-button");
const cameraElement = document.getElementById("input_camera");
const toggleControl = document.getElementById("toggle-control");
const toggleIcons = document.querySelectorAll(".toggle-icons use");
const canvasElement = document.createElement("canvas");
const canvasCtx = canvasElement.getContext("2d");
const playbackSlider = document.getElementById("playbackRate");
const playbackContent = document.getElementById("playbackContent");
const playbackText = document.getElementById("playbackText");

const mytap = window.ontouchstart === null ? "touchstart" : "click";
const iOS = !window.MSStream && /iPad|iPhone|iPod/.test(navigator.userAgent);
var firstPlay = true;
var cancelControl = true;
var onCamera = false;
var isLocked = false;
var defaultRate = 1;
var isPaused = null;
var x = null,
  y = null;
var draw = false;
const LEFT_EYE_INDEXES = Array.from(new Set(chain(...FACEMESH_LEFT_EYE)));
const RIGHT_EYE_INDEXES = Array.from(new Set(chain(...FACEMESH_RIGHT_EYE)));
const FACE_OVAL_INDEXES = Array.from(new Set(chain(...FACEMESH_FACE_OVAL)));
const LIPS_INDEXES = Array.from(new Set(chain(...FACEMESH_LIPS)));
const browser = (function () {
  let userAgent = navigator.userAgent;
  let browserName;

  if (userAgent.match(/chrome|chromium|crios/i)) {
    browserName = "chrome";
  } else if (userAgent.match(/firefox|fxios/i)) {
    browserName = "firefox";
  } else if (userAgent.match(/safari/i)) {
    browserName = "safari";
  } else if (userAgent.match(/opr\//i)) {
    browserName = "opera";
  } else if (userAgent.match(/edg/i)) {
    browserName = "edge";
  } else {
    browserName = "No browser detection";
  }
  return browserName;
})();

const config = {
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
  },
};
const faceMesh = new FaceMesh(config);
const solutionOptions = {
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
};
faceMesh.setOptions(solutionOptions);

cameraElement.setAttribute("playsinline", true);
const camera = new Camera(cameraElement, {
  onFrame: async () => {
    await faceMesh.send({ image: cameraElement });
  },
  // width: 1280,
  // height: 720,
});
// camera.start();
// cameraElement.style.display = "inline";

const videoWorks = !!document.createElement("video").canPlayType;
if (videoWorks && !iOS) {
  video.controls = false;
  videoControls.classList.remove("hidden");
}

// Add functions here

// togglePlay toggles the playback state of the video.
// If the video playback is paused or ended, the video is played
// otherwise, the video is paused
function togglePlay() {
  if (firstPlay && iOS) {
    video.play();
    video.controls = false;
    videoControls.classList.remove("hidden");
    firstPlay = false;
  } else {
    if (video.paused || video.ended) {
      isPaused = false;
      video.play();
    } else {
      isPaused = true;
      video.pause();
    }
  }
}

// updatePlayButton updates the playback icon and tooltip
// depending on the playback state
function updatePlayButton() {
  playbackIcons.forEach((icon) => icon.classList.toggle("hidden"));

  if (video.paused) {
    playButton.setAttribute("data-title", "Play (k)");
  } else {
    playButton.setAttribute("data-title", "Pause (k)");
  }
}

function toggleLock() {
  lockIcons.forEach((icon) => icon.classList.toggle("hidden"));
  isLocked = !isLocked;
  if (isLocked) lock.setAttribute("data-title", "Unlock");
  else lock.setAttribute("data-title", "Lock");
}

function toggleCapture() {
  if (!cancelControl) {
    captureIcons.forEach((icon) => icon.classList.toggle("hidden"));
    onCamera = !onCamera;
    if (onCamera) {
      capture.setAttribute("data-title", "Hide Camera");
      cameraElement.style.display = "inline";
    } else {
      capture.setAttribute("data-title", "Show Camera");
      cameraElement.style.display = "none";
    }
  } else {
    capture.disabled = true;
    toastr.error("You must turn on controlling first!");
  }
}

async function updateToggleControl() {
  cancelControl = !cancelControl;
  if (cancelControl) {
    toggleControl.setAttribute("data-title", "Control video");
    toggleControl.disabled = true;
    capture.disabled = true;
    faceMesh.onResults();
    await camera.stop();
    captureIcons.forEach((icon) => icon.classList.toggle("hidden"));
    onCamera = false;
    toggleControl.disabled = false;
    capture.disabled = false;
    toastr.warning("Control off!");
  } else {
    toggleControl.setAttribute("data-title", "Cancel control");
    toggleControl.disabled = true;
    capture.disabled = true;
    await camera.start();
    captureIcons.forEach((icon) => icon.classList.toggle("hidden"));
    onCamera = true;
    toggleControl.disabled = false;
    capture.disabled = false;
    toastr.success("Video can be controlled!");
    isPaused = false;
    faceMesh.onResults(findFaceMesh);
  }
  if (onCamera) {
    capture.setAttribute("data-title", "Hide Camera");
    cameraElement.style.display = "inline";
  } else {
    capture.setAttribute("data-title", "Show Camera");
    cameraElement.style.display = "none";
  }
  toggleIcons.forEach((icon) => icon.classList.toggle("hidden"));
}

// formatTime takes a time length in seconds and returns the time in
// minutes and seconds
function formatTime(timeInSeconds) {
  const result = new Date(timeInSeconds * 1000).toISOString().substr(11, 8);

  return {
    minutes: result.substr(3, 2),
    seconds: result.substr(6, 2),
  };
}

// initializeVideo sets the video duration, and maximum value of the
// progressBar
function initializeVideo() {
  const videoDuration = Math.round(video.duration);
  seek.setAttribute("max", videoDuration);
  progressBar.setAttribute("max", videoDuration);
  const time = formatTime(videoDuration);
  duration.innerText = `${time.minutes}:${time.seconds}`;
  duration.setAttribute("datetime", `${time.minutes}m ${time.seconds}s`);
  if (browser == "safari") {
    video.muted = true;
    volume.value = 0;
    volumeIcons[0].classList.remove("hidden");
    volumeIcons[2].classList.add("hidden");
  }
  if (iOS) volume.style.display = "none";
  updateToggleControl();
}

// updateTimeElapsed indicates how far through the video
// the current playback is by updating the timeElapsed element
function updateTimeElapsed() {
  const time = formatTime(Math.round(video.currentTime));
  timeElapsed.innerText = `${time.minutes}:${time.seconds}`;
  timeElapsed.setAttribute("datetime", `${time.minutes}m ${time.seconds}s`);
}

// updateProgress indicates how far through the video
// the current playback is by updating the progress bar
function updateProgress() {
  seek.value = Math.floor(video.currentTime);
  progressBar.value = Math.floor(video.currentTime);
}

// updateSeekTooltip uses the position of the mouse on the progress bar to
// roughly work out what point in the video the user will skip to if
// the progress bar is clicked at that point
function updateSeekTooltip(event) {
  var skipTo = Math.round(
    (event.offsetX / event.target.clientWidth) *
      parseInt(event.target.getAttribute("max"), 10)
  );
  if (skipTo < 0) skipTo = 0;
  if (skipTo > video.duration) skipTo = Math.round(video.duration);
  seek.setAttribute("data-seek", skipTo);
  const t = formatTime(skipTo);
  seekTooltip.textContent = `${t.minutes}:${t.seconds}`;
  const rect = video.getBoundingClientRect();
  seekTooltip.style.left = `${event.pageX - rect.left}px`;
}

// skipAhead jumps to a different point in the video when the progress bar
// is clicked
function skipAhead(event) {
  const skipTo = event.target.dataset.seek
    ? event.target.dataset.seek
    : event.target.value;
  video.currentTime = skipTo;
  progressBar.value = skipTo;
  seek.value = skipTo;
  if (video.currentTime == video.duration) {
    video.play();
  }
}

// updateVolume updates the video's volume
// and disables the muted state if active
function updateVolume() {
  if (video.muted) {
    video.muted = false;
  }

  video.volume = volume.value;
}

// updateVolumeIcon updates the volume icon so that it correctly reflects
// the volume of the video
function updateVolumeIcon() {
  volumeIcons.forEach((icon) => {
    icon.classList.add("hidden");
  });

  volumeButton.setAttribute("data-title", "Mute (m)");

  if (video.muted || video.volume === 0) {
    volumeMute.classList.remove("hidden");
    volumeButton.setAttribute("data-title", "Unmute (m)");
  } else if (video.volume > 0 && video.volume <= 0.5) {
    volumeLow.classList.remove("hidden");
  } else {
    volumeHigh.classList.remove("hidden");
  }
}

// toggleMute mutes or unmutes the video when executed
// When the video is unmuted, the volume is returned to the value
// it was set to before the video was muted
function toggleMute() {
  video.muted = !video.muted;

  if (video.muted) {
    volume.setAttribute("data-volume", volume.value);
    volume.value = 0;
  } else {
    volume.value = volume.dataset.volume;
  }
  video.volume = volume.value;
}

// animatePlayback displays an animation when
// the video is played or paused
function animatePlayback() {
  playbackAnimation.animate(
    [
      {
        opacity: 1,
        transform: "scale(1)",
      },
      {
        opacity: 0,
        transform: "scale(1.3)",
      },
    ],
    {
      duration: 500,
    }
  );
}

// toggleFullScreen toggles the full screen state of the video
// If the browser is currently in fullscreen mode,
// then it should exit and vice versa.
function toggleFullScreen() {
  if (iOS) {
    video.webkitEnterFullscreen();
    video.enterFullscreen();
  }
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else if (document.webkitFullscreenElement) {
    // Need this to support Safari
    document.webkitExitFullscreen();
  } else if (videoContainer.webkitRequestFullscreen) {
    // Need this to support Safari
    videoContainer.webkitRequestFullscreen();
  } else {
    videoContainer.requestFullscreen();
  }
}

// updateFullscreenButton changes the icon of the full screen button
// and tooltip to reflect the current full screen state of the video
function updateFullscreenButton() {
  fullscreenIcons.forEach((icon) => icon.classList.toggle("hidden"));

  if (document.fullscreenElement) {
    fullscreenButton.setAttribute("data-title", "Exit full screen (f)");
  } else {
    fullscreenButton.setAttribute("data-title", "Full screen (f)");
  }
}

// togglePip toggles Picture-in-Picture mode on the video
async function togglePip() {
  try {
    if (video !== document.pictureInPictureElement) {
      pipButton.disabled = true;
      await video.requestPictureInPicture();
    } else {
      await document.exitPictureInPicture();
    }
  } catch (error) {
    console.error(error);
  } finally {
    pipButton.disabled = false;
  }
}

// hideControls hides the video controls when not in use
// if the video is paused, the controls must remain visible
function hideControls() {
  if (video.paused) {
    return;
  }

  videoControls.classList.add("hide");
}

// showControls displays the video controls
function showControls() {
  videoControls.classList.remove("hide");
}

// keyboardShortcuts executes the relevant functions for
// each supported shortcut key
function keyboardShortcuts(event) {
  const { key } = event;
  switch (key) {
    case "k":
      togglePlay();
      animatePlayback();
      if (video.paused) {
        showControls();
      } else {
        setTimeout(() => {
          hideControls();
        }, 2000);
      }
      break;
    case "m":
      toggleMute();
      break;
    case "f":
      toggleFullScreen();
      break;
    case "p":
      togglePip();
      break;
  }
}

function findFaceMesh(results) {
  canvasElement.width = camera.h.width;
  canvasElement.height = camera.h.height;
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(
    results.image,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );

  let le = 0,
    lex = 0,
    ley = 0,
    re = 0,
    rex = 0,
    rey = 0,
    lf = 0,
    lfx = 0,
    lfy = 0,
    rf = 0,
    rfx = 0,
    rfy = 0,
    lpx = 0,
    lpy = 0,
    fdx = 0,
    fdy = 0;
  let faces = [];

  if (results.multiFaceLandmarks) {
    for (const landmarks of results.multiFaceLandmarks) {
      if (draw == true) {
        drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {
          color: "#C0C0C070",
          lineWidth: 1,
        });
      }
      let l = {};
      for (let index of LEFT_EYE_INDEXES) {
        x = parseInt(landmarks[index].x * camera.h.width);
        y = parseInt(landmarks[index].y * camera.h.height);
        if (index == 263) {
          l[index] = [x, y];
          le = x;
          lex = x;
          ley = y;
        }
      }
      let r = {};
      for (let index of RIGHT_EYE_INDEXES) {
        x = parseInt(landmarks[index].x * camera.h.width);
        y = parseInt(landmarks[index].y * camera.h.height);
        if (index == 33) {
          r[index] = [x, y];
          re = x;
          rex = x;
          rey = y;
        }
      }
      let d = {};
      for (let index of FACE_OVAL_INDEXES) {
        x = parseInt(landmarks[index].x * camera.h.width);
        y = parseInt(landmarks[index].y * camera.h.height);
        d[index] = [x, y];
        if (index == 127) {
          lf = x;
          lfx = x;
          lfy = y;
        }
        if (index == 356) {
          rf = x;
          rfx = x;
          rfy = y;
        }
        if (index == 152) {
          fdy = y;
        }
      }
      let lp = {};
      for (let index of LIPS_INDEXES) {
        x = parseInt(landmarks[index].x * camera.h.width);
        y = parseInt(landmarks[index].y * camera.h.height);
        lp[index] = [x, y];
        if (index == 14) {
          lpy = y;
        }
      }

      let face = [];
      for (let lm of landmarks) {
        (x = parseInt(lm.x * camera.h.width)),
          (y = parseInt(lm.y * camera.h.height));
        face.push([x, y]);
      }
      faces.push(face);
    }
  }

  if (faces.length != 0) {
    if (lfy - ley > 15 && rfy - rey > 15 && !iOS) {
      if (video.playbackRate < 2) {
        if (!isLocked) defaultRate += 0.01;
      }
    } else if (lfy - ley > 10 && rfy - rey > 10 && iOS) {
      if (video.playbackRate < 2) {
        if (!isLocked) defaultRate += 0.01;
      }
    } else if (lfy - ley < -1 && rfy - rey < -1) {
      if (video.playbackRate > 0.25) {
        if (!isLocked) defaultRate -= 0.01;
      }
    } else if (re - lf < 10) {
      if (video.currentTime < video.duration) video.currentTime += 0.5;
    } else if (rf - le < 10) {
      if (video.currentTime > 0) video.currentTime -= 0.5;
    } else {
      if (!isLocked) defaultRate = 1;
      if (isPaused == false) video.play();
    }
    defaultRate = Number(defaultRate.toFixed(2));
    if (defaultRate < 0.2) defaultRate = 0.2;
    if (defaultRate > 2) defaultRate = 2;
    if ([0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2].includes(defaultRate)) {
      video.playbackRate = defaultRate;
      playbackSlider.value = defaultRate * 100;
      playbackContent.setAttribute(
        "data-title",
        "Playback rate: " + defaultRate
      );
    }
  } else {
    video.pause();
  }

  if (video.playbackRate != 1)
    playbackText.innerHTML = "Playback Rate: " + video.playbackRate;
  else playbackText.innerHTML = "";

  canvasCtx.restore();
}

if (video.readyState > 0) {
  initializeVideo();
}

// Add eventlisteners here
playButton.addEventListener(mytap, togglePlay);
toggleControl.addEventListener(mytap, updateToggleControl);
capture.addEventListener(mytap, toggleCapture);
lock.addEventListener(mytap, toggleLock);
video.addEventListener("play", updatePlayButton);
video.addEventListener("pause", updatePlayButton);
video.addEventListener("loadedmetadata", initializeVideo);
video.addEventListener("timeupdate", updateTimeElapsed);
video.addEventListener("timeupdate", updateProgress);
video.addEventListener("volumechange", updateVolumeIcon);
video.addEventListener(mytap, togglePlay);
video.addEventListener(mytap, animatePlayback);
video.addEventListener("mouseenter", showControls);
video.addEventListener("mouseleave", hideControls);
videoControls.addEventListener("mouseenter", showControls);
videoControls.addEventListener("mouseleave", hideControls);
seek.addEventListener("mousemove", updateSeekTooltip);
seek.addEventListener("input", skipAhead);
volume.addEventListener("input", updateVolume);
volumeButton.addEventListener(mytap, toggleMute);
fullscreenButton.addEventListener(mytap, toggleFullScreen);
videoContainer.addEventListener("fullscreenchange", updateFullscreenButton);
pipButton.addEventListener(mytap, togglePip);

document.addEventListener("DOMContentLoaded", () => {
  if (!("pictureInPictureEnabled" in document)) {
    pipButton.classList.add("hidden");
  }
});
document.addEventListener("keyup", keyboardShortcuts);

playbackSlider.addEventListener("input", (e) => {
  defaultRate = parseInt(e.target.value, 10) / 100;
  video.playbackRate = defaultRate;
  playbackContent.setAttribute(
    "data-title",
    "Playback rate: " + video.playbackRate
  );
  if (video.playbackRate != 1)
    playbackText.innerHTML = "Playback Rate: " + video.playbackRate;
  else playbackText.innerHTML = "";
});
