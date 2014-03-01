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
// Indexing by any two cubic coordinates, the range of values in the
// hexagonal grid looks like this (taking the example of a and c with
// a grid size of 3):
//
//    a -3 -2 -1  0  1  2  3
//  c
// -3    .  .  .  X  X  X  X
// -2    .  .  X  X  X  X  X
// -1    .  X  X  X  X  X  X
//  0    X  X  X  X  X  X  X
//  1    X  X  X  X  X  X  .
//  2    X  X  X  X  X  .  .
//  3    X  X  X  X  .  .  .
//
// You can iterate over such a range, left to right, top to bottom,
// by iterating as follows:
//   a over [-size+1, size-1]
//     c over [-size+1 - min(0,a), size-1 - max(0,a)]
// The same works for all cyclic permutations of a, b, c.
//
// Note that our actual storage does not include those empty corners.
// We store the grid in a 2D array (i.e. array of arrays) where the
// first index i varies with q (or a) and the second index j with r (or b).
// However, in general i != q and j != r. Imagine that in the above image
// we eliminate the top left corner by moving the first three columns to
// the top, then this is how we index our storage:
//
//    i  0  1  2  3  4  5  6
//  j
//  0    X  X  X  X  X  X  X
//  1    X  X  X  X  X  X  X
//  2    X  X  X  X  X  X  X
//  3    X  X  X  X  X  X  X
//  4       X  X  X  X  X
//  5          X  X  X
//  6             X

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

// The name of the orientation refers to the axis pointing to the right.
// The value are designed such that you can simply increment or
// decrement the current orientation when rotating the grid (by
// modulus 6, of course) - then you only have use this "enum" to
// find out the current orientation.
// A counter-clockwise orientation corresponds to an increment in
// the orientation.
var Orientation = {
    PlusA:  0,
    MinusB: 1,
    PlusC:  2,
    MinusA: 3,
    PlusB:  4,
    MinusC: 5,
};


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
            var b = - q - r;
            if (abs(b) >= size)
                continue;

            var center = this.axialToPixel(q,r);
            var type = floor(Math.random() * nTypes);
            column.push({
                a: q,
                b: b,
                c: r,
                type: type,
                geometry: new Hexagon(center.x, center.y, colorGenerator.getColor(type)),
            });
        }

        this.grid.push(column);
    }

    this.orientation = Orientation.PlusA;
}

// cw is an optional flag to initiate a clockwise rotation
// (counter-clockwise is default)
Grid.prototype.rotate = function(cw) {
    if (cw)
        // We increment by 5 instead of decrementing by 1, in order
        // to remain in the positive regime. Otherwise the modulus
        // will return a negative number.
        this.orientation = (this.orientation + 5) % 6;
    else
        this.orientation = (this.orientation + 1) % 6;
};

Grid.prototype.swap = function(hex1, hex2) {
    var q1 = hex1.a;
    var r1 = hex1.c;
    var q2 = hex2.a;
    var r2 = hex2.c;

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

    this.grid[i1][j1] = hex2;
    this.grid[i2][j2] = hex1;
};

Grid.prototype.remove = function(hex) {
    var q = hex.a;
    var r = hex.c;

    var i = q + (this.size - 1);
    var j = r + min(i, this.size - 1);

    delete this.grid[i][j];
};

Grid.prototype.hasMatches = function() {
    var q, r;
    var lastType, matchLength;
    var hex;

    // TODO: Avoid traversing "empty corners" of rhombi.

    // We need to iterate over the grid once in each direction.
    // However, these iterations only differ by cycling through
    // the three cubic axes, so we do this by a fancy permutation
    // loop.
    var permutations = [
        { i: 'a', j: 'b', k: 'c' }, // traverse rows of constant a by c (columns top to bottom)
        { i: 'b', j: 'c', k: 'a' }, // traverse rows of constant b by a (bottom left to top right)
        { i: 'c', j: 'a', k: 'b' }, // traverse rows of constant c by b (bottom right to top left)
    ];

    var pos = {
        a: null,
        b: null,
        c: null,
    };

    for (var permi = 0; permi < permutations.length; ++permi)
    {
        var p = permutations[permi];
        for (pos[p.i] = -this.size+1; pos[p.i] <= this.size-1; ++pos[p.i])
        {
            matchLength = 1;
            lastType = null;
            for (pos[p.k] = -this.size+1; pos[p.k] <= this.size-1; ++pos[p.k])
            {
                pos[p.j] = -pos[p.i]-pos[p.k];
                q = pos.a;
                r = pos.c;
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
    }

    return false;
};

// This just returns all hex cells that are part of a match, without any
// information about which group of cells forms each match.
Grid.prototype.getMatchedHexes = function() {
    var q, r;
    var lastType, matchLength;
    var hex;

    var matchedHexes = [];

    // Unmark all cells
    for (var i = 0; i < this.grid.length; ++i)
        for (var j = 0; j < this.grid[i].length; ++j)
            this.grid[i][j].marked = false;

    // We need this in two places so create an internal helper function.
    // Given permutation p, and row i it iterates over cell range
    // [k_min, k_max] and saves all hexes to matchedHexes that haven't
    // been saved there before.
    var that = this;
    var collectHexes = function (p, i, k_min, k_max) {
        var pos = {
            a: null,
            b: null,
            c: null,
        };

        pos[p.i] = i;

        // Traverse the match again, saving each hex that hasn't
        // been saved before
        for (pos[p.k] = k_min; pos[p.k] <= k_max; ++pos[p.k])
        {
            pos[p.j] = -pos[p.i]-pos[p.k];
            var q = pos.a;
            var r = pos.c;
            var hex = that.get(q,r);

            if (!hex.marked)
            {
                matchedHexes.push(hex);
                hex.marked = true;
            }
        }
    };

    // We need to iterate over the grid once in each direction.
    // However, these iterations only differ by cycling through
    // the three cubic axes, so we do this by a fancy permutation
    // loop. The directions in the following comments correspond
    // to the grid's orientation being the default PlusA.
    var permutations = [
        { i: 'a', j: 'b', k: 'c' }, // traverse rows of constant a by c (columns top to bottom)
        { i: 'b', j: 'c', k: 'a' }, // traverse rows of constant b by a (bottom left to top right)
        { i: 'c', j: 'a', k: 'b' }, // traverse rows of constant c by b (bottom right to top left)
    ];

    var pos = {
        a: null,
        b: null,
        c: null,
    };

    for (var permi = 0; permi < permutations.length; ++permi)
    {
        var p = permutations[permi];
        for (pos[p.i] = -this.size+1; pos[p.i] <= this.size-1; ++pos[p.i])
        {
            matchLength = 1;
            lastType = null;
            for (pos[p.k] = -this.size+1 - min(0,pos[p.i]);
                 pos[p.k] <= this.size-1 - max(0,pos[p.i]);
                 ++pos[p.k])
            {
                pos[p.j] = -pos[p.i]-pos[p.k];
                q = pos.a;
                r = pos.c;
                hex = this.get(q,r);

                if (!hex) continue;

                if (hex.type === lastType)
                {
                    ++matchLength;
                }
                else
                {
                    if (matchLength >= 3)
                        collectHexes(p, pos[p.i], pos[p.k] - matchLength, pos[p.k] - 1);

                    matchLength = 1;
                    lastType = hex.type;
                }
            }

            if (matchLength >= 3)
                collectHexes(p, pos[p.i], pos[p.k] - matchLength, pos[p.k] - 1);
        }
    }

    return matchedHexes;
};

// This fills all existing gaps by moving the above cells down. It does not
// refill the empty cells that will appear at the top.
// Returns a list of all hexes that have been moved around. The hexes are
// grouped by columns (in the current orientation).
Grid.prototype.closeGaps = function() {
    var columns = [];

    // We need to iterate over the grid in columns from bottom to top.
    // However, how we assign "columns", "bottom" and "top" to the cubic
    // axes depends on the orientation of the grid.
    // p is going to be the permutation of the cubic axes (where we iterate
    // over rows of constant 'i' along 'k'); dk is going to +/- 1 to indicate
    // the direction from bottom to top.
    var p, dk;
    switch (this.orientation)
    {
        case Orientation.PlusA:
            p = { i: 'a', j: 'b', k: 'c' };
            dk = -1;
            break;
        case Orientation.PlusB:
            p = { i: 'b', j: 'c', k: 'a' };
            dk = -1;
            break;
        case Orientation.PlusC:
            p = { i: 'c', j: 'a', k: 'b' };
            dk = -1;
            break;
        case Orientation.MinusA:
            p = { i: 'a', j: 'b', k: 'c' };
            dk = +1;
            break;
        case Orientation.MinusB:
            p = { i: 'b', j: 'c', k: 'a' };
            dk = +1;
            break;
        case Orientation.MinusC:
            p = { i: 'c', j: 'a', k: 'b' };
            dk = +1;
            break;
    }

    // We'll move cells from this position...
    var fromPos = {
        a: null,
        b: null,
        c: null,
    };

    // ...to this position.
    var toPos = {
        a: null,
        b: null,
        c: null,
    };

    // Initially they will be equal, but their difference will increase
    // by 1 for each missing cell.
    for (fromPos[p.i] = -this.size+1;
         fromPos[p.i] <= this.size-1;
         ++fromPos[p.i])
    {
        toPos[p.i] = fromPos[p.i];

        var shiftedHexes = [];

        // Figuring out the bounds is a bit tricky here, depending on which
        // direction we need to walk the column. We could probably do this
        // analytically in a single step, but it's conceptually easier, to
        // just swap the bounds if dk is positive.
        var k_bottom = this.size-1 - max(0,fromPos[p.i]);
        var k_top = -this.size+1 - min(0,fromPos[p.i]);

        if (dk > 0)
        {
            var temp = k_bottom;
            k_bottom = k_top;
            k_top = temp;
        }

        for (fromPos[p.k] = k_bottom, toPos[p.k] = k_bottom;
             fromPos[p.k] !== k_top + dk; // I'm not sure if it's uglier to use !== or
                                     // dk*k <= dk*k_top.
             fromPos[p.k] += dk)
        {
            fromPos[p.j] = -fromPos[p.i]-fromPos[p.k];
            var fromQ = fromPos.a;
            var fromR = fromPos.c;

            var fromIndex = this.axialToIndex(fromQ, fromR);
            var hex = this.grid[fromIndex.i][fromIndex.j];

            if (hex)
            {
                // Don't move the hex if fromPos and toPos are
                // the same.
                if (toPos[p.k] !== fromPos[p.k])
                {
                    toPos[p.j] = -toPos[p.i]-toPos[p.k];
                    var toQ = toPos.a;
                    var toR = toPos.c;

                    var toIndex = this.axialToIndex(toQ, toR);
                    this.grid[toIndex.i][toIndex.j] = hex;
                    this.grid[fromIndex.i][fromIndex.j] = null;

                    hex.a = toQ;
                    hex.b = -toQ-toR;
                    hex.c = toR;

                    // Fill a targetX/targetY variable, which can be
                    // used to move the geometry to the new position.
                    var center = this.axialToPixel(toQ, toR);
                    hex.targetX = center.x;
                    hex.targetY = center.y;

                    shiftedHexes.push(hex);
                }

                toPos[p.k] += dk;
            }
            // else -> nothing ... This leads to fromPos being
            // incremented while toPos remains the same, hence
            // bridging the gap.
        }

        columns.push( {
            shiftedHexes: shiftedHexes,
            missingHexes: abs(fromPos[p.k] - toPos[p.k]),
        });
    }

    return columns;
};

// Traverses the grid and fills all empty cells randomly.
// Returns a list of all new hexes.
Grid.prototype.refill = function() {
    var newHexes = [];

    // TODO: By taking into account the orientation of the grid
    //       and assuming that only cells at the top are empty, we
    //       optimize this loop quite a lot.
    for (var q = -this.size+1; q <= this.size-1; ++q)
    {
        for (var r = -this.size+1 - min(0,q); r <= this.size-1 - max(0,q); ++r)
        {
            var index = this.axialToIndex(q,r);
            if (!this.grid[index.i][index.j])
            {
                var center = this.axialToPixel(q,r);
                var type = floor(Math.random() * this.nTypes);

                var hex = {
                    a: q,
                    b: -q-r,
                    c: r,
                    type: type,
                    geometry: new Hexagon(center.x, center.y, colorGenerator.getColor(type)),
                };

                this.grid[index.i][index.j] = hex;
                newHexes.push(hex);
            }
        }
    }

    return newHexes;
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

// Returns a hex given axial coordinates
Grid.prototype.get = function(q, r) {
    var index = this.axialToIndex(q,r);

    return index ? this.grid[index.i][index.j] : null;
};

// Converts axial coordinates into grid-array indices
Grid.prototype.axialToIndex = function(q, r) {
    var b = - q - r;
    if (abs(q) >= this.size ||
        abs(b) >= this.size ||
        abs(r) >= this.size)
        return null;

    var i = q + (this.size - 1);
    var j = r + min(i, this.size - 1);
    return {
        i: i,
        j: j,
    };
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
            if (column[j])
                column[j].geometry.render();
        }
    }
};
