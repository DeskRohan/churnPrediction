import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Predictor from './pages/Predictor';
import Customers from './pages/Customers';
import ChurnIntel from './pages/ChurnIntel';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="predictor" element={<Predictor />} />
        <Route path="customers" element={<Customers />} />
        <Route path="intelligence" element={<ChurnIntel />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
