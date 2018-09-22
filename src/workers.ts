let workers = [];
var Worker = require("tiny-worker");

export function initWorkers(configs) {
	workers = configs.map(config=>{
		return {config: config, worker: new Worker("./dist/bot.js")};
	});
}

export function startWorkers() {
	workers.map(worker=>{
		if (worker.config.enableBot) {
			worker.worker.postMessage({command: 'start', config:worker.config});
			worker.onmessage = function (ev) {
			    if (ev.data.command == 'exit') {

			    }
			}
			worker.onerror = function (ev) {
			    worker.terminate();
			}
		}
	});
}

export function updateWorker(_id, data) {
	
	workers = workers.map(worker=>{
		if (worker.config._id == _id) {
			worker.worker.terminate();
			if (worker.config.enableBot) {
				worker.worker.postMessage({command: 'start', config:data});
			}
			return {config: data, worker: worker.worker};
		} else {
			return worker;
		}
	});
}


export function termiateWorker(_id) {
	workers.map(worker=>{
		if (worker.config._id == _id) {
			worker.worker.terminate();
		}
	});
}


export function createWorker(data) {
	let w = {config: data, worker: new Worker("./dist/bot.js")};

	w.onmessage = function (ev) {
	    if (ev.data.command == 'exit') {

	    }
	}
	w.onerror = function (ev) {
	    w.terminate();
	}
			
	if (w.config.enableBot) {
		w.worker.postMessage({command: 'start', config: data});
	}
	workers.push(w);
		
}


export function termiateAll(data) {
	workers.map(worker=>{
		worker.worker.terminate();
	});
}

