var debug = true;

var canvas;
var messageBox;
var debugBox;
var resultBox;

var gl;

var colorGenerator;

// Objects holding data for individual shader programs
var hexagonProgram = {};

var grid;

var resolution = 512; // We're assuming a square aspect ratio
var viewPort = {};

// Timing
// We need these to fix the framerate
var fps = 60;
var interval = 1000/fps;
var lastTime;

// Rotation angle of the entire grid
var angle = 0;

var mouseDown = false;

window.onload = init;

function init()
{
    canvas = document.getElementById("gl-canvas");

    // This is the size we are rendering to
    viewPort.width = resolution;
    viewPort.height = resolution;
    // This is the actual extent of the canvas on the page
    canvas.style.width = viewPort.width;
    canvas.style.height = viewPort.height;
    // This is the resolution of the canvas (which will be scaled to the extent, using some rather primitive anti-aliasing techniques)
    canvas.width = viewPort.width;
    canvas.height = viewPort.height;

    // By attaching the event to document we can control the cursor from
    // anywhere on the page and can even drag off the browser window.
    document.addEventListener('mousedown', handleMouseDown, false);
    document.addEventListener('mouseup', handleMouseUp, false);
    document.addEventListener('mousemove', handleMouseMove, false);

    messageBox = $('#message');
    debugBox = $('#debug');
    resultBox = $('#result');

    if (!debug)
        renderInstructions();

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        messageBox.html("WebGL is not available!");
    } else {
        messageBox.html("WebGL up and running!");
    }

    if (!debug)
        renderMenu();

    colorGenerator = new ColorGenerator(nColors);

    gl.clearColor(1, 1, 1, 1);

    // Load shaders and get uniform locations
    hexagonProgram.program = InitShaders(gl, "hexagon-vertex-shader", "minimal-fragment-shader");
    // add uniform locations
    hexagonProgram.uRenderScale = gl.getUniformLocation(hexagonProgram.program, "uRenderScale");
    hexagonProgram.uAngle = gl.getUniformLocation(hexagonProgram.program, "uAngle");
    hexagonProgram.uCenter = gl.getUniformLocation(hexagonProgram.program, "uCenter");
    hexagonProgram.uColor = gl.getUniformLocation(hexagonProgram.program, "uColor");
    // add attribute locations
    hexagonProgram.aPos = gl.getAttribLocation(hexagonProgram.program, "aPos");

    // fill uniforms that are already known
    gl.useProgram(hexagonProgram.program);
    gl.uniform1f(hexagonProgram.uRenderScale, renderScale);
    gl.uniform1f(hexagonProgram.uAngle, angle);

    gl.useProgram(null);

    prepareHexagons();

    grid = new Grid(6, colorGenerator);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    CheckError();

    lastTime = Date.now();
    update();
}

function renderInstructions()
{
    debugBox.html('Level <span id="level"></span><br>' +
                  'Score: <span id="score">0</span>%<br>' +
                  '================================<br><br>' +
                  'How to play:<br><br>' +
                  'Match three or more hexagons of the same color. ' +
                  'You know how... you\'ve seen this kind of thing before. ' +
                  'Oh, it might be that the level rotates. Maybe.');
}

function renderMenu()
{
    // What menu?
}

function InitShaders(gl, vertexShaderId, fragmentShaderId)
{
    var vertexShader;
    var fragmentShader;

    var vertexElement = document.getElementById(vertexShaderId);
    if(!vertexElement)
    {
        messageBox.html("Unable to load vertex shader '" + vertexShaderId + "'");
        return -1;
    }
    else
    {
        vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexElement.text);
        gl.compileShader(vertexShader);
        if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
        {
            messageBox.html("Vertex shader '" + vertexShaderId + "' failed to compile. The error log is:</br>" + gl.getShaderInfoLog(vertexShader));
            return -1;
        }
    }

    var fragmentElement = document.getElementById(fragmentShaderId);
    if(!fragmentElement)
    {
        messageBox.html("Unable to load fragment shader '" + fragmentShaderId + "'");
        return -1;
    }
    else
    {
        fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentElement.text);
        gl.compileShader(fragmentShader);
        if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
        {
            messageBox.html("Fragment shader '" + fragmentShaderId + "' failed to compile. The error log is:</br>" + gl.getShaderInfoLog(fragmentShader));
            return -1;
        }
    }

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if(!gl.getProgramParameter(program, gl.LINK_STATUS))
    {
        messageBox.html("Shader program failed to link. The error log is:</br>" + gl.getProgramInfoLog(program));
        return -1;
    }

    return program;
}

// This is a fixed-framerate game loop. dT is not constant, though
function update()
{
    window.requestAnimFrame(update, canvas);

    currentTime = Date.now();
    var dTime = currentTime - lastTime;

    if (dTime > interval)
    {
        // The modulo is to take care of the case that we skipped a frame
        lastTime = currentTime - (dTime % interval);

        var steps = floor(dTime / interval);

        // Do something with dT = steps * interval

        drawScreen();
    }
}

function drawScreen()
{
    gl.enable(gl.BLEND);

    gl.viewport(0, 0, viewPort.width, viewPort.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(hexagonProgram.program);
    gl.uniform1f(hexagonProgram.uAngle, angle);

    grid.render();

    gl.useProgram(null);

    gl.disable(gl.BLEND);
}

function handleMouseMove(event) {
    var rect = canvas.getBoundingClientRect();
    var coords = normaliseCursorCoordinates(event, rect);

    if (debug)
    {
        debugBox.find('#xcoord').html(coords.x);
        debugBox.find('#ycoord').html(coords.y);
    }
}

function handleMouseDown(event) {
    var rect = canvas.getBoundingClientRect();
    var coords = normaliseCursorCoordinates(event, rect);

    if (coords.x < -maxCoord || coords.x > maxCoord || coords.y < -maxCoord || coords.y > maxCoord)
        return;

    if (debug)
    {
        debugBox.find('#xdown').html(coords.x);
        debugBox.find('#ydown').html(coords.y);
    }

    mouseDown = true;
}

function handleMouseUp(event) {
    var rect = canvas.getBoundingClientRect();
    var coords = normaliseCursorCoordinates(event, rect);

    if (debug)
    {
        debugBox.find('#xup').html(coords.x);
        debugBox.find('#yup').html(coords.y);
    }

    mouseDown = false;
}

// Takes the mouse event and the rectangle to normalise for
// Outputs object with x, y coordinates in [-maxCoord,maxCoord] with positive
// y pointing upwards.
function normaliseCursorCoordinates(event, rect)
{
    return {
        x: (2*(event.clientX - rect.left) / resolution - 1) / renderScale,
        y: (1 - 2*(event.clientY - rect.top) / resolution) / renderScale, // invert, to make positive y point upwards
    };
}

function CheckError(msg)
{
    var error = gl.getError();
    if (error !== 0)
    {
        var errMsg = "OpenGL error: " + error.toString(16);
        if (msg) { errMsg = msg + "</br>" + errMsg; }
        messageBox.html(errMsg);
    }
}