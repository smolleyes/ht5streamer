var torrentStream = require('torrent-stream');

MIN_PERCENTAGE_LOADED = 0.5;
//// Minimum bytes loaded to open video
MIN_SIZE_LOADED = 10 * 1024 * 1024;
var selected;
var loadedTimeout;


function getTorrent(link) {
  stopTorrent();
  if(link.indexOf('magnet:?xt') !== -1 ) {
      startTorrent(link);
  } else {
    console.log("link is not a magnet")
    // if url is given, it will be downloaded
    if((link.indexOf('http://') === -1)  && (link.indexOf('https://') === -1)) {
      try {
          var readTorrent = require('read-torrent');
          readTorrent(link, function(err, torrent) {
              startTorrent(torrent);
          });
      } catch(err) {
          console.log(err);
      }
    } else {
      console.log(link);
      request({url:link, encoding:null}, function (err, response, body) {
          if(err) {
              console.log(err);
              return;
          }
          startTorrent(body);
      });
    }
  }
}

function startTorrent(link) {
  console.log("torrent started", link);

  torEngine = torrentStream(link,{
    connections: 100
  });
  
  if ($('#preloadTorrent').length < 1 ) {
      $('.mejs-overlay-button').hide();
      $('#preloadTorrent').remove();
      $('.mejs-container').append('<div id="preloadTorrent" \
      style="position: absolute;top: 45%;margin: 0 50%;color: white;font-size: 12px;text-align: center;z-index: 10000;width: 450px;right: 50%;left: -225px;"> \
      <p><b id="preloadProgress"></b></p> \
      <progress value="5" min="0" max="100">0%</progress> \
      </div>');
  }
  
  torEngine.on('ready', function() {
    var started = Date.now();
    var needTranscode = false;
    selected = biggest(torEngine);
    console.log("Selected file:\n\n" + selected.name);
    var ext = selected.name.split('.').pop().toLowerCase();
    if(in_array(ext,videoArray) !== -1){
        console.log("\n- Is a multimedia file");
        if(in_array(ext,transcodeArray) !== -1){
            console.log("- Need transcoding");
            selected.needTranscoding = true;
        } else {
            console.log("- don't need transcoding");
            selected.needTranscoding = false;
        }
        selected.target = path.join(tmpFolder, selected.name);
        streamFile(selected);
    }
  });
}

function streamFile(file) {
    var item = {};
    item.name = file.name;
    var stream = file.createReadStream();
    var out = fs.createWriteStream(path.join(tmpFolder, file.name));
    stream.pipe(out);
    
    var obj = {};
    obj.name = selected;
    obj.obj = torEngine;
    torrentsArr.push(obj);
    
    autoRefresh();
    
    stream.on('end',function() {
        console.log("download terminated");
        clearTimeout(loadedTimeout);
    });
}

function autoRefresh() {
    loadedTimeout ? clearTimeout(loadedTimeout) : null;
    
    var now = torEngine.swarm.downloaded,
    total = selected.length,
    // There's a minimum size before we start playing the video.
    // Some movies need quite a few frames to play properly, or else the user gets another (shittier) loading screen on the video player.
    targetLoadedSize = MIN_SIZE_LOADED > total ? total : MIN_SIZE_LOADED,
    targetLoadedPercent = MIN_PERCENTAGE_LOADED * total / 100.0,
    targetLoaded = Math.max(targetLoadedPercent, targetLoadedSize),
    percent = (now / targetLoaded * 100.0).toFixed(2);
      
    var downloaded = bytesToSize(torEngine.swarm.downloaded, 2);
    var uploaded = bytesToSize(torEngine.swarm.uploaded, 2);
    var downloadRate = bytesToSize(torEngine.swarm.downloadSpeed(), 2);
    if (percent < 100) {
        if (percent > 0) {
          console.log('Chargement: '+ percent +' % effectué à '+ downloadRate +'/s');
          $('#preloadProgress').empty().append('Chargement  '+ percent +' % effectué à '+ downloadRate +'/s');
          $('#preloadTorrent progress').attr('value',percent).text(percent);
        } else {
          $('#preloadProgress').empty().append('Connexion... merci de patienter');
          console.log('Connexion... merci de patienter');
        }
        loadedTimeout = setTimeout(autoRefresh, 500);
    } else {
        $('#preloadTorrent').remove();
        clearTimeout(loadedTimeout);
        playFromHttp = true;
        var item = {};
        item.title=selected.name;
        if(playAirMedia){
          item.link='http://'+ipaddress+':8080'+selected.target;
        } else {
          item.link=selected.target;
        }
        item.next = '';
        startPlay(item);
    }
}

var biggest = function(torrent) {
  return torrent.files.reduce(function(biggest, file) {
    return biggest.length > file.length ? biggest : file;
  });
};

function bytesToSize(bytes, precision)
{	
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

function in_array(needle, haystack){
    var found = 0;
    for (var i=0, len=haystack.length;i<len;i++) {
        if (haystack[i] == needle) return i;
            found++;
    }
    return -1;
}
