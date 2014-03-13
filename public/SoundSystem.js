
function SoundSystem(soundsToBeLoaded) {
    this.soundsMap = {};
    this.musicSource = null;

    try {
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContext();
        this.loadSounds(soundsToBeLoaded);
    } catch (e) {
        console.log("There seems to be no Web Audio API support in your browser.");
    }
}

SoundSystem.prototype.loadSounds = function(soundsToBeLoaded) {
    var system = this;
    for (var i = 0; i < soundsToBeLoaded.length; i++) {
        system.loadSound(soundsToBeLoaded[i], function(loadedSound) {
            if (loadedSound == "music") {
                system.playMusic();
            }
        });
    }
};

SoundSystem.prototype.loadSound = function(sound, loadCallback) {
    var name = sound["name"];
    var url = sound["url"];

    var system = this;
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";

    request.onload = function() {
        system.soundsMap[name] = null;
        if (this.status == 200) {
            system.context.decodeAudioData(this.response, function(buffer) {
                system.soundsMap[name] = buffer;
                loadCallback(name);
                console.log("Loaded " + name + " from " + url + ".");
            }, function(error) {
                console.log("Error decoding sound " + name + ".");
            });
        } else {
            console.log("Error loading sound " + name + ".");
        }
    };
    request.send();
};

SoundSystem.prototype.playMusic = function() {
    this.musicSource = this.context.createBufferSource();
    var buffer = this.soundsMap["music"];
    if (buffer == null) {
        return;
    }
    this.musicSource.buffer = buffer;
    this.musicSource.loop = true;

    var gainNode = this.context.createGain();
    gainNode.gain.value = 0.3;

    this.musicSource.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    this.musicSource.start(0);
};

SoundSystem.prototype.stopMusic = function() {
    if (this.musicSource != null) {
        this.musicSource.stop();
    }
};

SoundSystem.prototype.playEffect = function(name, filterFrequency) {
    var filterFrequency = filterFrequency || 5000;
    var soundSource = this.context.createBufferSource();
    var buffer = this.soundsMap[name];
    if (buffer == null) {
        return;
    }
    soundSource.buffer = buffer;

    var filter = this.context.createBiquadFilter();
    filter.type = 0;
    filter.frequency.value = filterFrequency;

    soundSource.connect(filter);
    filter.connect(this.context.destination);
    
    soundSource.start(0);
};

SoundSystem.prototype.rotateGrid = function(isClockwise) {
    this.playEffect("rotate");
};

SoundSystem.prototype.blipHex = function(hex) {
    this.playEffect("blip");
};

SoundSystem.prototype.selectHex = function(hex) {
    this.playEffect("select");
};

SoundSystem.prototype.swapHex = function(hex) {
    this.playEffect("swap");
};

SoundSystem.prototype.removeHex = function(hex) {
    this.playEffect("remove");
};

SoundSystem.prototype.failHex = function(hex) {
    this.playEffect("fail");
};

SoundSystem.prototype.bombHex = function(hex) {
    this.playEffect("bomb");
};

var soundSystem = new SoundSystem([
    {"name":"music","url":"sounds/music.mp3"},
    {"name":"blip","url":"sounds/blip.wav"},
    {"name":"select","url":"sounds/select.wav"},
    {"name":"swap","url":"sounds/swap.wav"},
    {"name":"remove","url":"sounds/remove.wav"},
    {"name":"fail","url":"sounds/fail.wav"},
    {"name":"bomb","url":"sounds/bomb.wav"},
    {"name":"rotate","url":"sounds/rotate.wav"}
]);
