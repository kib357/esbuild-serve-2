import fs from "fs/promises";
import http from "http";
import https from "https";
import path from "path";
import url from "url";
import { getMimeType } from "./MimeTypes";

type ProxyOptions = {
  filter: RegExp;
  host: string;
  port: number;
  https?: boolean;
};

export type DevServerOptions = {
  dir: string;
  indexPath?: string;
  proxy?: ProxyOptions[];
  server?: http.Server;
  verbose?: boolean;
};

type DevServerPrivateOptions = {
  dir: string;
  indexContent: string;
  proxy: ProxyOptions[];
  server?: http.Server;
  verbose: boolean;
};

export default class DevServer {
  server: http.Server;

  private constructor(private options: DevServerPrivateOptions) {
    this.server = options.server || http.createServer();

    this.server.on("request", (req, res) => {
      this.info(`${req.method} ${req.url}`);

      const pathname = this.getPathname(req.url);

      if (pathname === "/livereload.js") return this.sendLiveReload(res);

      for (const p of options.proxy ?? []) {
        if (p.filter.test(pathname)) return this.proxyReq(p, req, res);
      }

      const ext = path.extname(pathname);
      if (ext) return this.sendResource(pathname, res);

      this.sendIndex(res);
    });

    if (!options.server) {
      this.start();
    }
  }

  static async create(options: DevServerOptions) {
    const indexPath = options.indexPath || path.join(options.dir, "index.html");
    let indexContent: string;
    try {
      indexContent = await readFile(indexPath);
    } catch (error) {
      throw new Error(`Index HTML file not found in "${indexPath}"`);
    }
    const proxy = options.proxy ?? [];
    const verbose = options.verbose ?? true;

    return new DevServer({ ...options, indexContent, proxy, verbose });
  }

  start(port = 3000) {
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
    const scriptPath = path.resolve(__dirname, "./livereload.js");
    return this.sendFile(scriptPath, res);
  }

  private proxyReq(
    proxy: ProxyOptions,
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

async function readFile(filePath: string) {
  return fs.readFile(filePath, "utf-8");
}

// async function fileExists(filePath: string) {
//   try {
//     const stat = await fs.stat(filePath);
//     if (!stat.isFile()) return false;
//   } catch (error) {
//     return false;
//   }
//   return true;
// }
