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

    listUsers() {
        Airtable.retrieveRecords('users').then(function(user) {
            const userData = {}
            console.log(user)
/*
            this.setState({
                users: userData,
            })

 */
        })
        console.log(this.state.users)
        const userList = this.state.users
        for(let user in userList) {
            console.log(this.state.users[user])
        }
            //<li key={this.state.users.user[id]}>(this.state.users.user.fields.username)</li>

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
                <ul>
                    {this.listUsers()}
                </ul>
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