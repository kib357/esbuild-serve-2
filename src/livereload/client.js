function connectLiveReload() {
  let open = false;
  const wsConnection = new WebSocket(`ws//${location.host}/livereload`);

  wsConnection.addEventListener("close", () => {
    console.warn(
      open ? "Live reload disconnected" : "Live reload connection failed"
    );
    setTimeout(connectLiveReload, 10 * 1000);
  });

  wsConnection.addEventListener("open", () => {
    open = true;
    console.log("Live reload connected");
  });

  wsConnection.addEventListener("message", (event) => {
    if (event.data === "rebuild_started") {
      console.log("Rebuilding...");
    }

    if (event.data === "reload") {
      console.log("Reloading page...");
      location.reload();
    }
  });
}

connectLiveReload();
