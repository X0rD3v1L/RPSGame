async function main() {
  try {
    const contractName = "Hasher"; // Replace "Hasher" with the name of the contract you want to deploy
    const MyContract = await ethers.getContractFactory(contractName); 
    const deploymentTx = await MyContract.deploy();
    
    await deploymentTx.waitForDeployment();
    
    console.log("Contract deployed to:", deploymentTx.target); 
    process.exit(0);
  } catch (error) {    
    console.error(error); 
    process.exit(1); 
  }
}

main();

async function RPS(hashCode,opponentAddress) {
  try {
    const contractName = "RPS"; // Replace "Hasher" with the name of the contract you want to deploy
    const MyContract = await ethers.getContractFactory(contractName); 
    const deploymentTx = await MyContract.deploy(hashCode, opponentAddress, { value: ethers.utils.parseEther("0.1") });
    
    await deploymentTx.waitForDeployment();
    
    return deploymentTx.target; 
  } catch (error) {    
    console.error(error); 
  }
}



RPS();