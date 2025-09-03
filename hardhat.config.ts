import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";


const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
        details: {
          yul: true
        }
      }
    }
  },
  networks: {
    hardhat: {
      forking:{
        url: "https://rpc.ankr.com/arbitrum/b886c5e66f976c5296be03266ade2427c854883474a27d5e77a81a7a305a7c25",
        
      }
    }
  }
};


export default config;