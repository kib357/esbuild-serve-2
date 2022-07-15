import http from "http";
import { createHash } from "crypto";
import { Duplex } from "stream";

const rfc6455KeyGuid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

export default class LiveReloadServer {
  private sockets: Duplex[] = [];

  constructor(private server: http.Server) {
    this.server.on("upgrade", (req, socket, head) => {
      if (req.url !== "/livereload") return socket.write("UNSUPPORTED URL\r\n");

      const key = req.headers["sec-websocket-key"];
      const digest = createHash("sha1")
        .update(key + rfc6455KeyGuid)
        .digest("base64");

      const headers = [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${digest}`,
      ];

      socket.write(headers.concat("\r\n").join("\r\n"));

      this.addSocket(socket);
    });
  }

  sendRebuildStarted() {
    this.send("rebuild_started");
  }

  sendReload() {
    this.send("reload");
  }

  private addSocket(socket: Duplex) {
    this.sockets.push(socket);
    console.log("Websocket client connected");
    socket.on("close", () => {
      this.removeSocket(socket);
    });
    socket.on("end", () => {
      this.removeSocket(socket);
    });
    socket.on("error", () => {
      this.removeSocket(socket);
    });
  }

  private removeSocket(socket: Duplex) {
    if (this.sockets.every((s) => s !== socket)) return;

    console.log("Websocket client disconnected");
    this.sockets = this.sockets.filter((s) => s !== socket);
  }

  private send(message: string) {
    const frame = this.encodeTextFrame(message);
    for (const socket of this.sockets) {
      socket.write(frame);
    }
  }

  private encodeTextFrame(message: string) {
    const length = Buffer.byteLength(message, "utf8");
    const buf = Buffer.alloc(2 + length);
    buf.set([0x81, length]);
    buf.write(message, 2, "utf-8");
    return buf;
  }
}
