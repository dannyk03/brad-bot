var dotenv = require('dotenv').load();
import * as path from 'path';

var mongoose     = require('mongoose');
import * as _ from 'lodash';
var rp = require('request-promise');
var moment = require('moment');
var BigNumber = require('bignumber.js');
let wait = ms => new Promise(resolve => setTimeout(resolve, ms))


const db = require(process.cwd() + `/dist/mongo`);
db.connect(()=>{});

const ccxt = require ('ccxt')
const log = require('node-file-logger');


var exchange = null;

var botConfig = null;
var startTime = moment().unix();
var rate = {};
var mainModel = null;
var statusObj = null;
var takerFee = 0.1;




var enableDBTickerLog = true;

var baseTicker = null;
var targetTicker = null;
var targetOrderBook = null;
var baseOrderBook = null;
var baseBalance = null;
var targetBalance = null;
var interval = null;

var BalanceModel = null;

var lastBalanceRecord;
var isRebalacing = false;
var onmessage = function (ev) {
	if (ev.data.command == 'update') {
		// No update command, just restart it
		// log.Info(`BOT Update command received`);
		// botConfig = ev.data.config;
	} else if (ev.data.command == 'start') {
		botConfig = ev.data.config;
		var options = {
			folderPath: `./logs/`,
			timeZone: 'Europe/London',
			// folderPath: path.join(__dirname, '../public/logs/'),
			// dateBasedFileNaming: true,
			// // Required only if dateBasedFileNaming is set to false
			// fileName: 'All_Logs',   
			// // Required only if dateBasedFileNaming is set to true
			fileNamePrefix: botConfig._id+'_',
			fileNameSuffix: '',
			fileNameExtension: '.log',     

			dateFormat: 'YYYY-MM-DD',
			timeFormat: 'HH:mm:ss.SSS',
			logLevel: 'debug',
			onlyFileLogging: false
		}
		log.SetUserOptions(options);
		log.Info(`BOT Start command received`);
		start(ev.data.config);
		
	} else if (ev.data.command == 'teminate') {
		log.Info(`BOT Terminating`);
	}
};
// var debugging = process.env.DEBUGGING;
var debugging =  true;
// onmessage({
// 	data: {
// 		command: 'start',
// 		config: {
// 	      _id: 'main',
// 	      exchange: 'bittrex', //Exchange name from https://github.com/ccxt/ccxt
// 	      tradePercent: 50, //Trade 40 % of balance everytime when there's opportunity

// 	      search1: ['BTC'],
// 	      search2: ['ETH'],
// 	      search3: ['XLM'],
// 	      // search3: ['XRP', 'TRX', 'XLM', 'ADA', 'XVG', 'DTA', 'LTC', 'POWR', 'DGB', 'MONA', 'DOGE', 'CRW', 'BCH', 'RDD', 'XEM', 'NEO', 'SC', 'POLY', 'NEO', 'DASH'],

// 	      priceType: 'best', // best:just ask price or weigh: weighed price we talked before
// 	      minimalVolumeAmount: 1, //1 BTC (coin in search1)
// 	      minimalProfitPercent: 1, //1 % profit
// 	      fee: 0.0025, //Fee on taker
// 	      exchangeKey: {
// 	        apiKey: 'f930780a07654e0a9e945b8c428ee0e2',
// 	        secret: '0c5bad9d0ef34d968387620f4b39819f'
// 	      },

// 	      enableBot: true, // IF you enable this bot or not should be always true unless you are not going to run it at all.
// 	      enableOrder: true, // True if you would like to make actual orders.
	      
// 	    }
// 	}	
// })



async function start(config){

	log.Info(`BOT Bot Started BOT`);
	try {
		exchange = new ccxt[botConfig.exchange]({
			...botConfig.exchangeKey,
			nonce: function () { return this.seconds () },
			enableRateLimit: true,
			rateLimit: 1000,
			timeout: 20000,
		});
		let hitbtc = new ccxt['hitbtc2']();
		BalanceModel = (mongoose.models && mongoose.models['balance_'+botConfig._id]
					  ? mongoose.models['balance_'+botConfig._id]
					  : mongoose.model('balance_'+botConfig._id, new mongoose.Schema({}, { strict: false })))

		mainModel = (mongoose.models && mongoose.models['main']
					  ? mongoose.models['main']
					  : mongoose.model('main', new mongoose.Schema({}, { strict: false })))

		let items = await mainModel.find({type: 'status'}).exec();

		if (items.length  == 1) {
			statusObj = items[0];
		} else {
			statusObj = new mainModel({type: 'status', status: {empty: ''}});
			await statusObj.save();
		}

		await exchange.loadMarkets();

		log.Info(`BOT BOT IS STARTING`);
		startTime = moment().unix();



		log.Info(`BOT BOT RUNNING`);

		// let hitbtcTickers = hitbtc.fetchTickers();

		while(1) {
			try {
				let sym1, sym2, sym3;
				for (let i = 0; i < botConfig.search1.length; i ++) {
					sym1 = botConfig.search1[i];

		            // // Calculate XXX/USDT price
		            // for (let key in hitbtcTickers) {
		            //   if (key.split('/')[1] == sym1) {
		            //     rate[key.split('/')[0]] = conversions[key].last;
		            //   } 
		            // }
		            rate[sym1] = 1;

					for (let j = 0; j < botConfig.search2.length; j ++) {
						sym2 = botConfig.search2[j];
						for (let k = 0; k < botConfig.search3.length; k ++) {
							sym3 = botConfig.search3[k];
							//find chance
							let result = await findChance(sym1, sym2, sym3);
							
							if (!result.success) {
								log.Info(result.data.message);
								await wait(1000);
								continue;
							}

							if (!botConfig.enableOrder)
								continue;
							let data = result.data;
							log.Info(JSON.stringify(data));

							// statusObj.save({...statusObj, status: {...statusObj.status, [`${data.sym1}-${data.sym2}-${data.sym3}`]: data}});

							
							let order = await exchange.createLimitBuyOrder(data.mar1.name, (data.volumeMin - data.volumeMin * botConfig.fee) / data['P1'], data['P1']);
							log.Info(JSON.stringify(order));

							await wait(1000);
							while (1) {
								let orders = await exchange.fetchOpenOrders(data.mar1.name);
								if (orders.length == 0) {
									break;
								}
								await wait(1000);
							}
							let balance = await exchange.fetchBalance();
							log.Info(`${JSON.stringify(balance[sym1])} ${JSON.stringify(balance[sym2])} ${JSON.stringify(balance[sym3])}`);


							// order = await exchange.createLimitBuyOrder(data.mar2.name, (balance[data.sym2].free - balance[data.sym2].free*botConfig.fee) / data['P2']);

							order = await exchange.createLimitBuyOrder(data.mar2.name, (balance[data.sym2].free - balance[data.sym2].free*botConfig.fee) / data['P2'], data['P2']);
							log.Info(JSON.stringify(order));

							await wait(1000);
							while (1) {
								let orders = await exchange.fetchOpenOrders(data.mar2.name);
								if (orders.length == 0) {
									break;
								}
								await wait(1000);
							}
							balance = await exchange.fetchBalance();
							log.Info(`${JSON.stringify(balance[sym1])} ${JSON.stringify(balance[sym2])} ${JSON.stringify(balance[sym3])}`);

							order = await exchange.createLimitSellOrder(data.mar3.name, balance[data.sym3].free, data['P3']);
							log.Info(JSON.stringify(order));
							await wait(1000);
							while (1) {
								let orders = await exchange.fetchOpenOrders(data.mar3.name);
								if (orders.length == 0) {
									break;
								}
								await wait(1000);
							}
							balance = await exchange.fetchBalance();
							log.Info(`${JSON.stringify(balance[sym1])} ${JSON.stringify(balance[sym2])} ${JSON.stringify(balance[sym3])}`);

						}
					}
				}
		
			
			} catch (err) {
				log.Info(`Error ${JSON.stringify(err)}, ${err.message}`);
			}
		};



	} catch(err) {
		debugging && console.log(err);
		debugging && console.log(JSON.stringify(err));
		log.Error('start', JSON.stringify(err.stack));
	}
};

async function findChance(sym1, sym2, sym3) {
	try {
	let data = {};
	let mar1 = {name: `${sym2}/${sym1}`, side: 'buy'};
	let mar2 = {name: `${sym3}/${sym2}`, side: 'buy'};
	let mar3 = {name: `${sym3}/${sym1}`, side: 'sell'};
	data.mar1 = mar1;
	data.mar2 = mar2;
	data.mar3 = mar3;

	data.sym1 = sym1;
	data.sym2 = sym2;
	data.sym3 = sym3;
	if (sym1 == sym2 || sym1 == sym3 || sym2 == sym3) {
		let msg = `${sym1} ${sym2} ${sym3} same one is there.`;
		return { success: 0, data: {message: msg} }; 
	}
	if (!exchange.markets[mar1.name] || 
		(exchange.markets[mar1.name] && !exchange.markets[mar1.name].active) ||
		!exchange.markets[mar2.name] || 
		(exchange.markets[mar2.name] && !exchange.markets[mar2.name].active) ||
		!exchange.markets[mar3.name] || 
		(exchange.markets[mar3.name] && !exchange.markets[mar3.name].active)) {

		let msg = `${mar1.name} ${mar2.name} ${mar3.name} is not supported .`;
		return { success: 0, data: {message: msg} }; 
	}
	let tickers = await Promise.all([exchange.fetchTicker(mar1.name), exchange.fetchTicker(mar2.name), exchange.fetchTicker(mar3.name)]);
	
	rate[sym2] = tickers[0].last;
	rate[sym3] = tickers[2].last;

	data[`V${mar1.name}`] = tickers[0].baseVolume;
	data[`V${mar2.name}`] = rate[sym2] * tickers[1].baseVolume;
	data[`V${mar3.name}`] = tickers[2].baseVolume;
	if (data[`V${mar1.name}`] < botConfig.minimalVolumeAmount ||
		data[`V${mar2.name}`] < botConfig.minimalVolumeAmount ||
		data[`V${mar3.name}`] < botConfig.minimalVolumeAmount ) {
		let msg = `${JSON.stringify(data)} Volume is not enough.`;
		return { success: 0, data: {...data, message: msg} };
	}

	let orderBooks = await Promise.all([exchange.fetchOrderBook(mar1.name), exchange.fetchOrderBook(mar2.name), exchange.fetchOrderBook(mar3.name), exchange.fetchBalance()]);

	let balance = orderBooks[3];
	data[`B${sym1}`] = balance[sym1];
	data[`B${sym2}`] = balance[sym2];
	data[`B${sym3}`] = balance[sym3];





	let sum = 0;
	let total = 0;
	let i;
	let volumeMin = botConfig.tradePercent*data[`B${sym1}`].free/100;
	if (volumeMin == 0) {
		return { success: 0, data: {...data, message: `${sym1} ${sym2} ${sym3} No Balance`} };	
	}
	data.volumeMin = volumeMin;

	data[`P1H`] = tickers[0].high;
	data[`P1L`] = tickers[0].low;
	data[`P2H`] = tickers[1].high;
	data[`P2L`] = tickers[1].low;
	data[`P3H`] = tickers[2].high;
	data[`P3L`] = tickers[2].low;

	if (botConfig.priceType == 'best') {
		data[`P1`] = orderBooks[0].asks[0][0];
		data[`P2`] = orderBooks[1].asks[0][0];
		data[`P3`] = orderBooks[2].bids[0][0];
	} else if (botConfig.priceType == 'weigh') {

		let crate = rate[sym1];
		let orderBook = orderBooks[0];

		for(i = 0; i < orderBook.asks.length; i ++) {
			sum += orderBook.asks[i][1];
			total += orderBook.asks[i][1]*orderBook.asks[i][0];
			if (total > volumeMin/crate)
				break;
		}
		data[`P1`] = total/sum;
		if (sum == 0) {
			let msg = `${mar1} Orderbook empty`;
			return { success: 0, data: {...data, message: msg} };	
		}
		
		sum = 0;
		total = 0;
		crate = rate[sym2];
		orderBook = orderBooks[1];

		for(i = 0; i < orderBook.asks.length; i ++) {
			sum += orderBook.asks[i][1];
			total += orderBook.asks[i][1]*orderBook.asks[i][0];
			if (total > volumeMin/crate)
				break;
		}
		data[`P2`] = total/sum;
		
		if (sum == 0) {
			let msg = `${mar2} Orderbook empty`;
			return { success: 0, data: {...data, message: msg} };	
		}


		sum = 0;
		total = 0;
		crate = rate[sym1];
		orderBook = orderBooks[2];

		for(i = 0; i < orderBook.bids.length; i ++) {
			sum += orderBook.bids[i][1];
			total += orderBook.bids[i][1]*orderBook.bids[i][0];
			if (total > volumeMin/crate)
				break;
		}
		data[`P3`] = total/sum;
		if (sum == 0) {
			let msg = `${mar3} Orderbook empty`;
			return { success: 0, data: {...data, message: msg} };	
		}



	} else {
		return {};
	}

	if (data[`P1`] > data[`P1H`] || data[`P1`] < data[`P1L`]) {
		let msg = `${sym1} ${sym2} ${sym3} Price1 HL not matching P:${data[`P1`]} H: ${tickers[0].high} L: ${tickers[0].low}`;

		return { success: 0, data: {...data, message: msg} };
	}
	if (data[`P2`] > data[`P2H`] || data[`P2`] < data[`P2L`]) {
		let msg = `${sym1} ${sym2} ${sym3} Price2 HL not matching P:${data[`P2`]} H: ${tickers[1].high} L: ${tickers[1].low}`;

		return { success: 0, data: {...data, message: msg} };
	}
	if (data[`P3`] > data[`P3H`] || data[`P3`] < data[`P3L`]) {
		let msg = `${sym1} ${sym2} ${sym3} Price3 HL not matching P:${data[`P3`]} H: ${tickers[2].high} L: ${tickers[2].low}`;

		return { success: 0, data: {...data, message: msg} };
	}

	let step1 = (volumeMin - volumeMin * botConfig.fee) / data[`P1`];
	let step2 = (step1 - step1 * botConfig.fee) / data[`P2`];
	let step3 = step2  * data[`P3`];
	let profitability = (step3 - volumeMin - step3 * botConfig.fee) / volumeMin * 100;
	data.profit = profitability;

	if (profitability < botConfig.minimalProfitPercent) {

		let msg = `${sym1} ${sym2} ${sym3} ${profitability} is lower than ${botConfig.minimalProfitPercent}`;

		return { success: 0, data: {...data, message: msg} };	
	}
	log.Info(`${sym1} ${sym2} ${sym3} ${profitability} SUCCESS`);

	return { success: 1, data: {...data, message: 'SUCCESS'} };	

	}catch(err) {
		console.log(err);
		log.Info(JSON.stringify(err));
		return {success: 0, data: {msg: JSON.stringify(err)}};
	}
}



function fetchTickers() {
	if (exchange.has['fetchTickers'] ) {
		if (['yobit', 'liqui', 'tidex'].indexOf(exchange.id) != -1) {
			let promises = [];
			let sys = Object.keys(exchange.markets);
			for (let i = 0; i < sys.length; i += 100)
				promises.push(exchange.fetchTickers(sys.splice(i, Math.min(100, sys.length - i * 100))));

			return Promise.all(promises).then(res=>res.reduce((r1,r2)=>r1.concat(r2), []));
		}
		else {
			return exchange.fetchTickers();
		}
	} else {
		return Promise.resolve([]);
	}
}

