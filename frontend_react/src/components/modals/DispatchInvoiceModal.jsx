import React, { useState } from 'react';
import { downloadInvoice } from '../../services/api';
import { toast } from '../../context/ToastContext';

// Converts a number to Indian numbering currency words (Lakhs, Crores)
function numberToIndianWords(num) {
  if (!num || isNaN(num) || num <= 0) return 'Zero Rupees Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
  }

  const integer = Math.floor(num);
  let str = '';

  const crore = Math.floor(integer / 10000000);
  const lakh = Math.floor((integer % 10000000) / 100000);
  const thousand = Math.floor((integer % 100000) / 1000);
  const hundred = Math.floor((integer % 1000) / 100);
  const rest = Math.floor(integer % 100);

  if (crore > 0) str += inWords(crore) + ' Crore ';
  if (lakh > 0) str += inWords(lakh) + ' Lakh ';
  if (thousand > 0) str += inWords(thousand) + ' Thousand ';
  if (hundred > 0) str += inWords(hundred) + ' Hundred ';
  if (rest > 0) str += (str ? 'and ' : '') + inWords(rest) + ' ';

  return 'Rupees ' + str.trim() + ' Only';
}

export default function DispatchInvoiceModal({ isOpen, onClose, dispatch, activeMine }) {
  if (!isOpen || !dispatch) return null;

  const dispatchDate = dispatch.dispatchedOn
    ? new Date(dispatch.dispatchedOn)
    : new Date();

  const formattedDate = dispatchDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Calculate base values (both new rupee schema & legacy fallback)
  const quantity = Number(dispatch.quantity) || 0;
  const grossSaleValue = Number(dispatch.saleValue) || Number(dispatch.grossSaleValue) || 0;
  const deductionPerUnit = Number(dispatch.deductionPerUnit) || Number(dispatch.deductionPerTonne) || 0;

  const totalDeduction = deductionPerUnit * quantity;
  const exMineTaxableValue = Math.max(0, grossSaleValue - totalDeduction);
  const unitRate = quantity > 0 ? (grossSaleValue / quantity) : 0;
  const exMineRate = quantity > 0 ? (exMineTaxableValue / quantity) : 0;

  // Customizable Bill Details State
  const defaultInvNo = `COS-INV-${dispatchDate.getFullYear()}-${String(dispatch.id || Math.floor(1000 + Math.random() * 9000)).slice(-5)}`;
  const [invoiceNo, setInvoiceNo] = useState(defaultInvNo);
  const [vehicleNo, setVehicleNo] = useState('KA-34-E-8421');
  const [weighbridgeSlip, setWeighbridgeSlip] = useState(`WB-${String(Date.now()).slice(-6)}`);
  const [transitPassNo, setTransitPassNo] = useState(`eTP-${dispatchDate.getFullYear()}-${String(Date.now()).slice(-5)}`);
  const [hsnCode, setHsnCode] = useState('2601'); // 2601 = Iron Ores
  const [gstRate, setGstRate] = useState(5); // 5% default for ores
  const [royaltyRate, setRoyaltyRate] = useState(15); // 15% standard MMDR Schedule II for Iron Ore
  const [dmfRate, setDmfRate] = useState(10); // 10% for auction or 30% for older leases
  const [nmetRate, setNmetRate] = useState(2); // 2% of royalty
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Financial Computations
  const royaltyAmount = (exMineTaxableValue * royaltyRate) / 100;
  const dmfAmount = (royaltyAmount * dmfRate) / 100;
  const nmetAmount = (royaltyAmount * nmetRate) / 100;
  const gstAmount = (grossSaleValue * gstRate) / 100;
  const totalPayable = grossSaleValue + royaltyAmount + dmfAmount + nmetAmount + gstAmount;

  const handlePrint = () => {
    window.print();
  };

  const handleServerPdf = async () => {
    if (!dispatch.id) {
      toast('Dispatch ID missing; use in-browser print', 'error');
      return;
    }
    const mineId = activeMine?.id || dispatch.mineId;
    if (!mineId) {
      toast('Active mine ID missing', 'error');
      return;
    }
    setIsDownloadingPdf(true);
    try {
      const res = await downloadInvoice(mineId, dispatch.id);
      if (!res.required) {
        toast('No server invoice required for this sale type', 'info');
      } else {
        toast('Invoice PDF downloaded', 'success');
      }
    } catch (e) {
      toast(e.message || 'Server PDF generation unavailable, using browser print', 'info');
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const mineralDisplayName = dispatch.mineralName || dispatch.mineral || activeMine?.mineral || 'Iron Ore';
  const gradeName = dispatch.grade || dispatch.mineralGrade || 'Standard Grade';
  const buyerName = dispatch.buyerName || 'Consignee / Buyer';
  const buyerRegNo = dispatch.buyerRegistrationNumber || dispatch.buyerIbmRegNo || 'N/A';
  const saleTypeLabel = (dispatch.type || dispatch.nature || 'DOMESTIC').replace(/_/g, ' ');

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      overflowY: 'auto'
    }}>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #statutory-invoice-printable, #statutory-invoice-printable * {
            visibility: visible !important;
          }
          #statutory-invoice-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-shadow: none !important;
            border: 1px solid #111 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
          }
          .no-print {
            display: none !important;
          }
          .modal-overlay {
            position: static !important;
            padding: 0 !important;
            background: none !important;
          }
        }
      `}</style>

      <div style={{
        backgroundColor: 'var(--card-bg, #0f172a)',
        color: 'var(--text, #f1f5f9)',
        borderRadius: '12px',
        border: '1px solid var(--border, #334155)',
        width: '100%',
        maxWidth: '860px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden'
      }}>
        {/* TOOLBAR (NO-PRINT) */}
        <div className="no-print" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border, #334155)',
          backgroundColor: 'rgba(15, 23, 42, 0.95)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>📄</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Statutory Mineral Tax Invoice & Dispatch Challan</h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text2, #94a3b8)' }}>
                Conforms with Rule 45 MCDR 2017 & Goods and Services Tax Act 2017
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handlePrint}
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
                cursor: 'pointer'
              }}
            >
              🖨️ Print / A4 PDF
            </button>
            <button
              onClick={handleServerPdf}
              disabled={isDownloadingPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '6px',
                backgroundColor: 'rgba(0, 180, 216, 0.15)',
                color: '#00b4d8',
                border: '1px solid rgba(0, 180, 216, 0.35)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: isDownloadingPdf ? 'not-allowed' : 'pointer'
              }}
            >
              {isDownloadingPdf ? '⏳ Generating…' : '⬇️ Server PDF'}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                color: 'var(--text2, #94a3b8)',
                border: '1px solid var(--border, #334155)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* CONTROLS BAR (QUICK TWEAKS BEFORE PRINT) */}
        <div className="no-print" style={{
          padding: '12px 20px',
          backgroundColor: 'rgba(30, 41, 59, 0.5)',
          borderBottom: '1px solid var(--border, #334155)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))',
          gap: '10px',
          fontSize: '11px'
        }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text2, #94a3b8)', marginBottom: '3px' }}>Invoice No.</label>
            <input
              type="text"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #475569', background: '#0f172a', color: '#fff', fontSize: '11px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text2, #94a3b8)', marginBottom: '3px' }}>Vehicle / Truck No</label>
            <input
              type="text"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #475569', background: '#0f172a', color: '#fff', fontSize: '11px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text2, #94a3b8)', marginBottom: '3px' }}>Weighbridge Slip</label>
            <input
              type="text"
              value={weighbridgeSlip}
              onChange={(e) => setWeighbridgeSlip(e.target.value)}
              style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #475569', background: '#0f172a', color: '#fff', fontSize: '11px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text2, #94a3b8)', marginBottom: '3px' }}>Transit Pass / eTP</label>
            <input
              type="text"
              value={transitPassNo}
              onChange={(e) => setTransitPassNo(e.target.value)}
              style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #475569', background: '#0f172a', color: '#fff', fontSize: '11px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text2, #94a3b8)', marginBottom: '3px' }}>GST Rate (%)</label>
            <select
              value={gstRate}
              onChange={(e) => setGstRate(Number(e.target.value))}
              style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #475569', background: '#0f172a', color: '#fff', fontSize: '11px' }}
            >
              <option value={5}>5% (Ores)</option>
              <option value={18}>18%</option>
              <option value={0}>0% (Exempt)</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text2, #94a3b8)', marginBottom: '3px' }}>Royalty (%)</label>
            <input
              type="number"
              value={royaltyRate}
              onChange={(e) => setRoyaltyRate(Number(e.target.value))}
              style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #475569', background: '#0f172a', color: '#fff', fontSize: '11px' }}
            />
          </div>
        </div>

        {/* PRINTABLE BILL CANVAS (STANDARD WHITE INVOICE SHEET) */}
        <div style={{ overflowY: 'auto', padding: '24px', flex: 1, backgroundColor: '#090e17' }}>
          <div
            id="statutory-invoice-printable"
            style={{
              backgroundColor: '#ffffff',
              color: '#111827',
              padding: '36px',
              borderRadius: '4px',
              fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
              fontSize: '12px',
              lineHeight: '1.45',
              maxWidth: '750px',
              margin: '0 auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              border: '1px solid #e5e7eb'
            }}
          >
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111827', paddingBottom: '14px', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: '#b45309', textTransform: 'uppercase' }}>
                  STATUTORY TAX INVOICE & DISPATCH CHALLAN
                </span>
                <h1 style={{ margin: '4px 0 2px', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                  {activeMine?.name || 'ComplianceOS Mining Enclave'}
                </h1>
                <div style={{ fontSize: '11.5px', color: '#4b5563' }}>
                  <strong>Mining Lease No:</strong> {activeMine?.leaseNumber || 'ML-STATUTORY-01'} &bull; <strong>IBM Reg. No:</strong> {activeMine?.ibmRegistration?.registrationNumber || 'IBM/38012/2026'}<br />
                  <strong>District:</strong> {activeMine?.district || 'Central District'}, <strong>State:</strong> {activeMine?.state || 'Karnataka'} &bull; <strong>Mineral:</strong> {mineralDisplayName}
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: '180px' }}>
                <span style={{ display: 'inline-block', padding: '3px 8px', background: '#fef3c7', color: '#92400e', fontWeight: 700, fontSize: '10px', borderRadius: '3px', marginBottom: '6px' }}>
                  TAX INVOICE
                </span>
                <div style={{ fontSize: '11.5px' }}>
                  <div><strong>Invoice No:</strong> {invoiceNo}</div>
                  <div><strong>Date:</strong> {formattedDate}</div>
                  <div><strong>State Code:</strong> 29</div>
                </div>
              </div>
            </div>

            {/* TWO COLUMN CONSIGNEE & DISPATCH PARTICULARS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '14px', marginBottom: '14px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                  CONSIGNEE / BUYER DETAILS
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{buyerName}</div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                  <strong>Buyer IBM Reg. No:</strong> {buyerRegNo}<br />
                  <strong>Nature of Sale:</strong> {saleTypeLabel}<br />
                  <strong>Place of Supply:</strong> {activeMine?.state || 'Local / Domestic'}
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                  DISPATCH & TRANSIT PARTICULARS
                </div>
                <div style={{ fontSize: '11px', color: '#475569' }}>
                  <div><strong>Vehicle / Truck No:</strong> {vehicleNo}</div>
                  <div><strong>Weighbridge Slip No:</strong> {weighbridgeSlip}</div>
                  <div><strong>e-Transit Pass (eTP) No:</strong> {transitPassNo}</div>
                  <div><strong>Dispatched Date:</strong> {formattedDate}</div>
                </div>
              </div>
            </div>

            {/* MINERAL LINE ITEMS TABLE */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '11.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', width: '35px' }}>#</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Mineral Description & Grade</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '70px' }}>HSN</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: '90px' }}>Qty (MT)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: '95px' }}>Rate (₹/MT)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: '110px' }}>Sale Value (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '10px', verticalAlign: 'top' }}>1</td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{mineralDisplayName} &bull; {gradeName}</div>
                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                      Mined mineral as per IBM Rule 45 statutory specification.
                    </div>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', verticalAlign: 'top' }}>{hsnCode}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, verticalAlign: 'top' }}>
                    {quantity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', verticalAlign: 'top' }}>
                    ₹{unitRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, verticalAlign: 'top' }}>
                    ₹{grossSaleValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* STATUTORY ASSESSABLE BREAKDOWN & LEVIES */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '18px' }}>
              <div style={{ fontSize: '10.5px', color: '#475569', backgroundColor: '#fafaf9', padding: '12px', borderRadius: '4px', border: '1px solid #e7e5e4' }}>
                <strong style={{ color: '#1c1917', fontSize: '11px' }}>Statutory Valuation Basis (MCDR 2017 & Rule 45):</strong>
                <ul style={{ margin: '6px 0 0 16px', padding: 0, lineHeight: '1.5' }}>
                  <li>Gross Dispatch Invoice Value: ₹{grossSaleValue.toLocaleString('en-IN')}</li>
                  <li>Allowable Beyond Mine-Head Deduction: ₹{totalDeduction.toLocaleString('en-IN')} (at ₹{deductionPerUnit}/MT)</li>
                  <li><strong>Assessable Ex-Mine Price (EMP):</strong> ₹{exMineRate.toFixed(2)}/MT (Total: ₹{exMineTaxableValue.toLocaleString('en-IN')})</li>
                  <li>Royalty computed under MMDR Act Second Schedule on Ex-Mine Value.</li>
                </ul>
              </div>

              {/* STATUTORY CALCULATION SUMMARY */}
              <div style={{ fontSize: '11.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                  <span>Gross Mineral Value:</span>
                  <span style={{ fontWeight: 600 }}>₹{grossSaleValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {totalDeduction > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#15803d' }}>
                    <span>Less: Beyond Mine-Head Freight:</span>
                    <span>-₹{totalDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>
                  <span>Statutory Royalty ({royaltyRate}%):</span>
                  <span>₹{royaltyAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                  <span>DMF ({dmfRate}% of Royalty):</span>
                  <span>₹{dmfAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                  <span>NMET ({nmetRate}% of Royalty):</span>
                  <span>₹{nmetAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                  <span>GST ({gstRate}%):</span>
                  <span>₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  marginTop: '6px',
                  borderTop: '2px solid #0f172a',
                  borderBottom: '2px solid #0f172a',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  color: '#0f172a'
                }}>
                  <span>TOTAL AMOUNT PAYABLE:</span>
                  <span>₹{totalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* AMOUNT IN WORDS */}
            <div style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', borderRadius: '4px', marginBottom: '22px', fontSize: '11px' }}>
              <strong>Amount Chargeable (in words):</strong> {numberToIndianWords(totalPayable)}
            </div>

            {/* STATUTORY DECLARATION */}
            <div style={{ fontSize: '9.5px', color: '#64748b', marginBottom: '26px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
              <strong>Declaration:</strong> Certified that all mineral dispatched under this invoice has been mined from lawful lease boundaries in compliance with the Mines and Minerals (Development and Regulation) Act, 1957 and Mineral Conservation and Development Rules, 2017. All statutory royalties, cess, and district contributions stand accounted for.
            </div>

            {/* SIGNATURES */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
              <div style={{ textAlign: 'center', width: '180px' }}>
                <div style={{ height: '38px' }}></div>
                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px', fontSize: '10.5px', fontWeight: 600 }}>
                  Weighbridge In-Charge
                </div>
              </div>
              <div style={{ textAlign: 'center', width: '180px' }}>
                <div style={{ height: '38px' }}></div>
                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px', fontSize: '10.5px', fontWeight: 600 }}>
                  Transporter / Driver's Signature
                </div>
              </div>
              <div style={{ textAlign: 'center', width: '200px' }}>
                <div style={{ height: '38px' }}></div>
                <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', fontSize: '10.5px', fontWeight: 700 }}>
                  For {activeMine?.name || 'ComplianceOS'}<br />
                  <span style={{ fontWeight: 400, fontSize: '9.5px', color: '#64748b' }}>Authorised Signatory / Mine Manager</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
