import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './components/Index';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/slack-integration" element={<div>Slack Integration Page</div>} />
      </Routes>
    </Router>
  );
};

export default App;
