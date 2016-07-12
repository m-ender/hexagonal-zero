var debug = false;

var canvas;
var messageBox;
var debugBox;
var scoreBox;
var comboBox;
var movesBox;
var resultBox;

var gl;

// Objects holding data for individual shader programs
var hexagonProgram = {};

var grid;
var border;

var resolution = 512; // We're assuming a square aspect ratio
var viewPort = {};

// Timing
// We need these to fix the framerate
var fps = 60;
var interval = 1000/fps;
var lastTime;

// Rotation angle of the entire grid
var angle;
var targetAngle;

var clockwiseRotation = true;

var State = {
    Idle: "Idle",
    Rotating: "Rotating",
    HexSelected: "HexSelected",
    HexSwap: "HexSwap",
    HexUnswap: "HexUnswap",
    RemovingMatches: "RemovingMatches",
    CloseGaps: "CloseGaps",
    GameOver: "GameOver",
};
var currentState;

var highlightedHex = null;
var lockedHex = null;
var swappedHex = null;
var matchedHexes = null;
var shiftedHexes = null;

var startTime;

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

// Scoring
var score;
var combo;
var movesLeft;

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
    movesBox = $('#moves');
    scoreBox = $('#score');
    comboBox = $('#combo');
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

    gl.clearColor(1, 1, 1, 1);

    // Load shaders and get uniform locations
    hexagonProgram.program = InitShaders(gl, "hexagon-vertex-shader", "minimal-fragment-shader");
    // add uniform locations
    hexagonProgram.uRenderScale = gl.getUniformLocation(hexagonProgram.program, "uRenderScale");
    hexagonProgram.uGridAngle = gl.getUniformLocation(hexagonProgram.program, "uGridAngle");
    hexagonProgram.uCenter = gl.getUniformLocation(hexagonProgram.program, "uCenter");
    hexagonProgram.uColor = gl.getUniformLocation(hexagonProgram.program, "uColor");
    hexagonProgram.uScale = gl.getUniformLocation(hexagonProgram.program, "uScale");
    hexagonProgram.uAngle = gl.getUniformLocation(hexagonProgram.program, "uAngle");
    // add attribute locations
    hexagonProgram.aPos = gl.getAttribLocation(hexagonProgram.program, "aPos");

    // fill uniforms that are already known
    gl.useProgram(hexagonProgram.program);
    gl.uniform1f(hexagonProgram.uRenderScale, renderScale);
    gl.uniform1f(hexagonProgram.uGridAngle, angle);

    gl.useProgram(null);

    border = new Border(gridSize, hexD, $.Color('#635F56'));

    prepareHexagons();
    prepareStripedHexagons();
    prepareCircles();

    initializeLevel();

    currentState = State.Idle;

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    CheckError();

    lastTime = Date.now();
    update();
}

function renderInstructions()
{
    debugBox.html('How to play:<br><br>' +
                  'Click two adjacent to swap them. Match three or more tiles of the same color. ' +
                  'You know how... you\'ve seen this kind of thing before. ' +
                  'Oh, it might be that the level rotates. Maybe.<br><br>' +
                  'There are a few different types of special bombs. ' +
                  'Experiment with different matches to find out how to obtain them and how they work.');
}

function renderMenu()
{
    messageBox.html('<a id="startNewLevel">Start new level</a>');

    messageBox.find('#startNewLevel').bind('click', initializeLevel);
}

function renderState()
{
    movesBox.html(movesLeft);
    scoreBox.html(score);
    comboBox.html(combo);
}

function initializeLevel()
{
    angle = 0;
    grid = new Grid(gridSize, nColors);

    // TODO: Generate a sensible grid (one that doesn't contain matches, but
    // but contains valid moves).

    var nRefills = 0;
    var matches = grid.getMatchedHexes();
    while(matches.length)
    {
        var i, j, hex;

        for (i = 0; i < matches.length; ++i)
        {
            for (j = 0; j < matches[i].length; ++j)
            {
                hex = matches[i][j];
                grid.remove(hex);
            }
        }

        var shiftedHexColumns = grid.closeGaps();
        for (i = 0; i < shiftedHexColumns.length; ++i)
        {
            var column = shiftedHexColumns[i];
            for (j = 0; j < column.shiftedHexes.length; ++j)
            {
                hex = column.shiftedHexes[j];
                hex.geometry.x = hex.targetX;
                hex.geometry.y = hex.targetY;
            }
        }

        ++nRefills;
        grid.refill();
        matches = grid.getMatchedHexes();
    }
    console.log('Needed to remove matches ' + nRefills + ' time' + (nRefills === 1 ? '' : 's'));

    score = 0;
    combo = 1;
    movesLeft = nMoves;

    renderState();
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
    var i, j, k;
    var hex, matches;

    window.requestAnimFrame(update, canvas);

    currentTime = Date.now();
    var dTime = currentTime - lastTime;

    if (dTime > interval)
    {
        // The modulo is to take care of the case that we skipped a frame
        lastTime = currentTime - (dTime % interval);

        var steps = floor(dTime / interval);

        dTime = steps * interval / 1000; // Now dTime is in seconds

        for (i = 0; i < grid.hexBombs.length; ++i)
        {
            grid.hexBombs[i].geometry.rotate(dTime * bombOmega);
        }
        for (i = 0; i < grid.colorBombs.length; ++i)
        {
            grid.colorBombs[i].geometry.rotate(dTime * bombOmega);
        }

        var direction;
        switch (currentState)
        {
        case State.HexSelected:
            lockedHex.geometry.resize(1 + scaleAmplitude * sin(2*pi*(currentTime - startTime) / (1000 * scalePeriod)));
            break;
        case State.Rotating:
            direction = sign(targetAngle - angle);
            angle += direction * dTime * omega;
            if (direction * angle >= direction * targetAngle)
            {
                angle = targetAngle % (2*pi);
                combo = 1;
                if (movesLeft)
                {
                    renderState();
                    currentState = State.Idle;
                }
                else
                {
                    resultBox.html('FINAL SCORE<br>'+score);
                    startTime = currentTime;
                    currentState = State.GameOver;
                }
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

                if (lockedHex instanceof ColorBomb &&
                    !(swappedHex instanceof ColorBomb))
                {
                    matches = grid.getColorMatch(swappedHex.color);
                    matches[0].push(lockedHex);
                }
                else if (swappedHex instanceof ColorBomb &&
                         !(lockedHex instanceof ColorBomb))
                {
                    matches = grid.getColorMatch(lockedHex.color);
                    matches[0].push(swappedHex);
                }
                else if (swappedHex instanceof ColorBomb &&
                         lockedHex instanceof ColorBomb)
                {
                    matches = grid.getAllTileMatch();
                }
                else
                {
                    matches = grid.getMatchedHexes();
                }

                if (matches.length)
                {
                    removeMatches(matches);
                    lockedHex = null;
                    swappedHex = null;
                    --movesLeft;
                    renderState();
                }
                else
                {
                    soundSystem.failHex(swappedHex);
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
        case State.RemovingMatches:
            var t = (currentTime - startTime) / 1000 * dissolveV;
            for (i = 0; i < matchedHexes.length; ++i)
            {
                hex = matchedHexes[i];

                var maxR;
                if (hex instanceof RegularTile ||
                    hex instanceof RowBomb ||
                    hex instanceof ColorBomb)
                    maxR = regularExpR/defaultScale;
                else if (hex instanceof HexBomb)
                {
                    // This is a parameterisation which satisfies:
                    // f(t=0) = 1
                    // f(t=1) = 1
                    // f_max = hexBombExpR
                    maxR = hexBombExpR/defaultScale;
                }
                var b = 2 - 2*maxR - 2*sqrt(maxR*(maxR-1));
                hex.geometry.resize(1 - b*t + (b-1)*t*t);
            }

            if (t > 1)
            {
                matchedHexes = null;

                ++combo;
                renderState();

                var shiftedHexColumns = grid.closeGaps();

                shiftedHexes = [];

                for (i = 0; i < shiftedHexColumns.length; ++i)
                    shiftedHexes = shiftedHexes.concat(shiftedHexColumns[i].shiftedHexes);

                // Refers to the coordinate that stays constant along on column
                // in shiftedHexColumns
                var constCoord;

                switch (grid.orientation)
                {
                case Orientation.PlusA:
                case Orientation.MinusA:
                    constCoord = 'a';
                    break;
                case Orientation.PlusB:
                case Orientation.MinusB:
                    constCoord = 'b';
                    break;
                case Orientation.PlusC:
                case Orientation.MinusC:
                    constCoord = 'c';
                    break;
                }

                var newHexes = grid.refill();

                // Displace new hexes to the top of their columns so they fall down
                // with the other hexes. This is somehow quite hacky.
                for (i = 0; i < newHexes.length; ++i)
                {
                    hex = newHexes[i];
                    var column = hex[constCoord] + grid.size-1;
                    hex.geometry.x += sin(angle) * hexD * shiftedHexColumns[column].missingHexes;
                    hex.geometry.y += cos(angle) * hexD * shiftedHexColumns[column].missingHexes;

                    // Fill a targetX/targetY variable, which can be
                    // used to move the geometry to the new position.
                    var center = axialToPixel(hex.a, hex.c);
                    hex.targetX = center.x;
                    hex.targetY = center.y;

                    shiftedHexes.push(hex);
                }

                currentState = State.CloseGaps;
            }
            break;
        case State.CloseGaps:
            for (i = 0; i < shiftedHexes.length; ++i)
            {
                hex = shiftedHexes[i];

                // Get a unit vector from the hex to its target
                var dx = hex.targetX - hex.geometry.x;
                var dy = hex.targetY - hex.geometry.y;
                var norm = sqrt(dx*dx+dy*dy);
                dx /= norm;
                dy /= norm;

                hex.geometry.x += dx * fallingV * dTime;
                hex.geometry.y += dy * fallingV * dTime;

                // This is quite a hack: remove the hex from the
                // shifted hexes, if either component changed it's sign
                if ((hex.targetX === hex.geometry.x &&
                    hex.targetY === hex.geometry.y) ||
                    dx * (hex.targetX - hex.geometry.x) < 0 ||
                    dy * (hex.targetY - hex.geometry.y) < 0)
                {
                    hex.geometry.x = hex.targetX;
                    hex.geometry.y = hex.targetY;
                    shiftedHexes.splice(i,1);
                    --i;
                }
            }

            if (shiftedHexes.length === 0)
            {
                shiftedHexes = null;
                matches = grid.getMatchedHexes();
                if (matches.length)
                    removeMatches(matches);
                else
                    rotateGrid(clockwiseRotation);
            }
            break;
        case State.GameOver:
            if (currentTime - startTime > gameOverDuration * 1000)
            {
                resultBox.html('');
                initializeLevel();
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
    gl.uniform1f(hexagonProgram.uGridAngle, angle);

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

    var i;
    if (matchedHexes)
    {
        for (i = 0; i < matchedHexes.length; ++i)
        {
            if (!(matchedHexes[i] instanceof HexBomb))
            {
                matchedHexes[i].geometry.render();
                matchedHexes[i].geometry.render(true);
            }
        }

        // TODO: Avoid traversing the list twice by using the depth buffer
        for (i = 0; i < matchedHexes.length; ++i)
        {
            if (matchedHexes[i] instanceof HexBomb)
            {
                matchedHexes[i].geometry.render();
                matchedHexes[i].geometry.render(true);
            }
        }
    }



    border.render();

    gl.useProgram(null);

    gl.disable(gl.BLEND);
}

function highlightHex(hex) {
    if (hex != null && hex != highlightedHex) {
        soundSystem.blipHex(hex);
    }
    highlightedHex = hex;
}

function handleMouseMove(event) {
    var rect = canvas.getBoundingClientRect();
    var coords = normaliseCursorCoordinates(event, rect);

    if (debug)
    {
        debugBox.find('#xcoord').html(coords.x);
        debugBox.find('#ycoord').html(coords.y);
    }

    var axial = pixelToAxial(coords.x, coords.y);
    var hex = grid.get(axial.q, axial.r);
    switch(currentState)
    {
    case State.Idle:
        highlightHex(hex);

        if (debug)
        {
            debugBox.find('#hexa').html(axial.q);
            debugBox.find('#hexb').html(-axial.q-axial.r);
            debugBox.find('#hexc').html(axial.r);
        }
        break;
    case State.HexSelected:
        if (hex && manhattanDistance(hex, lockedHex) === 1)
        {
            highlightHex(hex);

            if (debug)
            {
                debugBox.find('#hexa').html(axial.q);
                debugBox.find('#hexb').html(-axial.q-axial.r);
                debugBox.find('#hexc').html(axial.r);
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

    var axial = pixelToAxial(coords.x, coords.y);
    var hex = grid.get(axial.q, axial.r);

    if (!hex)
        return;

    switch(currentState)
    {
    case State.Idle:
        lockedHex = hex;
        startTime = Date.now(); // for smooth start of oscillation
        currentState = State.HexSelected;
        soundSystem.selectHex(hex);
        break;
    case State.HexSelected:
        if (manhattanDistance(hex, lockedHex) === 1)
        {
            lockedHex.geometry.resize();

            highlightedHex = null;
            swappedHex = hex;
            soundSystem.swapHex(swappedHex);

            lockedPos = {
                x: lockedHex.a * iq.x + lockedHex.c * ir.x,
                y: lockedHex.a * iq.y + lockedHex.c * ir.y,
            };
            swappedPos = {
                x: swappedHex.a * iq.x + swappedHex.c * ir.x,
                y: swappedHex.a * iq.y + swappedHex.c * ir.y,
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
        else if (hex !== lockedHex)
        {
            lockedHex.geometry.resize();
            lockedHex = hex;
            soundSystem.selectHex(lockedHex);
            startTime = Date.now(); // for smooth start of oscillation
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

// cw is an optional flag to initiate a clockwise rotation
// (counter-clockwise is default)
function rotateGrid(cw)
{
    soundSystem.rotateGrid(cw);
    targetAngle = cw ? (angle - pi/3) : (angle + pi/3);
    this.grid.rotate(cw);
    currentState = State.Rotating;
}

function removeMatches(matches)
{
    var neighbors = [
       [+1,  0], [+1, -1], [ 0, -1],
       [-1,  0], [-1, +1], [ 0, +1]
    ];

    var i, j, k, d, hex;

    matchedHexes = [];
    bombedHexes = [];

    changedHexes = [];
    newHexes = [];

    // Process matches
    for (i = 0; i < matches.length; ++i)
    {
        var match = matches[i];
        if (match.length > 3 && match.axis !== undefined)
        {
            var index;
            if ((index = match.indexOf(swappedHex)) > -1)
            {
                hex = swappedHex;
            }
            else if ((index = match.indexOf(lockedHex)) > -1)
            {
                hex = lockedHex;
            }
            else
            {
                // Take the third hex
                index = 2;
                hex = match[2];
            }

            if (match.length > 4)
                grid.changeType(hex, ColorBomb, match.axis);
            else
                grid.changeType(hex, RowBomb, match.axis);

            changedHexes.push(hex);
            newHexes.push(grid.get(hex.a, hex.c));
            match.splice(index,1);

            if ((index = matchedHexes.indexOf(hex)) > -1)
                matchedHexes.splice(index,1);

            // Collect bombs to process separately
            if ((hex instanceof HexBomb ||
                hex instanceof RowBomb) &&
                bombedHexes.indexOf(hex) === -1)
                bombedHexes.push(hex);
        }

        for (j = 0; j < match.length; ++j)
        {
            hex = match[j];
            soundSystem.removeHex(hex);

            if (changedHexes.indexOf(hex) === -1)
            {
                if (matchedHexes.indexOf(hex) === -1)
                {
                    hex.matchCount = 1;
                    matchedHexes.push(hex);
                }
                else
                    ++hex.matchCount;
            }

            // Collect bombs to process separately
            if ((hex instanceof HexBomb ||
                hex instanceof RowBomb) &&
                bombedHexes.indexOf(hex) === -1)
                bombedHexes.push(hex);
        }
    }

    // Process bombs. We're adding new elements to the array while walking
    // over it, which is a bit evil but works.
    if (bombedHexes.length > 0) {
        soundSystem.bombHex(null);
    }
    for (i = 0; i < bombedHexes.length; ++i)
    {
        hex = bombedHexes[i];
        if (newHexes.indexOf(hex) > -1 ||
            hex instanceof ColorBomb)
            continue;

        if (matchedHexes.indexOf(hex) === -1 &&
            changedHexes.indexOf(hex) === -1)
            matchedHexes.push(hex);

        if (hex instanceof HexBomb)
        {
            for (k = 0; k < 6; ++k)
            {
                d = neighbors[k];
                var neighbor = grid.get(hex.a + d[0], hex.c + d[1]);
                if (neighbor && bombedHexes.indexOf(neighbor) === -1)
                    bombedHexes.push(neighbor);
            }
        }
        else if (hex instanceof RowBomb)
        {
            var p;
            switch (hex.axis)
            {
            case CubicAxis.A:
                p = { i: 'a', j: 'b', k: 'c' };
                break;
            case CubicAxis.B:
                p = { i: 'b', j: 'c', k: 'a' };
                break;
            case CubicAxis.C:
                p = { i: 'c', j: 'a', k: 'b' };
                break;
            }

            var pos = {
                a: hex.a,
                b: hex.b,
                c: hex.c,
            };

            for (pos[p.k] = -gridSize+1 - min(0,pos[p.i]);
                 pos[p.k] <= gridSize-1 - max(0,pos[p.i]);
                 ++pos[p.k])
            {
                pos[p.j] = -pos[p.i]-pos[p.k];
                var q = pos.a;
                var r = pos.c;

                hex = grid.get(q,r);
                if (bombedHexes.indexOf(hex) === -1)
                    bombedHexes.push(hex);
            }
        }
    }


    // We're modifying the array again, this time we're removing tiles that
    // should not be removed but converted. Therefore we walk the array
    // backwards.
    for (i = matchedHexes.length-1; i >= 0; --i)
    {
        hex = matchedHexes[i];
        if (hex.matchCount > 1)
        {
            grid.changeType(hex, HexBomb);
            newHexes.push(grid.get(hex.a, hex.c));
            matchedHexes.splice(i,1);
        }
        else
            grid.remove(hex);
    }

    // Update score
    score += baseScore * matchedHexes.length * combo;
    for (i = 0; i < newHexes.length; ++i)
    {
        hex = newHexes[i];
        if (hex instanceof HexBomb)
            score += baseScore * newHexBombScore * combo;
        else if (hex instanceof RowBomb)
            score += baseScore * newRowBombScore * combo;
        else if (hex instanceof ColorBomb)
            score += baseScore * newColorBombScore * combo;
    }
    renderState();

    startTime = Date.now();
    currentState = State.RemovingMatches;
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

