import Head from 'next/head'
import {serveStatic} from "next/dist/next-server/server/serve-static";
import React from "react";

function Home () {

    const LeftSide = (props) => {
            return <div id={'LeftSide'}>
                <div id={'AlgoLogo'}><h1>Algo Trading</h1></div>
                <div id={'AlgoMainMenu'}>
                    <button id={'reloadPage'} onClick={() => reloadPage(reload)} value={'Reload All Data'}>Login/Logout</button>
                    <p>Coming soon....</p>
                    <button onClick={()=>renderStockData()}>Profile &amp; Settings</button>
                    <p>Coming soon....</p>
                    <button onClick={()=>renderTI()}>Additional Button(s)</button>
                    <p>Coming soon....</p>
                </div>
            </div>
        }

    const RightSide = (props) => {
        return <div id={"RightSide"}>

            <h1 className="title">
                Welcome to Algo Trading!
            </h1>

            <p className="description">
                Algo Trading is a technical trading application that assists new, learning or experienced market traders
                in finding options for trades. The long-term vision is to apply machine learning (AI) and a huge amount
                of data (market data as well as calculations based on that data over time) to automatically make trades
                through the Alpaca API.
            </p>
            <p className="description">
                Having an account here will only allow you to view market data, technical indicators and custom, hybrid
                indicators we build and improve constantly. In order to make trades right now, we recommend opening or
                using a brokerage account of your choice. In the near future you should sign up for
                https://alpaca.markets/. With a free account you can test our algorithm (and your own preferences that
                control it if you desire) with the Alpaca Paper account, which shows you how your account would likely
                perform in real life without gambling real money. Then with a funded account (and saving your API
                details into your Algo Trading user profile) you can make real trades based on sound mathematics that
                reduce risk and increase returns!
            </p>

            <div className="grid">
                <a href="/dashboard" className="card">
                    <h3>Dashboard &rarr;</h3>
                    <p>View the main page for the project, see open positions, and choose algorithms to play with.</p>
                </a>

                <a href="/polygon-testing" className="card">
                    <h3>Polygon Testing - Technical Indicators &rarr;</h3>
                    <p>Currently the main page for the app. This provides a test ground with basic design, data from
                        Airtable and Alpaca, and charts showing calculations for technical indicators to use. Coming
                        soon: Showing work for decision making within the algorithm based on TI data!!!</p>
                </a>
            </div>

            <footer>
                Algo Trading &copy; 2020 - Galactic Edge
            </footer>
        </div>
    }

    return (
        <div id={'AlgoAppRoot'}>
            <Head>
                <title>Algo Trading - Technical Trading with Training Wheels</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <LeftSide/>
            <RightSide/>
        </div>
    )
}

export default Home
