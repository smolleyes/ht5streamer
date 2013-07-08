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

var clipboard = gui.Clipboard.get();

$(document).ready(function() {
	$.event.special.rightclick = {
		bindType: "contextmenu",
		delegateType: "contextmenu"
	};
	$(document).on("rightclick", ".start_video", function(e) {
		var link = '';
		var evid = $(this).parent().closest('.youtube_item').find('div')[5].id;
		var vid = '';
		if (evid.match('_sub') === null) {
			vid = evid.replace('youtube_entry_res_','');
		} else {
			vid = evid.replace('youtube_entry_res_sub_','');
		}
		try {
			$('#copy_link').parent().remove();
			if (search_engine === 'youtube') {
				link = "http://www.youtube.com/watch?v="+vid;
				$('#custom-menu ol').append('<li><a id="copy_link" href="#" alt="'+link+'">'+myLocalize.translate("Copy youtube link")+'</a></li>');
			} else if (search_engine === 'dailymotion') {
				link="http://www.dailymotion.com/video/"+vid;
				$('#custom-menu ol').append('<li><a id="copy_link" href="#" alt="'+link+'">'+myLocalize.translate("Copy dailymotion link")+'</a></li>');
			}
		} catch(err) {
			console.log("can't detect link to copy..." + err);
		}
		$("#custom-menu").css({ top: e.pageY + "px", left: e.pageX + "px" }).show(100);
		return false;
	});
    //custom context menu
    try {
		$(document).bind("contextmenu", function(e) {
			e.preventDefault();
			$('#copy_link').parent().remove();
			$('#copy').parent().remove();
			$('#paste_ytlink').parent().remove();
			var ytlink = getYtlinkFromClipboard();
			var textStr = getSelectedText();
			if (textStr !== null) {
				$('#custom-menu ol').append('<li><a id="copy" href="#">'+myLocalize.translate("Copy")+'</a></li>');
			}
			if ((search_engine === 'youtube') && ytlink !== null) {
				$('#custom-menu ol').append('<li><a id="paste_ytlink" href="#">'+myLocalize.translate("Paste/Open youtube link")+'</a></li>');
			}
			if ($('#custom-menu li').length === 0 ) {
				return;
			} else {
				$("#custom-menu").css({ top: e.pageY + "px", left: e.pageX + "px" }).show(100);
			}
			return false;
		});
		
		$('#custom-menu').click(function() {
			$('#custom-menu').hide();
		});
		$(document).click(function() {
			$('#custom-menu').hide();
		});
	} catch (err) {
		console.log(err);
	}
	//copy to clipboard
	$(document).on('click','#copy',function() {
		clipboard.clear();
		var text = getSelectedText();
		if (text !== null) {
			clipboard.set(''+text+'','text');
			$('#custom-menu').hide();
		}
    });
    // paste yt link
    $(document).on('click','#paste_ytlink',function(e) {
		var ytlink = getYtlinkFromClipboard();
		youtube.getVideoInfos(ytlink,0,1,function(datas) {fillPlaylist(datas)});
		$('#custom-menu').hide();
	});
	// copy link
	$(document).on('click','#copy_link',function(e) {
		clipboard.clear();
		var link = $(this).attr('alt');
		clipboard.set(''+link+'','text');
		$('#custom-menu').hide();
	});
});

function getYtlinkFromClipboard() {
	var vid='';
	var text = clipboard.get('text');
	try {
		vid = text.match('.*v=(.*)?&')[1]
		return "www.youtube.com/watch?v="+vid;
	} catch(err) {
		try {
			vid = text.match('.*v=(.*)')[1];
			return "www.youtube.com/watch?v="+vid;
		} catch(err) {
			return null;
		}
	console.log('youtube id: ' + vid);
	}
}

function getSelectedText() {
	var t='';
	if(window.getSelection){
		t = window.getSelection();
	}else if(document.getSelection){
		t = document.getSelection();
	}else if(document.selection){
		t = document.selection.createRange().text;
	}
	if (t.toLocaleString() === '') {
		return null;
	} else {
		return t.toLocaleString();
	}
}
