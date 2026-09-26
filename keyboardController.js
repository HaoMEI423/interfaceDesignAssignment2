//////////
// Keyboard controller
// Mouse + computer keyboard input, following the course example's
// separate keyboard-controller approach.
//////////

const keys = Array.from(document.querySelectorAll(".whiteKey, .blackKey"));
const activeComputerKeys = new Map();

const keyMap = {
  a: "C3", w: "C#3", s: "D3", e: "D#3", d: "E3", f: "F3", t: "F#3",
  g: "G3", y: "G#3", h: "A3", u: "A#3", j: "B3", k: "C4", o: "C#4",
  l: "D4", p: "D#4", ";": "E4", "]": "F4"
};

function keyNote(key) {
  const octave = key.closest(".octaveContainer").dataset.octave;
  return `${key.dataset.note}${octave}`;
}

function findKey(note) {
  return keys.find(key => keyNote(key) === note);
}

async function playNote(note, keyElement) {
  await ensureAudio();
  keyboardSynth.triggerAttack(note);
  if (keyElement) keyElement.classList.add("activeKey");
}

function releaseNote(note, keyElement) {
  keyboardSynth.triggerRelease(note);
  if (keyElement) keyElement.classList.remove("activeKey");
}

keys.forEach(key => {
  key.addEventListener("pointerdown", async event => {
    event.preventDefault();
    key.setPointerCapture(event.pointerId);
    await playNote(keyNote(key), key);
  });
  key.addEventListener("pointerup", () => releaseNote(keyNote(key), key));
  key.addEventListener("pointercancel", () => releaseNote(keyNote(key), key));
});

window.addEventListener("keydown", async event => {
  if (event.repeat) return;
  const note = keyMap[event.key.toLowerCase()];
  if (!note) return;
  event.preventDefault();
  const key = findKey(note);
  await playNote(note, key);
  activeComputerKeys.set(event.key.toLowerCase(), { note, key });
});

window.addEventListener("keyup", event => {
  const item = activeComputerKeys.get(event.key.toLowerCase());
  if (!item) return;
  releaseNote(item.note, item.key);
  activeComputerKeys.delete(event.key.toLowerCase());
});
