//////////
// Keyboard controller
// Based on the structure demonstrated in the RMIT instrument example.
//////////

const allKeys = Array.from(document.getElementsByClassName("whiteKey"))
  .concat(Array.from(document.getElementsByClassName("blackKey")));

const keyCodeToNote = {
  a: { note: "c", octave: "3" },
  w: { note: "c#", octave: "3" },
  s: { note: "d", octave: "3" },
  e: { note: "d#", octave: "3" },
  d: { note: "e", octave: "3" },
  f: { note: "f", octave: "3" },
  t: { note: "f#", octave: "3" },
  g: { note: "g", octave: "3" },
  y: { note: "g#", octave: "3" },
  h: { note: "a", octave: "3" },
  u: { note: "a#", octave: "3" },
  j: { note: "b", octave: "3" },
  k: { note: "c", octave: "4" },
  o: { note: "c#", octave: "4" },
  l: { note: "d", octave: "4" },
  p: { note: "d#", octave: "4" }
};

function playKey(key) {
  const note = key.dataset.note;
  const octave = key.parentElement.parentElement.dataset.octave;

  synth.triggerAttack(note + octave);
  key.classList.add("activeKey");
}

function releaseKey(key) {
  const note = key.dataset.note;
  const octave = key.parentElement.parentElement.dataset.octave;

  synth.triggerRelease(note + octave);
  key.classList.remove("activeKey");
}

allKeys.forEach((key) => {

  key.addEventListener("mousedown", async () => {
    await Tone.start();
    playKey(key);
  });

  key.addEventListener("mouseup", () => {
    releaseKey(key);
  });

  key.addEventListener("mouseleave", (event) => {
    if (event.buttons === 1) {
      releaseKey(key);
    }
  });

  key.addEventListener("mouseenter", (event) => {
    if (event.buttons !== 1) return;
    playKey(key);
  });

  key.addEventListener("touchstart", async (event) => {
    event.preventDefault();
    await Tone.start();
    playKey(key);
  }, { passive: false });

  key.addEventListener("touchend", () => {
    releaseKey(key);
  });
});

window.addEventListener("keydown", async (event) => {

  if (event.repeat) return;
  if (!(event.key in keyCodeToNote)) return;

  await Tone.start();

  const note = keyCodeToNote[event.key].note;
  const octave = keyCodeToNote[event.key].octave;

  synth.triggerAttack(note + octave);

  allKeys.forEach((key) => {
    if (
      key.dataset.note === note &&
      key.parentElement.parentElement.dataset.octave === octave
    ) {
      key.classList.add("activeKey");
    }
  });
});

window.addEventListener("keyup", (event) => {

  if (!(event.key in keyCodeToNote)) return;

  const note = keyCodeToNote[event.key].note;
  const octave = keyCodeToNote[event.key].octave;

  synth.triggerRelease(note + octave);

  allKeys.forEach((key) => {
    if (
      key.dataset.note === note &&
      key.parentElement.parentElement.dataset.octave === octave
    ) {
      key.classList.remove("activeKey");
    }
  });
});
