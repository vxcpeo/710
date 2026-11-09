import path from 'node:path';import{createRequire}from'node:module';import{fileURLToPath,pathToFileURL}from'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));const require=createRequire(path.resolve(dir,'../../contracts/package.json'));
process.chdir(path.resolve(dir,'../../contracts'));
const{createHardhatRuntimeEnvironment}=await import(pathToFileURL(require.resolve('hardhat/hre')).href);
const{BrowserProvider,Contract,keccak256}=require('ethers');
let connection,provider;
try{
 const hre=await createHardhatRuntimeEnvironment({networks:{testnetFork:{type:'edr-simulated',chainId:46630,hardfork:'cancun',loggingEnabled:false,forking:{url:'https://rpc.testnet.chain.robinhood.com',blockNumber:120766832,httpHeaders:{'User-Agent':'Mozilla/5.0'}}}}});
 connection=await hre.network.create('testnetFork');provider=new BrowserProvider(connection.provider);
 console.log('forkBlock',await provider.getBlockNumber());console.log('forkNetwork',(await provider.getNetwork()).chainId.toString());
 await connection.provider.request({method:'evm_mine',params:[]});
 const manager='0x8366a39CC670B4001A1121B8F6A443A643e40951';const code=await provider.getCode(manager);console.log('poolManagerCodeBytes',(code.length-2)/2,'hash',keccak256(code));
 const pm=new Contract('0x58daec3116aae6D93017bAAea7749052E8a04fA7',['function poolManager() view returns(address)','function permit2() view returns(address)','function nextTokenId() view returns(uint256)'],provider);
 console.log('poolManager',await pm.poolManager());console.log('permit2',await pm.permit2());console.log('nextTokenId',(await pm.nextTokenId()).toString());
}catch(e){console.error(e);process.exitCode=1;}finally{provider?.destroy();await connection?.close();}
