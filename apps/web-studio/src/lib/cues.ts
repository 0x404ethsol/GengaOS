import { cinematicSoundCues, type CinematicSoundCue } from "@genga/contracts";

type CueId = (typeof cinematicSoundCues)[number]["id"];

const cueMap = new Map<CueId, CinematicSoundCue>(
  cinematicSoundCues.map((cue) => [cue.id, cue])
);

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!sharedAudioContext) {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) {
      return null;
    }
    sharedAudioContext = new Ctx();
  }

  return sharedAudioContext;
}

export function playCinematicCue(id: CueId): void {
  const cue = cueMap.get(id);
  if (!cue) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = cue.frequencyHz;
  gain.gain.value = 0.0001;
  oscillator.connect(gain);
  gain.connect(context.destination);

  const now = context.currentTime;
  const end = now + cue.durationMs / 1000;
  gain.gain.exponentialRampToValueAtTime(0.035, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.start(now);
  oscillator.stop(end);
}
