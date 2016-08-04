// fork getUserMedia for multiple browser versions, for those
// that need prefixes

navigator.getUserMedia = (navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia);

// set up forked web audio context, for multiple browsers
// window. is needed otherwise Safari explodes

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();





//set up the different audio nodes we will use for the app

var analyserFrequency = audioCtx.createAnalyser();
analyserFrequency.minDecibels = -90;
analyserFrequency.maxDecibels = -10;
analyserFrequency.smoothingTimeConstant = 0.85;

var analyserSineWaves = audioCtx.createAnalyser();
analyserSineWaves.minDecibels = -90;
analyserSineWaves.maxDecibels = -10;
analyserSineWaves.smoothingTimeConstant = 0.85;

var analyserSonogram = audioCtx.createAnalyser();
analyserSonogram.minDecibels = -90;
analyserSonogram.maxDecibels = -10;
analyserSonogram.smoothingTimeConstant = 0.85;


//var intendedWidth = document.querySelector('.wrapper').clientWidth;
var intendedWidth = window.outerWidth;

var canvasSineWaves = document.querySelector('#visualizerSineWaves');
var canvasCtxSineWaves = canvasSineWaves.getContext("2d");
canvasSineWaves.setAttribute('width', intendedWidth);

var canvasFrequency = document.querySelector('#visualizerFrequency');
var canvasCtxFrequency = canvasFrequency.getContext("2d");
canvasFrequency.setAttribute('width', intendedWidth);


var canvasSonogram = document.querySelector('#visualizerSonogram');
var canvasCtxSonogram = canvasSonogram.getContext("2d");
canvasSonogram.setAttribute('width', intendedWidth);



var drawVisual;
var gainNode = audioCtx.createGain();

var distortion = audioCtx.createWaveShaper();
var biquadFilter = audioCtx.createBiquadFilter();
var convolver = audioCtx.createConvolver();


var audioRecorder = null;

var recIndex = 0;

var analyserView1;

var gl = canvasSonogram.getContext("webgl");

var aaaa = (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) > 0);

var canvasSonogram = document.getElementById('visualizerSonogram');


var canvasCtxSonogram = canvasSonogram.getContext("experimental-webgl");
console.log("gl - >" + canvasCtxSonogram);

if (navigator.getUserMedia) {

    console.log('getUserMedia supported.');

    analyserView1 = new AnalyserView("visualizerSonogram");

    navigator.getUserMedia(
       // constraints - only audio needed for this app
       {
           audio: true
       },

       // Success callback
       function (stream) {

    

          
         

           source = audioCtx.createMediaStreamSource(stream);

           audioRecorder = new Recorder(source);
          

           source.connect(analyserSineWaves);
           source.connect(analyserFrequency);
           source.connect(analyserSonogram);

           //analyserSineWaves.connect(gainNode);
           //analyserFrequency.connect(gainNode);

           analyserSineWaves.connect(biquadFilter);
           analyserFrequency.connect(biquadFilter);

           biquadFilter.connect(gainNode);

           gainNode.gain.value = 0.0;
           gainNode.connect(audioCtx.destination);





           visualize();

       },

       // Error callback
       function (err) {
           console.log('The following gUM error occured: ' + err);
       }
    );
} else {
    console.log('getUserMedia not supported on your browser!');
}

function visualize() {


    analyserSineWaves.fftSize = 2048;
    analyserFrequency.fftSize = 256;
    analyserSonogram.fftSize = 2048;

    analyserView1.initByteBuffer(analyserSonogram);


    function draw() {

        drawVisual = requestAnimationFrame(draw);
        drawSineWaves();
        drawFrequency();
        analyserView1.doFrequencyAnalysis(analyserSonogram);
    };

    draw();


}

function drawFrequency() {

    var bufferLength = analyserFrequency.frequencyBinCount;

    var dataArray = new Uint8Array(bufferLength);

    canvasCtxFrequency.clearRect(0, 0, canvasFrequency.width, canvasFrequency.height);




    analyserFrequency.getByteFrequencyData(dataArray);

    canvasCtxFrequency.fillStyle = 'rgb(0, 0, 0)';
    canvasCtxFrequency.fillRect(0, 0, canvasFrequency.width, canvasFrequency.height);

    var barWidth = (canvasFrequency.width / bufferLength) * 2.5;
    var barHeight;
    var x = 0;

    for (var i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];

        canvasCtxFrequency.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
        canvasCtxFrequency.fillRect(x, canvasFrequency.height - barHeight / 2, barWidth, barHeight / 2);

        x += barWidth + 1;
    }


}

function drawSineWaves() {

    var WIDTH = canvasSineWaves.width;
    var HEIGHT = canvasSineWaves.height;

    var bufferLength = analyserSineWaves.fftSize;
    var dataArray = new Uint8Array(bufferLength);

    analyserSineWaves.getByteTimeDomainData(dataArray);

    canvasCtxSineWaves.fillStyle = 'rgb(0, 0, 0)';
    canvasCtxSineWaves.fillRect(0, 0, WIDTH, HEIGHT);

    canvasCtxSineWaves.lineWidth = 2;
    canvasCtxSineWaves.strokeStyle = 'rgb(255, 255, 255)';

    canvasCtxSineWaves.beginPath();

    var sliceWidth = WIDTH * 1.0 / bufferLength;
    var x = 0;

    for (var i = 0; i < bufferLength; i++) {

        var v = dataArray[i] / 128.0;
        var y = v * HEIGHT / 2;

        if (i === 0) {
            canvasCtxSineWaves.moveTo(x, y);
        } else {
            canvasCtxSineWaves.lineTo(x, y);
        }

        x += sliceWidth;
    }

    canvasCtxSineWaves.lineTo(canvasSineWaves.width, canvasSineWaves.height / 2);
    canvasCtxSineWaves.stroke();

}

function toggleRecording(e) {
    if (e.classList.contains("recording")) {
        // stop recording
        audioRecorder.stop();
        e.classList.remove("recording");
        audioRecorder.getBuffers(gotBuffers);

    } else {
        // start recording
        if (!audioRecorder)
            return;
        e.classList.add("recording");
        audioRecorder.clear();
        audioRecorder.record();
    }
}


function gotBuffers(buffers) {
    //var canvas = document.getElementById("wavedisplay");

    //drawBuffer(canvas.width, canvas.height, canvas.getContext('2d'), buffers[0]);

    // the ONLY time gotBuffers is called is right after a new recording is completed - 
    // so here's where we should set up the download.
    audioRecorder.exportWAV(doneEncoding);
}

function doneEncoding(blob) {
    Recorder.setupDownload(blob, "myRecording" + ((recIndex < 10) ? "0" : "") + recIndex + ".wav");
    recIndex++;
}