// n is the number of distinct colors to be generated.
function ColorGenerator(n, baseColor) {
    this.baseColor = jQuery.Color(baseColor || '#74DDF2');
    this.n = n;
    this.i = 0;

    // For this.correctHue()
    this.hueCorrection = [
        [5,10],
        [45,30],
        [70,50],
        [94,70],
        [100,110],
        [115,125],
        [148,145],
        [177,160],
        [179,182],
        [185,188],
        [225,210],
        [255,250]
    ];

    this.colors = [];
    for (var i = 0; i < n; ++i)
    {
        this.colors.push(
            this.baseColor.hue(this.correctHue(this.baseColor.hue() + i/n * 360))
        );
    }
}

ColorGenerator.prototype.nextColor = function() {
    var color = this.colors[this.i];

    this.i = (this.i+1) % this.n;
    return color;
};

ColorGenerator.prototype.getColor = function(i) {
    return this.colors[i];
};

ColorGenerator.prototype.getRandomColor = function() {
    return this.colors[floor(Math.random()*this.n)];
};

// Hue correction code from http://vis4.net/labs/colorscales/
ColorGenerator.prototype.correctHue = function(hue) {
    hue = hue * (256/360) % 255;
    var lx = 0;
    var ly = 0;

    for (var i = 0; i < this.hueCorrection.length; ++i)
    {
        var pair = this.hueCorrection[i];
        if (hue === pair[0])
            return pair[1];
        else if (hue < pair[0])
        {
            var newHue = ly + (pair[1] - ly)/(pair[0] - lx) * (hue - lx);
            return Math.floor(newHue * 360/256);
        }

        lx = pair[0];
        ly = pair[1];
    }
};
