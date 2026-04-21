import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Database, Save, Activity } from 'lucide-react';
import './Settings.css';

const Settings = () => {
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 800);
  };

  return (
    <div className="page-container settings-page">
      <div className="page-header">
        <h1>Platform Settings</h1>
        <p>Configure model parameters and global dashboard preferences.</p>
      </div>

      <div className="settings-grid">
         <div className="settings-card">
            <h3><Database size={20} className="text-secondary" /> Model Configurations</h3>
            <div className="form-group">
               <label>High Risk Threshold (Probability)</label>
               <input type="range" min="0" max="1" step="0.05" defaultValue="0.7" className="range-slider" />
               <div className="range-labels"><span>0.0</span><span>0.7</span><span>1.0</span></div>
            </div>
            <div className="form-group">
               <label>Medium Risk Threshold (Probability)</label>
               <input type="range" min="0" max="1" step="0.05" defaultValue="0.3" className="range-slider" />
               <div className="range-labels"><span>0.0</span><span>0.3</span><span>1.0</span></div>
            </div>
         </div>

         <div className="settings-card">
            <h3><Bell size={20} className="text-warning" /> Notification Preferences</h3>
            <div className="toggle-row">
               <span>Email alerts for 'High Risk' predictions</span>
               <label className="switch"><input type="checkbox" defaultChecked /><span className="slider round"></span></label>
            </div>
            <div className="toggle-row">
               <span>Daily Summary Digest PDF</span>
               <label className="switch"><input type="checkbox" /><span className="slider round"></span></label>
            </div>
         </div>

         <div className="settings-card full-width">
            <h3><Shield size={20} className="text-success" /> System Operations Health</h3>
            <div className="status-bars">
               <div className="status-item">
                  <div className="status-meta"><span>Python Scikit-Learn Server</span><span className="text-success">Operational</span></div>
                  <div className="progress-bar"><div className="progress" style={{width: '100%', background: '#34d399'}}></div></div>
               </div>
               <div className="status-item">
                  <div className="status-meta"><span>Excel Database Sync (.xlsx)</span><span className="text-success">Live (12ms latency)</span></div>
                  <div className="progress-bar"><div className="progress" style={{width: '98%', background: '#34d399'}}></div></div>
               </div>
               <div className="status-item">
                  <div className="status-meta"><span>Model Memory Utilization</span><span className="text-warning">64% / 4GB</span></div>
                  <div className="progress-bar"><div className="progress" style={{width: '64%', background: '#f59e0b'}}></div></div>
               </div>
            </div>
         </div>
      </div>

      <div className="settings-actions">
         <button className="submit-btn" onClick={handleSave} disabled={saving} style={{width: 'auto', minWidth: '220px', padding: '1rem 2rem'}}>
            {saving ? <><Activity className="loading-spinner" size={20}/> Saving Configurations...</> : <><Save size={20} /> Save Configuration</>}
         </button>
      </div>
    </div>
  );
};

export default Settings;
