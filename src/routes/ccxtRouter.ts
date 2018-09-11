import {Router, Request, Response, NextFunction} from 'express';
import {IRequest} from '../classes/IRequest';
import bluebird from 'bluebird';
import * as spy from '../spy';
var util = require('util');


var path = require('path'),
    fs = require('fs');
// debugger
// let baseExchange = new ccxt['hitbtc2'](config._doc.baseExchangeKey);
//  { "apiKey": "7208602ece4275b6f6e8ff6805fe0b3c", "secret": "c15fc8fa6df5a43080b2ea51ff91f79d" }
const ccxt = require ('ccxt')
export class CcxtRouter {
  router: Router


  /**
   * Initialize the ActionRouter
   */
  constructor() {
    this.router = Router();
    this.init();
  }

  

  public getStatus(req: IRequest, res: Response, next: NextFunction) {

    spy.runSpy({exchanges: req.query.exchanges.split(',')}).then(data=>{
      res.json(data);
    });
  }

  public getOrderBook(req: IRequest, res: Response, next: NextFunction) {

    spy.getOrderBook(req.query).then(data=>{
      res.json(data);
    });
  }



  init() {  

    this.router.get('/getorderbook/', this.getOrderBook);
    this.router.get('/getstatus/', this.getStatus);
    

  }

}

// Create the ActionRouter, and export its configured Express.Router
const ccxtRoutes = new CcxtRouter();
ccxtRoutes.init();

export default ccxtRoutes.router;