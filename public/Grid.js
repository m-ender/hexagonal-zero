// Size is the number of hexagonal rings in the grid (including the center)
function Grid(size, colorGenerator) {
    this.grid = [];

    for (var q = -size + 1; q <= size - 1; ++q)
    {
        var column = [];

        for (var r = -size + 1; r <= size -1; ++r)
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
        x: 3/2 * q,
        y: sqrt(3) * (r + q/2),
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
