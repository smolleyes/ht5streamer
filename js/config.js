var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var util = require('util');
var gui = require('nw.gui');
var win = gui.Window.get();

function getUserHome() {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}

// settings
var confdir;
if (process.platform === 'win32') {
    var cdir = process.env.APPDATA+'/ht5streamer';
    confdir = cdir.replace(/\\/g,'//');
} else {
    confdir = getUserHome()+'/.config/ht5streamer';
}

fs.exists(confdir, function (exists) {
  util.debug(exists ? checkConf(confdir) : makeConfdir(confdir));
});

function makeConfdir(confdir) {
    mkdirp(confdir, function(err) { 
        if(err){
	    console.log('can\'t create confdir '+confdir);
	    return;
	} else {
	    console.log('Config dir '+confdir+' created successfully');
	    checkConf(confdir);
	}	
    });
}

function makeConfigFile(confdir,download_dir) {
    fs.writeFile(confdir+'/ht5conf.json', '{"resolution":"1080p","download_dir":"'+download_dir+'"}', function(err) {
        if(err) {
            console.log(err);
	    return;
        } else {
            console.log("ht5config file created!");
	    win.reload();
	    loadConf(confdir);
        }
    });
}

function checkConf(confdir) {
    fs.exists(confdir+'/ht5conf.json', function (exists) {
        util.debug(exists ?  loadConf(confdir) : chooseDownloadDir(confdir));
    });
}

function chooseDownloadDir(confdir) {
    var download_dir = '';
    var chooser = $('#fileDialog');
    alert('Welcome to ht5streamer, please select a download directory in the next dialog...');
    chooser.trigger('click');            
    chooser.change(function(evt) {
		if (process.platform === 'win32') {
			download_dir=$(this).val().replace(/\\/g,'//');
		} else {
			download_dir=$(this).val();
		}
		makeConfigFile(confdir,download_dir);
    });
}

function loadConf(confdir) {
    console.log('config file ok!');
}

