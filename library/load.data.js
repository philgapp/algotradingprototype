// Testing using a load.data.js file to pull stocks and algorithms for a 'logged on user'
// Use the stock list and relevant data, as well as algos, to build their custom dashboard and
// Properly run their selected algo

import Head from 'next/head'
import React, {useState, useEffect} from 'react'
import * as Airtable from "../library/airtable/airtable";

function loadData(props) {
    const {
        UserList: [UserList, setUserList]
    } = {
        UserList: useState(0),
        ...(props.state || {})
    };
    //const [UserList, setUserList]= useState({});
    //const [StockList, setStockList]= useState({});

    useEffect(() => {
        const fetchUsers = async () => {
            await Airtable.retrieveRecords('users')
                .then(response => {
                    setTimeout(function() {
                        setUserList(response)
                    },2000)
                })
        }
        fetchUsers()
/*
        const fetchStocks = async () => {
            await Airtable.retrieveRecords('stocks')
                .then(response => {
                    setTimeout(function() {
                        setStockList(response)
                    },2000)
                })
        }
        fetchStocks()

 */
    },[]);
    /*
        return (
            <div>
                <h3>
                    User List
                </h3>
                <ul className='userlist'>
                    {UserList.length > 0 ? Object.entries(UserList).map(item => {
                        if(typeof item[1]['fields']['UserName'] !== 'undefined') {
                            return <li key={item[1]['id']}>{item[1]['fields']['UserName']}</li>
                        }
                    }) : 'Loading Usernames...'}
                </ul>
                <h3>
                    Stock List
                </h3>
                <ul className='stocklist'>
                    {StockList.length > 0 ? Object.entries(StockList).map(item => {
                        if(typeof item[1]['fields']['UserName'] !== 'undefined') {
                            return <li key={item[1]['ticker']}>{item[1]['fields']['UserName']}</li>
                        }
                    }) : 'Loading Stocks...'}
                </ul>
            </div>
    )
     */
}

export default loadData