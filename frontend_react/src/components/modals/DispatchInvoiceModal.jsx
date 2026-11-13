import React, { useState } from 'react';
import html2pdf from 'html2pdf.js';
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

export default function DispatchInvoiceModal({ isOpen, onClose, dispatch, activeMine, buyerName, mineralName }) {
  if (!isOpen || !dispatch) return null;

  const dispatchDate = dispatch.dispatchedOn ? new Date(dispatch.dispatchedOn) : new Date();

  const formattedDate = dispatchDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const quantity = Number(dispatch.quantity) || 0;
  const grossSaleValue = Number(dispatch.saleValue) || 0;
  const deductionPerUnit = Number(dispatch.deductionPerUnit) || 0;
  const totalDeduction = deductionPerUnit * quantity;
  const exMineTaxableValue = Math.max(0, grossSaleValue - totalDeduction);
  const unitRate = quantity > 0 ? grossSaleValue / quantity : 0;
  const exMineRate = quantity > 0 ? exMineTaxableValue / quantity : 0;

  // Customizable Bill Details State
  const defaultInvNo = `COS-INV-${dispatchDate.getFullYear()}-${String(dispatch.id || Math.floor(1000 + Math.random() * 9000)).slice(-5)}`;
  const [invoiceNo, setInvoiceNo] = useState(defaultInvNo);
  const [vehicleNo, setVehicleNo] = useState('RJ-14-GA-9421');
  const [weighbridgeSlip, setWeighbridgeSlip] = useState(`WB-${String(Date.now()).slice(-6)}`);
  const [transitPassNo, setTransitPassNo] = useState(`eTP-${dispatchDate.getFullYear()}-${String(Date.now()).slice(-5)}`);
  const [hsnCode, setHsnCode] = useState('2601');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Financial Computations (from stored liability or standard rates)
  const liability = dispatch.liability || {};
  const royaltyAmount = liability.royaltyAmount > 0 ? liability.royaltyAmount : (exMineTaxableValue * 0.15);
  const dmfAmount = liability.dmfAmount > 0 ? liability.dmfAmount : (royaltyAmount * 0.10);
  const nmetAmount = liability.nmetAmount > 0 ? liability.nmetAmount : (royaltyAmount * 0.02);
  const gstAmount = liability.gstAmount > 0 ? liability.gstAmount : (grossSaleValue * 0.05);
  const totalPayable = grossSaleValue + royaltyAmount + dmfAmount + nmetAmount + gstAmount;

  // 1. ISOLATED CLEAN PRINT ENGINE
  const handlePrint = () => {
    const printableNode = document.getElementById('statutory-invoice-printable');
    if (!printableNode) return;

    const printWindow = window.open('', '_blank', 'width=950,height=1100');
    if (!printWindow) {
      window.print();
      return;
    }

    const invoiceHtml = printableNode.innerHTML;
    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Tax Invoice - ${invoiceNo}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body {
            margin: 0; padding: 0; background: #ffffff !important; color: #111827 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            font-size: 11pt; line-height: 1.4;
          }
        </style>
      </head>
      <body>
        ${invoiceHtml}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 450);
  };

  // 2. VECTOR A4 PDF DOWNLOAD (Tries backend first, fallback seamlessly to client-side vector A4)
  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      if (activeMine?.id && dispatch.id) {
        try {
          const res = await downloadInvoice(activeMine.id, dispatch.id);
          if (res.required) {
            toast('Official invoice PDF downloaded from server', 'success');
            setIsDownloadingPdf(false);
            return;
          }
        } catch {
          // Backend endpoint unavailable; proceed smoothly to client-side vector PDF
        }
      }

      const element = document.getElementById('statutory-invoice-printable');
      if (!element) throw new Error('Invoice element not found');

      const opt = {
        margin: [8, 8, 8, 8],
        filename: `${invoiceNo}_Tax_Invoice.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      const html2pdfLib = typeof html2pdf === 'function' ? html2pdf : (html2pdf && html2pdf.default ? html2pdf.default : window.html2pdf);
      if (!html2pdfLib) throw new Error('PDF library not ready');

      await html2pdfLib().set(opt).from(element).save();
      toast('Statutory Tax Invoice PDF generated successfully', 'success');
    } catch (err) {
      toast('Failed to generate PDF: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const sellerName = activeMine?.name || 'Mine Lease Operations';
  const sellerGstin = activeMine?.gstin || '08AABCT1234F1Z8';
  const sellerState = activeMine?.state ? activeMine.state.replace(/_/g, ' ') : 'Rajasthan';
  const buyerDisplayName = buyerName || dispatch.buyerId || 'Registered Buyer';

  return (
    <div
      className="modal-overlay"
      id="modal-dispatch-invoice"
      style={{ display: 'flex' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal-box large"
        style={{
          maxWidth: '920px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: 'var(--bg1, #0f172a)',
          color: 'var(--text0, #f8fafc)',
        }}
      >
        {/* MODAL CONTROL HEADER */}
        <div
          style={{
            padding: '14px 22px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg2, #1e293b)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge-tag" style={{ background: '#10b98122', color: '#10b981', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>
                FORM GST INV-1 &bull; MCDR RULE 45
              </span>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Statutory Mineral Tax Invoice &amp; Dispatch Challan</h2>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text2, #94a3b8)' }}>
              Official pre-validated tax invoice &bull; Date: {formattedDate} &bull; Dispatch ID: {dispatch.id}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn-ghost" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              🖨️ Print
            </button>
            <button
              className="btn-primary"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              📥 {isDownloadingPdf ? 'Generating PDF…' : 'Download A4 PDF'}
            </button>
            <button className="modal-close" onClick={onClose} style={{ marginLeft: '6px' }}>✕</button>
          </div>
        </div>

        {/* METADATA CONFIGURATION STRIP */}
        <div
          style={{
            padding: '10px 22px',
            background: 'var(--bg3, #1e293b99)',
            borderBottom: '1px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '12px',
          }}
        >
          <div className="fg" style={{ margin: 0 }}>
            <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text2)' }}>Invoice Number</label>
            <input
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              style={{ padding: '4px 8px', fontSize: '12px', height: '30px' }}
            />
          </div>
          <div className="fg" style={{ margin: 0 }}>
            <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text2)' }}>Vehicle Number</label>
            <input
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
              style={{ padding: '4px 8px', fontSize: '12px', height: '30px', textTransform: 'uppercase' }}
            />
          </div>
          <div className="fg" style={{ margin: 0 }}>
            <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text2)' }}>Weighbridge Slip</label>
            <input
              value={weighbridgeSlip}
              onChange={(e) => setWeighbridgeSlip(e.target.value)}
              style={{ padding: '4px 8px', fontSize: '12px', height: '30px' }}
            />
          </div>
          <div className="fg" style={{ margin: 0 }}>
            <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text2)' }}>e-Transit Pass / E-Way Bill</label>
            <input
              value={transitPassNo}
              onChange={(e) => setTransitPassNo(e.target.value)}
              style={{ padding: '4px 8px', fontSize: '12px', height: '30px' }}
            />
          </div>
          <div className="fg" style={{ margin: 0 }}>
            <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text2)' }}>HSN / SAC Code</label>
            <input
              value={hsnCode}
              onChange={(e) => setHsnCode(e.target.value)}
              style={{ padding: '4px 8px', fontSize: '12px', height: '30px' }}
            />
          </div>
        </div>

        {/* PRINTABLE A4 INVOICE SHEET */}
        <div style={{ overflowY: 'auto', padding: '24px', flex: 1, background: '#334155' }}>
          <div
            id="statutory-invoice-printable"
            style={{
              width: '100%',
              maxWidth: '800px',
              margin: '0 auto',
              background: '#ffffff',
              color: '#0f172a',
              padding: '28px 34px',
              borderRadius: '4px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
              fontSize: '11px',
              lineHeight: '1.45',
            }}
          >
            {/* INVOICE TITLE HEADER */}
            <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#0f172a' }}>
                  TAX INVOICE &bull; DISPATCH CHALLAN
                </h1>
                <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                  Issued under Section 31 of CGST Act, 2017 &bull; Rule 45 of Mineral Conservation and Development Rules, 2017
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{invoiceNo}</div>
                <div style={{ fontSize: '11px', color: '#475569' }}>Dated: <strong>{formattedDate}</strong></div>
                <div style={{ fontSize: '9.5px', color: '#16a34a', fontWeight: 600 }}>ORIGINAL FOR RECIPIENT</div>
              </div>
            </div>

            {/* SELLER & BUYER GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '12px', marginBottom: '14px', background: '#f8fafc' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }}>
                  1. Details of Supplier / Mine Lessee:
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{sellerName}</div>
                <div>Lease No: <strong>{activeMine?.leaseNumber || 'ML-STATUTORY-01'}</strong></div>
                <div>GSTIN / Unique ID: <strong>{sellerGstin}</strong></div>
                <div>State: <strong>{sellerState}</strong> &bull; District: {activeMine?.district || '—'}</div>
                <div>IBM Registration No: <strong>{activeMine?.ibmRegistration?.registrationNumber || 'IBM/MINE/STATUTORY'}</strong></div>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }}>
                  2. Details of Buyer / Consignee:
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{buyerDisplayName}</div>
                <div>Sale Type: <strong>{(dispatch.type || 'DOMESTIC').replace(/_/g, ' ')}</strong></div>
                <div>Vehicle No: <strong>{vehicleNo}</strong></div>
                <div>Weighbridge Slip: <strong>{weighbridgeSlip}</strong></div>
                <div>e-Transit Pass / E-Way Bill: <strong>{transitPassNo}</strong></div>
              </div>
            </div>

            {/* LINE ITEMS TABLE */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', width: '30px' }}>#</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Description of Mineral</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', width: '70px' }}>Grade</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', width: '60px' }}>HSN</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', width: '80px' }}>Qty (MT)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', width: '90px' }}>Rate (₹/MT)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', width: '110px' }}>Gross Value (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ padding: '8px' }}>1</td>
                  <td style={{ padding: '8px' }}>
                    <strong>{mineralName || dispatch.mineral || 'ROM Mineral Ore'}</strong>
                    <div style={{ fontSize: '9.5px', color: '#64748b' }}>Dispatched from Pit-Head / Mine Stockpile</div>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{dispatch.grade || 'Standard'}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{hsnCode}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>₹{unitRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>₹{grossSaleValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>

            {/* FINANCIAL & STATUTORY COMPUTATIONS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginBottom: '16px' }}>
              {/* MCDR RULE 45 EX-MINE PRICE COMPUTATION */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '10px 12px', background: '#f8fafc', fontSize: '10.5px' }}>
                <div style={{ fontWeight: 700, textTransform: 'uppercase', color: '#0f172a', marginBottom: '6px', borderBottom: '1px solid #cbd5e1', paddingBottom: '3px' }}>
                  MCDR 2017 Rule 45 &mdash; Ex-Mine Price Breakout
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span>Gross Sale Value:</span>
                  <span>₹{grossSaleValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: totalDeduction > 0 ? '#16a34a' : '#64748b' }}>
                  <span>Less Freight/Handling Beyond Mine-Head:</span>
                  <span>-₹{totalDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #cbd5e1', fontWeight: 700, color: '#0f172a' }}>
                  <span>Ex-Mine Taxable Value (EMP Base):</span>
                  <span>₹{exMineTaxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#0284c7', fontWeight: 600 }}>
                  <span>Derived Ex-Mine Price (EMP / MT):</span>
                  <span>₹{exMineRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / MT</span>
                </div>
              </div>

              {/* STATUTORY TAX & LEVY COMPUTATION */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '10px 12px', background: '#f8fafc', fontSize: '10.5px' }}>
                <div style={{ fontWeight: 700, textTransform: 'uppercase', color: '#0f172a', marginBottom: '6px', borderBottom: '1px solid #cbd5e1', paddingBottom: '3px' }}>
                  Statutory Levies &amp; Net Payable
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span>Statutory Royalty (MMDR Sched II):</span>
                  <span>₹{royaltyAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span>DMF Contribution (MMDR S.9B):</span>
                  <span>₹{dmfAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span>NMET Contribution (MMDR S.9C 2%):</span>
                  <span>₹{nmetAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span>GST (CGST + SGST / IGST):</span>
                  <span>₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '2px solid #0f172a', fontWeight: 800, fontSize: '12.5px', color: '#0f172a' }}>
                  <span>TOTAL AMOUNT PAYABLE:</span>
                  <span>₹{totalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* AMOUNT IN WORDS */}
            <div style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', borderRadius: '4px', marginBottom: '14px', fontSize: '10.5px' }}>
              <strong>Amount Chargeable (in words):</strong> {numberToIndianWords(totalPayable)}
            </div>

            {/* STATUTORY DECLARATION */}
            <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
              <strong>Statutory Declaration:</strong> Certified that all mineral dispatched under this invoice has been lawfully extracted from sanctioned mining lease coordinates in compliance with the Mines and Minerals (Development and Regulation) Act, 1957, MCDR 2017, and applicable State Mineral Transit Rules. All statutory royalties and district contributions stand accounted for.
            </div>

            {/* SIGNATURE BLOCKS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px dashed #cbd5e1' }}>
              <div style={{ textAlign: 'center', width: '160px' }}>
                <div style={{ height: '32px' }}></div>
                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px', fontSize: '10px', fontWeight: 600 }}>
                  Weighbridge In-Charge
                </div>
              </div>
              <div style={{ textAlign: 'center', width: '160px' }}>
                <div style={{ height: '32px' }}></div>
                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px', fontSize: '10px', fontWeight: 600 }}>
                  Driver / Transporter
                </div>
              </div>
              <div style={{ textAlign: 'center', width: '200px' }}>
                <div style={{ height: '32px' }}></div>
                <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', fontSize: '10px', fontWeight: 700 }}>
                  For {sellerName}<br />
                  <span style={{ fontWeight: 400, fontSize: '9px', color: '#64748b' }}>Authorised Signatory / Mine Manager</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

