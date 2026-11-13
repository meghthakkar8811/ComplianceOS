import React, { memo } from 'react';

const FormsView = memo(function FormsView({ onOpenForm }) {
  return (
    <section className="page active" id="page-forms">
      <div className="page-header">
        <div className="page-title-block">
          <h1>IBM Forms Library</h1>
          <p className="page-sub">Preview ledger summaries and record statutory IBM filing acknowledgements</p>
        </div>
      </div>

      <div className="forms-grid">
        {/* FORM F-1 (METALLIC) */}
        <div className="form-tile ready" onClick={() => onOpenForm('formb')}>
          <div className="ft-badge ready" id="badge-formb">MONTHLY &bull; METALLIC</div>
          <div className="ft-letter">F1</div>
          <div className="ft-name">Form F-1 Monthly Return</div>
          <div className="ft-desc">Metallic minerals (Iron Ore, Bauxite, Manganese, Copper, Chromite, Gold) under MCDR 2017 Rule 45.</div>
          <div className="ft-meta">
            <span id="formb-due">Due: 10th of month</span>
            <span className="ft-autofill">Ledger Preview</span>
          </div>
          <button className="btn-primary full-w">Preview &amp; Log Filing →</button>
        </div>

        {/* FORM F-2 (NON-METALLIC) */}
        <div className="form-tile ready" onClick={() => onOpenForm('formf2')}>
          <div className="ft-badge ready" style={{ background: '#00b4d822', color: '#00b4d8', borderColor: '#00b4d855' }}>
            MONTHLY &bull; NON-METALLIC
          </div>
          <div className="ft-letter" style={{ color: '#00b4d8' }}>F2</div>
          <div className="ft-name">Form F-2 Monthly Return</div>
          <div className="ft-desc">Non-metallic &amp; industrial minerals (Limestone, Dolomite, Silica, Gypsum) with end-use industry allocation.</div>
          <div className="ft-meta">
            <span>Due: 10th of month</span>
            <span className="ft-autofill">Industry Breakdown</span>
          </div>
          <button className="btn-primary full-w" style={{ background: '#00b4d8', borderColor: '#00b4d8' }}>Preview &amp; Log Filing →</button>
        </div>

        {/* FORM C */}
        <div className="form-tile ready" onClick={() => onOpenForm('formc')}>
          <div className="ft-badge ready" id="badge-formc">QUARTERLY</div>
          <div className="ft-letter">C</div>
          <div className="ft-name">IBM Form C</div>
          <div className="ft-desc">Quarterly Return of Labour Employed under MCDR 2017 from LaborDay &amp; LaborPayroll logs.</div>
          <div className="ft-meta">
            <span id="formc-due">Due: End of Quarter</span>
            <span className="ft-autofill">Ledger Preview</span>
          </div>
          <button className="btn-primary full-w">Preview &amp; Log Filing →</button>
        </div>

        {/* FORM J */}
        <div className="form-tile ready" onClick={() => onOpenForm('formj')}>
          <div className="ft-badge ready" id="badge-formj">ANNUAL</div>
          <div className="ft-letter">J</div>
          <div className="ft-name">IBM Form J</div>
          <div className="ft-desc">Annual Return — Opening Stock, Production, Dispatches, Employment &amp; Wages across FY.</div>
          <div className="ft-meta">
            <span id="formj-due">Due: 1st July</span>
            <span className="ft-autofill">Ledger Preview</span>
          </div>
          <button className="btn-primary full-w">Preview &amp; Log Filing →</button>
        </div>

        {/* FORM A */}
        <div className="form-tile ready" onClick={() => onOpenForm('forma')}>
          <div className="ft-badge ready" id="badge-forma">ANNUAL</div>
          <div className="ft-letter">A</div>
          <div className="ft-name">IBM Form A</div>
          <div className="ft-desc">Annual Return — Lease Metadata, Sanctioned Capacity, and FY Production &amp; Dispatch Summary.</div>
          <div className="ft-meta">
            <span id="forma-due">Due: 1st July</span>
            <span className="ft-autofill">Ledger Preview</span>
          </div>
          <button className="btn-primary full-w">Preview &amp; Log Filing →</button>
        </div>
      </div>
    </section>
  );
});

export default FormsView;
