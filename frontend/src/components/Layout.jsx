import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Leaf, LogOut, Settings as SettingsIcon, Bell, Search, BarChart3, PieChart } from 'lucide-react';
import './Layout.css';

const Layout = () => {
  return (
    <div className="layout-container">
      <nav className="sidebar">
        <div className="sidebar-header">
          <div className="logo-icon glow">
             <Leaf fill="currentColor" />
          </div>
          <h2>EcoRetain AI</h2>
        </div>
        
        <ul className="nav-links">
          <li>
            <NavLink to="/" className={({ isActive }) => (isActive ? 'active-link' : '')}>
              <BarChart3 size={20} />
              <span>Executive Overview</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/predictor" className={({ isActive }) => (isActive ? 'active-link' : '')}>
              <LayoutDashboard size={20} />
              <span>Retention Predictor</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/customers" className={({ isActive }) => (isActive ? 'active-link' : '')}>
              <Users size={20} />
              <span>Client Database</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/intelligence" className={({ isActive }) => (isActive ? 'active-link' : '')}>
              <PieChart size={20} />
              <span>Behavioral Analytics</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="main-area">
        <main className="main-content scrollable">
           <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
