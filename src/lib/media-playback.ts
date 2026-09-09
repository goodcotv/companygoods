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

const PROJECT_PLAY_RATIO = 0.6;
const PROJECT_PAUSE_RATIO = 0.35;
const PROJECT_SCROLL_SETTLE_MS = 160;

/**
 * Drive in-view playback on project pages without toggling mid-scroll.
 * iOS will yank the page to keep a playing <video> "on screen" if play/pause
 * flips while the finger is down — wait until scroll settles, and ignore
 * intersection chatter between the play/pause thresholds.
 */
export function observeProjectMediaInView(
  element: Element,
  isInViewRef: { current: boolean },
  onStableChange: () => void,
): () => void {
  let settle = 0;
  let scrolling = false;

  const apply = () => {
    onStableChange();
  };

  const scheduleApply = () => {
    window.clearTimeout(settle);
    settle = window.setTimeout(() => {
      scrolling = false;
      apply();
    }, PROJECT_SCROLL_SETTLE_MS);
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      const ratio = entry.intersectionRatio;
      let next = isInViewRef.current;
      if (ratio >= PROJECT_PLAY_RATIO) next = true;
      else if (ratio <= PROJECT_PAUSE_RATIO) next = false;
      else return;

      if (next === isInViewRef.current) return;
      isInViewRef.current = next;

      if (scrolling) {
        scheduleApply();
        return;
      }
      apply();
    },
    { threshold: [0, PROJECT_PAUSE_RATIO, PROJECT_PLAY_RATIO, 1] },
  );

  observer.observe(element);

  const onScroll = () => {
    scrolling = true;
    scheduleApply();
  };

  window.addEventListener("scroll", onScroll, { passive: true });

  return () => {
    observer.disconnect();
    window.removeEventListener("scroll", onScroll);
    window.clearTimeout(settle);
  };
}
