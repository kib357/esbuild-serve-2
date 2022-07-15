# spa-dev-server

Front-end application development server with API proxy and live reload, suitable for ESBuild and other bundlers.

[WARNING] It's NOT a production server for static files!

## Features

- Static files serving from passed `dir`.
- Serve index.html from main dir or given `indexPath`, supports HTML5 history API fallback.
- Proxy API requests to prevent CORS errors.
- Live reload opened tabs with `server.livereload.sendReload()`.
- ESBuild plugin
- Zero dependencies and small size. Server uses `http` module directly without large production HTTP libraries, like "express".

## Installation

```
npm i spa-dev-server
```

## Usage

### Basic

```typescript
const path = require('path')
const DevSever = require('spa-dev-server')

DevServer.create({
  dir: path.resolve(__dirname, './dist'),
  port: 3000,
  indexPath: path.resolve(__dirname, './http/dev.html'),
});
```

### Custom HTTP server

```typescript
const http = require('http')
const path = require('path')
const DevSever = require('spa-dev-server')

const server = http.createServer()

DevServer.create({
  server,
  dir: path.resolve(__dirname, './dist')
});

server.listen(3000)
```

### Proxy API requests

```typescript
const path = require('path')
const DevSever = require('spa-dev-server')

DevServer.create({
  dir: path.resolve(__dirname, './dist'),
  proxy: [
    { filter: /^\/api/, host: "localhost", port: 4000 },
    {
      filter: (req) => req.headers["content-type"] === "application/json",
      host: "localhost",
      port: 8080,
    },
  ],
});
```

### ESBuild

```typescript
import path from "path";
import DevServer from "spa-dev-server";
import esbuild from "esbuild";

const start = async () => {
  const dir = path.resolve(__dirname, "./dist")
  const server = await DevServer.create({ dir });

  esbuild.build({
    bundle: true,
    entryPoints: ["./src/index.tsx"],
    outdir: dir,
    plugins: [server.getEsbuildPlugin()],
    watch: true,
  });
};

start();
```

## Options

### Server Options
```typescript
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
```typescript
type ProxyOptions = {
  filter: RegExp | { (req: http.IncomingMessage): boolean }; // Requests should match this filter
  host: string; // Destination server host
  https?: boolean; // Use https. Default: false
  port?: number; // Destination server port
};
```