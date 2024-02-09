import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import io from "socket.io-client";
import { useParams } from 'react-router-dom';
import playarenaABI from "../../artifacts/contracts/RPS.sol/Hasher.json";
import gameContractABI from "../../artifacts/contracts/RPS.sol/RPS.json";
import "./styles.css";

const socket = io.connect("https://socket-service-8dab8b02581c.herokuapp.com/");
const room = 1;
socket.on("connect", () => {
  console.log("SOCKET CONNECTED");
  socket.emit("join_room", room);
});
function PlayArena() {
  const [connButtonText, setConnButtonText] = useState("Connect Wallet");
  const [connectedWalletAddress, setConnectedWalletAddress] = useState(null);
  const room = 1;
  const { address } = useParams();
  const [initSelection, setInitSelection] = useState(null);
  const [opponentSelection, setOpponentSelection] = useState(null);
  const [initiatorMove, setInitiatorMove] = useState(null);
  const [opponentMove, setOpponentMove] = useState(null);
  const selection = ["🧱", "📰", "✂️", "🖖", "🦎"];
  const [opponentWalletAddress, setOpponentWalletAddress] = useState(address);
  const [deployedContractAddress, setDeployedContractAddress] = useState(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [allConnected, setAllConnected] = useState(false);
  const [revealMove, setRevealMove] = useState(false);
  const [winner, setWinner] = useState(null);
  console.log(address)
  useEffect(() => {
    socket.on("received_contract_address", (data) => {
      console.log("RECEIVED", data);
      setDeployedContractAddress(data.RPSContractAddress);
    });
    socket.on("both_players_joined", (data) => {
      console.log("ALL CONNECTED", data);
      setAllConnected(true);
    });
    socket.on("received_opponent_move", (data) => {
      console.log("RECEIVED OPPONENT MOVE", data);
      setOpponentMove(data.choosenMove);
      setDeployedContractAddress(data.deployedContractAddress);
    });
    socket.on("received_initator_move", (data) => {
      console.log("GOT MOVE FROM J1 to J2");
      setInitiatorMove(data.initSelection);
    });
  }, [socket]);

  let provider;
  let signer = null;
  let getOpponentAddress = null;
  const handleConnectwallet = async () => {
    if (window.ethereum) {
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      console.log(deployedContractAddress, "DEPLOYED");
      if (deployedContractAddress !== null) {
        console.log("COMING INSIDE");
        const RPSContract = new ethers.Contract(
          deployedContractAddress,
          gameContractABI.abi,
          provider
        );
        getOpponentAddress = await RPSContract.j2();
        console.log("OPPONENT ADDRESS", getOpponentAddress, signer.address);
        if (getOpponentAddress === signer.address) {
          setOpponentConnected(true);
        }
      }
      setConnectedWalletAddress(signer.address);
      setConnButtonText("Wallet Connected");
    }
  };
  const deployRPSContract = async (hash, WalletAddress) => {
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    const factory = new ethers.ContractFactory(
      gameContractABI.abi,
      gameContractABI.bytecode,
      signer
    );
    const contract = await factory.deploy(hash, WalletAddress, {
      value: ethers.parseUnits("1", "wei"),
    });
    await contract.waitForDeployment();
    const RPSContractAddress = contract.target;
    console.log("DEPLOYED SMART CONTRACT ADDRESS", RPSContractAddress);
    socket.emit("deployed_contract_address", { RPSContractAddress, room });
  };
  const clickHandler = async (choosenMove) => {
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    if (opponentConnected) {
      const rpsContract = new ethers.Contract(
        deployedContractAddress,
        gameContractABI.abi,
        signer
      );
      const playMove = await rpsContract.play(choosenMove + 1, {
        value: ethers.parseUnits("1", "wei"),
      });
      setOpponentSelection(choosenMove);
      console.log("Move of C2 is done", playMove);
      socket.emit("opponent_move", {
        deployedContractAddress,
        choosenMove,
        room,
      });
    } else {
      const Hasher = new ethers.Contract(
        "0xeC93001ee90bDa2dC46864Df96aC38DD0fC7d6F5",
        playarenaABI.abi,
        provider
      );
      setInitSelection(choosenMove);
      const getHash = await Hasher.hash(choosenMove + 1, 1234567890); //need to change later
      console.log(getHash);

      deployRPSContract(getHash, opponentWalletAddress);
    }
  };
  const announceWinner = async (firstPlayerMove) => {
    provider = new ethers.BrowserProvider(window.ethereum);
    const GameContract = new ethers.Contract(
      deployedContractAddress,
      gameContractABI.abi,
      provider
    );

    let secondPlayerMove = await GameContract.c2();
    secondPlayerMove = parseInt(secondPlayerMove, 10);

    if (firstPlayerMove + 1 === secondPlayerMove) {
      setWinner(0);
    } else {
      let findWinner = await GameContract.win(
        firstPlayerMove + 1,
        secondPlayerMove
      );
      if (findWinner) {
        setWinner(1);
      } else {
        setWinner(2);
      }
    }
    console.log(firstPlayerMove + 1, secondPlayerMove);
  };
  const handleRevealMoves = async () => {
    setRevealMove(true);
    socket.emit("initator_move", { initSelection, room });
    console.log(deployedContractAddress, initSelection + 1, "REVEALED");
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    const RPSContract = new ethers.Contract(
      deployedContractAddress,
      gameContractABI.abi,
      signer
    );
    const sendStakeToWinner = await RPSContract.solve(
      initSelection + 1,
      1234567890
    ); //need to change later

    announceWinner(initSelection);
    console.log(initSelection, opponentSelection, sendStakeToWinner);
  };
  return (
    <>
      <h1>Rock Paper Scissors Lizard Spock</h1>
      <div>
        <button onClick={handleConnectwallet}>{connButtonText}</button>
        {connectedWalletAddress && <p>{connectedWalletAddress}</p>}
        <br />
        {/* {connectedWalletAddress !== null && !opponentConnected && (
          <input
            type="text"
            placeholder="Enter Opponent Address"
            onChange={handleChange}
          ></input>
        )} */}
        {allConnected ? (
          <div>
            <div className="container">
              <div className="section">
                <div className="info">
                  <h3>{!opponentConnected ? "You" : "Friend"}</h3>
                </div>
                <div className="show">
                  {initiatorMove > 0
                    ? selection[initiatorMove]
                    : selection[initSelection]}
                </div>
              </div>

              <div className="section">
                <div className="info">
                  <h3>{!opponentConnected ? "Friend" : "You"}</h3>
                </div>
                <div className="show computer">
                  {opponentMove > 0 && revealMove
                    ? selection[opponentMove]
                    : selection[opponentSelection]}
                </div>
              </div>
            </div>
            {opponentMove > 0 && (
              <button onClick={handleRevealMoves}>REVEAL</button>
            )}
            <h2>Choose Move to sign contract</h2>

            {connectedWalletAddress != null && (
              <div className="attack-btn">
                {selection.map((select, index) => (
                  <button key={index} onClick={() => clickHandler(index)}>
                    {select}
                  </button>
                ))}
              </div>
            )}
            {deployedContractAddress}
          </div>
        ) : (
          <h1> Waiting for opponent to join... </h1>
        )}
      </div>
    </>
  );
}

export default PlayArena;
