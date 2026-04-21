import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid 
} from 'recharts';
import { 
  AlertTriangle, TrendingUp, Info, ArrowRight, 
  Zap, Users, DollarSign, Activity, FileText
} from 'lucide-react';
import { inferReasonKey, getOfferForReason } from '../utils/offerEngine';
import './ChurnIntel.css';

const ChurnIntel = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simParams, setSimParams] = useState({ price: 0, service: 0, competitor: 0 });

  useEffect(() => {
    fetch('http://localhost:3000/api/data')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch intel data:", err);
        setLoading(false);
      });
  }, []);

  // Process data for charts
  const stats = useMemo(() => {
    if (!data.length) return null;

    const churnedUsers = data.filter(c => c.churn === 1 || c.churn === 'Yes');
    const totalChurned = churnedUsers.length;

    // Group by churn reason
    const reasonCounts = {};
    churnedUsers.forEach(user => {
      const reason = user.churnReason || 'Not Specified';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    // Map to normalized categories from offerEngine for explanation
    const categoryStats = {};
    churnedUsers.forEach(user => {
      const key = inferReasonKey(user.churnReason || '');
      if (!categoryStats[key]) {
        const offerInfo = getOfferForReason(key);
        categoryStats[key] = {
          key,
          label: user.churnReason || (key === 'no_reason' ? 'General' : key.replace('_', ' ')),
          count: 0,
          revenue: 0,
          offer: offerInfo
        };
      }
      categoryStats[key].count += 1;
      categoryStats[key].revenue += Number(user.spend || 0);
    });

    // Chart Data
    const chartData = Object.values(categoryStats)
      .sort((a, b) => b.count - a.count)
      .map(item => ({
        name: item.offer.badge || item.label,
        count: item.count,
        revenue: Math.round(item.revenue),
        percentage: ((item.count / totalChurned) * 100).toFixed(1)
      }));

    // Global Simulator Projection
    const projectedRecovery = Object.values(categoryStats).reduce((acc, cat) => {
      let recoveryFactor = 0;
      if (cat.key === 'price') recoveryFactor = simParams.price / 100;
      if (cat.key === 'service_dissatisfaction') recoveryFactor = simParams.service / 100;
      if (cat.key === 'competitor') recoveryFactor = simParams.competitor / 100;
      
      const recovered = cat.revenue * recoveryFactor;
      return acc + recovered;
    }, 0);

    return {
      totalChurned,
      chartData,
      categories: Object.values(categoryStats).sort((a, b) => b.count - a.count),
      projectedRecovery: Math.round(projectedRecovery)
    };
  }, [data, simParams]);

  const COLORS = ['#4F7C82', '#7C5CBF', '#B45309', '#0369a1', '#0f766e', '#9f1239', '#4d7c0f', '#64748b'];

  if (loading) return (
    <div className="intel-loading">
      <Activity size={40} className="spin-anim" />
      <p>Analyzing behavioral churn patterns...</p>
    </div>
  );

  return (
    <div className="page-container churn-intel-page">
      <header className="page-header">
        <h1>Churn Intelligence & Diagnostics</h1>
        <p>A deep-dive analysis into why customers leave and the financial weight of each churn trigger.</p>
      </header>

      {!stats ? (
        <div className="no-data">No behavioral data found.</div>
      ) : (
        <div className="intel-grid">
          
          {/* ── Top Row: Summary Stats ── */}
          <div className="intel-stats-row">
            <div className="stat-pill">
              <Users size={16} />
              <span>Total Lost Accounts: <strong>{stats.totalChurned}</strong></span>
            </div>
            <div className="stat-pill">
              <DollarSign size={16} />
              <span>Monthly Attrition Revenue: <strong>${Math.round(stats.chartData.reduce((acc, curr) => acc + curr.revenue, 0)).toLocaleString()}</strong></span>
            </div>
          </div>

          {/* ── Middle Row: Charts ── */}
          <div className="intel-charts-container">
            <motion.div 
               className="intel-card chart-card"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
            >
              <div className="card-header">
                <BarChart3 size={18} />
                <h3>Distribution by Churn Reason</h3>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.chartData} layout="vertical" margin={{ left: 40, right: 40, top: 20, bottom: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      tick={{ fontSize: 11, fontWeight: 500 }} 
                      width={120}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {stats.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div 
              className="intel-card chart-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="card-header">
                <PieChartIcon size={18} />
                <h3>Revenue Impact Share (%)</h3>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.chartData}
                      dataKey="revenue"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {stats.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* ── Strategy Optimizer (Global simulator) ── */}
          <motion.div 
            className="intel-card simulator-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
             <div className="card-header">
                <Zap size={18} />
                <h3>Global Strategy Optimizer</h3>
             </div>
             <div className="simulator-body">
                <div className="sim-sliders">
                   <div className="sim-field">
                      <div className="lbl-row">
                         <span>Improve Price Value</span>
                         <span className="val-hi">{simParams.price}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="100" value={simParams.price} 
                        onChange={e => setSimParams({...simParams, price: Number(e.target.value)})}
                      />
                   </div>
                   <div className="sim-field">
                      <div className="lbl-row">
                         <span>Service Quality Uplift</span>
                         <span className="val-hi">{simParams.service}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="100" value={simParams.service} 
                        onChange={e => setSimParams({...simParams, service: Number(e.target.value)})}
                      />
                   </div>
                   <div className="sim-field">
                      <div className="lbl-row">
                         <span>Competitive Counter-Attack</span>
                         <span className="val-hi">{simParams.competitor}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="100" value={simParams.competitor} 
                        onChange={e => setSimParams({...simParams, competitor: Number(e.target.value)})}
                      />
                   </div>
                </div>

                <div className="sim-projection">
                   <div className="proj-box">
                      <div className="proj-label">Projected Monthly Recovery</div>
                      <div className="proj-value">${stats.projectedRecovery.toLocaleString()}</div>
                      <div className="proj-sub">Based on current churn volume</div>
                   </div>
                   <div className="proj-chart">
                      <ResponsiveContainer width="100%" height={100}>
                         <PieChart>
                            <Pie 
                               data={[
                                  { name: 'Recovered', value: stats.projectedRecovery },
                                  { name: 'Remaining Risk', value: Math.max(1, Math.round(stats.chartData.reduce((a,c)=>a+c.revenue, 0)) - stats.projectedRecovery) }
                               ]} 
                               innerRadius={30} outerRadius={45} dataKey="value" stroke="none"
                            >
                               <Cell fill="var(--accent)" />
                               <Cell fill="#E2E8F0" />
                            </Pie>
                         </PieChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             </div>
          </motion.div>

          {/* ── Bottom Row: Explanatory Breakdown ── */}
          <div className="intel-breakdown-section">
            <div className="section-title">
              <Info size={16} />
              <h2>Churn Pattern Explainability & Strategy</h2>
            </div>

            <div className="explanation-grid">
              {stats.categories.map((cat, i) => (
                <motion.div 
                  key={cat.key} 
                  className="explanation-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  style={{ borderLeftColor: cat.offer.color }}
                >
                  <div className="explanation-header">
                    <span className="reason-icon">{cat.offer.icon}</span>
                    <div className="reason-identifiers">
                      <span className="reason-label">{cat.offer.badge}</span>
                      <h4 className="reason-title">{cat.label}</h4>
                    </div>
                    <div className="reason-metrics">
                      <div className="metric">
                        <span className="val">{cat.count}</span>
                        <span className="lbl">lost users</span>
                      </div>
                    </div>
                  </div>

                  <p className="reason-description">
                    <strong>The Trigger:</strong> This segment is primarily driven by {cat.label.toLowerCase()} complaints. 
                    Historically, this represents the #{i+1} most common exit path.
                  </p>

                  <div className="strategic-reco">
                    <div className="reco-label">
                      <Zap size={13} />
                      AI Strategic Response
                    </div>
                    <p className="reco-text">{cat.offer.description}</p>
                    <div className="reco-offer-card" style={{ background: cat.offer.colorBg, color: cat.offer.color }}>
                      <span className="offer-tag">Recommended:</span>
                      <span className="offer-val">{cat.offer.title}</span>
                    </div>
                  </div>

                  <div className="impact-stats">
                    <div className="imp-stat">
                      <TrendingUp size={14} />
                      <span>{cat.offer.retentionRate}% recovery rate</span>
                    </div>
                    <div className="imp-stat">
                      <AlertTriangle size={14} />
                      <span>Avg. loss: ${Math.round(cat.revenue / cat.count)}/mo</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

// Simple icons for things Recharts needs or I missed
const BarChart3 = ({size}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>;
const PieChartIcon = ({size}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>;

export default ChurnIntel;
