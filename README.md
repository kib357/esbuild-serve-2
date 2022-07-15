# node-dev-server

Front-end application development server with API proxy and live reload, suitable for ESBuild and other bundlers.

[WARNING] It's NOT a production server for static files!

## Features

- Static files serving from passed `dir`.
- Serve index.html from main dir or given `indexPath`, supports HTML5 history API fallback.
- Proxy API requests to prevent CORS errors.
- Live reload opened tabs with `server.livereload.sendReload()`.
- Zero dependencies and small size. Server uses `http` module directly without large production HTTP libraries, like "express".

## Installation

```
npm i node-dev-server
```

## Usage

### Basic

```
const path = require('path')
const DevSever = require('node-dev-server')

DevServer.create({
  dir: path.resolve(__dirname, './dist'),
  port: 3000,
  indexPath: path.resolve(__dirname, './http/dev.html'),
});
```

### Custom HTTP server

```
const http = require('http')
const path = require('path')
const DevSever = require('node-dev-server')

const server = http.createServer()

DevServer.create({
  server,
  dir: path.resolve(__dirname, './dist')
});

server.listen(3000)
```

### Proxy API requests

```
const path = require('path')
const DevSever = require('node-dev-server')

DevServer.create({
  dir: path.resolve(__dirname, './dist'),
  proxy: [{ filter: /^\/api/, host: "localhost", port: 4000 }],
});
```

## Options

### Server Options
```
type ServerOptions = {
  dir: string; // Build output directory to serve files from
  indexPath?: string; // Custom path to index HTML file
  port?: number // Dev server port. Default: 3000
  proxy?: ProxyOptions[]; // Array of proxy configurations, see ProxyOptions below
  server?: http.Server; // Custom HTTP server
  verbose?: boolean; // Print request logs. Default: true
};
```

### Proxy Options
```
type ProxyOptions = {
  filter: RegExp; // Requests pathname should match this filter
  host: string; // Destination server host
  port: number; // Destination server port
  https?: boolean; // Use HTTPs. Default: false
};
```