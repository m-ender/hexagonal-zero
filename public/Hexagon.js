// Distance from the centre to each vertex
var size = 1;
var width = 2*size;
var height = sqrt(3) * size;

var hexagonCoords = [ size,    0,
                      size/2,  height/2,
                     -size/2,  height/2,
                     -size,    0,
                     -size/2, -height/2,
                      size/2, -height/2 ];


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
function Hexagon(x, y, color)
{
    this.hidden = false;

    this.x = x;
    this.y = y;

    this.color = color || [0, 0, 0];
}

Hexagon.prototype.hide = function() { this.hidden = true; };
Hexagon.prototype.show = function() { this.hidden = false; };

Hexagon.prototype.render = function() {
    if (this.hidden) return;

    gl.useProgram(hexagonProgram.program);

    gl.uniform2f(hexagonProgram.uCenter, this.x, this.y);
    gl.uniform4f(hexagonProgram.uColor,
                 this.color.red()/255,
                 this.color.green()/255,
                 this.color.blue()/255,
                 1);

    gl.enableVertexAttribArray(hexagonProgram.aPos);
    gl.bindBuffer(gl.ARRAY_BUFFER, hexagonVertices.bufferId);
    gl.vertexAttribPointer(hexagonProgram.aPos, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 6);

    gl.disableVertexAttribArray(hexagonProgram.aPos);
};
