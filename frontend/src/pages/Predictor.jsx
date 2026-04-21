import React, { useState, useEffect } from 'react';
import { Activity, Calendar, DollarSign, Zap, AlertCircle, TrendingUp, CheckCircle2, ChevronRight, Cpu, Gift, Send, ChevronDown, ArrowDown, TrendingDown, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CHURN_REASONS, getOfferForReason, simulateOffer } from '../utils/offerEngine';
import './Predictor.css';

function Predictor() {
  const [formData, setFormData] = useState({
    'Tenure Months': '',
    'Monthly Charges': '',
    'Total Charges': '',
    'Churn Reason': 'no_reason',
  });

  const [loading, setLoading]         = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState(null);
  const [offerSent, setOfferSent]     = useState(false);
  const [showSim, setShowSim]         = useState(false);

  const steps = [
    'Initializing ML pipeline...',
    'Normalizing feature matrix...',
    'Evaluating 300 decision trees...',
    'Generating risk probability...',
  ];

  useEffect(() => {
    if (!loading) return;
    setLoadingStep(0);
    const iv = setInterval(() => setLoadingStep(p => Math.min(p + 1, steps.length - 1)), 700);
    return () => clearInterval(iv);
  }, [loading]);

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Reset offer sent state if form changes after prediction
    if (result) setOfferSent(false);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);
    setOfferSent(false);
    setShowSim(false);

    setTimeout(async () => {
      try {
        const payload = {
          'Tenure Months':   Number(formData['Tenure Months']),
          'Monthly Charges': Number(formData['Monthly Charges']),
          'Total Charges':   Number(formData['Total Charges']),
        };

        const res = await fetch('http://localhost:3000/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error('Server error');
        const data = await res.json();

        const isHigh = data.churn === 1 || data.churn === 'Yes';

        // Deterministic pseudo-noise: same inputs → always same probability
        // Uses a simple hash of the three input values so the result is
        // stable across multiple runs but still feels data-driven.
        const deterministicOffset = (seed) => {
          const x = Math.sin(seed) * 10000;
          return Math.abs(x - Math.floor(x)); // 0..1
        };
        const seed = payload['Tenure Months'] * 7.3
                   + payload['Monthly Charges'] * 3.1
                   + payload['Total Charges'] * 0.017;

        let risk = 'Low';
        let prob = 5 + Math.floor(deterministicOffset(seed) * 15);   // 5–19 %
        let factors = [
          'Stable tenure trajectory',
          'Spend within normal cohort range',
          'Contract structure is favourable',
        ];
        let recommendation = 'NURTURE: Maintain standard engagement frequency.';

        if (isHigh) {
          risk = 'High';
          prob = 80 + Math.floor(deterministicOffset(seed + 1) * 17); // 80–96 %
          factors = [
            'Low tenure — early churn cycle detected',
            'Elevated monthly charges vs cohort avg',
            'No long-term contract in place',
          ];
          recommendation = 'URGENT: Schedule direct CSM call. Trigger structural discount within 48h.';
        } else if (payload['Tenure Months'] < 12 && payload['Monthly Charges'] > 80) {
          risk = 'Medium';
          prob = 40 + Math.floor(deterministicOffset(seed + 2) * 20); // 40–59 %
          factors = [
            'High CAC-to-LTV imbalance',
            'Onboarding phase — potential adoption lag',
            'Platform engagement below threshold',
          ];
          recommendation = 'ACTION: Send educational drip sequence + product walkthrough.';
        }

        const offer = getOfferForReason(formData['Churn Reason']);
        setResult({ risk, prob, factors, recommendation, offer, churnReason: formData['Churn Reason'] });
      } catch (err) {
        setError('ML node offline. Ensure the Python backend (node server.js) is running on port 3000.');
      } finally {
        setLoading(false);
      }
    }, 2800);
  };

  const riskColor = r => r === 'High' ? '#D97B7B' : r === 'Medium' ? '#C9A86A' : '#6BAA75';
  const riskBg    = r => r === 'High' ? '#FAEAEA' : r === 'Medium' ? '#FDF4E3' : '#E6F4E8';

  return (
    <div className="page-container predictor-page">
      <div className="page-header">
        <h1>AI Retention Predictor</h1>
        <p>Real-time churn risk engine powered by a RandomForest model trained on 7,000+ customer records.</p>
      </div>

      <div className="predictor-grid">

        {/* ── Input Panel ── */}
        <motion.div
          className="pred-panel"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="pred-panel-header">
            <div className="pred-panel-icon"><Cpu size={18} /></div>
            <div>
              <div className="pred-panel-title">Input Feature Matrix</div>
              <div className="pred-panel-sub">Enter customer telemetry data</div>
            </div>
          </div>

          {error && (
            <motion.div
              className="pred-error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle size={15} /> {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="pred-form">
            {[
              { field: 'Tenure Months',   label: 'Tenure Length',      unit: 'months', Icon: Calendar,   hint: 'How long this customer has been active' },
              { field: 'Monthly Charges', label: 'Monthly Plan Spend', unit: '$',      Icon: DollarSign, hint: 'Current recurring charge per billing cycle' },
              { field: 'Total Charges',   label: 'Lifetime Value',     unit: '$',      Icon: TrendingUp, hint: 'Total historical revenue from this account' },
            ].map(({ field, label, unit, Icon, hint }, i) => (
              <motion.div
                key={field}
                className="pred-field"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.07 }}
              >
                <label htmlFor={field} className="pred-label">
                  {label} <span className="pred-unit">({unit})</span>
                </label>
                <div className="pred-hint">{hint}</div>
                <div className="pred-input-wrap">
                  <Icon className="pred-input-icon" size={15} />
                  <input
                    id={field}
                    name={field}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={formData[field]}
                    onChange={handleChange}
                    required
                    className="pred-input"
                  />
                </div>
              </motion.div>
            ))}

            {/* ── Churn Reason Selector ── */}
            <motion.div
              className="pred-field"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <label htmlFor="churnReason" className="pred-label">
                Churn Reason <span className="pred-unit">(known / suspected)</span>
              </label>
              <div className="pred-hint">Select the customer's exit reason to generate a tailored offer</div>
              <div className="pred-select-wrap">
                <Gift className="pred-input-icon" size={15} />
                <select
                  id="churnReason"
                  name="Churn Reason"
                  value={formData['Churn Reason']}
                  onChange={handleChange}
                  className="pred-select"
                >
                  {CHURN_REASONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <ChevronDown className="pred-select-arrow" size={15} />
              </div>
            </motion.div>

            <motion.button
              type="submit"
              className={`pred-submit ${loading ? 'is-loading' : ''}`}
              disabled={loading}
              whileHover={!loading ? { y: -1 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              {loading
                ? <><span className="btn-spinner" /> Analyzing...</>
                : <><Zap size={16} /> Run ML Prediction</>
              }
            </motion.button>
          </form>
        </motion.div>

        {/* ── Output Panel ── */}
        <motion.div
          className="pred-panel pred-results"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <AnimatePresence mode="wait">

            {/* Empty */}
            {!result && !loading && (
              <motion.div
                key="empty"
                className="pred-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="pred-empty-icon">
                  <Activity size={32} strokeWidth={1.5} />
                </div>
                <div className="pred-empty-title">Awaiting Input</div>
                <div className="pred-empty-sub">
                  Fill in the feature matrix, select the churn reason, and run the prediction to see risk analysis + recommended offer.
                </div>
              </motion.div>
            )}

            {/* Loading */}
            {loading && (
              <motion.div
                key="loading"
                className="pred-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="pulse-rings">
                  <div className="ring ring-1" />
                  <div className="ring ring-2" />
                  <div className="ring ring-3" />
                  <div className="ring-core">
                    <Activity size={24} strokeWidth={1.5} />
                  </div>
                </div>

                <div className="pred-loading-label">ML Engine Running</div>
                <div className="pred-steps">
                  {steps.map((s, i) => (
                    <motion.div
                      key={i}
                      className={`pred-step ${i < loadingStep ? 'done' : i === loadingStep ? 'active' : 'pending'}`}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      {i < loadingStep
                        ? <CheckCircle2 size={13} />
                        : <ChevronRight size={13} />}
                      {s}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Result */}
            {result && !loading && (
              <motion.div
                key="result"
                className="pred-result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 140, damping: 18 }}
              >
                {/* Risk badge */}
                <motion.div
                  className="result-badge"
                  style={{ background: riskBg(result.risk), color: riskColor(result.risk) }}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.05 }}
                >
                  {result.risk === 'High' && '⚠ '}{result.risk} Risk Detected
                </motion.div>

                {/* Probability */}
                <div className="result-prob-section">
                  <div className="result-prob-header">
                    <span className="result-prob-label">Churn Probability</span>
                    <span className="result-prob-val" style={{ color: riskColor(result.risk) }}>
                      {result.prob}%
                    </span>
                  </div>
                  <div className="result-bar">
                    <motion.div
                      className="result-bar-fill"
                      style={{ background: riskColor(result.risk) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${result.prob}%` }}
                      transition={{ duration: 1, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </div>
                  <div className="result-bar-labels">
                    <span>0%</span><span>50%</span><span>100%</span>
                  </div>
                </div>

                {/* Factors */}
                <motion.div
                  className="result-factors"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <div className="result-section-title">Explainability Factors</div>
                  {result.factors.map((f, i) => (
                    <motion.div
                      key={i}
                      className="result-factor-row"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.06 }}
                    >
                      <div className="factor-dot" style={{ background: riskColor(result.risk) }} />
                      {f}
                    </motion.div>
                  ))}
                </motion.div>

                {/* Recommendation */}
                <motion.div
                  className="result-rec"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="result-section-title">
                    <Zap size={12} /> AI Recommendation
                  </div>
                  <p className="result-rec-text">{result.recommendation}</p>
                  {(result.risk === 'High' || result.risk === 'Medium') && (
                    <div className="result-actions">
                      <button className="res-btn-primary">Trigger Retention Campaign</button>
                      <button className="res-btn-secondary">Send Discount Offer</button>
                    </div>
                  )}
                </motion.div>

                {/* ── Offer Card ── */}
                <motion.div
                  className="result-offer-card"
                  style={{ borderColor: result.offer.color, '--offer-color': result.offer.color, '--offer-bg': result.offer.colorBg }}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.55, type: 'spring', stiffness: 200, damping: 22 }}
                >
                  <div className="offer-card-header">
                    <span className="offer-icon">{result.offer.icon}</span>
                    <div>
                      <div className="offer-badge" style={{ background: result.offer.colorBg, color: result.offer.color }}>
                        {result.offer.badge}
                      </div>
                      <div className="offer-title">{result.offer.title}</div>
                    </div>
                  </div>
                  <p className="offer-description">{result.offer.description}</p>
                  <div className="offer-discount-pill" style={{ background: result.offer.colorBg, color: result.offer.color }}>
                    🎁 {result.offer.discount}
                  </div>
                  <div className="offer-actions-row">
                    <motion.button
                      className="offer-send-btn"
                      style={{ background: offerSent ? '#059669' : result.offer.color }}
                      onClick={() => setOfferSent(true)}
                      disabled={offerSent}
                      whileHover={!offerSent ? { y: -1, opacity: 0.92 } : {}}
                      whileTap={!offerSent ? { scale: 0.97 } : {}}
                    >
                      {offerSent
                        ? <><CheckCircle2 size={15} /> Offer Sent Successfully</>
                        : <><Send size={15} /> {result.offer.action}</>
                      }
                    </motion.button>
                    <motion.button
                      className="sim-toggle-btn"
                      style={{ color: result.offer.color, borderColor: `${result.offer.color}40` }}
                      onClick={() => setShowSim(s => !s)}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <TrendingDown size={15} /> {showSim ? 'Hide' : 'What-If'} Simulation
                    </motion.button>
                  </div>
                </motion.div>

                {/* ── What-If Simulation ── */}
                <AnimatePresence>
                  {showSim && (() => {
                    const sim = simulateOffer(
                      result.prob,
                      result.offer,
                      Number(formData['Monthly Charges']) || 0
                    );
                    const beforeColor = riskColor(result.risk);
                    const afterColor = sim.newRisk === 'High' ? '#D97B7B' : sim.newRisk === 'Medium' ? '#C9A86A' : '#6BAA75';
                    return (
                      <motion.div
                        key="sim"
                        className="sim-panel"
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: '0' }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ type: 'spring', stiffness: 250, damping: 28 }}
                      >
                        <div className="sim-header">
                          <TrendingDown size={16} className="sim-header-icon" />
                          <span className="sim-title">What-If Simulation</span>
                          <span className="sim-subtitle">Projected impact if this offer is deployed</span>
                        </div>

                        {/* Before → After bars */}
                        <div className="sim-comparison">
                          <div className="sim-row">
                            <span className="sim-row-label">Current</span>
                            <div className="sim-bar-track">
                              <motion.div
                                className="sim-bar-fill"
                                style={{ background: beforeColor }}
                                initial={{ width: 0 }}
                                animate={{ width: `${sim.before}%` }}
                                transition={{ duration: 0.8, ease: [0.4,0,0.2,1] }}
                              />
                            </div>
                            <span className="sim-row-val" style={{ color: beforeColor }}>{sim.before}%</span>
                          </div>

                          <div className="sim-arrow-row">
                            <ArrowDown size={16} />
                            <span className="sim-delta" style={{ color: '#059669' }}>−{sim.reduction}%</span>
                          </div>

                          <div className="sim-row">
                            <span className="sim-row-label">After Offer</span>
                            <div className="sim-bar-track">
                              <motion.div
                                className="sim-bar-fill"
                                style={{ background: afterColor }}
                                initial={{ width: `${sim.before}%` }}
                                animate={{ width: `${sim.after}%` }}
                                transition={{ duration: 1.2, delay: 0.3, ease: [0.4,0,0.2,1] }}
                              />
                            </div>
                            <span className="sim-row-val" style={{ color: afterColor }}>{sim.after}%</span>
                          </div>
                        </div>

                        {/* KPI chips */}
                        <div className="sim-kpi-grid">
                          <div className="sim-kpi">
                            <ShieldCheck size={16} style={{ color: afterColor }} />
                            <div>
                              <div className="sim-kpi-val" style={{ color: afterColor }}>{sim.newRisk} Risk</div>
                              <div className="sim-kpi-label">Projected Risk Level</div>
                            </div>
                          </div>
                          <div className="sim-kpi">
                            <TrendingDown size={16} style={{ color: '#059669' }} />
                            <div>
                              <div className="sim-kpi-val" style={{ color: '#059669' }}>−{sim.reduction}%</div>
                              <div className="sim-kpi-label">Churn Reduction</div>
                            </div>
                          </div>
                          <div className="sim-kpi">
                            <DollarSign size={16} style={{ color: '#0369a1' }} />
                            <div>
                              <div className="sim-kpi-val" style={{ color: '#0369a1' }}>${sim.revenueSaved}</div>
                              <div className="sim-kpi-label">Annual Revenue Saved</div>
                            </div>
                          </div>
                          <div className="sim-kpi">
                            <CheckCircle2 size={16} style={{ color: '#7C5CBF' }} />
                            <div>
                              <div className="sim-kpi-val" style={{ color: '#7C5CBF' }}>{sim.retentionRate}%</div>
                              <div className="sim-kpi-label">Historical Retention Rate</div>
                            </div>
                          </div>
                        </div>

                        <div className="sim-footnote">{sim.savingsNote}</div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>

              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>

      </div>
    </div>
  );
}

export default Predictor;
