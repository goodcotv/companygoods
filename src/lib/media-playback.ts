/**
 * iOS / Safari decode a single video (or Vimeo iframe) at a time.
 * A second player calling play() silently pauses the first — on mobile that
 * looks like stutter, frozen frames, and a play button appearing at random.
 */

export function applyPlaysInline(video: HTMLVideoElement) {
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
}

export function applyMutedInline(video: HTMLVideoElement) {
  video.muted = true;
  video.defaultMuted = true;
  video.setAttribute("muted", "");
  applyPlaysInline(video);
}

export function isCoarsePointerDevice() {
  if (typeof window === "undefined") return false;
  return !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

type MediaSlot = {
  pause: () => void;
  resume: () => void;
  shouldPlay: () => boolean;
};

const slots = new Set<MediaSlot>();

export function registerMediaSlot(slot: MediaSlot) {
  slots.add(slot);
  return () => {
    slots.delete(slot);
  };
}

/** Pause every other registered player before this one starts. */
export function claimMediaSlot(slot: MediaSlot) {
  for (const other of slots) {
    if (other !== slot) other.pause();
  }
}

/** After a player yields (menu close, unmount), resume the foreground clip. */
export function restoreMediaSlots() {
  for (const slot of slots) {
    if (slot.shouldPlay()) slot.resume();
  }
}
