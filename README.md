# drawit

A node.js app to take an image and render it as a line drawing

## macOS Install

From the terminal, do the following:

1. Install homebrew: https://brew.sh/
2. Install deps: `brew install node potrace imagemagick`
3. Clone the repo: `git clone git@github.com:allhandsactive/drawit.git` and switch to the directory: `cd drawit`
4. Install the node deps: `npm install`
5. Start the server: `npm start`
6. Go to http://localhost:3000 to begin

## TODO

- Make things look a bit nicer
- Images from a URL?
- Hatch
- Generate gcode?

## Dependencies

- imagemagick
- potrace
- [Cartoon script](http://www.fmwconcepts.com/imagemagick/cartoon/index.php) for imagemagick (modified and distributed in `bin`)
