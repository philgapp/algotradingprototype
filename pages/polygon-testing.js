import React, {useState, useEffect, PureComponent} from 'react'
import ReactDOM from 'react-dom'
import * as Airtable from "../library/airtable/airtable"
require('../library/alpaca.config')
import AlpacaCORS from '../library/algorithms/cors-api'
import {LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,} from 'recharts'
import {serveStatic} from "next/dist/next-server/server/serve-static";
const _ = require('lodash');

function PolygonTest() {
    // STATE
    const [barsToPull, setBarsToPull] = useState(350) // Number of bars to pull from Alpaca API
    const [barSize, setBarSize] = useState('1D') // 1Min (or minute), 5Min, 15Min, 1D (or day)
    const [alpacastocks, setAlpacastocks] = useState([]); // Array of stocks to load Alpaca data
    const [stocks, setStocks] = useState([]); // Array of stocks pulled from Airtable
    const [bars, setBars] = useState([]); // All price data for all stocks, used for TI calcs
    const [currentBar, setCurrentBar] = useState([]); // Last 1Min bar for all stocks, for current price data
    const [bars14, setBars14] = useState([]);
    const [stocksTI, setStocksTI] = useState([]); // TI calc results for all stocks
    const [settings, setSettings] = useState([]);
    const [reload, setReload] = useState(false) // Used with Reload Page button and function to pull data
    // Alpaca API Class
    const Alpaca = new AlpacaCORS({
        keyId: API_KEY, // TODO pull from Airtable
        secretKey: API_SECRET, // TODO pull from Airtable
        // Hard coded local cors-anywhere and Alpaca paper account for development
        corsUrl: 'http://localhost:8080',
        baseUrl: 'https://paper-api.alpaca.markets'
    });
    // Other initial variables
    const newDate = new Date()
    const today = newDate.toISOString()

    // Side effect hook (previously React lifecycle function(s))
    // Used to load initial data, but
    // TODO requires attention, fewer button clicks, better promise handling, more dynamic
    useEffect(() => {
        // TODO build out alpacastocks to take user input (i.e. load Robinhood watchlist, custom watchlist, or specific stock, etc.)
        /*
        if(stocks.length > 0) {
            let tempstocks = []
            stocks.map(stock => {
                tempstocks.push(stock['fields']['TICKER'])
            })
            setAlpacastocks(tempstocks)
        } else {
         */
            setAlpacastocks(['TSLA'])
        //}
        const fetchData = async () => {
            await Airtable.retrieveRecords('stocks')
                .then(response => {
                    //setTimeout(function() {
                        setStocks(response)
                    //},1000)
                })
            // For development currently not loading user settings from Airtable, more planning/dev required first
            /*await Airtable.retrieveRecords('settings')
                .then(response => {
                    //setTimeout(function() {
                    setSettings(response)
                    //},1000)
                    const testFix = async () => {
                        await logSettings(response)
                    }
                    testFix()
                })*/
            if(alpacastocks.length > 0) { // Only pull Alpaca data when we have one or more stocks for request
                await Alpaca.getBars(barSize, [alpacastocks], {limit: barsToPull, end: today})
                    .then(response => {
                        //setTimeout(function() {
                        const testFix = async () => {
                            await logBars(response)
                                .then(() => {
                                    calculateStocksTI()
                                })
                            /*.then(newr => {
                                setTimeout(function() {
                                    //setBars(newr)
                                    //setBars14(newr)
                                }, 1000)
                            })*/
                        }
                        testFix()
                        //},1000)
                    })
                await Alpaca.getBars('1Min', [alpacastocks], {limit: 1})
                    .then(response => {
                        //setTimeout(function() {
                        const testFix = async () => {
                            await logCurrent1MinBar(response)
                            /*.then(newr => {
                                setTimeout(function() {
                                    //setBars(newr)
                                    //setBars14(newr)
                                }, 1000)
                            })*/
                        }
                        testFix()
                        //},1000)
                    })
            }
        }
        //console.log(bars)
        //console.log(bars14)
        //console.log(currentBar)

        fetchData()
        //renderPage()
    },[reload]);
    // END useEffect()

    function reloadPage(props) {
        const value = !props
        setReload(value)
        ReactDOM.render(<div><div id={'stockdata'}><p>Data Loading...</p></div><div id={'techindicators'}></div></div>,document.getElementById('MainContent'))
    }

    function logBars(props) {
        return new Promise((resolve,reject) => {
            setBars(props)
            resolve()
        })
    }

    function logCurrent1MinBar(props) {
        return new Promise((resolve,reject) => {
            setCurrentBar(props)
            resolve()
        })
    }

    function logSettings(props) {
        return new Promise((resolve,reject) => {
            // TODO clean up DB settings for newer algo approach, set state, and integrate in calcs
            //setBarsToPull()
            //setBarSize()
            resolve()
        })
    }

    // Used to display data once loaded, but now simply translates Alpaca stock data and for each stock
    // calls the TI() function to run calculations
    // TODO refactor to improve performance, simplify code, etc.
    function calculateStocksTI() {
        let allTI = []
        let bar
        //let renderRSI = []
        Object.entries(bars).map(stock => {
            let stockBars = []
            /*renderRSI.push(
                <li key={'renderRSItitle'+stock[0]} id={stock[0]}>Previous 14 1-day bars for {stock[0]}:</li>
            )*/
            for (bar of stock[1]) {
                let t = new Date(bar['t'] * 1000)
                /*renderRSI.push(
                    <li key={t + stock[0]} id={stock[0]}>Opened at {bar['o']} and Closed at {bar['c']} at {t}</li>
                )*/
                stockBars.push({date:t,close:bar['c'],open:bar['o'],high:bar['h'],low:bar['l']})
            }
            //stockBars.reverse()
            //console.log(stock[0])
            TI(stockBars)
                .then(response => {
                    console.log(response)
                    allTI.push({stock:stock[0],ti:response,sig:response['sig']})
                })
        })
        setStocksTI(allTI)
        //renderTI()
        //if(reload) {
            //ReactDOM.render(renderRSI,document.getElementById('renderbarsdata'))
        //}
    }

    // TI (Technical Indicators) calculates RSI, SMA, EMA, MACD
    // Properties
    // props = array from calculateStocksTI as stockBars
    // rsi = number for the rsi timeframe (period) - normally 14 days is default, but defaults to .length of props
    // sma = number for the sma timeframe - default 20 days
    // ema = number for ema timeframe - default 12 days
    // function returns an array via Promise including an array for each item (i.e. day) in the period with:
    // date, rsi, sma, ema
    // TODO break this up into a function for each TI, build each to handle historical data (i.e. for
    // TODO a new stock to watch/track) as well as simple refreshes (usually by day but whatever bars a
    // TODO user wants to use!)
    function TI(props,rsi,sma,ema) {
        let TIresult = []
        let display_period = 59// Number of days in charts
        let rsi_period = 14//rsi ? rsi : (props.length - 1)
        let sma200_period = 200//sma ? sma : 200
        // NOTE: Other SMAs are hardcoded as of 28 May 2020
        let ema12_period = 12//ema ? ema : 12
        let ema26_period = 26
        let stoch_fast_period = 5
        let stoch_medium_period = 14
        let stoch_long_period = 21
        // EMA %
        // 50% would be used for a 3-day exponential moving average (16.6667 ratio 50/3)
        // 40 7 days 5.7142
        // 30% 11 days 2.72727 ratio
        // 10% is used for a 19-day exponential moving average (0.5263 ratio 10/19)
        // 5% 109 days 0.04587 ratio
        // 1% is used for a 199-day exponential moving average. (0.00502 ratio 1/200)
        // So our % = ema_period
        let ema12_percentage = 2 / (ema12_period + 1)
        let ema26_percentage = 2 / (ema26_period + 1)
        let pricetime
        let previous
        let diff
        let pricearray = []
        let pricegap = []
        let rsigains = []
        let rsilosses = []
        let smaprices = []
        let sma5prices = []
        let sma12prices = []
        let sma26prices = []
        let sma50prices = []
        let sma100prices = []
        let sma200prices = []
        let rsi_sma_array = []
        let rsi_ema_array = []
        let rsi_wilder_array = []
        let rsi_avg_array = []
        let totalLoss
        let totalGain
        let avgGain
        let avgLoss
        let rsi_ema_smoothing = 2 / (rsi_period + 1)
        let avgGain_ema
        let avgLoss_ema
        let avgGain_wilder
        let avgLoss_wilder
        let iGain = 0
        let iLoss = 0
        let rsiavggain = []
        let rsiavgloss = []
        let rsiavgemagain = []
        let rsiavgemaloss = []
        let smaarray = []
        let sma5array = []
        let sma12array = []
        let sma26array = []
        let sma50array = []
        let sma100array = []
        let sma200array = []
        let ema12array = []
        let ema26array = []
        let macdarray = []
        let macdsigarray = []
        let stoch_fast_k_array = []
        let stoch_medium_k_array = []
        let stoch_slow_k_array = []
        let stoch_fast_d_array = []
        let stoch_medium_d_array = []
        let stoch_slow_d_array = []
        let dates = []
        let i = 0
        let i2 = 0

        // Variables for Signal Calculations
        let allPivotsArray = []
        let trendArray = []
        let longTrendArray = []
        let r2
        let r1
        let pivot
        let s1
        let s2
        let dailyTrend
        let trend
        let trendStrength
        let crosses = []
        let percentChange
        let changeDirection
        let tempDailyResult
        let tempThreeDayResult
        let tempWeeklyResult
        let tempBimonthlyResult
        let tempMonthlyResult
        let dailyResult = []
        let threeDayResult = []
        let weeklyResult = []
        let bimonthlyResult = []
        let monthlyResult = []

        // Calculate Indicators, looping through each bar of data passed as props
        Object.entries(props).map(bar => {
            // Ready to make  dynamic, for now always using closing price of each bar
            pricetime = 'close'
            // Set today to current close price and store in price array
            let current = bar[1][pricetime]

            let dailyHigh = parseFloat(bar[1]['high'])
            let dailyLow = parseFloat(bar[1]['low'])
            let dailyClose = parseFloat(bar[1]['close'])
            let pricesSum = parseFloat(dailyClose) + parseFloat(dailyHigh) + parseFloat(dailyLow)
            pivot = parseFloat(pricesSum / 3).toFixed(2)
            r2 = parseFloat(parseFloat(pivot) + (parseFloat(dailyHigh) - parseFloat(dailyLow))).toFixed(2)
            r1 = parseFloat((parseFloat(pivot) * 2) - parseFloat(dailyLow)).toFixed(2)
            s1 = parseFloat((parseFloat(pivot) * 2) - parseFloat(dailyHigh)).toFixed(2)
            s2 = parseFloat(parseFloat(pivot) - (parseFloat(dailyHigh) - parseFloat(dailyLow))).toFixed(2)
            let allPivots = []
            allPivots.push({p:pivot,r2:r2,r1:r1,s1:s1,s2:s2})
            allPivotsArray.push(allPivots)

            pricearray.push(current)
            // Add date for bar to dates array
            dates.push(bar[1]['date'])
            // If already looped  once, start comparing prices and calculating TIs
            if (previous) {
                // Difference between bar prices, store 'Gap'
                diff = (current - previous)
                let dailyTrendArray = []
                let dailyStrength = 0
                if(diff > 0) {
                    changeDirection = 1
                    dailyTrend = 1
                }
                if(diff < 0) {
                    changeDirection = 0
                    dailyTrend = 0
                }
                percentChange = ((diff / previous) * 100).toFixed(2)
                let absPercentChange = Math.abs(percentChange)
                if(absPercentChange <= 1) dailyStrength = 1
                if(absPercentChange > 1 && absPercentChange <= 2.5) dailyStrength = 2
                if(absPercentChange > 2.5 && absPercentChange <= 5) dailyStrength = 3
                if(absPercentChange > 5 && absPercentChange <= 7.5) dailyStrength = 4
                if(absPercentChange > 7.5 && absPercentChange <= 10) dailyStrength = 5
                if(absPercentChange > 10 && absPercentChange <= 12.5) dailyStrength = 6
                if(absPercentChange > 12.5 && absPercentChange <= 15) dailyStrength = 7
                if(absPercentChange > 15 && absPercentChange <= 17.5) dailyStrength = 8
                if(absPercentChange > 17.5 && absPercentChange <= 20) dailyStrength = 9
                if(absPercentChange > 20) dailyStrength = 10
                pricegap.push(diff)
                tempDailyResult = {strength:dailyStrength,trend:dailyTrend,change:percentChange}
                dailyResult.push(tempDailyResult)

                // Calculate Trend and Strength SMAs
                let currentTrendArray = []
                let fullTrendArray = []
                if(i >= 3) {
                    let temp3DayTrendArr = trendArray.slice(-3, trendArray.length)
                    let temp3DayTrendArray = []
                    let temp3DayStrengthArray = []
                    let temp3DayChangeArray = []
                    Object.entries(temp3DayTrendArr).map(trend => {
                        temp3DayTrendArray.push(trend[1]['trend'])
                        temp3DayChangeArray.push(parseFloat(trend[1]['change']))
                        if(trend[1]['trend'] == 1) {
                            temp3DayStrengthArray.push(parseFloat(trend[1]['strength']))
                        } else {
                            temp3DayStrengthArray.push(-parseFloat(trend[1]['strength']))
                        }
                    })
                    let temp3DayTrendSum = _.sum(temp3DayTrendArray)
                    let temp3DayStrengthSum = _.sum(temp3DayStrengthArray)
                    let temp3DayChangeSum = _.sum(temp3DayChangeArray).toFixed(2)
                    let temp3DayTrendAvg = temp3DayTrendSum / 3
                    let temp3DayStrengthAvg = (temp3DayStrengthSum / 3).toFixed(2)
                    //let temp3DayChangeAvg = (temp3DayChangeSum / 3).toFixed(2)
                    let temp3DayTrend
                    if(temp3DayTrendAvg <= 0.5) {
                        temp3DayTrend = 0
                    } else {
                        temp3DayTrend = 1
                    }
                    // Daily Object
                    tempThreeDayResult = {trend:temp3DayTrend,strength:temp3DayStrengthAvg,change:temp3DayChangeSum}
                    // Every Daily Object
                    threeDayResult.push(tempThreeDayResult)
                    if(i >= 5) {
                        let tempWeeklyTrendArr = trendArray.slice(-5, trendArray.length)
                        let tempWeeklyTrendArray = []
                        let tempWeeklyStrengthArray = []
                        let tempWeeklyChangeArray = []
                        Object.entries(tempWeeklyTrendArr).map(trend => {
                            tempWeeklyTrendArray.push(trend[1]['trend'])
                            tempWeeklyChangeArray.push(parseFloat(trend[1]['change']))
                            if(trend[1]['trend'] == 1) {
                                tempWeeklyStrengthArray.push(parseFloat(trend[1]['strength']))
                            } else {
                                tempWeeklyStrengthArray.push(-parseFloat(trend[1]['strength']))
                            }
                        })
                        let tempWeeklyTrendSum = _.sum(tempWeeklyTrendArray)
                        let tempWeeklyStrengthSum = _.sum(tempWeeklyStrengthArray)
                        let tempWeeklyChangeSum = _.sum(tempWeeklyChangeArray).toFixed(2)
                        let tempWeeklyTrendAvg = tempWeeklyTrendSum / 5
                        let tempWeeklyStrengthAvg = (tempWeeklyStrengthSum / 5).toFixed(2)
                        //let tempWeeklyChangeAvg = (tempWeeklyChangeSum / 5).toFixed(2)
                        let tempWeeklyTrend
                        if(tempWeeklyTrendAvg <= 0.5) {
                            tempWeeklyTrend = 0
                        } else {
                            tempWeeklyTrend = 1
                        }
                        // Daily Object
                        tempWeeklyResult = {trend:tempWeeklyTrend,strength:tempWeeklyStrengthAvg,change:tempWeeklyChangeSum}
                        // Every Daily Object
                        weeklyResult.push(tempWeeklyResult)
                        if(i >= 10) {
                            let tempBimonthlyTrendArr = trendArray.slice(-10, trendArray.length)
                            let tempBimonthlyTrendArray = []
                            let tempBimonthlyStrengthArray = []
                            let tempBimonthlyChangeArray = []
                            Object.entries(tempBimonthlyTrendArr).map(trend => {
                                tempBimonthlyTrendArray.push(trend[1]['trend'])
                                tempBimonthlyChangeArray.push(parseFloat(trend[1]['change']))
                                if(trend[1]['trend'] == 1) {
                                    tempBimonthlyStrengthArray.push(parseFloat(trend[1]['strength']))
                                } else {
                                    tempBimonthlyStrengthArray.push(-parseFloat(trend[1]['strength']))
                                }
                            })
                            let tempBimonthlyTrendSum = _.sum(tempBimonthlyTrendArray)
                            let tempBimonthlyStrengthSum = _.sum(tempBimonthlyStrengthArray)
                            let tempBimonthlyChangeSum = _.sum(tempBimonthlyChangeArray).toFixed(2)
                            let tempBimonthlyTrendAvg = tempBimonthlyTrendSum / 10
                            let tempBimonthlyStrengthAvg = (tempBimonthlyStrengthSum / 10).toFixed(2)
                            //let tempBimonthlyChangeAvg = (tempBimonthlyChangeSum / 10).toFixed(2)
                            let tempBimonthlyTrend
                            if(tempBimonthlyTrendAvg <= 0.5) {
                                tempBimonthlyTrend = 0
                            } else {
                                tempBimonthlyTrend = 1
                            }
                            // Daily Object
                            tempBimonthlyResult = {trend:tempBimonthlyTrend,strength:tempBimonthlyStrengthAvg,change:tempBimonthlyChangeSum}
                            // Every Daily Object
                            bimonthlyResult.push(tempBimonthlyResult)
                            if(i >= 21) {
                                let tempMonthlyArr = trendArray.slice(-21, trendArray.length)
                                let tempMonthlyTrendArray = []
                                let tempMonthlyStrengthArray = []
                                let tempMonthlyChangeArray = []
                                Object.entries(tempMonthlyArr).map(trend => {
                                    tempMonthlyTrendArray.push(trend[1]['trend'])
                                    tempMonthlyChangeArray.push(parseFloat(trend[1]['change']))
                                    if(trend[1]['trend'] == 1) {
                                        tempMonthlyStrengthArray.push(parseFloat(trend[1]['strength']))
                                    } else {
                                        tempMonthlyStrengthArray.push(-parseFloat(trend[1]['strength']))
                                    }
                                })
                                let tempMonthlyTrendSum = _.sum(tempMonthlyTrendArray)
                                let tempMonthlyStrengthSum = _.sum(tempMonthlyStrengthArray)
                                let tempMonthlyChangeSum = _.sum(tempMonthlyChangeArray).toFixed(2)
                                let tempMonthlyTrendAvg = tempMonthlyTrendSum / 21
                                let tempMonthlyStrengthAvg = (tempMonthlyStrengthSum / 21).toFixed(2)
                                //let tempMonthlyChangeAvg = (tempMonthlyChangeSum / 21).toFixed(2)
                                let tempMonthlyTrend
                                if(tempMonthlyTrendAvg <= 0.5) {
                                    tempMonthlyTrend = 0
                                } else {
                                    tempMonthlyTrend = 1
                                }
                                // Daily Object
                                tempMonthlyResult = {trend:tempMonthlyTrend,strength:tempMonthlyStrengthAvg,change:tempMonthlyChangeSum}
                                // Every Daily Object
                                weeklyResult.push(tempMonthlyResult)
                            }
                        }
                    }
                }
                dailyTrendArray = {dir:changeDirection,strength:dailyStrength,trend:dailyTrend,change:percentChange,daily:tempDailyResult,threeDay:tempThreeDayResult,weekly:tempWeeklyResult,bimonthly:tempBimonthlyResult,monthly:tempMonthlyResult}
                trendArray.push(dailyTrendArray)
                fullTrendArray.push({daily:dailyResult,threeDay:threeDayResult,weekly:weeklyResult,bimonthly:bimonthlyResult,monthly:monthlyResult})
                //console.log(fullTrendArray) TODO Use for full historic data, perhaps creating averages or other calcs with it too
            }
            // Store current price as previous to use in the next loop and increment i
            previous = current
            i++

            // RSI Calculations
            let RS_sma // Simple RSI
            let RSI_sma
            let RS_ema // EMA-smoothed RSI
            let RSI_ema
            let RS_wilder // Wilder-smoothed RSI
            let RSI_wilder

            // Looped <= RSI period? = only collect gain and loss data
            if (i <= rsi_period && i > 0) {
                if (diff > 0) {
                    rsigains.push(diff)
                    rsilosses.push(0)
                } else {
                    rsilosses.push(Math.abs(diff))
                    rsigains.push(0)
                }

            // Past the number of loops = RSI period? = enough data to calculate initial RSI!
            } else {
                // Remove oldest gain and loss from arrays
                rsigains.shift()
                rsilosses.shift()
                // Then push gain or loss to appropriate array
                if (diff > 0) {
                    rsigains.push(diff)
                    rsilosses.push(0)
                } else {
                    rsilosses.push(Math.abs(diff))
                    rsigains.push(0)
                }

                // After first RSI calculation, smooth avgGain_ema and avgLoss_ema
                // For smoothing, one loop after the rsi_period store the first avgGain_ema and avgLoss_ema
                if (i === rsi_period + 1) {
                    totalGain = _.sum(rsigains)
                    avgGain_ema = totalGain / rsi_period
                    avgGain_wilder = avgGain_ema
                    rsiavgemagain.push(avgGain_ema)
                    rsiavggain.push(avgGain_wilder)

                    totalLoss = _.sum(rsilosses)
                    avgLoss_ema = totalLoss / rsi_period
                    avgLoss_wilder = avgLoss_ema
                    rsiavgemaloss.push(avgLoss_ema)
                    rsiavgloss.push(avgLoss_wilder)
                } else {
                    if (diff > 0) {
                        // EMA RSI: α * Ut + ( 1 – α ) * AvgUt-1
                        avgGain_ema = rsi_ema_smoothing * diff + (1 - rsi_ema_smoothing) * (rsiavgemagain[iGain] - 1)
                        //PREVIOUS FORMULA = ((rsiavggain[iGain] * (rsi_period - 1)) + diff) / rsi_period
                        rsiavgemagain.push(avgGain_ema)

                        // Wilder: 1/N * Ut + 13/N * AvgUt-1
                        avgGain_wilder = (1/rsi_period) * diff + (13/rsi_period) * (rsiavggain[iGain] - 1)
                        rsiavggain.push(avgGain_wilder)

                        iGain++
                    } else {
                        // EMA RSI: α * Dt + ( 1 – α ) * AvgDt-1
                        avgLoss_ema = rsi_ema_smoothing * Math.abs(diff) + (1 - rsi_ema_smoothing) * (rsiavgemaloss[iLoss] - 1)
                        //PREVIOUS FORMULA = ((rsiavgloss[iLoss] * (rsi_period - 1)) + diff) / rsi_period
                        rsiavgemaloss.push(avgLoss_ema)

                        // Wilder: 1/N * Dt + 13/N * AvgDt-1
                        avgLoss_wilder = (1/rsi_period) * Math.abs(diff) + (13/rsi_period) * (rsiavgloss[iLoss] - 1)
                        rsiavgloss.push(avgLoss_wilder)

                        iLoss++
                    }
                }
                //console.log(i)

                totalGain = _.sum(rsigains)
                avgGain = totalGain / rsi_period

                totalLoss = _.sum(rsilosses)
                avgLoss = totalLoss / rsi_period

                /*
                if(i == 350) {
                    console.log('avgGain = '+avgGain)
                    console.log('Gain EMA = '+avgGain_ema)
                    console.log('Gain Wilder = '+avgGain_wilder)
                    console.log('avgLoss = '+avgLoss)
                    console.log('Loss EMA = '+avgLoss_ema)
                    console.log('Loss Wilder = '+avgLoss_wilder)
                }
                */

                avgLoss > 0 ? RS_sma = (avgGain / avgLoss) : RS_sma = 0
                RSI_sma = 100 - (100 / (1 + RS_sma))
                rsi_sma_array.push(RSI_sma)

                RS_ema = avgGain_ema / avgLoss_ema
                RSI_ema = 100 - (100 / (1 + RS_ema))
                rsi_ema_array.push(RSI_ema)

                RS_wilder = avgGain_wilder / avgLoss_wilder
                RSI_wilder = 100 - (100 / (1 + RS_wilder))
                rsi_wilder_array.push(RSI_wilder)

                let avgRSI = (RSI_sma + RSI_ema + RSI_wilder) / 3
                rsi_avg_array.push(avgRSI)
            }

            // Moving Averages and Beyond!
            smaprices.push(current)
            sma5prices.push(current)
            sma12prices.push(current)
            sma26prices.push(current)
            sma50prices.push(current)
            sma100prices.push(current)
            sma200prices.push(current)

            // STOCHASTIC
            // CL = Close [today] - Lowest Low [in %K Periods]
            // HL =Highest High [in %K Periods] - Lowest Low [in %K Periods]
            // %K = CL / HL *100

            // SMA 5 & Fast Stochastic Calculation
            let SMA5
            let stoch_fast_k
            let stoch_fast_d_temp_array
            let stoch_fast_d
            if (i2 >= 4) {
                let sma5Sum = _.sum(sma5prices)
                let stoch_low = _.min(sma5prices)
                let stoch_high = _.max(sma5prices)
                let cl = current - stoch_low
                let hl = stoch_high - stoch_low
                stoch_fast_k = cl / hl * 100
                stoch_fast_d_temp_array = stoch_fast_k_array.slice(-3, stoch_fast_k_array.length)
                let stoch_d_sum = _.sum(stoch_fast_d_temp_array)
                stoch_fast_d = stoch_d_sum / 3
                sma5prices.shift()
                SMA5 = sma5Sum / 5
                /*if(i == 350) {
                    console.log('stoch_fast_k_cl = '+cl)
                    console.log('stoch_fast_k_hl = '+hl)
                    console.log('stoch_fast_k = '+stoch_fast_k)
                }*/
            } else {
                SMA5 = 0
                stoch_fast_k = 0
                stoch_fast_d = 0
            }
            sma5array.push(SMA5)
            stoch_fast_k_array.push(stoch_fast_k)
            stoch_fast_d_array.push(stoch_fast_d)

            // SMA 12 Calculation
            let SMA12
            let stoch_medium_k
            let stoch_medium_d_temp_array
            let stoch_medium_d
            if (i2 >= 11) {
                let sma12Sum = _.sum(sma12prices)
                let stoch_low = _.min(sma12prices)
                let stoch_high = _.max(sma12prices)
                let cl = current - stoch_low
                let hl = stoch_high - stoch_low
                stoch_medium_k = cl / hl * 100
                stoch_medium_d_temp_array = stoch_medium_k_array.slice(-3, stoch_medium_k_array.length)
                let stoch_d_sum = _.sum(stoch_medium_d_temp_array)
                stoch_medium_d = stoch_d_sum / 3
                sma12prices.shift()
                SMA12 = sma12Sum / 12
            } else {
                SMA12 = 0
                stoch_medium_k = 0
                stoch_medium_d = 0
            }
            sma12array.push(SMA12)
            stoch_medium_k_array.push(stoch_medium_k)
            stoch_medium_d_array.push(stoch_medium_d)

            // SMA 26 Calculation
            let SMA26
            if (i2 >= 25) {
                let sma26Sum = _.sum(sma26prices)
                sma26prices.shift()
                SMA26 = sma26Sum / 26
            } else {
                SMA26 = 0
            }
            sma26array.push(SMA26)

            // SMA 50 Calculation
            let SMA50
            if (i2 >= 49) {
                let sma50Sum = _.sum(sma50prices)
                sma50prices.shift()
                SMA50 = sma50Sum / 50
            } else {
                SMA50 = 0
            }
            sma50array.push(SMA50)

            // SMA 100 Calculation
            let SMA100
            if (i2 >= 99) {
                let sma100Sum = _.sum(sma100prices)
                sma100prices.shift()
                SMA100 = sma100Sum / 100
            } else {
                SMA100 = 0
            }
            sma100array.push(SMA100)

            // SMA 200 Calculation
            let SMA200
            if (i2 >= sma200_period - 1) {
                let sma200Sum = _.sum(sma200prices)
                sma200prices.shift()
                SMA200 = sma200Sum / sma200_period
            } else {
                SMA200 = 0
            }
            sma200array.push(SMA200)

            // EMA 12-day Calculation
            let ema12today
            let prevema
            // We need a 12 day SMA to start the 12 day EMA, and that value is only used on the 12th day
            if (SMA12 != 0 && i2 === 11) {
                prevema = SMA12
                ema12today = (current * ema12_percentage) + (prevema * (1 - ema12_percentage))
                ema12array.push(ema12today)
            }
            // After day 12 we use the previous ema12 value to calculate ema12
            if(i2 > 11) {
                prevema = ema12array[(i2 - 12)]
                ema12today = (current * ema12_percentage) + (prevema * (1 - ema12_percentage))
                ema12array.push(ema12today)
            }

            // EMA 26-day Calculation
            let ema26today
            let prevema26
            // We need a 26 day SMA to start the 26 day EMA, and that value is only used on the 26th day
            if (SMA26 != 0 && i2 === 25) {
                prevema26 = SMA26
                ema26today = (current * ema26_percentage) + (prevema26 * (1 - ema26_percentage))
                ema26array.push(ema26today)
            }
            // After day 26 we use the previous ema26 value to calculate ema26
            if(i2 > 25) {
                prevema26 = ema26array[(i2 - 26)]
                ema26today = (current * ema26_percentage) + (prevema26 * (1 - ema26_percentage))
                ema26array.push(ema26today)
            }

            // MACD (12 - 26) and MACD Signal (9)
            let macdtemp = 0
            let macdsig = 0
            if(i2 > 25 && i2 < 35) {
                macdtemp = ema12today - ema26today
                macdsigarray.push(macdtemp)
                macdarray.push({macd: macdtemp, sig: macdsig})
            } else if (i2 === 35) {
                let macdsigsum = _.sum(macdsigarray)
                let macdsigavg = macdsigsum / 9
                macdtemp = ema12today - ema26today
                macdsig = (macdtemp * (2 / (9 + 1))) + (macdsigavg * (1 - (2 / (9 + 1))))
                macdarray.push({macd: macdtemp, sig: macdsig})
            } else if (i2 > 35) {
                macdtemp = ema12today - ema26today
                macdsig = (macdtemp * (2 / (9 + 1))) + ((macdarray[(i2 - 27)]['sig']) * (1 - (2 / (9 + 1))))
                macdarray.push({macd: macdtemp, sig: macdsig})
            }

            i2++
        })

        // Build return array with all technical indicators
        let ii = 0
        let incrementdatecleanup = []
        let result_date
        let price_result
        let pricegap_result
        let rsi_sma_result
        let rsi_ema_result
        let rsi_wilder_result
        let rsi_avg_result
        let sma_result
        let sma5_result
        let sma12_result
        let sma26_result
        let sma50_result
        let sma100_result
        let sma200_result // TODO put this in sma_result!!
        let ema12_result
        let ema26_result
        let macd_result
        let stoch_fast_k_result
        let stoch_fast_d_result
        let stoch_medium_k_result
        let stoch_medium_d_result

        let pivots_result
        let trend_result

        // Cut dates down to just one month of data (testing, to clean up charts)
        let datei
        let dateii = 0
        let resulti = display_period
        for(datei = dates.length; datei >= resulti + 2; datei--) {
            dateii++
            dates.shift()
            incrementdatecleanup.push(dateii)
        }
        pricearray.reverse()
        pricegap.reverse()
        rsi_sma_array.reverse()
        rsi_ema_array.reverse()
        rsi_wilder_array.reverse()
        rsi_avg_array.reverse()
        smaarray.reverse() // TODO put all SMAs in here!
        sma5array.reverse()
        sma12array.reverse()
        sma26array.reverse()
        sma50array.reverse()
        sma100array.reverse()
        sma200array.reverse()
        ema12array.reverse()
        ema26array.reverse()
        macdarray.reverse()
        stoch_fast_k_array.reverse()
        stoch_fast_d_array.reverse()
        stoch_medium_k_array.reverse()
        stoch_medium_d_array.reverse()
        incrementdatecleanup.reverse()
        allPivotsArray.reverse()
        trendArray.reverse()
        Object.entries(dates).map(date => {
            let t = date['1']
            let month = t.getMonth() + 1
            let thisdate = t.getDate()
            let year = t.getFullYear()
            result_date = month + '/' + thisdate + '/' + year
            price_result = pricearray[resulti]
            pricegap_result = pricegap[resulti]
            rsi_sma_result = rsi_sma_array[resulti]
            rsi_ema_result = rsi_ema_array[resulti]
            rsi_wilder_result = rsi_wilder_array[resulti]
            rsi_avg_result = rsi_avg_array[resulti]
            sma5_result = sma5array[resulti]
            sma12_result = sma12array[resulti]
            sma26_result = sma26array[resulti]
            sma50_result = sma50array[resulti]
            sma100_result = sma100array[resulti]
            sma200_result = sma200array[resulti]
            ema12_result = ema12array[resulti]
            ema26_result = ema26array[resulti]
            macd_result = macdarray[resulti]
            stoch_fast_k_result = stoch_fast_k_array[resulti]
            stoch_fast_d_result = stoch_fast_d_array[resulti]
            stoch_medium_k_result = stoch_medium_k_array[resulti]
            stoch_medium_d_result = stoch_medium_d_array[resulti]
            pivots_result = allPivotsArray[resulti]
            trend_result = trendArray[resulti]

            let tickerTIresults = {trend:trend_result,pivots:pivots_result,price:price_result,gap:pricegap_result,rsi_avg:rsi_avg_result,rsi_sma:rsi_sma_result,rsi_ema:rsi_ema_result,rsi_wilder:rsi_wilder_result,sma200:sma200_result,ema12:ema12_result,ema26:ema26_result,macd:macd_result['macd'],macdsig:macd_result['sig'],sma5:sma5_result,sma12:sma12_result,sma26:sma26_result,sma50:sma50_result,sma100:sma100_result,stoch_fast_k:stoch_fast_k_result,stoch_fast_d:stoch_fast_d_result,stoch_medium_k:stoch_medium_k_result,stoch_medium_d:stoch_medium_d_result}
            let tickerSignals
            //tickerSignals = calcSignal(tickerTIresults)
            TIresult.push({date:result_date,ti:tickerTIresults,sig:tickerSignals})
            ii++
            resulti--
        })
        //let signalArray = TIresult.reverse()
        //calcSignal(signalArray)

        // Establish and Test Trend

        // Check Support and Resistance

        // Check Higher Highs, Lower Lows, and opposite

        // Check for SMA, EMA, MACD Crosses

        // Check RSI and Stoch raw signals, then test against trend and other to generate hybrid signal

        // Check volume

        return new Promise((resolve, reject) => {
            resolve( TIresult )
        })
    }
    // END TI()

    function calcSignal(props) {
        console.log(props['stock'])
        //props.reverse()
        Object.entries(props['ti']).map(ti =>{
            console.log(ti[1])
        })
    }

    // NOT USED - FUTURE WORK!
    function RSI(props) {
        // TODO pull RSI calculations out of TI()
    }
    function MAs(props) {
        // TODO pull SMA, EMA, any other MA calculations out of TI()
    }
    function otherTI(props) {
        // TODO pull future/other calculations out of TI()
    }

    // onClick function to render the UL with initial LI per stock after data has been pulled
    // and TI calculations completed
    function renderStockData() {
        const stockcontent = (
            <ul className={"algoDefaultUL stocksUL"}>
                {(() => {
                    let tick
                    let currentprice
                    if (alpacastocks.length === 1) {
                        tick = alpacastocks[0]
                        currentprice = '$'+currentBar[tick][0]['c']
                        return <li className={'algoStock'} key={'renderstocks'+ tick} id={'renderstocks'+ tick}><a className={'algoTicker'} onClick={() => renderTI(tick)}>{tick+' - Last 1min Closing Price: '+currentprice+' (Click to load charts)'}</a><br/><div className={'algoCharts'} id={tick + 'TIdata'}></div></li>
                    } else {
                        if (stocks.length > 0) {
                            Object.entries(stocks).map(item => {
                                if(typeof item[1] !== 'undefined') {
                                    tick = item[1]['fields']['TICKER']
                                    if (currentBar[tick] !== 'undefined') {
                                        if (currentBar[tick].length > 0) {
                                            currentprice = '$'+currentBar[tick][0]['c']
                                        } else {
                                            currentprice = 'NA'
                                        }
                                    } else {
                                        currentprice = 'NA'
                                    }
                                    return <li className={'algoStock'} key={'renderstocks'+ tick} id={'renderstocks'+ tick}><a className={'algoTicker'} onClick={() => renderTI(tick)}>{tick+' - Last 1min Closing Price: '+currentprice+' (Click to load charts)'}</a><br/><div className={'algoCharts'} id={tick + 'TIdata'}></div></li>
                                }
                            })
                        } else {
                            return 'Loading Stocks...'
                        }
                    }
                })()}
            </ul>
        )
        ReactDOM.render(stockcontent,document.getElementById('stockdata'))
    }
    // END renderStockData()


    // onClick function to render charts with TI data for individual or ALL stocks
    function renderTI(ticker) {
        let result = []
        let element
        // Render charts for single stock ticker
        if (ticker) {
            element = ticker + 'TIdata'
            let si = _.findKey(stocksTI, ['stock',ticker])
            if (si != 'undefined') {
                let tickDataSig = stocksTI[si]
                console.log(stocksTI)
                let tickData= tickDataSig['ti']
                //function getValue(props) { (x)=>{return x['ti'][props]} TODO make a generic function for all data points to use in charting
                let getPrice = (x)=>{return x['ti']['price']}
                let getSma5 = (x)=>{return x['ti']['sma5']}
                let getSma12 = (x)=>{return x['ti']['sma12']}
                let getSma26 = (x)=>{return x['ti']['sma26']}
                let getSma50 = (x)=>{return x['ti']['sma50']}
                let getSma100 = (x)=>{return x['ti']['sma100']}
                let getSma200 = (x)=>{return x['ti']['sma200']}
                let getEma12 = (x)=>{return x['ti']['ema12']}
                let getEma26 = (x)=>{return x['ti']['ema26']}
                let getRSIa = (x)=>{return x['ti']['rsi_avg']}
                let getRSIs = (x)=>{return x['ti']['rsi_sma']}
                let getRSIe = (x)=>{return x['ti']['rsi_ema']}
                let getRSIw = (x)=>{return x['ti']['rsi_wilder']}
                let getMACD = (x)=>{return x['ti']['macd']}
                let getMACDs = (x)=>{return x['ti']['macdsig']}
                let getStochFk = (x)=>{return x['ti']['stoch_fast_k']}
                let getStochFd = (x)=>{return x['ti']['stoch_fast_d']}
                let getStochMk = (x)=>{return x['ti']['stoch_medium_k']}
                let getStochMd = (x)=>{return x['ti']['stoch_medium_d']}

                const renderLineChart1 = (
                    <div>
                        <h3 className={'chart-header'}>Closing Price, Exponential Moving Avg. 12 & 26 (EMA) and Simple Moving Avg. 200 (SMA)</h3>
                        <LineChart width={600} height={300} data={tickData} margin={{
                            top: 5, right: 30, left: 20, bottom: 5,
                        }}
                        >
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey={getSma200} name="SMA 200" stroke="#039BE5"  />
                            <Line type="monotone" dataKey={getEma12} name="EMA 12" stroke="#4CAF50" />
                            <Line type="monotone" dataKey={getEma26} name="EMA 26" stroke="#1B5E20" />
                            <Line type="monotone" dataKey={getPrice} name="Price" stroke="#D32F2F" activeDot={{ r: 8 }} />
                        </LineChart>
                        <div className={"clear"}></div>
                        <h3 className={'chart-header'}>Relative Strength Indicator (RSI - 3 types)</h3>
                        <LineChart width={600} height={150} data={tickData} margin={{
                            top: 5, right: 30, left: 20, bottom: 5,
                        }}
                        >
                            <XAxis dataKey="date"  />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey={getRSIa} name="RSI Avg." stroke="#039BE5" activeDot={{ r: 8 }} />
                            <Line type="monotone" dataKey={getRSIs} name="RSI SMA" stroke="#F1C40F" />
                            <Line type="monotone" dataKey={getRSIe} name="RSI EMA" stroke="#C0392B" />
                            <Line type="monotone" dataKey={getRSIw} name="RSI Wilder" stroke="#27AE60" />
                        </LineChart>
                        <div className={"clear"}></div>
                        <h3 className={'chart-header'}>Moving Average Convergence Divergence (MACD)</h3>
                        <LineChart width={600} height={150} data={tickData} margin={{
                            top: 5, right: 30, left: 20, bottom: 5,
                        }}
                        >
                            <XAxis dataKey="date"  />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey={getMACD} name="MACD" stroke="#4527A0" activeDot={{ r: 8 }} />
                            <Line type="monotone" dataKey={getMACDs} name="MACD Signal" stroke="#FFA000" />
                        </LineChart>
                        <div className={"clear"}></div>
                        <h3 className={'chart-header'}>Stochastics (fast - %K period 5, %d 3)</h3>
                        <LineChart width={600} height={100} data={tickData} margin={{
                            top: 5, right: 30, left: 20, bottom: 5,
                        }}
                        >
                            <XAxis dataKey="date"  />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey={getStochFk} name="Stoch Fast K" stroke="#4527A0" activeDot={{ r: 8 }} />
                            <Line type="monotone" dataKey={getStochFd} name="Stoch Fast D" stroke="#FFA000" />
                        </LineChart>
                        <div className={"clear"}></div>
                        <h3 className={'chart-header'}>Stochastics (medium - %K period 12, %d 3)</h3>
                        <LineChart width={600} height={100} data={tickData} margin={{
                            top: 5, right: 30, left: 20, bottom: 5,
                        }}
                        >
                            <XAxis dataKey="date"  />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey={getStochMk} name="Stoch Medium K" stroke="#4527A0" activeDot={{ r: 8 }} />
                            <Line type="monotone" dataKey={getStochMd} name="Stoch Medium D" stroke="#FFA000" />
                        </LineChart>
                        <div className={"clear"}></div>
                        <h3 className={'chart-header'}>SMAs (5, 12, 26, 50, 100, 200)</h3>
                        <LineChart width={600} height={300} data={tickData} margin={{
                            top: 5, right: 30, left: 20, bottom: 5,
                        }}
                        >
                            <XAxis dataKey="date"  />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey={getSma5} name="SMA 5" stroke="#C0392B" />
                            <Line type="monotone" dataKey={getSma12} name="SMA 12" stroke="#8E44AD" />
                            <Line type="monotone" dataKey={getSma26} name="SMA 26" stroke="#2980B9" />
                            <Line type="monotone" dataKey={getSma50} name="SMA 50" stroke="#16A085" />
                            <Line type="monotone" dataKey={getSma100} name="SMA 100" stroke="#F1C40F" />
                            <Line type="monotone" dataKey={getSma200} name="SMA 200" stroke="#039BE5" activeDot={{ r: 8 }} />
                        </LineChart>
                        <div className={'clear'}></div>
                    </div>
                )
                result.push(renderLineChart1)
                result.push(<h3 className={'chart-header'}>Pivot and Trend Detail</h3>)
                result.push(<div>
                    {Object.entries(tickData).map(data => {
                        let trendTableHeader = []
                        let trendTableHeaders = []
                        let trendTableContent = []
                        let trendTableDateHeader = (<tr><th>{data[1]['date']}</th></tr>)
                        Object.entries(data[1]['ti']['trend']).map(t => {
                            if(t[0] === "daily") {
                                let dir
                                let chg = t[1]['change']
                                let trend = t[1]['trend']
                                let str = t[1]['strength']
                                if(trend == 1) {
                                    dir = "Up"
                                } else {
                                    dir = "Down"
                                }
                                trendTableHeaders.push(<th>Daily trend:</th>)
                                trendTableContent.push(<td>Trend: {dir}<br/>Strength: {str}<br/>Change: {chg}%</td>)
                            }

                            // Longer Trends
                            if(t[0] === "threeDay") {
                                let dir
                                let chg = t[1]['change']
                                let trend = t[1]['trend']
                                let str = t[1]['strength']
                                if(trend == 1) {
                                    dir = "Up"
                                } else {
                                    dir = "Down"
                                }
                                trendTableHeaders.push(<th>3-day trend:</th>)
                                trendTableContent.push(<td>Trend: {dir}<br/>Strength: {str}<br/>Change: {chg}%</td>)
                            }
                            if(t[0] === "weekly") {
                                let dir
                                let chg = t[1]['change']
                                let trend = t[1]['trend']
                                let str = t[1]['strength']
                                if(trend == 1) {
                                    dir = "Up"
                                } else {
                                    dir = "Down"
                                }
                                trendTableHeaders.push(<th>Weekly trend:</th>)
                                trendTableContent.push(<td>Trend: {dir}<br/>Strength: {str}<br/>Change: {chg}%</td>)
                            }
                            if(t[0] === "bimonthly") {
                                let dir
                                let chg = t[1]['change']
                                let trend = t[1]['trend']
                                let str = t[1]['strength']
                                if(trend == 1) {
                                    dir = "Up"
                                } else {
                                    dir = "Down"
                                }
                                trendTableHeaders.push(<th>Bimonthly trend:</th>)
                                trendTableContent.push(<td>Trend: {dir}<br/>Strength: {str}<br/>Change: {chg}%</td>)
                            }
                            if(t[0] === "monthly") {
                                let dir
                                let chg = t[1]['change']
                                let trend = t[1]['trend']
                                let str = t[1]['strength']
                                if(trend == 1) {
                                    dir = "Up"
                                } else {
                                    dir = "Down"
                                }
                                trendTableHeaders.push(<th>Monthly trend:</th>)
                                trendTableContent.push(<td>Trend: {dir}<br/>Strength: {str}<br/>Change: {chg}%</td>)
                            }
                        })
                        trendTableHeader.push(<tr>{trendTableHeaders}</tr>)
                        let trendTableFinalContent = <tr>{trendTableContent}</tr>
                        result.push(<table>{trendTableDateHeader}{trendTableHeader}{trendTableFinalContent}</table>)
                        let tableHead = (<tr><th>Resistance 2</th><th>Resistance 1</th><th>Pivot</th><th>Support 1</th><th>Support 2</th></tr>)
                        let tableContent = Object.entries(data[1]['ti']['pivots']).map(p => {
                            return <tr><td>{p[1]['r2']}</td><td>{p[1]['r1']}</td><td>{p[1]['p']}</td><td>{p[1]['s1']}</td><td>{p[1]['s2']}</td></tr>
                        })
                        result.push(<table>{tableHead}{tableContent}</table>)
                    })}
                </div>)
                //result.push(signalSection)
            } else {
                result.push("The stock was loaded from Airtable but not included in the Alpaca data query, charts couldn't be generated.")
            }
        } else { // Render ALL charts for ALL stock tickers TODO remove or fix this, currently will be broken due to changes for individual stocks above
            element = 'techindicators'
            result.push('<ul>')
            Object.entries(stocksTI).map(bar => {
                let stockname = bar[1]['stock']
                result.push(<li key={'ti'+ stockname}>{stockname}</li>)
                const renderLineChart = (
                    <div>
                        <LineChart width={600} height={400} data={bar[1]['ti']} margin={{
                            top: 5, right: 30, left: 20, bottom: 5,
                        }}
                        >
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="sma200" stroke="#039BE5"  />
                            <Line type="monotone" dataKey="ema12" stroke="#4CAF50" />
                            <Line type="monotone" dataKey="ema26" stroke="#1B5E20" />
                            <Line type="monotone" dataKey="price" stroke="#D32F2F" activeDot={{ r: 8 }} />
                        </LineChart>
                        <LineChart width={400} height={300} data={bar[1]['ti']} margin={{
                            top: 5, right: 30, left: 20, bottom: 5,
                        }}
                        >
                            <XAxis dataKey="date"  />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="rsi" stroke="#4038E7" />
                            <Line type="monotone" dataKey="rsi_s" stroke="#4038E7" />
                        </LineChart>
                        <LineChart width={400} height={300} data={bar[1]['ti']} margin={{
                            top: 5, right: 30, left: 20, bottom: 5,
                        }}
                        >
                            <XAxis dataKey="date"  />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="macd" stroke="#4527A0" />
                            <Line type="monotone" dataKey="macdsig" stroke="#FFA000" />
                        </LineChart>
                        <div className={'clear'}></div>
                    </div>
                )
                result.push(renderLineChart)
                result.push('</ul>')
                /*Object.entries(bar[1]['ti']).map(day => {
                    let t = day['1'].date
                    let month = t.getMonth()
                    let date = t.getDate()
                    let year = t.getFullYear()
                    //let hour = t.getHours()
                    //let minute = t.getMinutes()
                    let dt = month + '/' + date + '/' + year// + ' ' + hour + ':' + minute

                    result.push(<li key={'ti'+day[0]}>{dt}<br/>RSI: {day[1].rsi}<br/>SMA: {day[1].sma}<br/>EMA: {day[1].ema}</li>)
                })*/
            })
        }
        ReactDOM.render(result,document.getElementById(element))
    }
    // END renderTI()

    function renderPage() {
        console.log('renderPage()')
        const page = []
        page.push(
            <div>
                {/*<ul>
                    {settings.length > 0 ? Object.entries(settings).map(item => {
                        if(typeof item[1]['fields']['Name'] !== 'undefined') {
                            return <li key={'settings_' + item[1]['fields']['Name']} id={item[1]['id']}>{item[1]['fields']['Name']} = {item[1]['fields']['Value']}<br/>{item[1]['fields']['Notes']}</li>
                        }
                    }) : 'Loading Settings...'}
                </ul>*/}
                {/*<ul id={'renderbarsdata'}>
                    {'Loading Daily Price Data...'}
                </ul>
                <ul>
                    {stocksTI.length > 0 ? Object.entries(stocksTI).map(item => {
                        return <li key={'technicals'+ item['stock']} id={item['stock']}>{item['stock']} - {item['rsi']}</li>
                    }) : 'Loading RSI Results...'}
                </ul>
                <button onClick={()=>renderTI()}>Display Technicals</button>*/}
            </div>
        )
        return page
    }

    // Logo and menu in left sidebar
    const LeftSide = (props) => {
        return <div id={'LeftSide'}>
            <div id={'AlgoLogo'}><h1>Algo Trading</h1></div>
            <div id={'AlgoMainMenu'}>
                <button id={'reloadPage'} onClick={() => reloadPage(reload)} value={'Reload All Data'}>Reload All Data</button>
                <p>Clears page and requests data from Airtable and Alpaca.</p>
                <button onClick={()=>renderStockData()}>Display Stock Data</button>
                <p>Lists the stocks pulled from Airtable. Click a stock to see price and current technical data below the its name.</p>
                <button onClick={()=>renderTI()}>Calculate Technicals for ALL Stocks (in DB, could take some time, may have to run twice) </button>
                <p>Primarily used in development, this will calculate and render the charts for ALL stocks pulled from Airtable. (This occurs below the other stock list, TODO connect both for similar UX)</p>
            </div>
        </div>
    }

    // Main content - div placeholders to be hydrated
    const RightSide = (props) => {
        return <div id={'RightSide'}>
            <div>
            <h1>Algorithm Development, Showcase and Testing</h1>
            <p className={'main'}>Currently must use 'Reload All Data' twice, then 'Display Stock Data'.</p>
            <p className={'main'}>To display in-progress work on data structures, calculating technical indicators, weighting based on user settings, sub-algos to find optimal patterns, and all logic leading up to recommending (and then placing) winning orders/trades. Additionally this will be the working area for building reliability indicators and the base AI to constantly determine more ideal, lower risk, higher return trades.</p>
            <div id={'MainContent'}>
                <div id={'stockdata'}></div>
                <div id={'techindicators'}></div>
            </div>
        </div>
        </div>
    }

    return (
        <div id={'AlgoAppRoot'}>
            <LeftSide/>
            <RightSide/>
            {/*renderPage()*/}
        </div>
    )
} // END PolygonTest() - primary/parent function and default export

// TODO:

// Run basic calculations, and show all work on page (build logger for objects vs. text vs. arrays, etc.)
// Show weights and tech indicators
// See if I can map historic indicators and data to generate the hypothesis using current values!!!

// Determine what data to store - create form for updating DB! (manual to start and for editing later,
// but eventually automatic....)
// Once historic data has been pulled (target for now 1yr, but eventually why not store 5yr+?) note
// most recent date and only pull newer bars, then use combo for TI calcs...

// Provide result, targets, and order info (buy, short, sell, do nothing, do something if/when....)
// Manual for now, prepare for auto-orders....

export default PolygonTest