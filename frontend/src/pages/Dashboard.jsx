import React from 'react';
import './Dashboard.css';
import { Users, DollarSign, Activity, AlertTriangle, Bell, CheckCircle, Clock, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const trendData = [
    { name: 'Jan', retained: 240, churned: 40 },
    { name: 'Feb', retained: 280, churned: 30 },
    { name: 'Mar', retained: 250, churned: 45 },
    { name: 'Apr', retained: 320, churned: 25 },
    { name: 'May', retained: 340, churned: 18 },
    { name: 'Jun', retained: 380, churned: 12 },
  ];

  const riskData = [
    { name: 'Low Risk',    value: 65, color: '#6BAA75' },
    { name: 'Medium Risk', value: 25, color: '#C9A86A' },
    { name: 'High Risk',   value: 10, color: '#D97B7B' },
  ];

  const stats = [
    { title: 'Active Customers',   val: '7,043',  inc: '+124 this month',     type: 'positive', Icon: Users },
    { title: 'Retention ROI (Live)', val: '+ $0.0k', inc: '0 offers deployed',   type: 'positive', Icon: Zap },
    { title: 'Monthly Churn Rate', val: '2.8%',   inc: '−0.5% vs last month', type: 'positive', Icon: Activity },
    { title: 'High-Risk Accounts', val: '186',    inc: 'Requires action',     type: 'negative', Icon: AlertTriangle },
    { title: 'Annual Revenue Risk',val: '$42.5k', inc: '+$5.2k new exposure', type: 'negative', Icon: DollarSign },
  ];

  const [realData, setRealData] = useState([]);
  
  useEffect(() => {
    fetch('http://localhost:3000/api/data')
      .then(res => res.json())
      .then(data => setRealData(data))
      .catch(err => console.error("Dashboard fetch error:", err));
  }, []);

  // Calculate live impact stats
  const impactStats = useMemo(() => {
     // Retrieve offer history from local storage (matched with Customers.jsx logic)
     const history = JSON.parse(localStorage.getItem('ecoretain_offer_history') || '{}');
     const sentCount = Object.keys(history).length;
     const avgSaving = sentCount * 84; // Mock avg monthly spend saved per retention
     return { count: sentCount, savings: (avgSaving/1000).toFixed(1) };
  }, [realData]);

  // Update stats grid with live data
  const liveStats = [
    { title: 'Active Customers',   val: '7,043',  inc: '+124 this month',     type: 'positive', Icon: Users },
    { title: 'Retention ROI (Live)', val: `+$${impactStats.savings}k`, inc: `${impactStats.count} offers deployed`, type: 'positive', Icon: Zap },
    { title: 'Monthly Churn Rate', val: '2.8%',   inc: '−0.5% vs last month', type: 'positive', Icon: Activity },
    { title: 'Annual Revenue Risk',val: '$42.5k', inc: '+$5.2k new exposure', type: 'negative', Icon: DollarSign },
  ];

  const activities = useMemo(() => {
    if (!realData.length) return [];

    // Find top 3 highest risk churned/likely users for REAL alerts
    const alerts = realData
      .filter(c => c.churn === 1 || c.churn === 'Yes' || Number(c.cltv) > 75)
      .sort((a, b) => Number(b.spend) - Number(a.spend))
      .slice(0, 3)
      .map((c, i) => ({
        id: `alert-${i}`,
        type: 'alert',
        text: `Extreme Risk: ${c.name || 'Anonymous'} (#${c.id}) - $${c.spend}/mo at risk.`,
        icon: <AlertTriangle size={14} />,
        color: '#D97B7B',
        bg: '#FAEAEA',
        customerId: c.id
      }));

    const systemLogs = [
      { id: 'sys-1', type: 'info', text: `Sync complete: ${realData.length} records processed from DB.`, icon: <Activity size={14} />, color: '#4F7C82', bg: '#EBF5F6' },
      { id: 'sys-2', type: 'zap', text: `AI Optimizer identified ${realData.filter(c => Number(c.tenure) < 6).length} vulnerable new accounts.`, icon: <Zap size={14} />, color: '#7C5CBF', bg: '#F3EFFD' },
    ];

    return [...alerts, ...systemLogs];
  }, [realData]);

  const card  = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 130, damping: 18 } } };
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="page-header">
        <h1>Executive Overview</h1>
        <p>Real-time retention telemetry and churn risk distribution.</p>
      </div>

      {/* KPI Cards */}
      <motion.div className="stats-grid" variants={stagger} initial="hidden" animate="show">
        {liveStats.map(({ title, val, inc, type, Icon }, i) => (
          <motion.div key={i} className="stat-card" variants={card} whileHover={{ y: -3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-info">
                <h3>{title}</h3>
                <h2 className={title.includes('ROI') ? 'text-primary' : ''}>{val}</h2>
              </div>
              <div className="stat-icon">
                <Icon size={18} />
              </div>
            </div>
            <div className={`trend ${type}`}>{inc}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts */}
      <motion.div className="charts-grid" variants={stagger} initial="hidden" animate="show">

        {/* Trend */}
        <motion.div className="chart-card" variants={card}>
          <h3>Retention vs Churn Velocity</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Rolling 6-month historical comparison
          </p>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gRetained" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6BAA75" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6BAA75" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gChurned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#D97B7B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D97B7B" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', fontSize: '0.82rem' }}
                />
                <Area type="monotone" dataKey="retained" name="Retained" stroke="#6BAA75" strokeWidth={2} fillOpacity={1} fill="url(#gRetained)" />
                <Area type="monotone" dataKey="churned"  name="Churned"  stroke="#D97B7B" strokeWidth={2} fillOpacity={1} fill="url(#gChurned)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Donut */}
        <motion.div className="chart-card" variants={card}>
          <h3>Risk Distribution</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Segmented by ML prediction
          </p>
          <div className="chart-wrapper" style={{ display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', fontSize: '0.82rem' }}
                />
                <Pie
                  data={riskData}
                  cx="50%" cy="42%"
                  innerRadius={66}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend
                  iconType="circle" iconSize={9}
                  formatter={v => <span style={{ fontSize: '0.77rem', color: 'var(--text-muted)', fontWeight: 600 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </motion.div>

      {/* ── Activity Radar (Feed) ── */}
      <motion.div 
         className="dashboard-bottom-row"
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.4 }}
      >
        <div className="activity-card">
          <div className="activity-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="radar-icon-pulse">
                <Bell size={18} />
              </div>
              <div>
                <h3>Real-Time Risk Radar</h3>
                <p>Live stream of high-impact churn signals and AI actions.</p>
              </div>
            </div>
            <button className="view-all-btn">View All Intelligence</button>
          </div>

          <div className="activity-list">
             {activities.map((act) => (
                <div key={act.id} className="activity-item">
                   <div className="activity-icon-box" style={{ background: act.bg, color: act.color }}>
                      {act.icon}
                   </div>
                   <div className="activity-body">
                      <div className="activity-text">{act.text}</div>
                   </div>
                   {act.type === 'alert' && (
                     <button 
                        className="activity-action"
                        onClick={() => navigate(`/customers?search=${act.customerId}`)}
                     >
                        Investigate
                     </button>
                   )}
                </div>
             ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
