import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './joingame.css'; // Import CSS file for styling

const JoinGame = () => {
  const [address, setAddress] = useState('');
  const navigate = useNavigate();

  const handleJoinGame = () => {
    const route = `/game/${address}`;

    // Navigate to the PlayArena component with the random route
    navigate(route);
  };

  return (
    <div className="join-game-container">
      <h1>Rock Paper Scissors Lizard Spock</h1>
      <input
        type="text"
        placeholder="Enter opponent address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <button className="join-game-button" onClick={handleJoinGame}>Join Game</button>
    </div>
  );
};

export default JoinGame;
