import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './joingame.css';
import { ethers } from "ethers";
import io from "socket.io-client";
import gameContractABI from "../../artifacts/contracts/RPS.sol/RPS.json";
import Countdown, { zeroPad } from "react-countdown";

const socket = io.connect("https://socket-service-194e5cc34a05.herokuapp.com/");
const room = 1;
socket.on("connect", () => {
  console.log("SOCKET CONNECTED");
})
let startTimestamp;

const JoinGame = ({loaderCallback}) => {

  const navigate                                            = useNavigate();
  const selection                                           = ["🪨", "📰", "✂️", "🖖", "🦎"];
  const [actives, setActive]                                = useState([]);
  const [hasInvite, setInvite]                              = useState(null);
  const [initSelection, setInitSelection]                   = useState(null);
  const [selectedOpponent, setSelectedOpponent]             = useState(null);
  const [connectedWalletAddress, setConnectedWalletAddress] = useState(null);
  const [stakeAmount,setStakeAmount]                        = useState();

  let provider;
  let signer = null;

  useEffect(() => {

    socket.on("update_users", (data) => {
      setActive(data);
    });

    socket.on("received_join_game", (data) => {
      setInvite(data);
    });
  }, [socket]);


  const deployRPSContract = async (hash, WalletAddress, salt) => {

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();

    const factory = new ethers.ContractFactory(
      gameContractABI.abi,
      gameContractABI.bytecode,
      signer
    );
    let contract;
    try {
      contract = await factory.deploy(hash, WalletAddress, {
        value: ethers.parseUnits(stakeAmount, "wei"),   //@TODO Stake Input
      });
      
      await contract.waitForDeployment();
      loaderCallback(false, "");
    } catch (error) {
      loaderCallback(false, "");
      return;
    }

    startTimestamp = Date.now();

    socket.emit("brodcast_join_game", {
      room      : room,
      contract  : contract.target,
      opponent  : selectedOpponent,
      timestamp : startTimestamp,
      stakeAmount : stakeAmount,
      link      : `/game/${connectedWalletAddress}`
    });

    socket.emit("change_room", {
      room    : 1337,
      oldRoom : room
    });

    navigate(`/game/${connectedWalletAddress}`,
      {
        state: {
          salt      : salt,
          contract  : contract.target,
          choice    : initSelection + 1,
          opponent  : selectedOpponent,
          timestamp : startTimestamp,
          player    : connectedWalletAddress
        }
      }
    );
  };

  const handleConnectwallet = async () => {

    if (window.ethereum && connectedWalletAddress === null) {
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();

      let user_address = signer.address;
      socket.emit("join_room",
        { room, user_address }
      );

      setConnectedWalletAddress(signer.address);
    }

  };

  const handleJoinGame = () => {
    socket.emit("change_room",
      {
        room    : 1337,
        oldRoom : room
      }
    );
    navigate(hasInvite.link,
      {
        state: {
          player: connectedWalletAddress, timestamp: hasInvite.timestamp, stakeAmount: hasInvite.stakeAmount
        }
      }
    );
  }

  const generateSalt = () => {
    const saltArray = new Uint8Array(32);
    window.crypto.getRandomValues(saltArray);
    const numberSalt = Array.from(saltArray, (byte) => byte % 10).join("");
    return numberSalt;
  };

  const handleNewGame = async () => {
    loaderCallback(true, "Deploying Game ...");
  
    let salt_ = generateSalt();
    const getHash = ethers.solidityPackedKeccak256(['uint8', 'uint256'], [initSelection + 1, salt_]);

    await deployRPSContract(getHash, selectedOpponent, salt_);
  };

  const handleStakeEntered = (e) => {
    setStakeAmount(e.target.value);
  }
  

  const renderer = ({ formatted: { minutes, seconds }, completed }) => {
    if (completed) { return null;}
    else {
      return (
        <div>
          <button className="social-login" onClick={() => handleJoinGame()}>
            Join Game 🪙{hasInvite.stakeAmount}
          </button>
          <span className='join-timer'>
            Ends in: {zeroPad(minutes)}:{zeroPad(seconds)}
          </span>
          <p className="seperator" >-OR-</p>
        </div>
      );
    }
  };


  return (
    <div className="join-game-container">
      <h1>Rock Paper Scissors Lizard Spock</h1>
      {
        connectedWalletAddress === null
          ? <button onClick={() => handleConnectwallet()}>Connect Wallet</button>
          : <div className='container-main'>
            <div className="left-main">
              <div className="container-fluid h-50">
                <div className="row justify-content-center h-100">
                  <div className="col-md-4 col-xl-3 chat">
                    <div className="card mb-sm-3 mb-md-0 contacts_card">
                        <ul className="contacts">
                          {actives.map((user, index) => (
                            <li key={index} className={selectedOpponent === user ? "active" : (user === connectedWalletAddress) ? "inactive notAllowed": "inactive"} onClick={() => { if (user !== connectedWalletAddress) {setSelectedOpponent(user)}}}>
                              <div className="d-flex bd-highlight inline">
                                <div className="img_cont">
                                  <img src="https://therichpost.com/wp-content/uploads/2020/06/avatar2.png" className="rounded-circle user_img" alt="avatar"/>
                                  <span className="online_icon"></span>
                                </div>
                                <div className="user_info">
                                  {user === connectedWalletAddress ? (<span>You</span>) : (<span>Player {index}</span>)}
                                  <p>{user}</p>
                                </div>
                              </div>
                            </li>
                            ))
                          }
                        </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="right-main">
              {connectedWalletAddress !== null && (
                <div className="container">
                  <div className="section">
                    {hasInvite !== null && hasInvite.opponent === connectedWalletAddress && (
                      <Countdown date={hasInvite.timestamp + 300000} zeroPadTime={2}
                        renderer={renderer} />
                    )}
                    <div className="show-player">
                      {selection[initSelection]}
                    </div>
                  </div>
                  <div className="attack-btn-joingame">
                    {selection.map((select, index) => (
                      <button className={initSelection === index ? "active-btn" : ""} key={index} onClick={() => setInitSelection(index)}>
                        {select}
                      </button>
                    ))}
                  </div>
                  {
                    (initSelection !== null && selectedOpponent !== null) && (
                      <>
                      <br/>
                      <input type="number"  placeholder='stake in wei' onChange={handleStakeEntered} value={stakeAmount} min={1} step="1"/>
                      <span className='disclaimer'>* Minimum stake is 1</span>
                      {parseInt(stakeAmount) > 0 && <button className="join-game-button" onClick={handleNewGame}>Start Game</button>}
                      </>
                    )
                  }

                </div>
              )}

            </div>
          </div>
      }
    </div>
  );
};

export default JoinGame;
