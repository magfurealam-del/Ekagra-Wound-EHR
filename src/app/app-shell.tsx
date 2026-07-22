import Link from "next/link";
import { StaffIdentity } from "@/app/staff-identity";

export function AppShell({ children, active = "Overview" }: { children: React.ReactNode; active?: string }) {
  const links = [["⌂", "Overview", "/app"], ["◉", "Patients", "/app/patients"], ["◌", "IPD admissions", "/app/ipd/admissions"], ["↗", "Referrals", "/app/referrals"], ["▣", "Reports", "/app/reports"]];
  const clinicalLinks = [["✚", "Patient chart", "/app/patients"], ["▣", "IPD daily chart", "/app/ipd/admissions"], ["▤", "Investigations", "/app/patients"]];
  return <div className="workspace-shell"><aside className="sidebar"><div className="side-brand"><b>EK</b><div><strong>Ekagra</strong><small>Wound Care EHR</small></div></div><div className="nav-section">Workspace</div>{links.map(([icon,label,href])=><Link className={`side-link ${active===label?"active":""}`} href={href} key={label}><span className="side-icon">{icon}</span><span>{label}</span></Link>)}<div className="nav-section">Clinical</div>{clinicalLinks.map(([icon,label,href])=><Link className="side-link" href={href} key={label}><span className="side-icon">{icon}</span><span>{label}</span></Link>)}<div className="side-bottom"><div>Ekagra Health · Dhanmondi</div><StaffIdentity /></div></aside><main className="workspace-main"><header className="topbar"><div className="crumb">Ekagra Health <span> / </span><strong>{active}</strong></div><div className="top-actions"><div className="search-box">⌕ &nbsp; Search patients…</div><div className="bell">♧</div><StaffIdentity /></div></header>{children}</main></div>;
}
