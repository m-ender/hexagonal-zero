// Most of the algorithms in here are taking from this amazing article:
// http://www.redblobgames.com/grids/hexagons
// We're using axial coordinates for storage and cubic coordinates for
// most algorithms. Note that we're referring to the cubic coordinates
// as a, b, c, in order to distinguish them from the pixel space
// coordinates x, y, z. As in the article, we assign the axial axes as
// follows: q = a, r = c.
// The grid uses flat-top hexagons, with (0,0,0) being at the center.
// If the grid is at its default orientation, +a points to the right,
// +b to the top left, +c to the bottom left.

// Basis vectors along a, b and c
var ia = { x: 3/2,
           y: 0    };

var ib = { x: -3/4,
           y: 3*sqrt(3)/4 };

var ic = { x: -3/4,
           y: -3*sqrt(3)/4 };

// Basis vectors along q and r. These are different from ia and ib,
// because they incorporate implicit changes in c as well.
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
            var c = - q - r;
            if (abs(c) >= size)
                continue;

            var center = this.axialToPixel(q,r);
            var type = floor(Math.random() * nTypes);
            column.push({
                a: q,
                b: r,
                c: c,
                type: type,
                geometry: new Hexagon(center.x, center.y, colorGenerator.getColor(type)),
            });
        }

        this.grid.push(column);
    }
}

Grid.prototype.swap = function(hex1, hex2) {
    var q1 = hex1.a;
    var r1 = hex1.b;
    var q2 = hex2.a;
    var r2 = hex2.b;

    var i1 = q1 + (this.size - 1);
    var j1 = r1 + min(i1, this.size - 1);

    var i2 = q2 + (this.size - 1);
    var j2 = r2 + min(i2, this.size - 1);

    var atemp = hex1.a;
    var btemp = hex1.b;
    var ctemp = hex1.c;

    hex1.a = hex2.a;
    hex1.b = hex2.b;
    hex1.c = hex2.c;

    hex2.a = atemp;
    hex2.b = btemp;
    hex2.c = ctemp;

    var center1 = this.axialToPixel(hex1.a, hex1.b);
    var center2 = this.axialToPixel(hex2.a, hex2.b);

    this.grid[i1][j1] = hex2;
    this.grid[i2][j2] = hex1;
};

Grid.prototype.hasMatches = function() {
    var x, y, z, q, r;
    var lastType, matchLength;
    var hex;

    // TODO: Avoid traversing "empty corners" of rhombi.

    // Search rows of constant x (vertical columns)
    for (x = -this.size+1; x <= this.size-1; ++x)
    {
        matchLength = 1;
        lastType = null;
        for (z = -this.size+1; z <= this.size-1; ++z)
        {
            q = x;
            r = z;
            hex = this.get(q,r);

            if (!hex) continue;

            if (hex.type === lastType)
            {
                if (++matchLength >= 3) return true;
            }
            else
            {
                matchLength = 1;
                lastType = hex.type;
            }
        }
    }

    // Search rows of constant y (bottom left to top right)
    for (y= -this.size+1; y <= this.size-1; ++y)
    {
        matchLength = 1;
        lastType = null;
        for (x = -this.size+1; x <= this.size-1; ++x)
        {
            q = x;
            r = -x-y;
            hex = this.get(q,r);

            if (!hex) continue;

            if (hex.type === lastType)
            {
                if (++matchLength >= 3) return true;
            }
            else
            {
                matchLength = 1;
                lastType = hex.type;
            }
        }
    }

    // Search rows of constant z (bottom right to top left)
    for (z= -this.size+1; z <= this.size-1; ++z)
    {
        matchLength = 1;
        lastType = null;
        for (y = -this.size+1; y <= this.size-1; ++y)
        {
            q = -y-z;
            r = z;
            hex = this.get(q,r);

            if (!hex) continue;

            if (hex.type === lastType)
            {
                if (++matchLength >= 3) return true;
            }
            else
            {
                matchLength = 1;
                lastType = hex.type;
            }
        }
    }

    return false;
};

Grid.prototype.axialToPixel = function(q, r) {
    return {
        x: 3/2 * q,
        y: -sqrt(3) * (q/2 + r),
    };
};

Grid.prototype.pixelToAxial = function(x, y) {
    var a = 2/3 * x;
    var b = (- sqrt(3)*y - x)/3;
    var c = - a - b;

    var ra = round(a);
    var rb = round(b);
    var rc = round(c);

    var da = abs(a - ra);
    var db = abs(b - rb);
    var dc = abs(c - rc);

    if (da > db && da > dc)
        ra = -rb-rc;
    else if (db > dc)
        rb = -ra-rc;

    return {
        q: ra,
        r: rb,
    };
};

Grid.prototype.get = function(q, r) {
    var c = - q - r;
    if (abs(q) >= this.size ||
        abs(r) >= this.size ||
        abs(c) >= this.size)
        return null;

    var i = q + (this.size - 1);
    var j = r + min(i, this.size - 1);

    return this.grid[i][j];
};

Grid.prototype.manhattanDistance = function(hex1, hex2) {
    return max(abs(hex1.a - hex2.a),
               abs(hex1.b - hex2.b),
               abs(hex1.c - hex2.c));
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
