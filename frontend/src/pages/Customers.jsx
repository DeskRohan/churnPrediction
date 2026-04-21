import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useLocation } from 'react-router-dom';
import './Customers.css';
import { Search, Activity, ArrowUpDown, Send, X, AlertTriangle, Zap, Info, RefreshCw, MapPin, CreditCard, FileText, CheckCircle, Gift, TrendingDown, ShieldCheck, ArrowDown } from 'lucide-react';
import { ResponsiveContainer, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import successPop from '../assets/success_pop.json';
import { getOfferForReason, inferReasonKey } from '../utils/offerEngine';

const Customers = () => {
   const location = useLocation();
   const [customers, setCustomers] = useState([]);
   const [loading, setLoading] = useState(true);
   const [search, setSearch] = useState('');
   const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
   const [selectedUser, setSelectedUser] = useState(null);
   const [showHighRiskOnly, setShowHighRiskOnly] = useState(false);
   const [refreshing, setRefreshing] = useState(false);
   const [actionHistory, setActionHistory] = useState({});
   const [offerHistory, setOfferHistory] = useState(() => {
      const saved = localStorage.getItem('ecoretain_offer_history');
      return saved ? JSON.parse(saved) : {};
   });   // tracks sent offers per customer
   const [modalTab, setModalTab] = useState('intel');       // 'intel' | 'offer'
   const [showSim, setShowSim] = useState(false);           // toggle for simulation in offer tab
   const [selectedItems, setSelectedItems] = useState(new Set()); // IDs of selected rows
   const [mailPreview, setMailPreview] = useState(null);    // { user, offer, body }
   const [showSuccess, setShowSuccess] = useState(false);   // toggle for success lottie

   const fetchData = (isManualSync = false) => {
      setRefreshing(true);
      const endpoint = isManualSync ? 'http://localhost:3000/api/sync' : 'http://localhost:3000/api/data';
      fetch(endpoint)
         .then(res => res.json())
         .then(data => {
            const formatted = data.map(c => {
               const tenure = Number(c.tenure) || 0;
               const spend = Number(c.spend) || 0;
               const churnLogic = c.churn === 1 || c.churn === 'Yes';

               let risk = 'Low';
               let prob = 12;
               let recommendation = 'Maintain current engagement strategy.';
               let factors = [
                  `Contract Type: ${c.contract}`,
                  `Payment Method: ${c.payment}`,
                  `Customer Lifetime Value Index: ${c.cltv}`
               ];

               if (churnLogic) {
                  risk = 'High';
                  prob = 85 + Math.floor((spend % 10));
                  recommendation = 'URGENT INTERVENTION: Trigger retention campaign. Follow up directly with account holder.';
                  if (c.churnReason) {
                     factors.unshift(`ACTUAL CAUSE: ${c.churnReason}`);
                  } else {
                     factors.unshift('High recurring charges vs current tenure');
                  }
               } else if (tenure < 12 && spend > 80) {
                  risk = 'Medium';
                  prob = 45 + Math.floor((spend % 15));
                  recommendation = 'NURTURE: Send educational product webinar to increase engagement.';
               }

               // Zig-zag deterministic fluctuation based on ID
               const getVar = (offset) => {
                  const seed = (parseInt(c.id) || 0) + offset;
                  return Math.abs(Math.sin(seed) * 15); // fluctuates 0-15
               };

               const mockTrend = [
                  { day: 'W1', activity: Math.min(100, Math.max(10, 95 - (prob * 0.1) + getVar(1))) },
                  { day: 'W2', activity: Math.min(100, Math.max(10, 85 - (prob * 0.3) - getVar(2))) },
                  { day: 'W3', activity: Math.min(100, Math.max(10, 92 - (prob * 0.6) + getVar(3))) },
                  { day: 'W4', activity: Math.min(100, Math.max(10, 100 - prob)) }
               ];

               const nameInitial = c.name
                  ? (c.name.includes(' ') ? c.name.split(' ')[1].charAt(0) : c.name.charAt(0))
                  : '?';

               // Infer offer from raw churn reason string
               const reasonKey = inferReasonKey(c.churnReason || '');
               const offer = getOfferForReason(reasonKey);

               return {
                  id: c.id,
                  name: c.name || 'Unknown',
                  city: c.city || '',
                  state: c.state || '',
                  contract: c.contract || '',
                  payment: c.payment || '',
                  cltv: Number(c.cltv) || 0,
                  tenure,
                  spend,
                  total: Number(c.total) || 0,
                  revenueAtRisk: (spend * 12).toFixed(2),
                  risk,
                  prob,
                  factors,
                  recommendation,
                  mockTrend,
                  nameInitial,
                  rawChurnReason: c.churnReason || '',
                  reasonKey,
                  offer,
                  email: c.email || (c.id.toLowerCase() + '@customer.com'),
               };
            });
            setCustomers(formatted);
            setLoading(false);
            setTimeout(() => setRefreshing(false), 800);
         })
         .catch(err => {
            console.error('Failed to fetch data:', err);
            setLoading(false);
            setRefreshing(false);
         });
   };

   useEffect(() => { 
      fetchData(false); 
      
      // Deep Link handling: if ?search=ID exists, pre-filter and open
      const params = new URLSearchParams(location.search);
      const q = params.get('search');
      if (q) setSearch(q);
   }, []);

   // Auto-open if a search leads to exactly 1 result (deep link interaction)
   useEffect(() => {
      if (search && customers.length > 0) {
         // Priority 1: Exact ID match (for deep links from Dashboard)
         const exactMatch = customers.find(c => c.id.toString().toLowerCase() === search.toLowerCase());
         if (exactMatch) {
            setSelectedUser(exactMatch);
         } else if (filtered.length === 1) {
            // Priority 2: Single search result left
            setSelectedUser(filtered[0]);
         }
      }
   }, [customers.length, search]);

   // Reset modal tab and simulation view when a new user is selected
   useEffect(() => { 
      setModalTab('intel'); 
      setShowSim(false);
   }, [selectedUser?.id]);

   const requestSort = (key) => {
      if (sortConfig.key === key && sortConfig.direction === 'descending') {
         setSortConfig({ key: null, direction: 'ascending' });
         return;
      }
      let direction = 'ascending';
      if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
      setSortConfig({ key, direction });
   };

   const sortedCustomers = useMemo(() => {
      let items = [...customers];
      if (sortConfig.key) {
         items.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
         });
      }
      return items;
   }, [customers, sortConfig]);

   const filtered = sortedCustomers.filter(c =>
      (!showHighRiskOnly || c.risk === 'High') &&
      (c.name.toLowerCase().includes(search.toLowerCase()) ||
         c.city.toLowerCase().includes(search.toLowerCase()) ||
         c.state.toLowerCase().includes(search.toLowerCase()) ||
         c.id.toString().toLowerCase().includes(search.toLowerCase()) ||
         c.risk.toLowerCase().includes(search.toLowerCase()))
   );

   const visibleRows = filtered.slice(0, 200);

   const getSortIcon = (key) => (
      <ArrowUpDown size={14} style={{ marginLeft: '6px', opacity: sortConfig.key === key ? 1 : 0.3 }} />
   );

   const handleExport = () => {
      if (!filtered.length) return;
      const headers = ['Customer ID', 'Name', 'Location', 'Risk Level', 'Probability (%)', 'Tenure', 'Spend', 'Contract', 'Payment', 'Offer Sent'];
      const rows = filtered.map(c =>
         [c.id, c.name, `"${c.city}, ${c.state}"`, c.risk, c.prob, c.tenure, c.spend, c.contract, c.payment, offerHistory[c.id] ? offerHistory[c.id] : 'None'].join(',')
      );
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csvContent));
      link.setAttribute('download', `churn_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
   };

   const markActionTaken = (userId, actionName) => {
      setActionHistory(prev => ({ ...prev, [userId]: actionName }));
   };

   const markOfferSent = (userId, offerTitle) => {
      const u = customers.find(cust => cust.id === userId);
      if (u) {
         setMailPreview({ 
            user: u, 
            offer: u.offer,
            body: u.offer.messageTemplate.replaceAll('[Name]', u.name)
         });
      }
   };

   const confirmSendMail = async () => {
      if (mailPreview) {
         const { user, body } = mailPreview;
         const subject = body.split('\n')[0];
         const cleanBody = body.split('\n').slice(2).join('\n');

         try {
            // Call real backend email API
            const response = await fetch('http://localhost:3000/api/send-email', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ 
                  to: user.email, 
                  subject: subject, 
                  body: cleanBody 
               })
            });
            const resData = await response.json();
            
            if (resData.success) {
               const newHistory = { ...offerHistory, [user.id]: mailPreview.offer.title };
               setOfferHistory(newHistory);
               localStorage.setItem('ecoretain_offer_history', JSON.stringify(newHistory));
               
               setMailPreview(null);
               setShowSuccess(true);
               setTimeout(() => setShowSuccess(false), 2200);
            } else {
               alert("Server error sending email: " + resData.error);
            }
         } catch (error) {
            console.error("Fetch error:", error);
            alert("Check if backend is running with Nodemailer setup.");
         }
      }
   };

   const riskColor = (risk) => {
      if (risk === 'High') return '#ef4444';
      if (risk === 'Medium') return '#f59e0b';
      return '#10b981';
   };

   const toggleSelect = (id) => {
      const newSelected = new Set(selectedItems);
      if (newSelected.has(id)) newSelected.delete(id);
      else newSelected.add(id);
      setSelectedItems(newSelected);
   };

   const toggleSelectAll = () => {
      if (selectedItems.size === visibleRows.length) {
         setSelectedItems(new Set());
      } else {
         setSelectedItems(new Set(visibleRows.map(c => c.id)));
      }
   };

   const handleBatchOffer = () => {
      const newOfferHistory = { ...offerHistory };
      selectedItems.forEach(id => {
         const c = customers.find(cust => cust.id === id);
         if (c) newOfferHistory[id] = c.offer.title;
      });
      setOfferHistory(newOfferHistory);
      setSelectedItems(new Set());
      alert(`AI Campaign deployed successfully to ${selectedItems.size} accounts.`);
   };

   // ── Modal rendered via Portal ──
   const Modal = selectedUser ? ReactDOM.createPortal(
      <AnimatePresence>
         <motion.div
            className="intel-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedUser(null)}
         >
            <motion.div
               className="intel-modal"
               initial={{ scale: 0.92, opacity: 0, y: 30 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.92, opacity: 0, y: 30 }}
               transition={{ type: 'spring', damping: 28, stiffness: 320 }}
               onClick={e => e.stopPropagation()}
            >
               {/* ── Header ── */}
               <div className="intel-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                     <Activity size={22} color="var(--primary)" />
                     <h2 className="intel-title">Customer Intelligence</h2>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                     {/* Tab switcher */}
                     <div className="intel-tab-bar">
                        <button
                           className={`intel-tab ${modalTab === 'intel' ? 'active' : ''}`}
                           onClick={() => setModalTab('intel')}
                        >
                           <Activity size={13} /> Analytics
                        </button>
                        <button
                           className={`intel-tab ${modalTab === 'offer' ? 'active' : ''}`}
                           onClick={() => setModalTab('offer')}
                        >
                           <Gift size={13} /> Offer
                           {offerHistory[selectedUser.id] && (
                              <span className="intel-tab-dot" />
                           )}
                        </button>
                     </div>
                     <button className="intel-close" onClick={() => setSelectedUser(null)}>
                        <X size={18} />
                     </button>
                  </div>
               </div>

               {/* ── Body ── */}
               <div className="intel-body">

                  {/* Profile — always visible */}
                  <div className="intel-profile">
                     <div className="intel-avatar">
                        {selectedUser.nameInitial}
                     </div>
                     <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                           <h3 className="intel-name">{selectedUser.name}</h3>
                           {selectedUser.risk === 'High' && !actionHistory[selectedUser.id] && (
                              <span className="intel-badge danger">
                                 <AlertTriangle size={12} /> At Risk
                              </span>
                           )}
                           {actionHistory[selectedUser.id] && (
                              <span className="intel-badge success">
                                 <CheckCircle size={12} /> {actionHistory[selectedUser.id]}
                              </span>
                           )}
                           {offerHistory[selectedUser.id] && (
                              <span className="intel-badge offer">
                                 <Gift size={12} /> Offer Sent
                              </span>
                           )}
                        </div>
                        <p className="intel-id">ID: {selectedUser.id}</p>
                        <div className="intel-chips">
                           <span className="intel-chip"><MapPin size={13} /> {selectedUser.city}, {selectedUser.state}</span>
                           <span className="intel-chip" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}><Send size={13} /> {selectedUser.email}</span>
                           <span className="intel-chip"><CreditCard size={13} /> {selectedUser.payment}</span>
                           <span className="intel-chip"><FileText size={13} /> {selectedUser.contract}</span>
                        </div>
                     </div>
                  </div>

                  <AnimatePresence mode="wait">

                     {/* ── INTEL TAB ── */}
                     {modalTab === 'intel' && (
                        <motion.div
                           key="intel-tab"
                           className="intel-tab-content"
                           initial={{ opacity: 0, y: 8 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: -8 }}
                           transition={{ duration: 0.2 }}
                        >
                           {/* KPI Cards */}
                           <div className="intel-kpi-row">
                              <div className="intel-kpi-card">
                                 <div className="intel-kpi-label">Churn Probability</div>
                                 <div className="intel-kpi-value" style={{ color: riskColor(selectedUser.risk) }}>
                                    {selectedUser.prob}%
                                 </div>
                                 <div className="intel-meter">
                                    <div
                                       className="intel-meter-fill"
                                       style={{ width: `${selectedUser.prob}%`, background: riskColor(selectedUser.risk) }}
                                    />
                                 </div>
                                 <div className="intel-kpi-sub">{selectedUser.tenure} months tenure · {selectedUser.risk} Risk</div>
                              </div>

                              <div className="intel-kpi-card">
                                 <div className="intel-kpi-label">Annual Revenue at Risk</div>
                                 <div className="intel-kpi-value" style={{ color: selectedUser.risk === 'High' ? '#ef4444' : '#0f172a' }}>
                                    ${selectedUser.revenueAtRisk}
                                 </div>
                                 <div className="intel-kpi-sub">CLTV Index: {selectedUser.cltv}</div>
                              </div>
                           </div>

                           {/* Telemetry + Chart */}
                           <div className="intel-section">
                              <div className="intel-section-title"><Info size={15} /> Risk Telemetry</div>
                              <div className="intel-telemetry-grid">
                                 <ul className="intel-factors">
                                    {selectedUser.factors.map((f, i) => (
                                       <li
                                          key={i}
                                          className={`intel-factor-item${i === 0 && selectedUser.risk === 'High' ? ' intel-factor-danger' : ''}`}
                                       >
                                          {i === 0 && selectedUser.risk === 'High'
                                             ? <AlertTriangle size={14} />
                                             : <CheckCircle size={14} color="#10b981" />}
                                          <span>{f}</span>
                                       </li>
                                    ))}
                                 </ul>
                                 <div className="intel-chart-box">
                                    <div className="intel-chart-label">Engagement Trend (90D)</div>
                                    <ResponsiveContainer width="100%" height={80}>
                                       <AreaChart data={selectedUser.mockTrend}>
                                          <defs>
                                             <linearGradient id={`tg_${selectedUser.id}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={riskColor(selectedUser.risk)} stopOpacity={0.4} />
                                                <stop offset="100%" stopColor={riskColor(selectedUser.risk)} stopOpacity={0} />
                                             </linearGradient>
                                          </defs>
                                          <YAxis hide domain={[0, 100]} />
                                          <Tooltip
                                             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', fontSize: '0.75rem' }}
                                             labelStyle={{ display: 'none' }}
                                          />
                                          <Area
                                             type="monotone"
                                             dataKey="activity"
                                             stroke={riskColor(selectedUser.risk)}
                                             strokeWidth={2.5}
                                             fill={`url(#tg_${selectedUser.id})`}
                                             animationDuration={1200}
                                          />
                                       </AreaChart>
                                    </ResponsiveContainer>
                                 </div>
                              </div>
                           </div>

                           {/* Action Block */}
                           <div className="intel-action-block">
                              <div className="intel-action-header">
                                 <Zap size={18} style={{ color: '#f59e0b' }} />
                                 <span>Strategic AI Recommendation</span>
                              </div>
                              <p className="intel-action-text">{selectedUser.recommendation}</p>
                              <div className="intel-action-btns">
                                 <button
                                    className="intel-btn-primary"
                                    disabled={!!actionHistory[selectedUser.id]}
                                    onClick={() => markActionTaken(selectedUser.id, 'Campaign Triggered')}
                                 >
                                    {actionHistory[selectedUser.id] ? '✓ Engagement Active' : 'Trigger AI Retention Campaign'}
                                 </button>
                                 <button
                                    className="intel-btn-secondary"
                                    onClick={() => setModalTab('offer')}
                                 >
                                    <Gift size={14} style={{ marginRight: '5px' }} />
                                    {offerHistory[selectedUser.id] ? 'View Sent Offer' : 'View Targeted Offer'}
                                 </button>
                              </div>
                           </div>
                        </motion.div>
                     )}

                     {/* ── OFFER TAB ── */}
                     {modalTab === 'offer' && (
                        <motion.div
                           key="offer-tab"
                           className="intel-tab-content"
                           initial={{ opacity: 0, y: 8 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: -8 }}
                           transition={{ duration: 0.2 }}
                        >
                           {/* Churn Reason Banner */}
                           {selectedUser.rawChurnReason && (
                              <div className="offer-reason-banner">
                                 <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                                 <div>
                                    <span className="offer-reason-label">Detected Exit Reason</span>
                                    <span className="offer-reason-text">"{selectedUser.rawChurnReason}"</span>
                                 </div>
                              </div>
                           )}

                           {/* Offer Card */}
                           <div
                              className="intel-offer-card"
                              style={{
                                 '--ic-offer-color': selectedUser.offer.color,
                                 '--ic-offer-bg': selectedUser.offer.colorBg,
                                 borderColor: selectedUser.offer.color,
                                 background: selectedUser.offer.colorBg,
                              }}
                           >
                              <div className="offer-card-header">
                                 <span className="offer-icon">{selectedUser.offer.icon}</span>
                                 <div>
                                    <div className="offer-badge" style={{ background: `${selectedUser.offer.color}20`, color: selectedUser.offer.color }}>
                                       {selectedUser.offer.badge}
                                    </div>
                                    <div className="offer-title">{selectedUser.offer.title}</div>
                                 </div>
                              </div>
                              <p className="offer-description">{selectedUser.offer.description}</p>
                              <div className="offer-discount-pill" style={{ background: `${selectedUser.offer.color}18`, color: selectedUser.offer.color }}>
                                 🎁 {selectedUser.offer.discount}
                              </div>

                              <button 
                                 className="sim-toggle-btn-light"
                                 style={{ color: selectedUser.offer.color, borderColor: `${selectedUser.offer.color}25` }}
                                 onClick={() => setShowSim(!showSim)}
                              >
                                 <TrendingDown size={14} /> {showSim ? 'Hide' : 'Show'} What-If Simulation
                              </button>
                           </div>

                           {/* ── SIMULATION PANEL ── */}
                           <AnimatePresence>
                              {showSim && (() => {
                                 const { simulateOffer } = require('../utils/offerEngine');
                                 const sim = simulateOffer(selectedUser.prob, selectedUser.offer, selectedUser.spend);
                                 const afterColor = sim.newRisk === 'High' ? '#ef4444' : sim.newRisk === 'Medium' ? '#f59e0b' : '#10b981';

                                 return (
                                    <motion.div 
                                       className="intel-sim-panel"
                                       initial={{ height: 0, opacity: 0 }}
                                       animate={{ height: 'auto', opacity: 1 }}
                                       exit={{ height: 0, opacity: 0 }}
                                    >
                                       <div className="sim-comp-box">
                                          <div className="sim-comp-row">
                                             <span className="sim-comp-label">Current Risk</span>
                                             <div className="sim-comp-bar-track">
                                                <div className="sim-comp-bar-fill" style={{ width: `${selectedUser.prob}%`, background: riskColor(selectedUser.risk) }} />
                                             </div>
                                             <span className="sim-comp-val" style={{ color: riskColor(selectedUser.risk) }}>{selectedUser.prob}%</span>
                                          </div>
                                          <div className="sim-comp-arrow">
                                             <ArrowDown size={14} /> <span className="sim-comp-delta">−{sim.reduction}% reduction</span>
                                          </div>
                                          <div className="sim-comp-row">
                                             <span className="sim-comp-label">Projected</span>
                                             <div className="sim-comp-bar-track">
                                                <div className="sim-comp-bar-fill" style={{ width: `${sim.after}%`, background: afterColor }} />
                                             </div>
                                             <span className="sim-comp-val" style={{ color: afterColor }}>{sim.after}%</span>
                                          </div>
                                       </div>

                                       <div className="sim-stats-grid">
                                          <div className="sim-stat-card">
                                             <ShieldCheck size={14} style={{ color: afterColor }} />
                                             <div className="sim-stat-info">
                                                <div className="sim-stat-val" style={{ color: afterColor }}>{sim.newRisk} Risk</div>
                                                <div className="sim-stat-label">New Profile</div>
                                             </div>
                                          </div>
                                          <div className="sim-stat-card">
                                             <DollarSign size={14} color="#0369a1" />
                                             <div className="sim-stat-info">
                                                <div className="sim-stat-val" style={{ color: '#0369a1' }}>${sim.revenueSaved}</div>
                                                <div className="sim-stat-label">Annual Recovery</div>
                                             </div>
                                          </div>
                                       </div>
                                    </motion.div>
                                 );
                              })()}
                           </AnimatePresence>

                           {/* Sent confirmation or CTA */}
                           {offerHistory[selectedUser.id] ? (
                              <div className="offer-sent-confirmation">
                                 <CheckCircle size={20} style={{ color: '#059669' }} />
                                 <div>
                                    <div className="offer-sent-title">Offer Successfully Deployed</div>
                                    <div className="offer-sent-sub">"{offerHistory[selectedUser.id]}" was sent to {selectedUser.name}.</div>
                                 </div>
                              </div>
                           ) : (
                              <div className="intel-action-block">
                                 <div className="intel-action-header">
                                    <Gift size={18} style={{ color: selectedUser.offer.color }} />
                                    <span>Deploy This Offer</span>
                                 </div>
                                 <p className="intel-action-text">
                                    Sending this offer to {selectedUser.name} will trigger an automated outreach email and log the action in your CRM. This cannot be undone.
                                 </p>
                                 <div className="intel-action-btns">
                                    <button
                                       className="intel-btn-primary"
                                       style={{ background: selectedUser.offer.color }}
                                       onClick={() => markOfferSent(selectedUser.id, selectedUser.offer.title)}
                                    >
                                       <Send size={14} style={{ marginRight: '5px' }} />
                                       {selectedUser.offer.action}
                                    </button>
                                    <button
                                       className="intel-btn-secondary"
                                       onClick={() => setModalTab('intel')}
                                    >
                                       Back to Analytics
                                    </button>
                                 </div>
                              </div>
                           )}
                        </motion.div>
                     )}

                  </AnimatePresence>

               </div>
            </motion.div>
         </motion.div>
      </AnimatePresence>,
      document.body
   ) : null;

   // ── Mail Preview Modal ──
   const MailModal = mailPreview ? ReactDOM.createPortal(
      <AnimatePresence>
         <motion.div className="intel-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ zIndex: 3000 }}>
            <motion.div 
               className="mail-modal"
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
            >
               <div className="mail-modal-header">
                  <div className="mail-title-row">
                     <div className="mail-icon-box"><Send size={16} /></div>
                     <span>Outbound Communication Preview</span>
                  </div>
                  <button onClick={() => setMailPreview(null)} className="mail-close"><X size={16} /></button>
               </div>
               
               <div className="mail-meta">
                  <div className="mail-meta-row"><span>To:</span> <strong>{mailPreview.user.name}</strong> &lt;{mailPreview.user.email}&gt;</div>
                  <div className="mail-meta-row"><span>From:</span> EcoRetain Retention &lt;retaintionx@gmail.com&gt;</div>
               </div>

               <div className="mail-editor">
                  <div className="mail-subject">
                     {mailPreview.body.split('\n')[0]}
                  </div>
                  <div className="mail-body">
                     {mailPreview.body.split('\n').slice(2).join('\n')}
                  </div>
               </div>

               <div className="mail-footer">
                  <button className="mail-btn-cancel" onClick={() => setMailPreview(null)}>Discard</button>
                  <button className="mail-btn-send" onClick={confirmSendMail}>
                     <Zap size={14} /> Dispatch Enrollment Email
                  </button>
               </div>
            </motion.div>
         </motion.div>
      </AnimatePresence>,
      document.body
   ) : null;

   // ── Success Animation Overlay ──
   const SuccessOverlay = showSuccess ? ReactDOM.createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)' }}>
         <div style={{ width: 300, height: 300 }}>
            <Lottie animationData={successPop} loop={false} />
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: 800, fontSize: '1.5rem', marginTop: '-20px' }}
            >
               Offer Dispatched!
            </motion.div>
         </div>
      </div>,
      document.body
   ) : null;

   return (
      <>
         {Modal}
         {MailModal}
         {SuccessOverlay}
         <div className="page-container customers-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div>
                  <h1>Customer Database &amp; Full Spectrum Analytics</h1>
                  <p>Utilizing full dataset geolocation, contract metrics, and actual churn reasoning.</p>
               </div>
               <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="secondary-btn" onClick={() => fetchData(true)}>
                     <RefreshCw size={16} className={refreshing ? 'spin-anim' : ''} /> Sync Data Node
                  </button>
                  <button className="primary-btn" onClick={handleExport}>
                     <Send size={16} /> Export View to CSV
                  </button>
               </div>
            </div>

            {/* ── Batch Action Bar ── */}
            <AnimatePresence>
               {selectedItems.size > 0 && (
                  <motion.div 
                     className="batch-action-bar"
                     initial={{ y: -20, opacity: 0 }}
                     animate={{ y: 0, opacity: 1 }}
                     exit={{ y: -20, opacity: 0 }}
                  >
                     <div className="batch-info">
                        <div className="batch-count">{selectedItems.size}</div>
                        <span>customers selected</span>
                     </div>
                     <div className="batch-btns">
                        <button className="batch-btn batch-primary" onClick={handleBatchOffer}>
                           <Zap size={15} /> Deploy Targeted Offers
                        </button>
                        <button className="batch-btn batch-secondary" onClick={handleExport}>
                           <FileText size={15} /> Export Selected
                        </button>
                        <button className="batch-cancel" onClick={() => setSelectedItems(new Set())}>
                           Cancel
                        </button>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>

            <div className="table-container">
               <div className="table-actions">
                  <div className="search-bar">
                     <Search size={16} />
                     <input
                        type="text"
                        placeholder="Search by name, city, ID, risk..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                     />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                        <span>High-Risk Segment</span>
                        <div className="switch">
                           <input type="checkbox" checked={showHighRiskOnly} onChange={e => setShowHighRiskOnly(e.target.checked)} />
                           <span className="slider round" />
                        </div>
                     </label>
                     <span style={{ color: '#64748b', fontSize: '0.875rem', borderLeft: '1px solid #e2e8f0', paddingLeft: '1rem' }}>
                        {showHighRiskOnly ? `${filtered.length} high-risk accounts` : `${filtered.length} customers`}
                     </span>
                  </div>
               </div>

               {loading ? (
                  <div style={{ padding: '5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                     <Activity size={40} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
                     <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading customer...</span>
                  </div>
               ) : (
                  <div className="table-wrapper-responsive">
                     <table className="data-table">
                        <thead>
                           <tr>
                              <th style={{ width: '40px' }}>
                                 <input 
                                    type="checkbox" 
                                    checked={selectedItems.size > 0 && selectedItems.size === visibleRows.length}
                                    onChange={toggleSelectAll}
                                 />
                              </th>
                              <th className="sortable-header" onClick={() => requestSort('name')}>Customer Identity &amp; Locale {getSortIcon('name')}</th>
                              <th className="sortable-header" onClick={() => requestSort('risk')}>Risk Profile {getSortIcon('risk')}</th>
                              <th className="sortable-header" onClick={() => requestSort('email')}>Contact Email {getSortIcon('email')}</th>
                              <th className="sortable-header" onClick={() => requestSort('contract')}>Contract Type {getSortIcon('contract')}</th>
                              <th className="sortable-header" onClick={() => requestSort('spend')}>Spend/Mo {getSortIcon('spend')}</th>
                              <th>Status / Offer</th>
                           </tr>
                        </thead>
                        <tbody>
                           {visibleRows.map(c => (
                              <tr 
                                 key={c.id} 
                                 style={{ cursor: 'pointer' }} 
                                 onClick={() => setSelectedUser(c)}
                                 className={selectedItems.has(c.id) ? 'row-selected' : ''}
                              >
                                 <td onClick={(e) => { e.stopPropagation(); toggleSelect(c.id); }}>
                                    <input 
                                       type="checkbox" 
                                       checked={selectedItems.has(c.id)}
                                       readOnly
                                    />
                                 </td>
                                 <td>
                                    <div className="customer-info">
                                       <div className="fancy-avatar" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                          {c.nameInitial}
                                       </div>
                                       <div>
                                          <div className="customer-name">{c.name} <span className="code-font">{c.id}</span></div>
                                          <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                             <MapPin size={11} /> {c.city}, {c.state}
                                          </div>
                                       </div>
                                    </div>
                                 </td>
                                 <td>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>{c.email}</div>
                                 </td>
                                 <td>
                                    <div className="risk-indicator">
                                       <span className={`risk-dot risk-dot-${c.risk.toLowerCase()}`} />
                                       {c.risk} Risk ({c.prob}%)
                                    </div>
                                 </td>
                                 <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#334155' }}>
                                       <FileText size={13} color="#94a3b8" /> {c.contract}
                                    </div>
                                 </td>
                                 <td><strong style={{ color: '#0f172a' }}>${c.spend.toFixed(2)}</strong></td>
                                 <td>
                                    {offerHistory[c.id] ? (
                                       <div className="table-offer-sent">
                                          <Gift size={13} />
                                          <span>{offerHistory[c.id]}</span>
                                       </div>
                                    ) : actionHistory[c.id] ? (
                                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669', fontSize: '0.8rem', fontWeight: 600 }}>
                                          <CheckCircle size={14} /> {actionHistory[c.id]}
                                       </div>
                                    ) : (
                                       <button
                                          className="action-btn"
                                          onClick={e => { e.stopPropagation(); setSelectedUser(c); }}
                                       >
                                          <Activity size={15} /> Analyze Intelligence
                                       </button>
                                    )}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               )}
            </div>
         </div>
      </>
   );
};

export default Customers;
