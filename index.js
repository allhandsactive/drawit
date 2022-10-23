const fs = require("fs");
const path = require("path");
const { spawnSync } = require("node:child_process");

const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

const app = express();
const port = 3000;
const publicDir = path.join(__dirname, "public");
const imageDir = path.join(publicDir, "images");

app.use(
  bodyParser.json({
    limit: "20MB",
  })
);

app.get("/", (req, res) => {
  res.redirect(301, "index.html");
});

app.post("/process3", (req, res) => {
  const { jobId, choice } = req.body;

  const thresFile = path.join(imageDir, `${jobId}-thres-${choice}.png`);
  const bmpFile = path.join(imageDir, `${jobId}-thres-${choice}.bmp`);

  const ret1 = spawnSync("magick", ["convert", thresFile, bmpFile]);

  if (ret1.status) {
    throw new Error(ret1.stderr.toString("UTF-8"));
  }

  // potrace test01-threshold.bmp -s -o test01.svg
  const svgFile = path.join(imageDir, `${jobId}.svg`);
  const ret2 = spawnSync("potrace", [bmpFile, "-s", "-o", svgFile]);

  if (ret2.status) {
    throw new Error(ret2.stderr.toString("UTF-8"));
  }

  res.json(path.join("images", `${jobId}.svg`));
});

app.post("/process2", (req, res) => {
  const { jobId, choice } = req.body;

  const cartoonFile = path.join(imageDir, `${jobId}-cartoon.png`);
  const images = [];
  for (let i = choice - 4; i < choice + 5; i += 1) {
    const thresPart = path.join("images", `${jobId}-thres-${i}.png`);
    images.push(thresPart);

    const thresFile = path.join(__dirname, "public", thresPart);
    const ret = spawnSync("magick", [
      cartoonFile,
      "-colorspace",
      "gray",
      "-color-threshold",
      `gray(${i}%)-gray(100%)`,
      thresFile,
    ]);

    if (ret.status) {
      throw new Error(ret.stderr.toString("UTF-8"));
    }
  }

  res.json(images);
});

app.post("/process1", (req, res) => {
  const { x, y, width, height } = req.body;
  const jobId = uuidv4();

  const base64Image = req.body.photo.split(";base64,").pop();
  const uploadFile = path.join(imageDir, `${jobId}.png`);
  fs.writeFileSync(uploadFile, base64Image, { encoding: "base64" });

  const grayFile = path.join(imageDir, `${jobId}-gray.png`);
  const ret1 = spawnSync("magick", [
    "convert",
    uploadFile,
    "-set",
    "colorspace",
    "Gray",
    "-separate",
    "-average",
    "-crop",
    `${width}x${height}+${x}+${y}`,
    grayFile,
  ]);

  if (ret1.status) {
    throw new Error(ret1.stderr.toString("UTF-8"));
  }

  const cartoonFile = path.join(imageDir, `${jobId}-cartoon.png`);
  const ret2 = spawnSync(path.join(__dirname, "bin", "cartoon"), [
    "-e",
    "5",
    "-m",
    "2",
    grayFile,
    cartoonFile,
  ]);

  if (ret2.status) {
    throw new Error(ret2.stderr.toString("UTF-8"));
  }

  const images = [];
  for (let i = 15; i <= 87; i += 9) {
    const thresPart = path.join("images", `${jobId}-thres-${i}.png`);
    images.push(thresPart);

    const thresFile = path.join(__dirname, "public", thresPart);
    const ret3 = spawnSync("magick", [
      cartoonFile,
      "-colorspace",
      "gray",
      "-color-threshold",
      `gray(${i}%)-gray(100%)`,
      thresFile,
    ]);

    if (ret3.status) {
      throw new Error(ret3.stderr.toString("UTF-8"));
    }
  }

  res.json({ jobId, images });
});

app.use("/", express.static(path.join(__dirname, "public")));

app.listen(port, () => {
  console.log(`Go to http://localhost:${port} to start working.`);
});
