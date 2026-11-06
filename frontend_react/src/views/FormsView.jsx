import React, { memo } from 'react';

const FormsView = memo(function FormsView({ onOpenForm }) {
  return (
    <section className="page active" id="page-forms">
      <div className="page-header">
        <div className="page-title-block">
          <h1>IBM Forms Library</h1>
          <p className="page-sub">Auto-fill statutory returns from your production data</p>
        </div>
      </div>

      <div className="forms-grid">
        {/* FORM B / F-1 */}
        <div className="form-tile ready" onClick={() => onOpenForm('formb')}>
          <div className="ft-badge ready" id="badge-formb">READY TO FILE</div>
          <div className="ft-letter">F</div>
          <div className="ft-name">IBM Monthly Return</div>
          <div className="ft-desc">F-series return under MCDR 2017. Auto-filled from your production data.</div>
          <div className="ft-meta">
            <span id="formb-due">Due: 10th of every month</span>
            <span className="ft-autofill">Auto-filled ✓</span>
          </div>
          <button className="btn-primary full-w">Auto-Fill & Preview →</button>
        </div>

        {/* FORM C */}
        <div className="form-tile ready" onClick={() => onOpenForm('formc')}>
          <div className="ft-badge ready" id="badge-formc">READY TO FILE</div>
          <div className="ft-letter">C</div>
          <div className="ft-name">IBM Form C</div>
          <div className="ft-desc">Quarterly Return of Labour Employed under MCDR 2017. Auto-filled from shift logs.</div>
          <div className="ft-meta">
            <span id="formc-due">Due: End of Quarter</span>
            <span className="ft-autofill">Auto-filled ✓</span>
          </div>
          <button className="btn-primary full-w">Auto-Fill & Preview →</button>
        </div>

        {/* FORM J */}
        <div className="form-tile ready" onClick={() => onOpenForm('formj')}>
          <div className="ft-badge ready" id="badge-formj">READY TO FILE</div>
          <div className="ft-letter">J</div>
          <div className="ft-name">IBM Form J</div>
          <div className="ft-desc">Annual Return — Production, Employment & Wages. Auto-calculated across FY.</div>
          <div className="ft-meta">
            <span id="formj-due">Due: 1st July</span>
            <span className="ft-autofill">Auto-filled ✓</span>
          </div>
          <button className="btn-primary full-w">Auto-Fill & Preview →</button>
        </div>

        {/* FORM A */}
        <div className="form-tile ready" onClick={() => onOpenForm('forma')}>
          <div className="ft-badge ready" id="badge-forma">READY TO FILE</div>
          <div className="ft-letter">A</div>
          <div className="ft-name">IBM Form A</div>
          <div className="ft-desc">Annual Return — Mineral Production Statistics, reserves, and machinery usage.</div>
          <div className="ft-meta">
            <span id="forma-due">Due: 1st July</span>
            <span className="ft-autofill">Auto-filled ✓</span>
          </div>
          <button className="btn-primary full-w">Auto-Fill & Preview →</button>
        </div>
      </div>
    </section>
  );
});

export default FormsView;
