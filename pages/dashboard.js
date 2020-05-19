import React, {useState, useEffect} from 'react'
import * as Airtable from "../library/airtable/airtable";
//import loadData from "../library/load.data";

function Dashboard() {
    const [UserList, setUserList] = useState({});
    const [StockList, setStockList] = useState({});

    useEffect(() => {
        //loadData()
         const fetchData = async () => {
             await Airtable.retrieveRecords('users')
             .then(response => {
                 setTimeout(function() {
                     setUserList(response)
                 },2000)
             })

             await Airtable.retrieveRecords('stocks')
                 .then(response => {
                     setTimeout(function() {
                         setStockList(response)
                     },2000)
                 })
         }

         fetchData()
    },[]);

    return (

        <div>
            <h1>
                Algo Trading Prototype Dashboard
            </h1>
            <ul className="menu">
                <li><a href="/">Home</a></li>
                <li><a href="/alpacapaper">Alpaca Paper - Long Short</a></li>
            </ul>

            <h4>
                Users
            </h4>
            <ul className='userlist'>
                {UserList.length > 0 ? Object.entries(UserList).map(item => {
                    if(typeof item[1]['fields']['UserName'] !== 'undefined') {
                        return <li id={item[1]['id']}>{item[1]['fields']['UserName']}</li>
                    }
                }) : 'Loading Usernames...'}
            </ul>

            <h4>
                Stocks
            </h4>
            <ul className='stocklist'>
                {StockList.length > 0 ? Object.entries(StockList).map(item => {
                    if(typeof item[1]['fields']['TICKER'] !== 'undefined') {
                        return <li id={item[1]['id']}>{item[1]['fields']['TICKER']}</li>
                    }
                }) : 'Loading Stocks...'}
            </ul>

            <h4>
                TODO
            </h4>
            <ul className='todo'>
                <li>List open positions</li>
                <li>Display a pie chart with options to view by position, sector, etc.</li>
                <li>List open positions</li>
                <li>Select an algorithm</li>
                <li>Start/Stop and see status of selected algorithm</li>
            </ul>

        </div>
    )
}

export default Dashboard