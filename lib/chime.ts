'use client';

// Browsers only let a page make sound after the person has interacted with it,
// so the audio context is created on a tap (turning an alert on, or "Test
// sound") and reused for alerts that fire later while the tab is open.
let ctx: AudioContext | null = null;

export async function unlockSound(): Promise<boolean> {
  try {
    ctx ??= new AudioContext();
    await ctx.resume();
    return ctx.state === 'running';
  } catch {
    return false;
  }
}

/** A rising three-note chime. */
export async function chime(): Promise<boolean> {
  if (!(await unlockSound()) || !ctx) return false;
  const c = ctx;
  [660, 880, 1175].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    const t = c.currentTime + i * 0.17;
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.36);
  });
  return true;
}

export async function askNotifications(): Promise<void> {
  try {
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
  } catch {}
}

export function notify(title: string, body: string, tag: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, tag, icon: '/icon.svg' });
  } catch {}
}
