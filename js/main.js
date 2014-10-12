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

var playAirMedia = false;
var playUpnpMedia = false;
var airMediaDevices = [];
var airMediaDevice;
var upnpDevices = [];
var upnpDevice = null;
var airMediaLink;
var airMediaPlaying = false;
var upnpMediaPlaying = false;
var torrentPlaying = false;
var continueTransition = false;
var transcoderEnabled= false;
var ffmpeg;
var ffar = [];
var torrentsArr = [];
var UPNPserver;
var airplayToggleOn = false;
var upnpToggleOn = false;
var right = 0;
var left = 0;
var mediaRenderer;
var currentRes = null;
var megaDownload = null;
var extPlayerProc = null;

// global var
var current_download;
var downloads = [];
var ht5Server;
var currentMedia;
var currentAirMedia = {};
var fn;
var excludedPlugins = ['mega', 'mega-files', 'vimeo'];
var loadedTimeout;
var playlistMode = 'normal';

// engines object to store all engines
var engines = {};
// active engine
var engine;
// array of possibles menus
var selectTypes = ["searchTypes", "orderBy", "dateTypes", "searchFilters", "categories"];
// object to store search options passed to engines
var searchOptions = {};
// for navigation mode
var browse = true;

var htmlStr = '<div id="menu"> \
    <div id="engines" class="space"> \
        <label>' + _("Engine:") + '</label> \
        <select id="engines_select" class="selectpicker" data-style="btn-inverse"> \
            <option value = "youtube">Youtube</option> \
            <option value = "dailymotion">Dailymotion</option> \
        </select> \
    </div> \
    <form id="video_search"> \
        <label id="searchTypes_label">' + _("Search:") + '</label> \
        <input type="text" id="video_search_query" name="video_search_query" placeholder="' + _("Enter your search...") + '" /> \
        <label id="searchTypesMenu_label">' + _("Mode:") + '</label> \
        <select id="searchTypes_select" class="selectpicker" data-style="btn-inverse"> \
            <option value = "videos">' + _("Videos") + '</option> \
            <option value = "playlists">' + _("Playlists") + '</option> \
            <option value = "category">' + _("Categories") + '</option> \
            <option id="channelsOpt" value = "channels">' + _("Channels") + '</option> \
            <option id="topRatedOpt" value = "topRated">' + _("Top rated") + '</option> \
            <option id="mostViewed" value = "mostViewed">' + _("Most viewed") + '</option> \
        </select> \
        <label id="dateTypes_label">' + _("Date:") + '</label> \
        <select id="dateTypes_select" class="selectpicker" data-style="btn-inverse"> \
            <option value = "today">' + _("Today") + '</option> \
            <option value = "this_week">' + _("This week") + '</option> \
            <option value = "this_month">' + _("This month") + '</option> \
            <option value = "all_time">' + _("All time") + '</option> \
        </select> \
        <label id="categories_label">' + _("Category:") + '</label> \
        <select id="categories_select" class="selectpicker" data-style="btn-inverse"> \
        </select> \
        <label id="orderBy_label">' + _("Order by:") + '</label> \
        <select id="orderBy_select" class="selectpicker" data-style="btn-inverse"> \
            <option value = "relevance">' + _("Relevance") + '</option> \
            <option value = "published">' + _("Published") + '</option> \
            <option value = "viewCount">' + _("Views") + '</option> \
            <option value = "rating">' + _("Rating") + '</option> \
        </select> \
        <label id="searchFilters_label">' + _("Filters:") + '</label> \
        <select id="searchFilters_select" class="selectpicker" data-style="btn-inverse"> \
            <option value = ""></option> \
            <option value = "hd">HD</option> \
            <option id="3dopt" value = "3d">3D</option> \
        </select> \
        <input id="video_search_btn" type="submit" class="space" value="' + _("Send") + '" />  \
        </form> \
        <a id="config_btn" href="#" title="' + _("Settings") + '"> \
            <img src="images/config.png" height="28" width="28" /> \
        </a> \
        <div> \
        <form id="donate" action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank"> \
            <input type="hidden" name="cmd" value="_s-xclick"> \
            <input type="hidden" name="encrypted" value="-----BEGIN PKCS7-----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-----END PKCS7----- "> \
            <input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif" border="0" name="submit" alt="PayPal - The safer, easier way to pay online!"> \
            <img alt="" border="0" src="https://www.paypalobjects.com/fr_FR/i/scr/pixel.gif" width="1" height="1"> \
        </form> \
        </div> \
</div> \
<div id="content"> \
<div class="split-pane vertical-percent" style="min-width:425px;"> \
    <div class="split-pane-component" id="left-component"> \
        <div id="wrapper"> \
            <div id="tabContainer"> \
                <div class="tabs"> \
                    <ul> \
                        <li id="tabHeader_1">' + _("Results") + '</li> \
                        <li id="tabHeader_2">' + _("Library") + '</li> \
                        <li id="tabHeader_3">' + _("Local files") + '</li> \
                        <li id="tabHeader_4">' + _("Downloads") + '</li> \
                        <li id="tabHeader_5">' + _("Upnp") + '</li> \
                    </ul> \
                </div> \
                <div id="airplayContainer" style="display:none;"><a id="airplay-toggle" class="airplay tiptip airplay-disabled"></a><form id="fbxPopup" style="display:none;"></form></div> \
                <div id="upnpRenderersContainer" style="display:none;"><a id="upnp-toggle" class="upnp tiptip upnp-disabled"></a><form id="upnpPopup" style="display:none;"></form></div> \
                <div class="tabscontent"> \
                    <div class="tabpage" id="tabpage_1"> \
                        <div id="loading" style="display:None;"><img style="float:left;width:28px;height:28px;margin-right:10px;"src="images/spinner.gif" /><p>' + _(" Loading videos...") + '</p></div> \
                         <div id="search"> \
                            <div id="search_results"><p> \
                            ' + _("Welcome to Ht5streamer !<br><br>Make a new search or select a category to start...") + ' \
                            </p></div> \
                            <div id="pagination"></div> \
                        </div> \
                        <div id="nanoContent" class="nano"> \
							<div id="items_container" class="nano-content"> \
							</div> \
						</div> \
                    </div> \
                    <div class="tabpage" id="tabpage_2"> \
                        <div id="treeview"> \
                        </div> \
                    </div> \
                    <div class="tabpage" id="tabpage_3"> \
							<a id="file_update" href="#"><img src="images/update.png" id="update_img" /> \
							<span>' + _("Update files list...") + '</span></a> \
                        <div id="fileBrowser"> \
							<div id="fileBrowserContent"> \
							</div> \
                        </div> \
                    </div> \
                     <div class="tabpage" id="tabpage_4"> \
                        <div id="DownloadsContainer"> \
                        </div> \
                    </div> \
                    <div class="tabpage" id="tabpage_5"> \
                        <div id="UpnpContainer"> \
                        </div> \
                    </div> \
                </div> \
            </div> \
        </div> \
    </div> \
     <div class="split-pane-divider" id="my-divider"></div> \
    <div class="split-pane-component" id="right-component"> \
         <video class="mejs-ted" id="videoPlayer" width="100%" height="100%" src="t.mp4" controls></video> \
    </div> \
    <div id="custom-menu"> \
<ol> \
</ol> \
</div> \
<div id="tipContent" style="display:none;"></div> \
<div id="upnpTipcontent" style="display:none;"></div> \
</div>';

try {
    process.on('uncaughtException', function(err) {
        try {
            var error = err.stack;
            if ((error.indexOf('Error: undefined is not a valid uri or options object.') !== -1) && (search_engine = 'Mega-search')) {
                $.notif({
                    title: 'Ht5streamer:',
                    cls: 'red',
                    icon: '&#59256;',
                    timeout: 6000,
                    content: _("Your mega.co link is valid but can't be played yet, (wait a few minutes...)"),
                    btnId: '',
                    btnTitle: '',
                    btnColor: '',
                    btnDisplay: 'none',
                    updateDisplay: 'none'
                });
                initPlayer();
            }
        } catch (err) {}
    });
} catch (err) {
    console.log("exception error" + err);
}


$(document).ready(function() {
    $('#main').append(htmlStr).hide();
    setTimeout(function(){
		if(settings.init === false) {
			loadSettingsPage();
		} else {
			checkUpdates();
			checkFreebox();
		}
	},1000);
    $('#loadingApp').empty().append('<img style="float:left;width:28px;height:28px;margin-right:10px;"src="images/spinner.gif" /><span>' + _("Loading ht5streamer...") + '</span>').show();
    // load plugins
    initPlugins();
    setResolution();
    
});

function main() {
    $('#loadingApp').remove();
    $('#main').show();
    $('div.split-pane').splitPane();
    // load and hide catgories
    getCategories();
    // start keyevent listener
    fn = function(e) {
        onKeyPress(e);
    };
    document.addEventListener("keydown", fn, false);
    // remove listener if input focused
    $('#video_search_query').focusin(function() {
        document.removeEventListener("keydown", fn, false);
    });
    $('#video_search_query').focusout(function() {
        document.addEventListener("keydown", fn, false);
    });
    //password input
    $(document).on('focusin', '.msgbox-inbox input[type="password"]', function() {
        document.removeEventListener("keydown", fn, false);
    });
    $(document).on('focusout', '.msgbox-inbox input[type="password"]', function() {
        document.addEventListener("keydown", fn, false);
    });
    // default parameters
    $('#resolutions_select').val(selected_resolution);
    $('#searchTypes_select').val('videos');

    $("select#engines_select option:selected").each(function() {
        search_engine = $(this).val();
        $(".nano").nanoScroller({ destroy: true });
    });

    player = MediaElementPlayer('#videoPlayer', {
        features: ['playpause', 'progress', 'current', 'duration', 'stop', 'volume', 'fullscreen']
    });
    // search form
    $('#video_search').bind('submit', function(e) {
        e.preventDefault();
        query = $('#video_search_query').val();
        current_start_index = 1;
        current_prev_start_index = 1;
        startSearch(query);
    });
    // open in browser
    $(document).on('click', '.open_in_browser', function(e) {
        e.preventDefault();
        gui.Shell.openExternal($(this).attr('href'));
    });
    $(document).on('click', '.open_folder', function(e) {
        e.preventDefault();
        gui.Shell.showItemInFolder(settings.download_dir + '/ht5streamer');
    });
    // fullscreen signal and callback
    var left;
    var right;
    $(document).on('click', '.mejs-fullscreen-button', function(e) {
		console.log("clicked")
		e.preventDefault();
        if (win.isFullscreen === true) {
            win.toggleFullscreen();
            $('#mep_0').removeClass('mejs-container-fullscreen');
            $('#left-component').show();
            $('#menu').show();
            player.isFullScreen = false;
            setTimeout(function() {
                $('#my-divider').css({
                    right: right + 'px'
                }).fadeIn();
                $.prototype.splitPane()
                $('#right-component').width($(document).width() - $('#left-component').width() - 5);
                $('#mep_0').attr('style', 'height:calc(100% - 37px) !important;top:37px;width:'+$('#right-component').width()+';');
            }, 200);
        } else {
            left = $('#left-component').width();
            right = $(document).width() - $('#my-divider').position.left;
            $('#my-divider').hide();
            $('#left-component').hide();
            $('#right-component').width(screen.width);
            $('#menu').hide();
            player.isFullScreen = true;
            win.enterFullscreen();
            $('#mep_0').attr('style', 'height:100% !important;top:0;width:100% !important;');
            $('#mep_0').addClass('mejs-container-fullscreen');
        }
    });
    // click on tab1 get focus
    $(document).on('click', '#tabHeader_1', function(e) {
        try {
            if ((search_engine === 'youtube') || (search_engine === 'dailymotion')) {
                var p = $('.highlight').position().top;
                $('#left-component').scrollTop(p - 45);
            } else {
                var p = $('.highlight').position().top;
                $('#left-component').scrollTop(p + 13);
            }
        } catch (err) {}
    });
    // next signal and callback
    $(document).on('click', '.mejs-next-btn', function(e) {
        e.preventDefault();
        if ($('.tabActiveHeader').attr('id') === 'tabHeader_1' || $('.tabActiveHeader').attr('id') === 'tabHeader_3' || $('.tabActiveHeader').attr('id') === 'tabHeader_5') {
            try {
                engine.play_next();
            } catch (err) {
                getNext();
            }
        } else {
            on_media_finished();
        }
    });
    // stop button
    $(document).on('click', '#stopBtn', function(e) {
		try {
			upnpMediaPlaying = false;
			continueTransition = false;
			mediaRenderer.stop();
		} catch(err) {}
        initPlayer();
    });
    // pause/stop button
    $('.mejs-playpause-button').click(function(e) {
        if (playAirMedia === true) {
            if (airMediaPlaying === true) {
                login(stop_on_fbx);
                if (currentMedia.link !== currentAirMedia.link) {
                    setTimeout(function() {
                        $('.mejs-overlay-button').hide();
                        play_on_fbx(currentMedia.link);
                    }, 2000);
                }
            } else {
                $('.mejs-overlay-button').hide();
                play_on_fbx(currentMedia.link);
            }
        }
    });
    //transcoder button
     $(document).on('click','#transcodeBtnContainer',function(e) {
		e.preventDefault();
		if(transcoderEnabled) {
			$('button[aria-controls="transcodeBtn"]').removeClass('transcoder-enabled').addClass('transcoder-disabled');
			$('button[aria-controls="transcodeBtn"]').attr('title',_('transcoding disabled'));
			transcoderEnabled = false;
		} else {
			$('button[aria-controls="transcodeBtn"]').removeClass('transcoder-disabled').addClass('transcoder-enabled');
			$('button[aria-controls="transcodeBtn"]').attr('title',_('transcoding enabled'));
			transcoderEnabled = true;
		}
	 });
    
    //playlist buttons
    $(document).on('click','#playlistBtn',function(e) {
		e.preventDefault();
		console.log('playlist clicked');
		var pos = $('button[aria-label="playlist"]').css('backgroundPosition-y');
		if(pos === '0px') {
			$('button[aria-label="playlist"]').attr('style', 'background-position-y:-16px !important');
			$('button[aria-label="playlist"]').attr('title',_('repeat mode'));
			playlistMode = 'loop';
		//} else if(pos === '-16px') {
			//$('button[aria-label="playlist"]').attr('style', 'background-position-y:-48px !important');
			//$('button[aria-label="playlist"]').attr('title','shuffle mode');
			//playlistMode = 'shuffle';
		} else if (pos === '-16px') {
			$('button[aria-label="playlist"]').attr('style', 'background-position-y:-48px !important');
			$('button[aria-label="playlist"]').attr('title',_('play and stop'));
			playlistMode = 'normal';
		} else if (pos === '-48px') {
			$('button[aria-label="playlist"]').attr('style', 'background-position-y:0px !important');
			$('button[aria-label="playlist"]').attr('title',_('playlist mode'));
			playlistMode = 'continue';
		}
	});
	
    // previous signal and callback
    $(document).on('click', '.mejs-back-btn', function(e) {
        e.preventDefault();
        getPrev();
    });
    // start video by clicking title
    $(document).on('click', '.start_video', function(e) {
        e.preventDefault();
        try {
            $('#' + current_song).closest('.youtube_item').toggleClass('highlight', 'false');
        } catch (err) {}
        // save current song/page and search for back btn
        try {
            prev_vid = current_song;
        } catch (err) {
            console.log('no media loaded, can\'t save current song...');
        }
        current_song_page = current_page;
        var title = $(this)[0].innerText;
        current_song = $(this).parent().closest('.youtube_item').find('div')[4].id;
        $('#' + current_song).closest('.youtube_item').toggleClass('highlight', 'true');
        startVideo(current_song, title);
    });
    // load video signal and callback
    $(document).on('click', '.video_link', function(e) {
        e.preventDefault();
        playFromfile = false;
        try {
            $('#' + current_song).closest('.youtube_item').toggleClass('highlight', 'false');
        } catch (err) {
            console.log(err);
        }
        current_song_page = current_page;
        current_song = $(this).parent().closest('.youtube_item').find('div')[4].id;
        $('#' + current_song).closest('.youtube_item').toggleClass('highlight', 'true');
        var video = {};
        video.link = $(this).attr('href');
        video.title = $('#' + current_song).parent().find('b')[0].innerText;
        video.next = next_vid;
        $('video').trigger('loadPlayer', video);
        if ($('.tabActiveHeader').attr('id') === 'tabHeader_1') {
            var p = $('.highlight').position().top;
            $('#left-component').scrollTop(p + 13);
        }
    });

    $(document).on('click', '.upnpMedia', function(e) {
        e.preventDefault();
        var stream = {};
        stream.data = $(this).attr('data');
        stream.link = XMLEscape.xmlUnescape($(this).attr('link'));
        stream.title = $(this).text();
        stream.type = $(this).attr('type');
        currentMedia = stream;
        if(upnpToggleOn) {
			if (upnpMediaPlaying === true) {
				upnpMediaPlaying = false;
				continueTransition = false;
				mediaRenderer.stop();
				setTimeout(function() {playUpnpRenderer(stream);},3000);
			} else {
				playUpnpRenderer(stream);
			}
		} else {	
			startPlay(stream);
		}
    });

    $('video').on('loadPlayer', function(e, video) {
        try {
            if ((playAirMedia === false) && (airMediaPlaying === true)) {
                login(stop_on_fbx);
            }
        } catch (err) {}
        startPlay(video);
    });
    //play local file
    $(document).on('click', '.localFile', function(e) {
        playFromFile = true;
        var video = {};
        video.link = $(this).attr('link');
        video.dir = $(this).attr('dir');
        video.title = $(this).attr('title');
        video.next = $(this).parent().next();
        $('#song-title').empty().append(_('Playing: ') + video.title);
        if (playAirMedia === true || upnpToggleOn) {
			upnpMediaPlaying = false;
			continueTransition = false;
			checkFileServerSettings(video.dir);
            video.title = video.title;
            video.link = 'http://' + ipaddress + ':8889/' + encodeURIComponent(video.title);
            $('video').trigger('loadPlayer', video, '');
        } else {
            $('video').trigger('loadPlayer', video, '');
        }
    });

    // next vid
    player.media.addEventListener('ended', function() {
        on_media_finished();
    });
    //load playlist
    $(document).on('click', '.load_playlist', function(e) {
        var pid = $(this).attr('id');
        loadPlaylistSongs(pid);
    });
    //load channels
    $(document).on('click', '.load_channel', function(e) {
        var pid = $(this).attr('id');
        loadChannelSongs(pid);
    });

    // download from plugin
    $(document).on('click', '.start_download', function(e) {
        e.preventDefault();
        var id = Math.floor(Math.random() * 100);
        var obj = JSON.parse(decodeURIComponent($(this).closest("li").find('a.start_media').attr("data")));
        downloadFile(obj.link, obj.title + obj.ext, id);
    });

    // download file signal and callback
    $(document).on('click', '.download_file', function(e) {
        e.preventDefault();
        var link = $(this).attr('href');
        var title = $(this).attr('alt');
        var engine = title.split('::')[2];
        if (search_engine === 'dailymotion') {
            var req = request(link, function(error, response, body) {
                if (!error) {
                    var link = response.request.href;
                    downloadFile(link, title, engine);
                } else {
                    console.log('can\'t get dailymotion download link');
                    return;
                }
            });
        } else {
            downloadFile(link, title, engine);
        }
    });
    //cancel download
    $(document).on('click', '.cancel', function(e) {
        canceled = true;
        var id = this.id.replace('cancel_', '');
        try {
            current_download[id].abort();
        } catch (err) {
            current_download[id].end();
        }
    });

    //hide preview
    $(document).on('click', '#closePreview', function(e) {
        e.preventDefault();
        $('#fbxMsg').empty().remove();
    });

    //engine select
    $("select#engines_select").change(function() {
        $("select#engines_select option:selected").each(function() {
			$(".nano").nanoScroller({ destroy: true });
            search_engine = $(this).val();
            searchTypes_select = 'videos';
            getCategories();
            pagination_init = false;
            current_page = 1;
            current_search_page = 1;
            current_start_index = 1;
            searchOptions.currentPage = 1;
            $("#searchTypes_select").empty().hide();
            $("#searchTypes_label").hide();
            $("#dateTypes_select").empty().hide();
            $("#searchFilters_label").hide();
            $("#searchFilters_select").empty().hide();
            $("#categories_label").hide();
            $("#categories_select").empty().hide();
            $("#orderBy_label").hide();
            $("#orderBy_select").empty().hide();
            $("#search").show();
            $("#searchTypesMenu_label").show();
            $("#items_container").empty().hide();
            $("#cover").remove();
            //$('#items_container').css({
                //"border": "1px solid black",
                //"position": "fixed !important",
                //"left": "5px",
                //"top": "150px"
            //});
            $('#search').css({
                "position": "fixed",
                "z-index": "500",
                "top": "74px",
                "width": "46%",
                "background": "white",
                "overflow": "auto",
                "height": "70px"
            }).show();
            $('#pagination').hide();
            try {
                engine = engines[search_engine];
                engine.init(gui, win.window, $.notif);
                $("#search p").empty().append(_("Engine %s ready...!", engine.engine_name)).show();
                // hide not needed menus
                $.each(engine.menuEntries, function(index, type) {
                    $("#" + type + "_select").empty();
                    var is = in_array(type, engine.defaultMenus);
                    if (is === false) {
                        $("#" + type + "_label").hide();
                        $("#" + type + "_select").hide();
                    } else {
                        $("#" + type + "_label").show();
                        $("#" + type + "_select").show();
                    }
                });
                // load searchTypes options
                if (engine.searchTypes !== undefined) {
                    $.each(engine.searchTypes, function(key, value) {
                        $('#searchTypes_select').append('<option value="' + value + '">' + key + '</option>');
                    });
                    searchTypes_select = engine.defaultSearchType;
                    $("#searchTypes_select").val(searchTypes_select);
                }
                // load orderBy filters
                if (engine.orderBy_filters !== undefined) {
                    $('#orderBy_select').empty();
                    $.each(engine.orderBy_filters, function(key, value) {
                        $('#orderBy_select').append('<option value="' + value + '">' + key + '</option>');
                    });
                    orderBy_select = engine.defaultOrderBy;
                    $("#orderBy_select").val(orderBy_select);
                }

                // load searchFilters filters
                if (engine.searchFilters !== undefined) {
                    $('#searchFilters_select').empty();
                    $.each(engine.searchFilters, function(key, value) {
                        $('#searchFilters_select').append('<option value="' + value + '">' + key + '</option>');
                    });
                    searchFilters_select = engine.defaultSearchFilter;
                    $("#searchFilters_select").val(searchFilters_select);
                }

                $('#video_search_query').prop('disabled', false);
                update_searchOptions();

            } catch (err) {
                if (search_engine === 'dailymotion') {
                    $("#search p").empty().append(_("Engine %s ready...!", 'dailymotion')).show();
                    var html = '<option value = "relevance">' + _("Relevance") + '</option> \
									<option value = "recent">' + _("Published") + '</option> \
									<option value = "visited">' + _("Views") + '</option> \
									<option value = "rated">' + _("Rating") + '</option>';
                    $('#orderBy_select').empty().append(html);
                    var html = '<option value = "videos">' + _("Videos") + '</option> \
								<option value = "playlists">' + _("Playlists") + '</option> \
								<option value = "category">' + _("Categories") + '</option>';
                    $('#searchTypes_select').empty().append(html);
                    var html = '<option value = ""></option> \
									<option value = "hd">HD</option> \
									<option id="3dopt" value = "3d">3D</option>';
                    $('#searchFilters_select').empty().append(html);

                } else {
                    $("#search p").empty().append(_("Engine %s ready...!", 'youtube')).show();
                    var html = '<option value = "relevance">' + _("Relevance") + '</option> \
									<option value = "published">' + _("Published") + '</option> \
									<option value = "viewCount">' + _("Views") + '</option> \
									<option value = "rating">' + _("Rating") + '</option>';
                    $('#orderBy_select').empty().append(html);
                    var html = '<option value = "videos">' + _("Videos") + '</option> \
								<option value = "playlists">' + _("Playlists") + '</option> \
								<option value = "category">' + _("Categories") + '</option> \
								<option id="channelsOpt" value = "channels">' + _("Channels") + '</option> \
								<option id="topRated" value = "topRated">' + _("Top rated") + '</option> \
								<option id="mostViewed" value = "mostViewed">' + _("Most viewed") + '</option>';
                    $('#searchTypes_select').empty().append(html);
                    var html = '<option value = ""></option> \
									<option value = "hd">HD</option> \
									<option id="3dopt" value = "3d">3D</option>';
                    $('#searchFilters_select').empty().append(html);
                }
                if ((search_engine === 'youtube') || (search_engine === 'dailymotion')) {
                    $('#video_search_query').prop('disabled', false);
                    $("#searchTypes_select").show();
                    $('#searchTypes_label').show();
                    $('#orderBy_label').show();
                    $('#orderBy_select').show();
                    $('#dateTypes_label').hide();
                    $('#dateTypes_select').hide();
                    $('#searchFilters_label').show();
                    $('#searchFilters_select').show();
                }
            }
        });
        $(".nano").nanoScroller({ destroy: true });
    });
    // search date select
    $("select#dateTypes_select").change(function() {
        $("select#dateTypes_select option:selected").each(function() {
            pagination_init = false;
            current_start_index = 1;
            current_prev_start_index = 1;
            current_page = 1;
            current_search_page = 1;
            searchDate = $(this).val();
        });
    });
    // search order
    $("select#orderBy_select").change(function() {
        $("select#orderBy_select option:selected").each(function() {
            pagination_init = false;
            current_start_index = 1;
            current_prev_start_index = 1;
            current_page = 1;
            current_search_page = 1;
            search_order = $(this).val();
        });
    });
    // categories 
    $("select#categories_select").change(function() {
        $("select#categories_select option:selected").each(function() {
            selected_category = $(this).val();
            pagination_init = false;
            current_start_index = 1;
            current_prev_start_index = 1;
            current_page = 1;
            current_search_page = 1;
            try {
                engine.search_type_changed();
                engine.pagination_init = false;
                searchOptions.currentPage = 1;
            } catch (err) {

            }
            $('#video_search_btn')[0].click();
        });
    });
    //search filters
    $("select#searchFilters_select").change(function() {
        $("select#searchFilters_select option:selected").each(function() {
            pagination_init = false;
            current_start_index = 1;
            current_prev_start_index = 1;
            current_page = 1;
            current_search_page = 1;
            searchFilters = $(this).val();
        });
    });
    // search types
    $("select#searchTypes_select").change(function() {
        $("select#searchTypes_select option:selected").each(function() {
            searchTypes_select = $(this).val();
            pagination_init = false;
            current_start_index = 1;
            current_prev_start_index = 1;
            current_page = 1;
            current_search_page = 1;
            try {
                engine.search_type_changed();
                engine.pagination_init = false;
                searchOptions.currentPage = 1;
            } catch (err) {
                console.log(err);
                if ((searchTypes_select === 'topRated') || (searchTypes_select === 'mostViewed')) {
                    $('#video_search_query').prop('disabled', true);
                    $('#orderBy_label').hide();
                    $('#orderBy_select').hide();
                    $('#searchFilters_label').hide();
                    $('#searchFilters_select').hide();
                    var html = '<option value = "today">' + _("Today") + '</option> \
								<option value = "this_week">' + _("This week") + '</option> \
								<option value = "this_month">' + _("This month") + '</option> \
								<option value = "all_time">' + _("All time") + '</option>';
                    $('#dateTypes_select').empty().append(html);
                    $('#dateTypes_label').show();
                    $('#dateTypes_select').show();
                } else {
                    $('#video_search_query').prop('disabled', false);
                    $('#searchTypes_label').show();
                    $('#orderBy_label').show();
                    $('#orderBy_select').show();
                    $('#dateTypes_label').hide();
                    $('#dateTypes_select').hide();
                    $('#searchFilters_label').show();
                    $('#searchFilters_select').show();
                }

                if (searchTypes_select === 'category') {
                    $('#categories_label').show();
                    $('#categories_select').show();
                    $('#orderBy_label').hide();
                    $('#orderBy_select').hide();
                } else {
                    $('#categories_label').hide();
                    $('#categories_select').hide();
                }
            }
        });
    });
    // convert to mp3
    $(document).on('click', '.convert', function(e) {
        e.preventDefault();
        convertTomp3Win($(this).attr('alt'));
    });
    // hide progress
    $(document).on('click', '.hide_bar', function(e) {
        e.preventDefault();
        $(this).closest('.progress').hide();
    });
    //settings
    $('#config_btn').click(function() {
        loadSettingsPage();
    });

    // airplay
    $('#airplay-toggle').click(function(e) {
        e.preventDefault();
        if (airplayToggleOn === false) {
            playAirMedia = true;
            airplayToggleOn = true;
            login(getAirMediaReceivers);
            $('#airplay-toggle').removeClass('airplay-disabled').addClass('airplay-enabled');
        } else {
            $('#airplay-toggle').qtip('destroy', true);
            $('#airplay-toggle').removeClass('airplay-enabled').addClass('airplay-disabled');
            airplayToggleOn = false;
            playAirMedia = false;
        }
    });
    
    $('#upnp-toggle').click(function(e) {
        e.preventDefault();
        if (upnpToggleOn === false) {
            playUpnpMedia = true;
            upnpToggleOn = true;
            loadUpnpRenderers();
            $('#upnp-toggle').removeClass('upnp-disabled').addClass('upnp-enabled');
        } else {
            $('#upnp-toggle').qtip('destroy', true);
            $('#upnp-toggle').removeClass('upnp-enabled').addClass('upnp-disabled');
            upnpToggleOn = false;
            playUpnpMedia = false;
        }
    });

    $(document).on('change', '.qtip-content input', function() {
		var inputClass = $(this).attr('class');
        var selected = $(this).prop('name');
        if(inputClass === "freebox") {
			airMediaDevice = selected;
		} else {
			__.some(cli._avTransports, function( el,index ) {
				if(el.friendlyName === selected) { upnpDevice = el._index}
				mediaRenderer = new Plug.UPnP_AVTransport( cli._avTransports[upnpDevice], { debug: false } );
				if(upnpMediaPlaying) {
					initPlayer();
				}
			});
		}
		$(".qtip-content input").each(function() {
			var name = $(this).prop('name');
			if (name !== selected) {
				$(this).prop('checked', '');
			}
		});
    });

    // rotate image
    $('#file_update').click(function(e) {
        e.preventDefault();
        AnimateRotate(1080);
        createLocalRootNodes();
    });

    // start default search
    searchTypes_select = 'videos';
    $('#video_search_query').prop('disabled', false);
    $('#orderBy_label').show();
    $('#orderBy_select').show();
    $('#searchFilters_label').show();
    $('#searchFilters_select').show();
    $('#dateTypes_label').hide();
    $('#dateTypes_select').hide();
    $('#items_container').hide();
    $('#song-title').empty().append(_('Stopped...'));

    window.ondragover = function(e) {
        e.preventDefault();
        return false
    };
    window.ondrop = function(e) {
        e.preventDefault();
        return false
    };

    var holder = document.getElementById('left-component');
    holder.ondrop = function(e) {
        e.preventDefault();
        var file = e.dataTransfer.files[0],
            reader = new FileReader();
        reader.onload = function(event) {};
        if (file.type === "application/x-bittorrent") {
            getTorrent(file.path);
        }
        return false;
    };
    win.on('maximize', function() {
        right = $(document).width() - $('#my-divider').position.left;
        $('#my-divider').hide();
        setTimeout(function() {
            $('#my-divider').css({
                right: right + 'px'
            }).fadeIn();
            $.prototype.splitPane()
            $('#right-component').width($(document).width() - $('#left-component').width() - 5);
        }, 200);
        $(".nano").nanoScroller();
    });

    win.on('unmaximize', function() {
        $('#my-divider').hide();
        setTimeout(function() {
            $('#my-divider').css({
                right: right + 'px'
            }).fadeIn();
            $.prototype.splitPane()
            $('#right-component').width($(document).width() - $('#left-component').width() - 5);
            $(".nano").nanoScroller();
        }, 200);
    });
    
    win.on('resize', function() {
        $(".nano").nanoScroller();
    });
    
    setTimeout(function() {
		// load upnp devices
		cli.searchDevices();
		cli.on('updateUpnpDevice', function() {
			updateUpnpList()
		});
		//fix upnp toggle position
		var pos = parseInt($('.tabs li').last().width()) + parseInt($('.tabs li').last().position().left);
		$('#upnpRenderersContainer').css({left: pos+'px'});
	},2000);
	
	$('button[aria-label="playlist"]').attr('title','play and stop');
	
	$('#items_container').bind('DOMNodeInserted DOMNodeRemoved', function() {
		$(".nano").nanoScroller();
	});
	$(".nano").nanoScroller();
    
}

// code from popcorn time (popcorntime.io)
function setResolution() {
    var zoom = 0;
    var screen = window.screen;

    if (ScreenResolution.QuadHD) {
        zoom = 2;
    } else if (ScreenResolution.UltraHD || ScreenResolution.Retina) {
        zoom = 1;
    }

    var width = localStorage.width ? localStorage.width : settings.defaultWidth;
    var height = localStorage.height ? localStorage.height : settings.defaultHeight;
    var x = localStorage.posX ? localStorage.posX : Math.round((screen.availWidth - settings.defaultWidth) / 2);
    var y = localStorage.posY ? localStorage.posY : Math.round((screen.availHeight - settings.defaultHeight) / 2);

    win.zoomLevel = zoom;
    win.resizeTo(width, height);
    win.moveTo(x, y);
}

function changePage() {
    current_page = $("#pagination").pagination('getCurrentPage');
    searchOptions.currentPage = current_page;
    startSearch(current_search);
}

function onKeyPress(key) {
    if (key.key === 'Esc' && document.activeElement.localName === "body") {
        key.preventDefault();
        if (win.isFullscreen === true) {
            win.toggleFullscreen();
            player.isFullScreen = false;
            $('#mep_0').removeClass('mejs-container-fullscreen');
            $('#mep_0').attr('style', 'height:calc(100% - 37px) !important;top:37px;');
            $('#left-component').show();
            $('#menu').show();
            setTimeout(function() {
                $('#my-divider').css({
                    right: right + 'px'
                }).fadeIn();
                $.prototype.splitPane()
                $('#right-component').width($(document).width() - $('#left-component').width() - 5);
            }, 200);
        }
    } else if (key.key === 'f' && document.activeElement.localName === "body") {
        key.preventDefault();
        if (win.isFullscreen === true) {
            win.toggleFullscreen();
            $('#mep_0').removeClass('mejs-container-fullscreen');
            $('#left-component').show();
            $('#menu').show();
            player.isFullScreen = false;
            setTimeout(function() {
                $('#my-divider').css({
                    right: right + 'px'
                }).fadeIn();
                $.prototype.splitPane()
                $('#right-component').width($(document).width() - $('#left-component').width() - 5);
                $('#mep_0').attr('style', 'height:calc(100% - 37px) !important;top:37px;width:'+$('#right-component').width()+';');
            }, 200);
        } else {
            left = $('#left-component').width();
            right = $(document).width() - $('#my-divider').position.left;
            $('#my-divider').hide();
            $('#left-component').hide();
            $('#right-component').width(screen.width);
            $('#menu').hide();
            player.isFullScreen = true;
            win.enterFullscreen();
            $('#mep_0').attr('style', 'height:100% !important;top:0;width:100% !important;');
            $('#mep_0').addClass('mejs-container-fullscreen');
        }
    } else if (key.key === 'Spacebar' && document.activeElement.localName === "body") {
        key.preventDefault();
            if ($('.mejs-play').length === 0) {
                $('.mejs-pause').click();
            } else {
                $('.mejs-play').click();
            }
    } else if (key.key === 'd' && document.activeElement.localName === "body") {
        key.preventDefault();
        win.showDevTools();
    }
}

function update_searchOptions() {
    searchOptions.searchType = $("#searchTypes_select").val();
    searchOptions.orderBy = $("#orderBy_select").val();
    searchOptions.dateFilter = $("#dateTypes_select").val();
    searchOptions.searchFilter = $("#searchFilters_select").val();
    searchOptions.category = $("#categories_select").val();
    engine.search_type_changed();
}

//search
function startSearch(query) {
    $("#search p").empty().append(' ');
    if ($('.tabActiveHeader').attr('id') !== 'tabHeader_1') {
        $("#tabHeader_1").click();
    }
    if ((query === '') && (browse === false)) {
        current_search = '';
        if ((searchTypes_select !== 'category') && (searchTypes_select !== 'topRated') && (searchTypes_select !== 'mostViewed')) {
            $('#video_search_query').attr('placeholder', '').focus();
            return;
        }
    }
    $('#items_container').empty().hide();
    $('#pagination').hide();
    $('#search').hide();
    $('#loading').show();
    if (query !== current_search) {
        current_page = 1;
        current_search_page = 1;
        current_start_index = 1;
        searchOptions.currentPage = 1;
        pagination_init = false;
        channelPagination = false;
    }
    current_search = query;
    try {
        searchOptions.searchType = $("#searchTypes_select option:selected").val();
        searchOptions.orderBy = $("#orderBy_select option:selected").val();
        searchOptions.dateFilter = $("#dateTypes_select option:selected").val();
        searchOptions.searchFilter = $("#searchFilters_select option:selected").val();
        searchOptions.category = $("#categories_select option:selected").val();
        engine.search(query, searchOptions, win.window);
    } catch (err) {

        if (search_engine === 'dailymotion') {
            if (searchTypes_select === 'videos') {
                dailymotion.searchVideos(query, current_page, searchFilters, search_order, function(datas) {
                    getVideosDetails(datas, 'dailymotion', false);
                });
            } else if (searchTypes_select === 'playlists') {
                dailymotion.searchPlaylists(query, current_page, function(datas) {
                    getPlaylistInfos(datas, 'dailymotion');
                });
            } else if (searchTypes_select === 'category') {
                dailymotion.categories(query, current_page, searchFilters, selected_category, function(datas) {
                    getVideosDetails(datas, 'dailymotion', false);
                });
            }
        } else if (search_engine === 'youtube') {
            if (searchTypes_select === 'videos') {
                youtube.searchVideos(query, current_page, searchFilters, search_order, function(datas) {
                    getVideosDetails(datas, 'youtube', false);
                });
            } else if (searchTypes_select === 'playlists') {
                youtube.searchPlaylists(query, current_page, function(datas) {
                    getPlaylistInfos(datas, 'youtube');
                });
            } else if (searchTypes_select === 'category') {
                youtube.categories(query, current_page, searchFilters, selected_category, function(datas) {
                    getVideosDetails(datas, 'youtube', false);
                });
            } else if (searchTypes_select === 'channels') {
                youtube.searchChannels(query, current_page, function(datas) {
                    getChannelsInfos(datas, 'youtube');
                });
            } else if (searchTypes_select === 'topRated') {
                youtube.standard(current_page, localeCode, 'top_rated', searchDate, function(datas) {
                    getVideosDetails(datas, 'youtube', false);
                });
            } else if (searchTypes_select === 'mostViewed') {
                youtube.standard(current_page, localeCode, 'most_popular', searchDate, function(datas) {
                    getVideosDetails(datas, 'youtube', false);
                });
            }
        }
    }
}

function changeChannelPage() {
    current_page = $("#pagination").pagination('getCurrentPage');
    $('#items_container').empty().hide();
    $('#pagination').hide();
    $('#search').hide();
    $('#loading').show();
    if (current_channel_engine === 'youtube') {
        youtube.loadChannelSongs(current_channel_link, current_page, function(datas) {
            fillPlaylistFromChannel(datas, current_channel_engine);
        });
    }
}
