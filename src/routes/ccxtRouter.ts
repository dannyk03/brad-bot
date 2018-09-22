import {Router, Request, Response, NextFunction} from 'express';
import {IRequest} from '../classes/IRequest';
import bluebird from 'bluebird';
import * as spy from '../spy';
var util = require('util');


var path = require('path'),
    fs = require('fs');

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