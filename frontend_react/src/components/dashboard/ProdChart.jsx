import React, { useEffect, useRef, useState, memo } from 'react';

const ProdChart = memo(function ProdChart({
  data = [],
  chartType = 'both',
  onChartTypeChange,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const animFrameRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [highlightSeries, setHighlightSeries] = useState(null);

  const prodData = data.map((m) => Number(m.produced) || 0);
  const dispData = data.map((m) => Number(m.dispatched) || 0);
  const labels = data.map((m) => m.label || m.month);

  // Totals for the 4-stat strip
  const totalProd = prodData.reduce((a, b) => a + b, 0);
  const totalDisp = dispData.reduce((a, b) => a + b, 0);
  const netStock = totalProd - totalDisp;
  const avgDispatchRate = totalProd > 0 ? Math.round((totalDisp / totalProd) * 100) : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !data.length) return;

    const ctx = canvas.getContext('2d');

    const updateDimensions = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = container.offsetWidth || 600;
      const cssHeight = 170;
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      if (ctx.resetTransform) ctx.resetTransform();
      ctx.scale(dpr, dpr);
      renderChart(1);
    };

    const showProd = chartType === 'both' || chartType === 'produced';
    const showDisp = chartType === 'both' || chartType === 'dispatched';

    let activeData = [];
    if (showProd) activeData.push(...prodData);
    if (showDisp) activeData.push(...dispData);
    const rawMax = Math.max(...activeData, 0);

    const baseMax = rawMax > 0 ? rawMax : 100;
    const niceFactor = Math.pow(10, Math.floor(Math.log10(baseMax)));
    const norm = baseMax / niceFactor;
    let mult = 2;
    if (norm <= 1) mult = 1.25;
    else if (norm <= 2) mult = 2.5;
    else if (norm <= 5) mult = 6;
    else mult = 12;
    const max = Math.max(mult * niceFactor, 10);

    const pad = { t: 26, r: 24, b: 26, l: 48 };
    const cssWidth = container.offsetWidth || 600;
    const cssHeight = 170;
    const cW = cssWidth - pad.l - pad.r;
    const cH = cssHeight - pad.t - pad.b;
    const n = labels.length;

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const gridStroke = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
    const textMuted = isLight ? '#64748b' : 'rgba(142,168,204,0.7)';

    const renderChart = (progress) => {
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      // 1. Grid lines and Y labels
      ctx.strokeStyle = gridStroke;
      ctx.lineWidth = 1;
      ctx.fillStyle = textMuted;
      ctx.font = '9px IBM Plex Mono, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      for (let i = 0; i <= 4; i++) {
        const y = pad.t + cH * (1 - i / 4);
        ctx.beginPath();
        ctx.moveTo(pad.l, y);
        ctx.lineTo(pad.l + cW, y);
        ctx.stroke();

        const val = Math.round((max * i) / 4);
        const labelStr =
          val >= 1000
            ? (val / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 }) + 'k'
            : String(val);
        ctx.fillText(labelStr, pad.l - 6, y);
      }

      // 2. Hover column highlight backdrop band
      if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < n) {
        const step = n > 1 ? cW / (n - 1) : cW;
        const bandW = Math.min(step * 0.76, 56);
        const hX = pad.l + (n > 1 ? (hoverIndex / (n - 1)) * cW : cW / 2);

        ctx.save();
        ctx.fillStyle = isLight ? 'rgba(0,0,0,0.038)' : 'rgba(255,255,255,0.045)';
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(hX - bandW / 2, pad.t, bandW, cH, 6);
          ctx.fill();
        } else {
          ctx.fillRect(hX - bandW / 2, pad.t, bandW, cH);
        }
        ctx.restore();
      }

      // 3. Month labels
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let i = 0; i < n; i++) {
        const x = pad.l + (n > 1 ? (i / (n - 1)) * cW : cW / 2);
        const isHov = hoverIndex === i;
        ctx.fillStyle = isHov ? (isLight ? '#0f172a' : '#ffffff') : textMuted;
        ctx.font = (isHov ? 'bold ' : '') + '9.5px IBM Plex Mono, monospace';
        ctx.fillText(labels[i], x, cssHeight - 16);
      }

      const ease = 1 - Math.pow(1 - progress, 3);

      const getPoints = (dataArr) =>
        dataArr.map((val, i) => {
          const x = pad.l + (n > 1 ? (i / (n - 1)) * cW : cW / 2);
          const targetY = pad.t + cH * (1 - val / max);
          const baselineY = pad.t + cH;
          const y = baselineY - (baselineY - targetY) * ease;
          return { x, y, val };
        });

      const drawLineAndArea = (pts, strokeColor, fillColor, shadowColor, isHighlighted, isDimmed) => {
        if (!pts || !pts.length) return;

        const alphaMult = isDimmed ? 0.2 : 1;
        const lineWidth = isHighlighted ? 3.4 : isDimmed ? 1.4 : 2.5;
        const shadowB = isHighlighted ? 12 : isDimmed ? 0 : 6;

        // Fill Area
        ctx.save();
        ctx.globalAlpha = alphaMult;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pad.t + cH);
        ctx.lineTo(pts[0].x, pts[0].y);
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[i];
          const p1 = pts[i + 1];
          const xc = (p0.x + p1.x) / 2;
          const yc = (p0.y + p1.y) / 2;
          ctx.quadraticCurveTo(p0.x, p0.y, xc, yc);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.lineTo(pts[pts.length - 1].x, pad.t + cH);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.restore();

        // Stroke Line
        ctx.save();
        ctx.globalAlpha = alphaMult;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[i];
          const p1 = pts[i + 1];
          const xc = (p0.x + p1.x) / 2;
          const yc = (p0.y + p1.y) / 2;
          ctx.quadraticCurveTo(p0.x, p0.y, xc, yc);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowColor = shadowColor || strokeColor;
        ctx.shadowBlur = shadowB;
        ctx.stroke();
        ctx.restore();
      };

      const isProdHl = highlightSeries === 'produced';
      const isDispHl = highlightSeries === 'dispatched';
      const isProdDim = isDispHl;
      const isDispDim = isProdHl;

      // Draw Dispatch line (Cyan #00b4d8)
      if (showDisp) {
        const gradDisp = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH);
        gradDisp.addColorStop(0, 'rgba(0, 180, 216, 0.22)');
        gradDisp.addColorStop(1, 'rgba(0, 180, 216, 0.00)');
        const dispPts = getPoints(dispData);
        drawLineAndArea(dispPts, '#00b4d8', gradDisp, 'rgba(0, 180, 216, 0.4)', isDispHl, isDispDim);
      }

      // Draw Production line (Amber #f0a500)
      if (showProd) {
        const gradProd = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH);
        gradProd.addColorStop(0, 'rgba(240, 165, 0, 0.25)');
        gradProd.addColorStop(1, 'rgba(240, 165, 0, 0.00)');
        const prodPts = getPoints(prodData);
        drawLineAndArea(prodPts, '#f0a500', gradProd, 'rgba(240, 165, 0, 0.4)', isProdHl, isProdDim);
      }

      // Draw Dots / Halos
      const drawDots = (pts, color, isDimmed) => {
        pts.forEach((pt, i) => {
          const isHov = hoverIndex === i;
          const dotRadius = isHov ? 5.5 : 3.5;

          ctx.save();
          ctx.globalAlpha = isDimmed ? 0.25 : 1;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, dotRadius, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, Math.max(1, dotRadius - 1.8), 0, Math.PI * 2);
          ctx.fillStyle = isLight ? '#ffffff' : '#0f172a';
          ctx.fill();
          ctx.restore();
        });
      };

      if (showDisp) drawDots(getPoints(dispData), '#00b4d8', isDispDim);
      if (showProd) drawDots(getPoints(prodData), '#f0a500', isProdDim);
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateDimensions);
    });
    resizeObserver.observe(container);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
    };
  }, [data, chartType, hoverIndex, highlightSeries]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const tt = tooltipRef.current;
    if (!canvas || !container || !tt || !data.length) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const pad = { t: 26, r: 24, b: 26, l: 48 };
    const cW = rect.width - pad.l - pad.r;
    const n = data.length;

    if (mouseX < pad.l - 15 || mouseX > pad.l + cW + 15) {
      setHoverIndex(null);
      tt.classList.add('hidden');
    } else {
      const step = n > 1 ? cW / (n - 1) : cW;
      const idx = Math.max(0, Math.min(n - 1, Math.round((mouseX - pad.l) / step)));
      setHoverIndex(idx);

      const hX = pad.l + (n > 1 ? (idx / (n - 1)) * cW : cW / 2);
      const clampedLeft = Math.max(95, Math.min(rect.width - 95, hX));
      tt.style.left = `${clampedLeft}px`;
      tt.classList.remove('hidden');
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    if (tooltipRef.current) tooltipRef.current.classList.add('hidden');
  };

  const hoveredItem = hoverIndex !== null ? data[hoverIndex] : null;
  const hProd = hoveredItem ? Number(hoveredItem.produced) || 0 : 0;
  const hDisp = hoveredItem ? Number(hoveredItem.dispatched) || 0 : 0;
  const hRate = hProd > 0 ? Math.round((hDisp / hProd) * 100) : 0;
  const hBalance = hProd - hDisp;

  return (
    <div>
      <div className="card-head">
        <h3>Production & Dispatch — Last 6 Months</h3>
        <div className="chart-toggle">
          <button
            className={`ct-btn ${chartType === 'both' ? 'active' : ''}`}
            onClick={() => onChartTypeChange('both')}
          >
            Both
          </button>
          <button
            className={`ct-btn ${chartType === 'produced' ? 'active' : ''}`}
            onClick={() => onChartTypeChange('produced')}
          >
            Production
          </button>
          <button
            className={`ct-btn ${chartType === 'dispatched' ? 'active' : ''}`}
            onClick={() => onChartTypeChange('dispatched')}
          >
            Dispatch
          </button>
        </div>
      </div>

      <div
        className="chart-area"
        ref={containerRef}
        style={{ position: 'relative', width: '100%', height: 170 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <canvas id="prod-chart" ref={canvasRef} style={{ display: 'block', width: '100%', height: 170, cursor: 'crosshair' }} />

        {/* FLOATING INTERACTIVE TOOLTIP */}
        <div ref={tooltipRef} className="chart-tooltip hidden" id="chart-tooltip">
          {hoveredItem && (
            <>
              <div className="tt-header">
                <span className="tt-month">{hoveredItem.label || hoveredItem.month}</span>
                <span className="tt-badge">{hRate}% dispatched</span>
              </div>
              {(chartType === 'both' || chartType === 'produced') && (
                <div className="tt-row">
                  <span className="tt-dot prod" />
                  <span className="tt-label">Production</span>
                  <span className="tt-val">{hProd.toLocaleString()} MT</span>
                </div>
              )}
              {(chartType === 'both' || chartType === 'dispatched') && (
                <div className="tt-row">
                  <span className="tt-dot disp" />
                  <span className="tt-label">Dispatched</span>
                  <span className="tt-val">{hDisp.toLocaleString()} MT</span>
                </div>
              )}
              {chartType === 'both' && (
                <>
                  <div className="tt-divider" />
                  <div className="tt-footer">
                    <span>Balance:</span>
                    <span className={`tt-gap ${hBalance >= 0 ? 'surplus' : 'deficit'}`}>
                      {hBalance >= 0 ? `+${hBalance.toLocaleString()}` : hBalance.toLocaleString()} MT
                    </span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* 4-METRIC BOTTOM SUMMARY STRIP */}
      <div className="chart-stats-strip">
        <div
          className={`cs-item ${highlightSeries === 'produced' ? 'active' : ''}`}
          onClick={() => setHighlightSeries(highlightSeries === 'produced' ? null : 'produced')}
        >
          <span className="cs-label">
            <span className="legend-line mini" style={{ background: '#f0a500' }} />
            6M Production
          </span>
          <span className="cs-val">{totalProd.toLocaleString()} MT</span>
        </div>

        <div
          className={`cs-item ${highlightSeries === 'dispatched' ? 'active' : ''}`}
          onClick={() => setHighlightSeries(highlightSeries === 'dispatched' ? null : 'dispatched')}
        >
          <span className="cs-label">
            <span className="legend-line mini" style={{ background: '#00b4d8' }} />
            6M Dispatches
          </span>
          <span className="cs-val">{totalDisp.toLocaleString()} MT</span>
        </div>

        <div className="cs-item">
          <span className="cs-label">Net Balance</span>
          <span className="cs-val" style={{ color: netStock >= 0 ? 'var(--green, #10b981)' : 'var(--red, #ef4444)' }}>
            {netStock >= 0 ? `+${netStock.toLocaleString()}` : netStock.toLocaleString()} MT
          </span>
        </div>

        <div className="cs-item">
          <span className="cs-label">Dispatch Rate</span>
          <span className="cs-val" style={{ color: 'var(--amber, #f0a500)' }}>
            {avgDispatchRate}%
          </span>
        </div>
      </div>
    </div>
  );
});

export default ProdChart;
