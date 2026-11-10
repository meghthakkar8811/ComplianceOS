import React, { useState, memo } from 'react';
import { toast } from '../context/ToastContext';

const INITIAL_MODULES = [
  {
    id: 'm1',
    name: 'Module 1: Scientific & Systematic Mining',
    maxPts: 30,
    items: [
      { id: 'm1_1', title: 'Excavation vs Approved Mining Plan Target', desc: 'Mining strictly within approved annual target limits under Rule 11', max: 10, current: 9 },
      { id: 'm1_2', title: 'Bench Geometry & Safety Berms', desc: 'Bench height-to-width ratio compliant with MMR 1961 Regulation 106', max: 8, current: 7 },
      { id: 'm1_3', title: 'Sub-Grade Ore Preservation', desc: 'Separate stacking of mineral rejects and sub-grade ore for future use', max: 6, current: 5 },
      { id: 'm1_4', title: 'Topsoil Management', desc: 'Topsoil scraped and utilized for concurrent afforestation', max: 6, current: 5 },
    ]
  },
  {
    id: 'm2',
    name: 'Module 2: Environmental Protection & Green Belt',
    maxPts: 25,
    items: [
      { id: 'm2_1', title: 'Afforestation & Sapling Survival', desc: 'Tree plantation along 7.5m barrier zone with >80% survival rate', max: 10, current: 8 },
      { id: 'm2_2', title: 'Water Harvesting & Runoff Management', desc: 'Settling ponds, check dams, and pit rainwater recycling systems', max: 6, current: 5 },
      { id: 'm2_3', title: 'Dust Suppression on Haul Roads', desc: 'Dedicated pressurized water tankers & automated mist sprinklers', max: 5, current: 4 },
      { id: 'm2_4', title: 'Air & Noise Monitoring', desc: 'Quarterly ambient air quality and noise monitoring reports submitted', max: 4, current: 4 },
    ]
  },
  {
    id: 'm3',
    name: 'Module 3: Health, Safety & DGMS Compliance',
    maxPts: 20,
    items: [
      { id: 'm3_1', title: 'DGMS 8-Register Compliance', desc: 'Up-to-date Forms A, B, C, J, vocational and attendance records', max: 8, current: 7 },
      { id: 'm3_2', title: 'Periodical Medical Examinations (PME)', desc: '100% workforce undergone mandatory occupational health screening', max: 5, current: 4 },
      { id: 'm3_3', title: 'Vocational Training (Rule 28)', desc: 'Safety refresher training courses conducted at VTC for miners', max: 4, current: 4 },
      { id: 'm3_4', title: 'Zero Fatal Accident Track Record', desc: 'Zero reportable fatalities or major dangerous occurrences in FY', max: 3, current: 3 },
    ]
  },
  {
    id: 'm4',
    name: 'Module 4: CSR, DMF & Community Welfare',
    maxPts: 15,
    items: [
      { id: 'm4_1', title: 'Drinking Water & Sanitation in Buffer Zone', desc: 'RO water purification plants and sanitation provided to local villages', max: 5, current: 4 },
      { id: 'm4_2', title: 'Healthcare & Skill Development', desc: 'Free medical camps and local youth vocational sponsorships', max: 5, current: 4 },
      { id: 'm4_3', title: 'District Mineral Foundation (DMF) Cess', desc: '100% timely payment of monthly DMF contributions into State Fund', max: 5, current: 5 },
    ]
  },
  {
    id: 'm5',
    name: 'Module 5: Digital Monitoring & Boundary Protection',
    maxPts: 10,
    items: [
      { id: 'm5_1', title: 'DGPS Boundary Pillars & Demarcation', desc: 'All boundary pillars geo-referenced and intact per IBM guidelines', max: 4, current: 4 },
      { id: 'm5_2', title: 'Automated Weighbridge & RFID e-Pass', desc: 'Gross/tare automated load-cells integrated with State e-Permit portal', max: 3, current: 3 },
      { id: 'm5_3', title: 'Timely Electronic Returns (MTS)', desc: 'Zero late filings for MCDR Form F-1 monthly and annual returns', max: 3, current: 3 },
    ]
  }
];

const StarRatingView = memo(function StarRatingView({ activeMine }) {
  const [modules, setModules] = useState(INITIAL_MODULES);

  // Compute total score
  const totalScore = modules.reduce((sum, mod) => {
    return sum + mod.items.reduce((s, item) => s + (item.current || 0), 0);
  }, 0);

  const percentage = totalScore; // out of 100 max

  // Determine Predicted Star Rating
  let ratingInfo = {
    stars: 5,
    label: '5-STAR EXCELLENCE (HIGHEST RECOGNITION)',
    badgeColor: '#e8a020',
    starDisplay: '★★★★★',
    bg: 'rgba(232, 160, 32, 0.15)',
    border: 'rgba(232, 160, 32, 0.4)',
    desc: 'Qualifies for official Ministry of Mines 5-Star Annual Award ceremony in New Delhi.'
  };

  if (percentage < 60) {
    ratingInfo = {
      stars: 2,
      label: 'BELOW 3-STAR (ACTION REQUIRED)',
      badgeColor: '#ef4444',
      starDisplay: '★★☆☆☆',
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.4)',
      desc: 'Immediate remediation required in environmental and systematic mining parameters.'
    };
  } else if (percentage < 75) {
    ratingInfo = {
      stars: 3,
      label: '3-STAR COMMENDATION',
      badgeColor: '#f59e0b',
      starDisplay: '★★★☆☆',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.4)',
      desc: 'Compliant with statutory minimums, but requires points in afforestation and CSR to advance.'
    };
  } else if (percentage < 85) {
    ratingInfo = {
      stars: 4,
      label: '4-STAR HIGH PERFORMANCE',
      badgeColor: '#00b4d8',
      starDisplay: '★★★★☆',
      bg: 'rgba(0, 180, 216, 0.15)',
      border: 'rgba(0, 180, 216, 0.4)',
      desc: 'Near 5-Star tier. Only ' + (85 - percentage) + ' more points needed to achieve 5-Star rating.'
    };
  }

  const handleScoreChange = (modId, itemId, newScore) => {
    const val = Number(newScore);
    setModules((prev) =>
      prev.map((mod) => {
        if (mod.id !== modId) return mod;
        return {
          ...mod,
          items: mod.items.map((item) => {
            if (item.id !== itemId) return item;
            return { ...item, current: Math.min(item.max, Math.max(0, val)) };
          })
        };
      })
    );
  };

  const handlePrintAssessment = () => {
    window.print();
  };

  const handleResetToBaseline = () => {
    setModules(INITIAL_MODULES);
    toast('Scorecard reset to audit baseline', 'info');
  };

  return (
    <section className="page active" id="page-star-rating">
      <div className="page-header">
        <div className="page-title-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>★</span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--mono, monospace)', fontWeight: 600, color: '#e8a020', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              MCDR 2017 &bull; Rule 35 Framework
            </span>
          </div>
          <h1>Sustainable Mining 5-Star Rating Evaluator</h1>
          <p className="page-sub">
            Self-assessment model for Indian Bureau of Mines (IBM) Sustainable Development Framework (SDF) audit
          </p>
        </div>
        <div className="page-actions">
          <button className="btn-ghost" onClick={handleResetToBaseline}>Reset</button>
          <button className="btn-primary" onClick={handlePrintAssessment}>🖨️ Print Self-Assessment</button>
        </div>
      </div>

      {/* STAR RATING SCORECARD HERO */}
      <div style={{
        background: 'var(--bg-card, #0f172a)',
        border: `1px solid ${ratingInfo.border}`,
        borderRadius: '12px',
        padding: '24px 28px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text2, #94a3b8)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
            PREDICTED IBM STAR RATING EVALUATION &bull; LEASE #{activeMine?.leaseNumber || 'ML-4821'}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
            <span style={{ fontSize: '38px', fontWeight: 800, color: ratingInfo.badgeColor, letterSpacing: '2px' }}>
              {ratingInfo.starDisplay}
            </span>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>
              {totalScore} <span style={{ fontSize: '14px', fontWeight: 500, color: '#94a3b8' }}>/ 100 Points ({percentage}%)</span>
            </span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: '#cbd5e1' }}>
            {ratingInfo.label} &mdash; {ratingInfo.desc}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
          <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
            Scale: <strong>85+ (5-Star)</strong> &bull; <strong>75-84 (4-Star)</strong> &bull; <strong>60-74 (3-Star)</strong>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              width: `${percentage}%`,
              height: '100%',
              background: ratingInfo.badgeColor,
              borderRadius: '4px',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>
      </div>

      {/* MODULES ACCORDION GRID */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {modules.map((mod) => {
          const modTotal = mod.items.reduce((s, it) => s + (it.current || 0), 0);
          return (
            <div key={mod.id} style={{
              background: 'var(--bg-card, #0f172a)',
              border: '1px solid var(--border, #334155)',
              borderRadius: '10px',
              padding: '18px 22px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#fff' }}>
                  {mod.name}
                </h3>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#00b4d8', background: 'rgba(0,180,216,0.1)', padding: '3px 8px', borderRadius: '4px' }}>
                  {modTotal} / {mod.maxPts} Pts
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {mod.items.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: 'rgba(30, 41, 59, 0.4)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.04)'
                  }}>
                    <div style={{ flex: 1, paddingRight: '20px' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#f8fafc' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        {item.desc}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="range"
                        min="0"
                        max={item.max}
                        value={item.current}
                        onChange={(e) => handleScoreChange(mod.id, item.id, e.target.value)}
                        style={{ width: '90px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#e8a020', minWidth: '40px', textAlign: 'right' }}>
                        {item.current} / {item.max}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});

export default StarRatingView;
