// Set up vertices
var width = 2*hexSize;
var height = sqrt(3) * hexSize;

var hexagonCoords = [ hexSize,    0,
                      hexSize/2,  height/2,
                     -hexSize/2,  height/2,
                     -hexSize,    0,
                     -hexSize/2, -height/2,
                      hexSize/2, -height/2 ];

var hexagonVertices = {};

// Make sure to call this before trying to render a hexagon
function prepareHexagons()
{
    hexagonVertices = {};
    hexagonVertices.data = new Float32Array(hexagonCoords);

    hexagonVertices.bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, hexagonVertices.bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, hexagonVertices.data, gl.STATIC_DRAW);
}

// The first two parameters are the coordinates of the hexagon's center.
// The color is optional (default black).
// The scale is optional, the default is read from the global "defaultScale".
function Hexagon(x, y, color, scale)
{
    this.hidden = false;

    this.x = x;
    this.y = y;

    this.color = color || [0, 0, 0];

    this.scale = scale || defaultScale;
    this.baseScale = this.scale;

    this.angle = 0;
}

// Convenient setters
Hexagon.prototype.move = function(x, y) {
    this.x = x;
    this.y = y;
};

// scale should be relative to the this.baseScale (i.e., pass
// in 1 to resize to base scale; 1 is also the default).
Hexagon.prototype.resize = function(scale) {
    if (scale === undefined) scale = 1;
    this.scale = this.baseScale * scale;
};

Hexagon.prototype.rotate = function(dAngle) {
    this.angle += dAngle;
};

Hexagon.prototype.hide = function() { this.hidden = true; };
Hexagon.prototype.show = function() { this.hidden = false; };

// Outline can optionally be set to true to render ... well ...
// only an outline.
Hexagon.prototype.render = function(outline) {
    if (this.hidden) return;

    gl.useProgram(hexagonProgram.program);

    gl.uniform2f(hexagonProgram.uCenter, this.x, this.y);
    gl.uniform1f(hexagonProgram.uScale, this.scale);
    gl.uniform1f(hexagonProgram.uAngle, this.angle);

    gl.enableVertexAttribArray(hexagonProgram.aPos);
    gl.bindBuffer(gl.ARRAY_BUFFER, hexagonVertices.bufferId);
    gl.vertexAttribPointer(hexagonProgram.aPos, 2, gl.FLOAT, false, 0, 0);

    if (outline)
    {
        gl.uniform4f(hexagonProgram.uColor,
                     0,
                     0,
                     0,
                     1);

        gl.drawArrays(gl.LINE_LOOP, 0, 6);
    }
    else
    {
        gl.uniform4f(hexagonProgram.uColor,
                     this.color.red()/255,
                     this.color.green()/255,
                     this.color.blue()/255,
                     1);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 6);
    }

    gl.disableVertexAttribArray(hexagonProgram.aPos);
};

/** Variant: Hexagon with a transparent stripe along one axis **/

// Set up vertices
var stripeWidth = hexSize / 6;

var stripedHexagonCoords = [ hexSize,    0,
                             hexSize/2,  height/2,
                             stripeWidth/2,  height/2,
                             stripeWidth/2,  -height/2,
                             hexSize/2, -height/2 ];

var stripedHexagonAngle = {
    a: 0,
    b: 2*pi/3,
    c: -2*pi/3,
};

var stripedHexagonVertices = {};

// Make sure to call this before trying to render a hexagon
function prepareStripedHexagons()
{
    stripedHexagonVertices = {};
    stripedHexagonVertices.data = new Float32Array(stripedHexagonCoords);

    stripedHexagonVertices.bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, stripedHexagonVertices.bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, stripedHexagonVertices.data, gl.STATIC_DRAW);
}

// The first two parameters are the coordinates of the hexagon's center.
// The axis should be an element of CubicAxis - the stripe will be perpendicular
// to that axis.
// The color is optional (default black).
// The scale is optional, the default is read from the global "defaultScale".
function StripedHexagon(x, y, axis, color, scale)
{
    this.hidden = false;

    this.x = x;
    this.y = y;

    this.axis = axis;

    this.color = color || [0, 0, 0];

    this.scale = scale || defaultScale;
    this.baseScale = this.scale;

    this.angle = stripedHexagonAngle[axis];
}

// Convenient setters
StripedHexagon.prototype.move = function(x, y) {
    this.x = x;
    this.y = y;
};

// scale should be relative to the this.baseScale (i.e., pass
// in 1 to resize to base scale; 1 is also the default).
StripedHexagon.prototype.resize = function(scale) {
    if (scale === undefined) scale = 1;
    this.scale = this.baseScale * scale;
};

StripedHexagon.prototype.hide = function() { this.hidden = true; };
StripedHexagon.prototype.show = function() { this.hidden = false; };

// Outline can optionally be set to true to render ... well ...
// only an outline.
StripedHexagon.prototype.render = function(outline) {
    if (this.hidden) return;

    gl.useProgram(hexagonProgram.program);

    gl.uniform2f(hexagonProgram.uCenter, this.x, this.y);
    gl.uniform1f(hexagonProgram.uScale, this.scale);

    gl.enableVertexAttribArray(hexagonProgram.aPos);
    gl.bindBuffer(gl.ARRAY_BUFFER, stripedHexagonVertices.bufferId);
    gl.vertexAttribPointer(hexagonProgram.aPos, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1f(hexagonProgram.uAngle, this.angle);
    if (outline)
    {
        gl.uniform4f(hexagonProgram.uColor,
                     0,
                     0,
                     0,
                     1);

        gl.drawArrays(gl.LINE_LOOP, 0, 5);
    }
    else
    {
        gl.uniform4f(hexagonProgram.uColor,
                     this.color.red()/255,
                     this.color.green()/255,
                     this.color.blue()/255,
                     1);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 5);
    }

    gl.uniform1f(hexagonProgram.uAngle, this.angle + pi);
    if (outline)
    {
        gl.uniform4f(hexagonProgram.uColor,
                     0,
                     0,
                     0,
                     1);

        gl.drawArrays(gl.LINE_LOOP, 0, 5);
    }
    else
    {
        gl.uniform4f(hexagonProgram.uColor,
                     this.color.red()/255,
                     this.color.green()/255,
                     this.color.blue()/255,
                     1);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 5);
    }

    gl.disableVertexAttribArray(hexagonProgram.aPos);
};
