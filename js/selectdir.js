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

var fs = require('fs');
var settings = JSON.parse(fs.readFileSync(confDir+'/ht5conf.json', encoding="utf-8"));

//localize
var Localize = require('localize');
var myLocalize = new Localize('./translations/');

$(document).ready(function() {
	var settings = JSON.parse(fs.readFileSync(confDir+'/ht5conf.json', encoding="utf-8"));
	var locale = settings.locale;
	myLocalize.setLocale(locale);
	$('body').css({"font" :"12px Verdana,Arial,Helvetica,sans-serif"});
	createNodes();
	var infos = myLocalize.translate("Select or create a folder (right click) to save your video and close the window to validate.");
	$('#infos').html(infos);
});

function createNodes() {
	settings = JSON.parse(fs.readFileSync(confDir+'/ht5conf.json', encoding="utf-8"));
	
	$(function () {
		$("#selector").jstree({
			"plugins" : [ "themes", "json_data", "ui", "contextmenu","types","crrm" ],
			"json_data" : {
			"data" : { 
					"attr" : { id : ''+myLocalize.translate("Library")+'_rootnode' },
					"data" : myLocalize.translate("Library"),
					"children" : []
				}
			},
				"themes" : {
				"theme" : "default"
			},
			"contextmenu" : {
				items: {
					"ccp": false,
					// Some key
					"remove" : {
						// The item label
						"label"				: myLocalize.translate("Remove"),
						// The function to execute upon a click
						"action"			: function (obj) { this.remove(obj); },
						// All below are optional 
						"_disabled"			: false,		// clicking the item won't do a thing
						"separator_before"	: false,	// Insert a separator before the item
						"separator_after"	: false,		// Insert a separator after the item
						// false or string - if does not contain `/` - used as classname
						"icon"				: false
					},
					"create" : {
						// The item label
						"label"				: myLocalize.translate("Add folder"),
						// The function to execute upon a click
						"action"			: function (obj) {
												this.create(obj); 
											},
						// All below are optional 
						"_disabled"			: false,		// clicking the item won't do a thing
						"separator_before"	: false,	// Insert a separator before the item
						"separator_after"	: false,		// Insert a separator after the item
						// false or string - if does not contain `/` - used as classname
						"icon"				: false
					},
					"rename" : {
						// The item label
						"label"				: myLocalize.translate("Rename"),
						// The function to execute upon a click
						"action"			: function (obj) { this.rename(obj); },
						// All below are optional 
						"_disabled"			: false,		// clicking the item won't do a thing
						"separator_before"	: false,	// Insert a separator before the item
						"separator_after"	: false,		// Insert a separator after the item
						// false or string - if does not contain `/` - used as classname
						"icon"				: false
					}
				}
			},
		}).bind("select_node.jstree", function (e, data) { 
				onSelectedItemPopup(data.rslt.obj.prevObject[0].attributes); 
		}).bind("rename.jstree", function (e, data) { 
				renameItem(data);
		}).bind("remove.jstree", function (e, data) { 
				removeItem(data.rslt.obj.prevObject[0].attributes); 
		}).bind("create.jstree", function (e, data) { 
				onCreateItem(data);
		}).bind('before.jstree', function(event, data){
			if(data.plugin == 'contextmenu'){
				var settings = data.inst._get_settings();
				if((data.inst._get_parent(data.args[0])==-1) || (data.args[0].id === '')){ 
					settings.contextmenu.items.remove._disabled = true;
					settings.contextmenu.items.rename._disabled = true;
					settings.contextmenu.items.create._disabled = false;
				} else {
					settings.contextmenu.items.remove._disabled = false;
					settings.contextmenu.items.rename._disabled = false;
					settings.contextmenu.items.create._disabled = true;
				}
			} 
		}).bind("loaded.jstree", function (event, data) {
			getAllItems(function(results) { loadNodes(results); });
		});
	});
}

function loadNodes(results){
	for (var i=0; i<results.length;i++) {
		var parent = results[i].parent;
		var type = results[i].type;
		if (type === 'folder') {
			var obj = { 
					"attr" : { id : ''+results[i].title+'_rootnode' },
					"data" : results[i].title,
					"children" : []
			}
			$("#selector").jstree("create", $("#"+parent+"_rootnode"), "inside", obj, function() {}, true);
		}
	}
}

function onSelectedItemPopup(item) {
	try {
		settings = JSON.parse(fs.readFileSync(confDir+'/ht5conf.json', encoding="utf-8"));
		settings.selectedDir = $.trim(item[0].ownerElement.innerText);
		fs.writeFile(confDir+'/ht5conf.json', JSON.stringify(settings), function(err) {
			if(err) {
				console.log(err);
				return;
			}
		});
	} catch(err) {
		console.log(err);
	}
}

function onCreateItem(item) {
	if (item.args.length === 1) {
		var name = item.rslt.name;
		if (name.match(' ') !== null) {
			alert(myLocalize.translate("Please do not use spaces or special characters in your playlist name!"));
			item.rslt.obj.remove();
			settings = JSON.parse(fs.readFileSync(confDir+'/ht5conf.json', encoding="utf-8"));
			settings.selectedDir="";
			fs.writeFile(confDir+'/ht5conf.json', JSON.stringify(settings), function(err) {
				if(err) {
					console.log(err);
					return;
				}
			});
		} else {
			var parent = $.trim(item.args[0].prevObject[0].innerText);
			addCollection(name,parent,'');
		}
	}
}
