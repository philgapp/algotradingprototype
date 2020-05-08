import Head from 'next/head'
import React from 'react'
import * as Airtable from "../library/airtable/airtable";

class Dashboard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            users: null,
        }
    }

    componentDidMount() {
        Airtable.retrieveRecords('users').then(function(response) {
            console.log('ze resp:', response);
        })
    }

    render() {

        return (

            <div>
                <h1>
                    Algo Trading Prototype Dashboard
                </h1>
                <ul className="menu">
                    <li><a href="/">Home</a></li>
                    <li><a href="/alpacapaper">Alpaca Paper - Long Short</a></li>
                </ul>
                {/* <ul>
                    {this.listUsers()}
                </ul> */}
                <h3>
                    TODO
                </h3>
                <ul>
                    <li>List open positions</li>
                    <li>Display a pie chart with options to view by position, sector, etc.</li>
                    <li>List open positions</li>
                    <li>Select an algorithm</li>
                    <li>Start/Stop and see status of selected algorithm</li>
                </ul>

            </div>
        )
    }
}

export default Dashboard