import React, {useState, useEffect} from 'react'
import ReactDOM from 'react-dom'
import * as Airtable from "../library/airtable/airtable";
require('../library/alpaca.config')
import AlpacaCORS from '../library/algorithms/cors-api'
import { LineChart, Line } from 'recharts';
import {serveStatic} from "next/dist/next-server/server/serve-static";
const _ = require('lodash');

function PolygonTest() {
    const [stocks, setStocks] = useState([]);
    const [bars, setBars] = useState([]);
    const [bars14, setBars14] = useState({});
    const [stocksTI, setStockIndicators] = useState([]);
    const [settings, setSettings] = useState([]);
    const [reload, setReload] = useState(false)
    const Alpaca = new AlpacaCORS({
        keyId: API_KEY,
        secretKey: API_SECRET,
        // Hard coded local cors-anywhere and Alpaca paper account for development
        corsUrl: 'http://localhost:8080',
        baseUrl: 'https://paper-api.alpaca.markets'
    });
    const newDate = new Date()
    const today = newDate.toISOString()

        useEffect(() => {
        const fetchData = async () => {
            await Airtable.retrieveRecords('stocks')
                .then(response => {
                    setTimeout(function() {
                        setStocks(response)
                    },1000)
                })
            await Airtable.retrieveRecords('settings')
                .then(response => {
                    setTimeout(function() {
                        setSettings(response)
                    },1000)
                })
            await Alpaca.getBars('1D', ['TSLA'], {limit:30, end:today})
                .then(response => {
                    setTimeout(function() {
                        const testFix = async () => {
                            await logBars(response)
                                .then(newr => {
                                    setTimeout(function() {
                                        //setBars(newr)
                                        //setBars14(newr)
                                    }, 1000)
                                })
                        }
                        testFix()
                    },1000)
                })
        }
        //console.log(bars)
        //console.log(bars14)

        fetchData()
        renderBars()
        renderPage()
    },[reload]);

    function reloadPage(props) {
        const value = !props
        setReload(value)
    }

    function logBars(props) {
        return new Promise((resolve,reject) => {
            setBars(props)
            resolve()
        })
    }

    function renderBars() {
        let allTI = []
        let bar
        let renderRSI = []
        Object.entries(bars).map(stock => {
            let stockBars = []
            renderRSI.push(
                <li key={''+stock[0]} id={stock[0]}>Previous 14 1-day bars for {stock[0]}:</li>
            )
            for (bar of stock[1]) {
                let t = new Date(bar['t'] * 1000)
                renderRSI.push(
                    <li key={t + stock[0]} id={stock[0]}>Opened at {bar['o']} and Closed at {bar['c']} at {t}</li>
                )
                stockBars.push({date:t,close:bar['c'],open:bar['o'],high:bar['h'],low:bar['l']})
            }
            //stockBars.reverse()
            console.log(stock[0])
            TI(stockBars,14,20,10)
                .then(response => {
                    allTI.push({stock:stock[0],ti:response})
                })
        })
        setStockIndicators(allTI)
        renderTI()
        if(reload) {
            ReactDOM.render(renderRSI,document.getElementById('renderbarsdata'))
        }
    }

    // TI (Technical Indicators) calculates RSI, SMA, EMA, MACD
    // Properties
    // props = array from renderBars as stockBars
    // rsi = number for the rsi timeframe (period) - normally 14 days is default, but defaults to .length of props
    // sma = number for the sma timeframe - default 20 days
    // ema = number for ema timeframe - default 12 days
    // function returns an array via Promise including an array for each item (i.e. day) in the period with:
    // date, rsi, sma, ema
    function TI(props,rsi,sma,ema) {
        //console.log(props)
        let TIresult = []
        let rsi_period = rsi ? rsi : (props.length - 1)
        let sma_period = sma ? sma : 20
        let ema_period = ema ? ema : 12
        // EMA %
        // 50% would be used for a 3-day exponential moving average (16.6667 ratio 50/3)
        // 40 7 days 5.7142
        // 30% 11 days 2.72727 ratio
        // 10% is used for a 19-day exponential moving average (0.5263 ratio 10/19)
        // 5% 109 days 0.04587 ratio
        // 1% is used for a 199-day exponential moving average. (0.00502 ratio 1/200)
        // So our % = ema_period
        let ema_percentage = (2 / (ema_period + 1) )
        let previous
        let pricetime
        let rsigains = []
        let rsilosses = []
        let smaprices = []
        let rsiarray = []
        let avgGain
        let avgLoss
        let iGain = 0
        let iLoss = 0
        let rsiavggain = []
        let rsiavgloss = []
        let smaarray = []
        let emaarray = []
        let dates = []
        let i = 0

        // Log gains and losses (NOTE! Losses tracked by absolute (as positive floats))
        Object.entries(props).map(bar => {
            // Ready to make this dynamic, but for now we are always using the closing price of each bar
            pricetime = 'close'
            // Set today to current close price
            let current = bar[1][pricetime]
            // Add date for this bar to dates array
            dates.push(bar[1]['date'])
            // If we already grabbed most recent price, the previous price from it and store either the gain or loss
            if (previous) {
                let diff = (current - previous)
                if(i < rsi_period) {
                    if (diff > 0) {
                        rsigains.push(diff)
                    } else {
                        rsilosses.push(Math.abs(diff))
                    }
                } else if (i === rsi_period) {
                    if (diff > 0) {
                        rsigains.push(diff)
                    } else {
                        rsilosses.push(Math.abs(diff))
                    }
                    // Calculate initial RSI with enough data per rsi_period
                    let totalGain = _.sum(rsigains)
                    avgGain = totalGain / rsi_period
                    rsiavggain.push(avgGain)
                    let totalLoss = _.sum(rsilosses)
                    avgLoss = totalLoss / rsi_period
                    rsiavgloss.push(avgLoss)
                    let RS = avgGain / avgLoss
                    let RSI = 100 - (100 / (1 + RS))
                    rsiarray.push(RSI)
                } else {
                    if (diff > 0) {
                        avgGain = ((rsiavggain[iGain] * 13) + diff) / rsi_period
                        rsiavggain.push(avgGain)
                        let RS = avgGain / avgLoss
                        let RSI = 100 - (100 / (1 + RS))
                        rsiarray.push(RSI)
                        iGain++
                    } else {
                        avgLoss = ((rsiavgloss[iLoss] * 13) + Math.abs(diff)) / rsi_period
                        rsiavgloss.push(avgLoss)
                        let RS = avgGain / avgLoss
                        let RSI = 100 - (100 / (1 + RS))
                        rsiarray.push(RSI)
                        iLoss++
                    }

                }
                // EMA Calculation
                let ematoday = (current * ema_percentage) + ((previous) * (1 - ema_percentage))
                if(i === 1) {
                    emaarray.push(ematoday)
                } else {
                    let nextema = (current * ema_percentage) + ((emaarray[(i - 2)]) * (1 - ema_percentage))
                    emaarray.push(nextema)
                }
            }
            if(i < sma_period) {
                smaprices.push(bar[1][pricetime])
            }
            if(i >= sma_period) {
                // SMA Calculation
                let smaSum = _.sum(smaprices)
                let SMA = smaSum / sma_period
                smaarray.push(SMA)
                smaprices.shift()
                smaprices.push(bar[1][pricetime])
            }

            //Update yesterday to today for next loop and increment i
            previous = current
            i++
        })

        // Initial RSI Calculation
        // Get average gain and loss for the period/position
        //console.log(rsigains)
        //console.log(rsilosses)

        //console.log(RSI)

        // Build return array of calculated technical indicators
        let ii = 0
        let result_date
        let rsi_result
        let sma_result
        let ema_result
        Object.entries(dates).map(date => {
            result_date = date[1]
            if(ii < rsi_period) {
                rsi_result = 'Still calculating initial RSI using first '+ rsi_period +' bars (days) of data.'
            } else {
                rsi_result = rsiarray[Math.abs(rsi_period - ii)]
            }

            if(ii < sma_period) {
                sma_result = 0
            } else {
                sma_result = smaarray[(ii - sma_period)]
            }
            if(ii > 0) {
                ema_result = emaarray[(ii-1)]
            }

            TIresult.push({date:result_date,rsi:rsi_result,sma:sma_result,ema:ema_result})
            ii++
        })
        // Reverse array to sort newest to oldest
        TIresult.reverse()
        return new Promise((resolve, reject) => {
            resolve( TIresult )
        })
    }

    function renderTI() {
        let result = []
        Object.entries(stocksTI).map(bar => {
            let stockname = bar[1]['stock']
            result.push(<li key={'ti'+stockname+'-br'}></li>,<li key={'ti'+stockname}>{stockname}</li>)
            const renderLineChart = (
                <LineChart width={600} height={400} data={bar[1]}>
                    <Line type="monotone" dataKey="rsi" stroke="#8884d8" />
                </LineChart>
            )
            result.push(renderLineChart)
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
        ReactDOM.render(result,document.getElementById('techindicators'))
    }

    function RSI(props) {
        // TODO pull RSI calculation out of TI()
    }

    function renderStockData() {
        const stockcontent = (
            <ul>
                {stocks.length > 0 ? Object.entries(stocks).map(item => {
                    if(typeof item[1] !== 'undefined') {
                        return <li key={'stocks'+item[1]['fields']['TICKER']} id={item[1]}>{item[1]['fields']['TICKER']}</li>
                    }
                }) : 'Loading Stocks...'}
            </ul>
        )
        ReactDOM.render(stockcontent,document.getElementById('stockdata'))
    }

    function renderPage() {
        const page = []
        page.push(
            <div>
                <h1>Polygon Testing</h1>
                <p>This page is used to display in-progress work on calculating technical indicators, weighting based on user settings, and logic leading up to placing winning orders/trades. Additionally this will be the working area for building reliability indicators and the base AI to determine more ideal, lower risk, higher return trades.</p>
                <p><button id={'reloadPage'} onClick={() => reloadPage(reload)} value={'Reload All Data'}>Reload All Data</button></p>
                <ul>
                    {settings.length > 0 ? Object.entries(settings).map(item => {
                        if(typeof item[1]['fields']['Name'] !== 'undefined') {
                            return <li key={'settings_' + item[1]['fields']['Name']} id={item[1]['id']}>{item[1]['fields']['Name']} = {item[1]['fields']['Value']}<br/>{item[1]['fields']['Notes']}</li>
                        }
                    }) : 'Loading Settings...'}
                </ul>
                <button onClick={()=>renderStockData()}>Load Stocks from Airtable</button>
                <div id={'stockdata'}></div>
                <button onClick={()=>renderBars()}>Load Price Data</button>
                <ul id={'renderbarsdata'}>
                    {'Loading Daily Price Data...'}
                </ul>
                <ul>
                    {stocksTI.length > 0 ? Object.entries(stocksTI).map(item => {
                        return <li id={item['stock']}>{item['stock']} - {item['rsi']}</li>
                    }) : 'Loading RSI Results...'}
                </ul>
                <button onClick={()=>renderTI()}>Load Technical Indicators</button>
                <ul id={'techindicators'}>
                </ul>
            </div>
        )
        return page
    }

    return (
        <div>
            {renderPage()}
        </div>
    )
}

// Run basic calculations, and show all work on page (build logger for objects vs. text vs. arrays, etc.)
// Show weights and tech indicators
// See if I can map historic indicators and data to generate the hypothesis using current values!!!


// Determine what data to store - create form for updating DB! (manual to start and for editing later,
// but eventually automatic....

// Provide result, targets, and order info (buy, short, sell, do nothing, do something if/when....)
// Manual for now, prepare for auto-orders

export default PolygonTest