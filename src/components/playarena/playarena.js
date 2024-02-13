import "./styles.css";
import { ethers } from "ethers";
import io from "socket.io-client";
import Countdown, { zeroPad } from "react-countdown";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import gameContractABI from "../../artifacts/contracts/RPS.sol/RPS.json";

const socket = io.connect("https://socket-service-194e5cc34a05.herokuapp.com/");
const room = 1337;
socket.on("connect", () => {
  console.log("SOCKET CONNECTED");
});

function PlayArena({loaderCallback}) {

  const j2Timeout                                             = useRef();
  const j1Timeout                                             = useRef();
  const navigate                                              = useNavigate();
  const { state }                                             = useLocation();
  const selection                                             = ["🪨", "📰", "✂️", "🖖", "🦎"];
  const [winner, setWinner]                                   = useState(null);
  const [revealMove, setRevealMove]                           = useState(false);
  const [isGameEnded, setIsGameEnded]                         = useState(false);
  const [opponentMove, setOpponentMove]                       = useState(null);
  const [initiatorMove, setInitiatorMove]                     = useState(null);
  const [revealTimestamp, setRevealTimestamp]                 = useState(null);
  const [isEligibleForAppeal, setIsEligibleForAppeal]         = useState(false);
  const [deployedContractAddress, setDeployedContractAddress] = useState(null);

  const handlePause = (ref) => ref.current.pause();


  let provider = null;
  let signer = null;
  let isj1Timedout = false;
  let isj2Timedout = false;

  socket.emit("join_game", {
    room         : room,
    user_address : state.player
  });

  useEffect(() => {
    socket.on("new_player_joined", (data) => {
      if (state.opponent != null && state.opponent == data.user_address && data.room == room){
        socket.emit("deployed_contract_address", {
          room     : room,
          contract : state.contract
        });
      }
    });

    socket.on("received_contract_address", (data) => {
        setDeployedContractAddress(data);
    });

    socket.on("received_winner", (data) => {
      setWinner(data);
    });

    socket.on("received_opponent_move", (data) => {
      setOpponentMove(data.choosenMove);
      setRevealTimestamp(data.timestamp);
    });

    socket.on("received_initiator_move", (data) => {
      setInitiatorMove(data.choosenMove);
      setRevealTimestamp(null);
    });

    socket.on("received_end_game", (data) => {
      setIsGameEnded(true);
      setTimeout(() => { navigate("/"); }, 15000);
    });

  }, [socket]);

  const clickHandler = async (choosenMove) => {

    loaderCallback(true, "Locking Choice ...");

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();

    const rpsContract = new ethers.Contract(
      deployedContractAddress,
      gameContractABI.abi,
      signer
    );

    try {
      const playMove = await rpsContract.play(choosenMove + 1, {
        value: ethers.parseUnits(state.stakeAmount, "wei"),
      });
      await playMove.wait();
      loaderCallback(false, "");

    } catch (error) {
      loaderCallback(false, "");
      return;

    }

    handlePause(j2Timeout);
    setOpponentMove(choosenMove);
    setRevealTimestamp(Date.now());

    socket.emit("opponent_move", {
      choosenMove: choosenMove,
      timestamp: Date.now(),
      room: room,
    });

  };

  const announceWinner = async (firstPlayerMove) => {

    provider = new ethers.BrowserProvider(window.ethereum);
    const GameContract = new ethers.Contract(
      state.contract,
      gameContractABI.abi,
      provider
    );

    let secondPlayerMove = await GameContract.c2();
    secondPlayerMove = parseInt(secondPlayerMove, 10);

    if (firstPlayerMove + 1 === secondPlayerMove) {
      return 0;
    } else {
      let findWinner = await GameContract.win(
        firstPlayerMove + 1,
        secondPlayerMove
      );
      if (findWinner) {
        return 1;
      } else {
        return 2;
      }
    }

  };

  const handleTimeouts = async () => {
    if (isGameEnded) return;
    let isPlayer1 = state.opponent != null;

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();

    const rpsContract = new ethers.Contract(
      state.contract != null ? state.contract : deployedContractAddress,
      gameContractABI.abi,
      signer
    );

    if (opponentMove == null && isPlayer1 && isEligibleForAppeal) {

      loaderCallback(true, "Appealing ...");
      setIsEligibleForAppeal(false);

      try {

        let result = await rpsContract.j2Timeout();
        await result.wait();
        isj2Timedout = true;

      } catch (error) {

        isj2Timedout = false;
        setIsEligibleForAppeal(true);

      }
    } else if (revealMove == false && !isPlayer1 && isEligibleForAppeal) {
      loaderCallback(true, "Appealing ...");
      setIsEligibleForAppeal(false);

      try {

        let result = await rpsContract.j1Timeout();
        await result.wait();
        isj1Timedout = true;

      } catch (error) {

        isj1Timedout = false;
        setIsEligibleForAppeal(true);

      }
    }

    socket.emit("brodcast_end_game", {
      oldRoom : room,
      room    : 1
    });

    loaderCallback(false, "");
    setIsGameEnded(true);
    setTimeout(() => { navigate("/"); }, 15000);
  }

  const renderer = ({ formatted: { minutes, seconds }, completed }) => {
    if (completed) {

      let isPlayer1 = state.opponent != null;
      let now = Date.now();
      let triggerAppeal = (
        isPlayer1 && opponentMove == null  && now > (state.timestamp + 300000) && !isj2Timedout
        || !isPlayer1 && revealMove == false && now > (revealTimestamp + 300000) && revealTimestamp != null && !isj1Timedout
      );
      setIsEligibleForAppeal(triggerAppeal);

      return null;

    } else {
      return (
        <span className="timer">
          {zeroPad(minutes)}:{zeroPad(seconds)}
        </span>
      );
    }
  };

  const handleRevealMoves = async () => {
    
    if (isGameEnded) return;
    loaderCallback(true, "Revealing ...");
    let l1Choice = state.choice - 1;

    setDeployedContractAddress(state.contract);

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();

    const RPSContract = new ethers.Contract(
      state.contract,
      gameContractABI.abi,
      signer
    );

    let win;

    try {
      await RPSContract.solve(state.choice, state.salt);
      win = await announceWinner(l1Choice);
      setWinner(win);
      loaderCallback(false, "");
    } catch (error) {
      loaderCallback(false, "");
      return;
    }

    setRevealMove(true);
    setRevealTimestamp(null);
    setInitiatorMove(l1Choice);
    handlePause(j1Timeout);
    setIsGameEnded(true);

    socket.emit("initiator_move", {
      choosenMove: l1Choice,
      room: room,
    });

    socket.emit("brodcast_winner", {
      room   : room,
      winners: win
    });

    socket.emit("brodcast_end_game", {
      oldRoom : room,
      room    : 1
    });

    setTimeout(() => { navigate("/"); }, 15000);
  };

  return (
    <>
      <h1>Rock Paper Scissors Lizard Spock</h1>
      <div>
        <br />
          <div>
            <div className="container-inner">
              <div className="section">
                <div className="info">
                  <h3>{state.opponent != null ? "You" : "Friend"}</h3>
                </div>
                <div className="show">
                  {revealTimestamp != null && <Countdown date={revealTimestamp + 300000} zeroPadTime={3} renderer={renderer} ref={j1Timeout}/>}
                  { initiatorMove != null
                    ? selection[initiatorMove]
                    : "🎁" }
                </div>
              </div>
              {winner != null && (<div className="Winner">
                  {winner == 0 ? "TIE" : ((winner == 1 && state.opponent != null || winner == 2 && state.opponent == null) ? "You Won": "You Lost")}
              </div>)}
              <div className="section">
                <div className="info">
                  <h3>{state.opponent != null ? "Friend" : "You"}</h3>
                </div>
                <div className="show computer">
                {opponentMove == null && <Countdown date={state.timestamp + 300000} zeroPadTime={3} renderer={renderer} ref={j2Timeout}/>}
                  {opponentMove != null
                    ? selection[opponentMove]
                    : null}
                </div>
              </div>
            </div>
            {state.opponent != null && opponentMove != null && winner == null && (
              <div className="reveal"><button onClick={() => handleRevealMoves()}>REVEAL</button></div>
            )}
            { isEligibleForAppeal && (
              <div className="reveal"><button onClick={() => handleTimeouts()}>Appeal</button></div>
            )}
            {state.opponent == null && opponentMove == null && (
            <div className="attack-btn">
              {selection.map((select, index) => (
                <button key={index} onClick={() => clickHandler(index)}>
                  {select}
                </button>
              ))}
            </div>
            )}
          </div>
          {isGameEnded && (<h2> Game Ends in 15s ... </h2>)}
      </div>
    </>
  );
}

export default PlayArena;
