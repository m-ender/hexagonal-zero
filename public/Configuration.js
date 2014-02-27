// Render scale is the percentage of the viewport that will be filled by
// the coordinate range [-1, 1].
// The scaling is done in the shaders, but is has to be respected in
// obtaining coordinates from the mouse position.
var renderScale = 0.1;
var maxCoord = 1/renderScale;

var nColors = 6;
var gridSize = 6;

// Distance from the centre to each vertex
var hexSize = 1;
// Euclidian distance between neighboring hexes
var hexD = hexSize * sqrt(3);

// Angular velocity in radians per second
var omega = pi/3;

// Speed of hexes during a swap
var swapV = 3*hexD;
