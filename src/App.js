import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import JoinGame from './components/joingamepage/joingame';
import PlayArena from './components/playarena/playarena';
import LoadingOverlay from 'react-loading-overlay-ts';


const App = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loaderText, setLoaderText] = useState("Loading ...");

  const setLoadingCallback = (isLoading_, loaderText_) => {
    setIsLoading(isLoading_);
    setLoaderText(loaderText_);
  };

  return (
    <LoadingOverlay
      active={isLoading}
      spinner
      text={loaderText}
    >
      <Router>
        <Routes>
          <Route path="/" element={<JoinGame loaderCallback={setLoadingCallback} />} />
          <Route path="/game/:address" element={<PlayArena loaderCallback={setLoadingCallback} />} />
        </Routes>
      </Router>
    </LoadingOverlay>
  );
};

export default App;