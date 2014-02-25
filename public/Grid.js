// Basis vectors along q and r
var iq = { x: 3/2,
           y: -sqrt(3)/2 };

var ir = { x: 0,
           y: -sqrt(3) };

// Size is the number of hexagonal rings in the grid (including the center)
function Grid(size, nTypes, colorGenerator) {
    this.size = size;
    this.nTypes = nTypes;

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
            var type = floor(Math.random() * nTypes);
            column.push({
                q: q,
                r: r,
                s: s,
                type: type,
                geometry: new Hexagon(center.x, center.y, colorGenerator.getColor(type)),
            });
        }

        this.grid.push(column);
    }
}

Grid.prototype.axialToPixel = function(q, r) {
    return {
        x: 3/2 * q,
        y: -sqrt(3) * (q/2 + r),
    };
};

Grid.prototype.pixelToAxial = function(x, y) {
    var q = 2/3 * x;
    var r = (- sqrt(3)*y - x)/3;
    var s = - q - r;

    var rq = round(q);
    var rr = round(r);
    var rs = round(s);

    var dq = abs(q - rq);
    var dr = abs(r - rr);
    var ds = abs(s - rs);

    if (dq > dr && dq > ds)
        rq = -rr-rs;
    else if (dr > ds)
        rr = -rq-rs;

    return {
        q: rq,
        r: rr,
    };
};

Grid.prototype.get = function(q, r) {
    var s = - q - r;
    if (abs(q) >= this.size ||
        abs(r) >= this.size ||
        abs(s) >= this.size)
        return null;

    var i = q + (this.size - 1);
    var j = r + min(i, this.size - 1);

    return this.grid[i][j];
};

Grid.prototype.render = function() {
    for (var i = 0; i < this.grid.length; ++i)
    {
        var column = this.grid[i];
        for (var j = 0; j < column.length; ++j)
        {
            column[j].geometry.render();
        }
    }
};
