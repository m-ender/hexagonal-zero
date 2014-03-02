
function Border(gridSize, hexD, color)
{
    this.gridSize = gridSize;
    this.hexD = hexD;

    this.color = color;

    var innerSize = (gridSize - 0.3) * hexD;
    var outerSize = 3*innerSize;

    var coords = [];

    for (var i = 0; i < 7; ++i)
    {
        var angle = pi/6 + i*pi/3;
        coords.push(cos(angle)*innerSize);
        coords.push(sin(angle)*innerSize);
        coords.push(cos(angle)*outerSize);
        coords.push(sin(angle)*outerSize);
    }

    this.vertices = {};
    this.vertices.data = new Float32Array(coords);

    this.vertices.bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices.bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices.data, gl.STATIC_DRAW);
}

Border.prototype.render = function() {
    gl.useProgram(hexagonProgram.program);

    gl.uniform2f(hexagonProgram.uCenter, 0, 0);
    gl.uniform1f(hexagonProgram.uScale, 1);
    gl.uniform1f(hexagonProgram.uAngle, 0);

    gl.enableVertexAttribArray(hexagonProgram.aPos);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices.bufferId);
    gl.vertexAttribPointer(hexagonProgram.aPos, 2, gl.FLOAT, false, 0, 0);

    gl.uniform4f(hexagonProgram.uColor,
                 this.color.red()/255,
                 this.color.green()/255,
                 this.color.blue()/255,
                 1);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 14);

    gl.disableVertexAttribArray(hexagonProgram.aPos);
};
