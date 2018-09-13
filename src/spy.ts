var dotenv = require('dotenv').load();

const ccxt = require ('ccxt')
const moment = require('moment');


var exchanges = [];
let rate = {};

// Get all list of exchanges that has a certain coinpair
export function runSpy(spyConfig) {

	let watchingPairs = [];
	let symbols = [];
	let tickers = [];
	exchanges = spyConfig.exchanges.map(exchange=>{
		return new ccxt[exchange]();
	});

	return Promise.all(exchanges.map(exchange=>{
		return exchange.loadMarkets();
	})).then(result=>{
		
		symbols = [];
		exchanges.map(ex=>{
			let markets = Object.keys(ex.markets);
			let exMarkets = [];
			markets.map(m=>{
				if (symbols.indexOf(m) == -1) {
					symbols.push(m);
					exMarkets.push(m);
				}
			});
		});
		///Get all watching pairs
		symbols.map(symbol=>{
			let exs = [];
			exchanges.map(ex=>{

				let markets = Object.keys(ex.markets);
				if (markets.indexOf(symbol) != -1) {
					exs.push(ex.id);
				}
			});
			if (exs.length >= 2) {
				watchingPairs.push({symbol: symbol, exchanges: exs});
			}
		});

		symbols = watchingPairs.map(w=>w.symbol);
		//Get Ticker data
		return Promise.all(exchanges.map((exchange,index)=>{
			let sys = Object.keys(exchange.markets).filter(m=>symbols.indexOf(m)!=-1);
			if (exchange.has['fetchTickers'] ) {

				if (['yobit', 'liqui'].indexOf(exchange.id) != -1) {
					let promises = [];
					for (let i = 0; i < sys.length; i += 100)
						promises.push(exchange.fetchTickers(sys.splice(i, Math.min(100, sys.length - i * 100))));

					return Promise.all(promises).then(res=>res.reduce((r1,r2)=>r1.concat(r2), []));
				}
				else {
					return exchange.fetchTickers();
				}
			} else {
				return Promise.all(sys.map(m=>exchange.fetchTicker(m)));
			}
		})).then(tickersServer => {
			tickers = tickersServer;
			//Get prices form hitbtc
			let hitbtc = new ccxt['hitbtc2']();
			return hitbtc.fetchTickers();

		}).then(hitbtc=>{

            let conversions = hitbtc;
            rate = {};
            // Calculate XXX/USDT price
            for (let key in conversions) {
              if (key.split('/')[1] == 'USDT') {
                rate[key.split('/')[0]] = conversions[key].last;
              } 
            }
            //All Ticker data, watchingPairs: coin + markets, 
			return {tickers, symbols, watchingPairs, hitbtc};
		});
	});
}

export function getOrderBook(config) {

	let exs = config.exchanges.split(',');

	let cExchanges = exchanges.filter(ex=>{
		return (exs.indexOf(ex.id) != -1);
	});
	// Exchange pair
	return Promise.all(cExchanges.map((exchange,index)=>{
		return exchange.fetchOrderBook(config.symbol);
	})).then(orderBooks => {
		let i;
		let volumeMin = parseFloat(config.volumeMin);
		if (config.symbol == 'EFL/BTC')
			debugger
		let crate = rate[config.symbol.split('/')[1]] ? rate[config.symbol.split('/')[1]] : 0;
		if (config.symbol.split('/')[1] == 'USDT')
			crate = 1;
		if (!crate) {
			console.log('Non supported', config.symbol);
			return {success: 0};
		}
		let prices:any = {};
		//Calculate ask and bid price from orderbook of each market of each exchange
		
		orderBooks.map((orderBook,index)=>{
			let res:any = {};
			let sum = 0;
			let total = 0;

			for(i = 0; i < orderBook.bids.length; i ++) {
				sum += orderBook.bids[i][1];
				total += orderBook.bids[i][1]*orderBook.bids[i][0];
				if (total > volumeMin/crate)
					break;
			}
			res.bid = total/sum;
			res.bidUSD = res.bid*crate;

			sum = 0;
			total = 0;
			for(i = 0; i < orderBook.asks.length; i ++) {
				sum += orderBook.asks[i][1];
				total += orderBook.asks[i][1]*orderBook.asks[i][0];
				if (total > volumeMin/crate)
					break;
			}
			res.ask = total/sum;
			res.askUSD = res.ask*crate;
			prices[cExchanges[index].id] = res;
			
		})

		return {
			success: 1,
			symbol: config.symbol,
			prices: prices,
			exchanges: exs
		}
	}).catch(err=>{
		return {success: 0};
	});
}