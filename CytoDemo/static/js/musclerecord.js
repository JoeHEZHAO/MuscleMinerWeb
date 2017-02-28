
var audio_context;
var recorder;

function __log(e, data) {
  if(debug) console.log("\n" + e + " " + (data || ''));
  //log.innerHTML += "\n" + e + " " + (data || '');
}

function startUserMedia(stream) {
  var input = audio_context.createMediaStreamSource(stream);
  __log('Media stream created.' );
  __log("input sample rate " +input.context.sampleRate);

  // Feedback!
  input.connect(audio_context.destination);
  __log('Input connected to audio context destination.');
  recorder = new Recorder(input, {
    numChannels: 1
  });
  __log('Recorder initialised.');
}

function startRecording(button) {
  recorder && recorder.record();
  button.disabled = true;
  button.nextElementSibling.disabled = false;
  $(button).hide();
  $(button.nextElementSibling).show();
  __log('Recording...');
}

function stopRecording(button) {
  recorder && recorder.stop();
  button.disabled = true;
  button.previousElementSibling.disabled = false;
  $(button).hide();
  $(button.previousElementSibling).show();
  __log('Stopped recording.');

  // create WAV download link using audio data blob
  createDownloadLink();

  recorder.clear();
}

function createDownloadLink() {
  recorder && recorder.exportWAV(function(blob) {
    var url = URL.createObjectURL(blob);
    var li = document.createElement('li');
    var au = document.createElement('audio');
    //var hf = document.createElement('a');
    var seluid = $(".region-tag.selected").attr('id');
    au.controls = true;
    au.src = url;
    au.style.width='180px';

    //hf.href = url;
    //hf.download = 	ImageInfo[currentImage].source+'_ROI_'+seluid+'.wav';//new Date().toISOString() + '.wav';
    if( debug )console.log(ImageInfo[currentImage].source+'-ROI-'+seluid+'.wav');
    //hf.innerHTML = hf.download;
    li.appendChild(au);
    //li.appendChild(hf);

    recordingslist=$('#rl-'+seluid);
    recordingslist.empty();
    recordingslist.append(li);
  });
}

window.onload = function init() {
  try {
    // webkit shim
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    navigator.getUserMedia = ( navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia);
      window.URL = window.URL || window.webkitURL;

      audio_context = new AudioContext;
      __log('Audio context set up.');
      __log('navigator.getUserMedia ' + (navigator.getUserMedia ? 'available.' : 'not present!'));
    } catch (e) {
      alert('No web audio support in this browser!');
    }

    navigator.getUserMedia({audio: true}, startUserMedia, function(e) {
      __log('No live audio input: ' + e);
    });
  };
