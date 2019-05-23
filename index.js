const config = {
  harvest: process.env.harvest || 'seedshrvst11',
  accounts: process.env.accounts || 'seedsaccnts3',
  subscription: process.env.subscription || 'seedssubs222',
  harvestBlocks: process.env.harvestBlocks || 1,
  subscriptionBlocks: process.env.subscriptionBlocks || 1,
  accountsBlocks: process.env.accountsBlocks || 1,
  keyProvider: process.env.keyProvider || '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3',
  httpEndpoint: process.env.httpEndpoint || 'http://kylin.fn.eosbixin.com',
  chainId: process.env.chainId || '5fff1dae8dc8e2fc4d5b23b2c7665c97f9e9d8edf2b6485a86ba311c25639191'
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
          .then(({ rows }) => Promise.all(
            rows.forEach(
              ({ app, user }) => contracts.accounts.fulfill(app, user, { authorization: `${accounts}@owner` })
            )
          ))
    }
  })
  .then(function processTransactions(transactions) {
    return [
      everyBlocks(transactions.harvest, config.harvestBlocks),
      everyBlocks(transactions.subscription, config.subscriptionBlocks),
      everyBlocks(transactions.accounts, config.accountsBlocks)
    ]
  })
