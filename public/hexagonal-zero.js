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
var targetAngle;

var State = {
    Idle: "Idle",
    Rotating: "Rotating",
    HexSelected: "HexSelected",
    HexSwap: "HexSwap",
    HexUnswap: "HexUnswap",
};
var currentState;

var highlightedHex = null;
var lockedHex = null;
var swappedHex = null;

// For swapping tiles. T is an interpolation parameter
// between the initial positions (0) and the final positions
// (hexD).
var currentT;
var targetT;
// For precomputing a normal vector in the direction of the swap
var swapDirection = null;
// For precomputing the initial positions of the tiles to be swapped
var lockedPos;
var swappedPos;

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
    document.addEventListener('keypress', handleCharacterInput, false);

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
    grid = new Grid(gridSize, nColors, colorGenerator);

    currentState = State.Idle;

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

        dTime = steps * interval / 1000; // Now dTime is in seconds

        var direction;
        switch (currentState)
        {
        case State.Rotating:
            direction = sign(targetAngle - angle);
            angle += direction * dTime * omega;
            if (direction * angle >= direction * targetAngle)
            {
                angle = targetAngle % (2*pi);
                currentState = State.Idle;
            }

            break;
        case State.HexSwap:
            currentT += dTime * swapV;

            if (currentT >= hexD)
                currentT = hexD;

            lockedHex.geometry.x = lockedPos.x + swapDirection.x * currentT;
            lockedHex.geometry.y = lockedPos.y + swapDirection.y * currentT;

            swappedHex.geometry.x = swappedPos.x - swapDirection.x * currentT;
            swappedHex.geometry.y = swappedPos.y - swapDirection.y * currentT;

            if (currentT === hexD)
            {
                grid.swap(lockedHex, swappedHex);
                if (grid.hasMatches())
                {
                    lockedHex = null;
                    swappedHex = null;
                    currentState = State.Idle;
                }
                else
                {
                    grid.swap(lockedHex, swappedHex);
                    currentState = State.HexUnswap;
                }
            }
            break;
        case State.HexUnswap:
            currentT -= dTime * swapV;

            if (currentT <= 0)
                currentT = 0;

            lockedHex.geometry.x = lockedPos.x + swapDirection.x * currentT;
            lockedHex.geometry.y = lockedPos.y + swapDirection.y * currentT;

            swappedHex.geometry.x = swappedPos.x - swapDirection.x * currentT;
            swappedHex.geometry.y = swappedPos.y - swapDirection.y * currentT;

            if (currentT === 0)
            {
                lockedHex = null;
                swappedHex = null;
                currentState = State.Idle;
            }
            break;
        }

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

    if (highlightedHex)
        highlightedHex.geometry.render(true);


    if (swappedHex)
    {
        swappedHex.geometry.render();
        swappedHex.geometry.render(true);
    }

    if (lockedHex)
    {
        lockedHex.geometry.render();
        lockedHex.geometry.render(true);
    }

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

    var axial = grid.pixelToAxial(coords.x, coords.y);
    var hex = grid.get(axial.q, axial.r);
    switch(currentState)
    {
    case State.Idle:
        highlightedHex = hex;

        if (debug)
        {
            debugBox.find('#hexq').html(axial.q);
            debugBox.find('#hexr').html(axial.r);
            debugBox.find('#hexs').html(-axial.q-axial.r);
        }
        break;
    case State.HexSelected:
        if (hex && grid.manhattanDistance(hex, lockedHex) === 1)
        {
            highlightedHex = hex;
            if (debug)
            {
                debugBox.find('#hexq').html(axial.q);
                debugBox.find('#hexr').html(axial.r);
                debugBox.find('#hexs').html(-axial.q-axial.r);
            }
        }
        else
        {
            highlightedHex = null;
        }
        break;
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

    var axial = grid.pixelToAxial(coords.x, coords.y);
    var hex = grid.get(axial.q, axial.r);

    if (!hex)
        return;

    switch(currentState)
    {
    case State.Idle:
        lockedHex = hex;

        currentState = State.HexSelected;
        break;
    case State.HexSelected:
        if (grid.manhattanDistance(hex, lockedHex) === 1)
        {
            highlightedHex = null;
            swappedHex = hex;

            lockedPos = {
                x: lockedHex.a * iq.x + lockedHex.b * ir.x,
                y: lockedHex.a * iq.y + lockedHex.b * ir.y,
            };
            swappedPos = {
                x: swappedHex.a * iq.x + swappedHex.b * ir.x,
                y: swappedHex.a * iq.y + swappedHex.b * ir.y,
            };

            var dx = swappedPos.x - lockedPos.x;
            var dy = swappedPos.y - lockedPos.y;
            var norm = sqrt(dx*dx + dy*dy);

            swapDirection = {
                x: dx / norm,
                y: dy / norm,
            };
            currentT = 0;

            currentState = State.HexSwap;
        }
        break;
    }
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

function handleCharacterInput(event) {
    var character = String.fromCharCode(event.charCode);

    switch (character)
    {
    case '+':
        if (currentState === State.Idle)
            rotateGrid();
        break;
    case '-':
        if (currentState === State.Idle)
            rotateGrid(true);
        break;
    }
}

// Takes the mouse event and the rectangle to normalise for
// Outputs object with x, y coordinates in [-maxCoord,maxCoord] with positive
// y pointing upwards.
// It also accounts for the rotation of the grid.
function normaliseCursorCoordinates(event, rect)
{
    var x = (2*(event.clientX - rect.left) / resolution - 1) / renderScale;
    var y = (1 - 2*(event.clientY - rect.top) / resolution) / renderScale; // invert, to make positive y point upwards
    return {
        x:  x*cos(angle) + y*sin(angle),
        y: -x*sin(angle) + y*cos(angle)
    };
}

// ccw is an optional flag to initiate a counter-clockwise rotation
// (clockwise is default)
function rotateGrid(ccw)
{
    currentState = State.Rotating;
    targetAngle = ccw ? (angle - pi/3) : (angle + pi/3);
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

