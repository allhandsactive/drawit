const path = require("path");

const express = require("express");
const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.redirect(301, "index.html");
});

app.use("/", express.static(path.join(__dirname, "public")));

app.listen(port, () => {
  console.log(`Go to http://localhost:${port} to start working.`);
});
