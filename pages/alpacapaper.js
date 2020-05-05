import Head from 'next/head'

var startAlpaca = require('./library/prototype/core.js');

const Home = () => (
  <div className='container'>
    <Head>
      <title>Alpaca Paper Trading Prototype</title>
      <link rel="icon" href="/favicon.ico" />
    </Head>
    
    <main>
        <h1 className="title">
          Welcome to the Alpaca Paper Trading Prototype!
        </h1>

        <p className="description">
          Get started by editing <code>pages/alpacapaper.js</code>
        </p>
    </main>
  </div>
)

export default Home