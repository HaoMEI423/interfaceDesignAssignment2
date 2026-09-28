//////////
// Cooperative Spatial Synth — Spatial S3
// Gesture-based spatial input: the keyboard controls pitch while
// Player 01 uses a drawn gesture to shape brightness, resonance and modulation.
//////////

const spatialField = document.getElementById("spatial-field");
const gestureCanvas = document.getElementById("gestureCanvas");
const gestureCursor = document.getElementById("gestureCursor");
const gestureLabel = document.getElementById("gestureLabel");
const volumeSlider = document.getElementById("volume-slider");
const volumeFeedback = document.getElementById("volume-feedback");
const waveformInputs = Array.from(document.querySelectorAll(".waveformSelect"));
const waveformFeedback = document.getElementById("waveform-feedback");
const positionFeedback = document.getElementById("position-feedback");
const pitchFeedback = document.getElementById("pitch-feedback");
const timbreFeedback = document.getElementById("timbre-feedback");

const keyboardSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "sine" },
  envelope: { attack: 0.015, decay: 0.15, sustain: 0.55, release: 0.45 }
});

const masterVolume = new Tone.Volume(-8).toDestination();
const filter = new Tone.Filter(5000, "lowpass");
keyboardSynth.connect(filter);
filter.connect(masterVolume);

const gestureState = { x: 0.5, y: 0.5, speed: 0 };
let gestureDrawing = false;
let audioStarted = false;
let lastPoint = null;
let lastTime = 0;
let resetTimer = null;

function clamp(value) { return Math.max(0, Math.min(1, value)); }

async function ensureAudio() {
  if (!audioStarted) {
    await Tone.start();
    audioStarted = true;
  }
}

function setupCanvas() {
  const rect = spatialField.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  gestureCanvas.width = Math.round(rect.width * ratio);
  gestureCanvas.height = Math.round(rect.height * ratio);
  gestureCanvas.style.width = `${rect.width}px`;
  gestureCanvas.style.height = `${rect.height}px`;
  const ctx = gestureCanvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
}

function gesturePoint(event) {
  const rect = spatialField.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width),
    y: clamp((event.clientY - rect.top) / rect.height)
  };
}

function drawSegment(from, to, speed) {
  const rect = spatialField.getBoundingClientRect();
  const ctx = gestureCanvas.getContext("2d");
  const x1 = from.x * rect.width;
  const y1 = from.y * rect.height;
  const x2 = to.x * rect.width;
  const y2 = to.y * rect.height;
  const width = 2 + speed * 7;
  ctx.strokeStyle = speed > 0.45 ? "rgba(112,198,178,.9)" : "rgba(255,180,94,.82)";
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function fadeGestureTrail() {
  const ctx = gestureCanvas.getContext("2d");
  const rect = spatialField.getBoundingClientRect();
  ctx.save();
  ctx.fillStyle = "rgba(16,16,16,.035)";
  ctx.fillRect(0, 0, rect.width, rect.height);
  ctx.restore();
}

function updateGestureSound(point, speed = gestureState.speed) {
  gestureState.x = point.x;
  gestureState.y = point.y;
  gestureState.speed = speed;

  // Horizontal movement controls brightness through filter frequency.
  const filterFrequency = 350 + point.x * 11200;
  // Vertical movement controls resonance rather than pitch.
  const resonance = 0.7 + (1 - point.y) * 13;
  filter.frequency.rampTo(filterFrequency, 0.06);
  filter.Q.rampTo(resonance, 0.06);

  // Faster drawing adds a small detune movement to make gesture speed audible.
  const detuneAmount = (speed - 0.25) * 90;
  keyboardSynth.detune.rampTo(detuneAmount, 0.08);

  const horizontal = point.x < 0.38 ? "Dark" : point.x > 0.62 ? "Bright" : "Balanced";
  const vertical = point.y < 0.38 ? "High resonance" : point.y > 0.62 ? "Low resonance" : "Middle resonance";
  const movement = speed > 0.45 ? "Fast" : speed > 0.12 ? "Moving" : "Slow";

  positionFeedback.textContent = `${horizontal} / ${vertical.replace(" resonance", "")}`;
  pitchFeedback.textContent = `Resonance: ${vertical.replace(" resonance", "")}`;
  timbreFeedback.textContent = `Brightness: ${horizontal}`;
  gestureLabel.textContent = movement.toUpperCase();
  gestureCursor.style.left = `${point.x * 100}%`;
  gestureCursor.style.top = `${point.y * 100}%`;
}

function clearTrailLater() {
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    const ctx = gestureCanvas.getContext("2d");
    const rect = spatialField.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
  }, 1200);
}

function releaseGesture() {
  if (!gestureDrawing) return;
  gestureDrawing = false;
  gestureCursor.classList.remove("active");
  gestureLabel.textContent = "DRAW";
  keyboardSynth.detune.rampTo(0, 0.15);
  clearTrailLater();
}

async function beginGesture(event) {
  event.preventDefault();
  await ensureAudio();
  gestureDrawing = true;
  spatialField.setPointerCapture?.(event.pointerId);
  const point = gesturePoint(event);
  lastPoint = point;
  lastTime = performance.now();
  updateGestureSound(point, 0);
  gestureCursor.classList.add("active");
}

function moveGesture(event) {
  if (!gestureDrawing) return;
  const point = gesturePoint(event);
  const now = performance.now();
  const dt = Math.max(8, now - lastTime);
  const dx = point.x - lastPoint.x;
  const dy = point.y - lastPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const speed = clamp((distance / dt) * 180);
  drawSegment(lastPoint, point, speed);
  updateGestureSound(point, speed);
  lastPoint = point;
  lastTime = now;
}

spatialField.addEventListener("pointerdown", beginGesture);
spatialField.addEventListener("pointermove", moveGesture);
spatialField.addEventListener("pointerup", releaseGesture);
spatialField.addEventListener("pointercancel", releaseGesture);
window.addEventListener("pointerup", releaseGesture);

setInterval(() => {
  if (!gestureDrawing) fadeGestureTrail();
}, 80);

volumeSlider.addEventListener("input", event => {
  const value = Number(event.target.value);
  masterVolume.volume.rampTo(value, 0.05);
  volumeFeedback.textContent = `${value} dB`;
});

function setWaveform(type) {
  keyboardSynth.set({ oscillator: { type } });
  waveformFeedback.textContent = type === "sawtooth" ? "Saw" : type[0].toUpperCase() + type.slice(1);
}
waveformInputs.forEach(input => input.addEventListener("change", event => setWaveform(event.target.value)));

setupCanvas();
window.addEventListener("resize", setupCanvas);
updateGestureSound({ x: 0.5, y: 0.5 }, 0);

const introDialog = document.getElementById("intro-dialog");
const introClose = document.getElementById("intro-dialog-close-button");
const infoDialog = document.getElementById("info-dialog");
const infoButton = document.getElementById("info-button");
const infoClose = document.getElementById("info-dialog-close-button");
introDialog.showModal();
introClose.addEventListener("click", async () => { await ensureAudio(); introDialog.close(); });
infoButton.addEventListener("click", () => infoDialog.showModal());
infoClose.addEventListener("click", () => infoDialog.close());
