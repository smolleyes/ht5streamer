//~ Copyright (C) Laguillaumie sylvain
//
//~ This program is free software; you can redistribute it and/or
//~ modify it under the terms of the GNU General Public License
//~ as published by the Free Software Foundation; either version 2
//~ of the License, or (at your option) any later version.
//~ 
//~ This program is distributed in the hope that it will be useful,
//~ but WITHOUT ANY WARRANTY; without even the implied warranty of
//~ MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//~ GNU General Public License for more details.
//~ 
//~ You should have received a copy of the GNU General Public License
//~ along with this program; if not, write to the Free Software
//~ Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var util = require('util');
var gui = require('nw.gui');
var confWin = gui.Window.get();
var version = "0.4.2";

//localize
var Localize = require('localize');
var myLocalize = new Localize('./translations/');

var settings = {};
var locale = 'en';

// settings
var confdir;
if (process.platform === 'win32') {
    var cdir = process.env.APPDATA+'/ht5streamer';
    confdir = cdir.replace(/\\/g,'//');
} else {
    confdir = getUserHome()+'/.config/ht5streamer';
}

try {
    settings = JSON.parse(fs.readFileSync(confdir+'/ht5conf.json', encoding="utf-8"));
    if ((settings.locale !== '') && (settings.locale !== undefined)) {
	locale = settings.locale;
    } 
    myLocalize.setLocale(locale);
} catch(err) {}

var htmlConfig='<div style="height:36px;"> \
		<label>'+myLocalize.translate("Language:")+'</label> \
		<select name="countries" id="countries" style="width:300px;"> \
		  <option value="en" data-image="images/msdropdown/icons/blank.gif" data-imagecss="flag gb" data-title="England">English</option> \
		  <option value="fr" data-image="images/msdropdown/icons/blank.gif" data-imagecss="flag fr" data-title="France">French</option> \
		</select> \
	    </div> \
            <div style="height:36px;"> \
		<label>'+myLocalize.translate("Maximum resolution:")+'</label> \
		<select id="resolutions_select"> \
		    <option value = "1080p">1080p</option> \
		    <option value = "720p">720p</option> \
		    <option value = "480p">480p</option> \
		    <option value = "360p">360p</option> \
		</select> \
	    </div> \
	    <div style="height:36px;"> \
		<label>'+myLocalize.translate("Download directory:")+'</label> \
		<input type="text" id="download_path" size="50"></input><button id="choose_download_dir">'+myLocalize.translate("Select")+'</button> \
	    </div> \
	    <button id="valid_config">'+myLocalize.translate("Save")+'</button> \
';


$(document).ready(function() {
    try {
	settings = JSON.parse(fs.readFileSync(confdir+'/ht5conf.json', encoding="utf-8"));
    if (settings.edit === false) {
	 if ((settings.version === undefined) || (settings.version !== version)) {
	    settings.version = version;
	    fs.writeFile(confdir+'/ht5conf.json', JSON.stringify(settings), function(err) {
		    if(err) {
		    console.log(err);
		    } else {
			window.location="index.html";
		    }
	    });
	} else {
	    window.location="index.html";
	}
    }
} catch(err) {}
    
    $('#main_config').empty().append(htmlConfig);
    $('#version').empty().append("Version: "+version);
    $('#config_title').empty().append(myLocalize.translate("Ht5streamer configuration:"));
    // start flags
    $('#countries').val(settings.locale);
    $('#download_path').val(settings.download_dir);
    $("#countries").msDropdown();
    $("select#countries").change(function () {
	$("select#countries option:selected").each(function () {
	    settings.locale = $(this).val();
	});
    });
    $('#valid_config').click(function(e) {
		e.preventDefault();
		savePopConf();
    });
    //resolutions select
    var selected_resolution = settings.resolution;
    $("#resolutions_select").val(selected_resolution);
    $("select#resolutions_select").change(function () {
	$("select#resolutions_select option:selected").each(function () {
	    settings.resolution = $(this).val();
	});
    });
    // choose download_dir
    $('#choose_download_dir').click(function() {
	chooseDownloadDir();
    });
});

function getUserHome() {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}

fs.exists(confdir, function (exists) {
  util.debug(exists ? checkConf(confdir) : makeConfdir(confdir));
});

function makeConfdir(confdir) {
    mkdirp(confdir, function(err) { 
        if(err){
	    console.log('can\'t create config dir '+confdir);
	    return;
	} else {
	    console.log('Config dir '+confdir+' created successfully');
	    checkConf();
	}	
    });
    mkdirp(confdir+'/updates', function(err) { 
        if(err){
	    console.log('can\'t create update dir '+confdir);
	    return;
	} else {
	    console.log('Update dir '+confdir+'/updates created successfully');
	    checkConf();
	}	
    });
}

function makeConfigFile() {
    fs.writeFile(confdir+'/ht5conf.json', '{version: "'+version+'","resolution":"1080p","download_dir":"","locale":"en","edit":true,"collections":[{"name":"Library","parent":""}],"selectedDir":""}', function(err) {
        if(err) {
            console.log(err);
	    return;
        } else {
            console.log("ht5config file created!");
	    confWin.reload();
        }
    });
}

function checkConf(confdir) {
    fs.exists(confdir+'/ht5conf.json', function (exists) {
        util.debug(exists ? loadConf(confdir) : makeConfigFile(confdir) );
    });
}

function chooseDownloadDir(confdir) {
    var download_dir = '';
    var chooser = $('#fileDialog');
    chooser.trigger('click');            
    chooser.change(function(evt) {
		if (process.platform === 'win32') {
			download_dir=$(this).val().replace(/\\/g,'//');
		} else {
			download_dir=$(this).val();
		}
		settings.download_dir=download_dir;
		$('#download_path').val(download_dir);
    });
}

function loadConf(confdir) {
    // clear cache
    var settings = JSON.parse(fs.readFileSync(confdir+'/ht5conf.json', encoding="utf-8"));
    if (settings.edit === true) {
	return;
    }
}

function savePopConf() {
    settings.edit=false;
    if (settings.download_dir === '') {
	$('#download_path').val('REQUIRED!!!').css({'color':'red'});
	return;
    }
    fs.writeFile(confdir+'/ht5conf.json', JSON.stringify(settings), function(err) {
        if(err) {
            console.log(err);
        } else {
	    if (confWin.width < 700){
		confWin.close();
            } else {
		console.log("ht5config config updated successfully!");
		window.location='index.html';
	    }
        }
    });
}


