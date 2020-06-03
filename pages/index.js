import Head from 'next/head'

const LeftSide = (props) => {
        return <div id={'LeftSide'}>
            <div id={'AlgoLogo'}><h1>Algo Trading</h1></div>
            <div id={'AlgoMainMenu'}>
                <button id={'reloadPage'} onClick={() => reloadPage(reload)} value={'Reload All Data'}>Reload All Data</button>
                <p>Clears page and requests data from Airtable and Alpaca.</p>
                <button onClick={()=>renderStockData()}>Load Stocks from Airtable</button>
                <p>Lists the stocks pulled from Airtable. Click a stock to see price and current technical data below the its name.</p>
                <button onClick={()=>renderTI()}>Calculate Technicals for ALL Stocks (in DB, could take some time, may have to run twice) </button>
                <p>Primarily used in development, this will calculate and render the charts for ALL stocks pulled from Airtable. (This occurs below the other stock list, TODO connect both for similar UX)</p>
            </div>
        </div>
    }

const Home = () => (


  <div className="container">
    <Head>
      <title>Create Next App</title>
      <link rel="icon" href="/favicon.ico" />
    </Head>

    <main>
      <h1 className="title">
        Welcome to Algo Trading Prototype!
      </h1>

      <p className="description">
        This is an open source project built with Node and Next JS. It uses the AlpacaHQ API and commission-free brokerage to allow us to create, test, and trade with algorithms! The mission is to first existing algorithms (some newer or untested, others with proven track records) and then to build upon them, as well as create new ones, to maximize returns and minimize risk.
      </p>

      <div className="grid">
        <a href="/dashboard" className="card">
            <h3>Dashboard &rarr;</h3>
            <p>View the main page for the project, see open positions, and choose algorithms to play with.</p>
          </a>

          <a href="/polygon-testing" className="card">
                      <h3>Polygon Testing - Technical Indicators &rarr;</h3>
                      <p>Currently the main page for the app. This provides a test ground with basic design, data from Airtable and Alpaca, and charts showing calculations for technical indicators to use. Coming soon: Showing work for decision making within the algorithm based on TI data!!!</p>
                    </a>

         <a href="/alpacapaper" className="card">
          <h3>Alpaca Paper Trading - Long and Short &rarr;</h3>
          <p>Use this to launch an example script provided by Alpaca which enters and exits long and short positions. When it is run it will connect to Alpaca and start running.</p>
        </a>
      </div>
    </main>

    <footer>
      <a
        href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
        target="_blank"
        rel="noopener noreferrer"
      >
        Powered by <img src="/vercel.svg" alt="Vercel Logo" />
      </a>
    </footer>

    <style jsx>{`
      .container {
        min-height: 100vh;
        padding: 0 0.5rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }

      main {
        padding: 5rem 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }

      footer {
        width: 100%;
        height: 100px;
        border-top: 1px solid #eaeaea;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      footer img {
        margin-left: 0.5rem;
      }

      footer a {
        display: flex;
        justify-content: center;
        align-items: center;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      .title a {
        color: #0070f3;
        text-decoration: none;
      }

      .title a:hover,
      .title a:focus,
      .title a:active {
        text-decoration: underline;
      }

      .title {
        margin: 0;
        line-height: 1.15;
        font-size: 4rem;
      }

      .title,
      .description {
        text-align: center;
      }

      .description {
        line-height: 1.5;
        font-size: 1.5rem;
      }

      code {
        background: #fafafa;
        border-radius: 5px;
        padding: 0.75rem;
        font-size: 1.1rem;
        font-family: Menlo, Monaco, Lucida Console, Liberation Mono,
          DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace;
      }

      .grid {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;

        max-width: 800px;
        margin-top: 3rem;
      }

      .card {
        margin: 1rem;
        flex-basis: 45%;
        padding: 1.5rem;
        text-align: left;
        color: inherit;
        text-decoration: none;
        border: 1px solid #eaeaea;
        border-radius: 10px;
        transition: color 0.15s ease, border-color 0.15s ease;
      }

      .card:hover,
      .card:focus,
      .card:active {
        color: #0070f3;
        border-color: #0070f3;
      }

      .card h3 {
        margin: 0 0 1rem 0;
        font-size: 1.5rem;
      }

      .card p {
        margin: 0;
        font-size: 1.25rem;
        line-height: 1.5;
      }

      @media (max-width: 600px) {
        .grid {
          width: 100%;
          flex-direction: column;
        }
      }
    `}</style>

    <style jsx global>{`
      html,
      body {
        padding: 0;
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
          Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
      }

      * {
        box-sizing: border-box;
      }
    `}</style>
  </div>
)

export default Home
