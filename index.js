require('dotenv').config()

const config = {
  harvest: process.env.harvest,
  accounts: process.env.accounts || '',
  subscription: process.env.subscription || '',
  harvestBlocks: process.env.harvestBlocks || 10,
  subscriptionBlocks: process.env.subscriptionBlocks || 10,
  accountsBlocks: process.env.accountsBlocks || 10,
  keyProvider: process.env.keyProvider.split(' '),
  httpEndpoint: process.env.httpEndpoint,
  chainId: process.env.chainId
}

const Eos = require('eosjs')

const everyBlocks = (fn, n) =>
  setInterval(fn, n * 500)

Promise.resolve()
  .then(function setupBlockchain() {
    const { keyProvider, httpEndpoint, chainId, mockTransactions } = config

    return Eos({
      keyProvider: keyProvider,
      httpEndpoint: httpEndpoint,
      chainId: chainId,
      mockTransactions: null
    })
  })
  .then(function setupContracts(eos) {
    const { harvest, subscription, accounts } = config

    return Promise.all([
      eos.contract(subscription),
      eos.contract(accounts),
      eos.contract(harvest),
    ]).then(([subscription, accounts, harvest]) => ({
      contracts: { subscription, accounts, harvest },
      getTableRows: eos.getTableRows
    }))
  })
  .then(function setupTransactions({ contracts, getTableRows }) {
    const { harvest, subscription, accounts } = config

    return {
      harvest: () =>
        contracts.harvest.onperiod({ authorization: `${harvest}@active` }),

      subscription: () =>
          contracts.subscription.onblock({ authorization: `${subscription}@active` }),

      accounts: () =>
        getTableRows({
          code: accounts,
          scope: accounts,
          table: 'requests',
          json: true
        })
          .then(({ rows }) => {
            return Promise.all(
              rows.map(
                ({ app, user }) => contracts.accounts.fulfill(app, user, { authorization: `${accounts}@owner` })
              )
            )
          })
    }
  })
  .then(function processTransactions(transactions) {
    return [
      // everyBlocks(transactions.harvest, 2),
      // everyBlocks(transactions.subscription, config.subscriptionBlocks),
      everyBlocks(transactions.accounts, config.accountsBlocks)
    ]
  })
