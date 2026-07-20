import Link from "next/link";

const pillars = [
  ["01", "Wound-first", "Structured assessments, photos, measurements, and physician confirmation."],
  ["02", "Whole patient", "IPD forms, observations, medications, investigations, and referrals in one chart."],
  ["03", "Clinically safe", "Role-based access, audit trails, consent controls, and clear draft states."],
];

export default function Home() {
  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <div className="brand-mark"><span>EK</span><div><strong>Ekagra</strong><small>Wound Care EHR</small></div></div>
        <div className="nav-links"><Link href="/app">Staff workspace</Link><Link href="/portal">Patient portal</Link><Link className="nav-button" href="/app">Open workspace →</Link></div>
      </nav>
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Physician-first clinical workspace</p>
          <h1>See the wound.<br /><em>See the whole patient.</em></h1>
          <p className="hero-lede">A calm, structured EHR for Ekagra Health — built around wound progression, daily clinical work, and the decisions doctors need to make next.</p>
          <div className="hero-actions"><Link className="primary-button" href="/app">Enter clinical workspace <span>↗</span></Link><Link className="text-link" href="/portal">Patient portal →</Link></div>
          <div className="hero-note"><span className="status-dot" /> Clinical workspace ready for staged implementation</div>
        </div>
        <div className="hero-card-wrap"><div className="hero-card"><div className="card-top"><span className="tiny-label">TODAY · Dhanmondi</span><span className="live-pill">● Live overview</span></div><div className="metric-row"><div><small>Active patients</small><strong>128</strong><span className="trend">↑ 12% this week</span></div><div><small>Needs review</small><strong className="amber">07</strong><span className="trend amber-text">3 urgent</span></div></div><div className="mini-chart"><div className="chart-label"><span>Wound progress</span><span>Last 30 days</span></div><svg viewBox="0 0 440 130" role="img" aria-label="Wound progress trend"><path d="M0 111 C35 104 42 92 78 97 S119 70 150 78 S193 55 225 67 S268 39 295 48 S340 29 365 37 S410 13 440 19" fill="none" stroke="#2b8078" strokeWidth="4" strokeLinecap="round"/><path d="M0 111 C35 104 42 92 78 97 S119 70 150 78 S193 55 225 67 S268 39 295 48 S340 29 365 37 S410 13 440 19 L440 130 L0 130Z" fill="url(#fade)"/><defs><linearGradient id="fade" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#62b9ad" stopOpacity=".24"/><stop offset="1" stopColor="#62b9ad" stopOpacity="0"/></linearGradient></defs></svg></div><div className="card-footer"><span><i className="teal-dot" /> 84 assessments confirmed</span><span>View dashboard →</span></div></div></div>
      </section>
      <section className="pillars">{pillars.map(([num, title, text]) => <div className="pillar" key={num}><span>{num}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}</section>
    </main>
  );
}
