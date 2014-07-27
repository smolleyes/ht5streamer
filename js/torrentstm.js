var torrentStreamer = require('torrent-stream');
var parseTorrent = require('parse-torrent');
var readTorrent = require('read-torrent');
var tmpFolder = path.join(os.tmpDir(), 'ht5Torrents');
if( ! fs.existsSync(tmpFolder) ) { fs.mkdir(tmpFolder); }

MIN_PERCENTAGE_LOADED = 0.5;
//// Minimum bytes loaded to open video
MIN_SIZE_LOADED = 10 * 1024 * 1024;
var selectedFile;
var loadedTimeout;
var torEngine;

function getTorrent(link) {
  if(link.indexOf('magnet:?xt') !== -1 ) {
      startTorrent(link);
  } else {
    console.log("link is not a magnet")
    // if url is given, it will be downloaded
    request({url:link, encoding:null}, function (err, response, body) {
        if(err) {
            console.log(err);
            return;
        }
        
        var parsed
        try {
          parsed = parseTorrent(body)
        } catch (e) {
          // the torrent file was corrupt
          console.error(e)
        }
        
        readTorrent(link, function(err, torrent) {
            // we loaded a torrent from a server
            if(err) throw err;
            startTorrent(torrent);
        });
    
        console.log(parsed)
    });
  }
}

function startTorrent(link) {
  try {
  console.log("torrent started");
  torEngine = torrentStreamer(link,{
    connections: 100,     // Max amount of peers to be connected to.
    verify: true,         // Verify previously stored data before starting
    dht: true             // Whether or to use the dht to find peers.
  });
  torEngine.on('ready', function() {
    var started = Date.now();
    selectedFile = biggest(torEngine);
    console.log("selectedFile file:\n\n" + selectedFile.name);
    var ext = selectedFile.name.split('.').pop().toLowerCase();
    if(in_array(ext,videoArray)!= -1){
        console.log("\n- Is a multimedia file");
        if(in_array(ext,transcodeArray)!= -1){
            console.log("- Need transcoding");
            selectedFile.needTranscoding = true;
        } else {
            console.log("- don't need transcoding");
            selectedFile.needTranscoding = false;
        }
        selectedFile.target = path.join(tmpFolder, selectedFile.name);
        streamFile(selectedFile);
        $('.mejs-overlay-button').hide();
        $('#preloadTorrent').remove();
        $('.mejs-container').append('<div id="preloadTorrent" \
        style="position: absolute;top: 45%;margin: 0 50%;color: white;font-size: 12px;text-align: center;z-index: 10000;width: 450px;right: 50%;left: -225px;"> \
        <p><b id="preloadProgress"></b></p> \
        <progress value="5" min="0" max="100">0%</progress> \
        </div>');
      }
    });
} catch(err) {
    console.log(err);
}
}

function streamFile(file) {
    var item = {};
    item.name = file.name;
    var stream = file.createReadStream();
    var out = fs.createWriteStream(file.target);
    stream.pipe(out);
    
    autoRefresh();
}

function autoRefresh() {
    loadedTimeout ? clearTimeout(loadedTimeout) : null;
    var now = torEngine.swarm.downloaded,
    total = selectedFile.length,
    // There's a minimum size before we start playing the video.
    // Some movies need quite a few frames to play properly, or else the user gets another (shittier) loading screen on the video player.
    targetLoadedSize = MIN_SIZE_LOADED > total ? total : MIN_SIZE_LOADED,
    targetLoadedPercent = MIN_PERCENTAGE_LOADED * total / 100.0,
    targetLoaded = Math.max(targetLoadedPercent, targetLoadedSize),
    percent = now / targetLoaded * 100.0;
      
    var downloaded = bytesToSize(torEngine.swarm.downloaded, 2);
    var uploaded = bytesToSize(torEngine.swarm.uploaded, 2);
    var downloadRate = bytesToSize(torEngine.swarm.downloadSpeed(), 2);
    if (percent <= 100.00) { 
        $('#preloadProgress').empty().append('chargement  '+ percent +' % done at '+ downloadRate +'/s');
        $('#preloadTorrent progress').attr('value',percent).text(percent);
        loadedTimeout = setTimeout(autoRefresh, 500);
    } else {
        clearTimeout(loadedTimeout);
        $('#preloadTorrent').remove();
        console.log("down:" + downloaded +" / up:"+uploaded + " at " + downloadRate+"/s");
        playFromHttp = true;
        var item = {};
        item.name=selectedFile.name;
        item.link=selectedFile.target;
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


