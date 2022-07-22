import serve from "../dist/index";
import path from "path";

serve(
  {
    entryPoints: [path.resolve(__dirname, "../content/entry")],
    outdir: "",
    plugins: [
      {
        name: "test",
        setup(build) {
          build.onEnd((result) => {
            console.log("build");
          });
        },
      },
    ],
  },
  {
    indexPath: path.resolve(__dirname, "../content/index.html"),
  }
);
