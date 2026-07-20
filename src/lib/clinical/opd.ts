export type WoundDraft = {
  woundType: string;
  location: string;
  length: string;
  width: string;
  depth: string;
  photoCount: number;
};

export function validateWoundDraft(draft: WoundDraft) {
  const missing: string[] = [];
  if (!draft.location) missing.push("anatomical location");
  if (!draft.length) missing.push("length");
  if (!draft.width) missing.push("width");
  if (!draft.depth) missing.push("depth");
  if (draft.photoCount < 1) missing.push("wound photo");
  return { valid: missing.length === 0, missing };
}

export function calculateArea(length: string, width: string) {
  if (!length || !width) return null;
  const value = Number(length) * Number(width);
  return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
}
