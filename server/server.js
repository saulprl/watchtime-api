import http from "http";
import app from "./app.js";

const server = http.createServer(app);

server.listen(process.env.PORT || 3000, () => {
  console.log(`Listening on port ${server.address().port}`);
});
