// App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import JoinGame from './components/joingamepage/joingame';
import PlayArena from './components/playarena/playarena';

const App = () => {
  return (
    <Router>
        <Routes>
          <Route path="/" element={<JoinGame />} />
          <Route path="/game/:address" element={<PlayArena />} />
        </Routes>
    </Router>
  );
};

export default App;
