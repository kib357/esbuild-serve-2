import esbuild, { BuildOptions, WatchMode } from "esbuild";
import livereloadPlugin from "./livereload/esbuildPlugin";
import DevServer from "./server";

type ESBuildOptions = Omit<BuildOptions, "bundle" | "outdir" | "watch"> & {
  /** Documentation: https://esbuild.github.io/api/#outdir */
  outdir: string;
};

type DevServerOptions = Omit<DevServer.ServerOptions, "dir"> & {
  dir?: string;
};

export = function serve(
  buildOptions: ESBuildOptions,
  serveOptions: DevServerOptions = {}
) {
  const dir = serveOptions.dir ?? buildOptions.outdir;
  const server = DevServer.create({ ...serveOptions, dir });

  esbuild.build({
    ...buildOptions,
    bundle: true,
    plugins: [...(buildOptions.plugins ?? []), livereloadPlugin(server)],
    watch: watchMode,
  });
};


const watchMode: WatchMode = {
  onRebuild(error, result) {
    if (error) {
      console.error(error);
    }
    console.info('Build completed');
    result?.warnings && console.info('Warnings');
  }
}