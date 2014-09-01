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
var nodeip = require("node-ip");
var version = "1.7.4";

//localize
var i18n = require("i18n");
var _ = i18n.__;
var localeList = ['en', 'fr', 'es'];
var locale = 'en';
var locale_changed = false;
var shares_changed = false;
var plugins_changed = false;

var settings = {};
var selected_interface;
var shared_length = 0;
var pluginsList = ['grooveshark','mega-search','songza','cpasbien','thepiratebay','omgtorrent'];

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
    var ip = nodeip.address();
    console.dir("Adresse ip: " +ip);
    if ((settings.fromPopup === true) || (settings.fromPopup === true)) {
      return;
    }
    if ((settings.edit === false) && (settings.fromPopup === false)) {
      if ((settings.version === undefined) || (settings.version !== version))  {
        settings.version = version;
      } else if ((settings.ipaddress === '') || (settings.ipaddress !== ip)) {
        settings.ipaddress = ip;
      } else if (settings.init === undefined) {
        settings.init = true;
      } 
      writeConf(settings);
		} else {
      if(settings.init === true) {
        window.location="index.html";
        return;
      }
		}
} catch(err) {
	
}

try {
	settings = JSON.parse(fs.readFileSync(confdir+'/ht5conf.json', encoding="utf-8"));
	if ((settings.locale !== '') && (settings.locale !== undefined)) {
		locale = settings.locale;
	} else {
		settings.locale = locale;
	}
}catch(err){
	settings.locale = locale;
}

try {
	shared_length = settings.shared_dirs.length;
} catch(err) {
}
// setup locale
i18n.configure({
	defaultLocale: 'en',
	locales:localeList,
	directory: path.dirname(process.execPath) + '/locales',
	updateFiles: true
});

if ($.inArray(settings.locale, localeList) >-1) {
	locale=settings.locale;
	i18n.setLocale(locale);
} else {
	i18n.setLocale('en');
}

var htmlConfig='<div style="height:36px;"> \
		<label>'+_("Language:")+'</label> \
		<select name="countries" id="countries" style="width:300px;"> \
		  <option value="en" data-image="images/msdropdown/icons/blank.gif" data-imagecss="flag gb" data-title="England">English</option> \
		  <option value="fr" data-image="images/msdropdown/icons/blank.gif" data-imagecss="flag fr" data-title="France">French</option> \
      <option value="es" data-image="images/msdropdown/icons/blank.gif" data-imagecss="flag es" data-title="Spain">Spanish</option> \
		</select> \
    </div> \
    <div style="height:36px;"> \
      <label>'+_("Maximum resolution:")+'</label> \
      <select id="resolutions_select"> \
		    <option value = "1080p">1080p</option> \
		    <option value = "720p">720p</option> \
		    <option value = "480p">480p</option> \
		    <option value = "360p">360p</option> \
      </select> \
    </div> \
    <div style="height:36px;"> \
      <label>'+_("Download directory:")+'</label> \
      <input type="text" id="download_path"></input><button id="choose_download_dir">'+_("Select")+'</button> \
    </div> \
    <div> \
			<label>'+_("Local network interface:")+'</label> \
			<select id="interface_select"> \
			</select> \
    </div>\
    <div> \
      <p>'+_("<b><u>Gmail account (optional... used to report some errors) : </u></b>")+'</p> \
			<label>'+_("Username: ")+'</label> \
			<input type="text" id="gmailUser"></input> \
      <br> \
      <label>'+_("Password: ")+'</label> \
			<input type="text" id="gmailPass"></input> \
    </div>\
    <div> \
      <p> \
        <b><u>'+_("Plugins choice:")+'</u></b> \
        <br> \
        '+_("Please read the disclaimer here : <u><a id='disclaimer' style='color:red;' href='#'>disclaimer</a></u>")+' \
      </p> \
      <div style="border: 1px solid black;height:34px;"> \
        <!--<div class="ItemCheckbox left">\
          <label for="vimeo">Vimeo</label>\
          <input class="pluginCheckBox" type="checkbox" id="vimeo" name="vimeo">\
        </div>-->\
        <div class="ItemCheckbox left">\
          <label for="songza">Songza</label>\
          <input class="pluginCheckBox" type="checkbox" id="songza" name="songza">\
        </div>\
        <div class="ItemCheckbox left">\
          <label for="grooveshark">Grooveshark</label>\
          <input class="pluginCheckBox" type="checkbox" id="grooveshark" name="grooveshark">\
        </div>\
        <div class="ItemCheckbox">\
          <label for="mega-search">Mega-search.ws</label>\
          <input class="pluginCheckBox" type="checkbox" id="mega-search" name="mega-search">\
        </div>\
        <div class="ItemCheckbox left">\
          <label for="omgtorrent">Cpasbien</label>\
          <input class="pluginCheckBox" type="checkbox" id="cpasbien" name="cpasbien">\
        </div>\
        <div class="ItemCheckbox left">\
          <label for="omgtorrent">Thepiratebay</label>\
          <input class="pluginCheckBox" type="checkbox" id="thepiratebay" name="thepiratebay">\
        </div>\
        <div class="ItemCheckbox left">\
          <label for="omgtorrent">Omgtorrent</label>\
          <input class="pluginCheckBox" type="checkbox" id="omgtorrent" name="omgtorrent">\
        </div>\
      </div>\
    </div> \
    <div style="height:240px;margin-top:30px;"> \
			<p>'+_("Add or remove directories to scan for your local library:")+'</p> \
			<select id="shared_dir_select" multiple name="shared_dir"> \
			</select> \
		</div> \
		<div id="shared_dir_controls"> \
				<button id="add_shared_dir">'+_("Add")+'</button> \
				<button id="remove_shared_dir" >'+_("Remove")+'</button> \
		</div>\
    <br\><br\> \
    <button id="valid_config">'+_("Save")+'</button> \
';

$(document).ready(function() {
    $('#main_config').empty().append(htmlConfig);
    $('#version').empty().append("Version: "+version);
    $('#config_title').empty().append(_("Ht5streamer configuration:"));
    // start flags
    $('#download_path').val(settings.download_dir);
    $("select#countries").change(function () {
    $("select#countries option:selected").each(function () {
			locale = $(this).val();
      settings.locale = locale;
      locale_changed = true;
      settings.edit = true;
      if(settings.fromPopup === true) {
          settings.locale_changed = true;
      }
      saveSettings();
      confWin.reload();
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
      settings.init = true;
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
    // checkbox changes
    $('.pluginCheckBox:checkbox').change(function() {
        plugins_changed = true;
        settings.plugins_changed = true;
    }); 
    
    // choose download_dir
    $('#choose_download_dir').click(function() {
	chooseDownloadDir();
    });
    // shared dirs
    $('#add_shared_dir').click(function() {
		addSharedDir();
    shares_changed = true;
    settings.shares_changed = true;
    });
    $('#remove_shared_dir').click(function() {
		removeSharedDir();
    shares_changed = true;
    settings.shares_changed = true;
    });
    //init
    if ((settings.interface === undefined) || (settings.interface === '')) {
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
  
  //gmail
  guser = $("#gmailUser").val();
  gpass = $("#gmailPass").val();
  if ((settings.gmailUser === '') || (settings.gmailUser === undefined)) {
      settings.gmailUser = '';
  } else {
      $("#gmailUser").val(settings.gmailUser);
  }
  if ((settings.gmailPass === '') || (settings.gmailPass === undefined)) {
      settings.gmailPass = '';
  }else {
      $("#gmailPass").val(settings.gmailPass);
  }
  //disclaimer
  $('#disclaimer').click(function(){
      var msg = _("The following are terms and conditions for use of Ht5streamer including all \
services offered.\n \
\n \
The service is offered to you conditioned on your acceptance without  \
modification of the terms, conditions, and notices contained herein. By  \
visiting and using Ht5streamer or any of its affiliate sites and \
services, you are acknowledging your full compliance to the terms listed \
here. \n \
\n \
Ht5streamer is based on its links to third party sites. The linked sites \
are not under the control of Ht5streamer and Ht5streamer is not \
responsible for the content of any linked sites or any links contained in a \
linked site. Ht5streamer is providing these links to you only as a \
convenience, and the inclusion of any link does not imply endorsement by \
Ht5streamer of the site or any association with their operators. \n \
\n \
Ht5streamer's team do not assume any responsibility or liability for the \
audio file, from completeness to legalities.\n \
\n \
Ht5streamer user agrees that Ht5streamer is hereby absolved from any and  \
all liabilities, losses, costs and claims, including attorney's fees \
asserted against Ht5streamer, its agents, officers, employees, or \
associates, that may arise or result from any service provided, performed, \
be agreed to be performed by Ht5streamer. \n \
\n \
Ht5streamer team makes no warranties, expressed or implied, for the \
services we provide. Ht5streamer will not be held responsible for any \
damages you or your business may suffer from using Ht5streamer services.\
Ht5streamer will not be held responsible for any interruptions, delays, \
failures, inaccuracies, or typographical errors \n \
\n \
Ht5streamer team does not represent or warrant that the Service or the \
server that makes it available, are free of viruses or other harmful \
components. Ht5streamer does not warrant or represent that the use or the \
results of the use of the Service or the materials made available as part of \
the Service will be correct, accurate, timely, or otherwise reliable \n\
\n \
Ht5streamer team reserves the right to update this policy at any time \
without notice.");

    var new_win = gui.Window.open('warning.html', {
            "position": 'center',
            "width": 680,
            "height": 670,
            "toolbar": false,
            "title": _('Warnings')
	});
	new_win.on('close', function() {
	  this.hide();
	  this.close(true);
	});
	new_win.on('loaded', function(){
		new_win.window.document.body.innerHTML = '<div><pre>'+msg+'</pre></div>';
	});
	new_win.show();
  });
  
  //plugins
  if (settings.plugins === undefined) {
      settings.plugins = new Array();
  } else {
    var list = settings.plugins;
    $.each(list,function(index,name) {
        $('input[name='+name+']').attr('checked','checked');
    });
  }
  // init
  initCheck();
});

function writeConf(settings) {
    fs.writeFile(confdir+'/ht5conf.json', JSON.stringify(settings), function(err) {
				if(err) {
          console.log(err);
				} else {
          window.location="index.html";
          return;
				}
			});
}

function getUserHome() {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}

function initCheck() {
	confWin.show();
	fs.exists(confdir, function (exists) {
		exists ? checkConf(confdir) : makeConfdir(confdir);
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
    fs.writeFile(confdir+'/ht5conf.json', '{"init":false,"version": "'+version+'","resolution":"1080p","download_dir":"","locale":"en","edit":true,"collections":[{"name":"Library","parent":""}],"selectedDir":"","interface":"","shared_dirs":[],"fromPopup":false,"gmailUser":"","gmailPass":"","plugins":[]}', function(err) {
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
       exists ? loadConf(confdir) : makeConfigFile(confdir);
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
      var ip = nodeip.address();
      if (settings.ipaddress !== ip) {
        settings.ipaddress = ip;
      }
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
    var plugins_length = settings.plugins.length;
    if (settings.locale_changed) {
		locale_changed = true;
    settings.locale_changed = false;
		settings.locale=locale;
	}
  //gmail
  guser = $("#gmailUser").val();
  gpass = $("#gmailPass").val();
  if (settings.gmailUser === '') {
      settings.gmailUser = guser;
  }
  if (settings.gmailPass === '') {
      settings.gmailPass = gpass;
  }
  //plugins
  var list = $('.pluginCheckBox');
  settings.plugins = [];
  $.each(list,function(index,plugin){
      var name = $(this).attr('name');
      if ($('input[name="'+name+'"]').is(':checked') === true) {
        settings.plugins.push(name);
      }
      //reload plugins if needed
      if (index+1 === list.length) {
        if (fromPopup === true){
          if(settings.plugins_changed === true) {
              settings.plugins_changed = false;
              window.haveParent.window.settings=settings;
              window.haveParent.window.reloadPlugins();
          }
        }
      }
  });
  
    
    if (settings.fromPopup === true) {
      if (settings.shares_changed === true) {
        settings.shares_changed = false;
        settings.scan_dirs = true;
      } else {
        settings.scan_dirs = false;
      }
    }
  
    if (settings.download_dir === '') {
		$('#download_path').val('REQUIRED!!!').css({'color':'red'});
		return;
    }
    var ip = nodeip.address();
    if (settings.ipaddress !== ip) {
      settings.ipaddress = ip;
    }
    fs.writeFile(confdir+'/ht5conf.json', JSON.stringify(settings), function(err) {
        if(err) {
            console.log(err);
        } else {
			if (fromPopup === true){
				if ((locale_changed === true) || (shares_changed === true)) {
					window.haveParent.reload();
				} else {
					window.haveParent.window.settings=settings;
					if (settings.shared_dirs.length !== shared_length) {
						console.log("Updating local files list...");
						try {
							window.haveParent.window.createServer();
						} catch(err) {};
					}
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

// extend array
Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
}

