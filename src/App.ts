import * as path from 'path';
import * as express from 'express';
import * as logger from 'morgan';
import * as bodyParser from 'body-parser';
var moment = require('moment');

import * as workers from './workers';
var cors = require('cors')
import ccxtRouter from './routes/ccxtRouter';


var botConfigModel      = require('mongoose').model('botConfig');
// Creates and configures an ExpressJS web server.
class App {

  // ref to Express instance
  public express: express.Application;

  //Run configuration methods on the Express instance.
  constructor() {
    this.express = express();
    this.middleware();
    this.routes();
  }

  // Configure Express middleware.
  private middleware(): void {
    this.express.use(logger('dev'));
    this.express.use(bodyParser.json());
    this.express.use(bodyParser.urlencoded({ extended: false }));
    this.express.use('/logs', express.static(__dirname + '/../logs')); 
    this.express.use(cors());
  }

  // Configure API endpoints.
  private routes(): void {
    /* This is just to get up and running, and to make sure what we've got is
     * working so far. This function will change when we start to add more
     * API endpoints */
    let router = express.Router();
    // placeholder route handler
    router.get('/', (req, res, next) => {
      res.status(200).json({
        success: 1,
      });
    });

    this.express.use('/api/ccxt', ccxtRouter);

    workers.initWorkers([{
      _id: 'main',
      exchange: 'bittrex',
      tradePercent: 40,

      search1: ['BTC'],
      search2: ['ETH', 'USDT', 'USD'],
      search3: ['XRP', 'TRX', 'XLM', 'ADA', 'XVG', 'DTA', 'LTC', 'POWR', 'DGB', 'MONA', 'DOGE', 'CRW', 'BCH', 'RDD', 'XEM', 'NEO', 'SC', 'POLY', 'NEO', 'DASH'],

      minimalVolumeAmount: 1,

      minimalProfitPercent: 1,
      fee: 0.001,
      exchangeKey: {
        apiKey: 'f930780a07654e0a9e945b8c428ee0e2',
        secret: '0c5bad9d0ef34d968387620f4b39819f'
      },

      enableBot: true,
      enableOrder: false,
      priceInterval: 10,
    }]);
    workers.startWorkers();
  }

}

export default new App().express;
 
function exitHandler(options, exitCode) {
  workers.termiateAll();
  console.log('Terminating all');
  process.exit();
}

process.stdin.resume();
//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
