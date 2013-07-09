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

var gui = require('nw.gui');
var win = gui.Window.get();

$(document).ready(function() {
	getAllItems(function(results) { showItems(results); });
});

function showItems(results) {
	console.log(results);
	var ytchilds= [];
	var dmchilds = [];
	for (var i=0; i<results.length;i++) {
		console.log(results[i]);
		if (results[i].engine === 'youtube') {
			var obj = { 
				"attr" : { "id" : "li.node.id"+results[i].vid+"" }, 
				"data" : { 
					"title" : results[i].title, 
					"attr" : { "vid" : results[i].vid, "flink" : results[i].flink, "ext" : results[i].ext, "engine" : results[i].engine } 
				} 
			}
			ytchilds.push(obj);
		} else if (results[i].engine === 'dailymotion') {
			var obj = { 
				"attr" : { "id" : "li.node.id"+results[i].vid+"" }, 
				"data" : { 
					"title" : results[i].title, 
					"attr" : { "vid" : results[i].vid, "flink" : results[i].flink, "ext" : results[i].ext, "engine" : results[i].engine } 
				} 
			}
			dmchilds.push(obj);
		}
	}
	console.log(ytchilds);
	
	$(function () {
		$("#treeview").jstree({ 
			"json_data" : {
			"data" : [
				{ 
					"data" : "Youtube",
					"icon" : { 
						"image" : "jstree/_docs/_drive.png" 
					},
					"metadata" : { id : 'youtube_rootnode' },
					"children" : ytchilds
				},
				{ 
					"data" : "Dailymotion", 
					"metadata" : { id : 'dailymotion_rootnode' },
					"children" : dmchilds
				},
			
			]
			},
			"plugins" : [ "themes", "json_data", "ui" ]
		}).bind("select_node.jstree", function (e, data) { onSelectedItem(data.rslt.obj.prevObject[0].attributes); });
	});
}


function onSelectedItem(item) {
	try {
		var vid = item.vid.value;
		var flink = item.flink.value;
		var ext = item.ext.value;
		var engine = item.engine.value;
	} catch(err) {
	}
}
