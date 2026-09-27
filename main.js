//////////
// Cooperative Spatial Synth — prototype
// Shared audio engine: spatial input + volume + waveform + keyboard
//////////

const spatialBall = document.getElementById("spatialBall");
const spatialField = document.getElementById("spatial-field");
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

const spatialSynth = new Tone.Synth({
  oscillator: { type: "sine" },
  envelope: { attack: 0.03, decay: 0.12, sustain: 0.7, release: 0.35 }
});

const masterVolume = new Tone.Volume(-8).toDestination();
const filter = new Tone.Filter(5000, "lowpass");
spatialSynth.connect(filter);
keyboardSynth.connect(filter);
filter.connect(masterVolume);

const spatialState = { x: 0.72, y: 0.28 };
let spatialDragging = false;
let audioStarted = false;

function clamp(value) { return Math.max(0, Math.min(1, value)); }

async function ensureAudio() {
  if (!audioStarted) {
    await Tone.start();
    audioStarted = true;
  }
}

function spatialPoint(event) {
  const rect = spatialField.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width),
    y: clamp((event.clientY - rect.top) / rect.height)
  };
}


function noteFromSpatialPosition(x, y) {
  const notes = ["C3","D3","E3","F3","G3","A3","B3","C4","D4","E4","F4","G4","A4","B4","C5"];
  return notes[Math.round((1 - y) * (notes.length - 1))];
}
function updateSpatialSound(active) {
  const x = spatialState.x;
  const y = spatialState.y;
  // X controls brightness; Y controls effect/filter openness.
  const filterFrequency = 450 + x * 10500;
  filter.frequency.rampTo(filterFrequency, 0.06);
  filter.Q.rampTo(0.7 + (1 - y) * 11, 0.06);
  // Keep the spatial voice playable, but make its pitch secondary to the modifier role.
  const modifierNote = noteFromSpatialPosition(0.5, y);
  if (active) spatialSynth.frequency.rampTo(Tone.Frequency(modifierNote).toFrequency(), 0.06);
  updateBallPosition();
  const horizontal = x < 0.38 ? "Dark" : x > 0.62 ? "Bright" : "Balanced";
  const vertical = y < 0.38 ? "More effect" : y > 0.62 ? "Clean" : "Balanced effect";
  const combined = `${vertical} / ${horizontal}`;
  updateSpatialFeedback(vertical, horizontal, combined);
}

function updateBallPosition() {
  spatialBall.style.left = `${spatialState.x * 100}%`;
  spatialBall.style.top = `${spatialState.y * 100}%`;
}

function updateSpatialFeedback(vertical, horizontal, combined) {
  positionFeedback.textContent = combined;
  pitchFeedback.textContent = vertical;
  timbreFeedback.textContent = horizontal;
}

function releaseSpatial() {
  if (!spatialDragging) return;
  spatialDragging = false;
  spatialSynth.triggerRelease();
  spatialBall.classList.remove("activeKey");
}

async function beginSpatial(event) {
  event.preventDefault();
  await ensureAudio();
  spatialDragging = true;
  spatialBall.setPointerCapture?.(event.pointerId);
  const point = spatialPoint(event);
  spatialState.x = point.x;
  spatialState.y = point.y;
  updateSpatialSound(true);
  spatialSynth.triggerAttack(noteFromSpatialPosition(spatialState.x, spatialState.y));
  spatialBall.classList.add("activeKey");
}

spatialBall.addEventListener("pointerdown", beginSpatial);
spatialBall.addEventListener("pointermove", event => {
  if (!spatialDragging) return;
  const point = spatialPoint(event);
  spatialState.x = point.x;
  spatialState.y = point.y;
  updateSpatialSound(true);
});
spatialBall.addEventListener("pointerup", releaseSpatial);
spatialBall.addEventListener("pointercancel", releaseSpatial);
window.addEventListener("pointerup", releaseSpatial);

spatialField.addEventListener("pointerdown", async event => {
  if (event.target === spatialBall) return;
  event.preventDefault();
  await ensureAudio();
  spatialField.setPointerCapture?.(event.pointerId);
  spatialDragging = true;
  const point = spatialPoint(event);
  spatialState.x = point.x;
  spatialState.y = point.y;
  updateSpatialSound(true);
  spatialSynth.triggerAttack(noteFromSpatialPosition(spatialState.x, spatialState.y));
  spatialBall.classList.add("activeKey");
});
spatialField.addEventListener("pointermove", event => {
  if (!spatialDragging) return;
  const point = spatialPoint(event);
  spatialState.x = point.x;
  spatialState.y = point.y;
  updateSpatialSound(true);
});
spatialField.addEventListener("pointerup", releaseSpatial);
spatialField.addEventListener("pointercancel", releaseSpatial);

volumeSlider.addEventListener("input", event => {
  const value = Number(event.target.value);
  masterVolume.volume.rampTo(value, 0.05);
  volumeFeedback.textContent = `${value} dB`;
});

function setWaveform(type) {
  keyboardSynth.set({ oscillator: { type } });
  spatialSynth.oscillator.type = type;
  waveformFeedback.textContent = type === "sawtooth" ? "Saw" : type[0].toUpperCase() + type.slice(1);
}
waveformInputs.forEach(input => input.addEventListener("change", event => setWaveform(event.target.value)));

// Default spatial position.
updateSpatialSound(false);

const introDialog = document.getElementById("intro-dialog");
const introClose = document.getElementById("intro-dialog-close-button");
const infoDialog = document.getElementById("info-dialog");
const infoButton = document.getElementById("info-button");
const infoClose = document.getElementById("info-dialog-close-button");
introDialog.showModal();
introClose.addEventListener("click", async () => { await ensureAudio(); introDialog.close(); });
infoButton.addEventListener("click", () => infoDialog.showModal());
infoClose.addEventListener("click", () => infoDialog.close());
