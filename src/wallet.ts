import { ref } from 'vue'
import { BrowserProvider, verifyMessage } from 'ethers'

export const NETWORK = { chainId: '0xb626', chainName: 'Robinhood Chain Testnet', nativeCurrency: { name: 'Test Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://rpc.testnet.chain.robinhood.com'], blockExplorerUrls: ['https://explorer.testnet.chain.robinhood.com'] }
export const account = ref('')
export const signedIn = ref(false)
export const wrongNetwork = ref(false)
export const walletBusy = ref(false)
let injected: any
let browserProvider: BrowserProvider | undefined
const discovered = new Map<string, any>()
export const wallets = ref<{ id: string; name: string; provider: any }[]>([])
window.addEventListener('eip6963:announceProvider', ((event: CustomEvent) => {
  const { info, provider } = event.detail
  discovered.set(info.uuid, { id: info.uuid, name: info.name, provider })
  wallets.value = [...discovered.values()]
}) as EventListener)
window.dispatchEvent(new Event('eip6963:requestProvider'))

const onAccounts = (accounts: string[]) => { account.value = accounts[0] || ''; signedIn.value = false }
const onChain = (id: string) => { wrongNetwork.value = Number(id) !== 46630; signedIn.value = false; browserProvider = new BrowserProvider(injected, 'any') }
export async function connectWallet(wallet?: any) {
  walletBusy.value = true
  try {
    disconnect()
    injected = wallet || window.ethereum
    if (!injected) throw new Error('No browser wallet found. Install MetaMask or Coinbase Wallet, or open this site in your wallet browser.')
    browserProvider = new BrowserProvider(injected, 'any')
    const accounts = await injected.request({ method: 'eth_requestAccounts' })
    account.value = accounts[0] || ''
    wrongNetwork.value = Number(await injected.request({ method: 'eth_chainId' })) !== 46630
    injected.on?.('accountsChanged', onAccounts)
    injected.on?.('chainChanged', onChain)
  } finally { walletBusy.value = false }
}
export async function switchNetwork() {
  if (!injected) throw new Error('Connect a wallet first.')
  try { await injected.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: NETWORK.chainId }] }) }
  catch (error: any) {
    if (error.code === 4902 || error?.data?.originalError?.code === 4902) {
      await injected.request({ method: 'wallet_addEthereumChain', params: [NETWORK] })
      await injected.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: NETWORK.chainId }] })
    }
    else throw error
  }
  wrongNetwork.value = Number(await injected.request({ method: 'eth_chainId' })) !== 46630
  browserProvider = new BrowserProvider(injected, 'any')
  if (wrongNetwork.value) throw new Error('Select Robinhood Chain Testnet in your wallet to continue.')
}
export async function signIn() {
  if (!browserProvider || !account.value) throw new Error('Connect your wallet first.')
  if (wrongNetwork.value) await switchNetwork()
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('')
  const message = `${location.host} wants you to sign in with your Ethereum account:\n${account.value}\n\nSign in to your Sonira browser session. No transaction or spending permission.\n\nURI: ${location.origin}\nVersion: 1\nChain ID: 46630\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`
  const signature = await (await browserProvider.getSigner()).signMessage(message)
  signedIn.value = verifyMessage(message, signature).toLowerCase() === account.value.toLowerCase()
}
export function disconnect() {
  injected?.removeListener?.('accountsChanged', onAccounts)
  injected?.removeListener?.('chainChanged', onChain)
  account.value = ''; signedIn.value = false; wrongNetwork.value = false; injected = undefined; browserProvider = undefined
}
export async function transactionSigner() {
  if (!browserProvider || !account.value) throw new Error('Connect your wallet first.')
  if (wrongNetwork.value) await switchNetwork()
  if (Number(await injected.request({ method: 'eth_chainId' })) !== 46630) throw new Error('Switch to Robinhood Chain Testnet before continuing.')
  return browserProvider!.getSigner()
}
