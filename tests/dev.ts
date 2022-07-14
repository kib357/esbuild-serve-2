import path from "path";
import DevServer from "../src/index";

const dir = path.resolve(__dirname, "../content");

DevServer.create({ dir });
