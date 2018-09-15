
var dotenv = require('dotenv').load();
import * as http from 'http';
import * as debug from 'debug';


var db      = require('./mongo');

import App from './App';
// db.connect(() => {


  var fs = require('fs');

  var https = require('https');
  let server:any = null;
  const port = normalizePort(process.env.PORT || 3000);
  if(process.env.NODE_ENV == 'development') {
    App.set('port', port);
    
    server = App.listen(port, function () {
      console.log('Listening on port '+ port)
    })

  } else if(process.env.NODE_ENV == 'production') {

    var privateKey  = fs.readFileSync('./cert/host.key', 'utf8');
    var certificate = fs.readFileSync('./cert/host.cert', 'utf8');
    var credentials = { key: privateKey, cert: certificate };

    server = https.createServer(credentials, App);
    server.listen(port);
    server.on('error', onError);
    server.on('listening', onListening); 
  }

  function normalizePort(val: number|string): number|string|boolean {
    let port: number = (typeof val === 'string') ? parseInt(val, 10) : val;
    if (isNaN(port)) return val;
    else if (port >= 0) return port;
    else return false;
  }

  function onError(error: NodeJS.ErrnoException): void {
    if (error.syscall !== 'listen') throw error;
    let bind = (typeof port === 'string') ? 'Pipe ' + port : 'Port ' + port;
    switch(error.code) {
      case 'EACCES':
        console.log('Listening on port '+ port)
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.log('Listening on port '+ port)
        process.exit(1);
        break;
      default:
        throw error;
    }
  }

  function onListening(): void {
    let addr = server.address();
    let bind = (typeof addr === 'string') ? `pipe ${addr}` : `port ${addr.port}`;
    debug(`Listening on ${bind}`);
  }



// });

