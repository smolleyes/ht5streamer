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
    //custom context menu
    try {
		$(document).bind("contextmenu", function(e) {
			e.preventDefault();
			$("#custom-menu").css({ top: e.pageY + "px", left: e.pageX + "px" }).show(100);
			if ((search_engine === 'youtube') && $('#paste_ytlink').length === 0) {
				$('#custom-menu ol').append('<li><a id="paste_ytlink" href="#">'+myLocalize.translate("Paste/Open youtube link")+'</a></li>');
			} else {
				if ((search_engine !== 'youtube') && ($('#paste_ytlink').length === 1)) {
					$('#paste_ytlink').parent().remove();
				}
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
		alert(err);
	}
	//copy to clipboard
	$('#copy').click(function() {
		clipboard.clear()
		var t='';
		if(window.getSelection){
			t = window.getSelection();
		}else if(document.getSelection){
			t = document.getSelection();
		}else if(document.selection){
			t = document.selection.createRange().text;
		}
		if (t === '') {
			return;
		}
        clipboard.set(''+t+'','text');
        $('#custom-menu').hide();
    });
    //paste to clipboard
	$('#paste').click(function() {
        var text = clipboard.get('text');
        var position = window.getSelection().getRangeAt(0).startOffset;
    });
    // paste yt link
    $(document).on('click','#paste_ytlink',function(e) {
		var vid='';
		var text = clipboard.get('text');
		try {
			text.match('.*v=(.*)?&')[1]
		} catch(err) {
			try {
				vid = text.match('.*v=(.*)')[1];
			} catch(err) {
				console.log("can\'t detect video id...")
			}
		console.log('youtube id: ' + vid);
		youtube.getVideoInfos('http://www.youtube.com/watch?v='+vid,0,1,function(datas) {fillPlaylist(datas)});
		$('#custom-menu').hide();
		}
	});
});
