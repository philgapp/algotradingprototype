import React, {useState, useEffect, PureComponent} from 'react'
import ReactDOM from 'react-dom'
import * as Airtable from "../library/airtable/airtable"
require('../library/alpaca.config')
import AlpacaCORS from '../library/algorithms/cors-api'
import {LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,} from 'recharts'
import {serveStatic} from "next/dist/next-server/server/serve-static";
const _ = require('lodash');

function PolygonTest() {
    const [barsToPull, setBarsToPull] = useState(250) // Number of bars to pull from Alpaca API
    const [barSize, setBarSize] = useState('1D') // 1Min (or minute), 5Min, 15Min, 1D (or day)
    const [stocks, setStocks] = useState([]); // Array of stocks pulled from Airtable
    const [bars, setBars] = useState([]); // All price data for all stocks, used for TI calcs
    const [currentBar, setCurrentBar] = useState([]); // Last 1Min bar for all stocks, for current price data
    const [bars14, setBars14] = useState([]);
    const [stocksTI, setStocksTI] = useState([]); // TI calc results for all stocks
    const [settings, setSettings] = useState([]);
    const [reload, setReload] = useState(false) // Used with Reload Page button and function to pull data
    const Alpaca = new AlpacaCORS({
        keyId: API_KEY, // TODO pull from Airtable
        secretKey: API_SECRET, // TODO pull from Airtable
        // Hard coded local cors-anywhere and Alpaca paper account for development
        corsUrl: 'http://localhost:8080',
        baseUrl: 'https://paper-api.alpaca.markets'
    });
    const newDate = new Date()
    const today = newDate.toISOString()

    useEffect(() => {
        let alpacastocks = [] // Used to pull Alpaca data for stocks pulled from Airtable
        if(stocks.length > 0) {
            stocks.map(stock => {
                alpacastocks.push(stock['fields']['TICKER'])
            })
        } else {
            alpacastocks = 'TSLA'
        }
        const fetchData = async () => {
            await Airtable.retrieveRecords('stocks')
                .then(response => {
                    //setTimeout(function() {
                        setStocks(response)
                    //},1000)
                })
            await Airtable.retrieveRecords('settings')
                .then(response => {
                    //setTimeout(function() {
                    setSettings(response)
                    //},1000)
                    const testFix = async () => {
                        await logSettings(response)
                    }
                    testFix()
                })
            await Alpaca.getBars(barSize, [alpacastocks], {limit:barsToPull, end:today})
                .then(response => {
                    //setTimeout(function() {
                    const testFix = async () => {
                        await logBars(response)
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
            await Alpaca.getBars('1Min', [alpacastocks], {limit:1})
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
        //console.log(bars)
        //console.log(bars14)
        //console.log(currentBar)

        fetchData()
        calculateStocksTI()
        //renderPage()
    },[reload]);
    // END useEffect() (React Hook)

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
                    allTI.push({stock:stock[0],ti:response})
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
        let display_period = 29// Number of days in charts
        let rsi_period = 14//rsi ? rsi : (props.length - 1)
        let sma200_period = 200//sma ? sma : 200
        // NOTE: Other SMAs are hardcoded as of 28 May 2020
        let ema12_period = 12//ema ? ema : 12
        let ema26_period = 26
        // EMA %
        // 50% would be used for a 3-day exponential moving average (16.6667 ratio 50/3)
        // 40 7 days 5.7142
        // 30% 11 days 2.72727 ratio
        // 10% is used for a 19-day exponential moving average (0.5263 ratio 10/19)
        // 5% 109 days 0.04587 ratio
        // 1% is used for a 199-day exponential moving average. (0.00502 ratio 1/200)
        // So our % = ema_period
        let ema12_percentage = (2 / (ema12_period + 1) )
        let ema26_percentage = (2 / (ema26_period + 1) )
        let pricetime
        let previous
        let diff
        let pricearray = []
        let pricegap = []
        let rsioldest = []
        let rsigains = []
        let rsilosses = []
        let smaprices = []
        let sma5prices = []
        let sma12prices = []
        let sma26prices = []
        let sma200prices = []
        let rsiarray = []
        let totalLoss
        let totalGain
        let avgGain
        let avgLoss
        let iGain = 0
        let iLoss = 0
        let rsiavggain = []
        let rsiavgloss = []
        let smaarray = []
        let sma5array = []
        let sma12array = []
        let sma26array = []
        let sma200array = []
        let ema12array = []
        let ema26array = []
        let macdarray = []
        let macdsigarray = []
        let dates = []
        let i = 0
        let i2 = 0

        // Log gains and losses (NOTE! Losses tracked by absolute (as positive floats))
        Object.entries(props).map(bar => {
            // Ready to make this dynamic, but for now we are always using the closing price of each bar
            pricetime = 'close'
            // Set today to current close price and store in price array
            let current = bar[1][pricetime]
            pricearray.push(current)
            // Add date for this bar to dates array
            dates.push(bar[1]['date'])
            // If we already looped through once, we can start comparing prices and calculating TIs
            if (previous) {
                // Difference between bar prices, store to use 'Gap' data in decision-making
                diff = (current - previous)
                pricegap.push(diff)

                 /*else {
                    if (diff > 0) {
                        avgGain = ((rsiavggain[iGain] * (rsi_period - 1)) + diff) / rsi_period
                        rsiavggain.push(avgGain)
                        let RS = avgGain / avgLoss
                        let RSI = 100 - (100 / (1 + RS))
                        rsiarray.push(RSI)
                        iGain++
                    } else {
                        avgLoss = ((rsiavgloss[iLoss] * (rsi_period - 1)) + Math.abs(diff)) / rsi_period
                        rsiavgloss.push(avgLoss)
                        let RS = avgGain / avgLoss
                        let RSI = 100 - (100 / (1 + RS))
                        rsiarray.push(RSI)
                        iLoss++
                    }

                } */
            }
            // Store current price as previous to use in the next loop and increment i
            previous = current
            i++

            // RSI Calculation (simple and smoothed)
            // If we have looped <= RSI period, simply collect gain and loss data
            if (i <= rsi_period && i > 0) {
                if (diff > 0) {
                    rsioldest.push(1) // 1 = gain
                    rsigains.push(diff)
                } else {
                    rsioldest.push(0) // 0 = loss
                    rsilosses.push(Math.abs(diff))
                }
                // If we are past the number of loops = RSI period, we have enough data to calculate RSI!
            } else {
                if (rsioldest[0] === 1) { // If the oldest element was a gain, remove oldest gain from gains array
                    rsigains.shift()
                } else { // Otherwise remove oldest loss from loss array
                    rsilosses.shift()
                }
                // Then push gain or loss to appropriate array
                if (diff > 0) {
                    rsioldest.push(1)
                    rsigains.push(diff)
                } else {
                    rsioldest.push(0)
                    rsilosses.push(Math.abs(diff))
                }
                rsioldest.shift() // Keep track of oldest element, maintaining length = rsi_period

                totalGain = _.sum(rsigains)
                avgGain = totalGain / rsi_period
                //rsigains.length > 0 ? avgGain = totalGain / rsigains.length : avgGain = 0
                rsiavggain.push(avgGain)

                totalLoss = _.sum(rsilosses)
                avgLoss = totalLoss / rsi_period
                //rsilosses.length > 0 ? avgLoss = totalLoss / rsilosses.length : avgLoss = 0
                rsiavgloss.push(avgLoss)

                let RS
                avgLoss > 0 ? RS = (avgGain / avgLoss) : RS = 0
                let RSI = 100 - (100 / (1 + RS))
                rsiarray.push(RSI)
            }

            // Moving Averages and Beyond!
            smaprices.push(current)
            sma5prices.push(current)
            sma12prices.push(current)
            sma26prices.push(current)
            sma200prices.push(current)

            // SMA 5 Calculation
            let SMA5
            if (i2 >= 4) {
                let sma5Sum = _.sum(sma5prices)
                sma5prices.shift()
                SMA5 = sma5Sum / 5
            } else {
                SMA5 = 0
            }
            sma5array.push(SMA5)

            // SMA 12 Calculation
            let SMA12
            if (i2 >= 11) {
                let sma12Sum = _.sum(sma12prices)
                sma12prices.shift()
                SMA12 = sma12Sum / 12
            } else {
                SMA12 = 0
            }
            sma12array.push(SMA12)

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
        let rsi_result
        let sma_result
        let sma200_result // TODO put this in sma_result!!
        let ema12_result
        let ema26_result
        let macd_result
        let macdsig_result // Trying to use array for both MACD and MACD Signal in macd_result

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
        rsiarray.reverse()
        smaarray.reverse() // TODO put all SMAs in here!
        sma5array.reverse()
        sma12array.reverse()
        sma26array.reverse()
        sma200array.reverse()
        ema12array.reverse()
        ema26array.reverse()
        macdarray.reverse()
        incrementdatecleanup.reverse()
        //console.log(rsiarray)
        Object.entries(dates).map(date => {
            let t = date['1']
            let month = t.getMonth() + 1
            let thisdate = t.getDate()
            let year = t.getFullYear()
            result_date = month + '/' + thisdate + '/' + year
            price_result = pricearray[resulti]
            pricegap_result = pricegap[resulti]
            rsi_result = rsiarray[resulti]
            sma200_result = sma200array[resulti]
            ema12_result = ema12array[resulti]
            ema26_result = ema26array[resulti]
            macd_result = macdarray[resulti]

            TIresult.push({date:result_date,price:price_result,gap:pricegap_result,rsi:rsi_result,sma200:sma200_result,ema12:ema12_result,ema26:ema26_result,macd:macd_result['macd'],macdsig:macd_result['sig']})
            ii++
            resulti--
        })
        // Reverse array to sort newest to oldest
        //TIresult.reverse()
        //console.log(TIresult)
        return new Promise((resolve, reject) => {
            resolve( TIresult )
        })
    }
    // END TI()

    function renderTI(ticker) {
        let result = []
        let element
        if (ticker) {
            element = ticker + 'TIdata'
            let si = _.findKey(stocksTI, ['stock',ticker])
            if (si != 'undefined') {
                const renderLineChart1 = (
                    <div>
                        <LineChart width={400} height={300} data={stocksTI[si]['ti']} margin={{
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
                        <LineChart width={400} height={300} data={stocksTI[si]['ti']} margin={{
                            top: 5, right: 30, left: 20, bottom: 5,
                        }}
                        >
                            <XAxis dataKey="date"  />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="rsi" stroke="#4038E7" />
                        </LineChart>
                        <LineChart width={400} height={300} data={stocksTI[si]['ti']} margin={{
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
                result.push(renderLineChart1)
            } else {
                result.push("The stock was loaded from Airtable but not included in the Alpaca data query, charts couldn't be generated.")
            }
        } else {
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

    function RSI(props) {
        // TODO pull RSI calculation out of TI()
    }

    function renderStockData() {
        const stockcontent = (
            <ul className={"algoDefaultUL stocksUL"}>
                {stocks.length > 0 ? Object.entries(stocks).map(item => {
                    if(typeof item[1] !== 'undefined') {
                        let currentprice
                        let tick = item[1]['fields']['TICKER']
                        if (currentBar[tick] !== 'undefined') {
                            if (currentBar[tick].length > 0) {
                                currentprice = '$'+currentBar[tick][0]['c']
                            } else {
                                currentprice = 'NA'
                            }
                        } else {
                            currentprice = 'NA'
                        }
                        return <li className={'algoStock'} key={'renderstocks'+ tick} id={'renderstocks'+ tick}><a className={'algoTicker'} onClick={() => renderTI(tick)}>{tick+' - Price: '+currentprice}</a>{'(Click load charts)'}<br/><div className={'algoCharts'} id={tick + 'TIdata'}></div></li>
                    }
                }) : 'Loading Stocks...'}
            </ul>
        )
        ReactDOM.render(stockcontent,document.getElementById('stockdata'))
    }

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

    const LeftSide = (props) => {
        return <div id={'LeftSide'}>
            <div id={'AlgoLogo'}><h1>Algo Trading</h1></div>
            <div id={'AlgoMainMenu'}>
                <button id={'reloadPage'} onClick={() => reloadPage(reload)} value={'Reload All Data'}>Reload All Data</button>
                <p>Clears page and requests data from Airtable and Alpaca.</p>
                <button onClick={()=>renderStockData()}>Load Stocks from Airtable</button>
                <p>Lists the stocks pulled from Airtable. Click a stock to see price and current technical data below the its name.</p>
                <button onClick={()=>renderTI()}>Calculate Technicals for ALL Stocks (in DB, could take some time, may have to run twice) </button>
                <p>Primarily used in development, this will calculate and render the charts for ALL stocks pulled from Airtable. (This occurs below the other stock list, TODO connect both for similar UX)</p>
            </div>
        </div>
    }

    const RightSide = (props) => {
        return <div id={'RightSide'}>
            <div>
            <h1>Base Algorithm Testing, Development and Showcase</h1>
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
}

// Run basic calculations, and show all work on page (build logger for objects vs. text vs. arrays, etc.)
// Show weights and tech indicators
// See if I can map historic indicators and data to generate the hypothesis using current values!!!

// Determine what data to store - create form for updating DB! (manual to start and for editing later,
// but eventually automatic....)

// Provide result, targets, and order info (buy, short, sell, do nothing, do something if/when....)
// Manual for now, prepare for auto-orders....

export default PolygonTest