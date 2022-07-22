import { Plugin } from "esbuild";
import DevServer from "../server";

export default function (server: DevServer): Plugin {
  return {
    name: "livereload",
    setup: (build) => {
      build.onEnd(() => {
        server.livereload.sendReload();
      });
      build.onStart(() => {
        server.livereload.sendRebuildStarted();
      });
    },
  };
}
