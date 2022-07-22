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

type Callback = { (): void };
type EsbuildPluginBuild = {
  onEnd: (cb: Callback) => void;
  onStart: (cb: Callback) => void;
};

class DevServer {
  server: http.Server;
  livereload: LiveReloadServer;

  private constructor(private options: InternalServerOptions) {
    this.server = options.server || http.createServer();
    this.livereload = new LiveReloadServer(this.server);

    this.server.on("request", (req, res) => {
      this.info(`${req.method} ${req.url}`);

      const pathname = this.getPathname(req.url);

      if (pathname === "/livereload.js") return this.sendLiveReload(res);

      for (const p of options.proxy ?? []) {
        const useProxy =
          typeof p.filter === "function"
            ? p.filter(req)
            : p.filter.test(pathname);
        if (useProxy) return this.proxyReq(p, req, res);
      }

      const ext = path.extname(pathname);
      if (ext) return this.sendResource(pathname, res);

      this.sendIndex(res);
    });

    if (!options.server) {
      this.start();
    }
  }

  static create(options: DevServer.ServerOptions) {
    const indexPath = options.indexPath || path.join(options.dir, "index.html");
    let indexContent: string;
    try {
      indexContent = readFileSync(indexPath, "utf-8");
    } catch (error) {
      throw new Error(`Index HTML file not found in "${indexPath}"`);
    }
    const proxy = options.proxy ?? [];
    const port = options.port ?? 3000;
    const verbose = options.verbose ?? true;

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

  getEsbuildPlugin() {
    const setup = (build: EsbuildPluginBuild) => {
      build.onEnd(() => {
        this.livereload.sendReload();
      });
      build.onStart(() => {
        this.livereload.sendRebuildStarted();
      });
    };
    return { name: "dev-server", setup };
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
    const content = await readFile(filePath);
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

async function readFile(filePath: string) {
  return fs.readFile(filePath, "utf-8");
}
