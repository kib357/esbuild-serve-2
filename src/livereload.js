const protocol = `ws${location.protocol === "https:" ? "s" : ""}:`;
const wsConnection = new WebSocket(`${protocol}//${location.host}`);

wsConnection.onopen = () => {
  console.log("Live reload connected");
};

wsConnection.onmessage = (event) => {
  if (event.data === "start_rebuild") {
    console.log("Rebuilding...");
  }

  if (event.data === "rebuild") {
    console.log("Rebuilt successfully, reloading page...");
    location.reload();
  }
};
