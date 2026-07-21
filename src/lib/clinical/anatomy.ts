export type AnatomyLocation = { mapVersion: number; bodyView: "anterior" | "posterior" | "foot_dorsal" | "foot_plantar"; regionCode: string; subregionCode?: string; laterality: "left" | "right" | "bilateral" | "midline" | "not_applicable"; label: string };
export const ANATOMY_MAP_VERSION = 1;
export const ANATOMY_MAP_STATUS = "clinician_review" as const;
export function createAnatomyLocation(label: string, bodyView: AnatomyLocation["bodyView"], regionCode: string, laterality: AnatomyLocation["laterality"] = "not_applicable"): AnatomyLocation { return { mapVersion: ANATOMY_MAP_VERSION, bodyView, regionCode, laterality, label }; }
export function anatomyPayload(location: AnatomyLocation | null) { return location ? { anatomy_map_version: location.mapVersion, body_view: location.bodyView, region_code: location.regionCode, subregion_code: location.subregionCode ?? null, laterality: location.laterality, label: location.label } : null; }
