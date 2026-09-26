//////////
// Cooperative Spatial Synth — Draft 03
// Spatial input + volume + waveform + keyboard
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

// One polyphonic instrument handles the keyboard so several notes can overlap.
const keyboardSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "sine" },
  envelope: { attack: 0.015, decay: 0.15, sustain: 0.55, release: 0.45 }
});

// The spatial ball has its own voice so dragging it can continuously change pitch.
const spatialSynth = new Tone.Synth({
  oscillator: { type: "sine" },
  envelope: { attack: 0.03, decay: 0.12, sustain: 0.7, release: 0.35 }
});

const masterVolume = new Tone.Volume(-8).toDestination();
const filter = new Tone.Filter(5000, "lowpass");
keyboardSynth.connect(masterVolume);
spatialSynth.connect(filter);
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

function noteFromSpatialY(y) {
  // A simple scale keeps the spatial instrument playable without music theory.
  const notes = ["C3","D3","E3","F3","G3","A3","B3","C4","D4","E4","F4","G4","A4","B4","C5"];
  return notes[Math.round((1 - y) * (notes.length - 1))];
}

function updateSpatialSound() {
  const x = spatialState.x;
  const y = spatialState.y;
  const note = noteFromSpatialY(y);

  // X axis: left = dark, right = bright.
  const filterFrequency = 350 + x * 11000;
  filter.frequency.rampTo(filterFrequency, 0.06);

  // Y axis: bottom = low, top = high.
  if (spatialDragging) {
    spatialSynth.frequency.rampTo(Tone.Frequency(note).toFrequency(), 0.06);
  }

  spatialBall.style.left = `${x * 100}%`;
  spatialBall.style.top = `${y * 100}%`;

  const horizontal = x < 0.38 ? "Dark" : x > 0.62 ? "Bright" : "Balanced";
  const vertical = y < 0.38 ? "High" : y > 0.62 ? "Low" : "Middle";
  const combined = vertical === "Middle" && horizontal === "Balanced" ? "Centre" : `${vertical} / ${horizontal}`;

  positionFeedback.textContent = combined;
  pitchFeedback.textContent = vertical;
  timbreFeedback.textContent = horizontal;
}

function spatialPoint(event) {
  const rect = spatialField.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width),
    y: clamp((event.clientY - rect.top) / rect.height)
  };
}

spatialBall.addEventListener("pointerdown", async (event) => {
  event.preventDefault();
  await ensureAudio();
  spatialDragging = true;
  spatialBall.setPointerCapture(event.pointerId);
  const point = spatialPoint(event);
  spatialState.x = point.x;
  spatialState.y = point.y;
  spatialSynth.triggerAttack(noteFromSpatialY(spatialState.y));
  spatialBall.classList.add("activeKey");
  updateSpatialSound();
});

spatialBall.addEventListener("pointermove", (event) => {
  if (!spatialDragging) return;
  const point = spatialPoint(event);
  spatialState.x = point.x;
  spatialState.y = point.y;
  updateSpatialSound();
});

function releaseSpatial() {
  if (!spatialDragging) return;
  spatialDragging = false;
  spatialSynth.triggerRelease();
  spatialBall.classList.remove("activeKey");
}
spatialBall.addEventListener("pointerup", releaseSpatial);
spatialBall.addEventListener("pointercancel", releaseSpatial);

// Clicking anywhere in the spatial field moves the ball there and starts sound.
spatialField.addEventListener("pointerdown", async (event) => {
  if (event.target === spatialBall) return;
  await ensureAudio();
  const point = spatialPoint(event);
  spatialState.x = point.x;
  spatialState.y = point.y;
  updateSpatialSound();
  spatialDragging = true;
  spatialSynth.triggerAttack(noteFromSpatialY(spatialState.y));
  spatialBall.setPointerCapture?.(event.pointerId);
});

spatialField.addEventListener("pointermove", (event) => {
  if (!spatialDragging) return;
  const point = spatialPoint(event);
  spatialState.x = point.x;
  spatialState.y = point.y;
  updateSpatialSound();
});

spatialField.addEventListener("pointerup", releaseSpatial);
spatialField.addEventListener("pointercancel", releaseSpatial);

// Volume is routed through one master Volume node so it affects keyboard + spatial sound.
volumeSlider.addEventListener("input", (event) => {
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

// Start with the requested high + bright position.
updateSpatialSound();

const introDialog = document.getElementById("intro-dialog");
const introClose = document.getElementById("intro-dialog-close-button");
const infoDialog = document.getElementById("info-dialog");
const infoButton = document.getElementById("info-button");
const infoClose = document.getElementById("info-dialog-close-button");
introDialog.showModal();
introClose.addEventListener("click", async () => { await ensureAudio(); introDialog.close(); });
infoButton.addEventListener("click", () => infoDialog.showModal());
infoClose.addEventListener("click", () => infoDialog.close());
