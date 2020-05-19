import Head from 'next/head'
import React, {useState, useEffect} from 'react'
import * as Airtable from "../library/airtable/airtable";
// TODO Pull from USER info instead of including hard-coded Alpaca config details:
require('../library/alpaca.config')
import AlgoMasterPrototype from '../library/algorithms/algo-master-prototype'

function loadAlpaca() {
    const [stocklist, setStockList] = useState([]);
    const [abort, setAbort] = useState(false)
    const [value, setValue] = useState('Loading...')
    const [algo, setAlgo] = useState({})

    useEffect(() => {
        //loadData()
        const fetchData = async () => {
            await Airtable.retrieveRecords('stocks')
            .then(response => {
                setTimeout(function() {
                    setStockList(response)
                    setAlgo(runAlpaca(response))
                },2000)
            })
        }

        fetchData()
    },[]);

    function runAlpaca(props) {
        const StockTickers = []
        props.map(item => {
            if (typeof item['fields']['TICKER'] !== 'undefined') {
                StockTickers.push(item['fields']['TICKER'])
            }
        })
        // Instantiate the AlgoMasterPrototype class
        var algoClass = new AlgoMasterPrototype({
            API_KEY, API_SECRET, stocks: StockTickers
        })
        setValue('Run Master Algorithm')
        return algoClass
    }

    function Button(props) {
        return (
            <button onClick={props.onClick}>{props.value}</button>
        );
    }

    function algoButton(props) {
        if (props.abort) {
            setAbort(false)
            setValue('Run Master Algorithm')
            // TODO stop Long Short algo!
            algo.kill()
        } else {
            // Run LongShort
            algo.init()
            algo.run() // Also logs to client side (browser) now
            console.log('Running Master Algorithm')
            setAbort(true)
            setValue('Stop Master Algorithm')
        }
    }

    return (
        <div className='container'>
            <Head>
                <title>Alpaca Paper Trading Prototype</title>
                <link rel="icon" href="/favicon.ico"/>
                <link rel="stylesheet" type="text/css" href="/long-short-browser/browser-trader-style.css"/>
                <script src="/long-short-browser/Chart.bundle.js"></script>
            </Head>

            <main>
                <h1 className="title">
                    Alpaca Paper - Master Algorithm
                </h1>

                <p className="description">
                    To run or stop click the button below. Check the log for details until the status UI is built.
                </p>

                <p>
                    <Button
                        onClick = {() => algoButton({abort})}
                        value = {value}
                    />
                </p>

                <div id="title-container">
                    <h2>Master Prototype Trading Algorithm</h2>
                </div>
                <div id="data-container">
                    <div id="side-container">
                        <div id="positions">
                            <h5 style={{margin: "5px", fontWeight: "bold"}}>Positions</h5>
                            <div id="positions-title">
                                <p className="position-fragment">Symbol</p>
                                <p className="position-fragment">Qty</p>
                                <p className="position-fragment">Side</p>
                                <p className="position-fragment">+/-</p>
                            </div>
                            <div id="positions-log">

                            </div>
                        </div>
                        <div id="orders">
                            <h5 style={{margin: "5px", fontWeight: "bold"}}>Orders</h5>
                            <div id="order-title">
                                <p className="order-fragment">Symbol</p>
                                <p className="order-fragment">Qty</p>
                                <p className="order-fragment">Side</p>
                                <p className="order-fragment">Type</p>
                            </div>
                            <div id="orders-log">

                            </div>
                        </div>
                    </div>
                    <div id="chart-container">
                        <canvas id="main_chart"></canvas>
                    </div>
                    <div id="event-log">

                    </div>
                </div>
                <div id="bottom-container">

                </div>
            </main>
        </div>
    );
}

/*
<button type="button" className="btn btn-success control-button" onClick="runScript();">
    Run script
</button>
<div id="input-container">
    <h5 id="input-title">Enter credentials here</h5>
    <input id="api-key" type="text" placeholder="API_KEY"/>
    <input id="api-secret" type="text" placeholder="API_SECRET"/>
</div>
<button type="button" className="btn btn-danger control-button" onClick="killScript();">
    Kill script
</button>
*/

export default loadAlpaca