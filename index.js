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
  }),
);

app.get("/", (req, res) => {
  res.redirect(301, "index.html");
});

app.post("/process3", (req, res) => {
  const { jobId, choice, landscape } = req.body;

  const thresFile = path.join(imageDir, `${jobId}-thres-${choice}.png`);
  const bmpFile = path.join(imageDir, `${jobId}-thres-${choice}.bmp`);

  const ret1 = spawnSync("magick", ["convert", thresFile, bmpFile]);

  if (ret1.status) {
    throw new Error(ret1.stderr.toString("UTF-8"));
  }

  let width = "100mm";
  let height = "130mm";
  let rotate = "180";
  if (landscape) {
    width = "130mm";
    height = "100mm";
    rotate = "90";
  }

  // potrace test01-threshold.bmp -s -o test01.svg
  const time = new Date().valueOf();
  const svgFile = path.join(imageDir, `${jobId}-${time}.svg`);
  const ret2 = spawnSync("potrace", [
    bmpFile,
    "-s",
    "-W",
    width,
    "-H",
    height,
    "-A",
    rotate,
    "-o",
    svgFile,
  ]);

  if (ret2.status) {
    throw new Error(ret2.stderr.toString("UTF-8"));
  }

  // hatch fill
  // python eggbot_hatch.py --hatchSpacing=20 --units=2 --hatchAngle=45 --crossHatch=False --connect_bool=False --inset_dist=0.5 --tolerance=2 --hatchScope=3 ~/Downloads/portrait\(6\).svg > ~/Downloads/hatch.svg
  const ret3 = spawnSync(
    "python3",
    [
      path.join(__dirname, "bin", "ad-ink_lin-x86_392", "eggbot_hatch.py"),
      "--hatchSpacing=20",
      "--units=2",
      "--hatchAngle=45",
      "--crossHatch=False",
      "--connect_bool=False",
      "--inset_dist=0.5",
      "--tolerance=2",
      "--hatchScope=3",
      svgFile,
    ],
    { cwd: path.join(__dirname, "bin", "ad-ink_lin-x86_392") },
  );

  if (ret3.status) {
    throw new Error(ret3.stderr.toString("UTF-8"));
  }

  fs.writeFileSync(
    svgFile,
    // make the strokes bigger for the original
    ret3.stdout
      .toString("UTF-8")
      .replace(
        'fill="#000000" stroke="none"',
        'fill="#000000" stroke="none" style="fill:none;stroke:#000000;stroke-opacity:1;stroke-width:20.00000003;stroke-dasharray:none"',
      )
      // make hatch strokes bigger
      .replaceAll("stroke-width:1", "stroke-width:20"),
  );

  // svg2gcode --feedrate 9000 --origin 0,0 --dpi 96 --end 'G0 X-100 Y0 z3' --off 'g0 z3' --on 'g0 z0' --out test.gcode test.svg

  const gcodeFile = path.join(imageDir, `${jobId}-${time}.gcode`);
  const ret4 = spawnSync(
    path.join(__dirname, "svg2gcode", "target", "release", "svg2gcode"),
    [
      "--feedrate",
      "9000",
      "--origin",
      "0,0",
      "--dpi",
      "96",
      "--end",
      "G0 X-100 Y0 z3",
      "--off",
      "g0 z3",
      "--on",
      "g0 z0",
      "--out",
      gcodeFile,
      svgFile,
    ],
  );

  if (ret4.status) {
    throw new Error(ret4.stderr.toString("UTF-8"));
  }

  res.json({
    svg: path.join("images", `${jobId}-${time}.svg`),
    gcode: path.join("images", `${jobId}-${time}.gcode`),
  });
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

  let resize;
  if (parseInt(width, 10) >= parseInt(height, 10)) {
    resize = "1000x";
  } else {
    resize = "x1000";
  }

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
    "-resize",
    resize,
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
