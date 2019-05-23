const { describe } = require('riteway')
const http = require('http')
require('./index.js')

process.on('unhandledRejection', () => {})

const transactions = (() => {
  let status = {
    harvest: false,
    subscription: false,
    accounts: false
  }

  const execute = (name) => status[name] = true

  const check = (name) => status[name]

  return {
    execute, check
  }
})()

const mockTransactions = (finish) => {
  const request = http.request

  const mayFinish = () => {
    if (
      transactions.check('harvest') &&
      transactions.check('subscription') &&
      transactions.check('accounts')
    ) {
      finish()
    }
  }

  http.request = function (req) {
    const body = JSON.parse(req.body)

    if (body.transaction || body.table) {
      if (body.transaction) {
        const { actions } = body.transaction

        if (actions.find((action) => action.name === 'onperiod'))
          transactions.execute('harvest')

        if (actions.find((action) => action.name === 'onblock'))
          transactions.execute('subscription')

      } else if (body.table == 'requests') {
        transactions.execute('accounts')
      }

      mayFinish()

      arguments[0].url = ''
      arguments[0].path = ''
      return request.apply(this, arguments)
    }

    return request.apply(this, arguments)
  }
}

describe('Seeds', async assert => {
  const finish = () => {
    assert({
      given: 'every harvest period',
      should: 'send harvest transaction',
      actual: transactions.check('harvest'),
      expected: true
    })

    assert({
      given: 'every subscription period',
      should: 'send subscription transaction',
      actual: transactions.check('subscription'),
      expected: true
    })

    assert({
      given: 'every fulfillment period',
      should: 'send fulfillment transaction',
      actual: transactions.check('accounts'),
      expected: true
    })

    process.exit(1)
  }

  mockTransactions(finish)
  setTimeout(finish, 30000)
})
