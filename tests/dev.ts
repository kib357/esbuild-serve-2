import path from "path";
import DevServer from "../src/server";

const dir = path.resolve(__dirname, "../content");

DevServer.create({ dir });
