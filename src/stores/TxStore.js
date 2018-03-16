import { action, observable, computed, autorun, toJS } from "mobx";
import Web3Utils from 'web3-utils'
import Web3 from "web3";
import { observer } from "mobx-react";


class TxStore {
  @observable txs = []
  txHashToIndex = {}
  constructor(rootStore) {
    this.web3Store = rootStore.web3Store
    this.gasPriceStore = rootStore.gasPriceStore
    this.errorsStore = rootStore.errorsStore
  }

  @action
  async doSend({to, gasPrice, from, value}){
    const index = this.txs.length;
    this.web3Store.getWeb3Promise.then(async ()=> {
      if(!this.web3Store.defaultAccount){
        this.errorsStore.pushError({label: "Error", message: "Please unlock metamask", type: "error"})
        return
      }
      try {
        const gas = await this.web3Store.injectedWeb3.eth.estimateGas({
          to,
          gasPrice,
          from,
          value
        })
        this.web3Store.injectedWeb3.eth.sendTransaction({
          to,
          gasPrice,
          gas: Web3Utils.toHex(gas.toString()),
          from,
          value,
        }).on('transactionHash', function(hash){
          console.log('txHash', hash)
          this.txHashToIndex[hash] = index;
          this.txs[index] = {status: 'pending', name: `Sending ${to} ${value}`, hash}
          this.getTxReceipt(hash)
        })
        return
      } catch(e) {
        console.log(e)
        this.errorsStore.pushError(e);
      }
    })

  }

  async _approve(){
    // const index = this.txs.length;
    // const web3 = this.web3Store.web3;
    // const token = new web3.eth.Contract(ERC20ABI, this.tokenStore.tokenAddress);
    // try{
    //   return token.methods['approve(address,uint256)'](this.tokenStore.proxyMultiSenderAddress, this.tokenStore.totalBalanceWithDecimals)
    //   .send({from: this.web3Store.defaultAccount, gasPrice: this.gasPriceStore.standardInHex})
    //   .on('transactionHash', (hash) => {
    //     this.approval = hash
    //     this.txHashToIndex[hash] = index;
    //     this.txs[index] = {status: 'pending', name: `MultiSender Approval to spend ${this.tokenStore.totalBalance} ${this.tokenStore.tokenSymbol}`, hash}
    //     this.getTxReceipt(hash)
  
    //   })
    //   .on('error', (error) => {
    //     console.error(error)
    //   })
    // } catch (e){
    //   console.error(e)
    // }
    
  }

  async _multisend({slice, addPerTx}) {
    // const token_address = this.tokenStore.tokenAddress
    // let {addresses_to_send, balances_to_send, proxyMultiSenderAddress, currentFee} =  this.tokenStore;
    // currentFee = Web3Utils.toHex(Web3Utils.toWei(currentFee))
    // const start = (slice - 1) * addPerTx;
    // const end = slice * addPerTx;
    // addresses_to_send = addresses_to_send.slice(start, end);
    // balances_to_send = balances_to_send.slice(start, end);
    // console.log('slice', slice, addresses_to_send[0], balances_to_send[0], addPerTx)
    // const web3 = this.web3Store.web3;
    // const multisender = new web3.eth.Contract(MultiSenderAbi, proxyMultiSenderAddress);

    // try {
    //   let encodedData = await multisender.methods.multisendToken(token_address, addresses_to_send, balances_to_send).encodeABI({from: this.web3Store.defaultAccount})
    //   let gas = await web3.eth.estimateGas({
    //       from: this.web3Store.defaultAccount,
    //       data: encodedData,
    //       value: currentFee,
    //       to: proxyMultiSenderAddress
    //   })
    //   let tx = multisender.methods.multisendToken(token_address, addresses_to_send, balances_to_send)
    //   .send({
    //     from: this.web3Store.defaultAccount,
    //     gasPrice: this.gasPriceStore.standardInHex,
    //     gas: Web3Utils.toHex(gas),
    //     value: currentFee
    //   })

    //   .on('transactionHash', (hash) => {
    //     // console.log('txHash',hash)
    //     this.txHashToIndex[hash] = this.txs.length
    //     this.txs.push({status: 'pending', name: `Sending Batch #${this.txs.length} ${this.tokenStore.tokenSymbol}\n
    //       From ${addresses_to_send[0]} to: ${addresses_to_send[addresses_to_send.length-1]}
    //     `, hash})
    //     this.getTxReceipt(hash)
  
    //   })
    //   .on('error', (error) => {
    //     console.log(error)
    //   })
    //   slice--;
    //   if (slice > 0) {
    //     this._multisend({slice, addPerTx});
    //   } else {
          
    //   }
    // } catch(e){
    //   console.error(e)
    // }
  }  

  async getTxReceipt(hash){
    const web3 = this.web3Store.injectedWeb3;
    web3.eth.getTransaction(hash, (error, res) => {
      if(res && res.blockNumber){
        this.getTxStatus(hash)
      } else {
        console.log('not mined yet', hash)
        setTimeout(() => {
          this.getTxReceipt(hash)
        }, 5000)
      }
    })
  }

  async getTxStatus(hash) {
    console.log('GET TX STATUS', hash)
    const web3 = this.web3Store.injectedWeb3;
    web3.eth.getTransactionReceipt(hash, (error, res) => {
      if(res && res.blockNumber){
        if(res.status === '0x1'){
          const index = this.txHashToIndex[hash]
          this.txs[index].status = `mined`
          this.errorsStore.pushError({label: "Success", message: `${hash} Mined successfully`, type: "success"})
        } else {
          const index = this.txHashToIndex[hash]
          this.txs[index].status = `error`
          this.txs[index].name = `Mined but with errors. Perhaps out of gas`
          this.errorsStore.pushError({label: "Error", message: `${hash} Mined but with errors. Perhaps out of gas`, type: "error"})
        }
      } else {
        this.getTxStatus(hash)
      }
    })
  }

}

export default TxStore;