// Render scale is the percentage of the viewport that will be filled by
// the coordinate range [-1, 1].
// The scaling is done in the shaders, but is has to be respected in
// obtaining coordinates from the mouse position.
var renderScale = 0.1;
var maxCoord = 1/renderScale;

var nColors = 6;
var gridSize = 6;

// Distance from the centre to each vertex. This is the size of hexes that
// would fill the grid without gaps. The actual geometry may be rendered
// at a different (usually smaller) scale.
var hexSize = 1;
// Euclidian distance between neighboring hexes
var hexD = hexSize * sqrt(3);

// How large should hexes be by default
var defaultScale = 0.95;
// How much should the scale oscillate when the hex is selected. The amplitude
// is relative to the hex's base size.
var scaleAmplitude = 0.05;
var scalePeriod = 1; // in seconds

// How fast do hexes shrink when dissolving? Given in hexSize per second
var dissolveV = 2.5;

// How fast do hexes fall to fill gaps?
var fallingV = 5*hexD;

// Angular velocity of the grid. Given in radians per second
var omega = 2*pi/3;

// Speed of hexes during a swap
var swapV = 3*hexD;
