const appBase = import.meta.env.BASE_URL.replace(/\/$/, "");

export function normalizePathname(pathname) {
  if (!appBase) return pathname;
  return pathname.startsWith(appBase) ? pathname.slice(appBase.length) || "/" : pathname;
}

export function withBase(path) {
  return `${appBase}${path}`;
}

export const gameRouteMap = {
  "coco-hut": "/coco-hut",
  "coin-flip": "/coin-flip",
  crash: "/crash",
  hilo: "/hilo",
  mines: "/",
  roulette: "/roulette",
};
