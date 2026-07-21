"use client";
import { useEffect, useState } from "react";
import { hasPhotoConsent } from "@/lib/clinical/consent";
export function PhotoConsentGate({ patientId, onChange }: { patientId: string; onChange: (allowed: boolean) => void }) { const [state, setState] = useState("Checking photo consent…"); useEffect(() => { void hasPhotoConsent(patientId).then((allowed) => { onChange(allowed); setState(allowed ? "Photo consent on file" : "Photo consent required before uploading photos"); }); }, [patientId, onChange]); return <small>{state}</small>; }
