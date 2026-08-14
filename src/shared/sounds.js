const channels = new Map();
const pending = new Map();

export function stopSound(channel = "default") {
  const timer = pending.get(channel);
  if (timer != null) {
    window.clearTimeout(timer);
    pending.delete(channel);
  }

  const previous = channels.get(channel);
  if (!previous) {
    return;
  }

  previous.pause();
  previous.currentTime = 0;
  channels.delete(channel);
}

export function playSound(src, volume = 0.8, channel = "default") {
  const timer = pending.get(channel);
  if (timer != null) {
    window.clearTimeout(timer);
    pending.delete(channel);
  }

  const previous = channels.get(channel);
  if (previous) {
    previous.pause();
    previous.currentTime = 0;
  }

  const audio = new Audio(src);
  audio.volume = volume;
  channels.set(channel, audio);
  audio.play().catch(() => {});
  audio.addEventListener(
    "ended",
    () => {
      if (channels.get(channel) === audio) {
        channels.delete(channel);
      }
    },
    { once: true },
  );
}

export function playSoundLater(src, delayMs, volume = 0.8, channel = "default") {
  const existing = pending.get(channel);
  if (existing != null) {
    window.clearTimeout(existing);
  }

  if (delayMs <= 0) {
    playSound(src, volume, channel);
    return;
  }

  pending.set(
    channel,
    window.setTimeout(() => {
      pending.delete(channel);
      playSound(src, volume, channel);
    }, delayMs),
  );
}
