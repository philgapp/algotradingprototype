import React, {useState, useEffect} from 'react'
import * as Airtable from "../library/airtable/airtable";

// This model is built to pull and manage specific stocks as stored in Airtable
function Stock() {
    const [RawStocks, setRawStocks] = useState(new Array())

    // Pull all
    function getRaw() {
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
                            setRawStocks(response)
                        },2000)
                    })
            }

            fetchData()
        },[]);
    }

    // Add/update a stock
    // Two ways, by algorithm when a new stock meets criteria for user OR
    // Manual entry by user (from form)
    function addAuto(props) {

    }

    function addManual(props) {

    }

    // Calculate longer-term historical data
    // Store it (update stock)
    function updateStats(props) {

    }

    //




}

export default Stock