import React, { useState } from 'react';
import html2pdf from 'html2pdf.js';
import { toast } from '../../context/ToastContext';

export default function DgmsInspectionPackModal({ isOpen, onClose, activeMine, activeMineMinerals, score, verdict, note, scores }) {
  if (!isOpen) return null;

  const [isExporting, setIsExporting] = useState(false);
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const packRef = `DGMS-PACK-${now.getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

  const mineName = activeMine?.name || 'ComplianceOS Mining Enclave';
  const leaseNo = activeMine?.leaseNumber || activeMine?.code || 'ML-4821/A';
  const state = activeMine?.state || 'Karnataka';
  const district = activeMine?.district || 'Bellary';
  const mineral = activeMineMinerals || activeMine?.mineral || 'Iron Ore';

  // 1. ISOLATED CLEAN PRINT ENGINE
  const handlePrint = () => {
    const printableNode = document.getElementById('dgms-pack-printable');
    if (!printableNode) return;

    const printWindow = window.open('', '_blank', 'width=950,height=1100');
    if (!printWindow) {
      window.print();
      return;
    }

    const packHtml = printableNode.innerHTML;
    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>DGMS Statutory Safety Inspection Pack - ${packRef}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            color: #111827 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 10.5pt;
            line-height: 1.45;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            font-size: 10pt;
          }
          th {
            background: #f1f5f9;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div style="max-width: 100%; margin: 0 auto;">
          ${packHtml}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 600);
            }, 250);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 2. CLIENT-SIDE A4 PDF DOWNLOAD
  const handleDownloadPdf = async () => {
    const element = document.getElementById('dgms-pack-printable');
    if (!element) return;
    setIsExporting(true);
    toast('Generating DGMS Inspection Pack PDF...', 'info');

    try {
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `DGMS_Inspection_Pack_${leaseNo.replace(/[^a-zA-Z0-9]/g, '_')}_${now.getFullYear()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
      toast('DGMS Inspection Pack downloaded successfully!', 'success');
    } catch (err) {
      console.error('PDF export error:', err);
      handlePrint();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: 'var(--bg-card, #0f172a)',
        border: '1px solid var(--border, #334155)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '860px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
        overflow: 'hidden'
      }}>
        {/* TOOLBAR */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 22px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid var(--border, #334155)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🛡️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                DGMS Statutory Safety Inspection Pack
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text2, #94a3b8)' }}>
                Directorate General of Mines Safety &bull; Dhanbad &bull; Ministry of Labour & Employment
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '6px',
                backgroundColor: '#e8a020',
                color: '#050810',
                fontWeight: 600,
                fontSize: '12px',
                border: 'none',
                cursor: isExporting ? 'not-allowed' : 'pointer'
              }}
            >
              {isExporting ? '⏳ Generating…' : '⬇️ Download Pack PDF'}
            </button>
            <button
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '6px',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #475569',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🖨️ Print
            </button>
            <button
              onClick={onClose}
              style={{ padding: '7px 12px', borderRadius: '6px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', fontSize: '12px', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* PRINTABLE PACK CANVAS */}
        <div style={{ overflowY: 'auto', padding: '24px', flex: 1, backgroundColor: '#090e17' }}>
          <div
            id="dgms-pack-printable"
            style={{
              backgroundColor: '#ffffff',
              color: '#111827',
              padding: '36px',
              borderRadius: '4px',
              fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
              fontSize: '11.5px',
              lineHeight: '1.45',
              maxWidth: '760px',
              margin: '0 auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              border: '1px solid #e5e7eb'
            }}
          >
            {/* HEADER */}
            <div style={{ borderBottom: '2.5px solid #0f172a', paddingBottom: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#dc2626', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    DIRECTORATE GENERAL OF MINES SAFETY &bull; GOVT OF INDIA
                  </span>
                  <h1 style={{ margin: '4px 0 2px', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                    STATUTORY SAFETY & AUDIT READINESS DOSSIER
                  </h1>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Conforming with Mines Act 1952, MMR 1961, and Mines Rules 1955
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'inline-block', padding: '3px 8px', background: '#fee2e2', color: '#991b1b', fontWeight: 700, fontSize: '10px', borderRadius: '3px', marginBottom: '4px' }}>
                    DGMS AUDIT PACK
                  </span>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    <div><strong>Pack Ref:</strong> {packRef}</div>
                    <div><strong>Audit Date:</strong> {formattedDate}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* OVERALL READINESS SCORE BANNER */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              backgroundColor: score >= 80 ? '#f0fdf4' : '#fffbeb',
              border: `1.5px solid ${score >= 80 ? '#86efac' : '#fde68a'}`,
              borderRadius: '6px',
              marginBottom: '16px'
            }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 800, color: score >= 80 ? '#166534' : '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  OVERALL DGMS SAFETY READINESS VERDICT
                </span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: score >= 80 ? '#15803d' : '#b45309', marginTop: '2px' }}>
                  {score}/100 &mdash; {verdict}
                </div>
                <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '3px' }}>
                  {note}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '32px', fontWeight: 800, color: score >= 80 ? '#15803d' : '#b45309' }}>
                  {score}%
                </span>
              </div>
            </div>

            {/* SECTION 1: MINE IDENTIFICATION */}
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #0f172a', paddingBottom: '3px', marginBottom: '8px', textTransform: 'uppercase' }}>
              1. Mine Particulars & Safety Administration
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '14px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '25%', background: '#f8fafc', fontWeight: 600, padding: '5px 8px', border: '1px solid #e2e8f0' }}>Name of Mine:</td>
                  <td style={{ width: '25%', padding: '5px 8px', border: '1px solid #e2e8f0' }}>{mineName}</td>
                  <td style={{ width: '25%', background: '#f8fafc', fontWeight: 600, padding: '5px 8px', border: '1px solid #e2e8f0' }}>Lease Number:</td>
                  <td style={{ width: '25%', padding: '5px 8px', border: '1px solid #e2e8f0' }}>{leaseNo}</td>
                </tr>
                <tr>
                  <td style={{ background: '#f8fafc', fontWeight: 600, padding: '5px 8px', border: '1px solid #e2e8f0' }}>Location:</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{district}, {state}</td>
                  <td style={{ background: '#f8fafc', fontWeight: 600, padding: '5px 8px', border: '1px solid #e2e8f0' }}>Major Mineral:</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{mineral}</td>
                </tr>
                <tr>
                  <td style={{ background: '#f8fafc', fontWeight: 600, padding: '5px 8px', border: '1px solid #e2e8f0' }}>Statutory Management:</td>
                  <td colSpan="3" style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>
                    First Class Mines Manager (F.C.C.) Appointed under Reg. 34 &bull; Safety Officer Certified under Reg. 43.
                  </td>
                </tr>
              </tbody>
            </table>

            {/* SECTION 2: STATUTORY 8 REGISTERS TABLE */}
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #0f172a', paddingBottom: '3px', marginBottom: '8px', textTransform: 'uppercase' }}>
              2. DGMS Statutory Safety Registers & Decay Audit
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '14px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Register Title & Code</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Governing Rule</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>Last Updated</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>Score</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>Audit Status</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((r, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                      {r.register.title}
                    </td>
                    <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', color: '#4b5563', fontSize: '10px' }}>
                      {r.register.notes || 'DGMS Circular'}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                      {r.register.lastUpdatedAt ? new Date(r.register.lastUpdatedAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #e2e8f0', fontWeight: 700 }}>
                      {r.score}/100
                    </td>
                    <td style={{
                      padding: '6px 8px',
                      textAlign: 'center',
                      border: '1px solid #e2e8f0',
                      color: r.status === 'GREEN' ? '#15803d' : r.status === 'AMBER' ? '#b45309' : '#dc2626',
                      fontWeight: 700,
                      fontSize: '10px'
                    }}>
                      {r.status === 'GREEN' ? '✓ UP TO DATE' : `${r.daysSinceUpdate}d OVERDUE`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* SECTION 3: WORKFORCE & PME SCREENING */}
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #0f172a', paddingBottom: '3px', marginBottom: '8px', textTransform: 'uppercase' }}>
              3. Occupational Health, Accidents & Emergency Preparedness
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '10.5px', marginBottom: '14px' }}>
              <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                <div><strong>Accident Record (Sec 23):</strong> Zero Fatalities / Reportable Serious Accidents in FY</div>
                <div><strong>Periodical Medical Exams:</strong> 100% Active Workforce Cleared (Rule 29B)</div>
                <div><strong>First Aid Room:</strong> Stocked with Full Oxygen Cylinders & Approved Stretcher</div>
              </div>
              <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                <div><strong>Safety Committee:</strong> Monthly Joint Meeting Log Signed by Workmen Inspector</div>
                <div><strong>Vocational Training:</strong> 100% Certified at Approved DGMS Center</div>
                <div><strong>Explosive Magazine:</strong> PESO License Valid; Daily Magazine Register Reconciled</div>
              </div>
            </div>

            {/* SIGNATURE BLOCK */}
            <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '16px', marginTop: '18px' }}>
              <div style={{ fontSize: '10px', color: '#475569', marginBottom: '22px' }}>
                <strong>Statutory Declaration:</strong> Certified that all safety logs, registers, and occupational records are kept in the custody of the Mines Manager in accordance with Section 48 of the Mines Act, 1952 and Metalliferous Mines Regulations, 1961.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
                <div style={{ width: '180px' }}>
                  <div style={{ height: '36px' }}></div>
                  <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', fontSize: '10.5px', fontWeight: 700 }}>
                    First Class Mines Manager<br />
                    <span style={{ fontSize: '9px', fontWeight: 400, color: '#64748b' }}>For {mineName}</span>
                  </div>
                </div>

                <div style={{ width: '180px' }}>
                  <div style={{ height: '36px' }}></div>
                  <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', fontSize: '10.5px', fontWeight: 700 }}>
                    Safety Officer (MMR Reg. 43)<br />
                    <span style={{ fontSize: '9px', fontWeight: 400, color: '#64748b' }}>Certified Competent Person</span>
                  </div>
                </div>

                <div style={{ width: '200px' }}>
                  <div style={{ height: '36px' }}></div>
                  <div style={{ borderTop: '1.5px dashed #0f172a', paddingTop: '4px', fontSize: '10.5px', fontWeight: 700 }}>
                    Director / Deputy Director of Mines Safety<br />
                    <span style={{ fontSize: '9px', fontWeight: 400, color: '#64748b' }}>DGMS Regional Office</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
