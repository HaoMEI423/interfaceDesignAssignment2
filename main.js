//////////
// Cooperative Spatial Synth
// Draft 01
//////////

const defaultPreset = {
  volume: -8,
  oscType: "sine"
};

//////////
// Find elements
//////////

const introDialog = document.getElementById("intro-dialog");
const introDialogCloseButton = document.getElementById("intro-dialog-close-button");

const infoButton = document.getElementById("info-button");
const infoDialog = document.getElementById("info-dialog");
const infoDialogCloseButton = document.getElementById("info-dialog-close-button");

const volumeSlider = document.getElementById("volume-slider");
const volumeFeedback = document.getElementById("volume-feedback");
const waveformInputs = Array.from(document.getElementsByClassName("waveformSelect"));

const spatialField = document.getElementById("spatial-field");
const playerA = document.getElementById("player-a");
const playerB = document.getElementById("player-b");
const connectionLine = document.getElementById("connection-line");

const distanceFeedback = document.getElementById("distance-feedback");
const distanceMeter = document.getElementById("distance-meter");

//////////
// Tone setup
//////////

const synth = new Tone.PolySynth(Tone.Synth);
const filter = new Tone.Filter(12000, "lowpass");
const reverb = new Tone.Reverb({ decay: 2.2, wet: 0.12 });

synth.chain(filter, reverb, Tone.Destination);

//////////
// Spatial state
//////////

const spatialState = {
  A: { x: 0.25, y: 0.55 },
  B: { x: 0.75, y: 0.45 }
};

let activePlayer = null;

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function updatePlayerPosition(element, player) {
  element.style.left = `${player.x * 100}%`;
  element.style.top = `${player.y * 100}%`;
}

function updateSpatialFeedback() {
  updatePlayerPosition(playerA, spatialState.A);
  updatePlayerPosition(playerB, spatialState.B);

  const dx = spatialState.A.x - spatialState.B.x;
  const dy = spatialState.A.y - spatialState.B.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const closeness = 1 - clamp(distance / Math.sqrt(2));

  // Draw a line between the two spatial inputs.
  const rect = spatialField.getBoundingClientRect();
  const ax = spatialState.A.x * rect.width;
  const ay = spatialState.A.y * rect.height;
  const bx = spatialState.B.x * rect.width;
  const by = spatialState.B.y * rect.height;

  const lineLength = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
  const lineAngle = Math.atan2(by - ay, bx - ax) * 180 / Math.PI;

  connectionLine.style.left = `${ax}px`;
  connectionLine.style.top = `${ay}px`;
  connectionLine.style.width = `${lineLength}px`;
  connectionLine.style.transform = `rotate(${lineAngle}deg)`;
  connectionLine.style.opacity = `${0.2 + closeness * 0.8}`;

  distanceMeter.style.width = `${closeness * 100}%`;

  if (closeness > 0.72) {
    distanceFeedback.textContent = "Together";
  } else if (closeness > 0.38) {
    distanceFeedback.textContent = "Near";
  } else {
    distanceFeedback.textContent = "Far";
  }

  // Spatial input controls timbre:
  // horizontal position changes the filter frequency.
  const averageX = (spatialState.A.x + spatialState.B.x) / 2;
  const filterFrequency = 500 + averageX * 11500;
  filter.frequency.rampTo(filterFrequency, 0.08);

  // Spatial relationship controls shared reverb.
  reverb.wet.rampTo(0.05 + closeness * 0.55, 0.1);
}

function getSpatialPoint(event) {
  const rect = spatialField.getBoundingClientRect();

  return {
    x: clamp((event.clientX - rect.left) / rect.width),
    y: clamp((event.clientY - rect.top) / rect.height)
  };
}

function startSpatialNote() {
  if (activePlayer === "A") {
    synth.triggerAttack("C4");
  }

  if (activePlayer === "B") {
    synth.triggerAttack("G3");
  }
}

function stopSpatialNote() {
  synth.releaseAll();
}

function moveSpatialPlayer(player, event) {
  spatialState[player] = getSpatialPoint(event);
  updateSpatialFeedback();
}

function setupSpatialInput(player, element) {

  element.addEventListener("pointerdown", async (event) => {
    event.preventDefault();

    await Tone.start();

    activePlayer = player;
    element.setPointerCapture(event.pointerId);
    element.classList.add("activeKey");

    moveSpatialPlayer(player, event);
    startSpatialNote();
  });

  element.addEventListener("pointermove", (event) => {
    if (!element.hasPointerCapture(event.pointerId)) return;

    moveSpatialPlayer(player, event);

    // Move the pitch continuously with vertical spatial position.
    const noteRange = player === "A"
      ? ["C3", "D3", "E3", "G3", "A3", "C4", "D4", "E4", "G4", "A4"]
      : ["G2", "A2", "C3", "D3", "E3", "G3", "A3", "C4", "D4", "E4"];

    const index = Math.round((1 - spatialState[player].y) * (noteRange.length - 1));
    const note = noteRange[index];

    synth.setNote(note);
  });

  element.addEventListener("pointerup", () => {
    element.classList.remove("activeKey");
    activePlayer = null;
    stopSpatialNote();
  });

  element.addEventListener("pointercancel", () => {
    element.classList.remove("activeKey");
    activePlayer = null;
    stopSpatialNote();
  });
}

setupSpatialInput("A", playerA);
setupSpatialInput("B", playerB);

//////////
// Volume
//////////

function changeVolume(newVolume) {

  if (newVolume === volumeSlider.min) {
    synth.volume.value = -128;
  } else {
    synth.volume.value = Number(newVolume);
  }

  volumeFeedback.textContent = `${newVolume} dB`;
}

volumeSlider.addEventListener("input", (e) => {
  changeVolume(e.target.value);
});

//////////
// Waveform
//////////

function changeOscillatorType(newOscType) {
  synth.set({
    oscillator: {
      type: newOscType
    }
  });
}

waveformInputs.forEach((input) => {
  input.addEventListener("change", (e) => {
    changeOscillatorType(e.target.value);
  });
});

//////////
// Keyboard initialisation
//////////

function toneInit() {
  synth.volume.value = defaultPreset.volume;
  changeVolume(defaultPreset.volume);
  changeOscillatorType(defaultPreset.oscType);

  keyboardControlInit();
  updateSpatialFeedback();
}

//////////
// Dialogs
//////////

introDialog.showModal();

introDialogCloseButton.addEventListener("click", () => {
  introDialog.close();
});

introDialog.addEventListener("close", toneInit);

infoButton.addEventListener("click", () => {
  infoDialog.showModal();
});

infoDialogCloseButton.addEventListener("click", () => {
  infoDialog.close();
});
