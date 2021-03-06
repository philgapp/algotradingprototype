// LongShortExample.js is the very first algorithm, taken from Alpaca's examples

// First connect to Alpaca and set any constants needed for this algorithm
const AlpacaConfig = require('../alpaca.config');
const SideType = { BUY: 'buy', SELL: 'sell' }
const PositionType = { LONG: 'long', SHORT: 'short' }
const algoLogArray = new Array()

class LongShort {
    constructor ({ keyId, secretKey, paper = true, stocks, bucketPct = 0.25 }) {
        var Alpaca = require('@alpacahq/alpaca-trade-api');
        this.alpaca = new Alpaca({
            keyId: keyId,
            secretKey: secretKey,
            paper: paper,
            usePolygon: USE_POLYGON
        })

        //let stocks = ['DOMO', 'TLRY', 'SQ', 'MRO', 'AAPL', 'GM', 'SNAP', 'SHOP', 'SPLK', 'BA', 'AMZN', 'SUI', 'SUN', 'TSLA', 'CGC', 'SPWR', 'NIO', 'CAT', 'MSFT', 'PANW', 'OKTA', 'TWTR', 'TM', 'RTN', 'ATVI', 'GS', 'BAC', 'MS', 'TWLO', 'QCOM']
        this.stockList = stocks.map(item => ({ name: item, pc: 0 }))

        this.long = []
        this.short = []
        this.qShort = null
        this.qLong = null
        this.adjustedQLong = null
        this.adjustedQShort = null
        this.blacklist = new Set()
        this.longAmount = 0
        this.shortAmount = 0
        this.timeToClose = null
        this.bucketPct = bucketPct
    }

    getLogs() {
        return algoLogArray
    }

    async run () {
        // First, cancel any existing orders so they don't impact our buying power.
        await this.cancelExistingOrders()

        // Wait for market to open.
        log('Waiting for market to open...')
        await this.awaitMarketOpen()
        log('Market opened.')

        // Rebalance the portfolio every minute, making necessary trades.
        var spin = setInterval(async () => {
            // Figure out when the market will close so we can prepare to sell beforehand.
            try {
                let clock = await this.alpaca.getClock()
                let closingTime = new Date(clock.next_close.substring(0, clock.next_close.length - 6))
                let currTime = new Date(clock.timestamp.substring(0, clock.timestamp.length - 6))
                this.timeToClose = Math.abs(closingTime - currTime)
            } catch (err) {
                log(err.error)
            }

            const INTERVAL = 15 // minutes

            if (this.timeToClose < (MINUTE * INTERVAL)) {
                // Close all positions when 15 minutes til market close.
                log('Market closing soon. Closing positions.')

                try {
                    let positions = await this.alpaca.getPositions()

                    await Promise.all(positions.map(position => this.submitOrder({
                        quantity: Math.abs(position.qty),
                        stock: position.symbol,
                        side: position.side === PositionType.LONG ? SideType.SELL : SideType.BUY
                    })))
                } catch (err) {
                    log(err.error)
                }

                clearInterval(spin)
                log(`Sleeping until market close (${INTERVAL} minutes).`)

                setTimeout(() => {
                    // Run script again after market close for next trading day.
                    this.run()
                }, MINUTE * INTERVAL)
            } else {
                // Rebalance the portfolio.
                await this.rebalance()
            }
        }, MINUTE)
    }

    // Spin until the market is open
    async awaitMarketOpen () {
        return new Promise(resolve => {
            const check = async () => {
                try {
                    let clock = await this.alpaca.getClock()
                    if (clock.is_open) {
                        resolve()
                    } else {
                        let openTime = new Date(clock.next_open.substring(0, clock.next_close.length - 6))
                        let currTime = new Date(clock.timestamp.substring(0, clock.timestamp.length - 6))
                        this.timeToClose = Math.floor((openTime - currTime) / 1000 / 60)
                        log(`${this.timeToClose} minutes til next market open.`)
                        setTimeout(check, MINUTE)
                    }
                } catch (err) {
                    log(err.error)
                }
            }
            check()
        })
    }

    async cancelExistingOrders () {
        let orders
        try {
            orders = await this.alpaca.getOrders({
                status: 'open',
                direction: 'desc'
            })
        } catch (err) {
            log(err.error)
        }

        return Promise.all(orders.map(order => {
            return new Promise(async (resolve) => {
                try {
                    await this.alpaca.cancelOrder(order.id)
                } catch (err) {
                    log(err.error)
                }
                resolve()
            })
        }))
    }

    // Rebalance our position after an update.
    async rebalance () {
        await this.rerank()

        // Clear existing orders again.
        await this.cancelExistingOrders()

        log(`We are taking a long position in: ${this.long.toString()}`)
        log(`We are taking a short position in: ${this.short.toString()}`)

        // Remove positions that are no longer in the short or long list, and make a list of positions that do not need to change.
        // Adjust position quantities if needed.
        let positions
        try {
            positions = await this.alpaca.getPositions()
        } catch (err) {
            log(err.error)
        }

        let executed = { long: [], short: [] }

        this.blacklist.clear()

        await Promise.all(positions.map(position => {
            return new Promise(async (resolve, reject) => {
                let quantity = Math.abs(position.qty)
                let symbol = position.symbol

                if (this.long.indexOf(symbol) < 0) {
                    // Position is not in short list.
                    if (this.short.indexOf(symbol) < 0) {
                        // Clear position.
                        try {
                            await this.submitOrder({
                                quantity,
                                stock: symbol,
                                side: position.side === PositionType.LONG ? SideType.SELL : SideType.BUY
                            })
                            resolve()
                        } catch (err) {
                            log(err.error)
                        }
                    } else if (position.side === PositionType.LONG) { // Position in short list.
                        try {
                            // Position changed from long to short. Clear long position and short instead
                            await this.submitOrder({
                                quantity,
                                stock: symbol,
                                side: SideType.SELL
                            })
                            resolve()
                        } catch (err) {
                            log(err.error)
                        }
                    } else {
                        // Position is not where we want it.
                        if (quantity !== this.qShort) {
                            // Need to adjust position amount
                            let diff = Number(quantity) - Number(this.qShort)
                            try {
                                await this.submitOrder({
                                    quantity: Math.abs(diff),
                                    stock: symbol,
                                    // buy = Too many short positions. Buy some back to rebalance.
                                    // sell = Too little short positions. Sell some more.
                                    side: diff > 0 ? SideType.BUY : SideType.SELL
                                })
                            } catch (err) {
                                log(err.error)
                            }
                        }
                        executed.short.push(symbol)
                        this.blacklist.add(symbol)
                        resolve()
                    }
                } else if (position.side === PositionType.SHORT) { // Position in long list.
                    // Position changed from short to long. Clear short position and long instead.
                    try {
                        await this.submitOrder({ quantity, stock: symbol, side: SideType.BUY })
                        resolve()
                    } catch (err) {
                        log(err.error)
                    }
                } else {
                    // Position is not where we want it.
                    if (quantity !== this.qLong) {
                        // Need to adjust position amount.
                        let diff = Number(quantity) - Number(this.qLong)
                        // sell = Too many long positions. Sell some to rebalance.
                        // buy = Too little long positions. Buy some more.
                        let side = diff > 0 ? SideType.SELL : SideType.BUY
                        try {
                            await this.submitOrder({ quantity: Math.abs(diff), stock: symbol, side })
                        } catch (err) {
                            log(err.error)
                        }
                    }
                    executed.long.push(symbol)
                    this.blacklist.add(symbol)
                    resolve()
                }
            })
        }))

        this.adjustedQLong = -1
        this.adjustedQShort = -1

        try {
            // Send orders to all remaining stocks in the long and short list
            let [longOrders, shortOrders] = await Promise.all([
                this.sendBatchOrder({
                    quantity: this.qLong,
                    stocks: this.long,
                    side: SideType.BUY
                }),
                this.sendBatchOrder({
                    quantity: this.qShort,
                    stocks: this.short,
                    side: SideType.SELL
                })
            ])

            executed.long = longOrders.executed.slice()
            executed.short = shortOrders.executed.slice()

            // Handle rejected/incomplete long orders
            if (longOrders.incomplete.length > 0 && longOrders.executed.length > 0) {
                let prices = await this.getTotalPrice(longOrders.executed)
                let completeTotal = prices.reduce((a, b) => a + b, 0)
                if (completeTotal !== 0) {
                    this.adjustedQLong = Math.floor(this.longAmount / completeTotal)
                }
            }

            // Handle rejected/incomplete short orders
            if (shortOrders.incomplete.length > 0 && shortOrders.executed.length > 0) {
                let prices = await this.getTotalPrice(shortOrders.executed)
                let completeTotal = prices.reduce((a, b) => a + b, 0)
                if (completeTotal !== 0) {
                    this.adjustedQShort = Math.floor(this.shortAmount / completeTotal)
                }
            }
        } catch (err) {
            log(err.error)
        }

        try {
            // Reorder stocks that didn't throw an error so that the equity quota is reached.
            await new Promise(async (resolve) => {
                let allProms = []

                if (this.adjustedQLong >= 0) {
                    this.qLong = this.adjustedQLong - this.qLong
                    allProms = [
                        ...allProms,
                        ...executed.long.map(stock => this.submitOrder({
                            quantity: this.qLong,
                            stock,
                            side: SideType.BUY
                        }))
                    ]
                }

                if (this.adjustedQShort >= 0) {
                    this.qShort = this.adjustedQShort - this.qShort
                    allProms = [
                        ...allProms,
                        ...executed.short.map(stock => this.submitOrder({
                            quantity: this.qShort,
                            stock,
                            side: SideType.SELL
                        }))
                    ]
                }

                if (allProms.length > 0) {
                    await Promise.all(allProms)
                }

                resolve()
            })
        } catch (err) {
            log(err.error)
        }
    }

    // Re-rank all stocks to adjust longs and shorts.
    async rerank () {
        await this.rank()


        // Grabs the top and bottom bucket (according to percentage) of the sorted stock list
        // to get the long and short lists.
        let bucketSize = Math.floor(this.stockList.length * this.bucketPct)

        this.short = this.stockList.slice(0, bucketSize).map(item => item.name)
        this.long = this.stockList.slice(this.stockList.length - bucketSize).map(item => item.name)

        // Determine amount to long/short based on total stock price of each bucket.
        // Employs 130-30 Strategy
        try {
            let result = await this.alpaca.getAccount()
            let equity = result.equity
            this.shortAmount = 0.30 * equity
            this.longAmount = Number(this.shortAmount) + Number(equity)
        } catch (err) {
            log(err.error)
        }

        try {
            let longPrices = await this.getTotalPrice(this.long)
            let longTotal = longPrices.reduce((a, b) => a + b, 0)
            this.qLong = Math.floor(this.longAmount / longTotal)
        } catch (err) {
            log(err.error)
        }

        try {
            let shortPrices = await this.getTotalPrice(this.short)
            let shortTotal = shortPrices.reduce((a, b) => a + b, 0)
            this.qShort = Math.floor(this.shortAmount / shortTotal)
        } catch (err) {
            log(err.error)
        }
    }

    // Get the total price of the array of input stocks.
    async getTotalPrice (stocks = []) {
        return Promise.all(stocks.map(stock => {
            return new Promise(async (resolve) => {
                try {
                    let resp = await this.alpaca.getBars('minute', stock, { limit: 1 })
                    // polygon and alpaca have different responses to keep backwards
                    // compatibility, so we handle it a bit differently
                    if (USE_POLYGON) {
                        resolve(resp[stock][0].c);
                    } else{
                        resolve(resp[stock][0].closePrice);
                    }
                } catch (err) {
                    log(err.error)
                }
            })
        }))
    }

    // Submit an order if quantity is above 0.
    async submitOrder ({ quantity, stock, side }) {
        return new Promise(async (resolve) => {
            if (quantity <= 0) {
                log(`Quantity is <=0, order of | ${quantity} ${stock} ${side} | not sent.`)
                resolve(true)
                return
            }

            try {
                await this.alpaca.createOrder({
                    symbol: stock,
                    qty: quantity,
                    side,
                    type: 'market',
                    time_in_force: 'day'
                })
                log(`Market order of | ${quantity} ${stock} ${side} | completed.`)
                resolve(true)
            } catch (err) {
                log(`Order of | ${quantity} ${stock} ${side} | did not go through.`)
                resolve(false)
            }
        })
    }

    // Submit a batch order that returns completed and uncompleted orders.
    async sendBatchOrder ({ quantity, stocks, side }) {
        return new Promise(async (resolve) => {
            let incomplete = []
            let executed = []
            await Promise.all(stocks.map(stock => {
                return new Promise(async (resolve) => {
                    if (!this.blacklist.has(stock)) {
                        try {
                            let isSubmitted = await this.submitOrder({ quantity, stock, side })
                            if (isSubmitted) {
                                executed.push(stock)
                            } else {
                                incomplete.push(stock)
                            }
                        } catch (err) {
                            log(err.error)
                        }
                    }
                    resolve()
                })
            }))
            resolve({ incomplete, executed })
        })
    }

    // Get percent changes of the stock prices over the past 10 minutes.

    getPercentChanges (limit = 10) {
        return Promise.all(this.stockList.map(stock => {
            return new Promise(async (resolve) => {
                try {
                    let resp = await this.alpaca.getBars('minute', stock.name, { limit: limit })
                    // polygon and alpaca have different responses to keep backwards
                    // compatibility, so we handle it a bit differently
                    if (USE_POLYGON) {
                        stock.pc = (resp[stock.name][length - 1].c - resp[stock.name][0].o) / resp[stock.name][0].o;
                    } else{
                        stock.pc = (resp[stock.name][length - 1].closePrice - resp[stock.name][0].openPrice) / resp[stock.name][0].openPrice;
                    }
                } catch (err) {
                    log(err.error)
                }
                resolve()
            })
        }))
    }

    // Mechanism used to rank the stocks, the basis of the Long-Short Equity Strategy.
    async rank () {
        // Ranks all stocks by percent change over the past 10 minutes (higher is better).
        await this.getPercentChanges()

        // Sort the stocks in place by the percent change field (marked by pc).
        this.stockList.sort((a, b) => { return a.pc - b.pc })
    }
}

function log (text) {
    console.log(text)
    algoLogArray.push(text)
    return algoLogArray
}

module.exports = LongShort;