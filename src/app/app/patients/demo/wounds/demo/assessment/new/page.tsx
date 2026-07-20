"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/app/app-shell";
import { AnatomySelector } from "./anatomy-selector";
import { calculateArea, validateWoundDraft } from "@/lib/clinical/opd";

const types = ["Diabetic Foot", "Vascular Wound", "Burn", "Post-Infective", "Pressure Injury", "Traumatic", "Surgical", "Other"];

export default function NewAssessment() {
  const [type, setType] = useState(types[0]);
  const [location, setLocation] = useState("");
  const [dimensions, setDimensions] = useState({ length: "", width: "", depth: "" });
  const [photos, setPhotos] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const area = calculateArea(dimensions.length, dimensions.width);
  const validation = useMemo(() => validateWoundDraft({ woundType: type, location, ...dimensions, photoCount: photos.length }), [type, location, dimensions, photos.length]);
  useEffect(() => { const raw = window.localStorage.getItem("ekagra-opd-demo-draft"); if (!raw) return; try { const draft = JSON.parse(raw); setType(draft.type ?? types[0]); setLocation(draft.location ?? ""); setDimensions(draft.dimensions ?? { length: "", width: "", depth: "" }); setPhotos(draft.photos ?? []); } catch { window.localStorage.removeItem("ekagra-opd-demo-draft"); } }, []);
  useEffect(() => { window.localStorage.setItem("ekagra-opd-demo-draft", JSON.stringify({ type, location, dimensions, photos })); setSaved(true); const timer = window.setTimeout(() => setSaved(false), 900); return () => window.clearTimeout(timer); }, [type, location, dimensions, photos]);
  const updateDimension = (key: "length" | "width" | "depth", value: string) => setDimensions((current) => ({ ...current, [key]: value }));
  const fields: Array<[string, string]> = [["Pain level", "Low / Moderate / Severe"], ["Changes", "Traumatic / Non-traumatic"], ["Edges", "Healthy / Cut-out / Undefined"], ["Floor covering", "Slough / Maggot / Bone / Tendon / Foreign body"], ["Granulation tissue", "Healthy / Unhealthy"], ["Slough", "None / Light / Moderate / Heavy"], ["Exudate", "None / Serous / Purulent"], ["Odor", "Yes / No"], ["Surrounding skin", "Healthy / Dry / Erythema / Macerated"]];
  return <AppShell>
    <div className="page-heading"><div><p className="eyebrow">Rahima Begum · New OPD assessment</p><h1>Document the wound</h1><p>Carry forward the previous confirmed assessment, update today’s findings, and submit for review.</p></div><Link className="text-link" href="/app/patients/demo">← Patient dashboard</Link></div>
    <div className="panel form-panel">
      <div className="stepper"><span className="step active">1 <b>Wound type</b></span><span className="step active">2 <b>Assessment</b></span><span className="step">3 <b>Review & save</b></span></div>
      <p className="eyebrow">Wound classification</p><div className="type-picker">{types.map((item) => <button className={item === type ? "selected" : ""} onClick={() => setType(item)} key={item}>{item}</button>)}</div>
      <div className="carry-forward"><strong>Carried forward from previous confirmed visit</strong><span>Existing wound history loaded · editable in this draft</span></div>
      <AnatomySelector value={location} onChange={setLocation} />
      <div className="form-section-title"><h2>{type} assessment</h2><span className="badge">Draft · incomplete until required fields are filled</span></div>
      <div className="form-grid">
        <label>Length (cm)<input type="number" min="0" step="0.1" value={dimensions.length} onChange={(event) => updateDimension("length", event.target.value)} /></label>
        <label>Width (cm)<input type="number" min="0" step="0.1" value={dimensions.width} onChange={(event) => updateDimension("width", event.target.value)} /></label>
        <label>Depth (cm)<input type="number" min="0" step="0.1" value={dimensions.depth} onChange={(event) => updateDimension("depth", event.target.value)} /></label>
        {fields.map(([label, placeholder]) => <label key={label}>{label}<input placeholder={placeholder} /></label>)}
      </div>
      <div className="calculation-strip"><span>Calculated area</span><strong>{area} cm²</strong><span>Area change from prior visit</span><strong>Unable to calculate until prior confirmed area is available</strong></div>
      <div className="upload-strip"><strong>Wound photo required</strong><span>{photos.length} photo{photos.length === 1 ? "" : "s"} · camera or upload · metadata recorded on save</span><label className="secondary-button">Add photo<input className="file-input" type="file" accept="image/*" capture="environment" multiple onChange={(event) => setPhotos((current) => [...current, ...Array.from(event.target.files ?? []).map((file) => file.name)])} /></label></div>
      <div className="review-strip"><strong>Submission readiness</strong><span>{validation.valid ? "Ready for review" : `Incomplete: ${validation.missing.join(", ")}`}</span></div>
      <div className="form-actions"><span className="autosave">● {saved ? "Saving draft…" : "Draft saved locally"} · {location ? "location selected" : "location required"}</span><button className="workspace-button" disabled={!validation.valid} onClick={() => window.alert("Draft ready for MO/consultant review. Supabase persistence will activate after staff sign-in.")}>Save draft & continue →</button></div>
    </div>
  </AppShell>;
}
