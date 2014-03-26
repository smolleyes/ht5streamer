var os = require('os');
var fs = require('fs');
var address = require('network-address');
var readTorrent = require('read-torrent');
var proc = require('child_process');
var popcornflix = require('peerflix');

var path = require('path');
var videoStreamer = null;
var refresh = true;

var numCores = (os.cpus().length > 0) ? os.cpus().length : 1;
var numConnections = 100;
// Minimum percentage to open video
MIN_PERCENTAGE_LOADED = 0.5;

// Minimum bytes loaded to open video
MIN_SIZE_LOADED = 10 * 1024 * 1024;

function getTorrent(file) {
  stopTorrent();
  var videoStreamer = null;
  
  // Create a unique file to cache the video (with a microtimestamp) to prevent read conflicts
  var tmpFilename = ( file.toLowerCase().split('/').pop().split('.torrent').shift() ).slice(0,100);
  tmpFilename = tmpFilename.replace(/([^a-zA-Z0-9-_])/g, '_') + '.mp4';
  var tmpFile = path.join(tmpFolder, tmpFilename);

  var numCores = (os.cpus().length > 0) ? os.cpus().length : 1;
  var numConnections = 100;
  
  $('.mejs-overlay-button').hide();
  $('#preloadTorrent').empty().remove();
  $('.mejs-container').append('<div id="preloadTorrent" \
  style="position: absolute;top: 45%;margin: 0 50%;color: white;font-size: 12px;text-align: center;z-index: 10000;width: 450px;right: 50%;left: -225px;"> \
  <p><b id="preloadProgress">Chargement du torrent : 0 % effectué</b></p> \
  <progress value="5" min="0" max="100">0%</progress> \
  </div>');
  
  videoStreamer = popcornflix(file, {
    // Set the custom temp file
    path: tmpFile,
    //port: 554,
    buffer: (1.5 * 1024 * 1024).toString(),
    connections: numConnections
  }, function (err, flix) {
    if (err) throw err;

    var started = Date.now(),
    refresh = true;
    loadedTimeout;
    
    flix.server.on('listening', function () {
      var href = 'http://'+ipaddress+':' + flix.server.address().port + '/';
      loadedTimeout ? clearTimeout(loadedTimeout) : null;
      
      var item = {};
      item.name = flix.selected.name;
      item.obj = flix;
      torrentsArr.push(item);
      
      var checkLoadingProgress = function () {
        try {
        var now = flix.downloaded,
        total = flix.selected.length,
        // There's a minimum size before we start playing the video.
        // Some movies need quite a few frames to play properly, or else the user gets another (shittier) loading screen on the video player.
          targetLoadedSize = MIN_SIZE_LOADED > total ? total : MIN_SIZE_LOADED,
          targetLoadedPercent = MIN_PERCENTAGE_LOADED * total / 100.0,

          targetLoaded = Math.max(targetLoadedPercent, targetLoadedSize),

          percent = (now / targetLoaded * 100.0).toFixed(2);
          var downloaded = bytesToSize(flix.downloaded, 2);
          
          if (now > targetLoaded) {
            clearTimeout(loadedTimeout);
            $('#preloadTorrent').remove();
            var stream = {};
            playFromHttp = true;
            stream.link = href;
            stream.next = '';
            stream.title = flix.selected.name;
            startPlay(stream);
          } else {
            console.log("wait loading " + percent + '% loaded');
            $('#preloadProgress').empty().append('Chargement du torrent : '+ percent +' % effectué');
            $('#preloadTorrent progress').attr('value',percent).text(percent);
            if (refresh === true) {
              loadedTimeout = setTimeout(checkLoadingProgress, 500);
            }
          }
          } catch(err) {
              console.log(err)
          }
      }
      checkLoadingProgress();
    });
    
});

}

function bytesToSize(bytes, precision) {	
	var kilobyte = 1024;
	var megabyte = kilobyte * 1024;
	var gigabyte = megabyte * 1024;
	var terabyte = gigabyte * 1024;

	if ((bytes >= 0) && (bytes < kilobyte)) {
		return bytes + ' Bits';

	} else if ((bytes >= kilobyte) && (bytes < megabyte)) {
		return (bytes / kilobyte).toFixed(precision) + ' Ko';

	} else if ((bytes >= megabyte) && (bytes < gigabyte)) {
		return (bytes / megabyte).toFixed(precision) + ' Mo';

	} else if ((bytes >= gigabyte) && (bytes < terabyte)) {
		return (bytes / gigabyte).toFixed(precision) + ' Go';

	} else if (bytes >= terabyte) {
		return (bytes / terabyte).toFixed(precision) + ' To';
	} else {
		return bytes + 'Bits';
	}
}
