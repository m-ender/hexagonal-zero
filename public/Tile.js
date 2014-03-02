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
