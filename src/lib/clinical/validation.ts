export const CLINICAL_DRAFT_VERSION = 1;
export const SIGNED_URL_EXPIRY_SECONDS = 900;
export const MAX_WOUND_PHOTO_BYTES = 30 * 1024 * 1024;
export const ACCEPTED_WOUND_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validatePatientInput(input: { full_name: string; national_id: string }) {
  const errors: string[] = [];
  if (!input.full_name.trim()) errors.push("Full name is required.");
  if (!input.national_id.trim()) errors.push("National ID is required.");
  return errors;
}

export function validateWoundInput(input: { woundType: string; site: string }) {
  const errors: string[] = [];
  if (!input.woundType.trim()) errors.push("Wound type is required.");
  if (!input.site.trim()) errors.push("Anatomical site is required.");
  return errors;
}

export function validateMeasurements(input: { length: string | number; width: string | number; depth: string | number }) {
  const errors: string[] = [];
  for (const [label, value] of [["Length", input.length], ["Width", input.width], ["Depth", input.depth]] as const) {
    if (value === "" || value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) < 0) errors.push(`${label} must be a non-negative number.`);
  }
  return errors;
}

export function validateWoundPhoto(file: Pick<File, "type" | "size">) {
  if (!ACCEPTED_WOUND_PHOTO_TYPES.includes(file.type)) return "Use a JPEG, PNG, or WebP image.";
  if (file.size > MAX_WOUND_PHOTO_BYTES) return "Wound photos must be 30 MB or smaller.";
  return null;
}

export function validateCorrectionReason(reason: string) { return reason.trim().length >= 5 ? null : "Enter at least five characters describing the correction."; }
export function normalizeSearch(value: string) { return value.trim().toLocaleLowerCase(); }
export function generateRegistrationNumber(year = new Date().getFullYear()) { return `EK-${year}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`; }
export function clinicalError(error: { message?: string } | null | undefined, fallback: string) { return error?.message || fallback; }

export const ROLE_CAPABILITIES = {
  physician: ["create_assessment", "confirm_assessment", "request_correction", "mark_healed"],
  nurse: ["create_assessment", "request_correction"],
  wound_tech: ["create_assessment", "request_correction"],
  clinic_admin: ["manage_staff"],
  super_admin: ["manage_staff", "manage_clinics"],
} as const;

export function hasCapability(role: keyof typeof ROLE_CAPABILITIES, capability: string) { return (ROLE_CAPABILITIES[role] as readonly string[]).includes(capability); }
