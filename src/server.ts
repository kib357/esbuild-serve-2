import { readFileSync } from "fs";
import fs from "fs/promises";
import http from "http";
import https from "https";
import path from "path";
import url from "url";
import { getMimeType } from "./MimeTypes";
import LiveReloadServer from "./livereload/server";

namespace DevServer {
  export type ProxyOptions = {
    filter: RegExp | { (req: http.IncomingMessage): boolean };
    host: string;
    https?: boolean;
    port?: number;
  };

  export type ServerOptions = {
    dir: string;
    indexPath?: string;
    port?: number;
    proxy?: ProxyOptions[];
    server?: http.Server;
    verbose?: boolean;
  };
}

type InternalServerOptions = {
  dir: string;
  indexContent: string;
  port: number;
  proxy: DevServer.ProxyOptions[];
  server?: http.Server;
  verbose: boolean;
};

type ProxyRequest = {
  name: "PROXY";
  proxy: DevServer.ProxyOptions;
};

type FileRequest = {
  name: "FILE";
};

type IndexRequest = {
  name: "HTML";
};

type LivereloadScriptRequest = {
  name: "LIVERELOAD SCRIPT";
};

type RequestType =
  | ProxyRequest
  | FileRequest
  | IndexRequest
  | LivereloadScriptRequest;

class DevServer {
  server: http.Server;
  livereload: LiveReloadServer;

  private constructor(private options: InternalServerOptions) {
    this.server = options.server || http.createServer();
    this.livereload = new LiveReloadServer(this.server);

    this.server.on("request", (req, res) => {
      const pathname = this.getPathname(req.url);
      const requestType = this.getRequestType(req, pathname);
      this.info(`${color(requestType)} ${req.method} ${req.url}`);

      switch (requestType.name) {
        case "LIVERELOAD SCRIPT":
          return this.sendLiveReload(res);
        case "FILE":
          return this.sendResource(pathname, res);
        case "HTML":
          return this.sendIndex(res);
        case "PROXY":
          return this.proxyReq(requestType.proxy, req, res);
      }
    });

    if (!options.server) {
      this.start();
    }
  }

  private getRequestType(
    req: http.IncomingMessage,
    pathname: string
  ): RequestType {
    if (pathname === "/livereload.js") return { name: "LIVERELOAD SCRIPT" };

    const proxy = this.options.proxy.find(({ filter }) =>
      typeof filter === "function" ? filter(req) : filter.test(pathname)
    );
    if (proxy) return { name: "PROXY", proxy };

    if (path.extname(pathname)) return { name: "FILE" };

    return { name: "HTML" };
  }

  static create(options: DevServer.ServerOptions) {
    const indexPath = options.indexPath || path.join(options.dir, "index.html");
    let indexContent: string;
    try {
      indexContent = readFileSync(indexPath, "utf-8");
    } catch (error) {
      throw new Error(`Index HTML file not found in "${indexPath}"`);
    }
    const verbose = options.verbose ?? true;
    const port = options.port ?? 3000;
    const proxy = options.proxy ?? [];

    proxy.forEach((p) => {
      if (!p.host)
        throw new Error(
          `Please provide host for proxy option with filter "${p.filter}"`
        );
    });

    return new DevServer({ ...options, indexContent, proxy, port, verbose });
  }

  start() {
    const { port } = this.options;
    this.server.listen(port);
    this.info(`Development server listening at http://localhost:${port}`);
  }

  stop() {
    return new Promise<void>((resolve, reject) => {
      this.server?.close((error) => {
        if (error) return reject(error);
        resolve();
      });
    });
  }

  private sendLiveReload(res: http.ServerResponse) {
    const scriptPath = path.resolve(__dirname, "./livereload/client.js");
    return this.sendFile(scriptPath, res);
  }

  private proxyReq(
    proxy: DevServer.ProxyOptions,
    req: http.IncomingMessage,
    res: http.ServerResponse
  ) {
    const reqOptions: http.RequestOptions = {
      hostname: proxy.host,
      port: proxy.port,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        referer: `http${proxy.https ? "s" : ""}://${proxy.host}`,
        host: proxy.host,
      },
    };

    const forwardedReq = (proxy.https ? https : http)
      .request(reqOptions, (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 500, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      })
      .on("error", (error) => {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end(error.message);
      });

    req.pipe(forwardedReq, { end: true });
  }

  private async sendResource(resource: string, res: http.ServerResponse) {
    const filePath = path.join(this.options.dir ?? "", resource);
    try {
      await this.sendFile(filePath, res);
    } catch (error) {
      this.sendNotFound(res, resource, filePath);
    }
  }

  private async sendFile(filePath: string, res: http.ServerResponse) {
    const content = await fs.readFile(filePath);
    res.setHeader("content-type", getMimeType(filePath));
    res.end(content);
  }

  private sendIndex(res: http.ServerResponse) {
    res.setHeader("content-type", getMimeType("index.html"));
    const content = this.options.indexContent.replace(
      "</body>",
      '<script async src="/livereload.js"></script></body>'
    );
    res.end(content);
  }

  private sendNotFound(
    res: http.ServerResponse,
    resource: string,
    filePath: string
  ) {
    res.statusCode = 404;
    res.end(`Resource "${resource}" not found in "${filePath}"`);
  }

  private getPathname(requestUrl: string | undefined): string {
    if (!requestUrl) return "";

    const parsedUrl = url.parse(requestUrl);
    return parsedUrl.pathname ?? "";
  }

  private info(message: string) {
    this.options.verbose && console.log(message);
  }
}

export = DevServer;

const green = (input: string) => `\u001b[32m${input}\u001b[0m`;
const gray = (input: string) => `\u001b[30;1m${input}\u001b[0m`;
const color = (requestType: RequestType) => {
  if (requestType.name === "FILE") return gray(requestType.name);
  if (requestType.name === "PROXY") return green(requestType.name);
  return requestType.name;
};
