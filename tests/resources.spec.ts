import { test, expect } from "@playwright/test";
import path from "path";
import http from "http";
import url from "url";
import DevServer, { DevServerOptions } from "../src/index";

const contentDir = path.resolve(__dirname, "../content");

let server: DevServer | undefined;
const createServer = async (
  options: DevServerOptions = { dir: contentDir }
) => {
  server = await DevServer.create({ verbose: false, ...options });
};

test.beforeEach(() => {
  server = undefined;
});

test.afterEach(async () => {
  server && (await server.stop());
});

test("returns index file from dir root", async ({ request }) => {
  await createServer();
  const indexReq = await request.get(`/`);

  expect(indexReq.ok()).toBeTruthy();
  expect(await indexReq.text()).toContain("index.html");
});

test("returns index file given history API path", async ({ request }) => {
  await createServer();
  const indexReq = await request.get(`/a`);

  expect(indexReq.ok()).toBeTruthy();
  expect(await indexReq.text()).toContain("index.html");
});

test("injects livereload script in index file", async ({ request }) => {
  await createServer();
  const indexReq = await request.get(`/`);

  expect(indexReq.ok()).toBeTruthy();
  expect(await indexReq.text()).toContain(
    `<script async src="/livereload.js"></script>`
  );
});

test("returns livereload script", async ({ request }) => {
  await createServer();
  const indexReq = await request.get(`/livereload.js`);

  expect(indexReq.ok()).toBeTruthy();
});

test("returns index from given path", async ({ request }) => {
  await createServer({
    dir: contentDir,
    indexPath: path.resolve(__dirname, "../content/other.html"),
  });
  const indexReq = await request.get(`/`);

  expect(indexReq.ok()).toBeTruthy();
  expect(await indexReq.text()).toContain("other.html");
});

test("throws when index html not found in given path", async ({ request }) => {
  const indexPath = path.resolve(__dirname, "../content/unknown.html");
  let receivedError;

  try {
    await createServer({ dir: contentDir, indexPath });
  } catch (error) {
    receivedError = error.message;
  }

  expect(receivedError).toContain(
    `Index HTML file not found in "${indexPath}"`
  );
});

test("returns static files", async ({ request }) => {
  await createServer();
  const indexReq = await request.get(`/index.js`);

  expect(indexReq.ok()).toBeTruthy();

  expect(await indexReq.text()).toContain(`console.log("test");`);
  expect(await indexReq.headers()).toMatchObject({
    "content-type": "text/javascript",
  });
});

test("returns 404 when static file not found", async ({ request }) => {
  await createServer();
  const indexReq = await request.get(`/unknown.js`);

  expect(indexReq.status()).toBe(404);
  expect(await indexReq.text()).toContain(
    `Resource "/unknown.js" not found in "${path.join(
      contentDir,
      "unknown.js"
    )}"`
  );
});

test("forwards requests given proxy and matched path", async ({ request }) => {
  echoServer.listen(4000);
  await createServer({
    dir: contentDir,
    proxy: [{ filter: /^\/api/, host: "localhost", port: 4000 }],
  });

  const indexReq = await request.get(`/api/123`);

  expect(indexReq.ok()).toBeTruthy();
  expect(await indexReq.text()).toContain("/api/123");
  await stopEchoServer();
});

const echoServer = http.createServer(function (req, res) {
  const parsedURL = url.parse(req.url ?? "", true);
  res.end(parsedURL.pathname);
});

const stopEchoServer = () =>
  new Promise<void>((resolve, reject) =>
    echoServer.close((error) => (error ? reject(error) : resolve()))
  );
