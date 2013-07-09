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

$(document).ready(function() {
	getAllItems(function(results) { showItems(results); });
});

function showItems(results) {
	var ytchilds= [];
	var dmchilds = [];
	for (var i=0; i<results.length;i++) {
		if (results[i].engine === 'youtube') {
			var obj = { 
				"attr" : { "id" : "li.node.id"+results[i].vid+"" }, 
				"data" : { 
					"title" : results[i].title, 
					"attr" : { "id": results[i]._id, "vid" : results[i].vid, "flink" : results[i].flink, "engine" : results[i].engine } 
				} 
			}
			ytchilds.push(obj);
		} else if (results[i].engine === 'dailymotion') {
			var obj = { 
				"attr" : { "id" : "li.node.id"+results[i].vid+"" }, 
				"data" : { 
					"title" : results[i].title, 
					"attr" : { "id": results[i]._id, "vid" : results[i].vid, "flink" : results[i].flink, "engine" : results[i].engine } 
				} 
			}
			dmchilds.push(obj);
		}
	}
	
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
			"plugins" : [ "themes", "json_data", "ui", "contextmenu" ]
		}).bind("select_node.jstree", function (e, data) { onSelectedItem(data.rslt.obj.prevObject[0].attributes); });
	});
}


function onSelectedItem(item) {
	try {
		var vid = item.vid.value;
		var flink = item.flink.value;
		var engine = item.engine.value;
		var id = item.id.value;
		if (engine === 'youtube') {
			youtube.getVideoInfos('http://www.youtube.com/watch?v='+vid,0,1,function(datas) {showInfos(datas)});
		} else if (engine === 'dailymotion'){
			dailymotion.getVideoInfos(vid,0,1,function(datas) {showInfos(datas)});
		}
	} catch(err) {
		console.log(err);
	}
}

function showInfos(datas) {
	if (datas === 'null') {return;}
    var resolutions_string = ['1080p','720p','480p','360p'];
	var resolutions = datas[0].resolutions;
	var arr = [];
	var l=0;
	for(var i=0; i<resolutions_string.length; i++) {
		var res = resolutions_string[i];
		if ((resolutions[res] === undefined) || (resolutions[res].link === 'null')){
			continue;
		} else {
			if (res === selected_resolution) {
				$('video').trigger('loadPlayer',resolutions[res].link,'');
				break;
			} else {
				arr[l] = resolutions[res].link;
				l+=1;
			}
			if ( i === 3) {
				var link = arr[0];
				$('video').trigger('loadPlayer',link,'');
			}
		}
	}
}
