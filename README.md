# esbuild-serve-2

Development server for ESBuild with API proxy and livereload.

## Why?

Current esbuild-serve package is outdated and isn't maintained. ESBuild internal serve API is simple, but hasn't features like livereload, API proxy and HTML5 history API fallback

[WARNING] It's NOT a production server, only for development!

## Features

- Static files serving from ESBuild `outdir` option or `dir` serve option.
- Serve index.html from main dir or given `indexPath`, supports HTML5 history API fallback.
- Proxy API requests to prevent CORS errors.
- Live reload opened tabs when (re)build completed.
- Zero dependencies and small size. Server uses `http` module directly without large production HTTP libraries, like "express".

## Installation

```
npm i esbuild-serve-2
```

## Usage

### Basic

```typescript
import path from 'path'
import serve from 'esbuild-serve-2'

serve({
    entryPoints: ["./src/index.tsx"],
    outdir: path.resolve(__dirname, './dist'),
  },{
  port: 3000,
  indexPath: path.resolve(__dirname, './html/index.html'),
});
```

### Custom HTTP server

```typescript
import path from 'path'
import http from 'http'
import serve from 'esbuild-serve-2'

const server = http.createServer()

serve({
    entryPoints: ["./src/index.tsx"],
    outdir: path.resolve(__dirname, './dist'),
  },{
  indexPath: path.resolve(__dirname, './html/index.html'),
});

server.listen(3000)
```

### Proxy API requests

```typescript
import path from 'path'
import serve from 'esbuild-serve-2'

serve({
    entryPoints: ["./src/index.tsx"],
    outdir: path.resolve(__dirname, './dist'),
  },{
  indexPath: path.resolve(__dirname, './html/index.html'),
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