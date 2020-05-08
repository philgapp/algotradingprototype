import Head from 'next/head'
import ReactDOM from 'react-dom'
import React from 'react'

const startAlpaca = require('../library/algorithms/LongShortExample.js');
// Instantiate the LongShort class
const ls = new startAlpaca({
    keyId: API_KEY,
    secretKey: API_SECRET,
    paper: PAPER,
})

function Button(props) {
    return (
        <button onClick={props.onClick}>{props.value}</button>
    );
}

class BuildButton extends React.Component {
    renderButton() {
        return (
            <Button
                onClick = {() => this.props.onClick()}
                value = {this.props.value}
            />
        );
    }

    render() {
        return (
            <div>
                {this.renderButton()}
            </div>
        );
    }
}

class AlpacaPaper extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            abort: false,
            value: 'Run Long Short Algorithm',
        };
    }

    algoButton(abort) {
        if (abort) {
            this.setState({
                abort: false,
                value: 'Run Long Short Algorithm',
            });
            // TODO stop Long Short algo!
            ls.stop()
        } else {
            // Run LongShort
            ls.run() // Also logs to client side (browser) now
            this.setState({
                abort: true,
                value: 'Stop Long Short Algorithm',
            });
        }
    }

    render() {
        return (
            <div className='container'>
                <Head>
                    <title>Alpaca Paper Trading Prototype</title>
                    <link rel="icon" href="/favicon.ico"/>
                </Head>

                <main>
                    <h1 className="title">
                        Alpaca Paper - Long Short Example Algorithm
                    </h1>

                    <p className="description">
                        To run or stop click the button below. Check the log for details until the status UI is built.
                    </p>

                    <p>
                        <BuildButton
                            onClick = {() => this.algoButton(this.state.abort)}
                            value = {this.state.value}
                        />
                    </p>

                    <p>
                        TODO display output from Long Short Example Algo here!
                    </p>
                </main>
            </div>
        );
    }
}

export default AlpacaPaper