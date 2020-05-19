import React, {useState, useEffect} from 'react'
import * as Airtable from "../library/airtable/airtable";
require('../library/alpaca.config')
import AlpacaCORS from '../library/algorithms/cors-api'
import {serveStatic} from "next/dist/next-server/server/serve-static";
const _ = require('lodash');

function PolygonTest() {
    const [stocks, setStocks] = useState([]);
    const [bars, setBars] = useState([]);
    const [bars14, setBars14] = useState({});
    const [stocksRSI, setStocksRSI] = useState([]);
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
            await Alpaca.getBars('1D', ['AAPL', 'TSLA', 'USO'], {limit:14, end:today})
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
            setBars14(props)
            resolve()
        })
    }

    function renderBars() {
        let allRSI = []
        let bar
        let renderRSI = []
        Object.entries(bars14).map(stock => {
            let stockBars = []
            renderRSI.push(
                <li id={stock[0]}>Previous 14 1-day bars for {stock[0]}:</li>
            )
            for (bar of stock[1]) {
                let t = new Date(bar['t'] * 1000)
                let month = t.getMonth()
                let date = t.getDate()
                let year = t.getFullYear()
                //let hour = t.getHours()
                //let minute = t.getMinutes()
                let dt = month + '/' + date + '/' + year// + ' ' + hour + ':' + minute
                renderRSI.push(
                    <li id={stock[0]}>Opened at {bar['o']} and Closed at {bar['c']} at {dt}</li>
                )
                stockBars.push({date:dt,open:bar['o'],close:bar['c']})
                stockBars.sort((a,b) => {
                    return b.date - a.date
                })
            }
            RSI(stockBars)
                .then(response => {
                    allRSI.push({stock:stock[0],rsi:response})
                })
        })
        console.log(allRSI)
        setStocksRSI(allRSI)
        return renderRSI
    }

    function RSI(props) {
        /*
        let barArray = new Array()
        Object.entries(props).map(bar => {
            barArray.push(bar[1])
        })
        console.log('barArray:')
        console.log(barArray)
        */
        let period = props
        let period_closes = []
        let gains = []
        let losses = []
        console.log(period)
        Object.entries(period).map(bar => {
            period_closes.push(bar[1]['close'])
            console.log(bar[1]['close'])
        })
        return new Promise((resolve, reject) => {
            /*
            let x = barArray.length
            console.log(x)
            let period = barArray.slice(x * -1)
            console.log(period)
             */
            let avgGain = _.meanBy(gains, (p) => Number(p.open))
            //console.log(avgOpen)
            let avgLoss = _.meanBy(losses, (p) => Number(p.close))
            //console.log(avgClose)
            let RS = avgGain / avgLoss
            // TODO if prevRSI then avgGain
            //console.log(RS)
            let RSI = 100 - (100 / (1 + RS))
            //console.log(RSI)
            resolve( RSI )
        })
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
                        return <li id={item[1]['id']}>{item[1]['fields']['Name']} = {item[1]['fields']['Value']}<br/>{item[1]['fields']['Notes']}</li>
                    }
                }) : 'Loading Settings...'}
            </ul>
            <ul>
                {stocks.length > 0 ? Object.entries(stocks).map(item => {
                    if(typeof item[1] !== 'undefined') {
                        return <li id={item[1]}>{item[1]['fields']['TICKER']}</li>
                    }
                }) : 'Loading Stocks...'}
            </ul>
            <ul>
                {bars14.length > 0 ? renderBars() : 'Loading Daily Price Data...'}
            </ul>
            <ul>
                {stocksRSI.length > 0 ? Object.entries(stocksRSI).map(item => {
                    return <li id={item['stock']}>{item['stock']} - {item['rsi']}</li>
                }) : 'Loading RSI Results...'}
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

// Pull data for a single, then loop of stocks (from DB)
// Use TSLA (and AAPL, USO) as a static demo first

// Run basic calculations, and show all work on page (build logger for objects vs. text vs. arrays, etc.)
// Show weights and tech indicators
// See if I can map historic indicators and data to generate the hypothesis using current values!!!

// calculate RSI
/*
public static double CalculateRsi(IEnumerable<double> closePrices)
{
    var prices = closePrices as double[] ?? closePrices.ToArray();

    double sumGain = 0;
    double sumLoss = 0;
    for (int i = 1; i < prices.Length; i++)
    {
        var difference = prices[i] - prices[i - 1];
        if (difference >= 0)
        {
            sumGain += difference;
        }
        else
        {
            sumLoss -= difference;
        }
    }

    if (sumGain == 0) return 0;
    if (Math.Abs(sumLoss) < Tolerance) return 100;

    var relativeStrength = sumGain / sumLoss;

    return 100.0 - (100.0 / (1 + relativeStrength));
}
 */


// Determine what data to store - create form for updating DB! (manual to start and for editing later,
// but eventually automatic....

// Provide result, targets, and order info (buy, short, sell, do nothing, do something if/when....)
// Manual for now, prepare for auto-orders

export default PolygonTest