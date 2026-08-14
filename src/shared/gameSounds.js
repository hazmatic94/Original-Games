import cashoutSound from "../../assets/cashout.mp3?url";
import lossSound from "../../assets/loss.mp3?url";
import multiplierSound from "../../assets/multiplier.mp3?url";
import placeBetSound from "../../assets/place-bet.mp3?url";
import { playSound, playSoundLater, stopSound } from "./sounds.js";

export const gameSounds = {
  placeBet: placeBetSound,
  cashout: cashoutSound,
  loss: lossSound,
  multiplier: multiplierSound,
};

export const soundCue = {
  foley: 0.8,
  openingFoley: 0.32,
  stingGapMs: 180,
  placeBetLeadMs: 280,
};

export function playFoley(src, { opening = false, delay = 0 } = {}) {
  const volume = opening ? soundCue.openingFoley : soundCue.foley;
  if (delay > 0) {
    playSoundLater(src, delay, volume, "foley");
    return;
  }

  playSound(src, volume, "foley");
}

export function playSting(name, { delay = 0 } = {}) {
  const src = gameSounds[name];
  if (!src) {
    return;
  }

  if (delay > 0) {
    playSoundLater(src, delay, 0.8, "sting");
    return;
  }

  playSound(src, 0.8, "sting");
}

export function planResolveCue({
  opening = false,
  foley,
  foleyAt = 0,
  sting,
  stingAt,
} = {}) {
  const playStingNow = Boolean(sting) && !(opening && sting === "multiplier");

  return {
    foley: foley || null,
    foleyAt: foley ? foleyAt : 0,
    sting: playStingNow ? sting : null,
    stingAt: playStingNow
      ? (stingAt ?? (foley ? foleyAt + soundCue.stingGapMs : soundCue.stingGapMs))
      : 0,
  };
}

export function playResolveCue(options = {}) {
  const cue = planResolveCue(options);

  if (cue.foley) {
    playFoley(cue.foley, { opening: options.opening, delay: cue.foleyAt });
  }

  if (cue.sting) {
    playSting(cue.sting, { delay: cue.stingAt });
  }
}

export function cancelSoundCues() {
  stopSound("foley");
  stopSound("sting");
}

export function playPlaceBetSound() {
  playSting("placeBet");
}

export function playCashoutSound() {
  playSting("cashout");
}

export function playLossSound() {
  playSting("loss");
}

export function playMultiplierSound() {
  playSting("multiplier");
}
