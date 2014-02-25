// Basis vectors along q and r
var iq = { x: 3/2,
           y: -sqrt(3)/2 };

var ir = { x: 0,
           y: -sqrt(3) };

// Size is the number of hexagonal rings in the grid (including the center)
function Grid(size, colorGenerator) {
    this.grid = [];

    for (var q = -size + 1; q <= size - 1; ++q)
    {
        var column = [];

        for (var r = -size + 1; r <= size - 1; ++r)
        {
            var s = - q - r;
            if (abs(s) >= size)
                continue;

            var center = this.axialToPixel(q,r);
            column.push(new Hexagon(center.x, center.y, colorGenerator.nextColor()));
        }

        this.grid.push(column);
    }
}

Grid.prototype.axialToPixel = function(q, r) {
    return {
        x: q * iq.x + r * ir.x,
        y: q * iq.y + r * ir.y,
    };
};

Grid.prototype.render = function() {
    for (var i = 0; i < this.grid.length; ++i)
    {
        var column = this.grid[i];
        for (var j = 0; j < column.length; ++j)
        {
            column[j].render();
        }
    }
};
