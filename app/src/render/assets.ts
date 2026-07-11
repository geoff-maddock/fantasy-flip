// Asset registry. Today it resolves icon keys to emoji (the prototype's approach);
// in Phase 4 keys can resolve to real SVG/PNG art without touching board logic.
// Board content carries emoji in `em` fields — the registry lets the renderer
// swap those for art later by keying on a stable name.

export type IconKey = string;

const overrides: Record<IconKey, string> = {};

// Register a real asset URL for an icon key (used by Phase 4 art pipeline).
export function registerAsset(key: IconKey, url: string): void {
  overrides[key] = url;
}

// Resolve an icon: an override URL renders as an <img>, otherwise the emoji is
// used verbatim. `fallback` is the emoji carried in content data.
export function icon(fallback: string, key?: IconKey): string {
  if (key && overrides[key]) {
    return `<img class="asset" src="${overrides[key]}" alt="" />`;
  }
  return fallback;
}

export function hasAsset(key: IconKey): boolean {
  return key in overrides;
}
