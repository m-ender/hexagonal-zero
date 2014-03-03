// color is just an integer in the range [0,nColors]
function RegularTile(a, b, c, color) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.color = color;

    var center = axialToPixel(a,c);
    this.geometry = new Circle(center.x, center.y, colorGenerator.getColor(color));
}

// If matched, eliminates all its nearest neighbours.
function HexBomb(a, b, c, color) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.color = color;

    var center = axialToPixel(a,c);
    this.geometry = new Hexagon(center.x, center.y, colorGenerator.getColor(color));
}

// If matched, eliminates the entire row it's in.
// The axis should be an element of CubicAxis - the row that will be
// eliminated is the one along which the given coordinate is constant
// (i.e. which is perpendicular to the given axis)
function RowBomb(a, b, c, color, axis) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.axis = axis;
    this.color = color;

    var center = axialToPixel(a,c);
    this.geometry = new StripedHexagon(center.x, center.y, axis, colorGenerator.getColor(color));
}

function ColorBomb(a, b, c) {
    this.a = a;
    this.b = b;
    this.c = c;

    this.color = NaN; // shouldn't participate in any match

    var center = axialToPixel(a,c);
    this.geometry = new Hexagon(center.x, center.y, $.Color('#ddd'));
}
