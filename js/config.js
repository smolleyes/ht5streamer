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
var os = require('os');
var wrench = require('wrench');
var version = "0.5.1";

//localize
var Localize = require('localize');
var myLocalize = new Localize('./translations/');

var settings = {};
var locale;
var selected_interface;

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
    if (settings.edit === false) {
		if ((settings.version === undefined) || (settings.version !== version))  {
			settings.version = version;
			fs.writeFile(confdir+'/ht5conf.json', JSON.stringify(settings), function(err) {
				if(err) {
				console.log(err);
				} else {
				window.location="index.html";
				return;
				}
			});
		} else {
			window.location="index.html";
			return;
		}
    }
    settings = JSON.parse(fs.readFileSync(confdir+'/ht5conf.json', encoding="utf-8"));
    if ((settings.locale !== '') && (settings.locale !== undefined)) {
		locale = settings.locale;
    } 
    myLocalize.setLocale(locale);
} catch(err) {
	
}


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
		<input type="text" id="download_path"></input><button id="choose_download_dir">'+myLocalize.translate("Select")+'</button> \
	    </div> \
	    <div> \
			<label>'+myLocalize.translate("Local network interface:")+'</label> \
			<select id="interface_select"> \
			</select> \
	    </div>\
	    <div style="height:240px;margin-top:30px;"> \
			<p>'+myLocalize.translate("Add or remove directories to scan for your local library:")+'</p> \
			<select id="shared_dir_select" multiple name="shared_dir"> \
			</select> \
		</div> \
		<div id="shared_dir_controls"> \
				<button id="add_shared_dir">'+myLocalize.translate("Add")+'</button> \
				<button id="remove_shared_dir" >'+myLocalize.translate("Remove")+'</button> \
		</div>\
	    <br\><br\> \
	    <button id="valid_config">'+myLocalize.translate("Save")+'</button> \
';


$(document).ready(function() {
    $('#main_config').empty().append(htmlConfig);
    $('#version').empty().append("Version: "+version);
    $('#config_title').empty().append(myLocalize.translate("Ht5streamer configuration:"));
    // start flags
    $('#download_path').val(settings.download_dir);
    $("select#countries").change(function () {
	$("select#countries option:selected").each(function () {
			locale = $(this).val();
		});
    });
    getInterfaces();
    $("select#interface_select").change(function () {
		$("select#interface_select option:selected").each(function () {
				settings.interface = $(this).val();
				getIpaddress();
		});
	});
    $('#valid_config').click(function(e) {
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
    // shared dirs
    $('#add_shared_dir').click(function() {
		addSharedDir();
    });
    $('#remove_shared_dir').click(function() {
		removeSharedDir();
    });
    //init
    if ((settings.interface === undefined) || (settings.interface === '') || (settings.ipaddress === undefined) || (settings.ipaddress === '')) {
		selected_interface = '';
		$("#interface_select").val('');
	} else {
		selected_interface = settings.interface;
		$("#interface_select").val(selected_interface);
	}
    $(document).on('change',"#sharedDirDialog",function(){
		addDir($('#sharedDirDialog').val());
	});
	
	if (settings.shared_dirs !== undefined) {
		$.each(settings.shared_dirs,function(index,dir){
			$('#shared_dir_select').append('<option value="">'+dir+'</option>');
		});
	}
	$('#countries').val(settings.locale);
    $("#countries").msDropdown();
    initCheck();
});

function getUserHome() {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}

function initCheck() {
	confWin.show();
	fs.exists(confdir, function (exists) {
		util.debug(exists ? checkConf(confdir) : makeConfdir(confdir));
	});
}

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
}

function makeConfigFile() {
    fs.writeFile(confdir+'/ht5conf.json', '{"version": "'+version+'","resolution":"1080p","download_dir":"","locale":"en","edit":true,"collections":[{"name":"Library","parent":""}],"selectedDir":"","interface":"","shared_dirs":[],"fromPopup":false}', function(err) {
        if(err) {
            console.log(err);
	    return;
        } else {
            console.log("ht5config file created!");
            settings = JSON.parse(fs.readFileSync(confdir+'/ht5conf.json', encoding="utf-8"));
            $('#resolutions_select').val('1080p');
        }
    });
}

function checkConf(confdir) {
    $('#main_config').show();
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

function addSharedDir() {
	var selected_dir = '';
    var chooser = $('#sharedDirDialog');
    chooser.trigger('click');            
}

function removeSharedDir() {
	selected_toRemove = $("select#shared_dir_select option:selected")[0].innerText;
	var index = $.inArray(selected_toRemove, settings.shared_dirs);
	if (index>=0) settings.shared_dirs.splice(index, 1);
	$("select#shared_dir_select option:selected").remove();
	saveSettings();
}

function addDir(dir) {
	if (settings.shared_dirs === undefined) {
		settings.shared_dirs = [];
	}
	var selected_dir;
	if (process.platform === 'win32') {
		selected_dir=dir.replace(/\\/g,'//');
	} else {
		selected_dir=dir;
	}
	settings.shared_dirs.push(selected_dir);
	$('#shared_dir_select').append('<option value="">'+selected_dir+'</option>');
	saveSettings();
}

function loadConf(confdir) {
    // clear cache
    try {
	    if (settings.edit === true) {
			return;
	    }
    } catch(err) {}
}

function getInterfaces() {
	$("#interface_select").empty();
	if ((settings.interface=== undefined) || (settings.interface === '') || (settings.ipaddress=== undefined) || (settings.ipaddress === '')) {
		$("#interface_select").append("<option value=''></option>");
	}
	var ifaces=os.networkInterfaces();
	for (var dev in ifaces) {
	  var alias=0;
	  ifaces[dev].forEach(function(details){
		  console.log(details);
		if (details.family=='IPv4') {
			if ((dev !== 'lo') || (dev.match('tun') !== null)) {
				$("#interface_select").append("<option value="+encodeURIComponent(dev)+">"+dev+"</option>");
			}
			++alias;
		}
	  });
	}
}

function getIpaddress() {
	var ifaces=os.networkInterfaces();
	for (var dev in ifaces) {
	  var alias=0;
	  ifaces[dev].forEach(function(details){
		if (details.family=='IPv4') {
		  if (dev === decodeURIComponent(settings.interface)) {
			settings.ipaddress = details.address;
		  }
		  ++alias;
		}
	  });
	}
}

function savePopConf() {
	var fromPopup = settings.fromPopup;
    settings.edit=false;
    settings.fromPopup = false;
    var locale_changed = false;
    if (locale !== settings.locale) {
		locale_changed= true;
		settings.locale=locale;
	}
    if (settings.download_dir === '') {
		$('#download_path').val('REQUIRED!!!').css({'color':'red'});
		return;
    }
    fs.writeFile(confdir+'/ht5conf.json', JSON.stringify(settings), function(err) {
        if(err) {
            console.log(err);
        } else {
			if (fromPopup === true){
				if (locale_changed === true) {
					window.haveParent.window.server.close();
					window.haveParent.reload();
				} else {
					window.haveParent.window.settings=settings;
					window.haveParent.window.server.close();
					window.haveParent.window.createServer();
				}
				confWin.hide();
				confWin.close(true);
			} else {
				window.location='index.html';
				window.window.settings=settings;
			}
			console.log("ht5config config updated successfully!");
		}
    });
}

function saveSettings() {
	fs.writeFile(confdir+'/ht5conf.json', JSON.stringify(settings), function(err) {
        if(err) {
            console.log(err);
        }
    });
}

