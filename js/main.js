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
var win;
win = gui.Window.get();

onload = function() {
    try {
        win.on('close', function() {
            if (playAirMedia === true) {
                login(stop_on_fbx);
            }
            // clean torrent dir
            try {
                wipeTmpFolder();
                UPNPserver.stop();
            } catch (err) {}
            // close opened pages in engines
            $.each(engines, function(key, value) {
                var page = value.page;
                if (page !== undefined) {
                    try {
                        page.hide();
                        page.close(true);
                    } catch (err) {
                        console.log(err);
                        if (playAirMedia === true) {
                            login(stop_on_fbx);
                        }
                        try {
                            page.close(true);
                        } catch (err) {
                            process.exit();
                            if (playAirMedia === true) {
                                login(stop_on_fbx);
                            }
                        }
                    }
                }
            });
            win.hide();
            win.close(true);
        });
    } catch (err) {
        try {
            if (playAirMedia === true) {
                login(stop_on_fbx);
            }
        } catch (err) {}
        // clean torrent dir
        win.hide();
        win.close(true);
        process.exit();
    }
}

var fs = require('fs');
var path = require('path');
var request = require('request');
var https = require('https');
var http = require('follow-redirects').http;
var spawn = require('child_process').spawn;
var url = require('url');
var wrench = require("wrench");
var os = require('os');
var vidStreamer = require("vid-streamer");
var wrench = require("wrench");
var mega = require('mega');
var cp = require("child_process");
var exec = cp.exec;
var chdir = require('chdir');
var AdmZip = require('adm-zip');
var util = require('util');
var deviceType = require('ua-device-type');
var nodeip = require("node-ip");
var upnpServer = require("upnpserver");
var uuid = require('node-uuid');
var upnpClient = require('upnp-client');
var cli = new upnpClient();
var parseString = require('xml2js').parseString;
var __ = require('underscore');
var rmdir = require('rmdir');
var extPlayers = [];

var mediaServer;
var relTime;
var trackDuration;
var timeUpdater;

var tmpFolder = path.join(os.tmpDir(), 'ht5Torrents');
if( ! fs.existsSync(tmpFolder) ) { fs.mkdir(tmpFolder); }

win.on('loaded', function() {
    win.show();
});

//localize
var i18n = require("i18n");
var _ = i18n.__;
var localeList = ['en', 'fr', 'es', 'gr','it'];
var locale = 'en';

//engines
var dailymotion = require('dailymotion');
var youtube = require('yt-streamer');

//var player;
var exec_path = path.dirname(process.execPath);
var searchTypes_select = 'videos';
var selected_resolution = '1080p';
var selected_category = '';
var current_video = NaN;
var current_search = '';
var current_start_index = 1;
var current_prev_start_index = 1;
var current_page = 1;
var current_search_page = 1;
var current_song_page = 1;
var load_first_song_next = false;
var load_first_song_prev = false;
var current_song = NaN;
var next_vid;
var prev_vid;
var isDownloading = false;
var valid_vid = 0;
var searchFilters = '';
var search_order = 'relevance';
var current_download = {};
var canceled = false;
var previousLink;
var player;
var playAirMedia = false;
var playUpnpMedia = false;
var airMediaDevices = [];
var airMediaDevice;
var upnpDevices = [];
var upnpDevice = null;
var playFromHttp = false;
var playFromFile = false;
var playFromUpnp = false;
var playFromMega = false;
var playFromMegaUser = false;
var serverSettings;
var airMediaLink;
var airMediaPlaying = false;
var upnpMediaPlaying = false;
var ffmpeg;
var ffar = [];
var torrentsArr = [];
var UPNPserver;
var airplayToggleOn = false;
var upnpToggleOn = false;
var right = 0;
var left = 0;
var mediaRenderer;
var torrentPlaying = false;
var continueTransition = false;
var transcoderEnabled= false;
var currentRes = null;
var megaDownload = null;

// global var
var search_engine = 'youtube';
var total_pages = 0;
var pagination_init = false;
var current_channel_link = '';
var current_channel_engine = '';
var channelPagination = false;
var searchDate = 'today';
var pluginsDir;
var current_download
var downloads = [];
var megaName = '';
var megaSize = '';
var right;
var left;
var megaServer;
var videoArray = ["avi", "webm", "mp4", "flv", "mkv", "mpeg", "mp3", "mpg", "wmv", "wma", "mov", "wav", "ogg", "flac", "opus"];
var transcodeArray = ["avi", "flv", "mkv", "mpeg", "mpg", "wmv", "wma", "mov", "flac", "aac", "opus"];
var currentMedia;
var currentAirMedia = {};
var fn;
var pluginsList = ['grooveshark', 'mega-search', 'cpasbien', 'songza', 'thepiratebay'];
var excludedPlugins = ['mega', 'mega-files', 'vimeo'];
var loadedTimeout;
var playlistMode = 'normal';
var freeboxAvailable = false;

// settings
var confDir;
if (process.platform === 'win32') {
    confDir = process.env.APPDATA + '/ht5streamer';
} else {
    confDir = getUserHome() + '/.config/ht5streamer';
}
var settings = JSON.parse(fs.readFileSync(confDir + '/ht5conf.json', encoding = "utf-8"));
var download_dir = settings.download_dir;
var selected_resolution = settings.resolution;
var ipaddress = settings.ipaddress;

if (settings.shared_dirs === undefined) {
	settings.shared_dirs = [];
	fs.writeFile(confDir + '/ht5conf.json', JSON.stringify(settings), function(err) {
        if (err) {
            console.log(err);
        }
    });
}

// setup loccale
i18n.configure({
    defaultLocale: 'en',
    locales: localeList,
    directory: path.dirname(process.execPath) + '/locales',
    updateFiles: true
});

if (in_array(settings.locale, localeList)) {
    locale = settings.locale;
    i18n.setLocale(locale);
} else {
    i18n.setLocale('en');
}

var localeCode = 'US';
if (locale === 'fr') {
    localeCode = 'FR';
}

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
        <label id="searchTypesMenu_label">' + _("Search type:") + '</label> \
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
            <input type="hidden" name="encrypted" value="-----BEGIN PKCS7-----MIIHLwYJKoZIhvcNAQcEoIIHIDCCBxwCAQExggEwMIIBLAIBADCBlDCBjjELMAkGA1UEBhMCVVMxCzAJBgNVBAgTAkNBMRYwFAYDVQQHEw1Nb3VudGFpbiBWaWV3MRQwEgYDVQQKEwtQYXlQYWwgSW5jLjETMBEGA1UECxQKbGl2ZV9jZXJ0czERMA8GA1UEAxQIbGl2ZV9hcGkxHDAaBgkqhkiG9w0BCQEWDXJlQHBheXBhbC5jb20CAQAwDQYJKoZIhvcNAQEBBQAEgYBmHcTwkZVHsQ7EimJNLSyzrFrOADQweRC97+o8cIeNZ0tAKBmb+hYFTivYYsgXlUem2MtPN//bSTrSuNL+xJ6BM8bYbpI0dGboc5R8sQm7+C3P52kId9i2ASpf2kDIv1bawn7QS7VPWzmmBcdSHxebbCFeNXZbiPwdUErYmKPT9zELMAkGBSsOAwIaBQAwgawGCSqGSIb3DQEHATAUBggqhkiG9w0DBwQIn3GbrgT7UqSAgYiwhlHfhTD4HiCoxRJdiXAaA+hBewTtokllMOsBleogGKke3tA7BNscO8roDTXe/j44k63MHFTMaWCJQZhCUfA7ZC28ArH/sNL4pU0g20hf/UF3EopSuYlIx0MIBWO1rg+6p8CmvfHHW6ec+7UM0iRGopWpiNRTC3iq/I/11JR4Co6dtZ32cS5woIIDhzCCA4MwggLsoAMCAQICAQAwDQYJKoZIhvcNAQEFBQAwgY4xCzAJBgNVBAYTAlVTMQswCQYDVQQIEwJDQTEWMBQGA1UEBxMNTW91bnRhaW4gVmlldzEUMBIGA1UEChMLUGF5UGFsIEluYy4xEzARBgNVBAsUCmxpdmVfY2VydHMxETAPBgNVBAMUCGxpdmVfYXBpMRwwGgYJKoZIhvcNAQkBFg1yZUBwYXlwYWwuY29tMB4XDTA0MDIxMzEwMTMxNVoXDTM1MDIxMzEwMTMxNVowgY4xCzAJBgNVBAYTAlVTMQswCQYDVQQIEwJDQTEWMBQGA1UEBxMNTW91bnRhaW4gVmlldzEUMBIGA1UEChMLUGF5UGFsIEluYy4xEzARBgNVBAsUCmxpdmVfY2VydHMxETAPBgNVBAMUCGxpdmVfYXBpMRwwGgYJKoZIhvcNAQkBFg1yZUBwYXlwYWwuY29tMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDBR07d/ETMS1ycjtkpkvjXZe9k+6CieLuLsPumsJ7QC1odNz3sJiCbs2wC0nLE0uLGaEtXynIgRqIddYCHx88pb5HTXv4SZeuv0Rqq4+axW9PLAAATU8w04qqjaSXgbGLP3NmohqM6bV9kZZwZLR/klDaQGo1u9uDb9lr4Yn+rBQIDAQABo4HuMIHrMB0GA1UdDgQWBBSWn3y7xm8XvVk/UtcKG+wQ1mSUazCBuwYDVR0jBIGzMIGwgBSWn3y7xm8XvVk/UtcKG+wQ1mSUa6GBlKSBkTCBjjELMAkGA1UEBhMCVVMxCzAJBgNVBAgTAkNBMRYwFAYDVQQHEw1Nb3VudGFpbiBWaWV3MRQwEgYDVQQKEwtQYXlQYWwgSW5jLjETMBEGA1UECxQKbGl2ZV9jZXJ0czERMA8GA1UEAxQIbGl2ZV9hcGkxHDAaBgkqhkiG9w0BCQEWDXJlQHBheXBhbC5jb22CAQAwDAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQUFAAOBgQCBXzpWmoBa5e9fo6ujionW1hUhPkOBakTr3YCDjbYfvJEiv/2P+IobhOGJr85+XHhN0v4gUkEDI8r2/rNk1m0GA8HKddvTjyGw/XqXa+LSTlDYkqI8OwR8GEYj4efEtcRpRYBxV8KxAW93YDWzFGvruKnnLbDAF6VR5w/cCMn5hzGCAZowggGWAgEBMIGUMIGOMQswCQYDVQQGEwJVUzELMAkGA1UECBMCQ0ExFjAUBgNVBAcTDU1vdW50YWluIFZpZXcxFDASBgNVBAoTC1BheVBhbCBJbmMuMRMwEQYDVQQLFApsaXZlX2NlcnRzMREwDwYDVQQDFAhsaXZlX2FwaTEcMBoGCSqGSIb3DQEJARYNcmVAcGF5cGFsLmNvbQIBADAJBgUrDgMCGgUAoF0wGAYJKoZIhvcNAQkDMQsGCSqGSIb3DQEHATAcBgkqhkiG9w0BCQUxDxcNMTMwNjA3MjExODAwWjAjBgkqhkiG9w0BCQQxFgQUzhZbLVTlBvygP+mmsXzckBqoOU8wDQYJKoZIhvcNAQEBBQAEgYBK0cImu+1tRx1tVWV8ByLEINcA9lUsWi+AFFww1o7A+U8RacxlrRgb7ZKmJbURi8ZFHQtu018dMUy3BnB5y8zGSivlzCguu1MYhduO6tQ2W3bSW7+p4KHJ4q+2qH0vx+nNnpwDhdFXXMUfct1YXByt6mFHOTBrzWQXGSK/iUB14Q==-----END PKCS7----- "> \
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
    $('#loadingApp').empty().append('<img style="float:left;width:28px;height:28px;margin-right:10px;"src="images/spinner.gif" /><span>' + _("Loading ht5streamer...") + '</span>').show();
    // load plugins
    init();
    
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
            if ((settings.interface === undefined) || (settings.interface === '') || (settings.ipaddress === undefined) || (settings.ipaddress === '')) {
                $.notif({
                    title: 'Ht5streamer:',
                    cls: 'red',
                    icon: '&#59256;',
                    timeout: 0,
                    content: _("please select a network interface in the configuration panel"),
                    btnId: 'ok',
                    btnTitle: 'ok',
                    btnColor: 'black',
                    btnDisplay: 'block',
                    updateDisplay: 'none'
                })
                return;
            }
            if (serverSettings.rootFolder !== decodeURIComponent(video.dir)+'/') {
                try {
				server.close();
				} catch (err) {}
                serverSettings = {
                    "mode": "development",
                    "forceDownload": false,
                    "random": false,
                    "rootFolder": decodeURIComponent(video.dir) + '/',
                    "rootPath": "",
                    "server": "VidStreamer.js/0.1.4"
                }

                server = http.createServer(vidStreamer.settings(serverSettings));
                server.listen(8889);
            }
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
        editSettings();
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

    // create server
    if (settings.scan_dirs === undefined) {
        if (settings.shared_dirs.length !== 0) {
            createServer();
        }
    } else {
        if (settings.scan_dirs) {
            createServer();
        }
    }
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
    startMegaServer();

    //load upnp server
    startUPNPserver();

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

function startUPNPserver() {
    var upnpDirs = [];
    $.each(settings.shared_dirs, function(index, dir) {
        var share = {};
        share.path = dir;
        share.mountPoint = path.basename(dir).replace(' ', '_');
        upnpDirs.push(share);
        if (index + 1 == settings.shared_dirs.length) {
            UPNPserver = new upnpServer({
                name: 'Ht5streamer_' + os.hostname(),
                uuid: uuid.v4()
            }, upnpDirs);
            UPNPserver.start();
        }
    });
}

function getAuthTorrent(url,stream,toFbx) {
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function(){
		if (this.readyState == 4 && this.status == 200){
			var blob = this.response;
			var arrayBuffer;
			var fileReader = new FileReader();
			fileReader.onload = function() {
				arrayBuffer = this.result;
				var nodeBuffer = new Buffer(arrayBuffer);
				if(stream) {
					getTorrent(nodeBuffer);
				} else {
					var id = ((Math.random() * 1e6) | 0);
					var p = path.join(os.tmpDir(),''+id+'.torrent');
					fs.writeFile(p, nodeBuffer, function(err) {
					  if (err) throw err;
						if(toFbx) {
							var FormData = require('form-data');
							var form = new FormData();
							form.append('download_file',fs.createReadStream(p));
							form.submit({
							  host: 'mafreebox.freebox.fr',
							  path: '/api/v3/downloads/add',
							  headers: {'Content-Type': 'multipart/form-data;'+form.getBoundary(),
								        'Content-Length': blob.size,
								        'X-Requested-With':'XMLHttpRequest',
										'X-Fbx-App-Auth': session_token
						      }
							}, function(err, res) {
							  if(res.statusCode === 200) {
								$.notif({title: 'Ht5streamer:',cls:'green',icon: '&#10003;',content:_("Téléchargement ajouté avec succès sur la freebox!"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});  
							  } else {
								$.notif({title: 'Ht5streamer:',cls:'red',icon: '&#59256;',timeout:0,content:_("Impossible d'ajouter le téléchargement... !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: '',updateDisplay:'none'});
							  }
							});
						} else {
							gui.Shell.openItem(p);
						}
					});
				}
			};
			fileReader.readAsBinaryString(blob);
		}
	}
	xhr.open('GET', url);
	xhr.responseType = 'blob';
	xhr.send(); 	
}

function AnimateRotate(angle) {
    // caching the object for performance reasons
    $('#file_update span').text(_('Updating...'));
    var $elem = $('#update_img');

    // we use a pseudo object for the animation
    // (starts from `0` to `angle`), you can name it as you want
    $({
        deg: 0
    }).animate({
        deg: angle
    }, {
        duration: 2000,
        step: function(now) {
            // in the step-callback (that is fired each step of the animation),
            // you can use the `now` paramter which contains the current
            // animation-position (`0` up to `angle`)
            $elem.css({
                transform: 'rotate(' + now + 'deg)'
            });
            if (now === 1080) {
                $('#file_update span').text(_('Update files list...'));
            }
        }
    });
}

function startPlay(media) {
    initPlayer();
    playFromfile = false;
    playFromHttp = false;
    torrentPlaying = false;
    playFromUpnp = false;
    playFromMega = false;
    playFromMegaUser = false;
    var localLink = null;
    try {
        next_vid = media.next;
        var link = media.link;
        if(link.indexOf('http://'+ipaddress+':8888/?file') !== -1) {
			link = link.split('?file=')[1].replace('&tv','');
		} else {
			link = link.replace('&tv','');
		}
        var title = media.title;
        currentMedia = media;
        currentMedia.link = link;
        
        // set title
        $('#song-title').empty().append(_('Playing: ') + decodeURIComponent(title));
			
        // check type of link to play
		var linkType = link.split('&').pop();
		
		// torrents
		if (linkType === 'torrent') {
			torrentPlaying = true;
			currentMedia.link = link.replace('&torrent','');
			launchPlay();
		// http(s) links
		} else if (linkType === 'external') {
			playFromHttp = true;
			currentMedia.link = link.replace('&external','');
			launchPlay();
		// local files links
		} else if (link.indexOf('file:///') !== -1) {
			playFromFile = true;
			currentMedia.link = link.replace('file://','');
			launchPlay();
		// play from upnp server
		} else if (linkType === 'upnp') {
			playFromUpnp = true;
			currentMedia.link = link.replace('&upnp','');
			launchPlay();
		// else look for link already downloaded, if yes play it from hdd
		} else if (playFromFile == false) {
			fs.readdir(download_dir, function(err, filenames) {
				var i;
				count = filenames.length;
				if ((err) || (count === 0)) {
					launchPlay();
				} else {
					for (i = 0; i < filenames.length; i++) {
						ftitle = filenames[i];
						if ((title + '.mp4' === ftitle) || (title + '.webm' === ftitle) || (title + '.mp3' === ftitle)) {
							currentMedia.link = 'file://' + encodeURI(download_dir + '/' + ftitle);
						}
						count--;
						if (count === 0) {
							launchPlay();
						}
					}
				}
			});
		} else {
			launchPlay();
		}
    } catch (err) {
        console.log("error startPlay: " + err);
    }
}

function launchPlay() {
	// add link for transcoding
	if(transcoderEnabled || currentMedia.link.indexOf('mega.co.nz') !== -1) {
		var link = 'http://'+ipaddress+':8888/?file='+currentMedia.link;
		currentMedia.link = link;
	}
	
	if(upnpToggleOn) {
		upnpMediaPlaying = false;
		continueTransition = false;
		currentMedia.data = JSON.stringify({"protocolInfo" : "http-get:*"});
		if(currentMedia.type === undefined) {
			try {
				if (mime.lookup(currentMedia.title).indexOf('audio/') !== -1 || mime.lookup(currentMedia.link).indexOf('audio/') !== -1) {
					currentMedia.type = "object.item.audioItem.musicTrack";
				} else if (mime.lookup(currentMedia.title).indexOf('video/') !== -1 || mime.lookup(currentMedia.link).indexOf('video/') !== -1) {
					currentMedia.type = "object.item.videoItem";
				}
			} catch(err) {
				currentMedia.type = "object.item.videoItem";
			}
		}
		if (upnpMediaPlaying) {
			mediaRenderer.stop();
			setTimeout(function() { return playUpnpRenderer(currentMedia);},2000);
		} else {
			return playUpnpRenderer(currentMedia);
		}
	} else {
		console.log('PLAYING in player: ' + currentMedia.link)
		player.setSrc(currentMedia.link);
		player.play();
	}
}

function stopTorrent(res) {
  torrentPlaying = false;
  wipeTmpFolder();
  $.each(torrentsArr,function(index,torrent) {
    try {
    clearTimeout(statsUpdater);
    console.log("stopping torrent :" + torrent.name);
    var flix = torrent.obj;
    torrentsArr.pop(index,1);
    flix.destroy();
    delete flix;
    videoStreamer = null;
  } catch(err) {
      console.log(err);
  }
  });
}

var wipeTmpFolder = function() {
	var tmpDir2 = path.join(os.tmpDir(), 'torrent-stream');
    rmdir( tmpDir2, function ( err, dirs, files ){
		console.log( 'file '+files+' removed' );
	});
	
    if( typeof tmpFolder != 'string' ){ return; }
    fs.readdir(tmpFolder, function(err, files){
		$.each(files,function(index,dir) {
			try {
				rmdir( tmpFolder+'/'+dir, function ( err, dirs, files ){
					console.log( 'file '+files+' removed' );
				});
			} catch(err) {
				console.log('can t remove file '+files)
			}
		});
    });
    
}

function initPlayer() {
    player.pause();
    player.setSrc('');
    player.currentTime = 0;
    player.current[0].style.width = 0;
    player.loaded[0].style.width = 0;
    player.durationD.html('00:00:00');
    $('.mejs-time-loaded').width(0+'%');
    $('.mejs-time-buffering').width(0+'%');
	$('.mejs-time-current').width(0+'%');
	$('span.mejs-currenttime').text('00:00:00');
	$('span.mejs-duration').text('00:00:00');
    $("#preloadTorrent").remove();
    $(".mejs-overlay").show();
    $(".mejs-layer").show();
    $(".mejs-overlay-loading").hide();
    $(".mejs-overlay-button").show();
    $('#song-title').empty().append(_('Stopped...'));
    $('#fbxMsg').remove();
    continueTransition = false;
    clearInterval(timeUpdater);
    timeUpdater = null;
    if (upnpMediaPlaying === true) {
		upnpMediaPlaying = false;
		mediaRenderer.stop();
    }
    try {
        cleanffar();
        currentRes.end();
    } catch (err) {}
    try {
        $('#fbxMsg').remove();
    } catch (err) {}
    try {
		if(torrentPlaying) {
		 stopTorrent();
		}
	} catch (err) {}
}

function init() {
    pluginsDir = confDir + '/plugins/ht5streamer-plugins-master/';
    chdir(confDir, function() {
        $.get('https://github.com/smolleyes/ht5streamer-plugins/commits/master.atom', function(res) {
            var lastRev;
            try {
                lastRev = $($.find('link', res)[2]).attr('href').split('/').pop();
                console.log('lastRev is : ' + lastRev);
                fs.exists(confDir + '/rev.txt', function(exists) {
                    util.debug(exists ? compareRev(lastRev) : writeRevFile(lastRev));
                });
            } catch (err) {
                try {
                    lastRev = $('.sha-block', res).attr('href').split('/').pop();
                    console.log('lastRev is : ' + lastRev);
                    fs.exists(confDir + '/rev.txt', function(exists) {
                        util.debug(exists ? compareRev(lastRev) : writeRevFile(lastRev));
                    });
                } catch (err) {
                    console.log(err)
                    main();
                }
            }
        });
    });
}

function writeRevFile(lastRev) {
    console.log("Creating rev file...");
    fs.writeFile(confDir + '/rev.txt', lastRev, {
        overwrite: true
    }, function(err) {
        if (err) return console.log(err);
        console.log(lastRev + ' > rev.txt');
        updatePlugins('https://github.com/smolleyes/ht5streamer-plugins/archive/master.zip');
    });
}

function compareRev(lastRev) {
    console.log("Compare rev file...");
    fs.readFile(confDir + '/rev.txt', function(err, data) {
        if (err) throw err;
        var rev = data.toString();
        if ((rev !== '') && (rev !== null) && (rev === lastRev)) {
            loadApp();
        } else {
            writeRevFile(lastRev);
        }
    });
}

function updatePlugins(url) {
    console.log("Updating plugins");
    $('#loadingApp span').empty().append(_('Downloading plugins...'));
    var req = https.request(url);
    req.on('response', function(resp) {
        if (resp.statusCode > 300 && resp.statusCode < 400 && resp.headers.location) {
            return updatePlugins(resp.headers.location);
        }
        var file = fs.createWriteStream(confDir + '/master.zip', {
            flags: 'w'
        });
        resp.on('data', function(chunk) {
            file.write(chunk);
        }).on("end", function(e) {
            console.log("update terminated");
            file.end();
            try {
                if (!fs.existsSync(confDir + "/plugins")) {
                    fs.mkdir(confDir + "/plugins");
                }
                setTimeout(function() {
                    var zip = new AdmZip(confDir + '/master.zip');
                    zip.extractAllTo(confDir + "/plugins", true);
                    loadApp();
                }, 2000);
            } catch (err) {
                console.log("plugins update error" + err);
            }
        });
    }).on("error", function(e) {
        console.log("Got error: " + e.message);
    });
    req.end();
}


function reloadPlugins() {
    console.log('Reloading plugins');
    $('#engines_select').empty();
    $('#engines_select').append('<option value="youtube">Youtube</option>');
    $('#engines_select').append('<option value="dailymotion">Dailymotion</option>');
    var currentEngine = search_engine;
    engines = {};
    wrench.readdirRecursive(pluginsDir, function(error, files) {
        try {
            $.each(files, function(index, file) {
                if (file.match("node_modules") !== null) {
                    return;
                }
                var name = path.basename(file);
                if (name == 'main.js') {
                    try {
                        var eng = require(pluginsDir + file);
                        if (in_array(eng.engine_name.toLowerCase(), excludedPlugins)) {
                            return true;
                        }
                        if ((in_array(eng.engine_name.toLowerCase(), pluginsList) === false) || (in_array(eng.engine_name.toLowerCase(), settings.plugins))) {
                            engines[eng.engine_name] = eng;
                            // add entry to main gui menu
                            $('#engines_select').append('<option value="' + eng.engine_name + '">' + eng.engine_name + '</option>');
                        }
                    } catch (err) {
                        console.log("can't load plugin " + file + ", error:" + err)
                    }
                }
                if (index + 1 === files.length) {
                    engine = currentEngine;
                    $("#engines_select option[value='" + currentEngine + "']").attr('selected', 'selected');
                }
            });
        } catch (err) {}
    });
}

function loadApp() {
    wrench.readdirRecursive(pluginsDir, function(error, files) {
        try {
            $.each(files, function(index, file) {
                if (file.match("node_modules") !== null) {
                    return;
                }
                var name = path.basename(file);
                if (name == 'main.js') {
                    try {
                        var eng = require(pluginsDir + file);
                        if (in_array(eng.engine_name.toLowerCase(), excludedPlugins)) {
                            return true;
                        }
                        if ((in_array(eng.engine_name.toLowerCase(), pluginsList) === false) || (in_array(eng.engine_name.toLowerCase(), settings.plugins))) {
                            engines[eng.engine_name] = eng;
                            // add entry to main gui menu
                            $('#engines_select').append('<option value="' + eng.engine_name + '">' + eng.engine_name + '</option>');
                        }
                    } catch (err) {
                        console.log("can't load plugin " + file + ", error:" + err)
                    }
                }
            });
        } catch (err) {}
    });
    main();
}

function createServer() {
    try {
        server.close();
    } catch (err) {}
    var homeDir = getUserHome();
    serverSettings = {
        "mode": "development",
        "forceDownload": false,
        "random": false,
        "rootFolder": "/",
        "rootPath": "",
        "server": "VidStreamer.js/0.1.4"
    }
    server = http.createServer(vidStreamer.settings(serverSettings));
    server.listen(8889);
    createLocalRootNodes();
}

function getCategories() {
    $('#categories_label').hide();
    $('#categories_select').hide();
    if (search_engine === 'youtube') {
        http.get('http://gdata.youtube.com/schemas/2007/categories.cat?hl=' + locale, function(resp) {
            var datas = [];
            resp.on('data', function(chunk) {
                datas.push(chunk);
            }).on("end", function(e) {
                var xml = datas.join('');
                var xjs = new X2JS();
                var obj = xjs.xml_str2json(xml);
                var arr = obj.categories.category_asArray;
                selected_category = arr[0]._term;
                $('#categories_select').empty();
                for (var i = 0; i < arr.length; i++) {
                    $('#categories_select').append('<option value = "' + arr[i]._term + '">' + arr[i]._label + '</option>')
                }
            });
        }).on("error", function(e) {
            console.log("Got error: " + e.message);
        });
    } else if (search_engine === 'dailymotion') {
        https.get('https://api.dailymotion.com/channels', function(resp) {
            var datas = [];
            resp.on('data', function(chunk) {
                datas.push(chunk);
            }).on("end", function(e) {
                var obj = JSON.parse(datas.join(''));
                var arr = obj.list;
                selected_category = arr[0].id;
                $('#categories_select').empty();
                for (var i = 0; i < arr.length; i++) {
                    $('#categories_select').append('<option value = "' + arr[i].id + '">' + arr[i].name + '</option>')
                }
            });
        }).on("error", function(e) {
            console.log("Got error: " + e.message);
        });
    }
}

function on_media_finished(){
	if (playlistMode === 'normal') {
		initPlayer();
	} else if (playlistMode === 'loop') {
		if(upnpMediaPlaying) {
			playUpnpRenderer(currentMedia)
		} else {
			startPlay(currentMedia);
		}
	} else if (playlistMode === 'shuffle') {
		
	} else if (playlistMode === 'continue') {
		getNext();
	} 
}

function getNext() {
	$('.mejs-time-buffering').width(0+'%');
	$('.mejs-time-current').width(0+'%');
	$('span.mejs-currenttime').text('00:00:00');
	$('span.mejs-duration').text('00:00:00');
    $("#preloadTorrent").remove();
    $(".mejs-overlay").show();
    $(".mejs-layer").show();
    $(".mejs-overlay-loading").hide();
    $(".mejs-overlay-button").show();
    $('#song-title').empty().append(_('Stopped...'));
    $('#fbxMsg').remove();
    console.log("trying get next video", next_vid);
    // if previous page ended while playing continue with the first video on the new page
    if (load_first_song_next === true) {
        //try to load a new page if available
        try {
            if (total_pages > current_page) {
                $('.next').click();
            } else {
                console.log('No more videos to plays...');
            }
        } catch (err) {
            console.log(err + " : can't play next video...");
        }
    } else if (load_first_song_prev === true) {
        try {
            if (current_page > 1) {
                $('.prev').click();
            } else {
                console.log('No more videos to plays...');
            }
        } catch (err) {
            console.log(err + " : can't play next video...");
        }
    } else {
		if ($('.tabActiveHeader').attr('id') === 'tabHeader_1' || $('.tabActiveHeader').attr('id') === 'tabHeader_4') {
			try {
				engine.play_next();
			} catch(err) {
				if ($('.tabActiveHeader').attr('id') === 'tabHeader_1') {
					try {
						$('.highlight').closest('li').next().find('a')[0].click();
					} catch (err) {}
				}
			}
		}
		if ($('.tabActiveHeader').attr('id') === 'tabHeader_1') {
			try {
				$('.highlight').closest('li').next().find('a.preload')[0].click();
			} catch (err) {
				try {
					var vid_id = $('.highlight').closest('div.youtube_item').next().find('div')[4].id;
					startVideo(vid_id);
				} catch (err) {
					playNextVideo(next_vid);
				}
			}
		} else if (($('.tabActiveHeader').attr('id') === 'tabHeader_2') || ($('.tabActiveHeader').attr('id') === 'tabHeader_3') || ($('.tabActiveHeader').attr('id') === 'tabHeader_5')) {
			var vid = $('.jstree-clicked').attr('id');
			if (vid === undefined) {
				console.log("no more videos to play in the playlists");
			} else {
				$('#' + vid).next().find('a').click();
			}
		} else {
			try {
				$('.highlight').closest('li').next().find('a')[0].click();
			} catch (err) {
				playNextVideo(next_vid);
			}
		}
    }
}

function getPrev() {
	$('.mejs-time-buffering').width(0+'%');
	$('.mejs-time-current').width(0+'%');
	$('span.mejs-currenttime').text('00:00:00');
	$('span.mejs-duration').text('00:00:00');
    $("#preloadTorrent").remove();
    $(".mejs-overlay").show();
    $(".mejs-layer").show();
    $(".mejs-overlay-loading").hide();
    $(".mejs-overlay-button").show();
    $('#song-title').empty().append(_('Stopped...'));
    $('#fbxMsg').remove();
    if ($('.tabActiveHeader').attr('id') === 'tabHeader_2') {
        var vid = $('.jstree-clicked').attr('id');
        if (vid === undefined) {
            console.log("no more videos to play in the playlists");
        } else {
            var pid = $('#' + vid).prev().attr('id');
            if (pid.match(/node/) === null) {
                $('#' + pid).find('a').click();
            } else {
                console.log("no previous videos to play in the playlists");
            }
        }
    } else {
        try {
            $('.highlight').closest('li').prev().find('a.preload')[0].click();
        } catch (err) {
            playNextVideo(prev_vid);
        }
    }
}


function changePage() {
    current_page = $("#pagination").pagination('getCurrentPage');
    searchOptions.currentPage = current_page;
    startSearch(current_search);
}

function onKeyPress(key) {
    if (key.key === 'Esc') {
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
    } else if (key.key === 'f') {
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
    } else if (key.key === 'Spacebar') {
        key.preventDefault();
        if (playAirMedia === false) {
            if ($('.mejs-play').length === 0) {
                $('.mejs-playpause-button').click();
            }
        } else {
            if ($('.mejs-play').length === 0) {
                $('.mejs-pause').click();
            }
        }
    } else if (key.key === 'd') {
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

function searchRelated(vid, page, engine) {
    if (search_engine === 'youtube') {
        youtube.searchRelated(vid, page, searchFilters, function(datas) {
            getVideosDetails(datas, 'youtube', true, vid);
        });
    } else if (search_engine === 'dailymotion') {
        dailymotion.searchRelated(vid, page, searchFilters, function(datas) {
            getVideosDetails(datas, 'dailymotion', true, vid);
        });
    }
}

function getVideosDetails(datas, engine, sublist, vid) {
    switch (engine) {
        case 'youtube':
            var items = datas.items;
            var totalResults = datas.totalItems;
            var pages = totalResults / 10;
            var startPage = 1;
            var browse = false;
            var has_more = false;
            var itemsByPage = 25;
            break;
        case 'dailymotion':
            var items = datas.list;
            var totalResults = datas.total;
            var pages = totalResults / 10;
            var startPage = 1;
            var browse = false;
            var has_more = datas.has_more;
            var itemsByPage = 25;
            break;
    }
    if (totalResults === 0) {
        if (sublist === false) {
            $('#search_results').html(_("<p><strong>No videos</strong> found...</p>"));
            $('#search').show();
            $('#loading').hide();
            return;
        }
        // for dailymotion
    } else if ((totalResults === undefined) && (datas.limit !== 10) || (engine === 'youtube') && (searchTypes_select === 'topRated') || (searchTypes_select === 'mostViewed')) {
        $('#search_results').html('<p>' + _("Browsing mode, use the pagination bar to navigate") + '</p>');
        browse = true;
        if ((sublist === false) && (pagination_init === false)) {
            $("#pagination").pagination({
                itemsOnPage: 25,
                pages: current_page + 1,
                currentPage: current_page,
                displayedPages: 5,
                cssStyle: 'compact-theme',
                edges: 1,
                prevText: '' + _("Prev") + '',
                nextText: '' + _("Next") + '',
                onPageClick: changePage
            });
            if ((datas.has_more === true) && (engine === 'dailymotion') || (engine === 'youtube') && (searchTypes_select === 'topRated') || (searchTypes_select === 'mostViewed')) {
                pagination_init = false;
            } else {
                pagination_init = true;
            }
            total_pages = $("#pagination").pagination('getPagesCount');
        }
    }
    // print total results
    if (sublist === false) {
        if ((totalResults !== undefined) && (browse === false)) {
            $('#search_results').html('<p><strong>' + totalResults + '</strong> ' + _("videos found") + '</p>');
        }
    } else {
        try {
            var p = $('#loadmore_' + vid).attr('alt').split('::')[1];
            if (parseInt(p) === startPage) {
                var string = $('#sublist_' + vid).parent().parent().find('a').first().text();
                $('#sublist_' + vid).parent().parent().find('a').first().html(string + ' (' + totalResults + ' ' + _("Videos found") + ')');

            }
        } catch (err) {
            console.log(err);
            return;
        }
        var page = parseInt(p) + 1;
        if (search_engine === 'dailymotion') {
            if (has_more === true) {
                $('#loadmore_' + vid).attr('alt', '' + totalResults + '::' + page + '::' + vid + '::' + engine + '').show();
            } else {
                $('#loadmore_' + vid).hide();
            }
        } else {
            if (pages > page) {
                $('#loadmore_' + vid).attr('alt', '' + totalResults + '::' + page + '::' + vid + '::' + engine + '').show();
            } else {
                $('#loadmore_' + vid).hide();
            }
        }
    }
    try {
        p = items.length;
    } catch (err) {
        if (sublist === false) {
            $('#search_results').html(_("<p><strong>No videos</strong> found...</p>"));
            $('#search').show();
            $('#loading').hide();
            return;
        }
    }
    // init pagination bar
    if ((sublist === false) && (pagination_init === false) && (browse === false)) {
        $("#pagination").pagination({
            items: totalResults,
            itemsOnPage: itemsByPage,
            displayedPages: 5,
            cssStyle: 'compact-theme',
            edges: 1,
            prevText: '' + _("Prev") + '',
            nextText: '' + _("Next") + '',
            onPageClick: changePage
        });
        pagination_init = true;
        total_pages = $("#pagination").pagination('getPagesCount');
    }
    // load videos
    switch (engine) {
        case 'dailymotion':
            for (var i = 0; i < items.length; i++) {
                dailymotion.getVideoInfos(items[i].id, i, items.length, function(datas) {
                    fillPlaylist(datas, sublist, vid, 'dailymotion')
                });
            }
            break;
        case 'youtube':
            for (var i = 0; i < items.length; i++) {
                youtube.getVideoInfos('http://www.youtube.com/watch?v=' + items[i].id, i, items.length, function(datas) {
                    fillPlaylist(datas, sublist, vid, 'youtube')
                });
            }
            break;
    }
}

function getPlaylistInfos(datas, engine) {
    sublist = false;
    switch (engine) {
        case 'youtube':
            var items = datas.items;
            var totalResults = datas.totalItems;
            var itemsByPage = 25;
            break;
        case 'dailymotion':
            var items = datas.list;
            var totalResults = datas.total;
            var itemsByPage = 25;
            break;
    }
    if (totalResults === 0) {
        $('#search_results').html(_("<p><strong>No playlist</strong> found...</p>"));
        $('#search').show();
        $('#loading').hide();
        return;
    }
    $('#search_results').html('<p><strong>' + totalResults + '</strong> ' + _("playlists found") + '</p>');
    try {
        for (var i = 0; i < items.length; i++) {
            loadPlaylistItems(items[i], engine);
        }
        if ((sublist === false) && (pagination_init === false)) {
            $("#pagination").pagination({
                items: totalResults,
                itemsOnPage: itemsByPage,
                displayedPages: 5,
                cssStyle: 'compact-theme',
                edges: 1,
                prevText: '' + _("Prev") + '',
                nextText: '' + _("Next") + '',
                onPageClick: changePage
            });
            pagination_init = true;
            total_pages = $("#pagination").pagination('getPagesCount');
        }
    } catch (err) {
        $('#search_results').html(_("<p><strong>No playlist</strong> found...</p>"));
        $('#search').show();
        $('#loading').hide();
    }
    $('#items_container').show();
    $('#pagination').show();
    $('#search').show();
    $('#loading').hide();
}

function getChannelsInfos(datas, engine) {
    sublist = false;
    switch (engine) {
        case 'youtube':
            var items = datas.feed.entry;
            var totalResults = datas.feed.openSearch$totalResults['$t'];
            break;
        case 'dailymotion':
            var items = datas.list;
            var totalResults = datas.total;
            break;
    }
    if (totalResults === 0) {
        $('#search_results').html(_("<p><strong>No channels</strong> found...</p>"));
        $('#search').show();
        $('#loading').hide();
        return;
    }
    $('#search_results').html('<p><strong>' + totalResults + '</strong> ' + _("channels found") + '</p>');
    try {
        for (var i = 0; i < items.length; i++) {
            loadChannelsItems(items[i], engine);
        }
        if ((sublist === false) && (pagination_init === false)) {
            $("#pagination").pagination({
                items: totalResults,
                itemsOnPage: 25,
                displayedPages: 5,
                cssStyle: 'compact-theme',
                edges: 1,
                prevText: '' + _("Prev") + '',
                nextText: '' + _("Next") + '',
                onPageClick: changePage
            });
            pagination_init = true;
            total_pages = $("#pagination").pagination('getPagesCount');
        }
    } catch (err) {
        $('#search_results').html(_("<p><strong>No playlist</strong> found...</p>"));
        $('#search').show();
        $('#loading').hide();
    }
    $('#items_container').show();
    $('#pagination').show();
    $('#search').show();
    $('#loading').hide();
}

function loadPlaylistItems(item, engine) {
    if (search_engine === 'dailymotion') {
        var title = item.name;
        var thumb = item.thumbnail_medium_url;
        var pid = item.id;
        var length = item.videos_total;
        var author = item['owner.username'];
        var description = item.description;
        $('#items_container').append('<div class="youtube_item_playlist"><img src="' + thumb + '" style="float:left;width:120px;height:90px;"/><div class="left" style="width:238px;"><p><b>' + title + '</b></p><p><span><b>total videos:</b> ' + length + '</span>      <span><b>      author:</b> ' + author + '</span></p></div><div class="right"><a href="#" id="' + pid + '::' + length + '::' + engine + '" class="load_playlist"><img width="36" height ="36" src="images/play.png" /></a></div></div>');

    } else if (engine === 'youtube') {
        var pid = item.id;
        var length = item.size;
        var author = item.author;
        var description = item.description;
        var thumb = item.thumbnail.sqDefault;
        var title = item.title;
        $('#items_container').append('<div class="youtube_item_playlist"><img src="' + thumb + '" style="float:left;width:120px;height:90px;"/><div class="left" style="width:238px;"><p><b>' + title + '</b></p><p><span><b>total videos:</b> ' + length + '</span>      <span><b>      author:</b> ' + author + '</span></p></div><div class="right"><a href="#" id="' + pid + '::' + length + '::' + engine + '" class="load_playlist"><img width="36" height ="36" src="images/play.png" /></a></div></div>');

    }
}

function loadChannelsItems(item, engine) {
    if (search_engine === 'dailymotion') {
        var title = item.name;
        var thumb = item.thumbnail_medium_url;
        var pid = item.id;
        var length = item.videos_total;
        var author = item['owner.username'];
        var description = item.description;
    } else if (engine === 'youtube') {
        var pid = item.id;
        var length = item.gd$feedLink[0].countHint;
        var author = item.author[0].name['$t'];
        var description = item.summary['$t'];
        var thumb = item.media$thumbnail[0].url;
        var title = item.title['$t'];
        var link = item.gd$feedLink[0].href;
    }
    $('#items_container').append('<div class="youtube_item_channel"><img src="' + thumb + '" style="float:left;width:120px;height:90px;"/><div class="left" style="width:238px;"><p><b>' + title + '</b></p><p><span><b>total videos:</b> ' + length + '</span>      <span><b>      author:</b> ' + author + '</span></p></div><div class="right"><a href="#" id="' + pid + '::' + length + '::' + engine + '::' + link + '" class="load_channel"><img width="36" height ="36" src="images/play.png" /></a></div></div>');
}

function loadPlaylistSongs(pid) {
    $('#items_container').empty().hide();
    $('#pagination').hide();
    $('#search').hide();
    $('#loading').show();
    var plid = pid.split('::')[0];
    var length = pid.split('::')[1];
    var engine = pid.split('::')[2]
    current_start_index = 1;
    current_prev_start_index = 1;
    current_search_page = 1;
    if (search_engine === 'dailymotion') {
        dailymotion.loadSongs(plid, length, current_search_page, function(datas, length, pid, engine) {
            fillPlaylistFromPlaylist(datas, length, pid, engine);
        });
    } else if (engine === 'youtube') {
        youtube.loadSongs(plid, length, current_start_index, function(datas, length, pid, engine) {
            fillPlaylistFromPlaylist(datas, length, pid, engine);
        });
    }
}

function loadChannelSongs(pid) {
    $('#items_container').empty().hide();
    $('#pagination').hide();
    $('#search').hide();
    $('#loading').show();
    var plid = pid.split('::')[0];
    var length = pid.split('::')[1];
    var engine = pid.split('::')[2];
    var link = pid.split('::')[3];
    current_start_index = 1;
    current_prev_start_index = 1;
    current_search_page = 1;
    pagination_init = false;
    current_channel_link = link;
    if (search_engine === 'dailymotion') {
        dailymotion.loadSongs(link, current_search_page, function(datas) {
            fillPlaylistFromPlaylist(datas, engine);
        });
    } else if (engine === 'youtube') {
        youtube.loadChannelSongs(link, current_search_page, function(datas) {
            fillPlaylistFromChannel(datas, engine);
        });
    }
}

function fillPlaylistFromMixtape(datas, engine) {
    var sublist = false;
    var items = datas[1].items;
    var totalResults = datas[1].totalResults;
    if (totalResults === 0) {
        $('#search_results').html(_("<p><strong>No sounds</strong> found...</p>"));
        $('#search').show();
        $('#loading').hide();
        return;
    } else {
        $('#search_results').html('<p><strong>' + totalResults + '</strong> ' + _("sounds in this mixtape") + ' </p>');
        try {
            for (var i = 0; i < items.length; i++) {
                var infos = {};
                infos.id = items[i].songId;
                infos.resolutions = items[i].resolutions;
                infos.author = items[i].author;
                infos.views = items[i].views;
                infos.title = infos.author + ' - ' + items[i].title;
                infos.thumb = items[i].thumb;
                infos.slink = items[i].songLink;
                printVideoInfos(infos, false, false, '', engine);
            }
        } catch (err) {
            $('#search_results').html(_("<p><strong>No sounds</strong> found...</p>"));
            $('#search').show();
            $('#loading').hide();
        }
    }
    $('#search').show();
    $('#loading').hide();
    $('#items_container').show();
}

function fillPlaylistFromChannel(datas, engine) {
    var sublist = false;
    current_channel_engine = engine;
    channelPagination = true;
    switch (engine) {
        case 'youtube':
            var items = datas.data.items;
            var totalResults = datas.data.totalItems;
            break;
        case 'dailymotion':
            var items = datas.list;
            var totalResults = datas.total;
            break;
    }
    if (totalResults === 0) {
        $('#search_results').html(_("<p><strong>No videos</strong> found...</p>"));
        $('#search').show();
        $('#loading').hide();
        return;
    } else {
        $('#search_results').html('<p><strong>' + totalResults + '</strong> ' + _("videos found in this channel") + ' </p>');
        try {
            for (var i = 0; i < items.length; i++) {
                if (search_engine === 'youtube') {
                    youtube.getVideoInfos('http://www.youtube.com/watch?v=' + items[i].id, i, items.length, function(datas) {
                        fillPlaylist(datas, false, '', 'youtube');
                    });
                }
            }
            if ((sublist === false) && (pagination_init === false)) {
                $("#pagination").pagination({
                    items: totalResults,
                    itemsOnPage: 25,
                    displayedPages: 5,
                    cssStyle: 'compact-theme',
                    edges: 1,
                    prevText: '' + _("Prev") + '',
                    nextText: '' + _("Next") + '',
                    onPageClick: changeChannelPage
                });
                pagination_init = true;
                total_pages = $("#pagination").pagination('getPagesCount');
            }
        } catch (err) {
            $('#search_results').html(_("<p><strong>No videos</strong> found...</p>"));
            $('#search').show();
            $('#loading').hide();
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

function fillPlaylistFromPlaylist(datas, length, pid, engine) {
    var sublist = false;
    if (search_engine === 'dailymotion') {
        var items = datas.list;
        for (var i = 0; i < items.length; i++) {
            dailymotion.getVideoInfos(items[i].id, i, items.length, function(datas) {
                fillPlaylist(datas, false, '', 'dailymotion');
            });
        }
        if (datas.has_more === true) {
            current_search_page += 1;
            setTimeout(function() {
                dailymotion.loadSongs(pid, length, current_search_page, function(datas, length, pid, engine) {
                    fillPlaylistFromPlaylist(datas, length, pid, engine);
                });
            }, 2000);
        } else {
            current_page = 1;
            current_search_page = 1;
        }
    } else if (engine === 'youtube') {
        var items = datas.items;
        current_start_index += 25;
        valid_vid = $('.youtube_item').length
        if (sublist === false) {
            $('#search_results').html('<p><strong>' + valid_vid + '</strong>' + _("verified videos in this playlist") + '</p>');
        }
        try {
            for (var i = 0; i < items.length; i++) {
                youtube.getVideoInfos('http://www.youtube.com/watch?v=' + items[i].video.id, i, items.length, function(datas) {
                    fillPlaylist(datas, false, '', 'youtube');
                });
            }
        } catch (err) {
            if (sublist === false) {
                $('#search_results').html('<p><strong>' + valid_vid + '</strong>' + _("verified videos in this playlist") + '</p>');
                return;
            }
        }
        if (parseInt(current_start_index) < parseInt(length)) {
            setTimeout(function() {
                youtube.loadSongs(pid, length, current_start_index, function(datas, length, pid, engine) {
                    fillPlaylistFromPlaylist(datas, length, pid, engine);
                });
            }, 2000);
        } else {
            current_start_index = 1;
            current_page = 1;
        }
    }
}

function fillPlaylist(items, sublist, sublist_id, engine) {
    for (var i = 0; i < items.length; i++) {
        if (items.length === 1) {
            printVideoInfos(items[i], true, sublist, sublist_id, engine);
            var pos = $('#items_container .youtube_item').first().position()['top'];
            $(window).scrollTop(pos - 65);
        } else {
            printVideoInfos(items[i], false, sublist, sublist_id, engine);
        }
    }
    $('#items_container').show();
    $('#pagination').show();
    $('#search').show();
    $('#loading').hide();
    if (searchTypes_select === 'playlists') {
        $('#pagination').hide();
        if (sublist === false) {
            var valid_vid = $('.youtube_item').length
            $('#search_results').html('<p><strong>' + valid_vid + '</strong>' + _("verified videos in this playlist") + '</p>');
        }
    }
    if (load_first_song_next == true || load_first_song_prev === true) {
        playNextVideo();
    }
    $(".nano").nanoScroller();
}

function printVideoInfos(infos, solo, sublist, sublist_id, engine) {
    try {
        var title = infos.title.replace(/[\"\[\]\.\)\(\''\*]/g, '').replace(/  /g, ' ');
        var thumb = infos.thumb;
        var vid = infos.id;
        var seconds = secondstotime(infos.duration);
        var views = infos.views;
        var author = infos.author;
        if (author === 'unknown') {
            author = _("unknown");
        }
        if ($('#youtube_entry_res_' + vid).length === 1) {
            return;
        }
        if ($('#youtube_entry_res_sub_' + vid).length === 1) {
            return;
        }
        var page = 1;
        if (solo === true) {
            $('#items_container').prepend('<div class="youtube_item"><div class="left"><img src="' + thumb + '" class="video_thumbnail" /></div><div class="item_infos"><span class="video_length">' + seconds + '</span><div><p><a class="start_video"><b>' + title + '</b></a></p><div><span><b>' + _("Posted by:") + '</b> ' + author + ' </span><span style="margin-left:10px;"><b>' + _("Views:") + ' </b> ' + views + '</span></div></div><div id="youtube_entry_res_' + vid + '"></div></div></a><div class="toggle-control"><a href="#" class="toggle-control-link" alt="' + vid + '::' + engine + '">+ ' + _("Open related videos") + '</a><div class="toggle-content" style="display:none;"><div id="sublist_' + vid + '"></div><button id="loadmore_' + vid + '" href="#" class="load_more" alt="0::' + page + '::' + vid + '::' + engine + '" style="display:none">' + _("Load more videos") + '</button></div></div></div>');
        } else {
            if (sublist === false) {
                $('#items_container').append('<div class="youtube_item"><div class="left"><img src="' + thumb + '" class="video_thumbnail" /></div><div class="item_infos"><span class="video_length">' + seconds + '</span><div><p><a class="start_video"><b>' + title + '</b></a></p><div><span><b>' + _("Posted by:") + '</b> ' + author + ' </span><span style="margin-left:10px;"><b>' + _("Views:") + ' </b> ' + views + '</span></div></div><div id="youtube_entry_res_' + vid + '"></div></div></a><div class="toggle-control"><a href="#" class="toggle-control-link" alt="' + vid + '::' + engine + '">+ ' + _("Open related videos") + '</a><div class="toggle-content" style="display:none;"><div id="sublist_' + vid + '"></div><button id="loadmore_' + vid + '" href="#" class="load_more" alt="0::' + page + '::' + vid + '::' + engine + '" style="display:none">' + _("Load more videos") + '</button></div></div></div>');
            } else {
                $('#sublist_' + sublist_id).append('<div class="youtube_item"><div class="left"><img src="' + thumb + '" class="video_thumbnail" /></div><div class="item_infos"><span class="video_length">' + seconds + '</span><div><p><a class="start_video"><b>' + title + '</b></a></p><div><span><b>' + _("Posted by:") + '</b> ' + author + ' </span><span style="margin-left:10px;"><b>' + _("Views:") + ' </b> ' + views + '</span></div></div><div id="youtube_entry_res_sub_' + vid + '"></div></div><div class="toggle-control"><a href="#" class="toggle-control-link" alt="' + vid + '::' + engine + '">+ ' + _("Open related videos") + '</a><div class="toggle-content" style="display:none;"><div id="sublist_' + vid + '"></div><button id="loadmore_' + vid + '" href="#" class="load_more" alt="0::' + page + '::' + vid + '::' + engine + '" style="display:none">' + _("Load more videos") + '</button></div></div></div>');
            }
        }
        var resolutions_string = ['1080p', '720p', '480p', '360p'];
        var resolutions = infos.resolutions;
        for (var i = 0; i < resolutions_string.length; i++) {
            try {
                var resolution = resolutions_string[i];
                var vlink = resolutions[resolution]['link'];
                if (vlink === 'null') {
                    continue;
                }
                var container = resolutions[resolution]['container'];
            } catch (err) {
                continue;
            }
            var img = '';
            if (resolution == "720p" || resolution == "1080p") {
                img = 'images/hd.png';
            } else {
                img = 'images/sd.png';
            }
            if (sublist === false) {
                $('#youtube_entry_res_' + vid).append('<div class="resolutions_container"><a class="video_link" style="display:none;" href="' + vlink + '" alt="' + resolution + '"><img src="' + img + '" class="resolution_img" /><span>' + resolution + '</span></a><a href="' + vlink + '" alt="' + title + '.' + container + '::' + vid + '" title="' + _("Download") + '" class="download_file"><img src="images/down_arrow.png" width="16" height="16" />' + resolution + '</a></div>');
            } else {
                $('#youtube_entry_res_sub_' + vid).append('<div class="resolutions_container"><a class="video_link" style="display:none;" href="' + vlink + '" alt="' + resolution + '"><img src="' + img + '" class="resolution_img" /><span>' + resolution + '</span></a><a href="' + vlink + '" alt="' + title + '.' + container + '::' + vid + '" title="' + _("Download") + '" class="download_file"><img src="images/down_arrow.png" width="16" height="16" />' + resolution + '</a></div>');
            }
        }
        if ($('#youtube_entry_res_' + vid + ' a.video_link').length === 0) {
            $('#youtube_entry_res_' + vid).parent().parent().remove();
        } else if ($('#youtube_entry_res_sub_' + vid + ' a.video_link').length === 0) {
            $('#youtube_entry_res_sub_' + vid).parent().parent().remove();
        }
        if (search_engine === 'youtube') {
            var slink = "http://www.youtube.com/watch?v=" + vid;
        } else if (search_engine === 'dailymotion') {
            var slink = "http://www.dailymotion.com/video/" + vid;
        }
        if (sublist === false) {
            $('#youtube_entry_res_' + vid).append('<a class="open_in_browser" title="' + _("Open in ") + engine + '" href="' + slink + '"><img style="margin-top:8px;" src="images/export.png" />');
        } else {
            $('#youtube_entry_res_sub_' + vid).append('<a class="open_in_browser" title="' + _("Open in ") + engine + '" href="' + slink + '"><img style="margin-top:8px;" src="images/export.png" />');
        }

    } catch (err) {
        //console.log('printVideoInfos err: '+err);
    }
}

//playlist
function playNextVideo(vid_id) {
    try {
        var elem_id = '';
        // if page was changed
        if (current_song_page !== current_page) {
            // if some items are loaded
            if ($('#items_container').children().length > 1) {
                // play first item
                vid_id = $('#items_container').find('.youtube_item').find('div')[4].id;
            } else {
                return;
            }
        }
        load_first_song_next = false;
        load_first_song_prev = false;
        current_song_page = current_page;
        startVideo(vid_id);
    } catch (err) {
        console.log(err + " : can't play next video...");
    }
}

function startVideo(vid_id, title) {
    if ($('#' + vid_id + ' a.video_link').length === 0) {
        return;
    }
    var childs = $('#' + vid_id + ' a.video_link');
    var elength = parseInt(childs.length);
    if (elength > 1) {
        for (var i = 0; i < elength; i++) {
            var found = false;
            var res = $(childs[i], this).attr('alt');
            if (res == selected_resolution) {
                childs[i].click();
                break;
            } else {
                // if not found  select the highest resolution available...
                if (i + 1 == elength) {
                    if (found === false) {
                        childs[0].click();
                    } else {
                        continue;
                    }
                }
            }
        }
    } else {
        childs[0].click();
    }
}

function downloadFile(link, title, vid, toTorrent) {
    if (($('.tabActiveHeader').attr('id') !== 'tabHeader_4') && (toTorrent === undefined)) {
        $("#tabHeader_4").click();
    }
    if (vid === undefined) {
        var vid = title.split('::')[1];
    }
    var title = title.split('::')[0];
    var html = '<div id="progress_' + vid + '" class="progress" style="display:none;"> \
	<p><b>' + title + '</b></p> \
	<p> \
		<strong>0%</strong> \
	</p> \
	<progress value="5" min="0" max="100">0%</progress> \
	<a href="#" style="display:none;" class="convert" alt="" title="' + _("Convert to mp3") + '"> \
		<img src="images/video_convert.png"> \
	</a> \
	<a href="#" id="cancel_' + vid + '" style="display:none;" class="cancel" alt="" title="' + _("Cancel") + '"> \
		<img src="images/close.png"> \
	</a> \
	<a class="open_folder" style="display:none;" title="' + _("Open Download folder") + '" href="#">\
		<img src="images/export.png" /> \
	</a> \
	<a href="#" style="display:none;" class="hide_bar" alt="" title="' + _("Close") + '"> \
		<img src="images/close.png"> \
	</a> \
	</div>';
    $('#DownloadsContainer').append(html).show();

    var pbar = $('#progress_' + vid);
    // remove file if already exist
    fs.unlink(download_dir + '/' + title, function(err) {
        if (err) {} else {
            console.log('successfully deleted ' + download_dir + '/' + title);
        }
    });
    // start download
    canceled = false;
    $('#progress_' + vid + ' strong').html(_('Waiting for connection...'));
    var opt = {};
    var val = $('#progress_' + vid + ' progress').attr('value');
    title = title.trim();
    if (toTorrent) {
        title += '.torrent';
    }
    opt.link = link;
    opt.title = title;
    opt.vid = vid;
    var currentTime;
    var startTime = (new Date()).getTime();
    var target = download_dir + '/ht5_download.' + startTime;
    var host;
    var path;
    var parsedLink = url.parse(link);
    try {
        host = parsedLink.host;
        path = parsedLink.path;
    } catch (err) {
        console.log(err + ' ' + link);
    }
    current_download[opt] = opt;
    if (search_engine === 'dailymotion') {
        console.log('DAILYMOTION ' + link)
        current_download[vid] = http.request(link);
    } else {
        current_download[vid] = request(link);
    }
    current_download[vid].on('response', function(response) {
        if (response.statusCode > 300 && response.statusCode < 400 && response.headers.location) {
            // The location for some (most) redirects will only contain the path,  not the hostname;
            // detect this and add the host to the path.
            $('#progress_' + vid).remove();
            return downloadFile(response.headers.location, title, vid, toTorrent);
            // Otherwise no redirect; capture the response as normal            
        } else {
            pbar.show();
            $('#progress_' + vid + ' a.cancel').show();
            var contentLength = response.headers["content-length"];
            if (parseInt(contentLength) === 0) {
                $('#progress_' + vid + ' a.cancel').hide();
                $('#progress_' + vid + ' strong').html(_("can't download this file..."));
                setTimeout(function() {
                    pbar.hide()
                }, 5000);
            }
            var file = fs.createWriteStream(target);
            response.on('data', function(chunk) {
                file.write(chunk);
                var bytesDone = file.bytesWritten;
                currentTime = (new Date()).getTime();
                var transfer_speed = (bytesDone / (currentTime - startTime)).toFixed(2);
                var newVal = bytesDone * 100 / contentLength;
                var txt = Math.floor(newVal) + '% ' + _('done at') + ' ' + transfer_speed + ' kb/s';
                $('#progress_' + vid + ' progress').attr('value', newVal).text(txt);
                $('#progress_' + vid + ' strong').html(txt);
            });
            response.on('end', function() {
                file.end();
                if (canceled === true) {
                    fs.unlink(target, function(err) {
                        if (err) {} else {
                            console.log('successfully deleted ' + target);
                        }
                    });
                    $('#progress_' + vid + ' a.cancel').hide();
                    $('#progress_' + vid + ' strong').html(_("Download canceled!"));
                    setTimeout(function() {
                        pbar.hide()
                    }, 5000);
                } else {
                    fs.rename(target, download_dir + '/' + title.replace(/  /g, ' ').trim(), function(err) {
                        if (err) {} else {
                            console.log('successfully renamed ' + download_dir + '/' + title);
                            if (toTorrent !== undefined) {
                                gui.Shell.openItem(download_dir + '/' + title);
                            }
                        }
                    });
                    $('#progress_' + vid + ' strong').html(_('Download ended !'));
                    if (title.match('.mp3') === null) {
                        $('#progress_' + vid + ' a.convert').attr('alt', download_dir + '/' + title + '::' + vid).show();
                    }
                    $('#progress_' + vid + ' a.open_folder').show();
                    $('#progress_' + vid + ' a.hide_bar').show();
                    $('#progress_' + vid + ' a.cancel').hide();
                }
            });
        }
    });
    current_download[vid].end();
}

function convertTomp3Win(file) {
    var vid = file.split('::')[1];
    var title = file.split('::')[0];
    var pbar = $('#progress_' + vid);
    var target = title.substring(0, title.lastIndexOf('.')) + '.mp3';
    $('#progress_' + vid + ' strong').html(_("Converting video to mp3, please wait..."));
    var args = ['-i', title, '-ab', '192k', target];
    if (process.platform === 'win32') {
        var ffmpeg = spawn(exec_path + '/ffmpeg.exe', args);
    } else {
        var ffmpeg = spawn(exec_path + '/ffmpeg', args);
    }
    console.log('Spawning ffmpeg ' + args.join(' ') + ' --- ffmpeg path:' + exec_path + '/ffmpeg');
    ffmpeg.on('exit', function() {
        console.log('ffmpeg exited');
        $('#progress_' + vid + ' strong').html(_("video converted successfully !"));
    });
    ffmpeg.stderr.on('data', function(data) {
        console.log('grep stderr: ' + data);
    });
}

function init_pagination(total, byPages, browse, has_more, pageNumber) {
    browse = browse;
    if (pageNumber !== 0) {
        if (parseInt(total) > 0) {
            $("#search_results p").empty().append(_("Around %s results found", total)).show();
        }
        $("#pagination").pagination({
            displayedPages: 5,
            pages: pageNumber,
            currentPage: current_page,
            cssStyle: 'compact-theme',
            edges: 1,
            revText: '' + _("Prev") + '',
            nextText: '' + _("Next") + '',
            onPageClick: changePage
        });
        pagination_init = true;
        total_pages = $("#pagination").pagination('getPagesCount');
    } else if ((browse === false) && (pagination_init === false)) {
        $("#search_results p").empty().append(_("Around %s results found", total)).show();
        $("#pagination").pagination({
            items: total,
            itemsOnPage: byPages,
            displayedPages: 5,
            cssStyle: 'compact-theme',
            edges: 1,
            revText: '' + _("Prev") + '',
            nextText: '' + _("Next") + '',
            onPageClick: changePage
        });
        pagination_init = true;
        total_pages = $("#pagination").pagination('getPagesCount');
    } else {
        if ((browse === true) && (pagination_init === false)) {
            $("#search_results p").empty().append(_("Browsing mode, use the pagination bar to navigate") + "<span></span>").show();
            $("#pagination").pagination({
                itemsOnPage: byPages,
                pages: current_page + 1,
                currentPage: current_page,
                displayedPages: 5,
                cssStyle: 'compact-theme',
                edges: 1,
                prevText: '' + _("Prev") + '',
                nextText: '' + _("Next") + '',
                onPageClick: changePage
            });
            if (has_more === true) {
                pagination_init = false;
            } else {
                pagination_init = true;
            }
        }
        total_pages = $("#pagination").pagination('getPagesCount');
    }
}

// functions

function secondstotime(secs) {
    var t = new Date(1970, 0, 1);
    t.setSeconds(secs);
    var s = t.toTimeString().substr(0, 8);
    if (secs > 86399)
        s = Math.floor((t - Date.parse("1/1/70")) / 3600000) + s.substr(2);
    return s;
}

function getUserHome() {
    return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}

function saveConfig() {
    settings = JSON.parse(fs.readFileSync(confDir + '/ht5conf.json', encoding = "utf-8"));
    settings.edit = false;
    settings.fromPopup = false;
    fs.writeFile(confDir + '/ht5conf.json', JSON.stringify(settings), function(err) {
        if (err) {
            console.log(err);
        }
    });
}

function editSettings() {
    settings.fromPopup = true;
    settings.edit = true;
    fs.writeFile(confDir + '/ht5conf.json', JSON.stringify(settings), function(err) {
        if (err) {
            console.log(err);
        } else {
            var new_win = gui.Window.open('config.html', {
                "position": 'center',
                "width": 680,
                "height": 670,
                "toolbar": false
            });
            new_win.on('close', function() {
                saveConfig();
                this.hide();
                this.close(true);
            });
            new_win.on('loaded', function() {
                new_win.window.haveParent = win;
            });
        }
    });
}

//SET CURSOR POSITION
$.fn.setCursorPosition = function(pos) {
    this.each(function(index, elem) {
        if (elem.setSelectionRange) {
            elem.setSelectionRange(pos, pos);
        } else if (elem.createTextRange) {
            var range = elem.createTextRange();
            range.collapse(true);
            range.moveEnd('character', pos);
            range.moveStart('character', pos);
            range.select();
        }
    });
    return this;
};


function getVideoLink(id) {
    $.get('http://www.metacafe.com/embed/' + id + '/', function(resp) {
        link = resp.match(/swfobject.embedSWF\('(.*?)'/)[1];
        getStream(link);
    });
}

function getStream(link) {
    req = http.request(link, function(resp) {
        var addr = decodeURIComponent(resp.headers.location);
        var v = addr.match(/mediaData=(.*?)&errorDisplay/)[1];
        var x = JSON.parse(v);
        var Url;
        try {
            Url = x.highDefinitionMP4.mediaURL;
            player.setSrc(Url);
            player.play();
        } catch (err) {
            try {
                Url = x.MP4.mediaURL;
                player.setSrc(Url);
                player.play();
            } catch (err) {
                return;
            }
        }
    });
    req.end()
}

function getLocalDb(res) {
    try {
        var dirs = settings.shared_dirs;
        if ((dirs === undefined) || (dirs.length === 0)) {
            fileList.basedirs[dir] = {};
            return;
        }
    } catch (err) {
        console.log("shared dirs error : " + err);
        fileList.basedirs[dir] = {};
        return;
    }
    var fileList = [];
    var total = dirs.length;
    $.each(dirs, function(index, dir) {
        if (dir === "") {
            if (index + 1 === dirs.length) {
                var body = JSON.stringify(fileList);
                res.writeHead(200, {
                    "Content-Type": "application/json;charset=utf-8"
                });
                res.end(body);
            }
            return true;
        } else {
            fileList.push(dirTree(dir));
            if (index + 1 === dirs.length) {
                var body = JSON.stringify(fileList);
                res.writeHead(200, {
                    "Content-Type": "application/json;charset=utf-8"
                });
                res.end(body);
            }
        }
    });
}

function dirTree(filename) {
    var stats = fs.lstatSync(filename),
        info = {
            path: filename,
            name: path.basename(filename)
        };

    if (stats.isDirectory()) {
        info.type = "folder";
        info.children = fs.readdirSync(filename).map(function(child) {
            return dirTree(filename + '/' + child);
        });
    } else {
        // Assuming it's a file. In real life it could be a symlink or
        // something else!
        info.type = "file";
    }

    return info;
}

var tvLink = '';
var spawnedLink = '';
var stdouts = {};

function startMegaServer() {
    try {
        megaServer.close();
    } catch (err) {
        megaServer = http.createServer(function(req, res) {
            if ((req.url !== "/favicon.ico") && (req.url !== "/")) {
				//res.writeHead(206, { // NOTE: a partial http response
				////// 'Date':date.toUTCString(),
				//'Connection': 'keep-alive',
				//'Accept-Ranges':'bytes',
				//'Content-Type': 'video/x-matroska',
				//'Content-Length':731459584,
				//'Content-Range':'bytes '+0+'-'+731459583+'/'+731459584,
				//'Server':'CustomStreamer/0.0.1',
				//'transferMode.dlna.org': 'Streaming',
				//'contentFeatures.dlna.org':'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=017000 00000000000000000000000000'
			//});
                getMetadata(req, res)
            }
        }).listen(8888);
        console.log('Megaserver ready on port 8888');
    }
}

proxyServer = http.createServer(function(req, resp) {
	if ((req.url !== "/favicon.ico") && (req.url !== "/")) {
		var url = req.url.split('?link=')[1];
		var jqxhr = $.get(url, function(data) {
		})
		.done(function(data) {
			if(typeof(data) === 'object'){
				resp.writeHead(200,{'Content-type': 'application/json;charset=utf-8','Access-Control-Allow-Origin' : '*'});
				resp.end(JSON.stringify(data));
			} else {
				resp.writeHead(200,{'Content-type': 'text/html;charset=utf-8','Access-Control-Allow-Origin' : '*'});
				resp.end(data);
			}
		})
		.fail(function(err) {
			console.log(err)
			resp.writeHead(200,{'Content-type': 'text/html;charset=utf-8','Access-Control-Allow-Origin' : '*'});
			resp.end(err);
		});
	}
}).listen(8081);


function getMetadata(req, res) {
    var ffprobe;
    var link;
    var bitrate = '';
    var resolution = '';
    var duration = 'NaN';
    var parsedLink = decodeURIComponent(url.parse(req.url).href);
    link = parsedLink.split('/?file=')[1];
    //var args = ['-show_streams','-print_format','json',link];
    var args = [link];
    var error = false;
    if (process.platform === 'win32') {
        ffprobe = spawn(exec_path + '/ffprobe.exe', args);
    } else {
        ffprobe = spawn(exec_path + '/ffprobe', args);
    }
    ffprobe.stderr.on('data', function(data) {
        var infos = data.toString().trim().replace(/(\r\n|\n|\r)/gm," ");
        if (infos.indexOf('453 Not Enough Bandwidth') !== -1) {
            res.writeHead(400, {
                "Content-Type": "text/html"
            });
            res.write("Pas assez de débit");
            res.end();
            error = true;
        }
		if (resolution === '') {
			try {
				var vinfos = infos.match(/Video:(.*)/)[1];
				resolution = vinfos.toLowerCase().match(/\d{3}(?:\d*)?x\d{3}(?:\d*)/)[0];
			} catch (err) {}
		}
		if (duration === 'NaN') {
			try {
				duration = infos.match(/Duration: (.*?),/)[1];
			} catch (err) {}
		}
    });

    ffprobe.on('exit', function(data) {
        //if (error) {
            //return;
        //}
        console.log('[DEBUG] ffprobe exited...' + bitrate + ' ' + resolution + ' ' + duration );
        var width = 640;
        var height = 480;
        width = parseInt(resolution.split("x")[0]);
        height = parseInt(resolution.split("x")[1]);
        startStreaming(req, res, width, height, duration)
    });
}

function startStreaming(req, res, width, height,duration) {
    try {
		currentRes = res;
        var baseLink = url.parse(req.url).href;
        var megaKey;
        var link;
        var megaSize;
        var mediaExt = currentMedia.title.split('.').slice(-1)[0];
        var parsedLink = decodeURIComponent(url.parse(req.url).href).replace(/&amp;/g,'&');
        var device = deviceType(req.headers['user-agent']);
		
		res.writeHead(200, { // NOTE: a partial http response
			// 'Date':date.toUTCString(),
			'Connection': 'keep-alive',
			'Content-Type': 'video/x-matroska',
			'Server':'CustomStreamer/0.0.1',
			'transferMode.dlna.org': 'Streaming',
			'contentFeatures.dlna.org':'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=017000 00000000000000000000000000'
		});

        var linkParams = parsedLink.split('&');
        var bitrate = 300;
        var swidth;
        var sheight;
        try {
            swidth = linkParams.slice(-1)[0].replace('screen=', "").split('x')[0];
            sheight = linkParams.slice(-1)[0].replace('screen=', "").split('x')[1];
        } catch (err) {
            swidth = 640;
            sheight = 480;
        }
        if ((swidth === undefined) || (sheight === undefined)) {
            swidth = 640;
            sheight = 480;
        }
        var link = parsedLink.split('?file=')[1];

        if (parsedLink.indexOf('&key') !== -1) {
            megaKey = linkParams[1].replace('key=', '');
        }
        if (parsedLink.indexOf('&size') !== -1) {
            try {
                megaSize = parsedLink.match(/&size=(.*?)&/)[1];
            } catch (err) {
                megaSize = parsedLink.match(/&size=(.*)/)[1];
            }
        }
        if (parsedLink.indexOf('&bitrate') !== -1) {
            try {
                bitrate = parsedLink.match(/&bitrate=(.*?)&/)[1];
            } catch (err) {
                bitrate = parsedLink.match(/&bitrate=(.*)/)[1];
            }
        }
        var megaName = $('#song-title').text().replace(_('Playing: '), '');
        var megaType = megaName.split('.').pop().toLowerCase();
        host = req.headers['host'];
        console.log("QUALITE TV: " + bitrate);
        var x = null;
        //if tv/upnp
        if(playFromUpnp){
			console.log('opening upnp link ' + link) 
			if(parsedLink.indexOf('freeboxtv') !== -1) {
				link = parsedLink.replace('/?file=','');
				currentMedia.link = link;
			}
			var ffmpeg = spawnFfmpeg(link, device, '', bitrate, function(code) { // exit
					console.log('child process exited with code ' + code);
					res.end();
			});
			ffmpeg.stdout.pipe(res);
		}
		// external link
		if(playFromHttp){
			console.log('Opening external link ' + link)
			var ffmpeg = spawnFfmpeg(link, device, '', bitrate, function(code) { // exit
				console.log('child process exited with code ' + code);
				res.end();
			});
			ffmpeg.stdout.pipe(res);
		}
        // torrent link
        if (torrentPlaying) {
			console.log('Opening torrent link')
            var ffmpeg = spawnFfmpeg(link, device, '', bitrate, function(code) { // exit
                console.log('child process exited with code ' + code);
                res.end();
            });
            ffmpeg.stdout.pipe(res);
        }
        // if local file
        if (playFromFile) {
            var ffmpeg = spawnFfmpeg(link, device, '', bitrate,duration, function(code) { // exit
                console.log('child process exited with code ' + code);
                res.end();
            });
            ffmpeg.stdout.pipe(res);
        }
        //if mega userstorage link
        if (link.indexOf('userstorage.mega.co.nz') !== -1) {
            var newVar = currentMedia.title.split('.').slice(-1)[0];
            if ((in_array(newVar, videoArray)) && (parsedLink.indexOf('&download') === -1)) {
                if (transcoderEnabled) {
                    var ffmpeg = spawnFfmpeg('', device, host, bitrate, function(code) { // exit
                        console.log('child process exited with code ' + code);
                        res.end();
                    });
                    megaDownload = downloadFromMega(link, megaKey, megaSize).pipe(ffmpeg.stdin);
                    megaDownload.on('error', function(err) {
                        console.log('ffmpeg stdin error...' + err);
                        if (err.stack.indexOf('codec') === -1) {
                            console.log("Arret demandé !!!");
                            res.end();
                        } else {
                            var f = {};
                            f.link = 'http://' + ipaddress + ':8888' + req.url + '&direct';
                            f.title = megaName;
                            res.end();
                            startPlay(f);
                        }
                    });
                    ffmpeg.stdout.pipe(res);
                } else {
                    console.log('playing movie without transcoding');
                    downloadFromMega(decodeURIComponent(link), megaKey).pipe(res);
                }
            } else {
                console.log('fichier non video/audio ou téléchargement demandé... type:' + megaType);
                downloadFileFromMega(megaName, link, megaKey, true, megaSize, '');
            }
            //normal mega link
        } else if (parsedLink.indexOf('mega.co') !== -1) {
            console.log("opening mega.co file: " + link);
            var file = mega.file(link).loadAttributes(function(err, file) {
                try {
                    megaSize = file.size;
                    megaName = file.name.replace(/ /g, '_');
                    megaType = megaName.split('.').pop().toLowerCase();
                } catch (err) {
                    $.notif({
                        title: 'Ht5streamer:',
                        cls: 'red',
                        icon: '&#59256;',
                        timeout: 5000,
                        content: _("File not available on mega.co..."),
                        btnId: '',
                        btnTitle: '',
                        btnColor: '',
                        btnDisplay: 'none',
                        updateDisplay: 'none'
                    });
                    var url = $('.highlight .open_in_browser').attr("href");
                    var reportLink = $('.highlight #reportLink').attr("href");
                    var name = $($('.highlight b')[0]).text();
                    engine.sendMail(name, url, reportLink);
                    res.end();
                    initPlayer();
                    return;
                }
                if ((in_array(megaType, videoArray)) && (parsedLink.indexOf('&download') === -1)) {
                    $('#song-title').empty().html(_('Playing: ') + megaName);
                    if (transcoderEnabled) {
                        console.log('playing movie with transcoding');
                        var ffmpeg = spawnFfmpeg('', device, host, bitrate, function(code) { // exit
                            console.log('child process exited with code ' + code);
                            res.end();
                        });
                        	
                        megaDownload = file.download().pipe(res);
						megaDownload.on('error', function(err) {
							console.log('ffmpeg stdin error...' + err);
							if (err.stack.indexOf('codec') === -1) {
								console.log("Arret demandé !!!!!!!!!!!!!!!!!!!!!!!!!!!!", megaName);
								res.end();
							} else {
								var f = {};
								f.link = 'http://' + ipaddress + ':8888' + req.url + '&direct';
								f.title = megaName;
								res.end();
								startPlay(f);
							}
						});
						ffmpeg.stdout.pipe(res);
						
                    } else {
                        console.log('playing movie without transcoding');
                        file.download().pipe(res);
                    }
                } else {
                    console.log('fichier non video/audio ou téléchargement demandé...' + megaType);
                    downloadFileFromMega(megaName, '', '', false, megaSize, file);
                }
            });
        } 
    } catch (err) {
        console.log(err);
    }
    res.on("close", function() {
		console.log('request end!!!!!!!!!!!!!!!!')
        ffar[0].kill('SIGKILL');
    });
}

function downloadFileFromMega(title, link, key, fromMegacypter, length, stream) {
    initPlayer();
    if ($('.tabActiveHeader').attr('id') !== 'tabHeader_4') {
        $("#tabHeader_4").click();
    }
    var vid = ((Math.random() * 1e6) | 0);
    var html = '<div id="progress_' + vid + '" class="progress" style="display:none;"> \
	<p><b>' + title + '</b></p> \
	<p> \
		<strong>0%</strong> \
	</p> \
	<progress value="5" min="0" max="100">0%</progress> \
	<a href="#" style="display:none;" class="convert" alt="" title="' + _("Convert to mp3") + '"> \
		<img src="images/video_convert.png"> \
	</a> \
	<a href="#" id="cancel_' + vid + '" style="display:none;" class="cancel" alt="" title="' + _("Cancel") + '"> \
		<img src="images/close.png"> \
	</a> \
	<a class="open_folder" style="display:none;" title="' + _("Open Download folder") + '" href="#">\
		<img src="images/export.png" /> \
	</a> \
	<a href="#" style="display:none;" class="hide_bar" alt="" title="' + _("Close") + '"> \
		<img src="images/close.png"> \
	</a> \
	</div>';
    $('#DownloadsContainer').append(html).show();
    var pbar = $('#progress_' + vid);
    // remove file if already exist
    fs.unlink(download_dir + '/' + title, function(err) {
        if (err) {} else {
            console.log('successfully deleted ' + download_dir + '/' + title);
        }
    });
    // start download
    try {
        canceled = false;
        var opt = {};
        var val = $('#progress_' + vid + ' progress').attr('value');
        opt.link = link;
        opt.title = title;
        opt.vid = vid;
        var currentTime;
        var startTime = (new Date()).getTime();
        var target = download_dir + '/' + title + '.' + startTime;
        var file = fs.createWriteStream(target);
        var contentLength = length;
        if (fromMegacypter === true) {
            current_download[vid] = downloadFromMega(link, key, length);
            current_download[vid].pipe(file);
        } else {
            current_download[vid] = stream.download();
            current_download[vid].pipe(file);
        }
        pbar.show();
        $('#progress_' + vid + ' a.cancel').show();
        current_download[vid].on('data', function(chunk) {
            var bytesDone = file.bytesWritten;
            currentTime = (new Date()).getTime();
            var transfer_speed = (bytesDone / (currentTime - startTime)).toFixed(2);
            var newVal = bytesDone * 100 / contentLength;
            var txt = Math.floor(newVal) + '% ' + _('done at') + ' ' + transfer_speed + ' kb/s';
            $('#progress_' + vid + ' progress').attr('value', newVal).text(txt);
            $('#progress_' + vid + ' strong').html(txt);
        });
        current_download[vid].on('error', function(err) {
            console.log('error: ' + err);
            file.end();
            if (canceled === true) {
                fs.unlink(target, function(err) {
                    if (err) {} else {
                        console.log('successfully deleted ' + target);
                    }
                });
                $('#progress_' + vid + ' a.cancel').hide();
                $('#progress_' + vid + ' strong').html(_("Download canceled!"));
                setTimeout(function() {
                    pbar.hide()
                }, 5000);
            }
        });
        current_download[vid].on('end', function() {
            file.end();
            if (canceled === true) {
                fs.unlink(target, function(err) {
                    if (err) {} else {
                        console.log('successfully deleted ' + target);
                    }
                });
                $('#progress_' + vid + ' a.cancel').hide();
                $('#progress_' + vid + ' strong').html(_("Download canceled!"));
                setTimeout(function() {
                    pbar.hide()
                }, 5000);
            } else {
                fs.rename(target, download_dir + '/' + title.replace(/  /g, ' '), function(err) {
                    if (err) {} else {
                        console.log('successfully renamed ' + download_dir + '/' + title);
                    }
                });
                $('#progress_' + vid + ' strong').html(_('Download ended !'));
                if (title.match('.mp3') === null) {
                    $('#progress_' + vid + ' a.convert').attr('alt', download_dir + '/' + title + '::' + vid).show();
                }
                $('#progress_' + vid + ' a.open_folder').show();
                $('#progress_' + vid + ' a.hide_bar').show();
                $('#progress_' + vid + ' a.cancel').hide();
            }
        });
    } catch (err) {
        console.log("downloadFileFromMega error: " + err);
    }
}

function downloadFromMega(link, key, size) {
    var id = ((Math.random() * 1e6) | 0);
    var m = new mega.File({
        downloadId: id,
        key: key
    });
    console.log(m,link,key)
    var stream = mega.decrypt(m.key);
    var r = request(link);
    r.pipe(stream);
    var i = 0;
    r.on('data', function(d) {
        i += d.length;
        stream.emit('progress', {
            bytesLoaded: i,
            bytesTotal: size
        })
    });
    r.on('end', function(d) {
        console.log("download end");
    });
    return stream
}

function spawnFfmpeg(link, device, host, bitrate,duration,exitCallback) {
    if (host === undefined || link !== '') {
        //local file...
        args = ['-i', ''+link+'', '-copyts','-sn', '-c:v', 'libx264', '-c:a', 'libvorbis','-f', 'matroska','pipe:1'];
    } else {
        if (device === "phone") {
            if (host.match(/(^127\.)|(^192\.168\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^::1$)/) !== null) {
                args = ['-i', 'pipe:0', '-sn', '-c:v', 'libx264', '-preset', 'fast', '-profile:v', 'high', '-deinterlace', "-b:v", bitrate + 'k', '-c:a', 'libvorbis', '-b:a', '128k', '-threads', '0', '-f', 'matroska', 'pipe:1'];
            } else {
                args = ['-i', 'pipe:0', '-sn', '-c:v', 'libx264', '-preset', 'fast', '-profile:v', 'high', '-deinterlace', "-b:v", bitrate + 'k', '-c:a', 'libvorbis', '-b:a', '64k', '-threads', '0','-f', 'matroska', 'pipe:1'];
            }
        } else if (device === 'tablet') {
            if (host.match(/(^127\.)|(^192\.168\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^::1$)/) !== null) {
                args = ['-i', 'pipe:0','-sn', '-c:v', 'libx264', '-preset', 'fast', '-profile:v', 'high', '-deinterlace', '-c:a', 'libvorbis', '-b:a', '256k', '-threads', '0','-f', 'matroska', 'pipe:1'];
            } else {
                args = ['-i', 'pipe:0','-sn', '-c:v', 'libx264', '-preset', 'fast', '-profile:v', 'high', "-b:v", bitrate + 'k', '-c:a', 'libvorbis', '-b:a', '128k', '-threads', '0','-f', 'matroska', 'pipe:1'];
            }
        } else {
            if (host.match(/(^127\.)|(^192\.168\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^::1$)/) !== null) {
                args = ['-i', 'pipe:0','-sn', '-c:v', 'libx264', '-preset', 'fast', '-profile:v', 'high', '-deinterlace', '-c:a', 'libvorbis', '-b:a', '256k', '-threads', '0', '-f', 'matroska','pipe:1'];
            } else {
                args = ['-i', 'pipe:0', '-sn', '-c:v', 'libx264', '-preset', 'fast', '-profile:v', 'high', '-deinterlace', "-b:v", bitrate + 'k', '-bufsize', bitrate + 'k', '-c:a', 'libvorbis', '-b:a', '128k', '-threads', '0','-f', 'matroska', 'pipe:1'];
            }
        }
    }
    if (process.platform === 'win32') {
        ffmpeg = spawn(exec_path + '/ffmpeg.exe', args);
    } else {
        ffmpeg = spawn(exec_path + '/ffmpeg', args);
    }
    ffar.push(ffmpeg);
    console.log('Spawning ffmpeg ' + args.join(' '));

    ffmpeg.stderr.on('data', function(data) {
        console.log('grep stderr: ' + data);
        //var t = /([0-9]+):([0-9]+):([0-9]+.[0-9]+)/.exec(duration);
		//if(t){
			//player.options.duration = parseInt(t[1],10)*60*60+parseInt(t[2],10)*60+parseFloat(t[3]);
		//}
    });

    return ffmpeg;
}

function cleanffar() {
    $.each(ffar, function(index, ff) {
        try {
            ff.kill("SIGKILL");
        } catch (err) {}
        if (index + 1 === ffar.length) {
            ffar = [];
        }
    });
}

function in_array(needle, haystack) {
    var found = 0;
    for (var i = 0, len = haystack.length; i < len; i++) {
        if (haystack[i] === needle) {
            return true;
        }
        found++;
    }
    return false;
}

function browseUpnpDir(serverId, indexId, parentId) {
    console.log('loading file for server index ' + serverId + " at index " + indexId)

    mediaServer = new Plug.UPnP_ContentDirectory(cli._servers[serverId], {
        debug: false
    });
    mediaServer.index = serverId;

    mediaServer.browse(indexId, null, null, 0, 1000, null).then(function(response) {
        if (response && response.data) {
            try {
                var xml = encodeXML(response.data.Result);
                var channels = [];
                parseString(xml, function(err, result) {
                    var dirs = undefined;
                    try {
                        dirs = result['DIDL-Lite']['container'];
                    } catch (err) {}
                    var items = undefined;
                    try {
                        items = result['DIDL-Lite']['item'];
                    } catch (err) {}
                    $('#items_container').empty().show();
                    if (items) {
						console.log(items)
                        $.each(items, function(index, dir) {
                            var channel = {};
                            channel.parentId = parentId;
                            channel.serverId = serverId;
                            if (dir['upnp:class'][0].indexOf('object.container') !== -1) {
                                var channel = {};
                                channel.data = dir.$;
                                channel.title = XMLEscape.xmlEscape(dir['dc:title'][0])
                                channel.type = 'folder';
                                channels.push(channel);
                            } else if (dir['upnp:class'][0].indexOf('object.item') !== -1) {
                                channel.data = dir["res"][0]['$'];
                                channel.link = dir["res"][0]["_"] + '&upnp';
                                channel.class= dir['upnp:class'][0];
                                channel.type = 'file';
                                channel.title = XMLEscape.xmlEscape(dir['dc:title'][0])
                                channels.push(channel);
                            }
                            if (index + 1 === items.length) {
                                if (dirs) {
                                    $.each(dirs, function(index, dir) {
                                        var channel = {};
                                        channel.parentId = parentId;
                                        channel.serverId = serverId;
                                        if (dir['upnp:class'][0].indexOf('object.container') !== -1) {
                                            channel.data = dir.$;
                                            channel.title = XMLEscape.xmlEscape(dir['dc:title'][0])
                                            channel.type = 'folder'
                                            channels.push(channel);
                                        } else if (dir['upnp:class'][0].indexOf('object.item') !== -1) {
                                            channel.data = dir["res"][0]['$'];
                                            channel.link = dir["res"][0]["_"] + '&upnp';
                                            channel.class= dir['upnp:class'][0];
                                            channel.type = 'file';
                                            channel.title = XMLEscape.xmlEscape(dir['dc:title'][0])
                                            channels.push(channel);
                                        }
                                        if (index + 1 === dirs.length) {
                                            var sorted = ___.sortBy(channels, 'title');
                                            loadUpnpItems(sorted);
                                        }
                                    });
                                } else {
                                    var sorted = ___.sortBy(channels, 'title');
                                    loadUpnpItems(sorted);
                                }
                            }
                        });
                    } else {
                        if (dirs) {
							console.log(dirs)
                            $.each(dirs, function(index, dir) {
                                var channel = {};
                                channel.parentId = parentId;
                                channel.serverId = serverId;
                                if (dir['upnp:class'][0].indexOf('object.container') !== -1) {
                                    channel.data = dir.$;
                                    channel.title = XMLEscape.xmlEscape(dir['dc:title'][0])
                                    channel.type = 'folder'
                                    channels.push(channel);
                                } else if (dir['upnp:class'][0].indexOf('object.item') !== -1) {
                                    channel.data = dir["res"][0]['$'];
                                    channel.link = dir["res"][0]["_"] + '&upnp';
                                    channel.class= dir['upnp:class'][0];
                                    channel.type = 'file';
                                    channel.title = XMLEscape.xmlEscape(dir['dc:title'][0]);
                                    channels.push(channel);
                                }
                                if (index + 1 === dirs.length) {
                                    var sorted = ___.sortBy(channels, 'title');
                                    loadUpnpItems(sorted);
                                }
                            });
                        }
                    }
                });
            } catch (err) {
                console.log("ERRORRRRRR " + err)
            }
        } else {
            console.log("no response")
        }
        $(".mejs-overlay").hide();
        $(".mejs-layer").hide();
        $(".mejs-overlay-loading").hide();

    }).then(null, function(error) { // Handle any errors
        console.log("An error occurred: " + error.description);
        $(".mejs-overlay").hide();
        $(".mejs-layer").hide();
        $(".mejs-overlay-loading").hide();
    });
}

function loadUpnpItems(items) {
    $.each(items, function(index, file) {
        console.log(file);
        if (file.type === "folder") {
            var id = Math.floor(Math.random() * 1000000);
            var obj = {
                "attr": {
                    id: '' + id + '_upnpSubNode'
                },
                "data": {
                        "title": XMLEscape.xmlUnescape(file.title),
                        "attr": {
                            "id": '' + id + '_upnpSubNode',
                            "serverId" : file.serverId,
                            "parent": file.parentId,
                            "index": file.data.id
                        }
                },
                "children": []
            }
            $("#UpnpContainer").jstree("create", $("#"+file.parentId), "inside", obj, function() {}, true);
        } else {
			try {
				var ext = file.title.split('.').pop().toLowerCase();
				if(['pdf','txt','html','rar','zip','iso','.torrent','nfo'].indexOf(ext) !== -1) {
					return true;
				}
			} catch(err) {}
			
			if(ext)
            var id = Math.floor(Math.random() * 1000000);
                var obj = {
                    "attr": {
                        "id": id
                    },
                    "icon": "js/jstree/themes/default/movie_file.png",
                    "data": {
                        "title": XMLEscape.xmlUnescape(file.title),
                        "attr": {
                            "id": id,
                            "parent": file.parentId,
                            "data": JSON.stringify(file.data),
                            "link": file.link,
                            "type" : file.class,
                            "class": "upnpMedia",
                            "title": file.title
                        }
                    }
                }
            $("#fileBrowserContent").jstree("create", $("#"+file.parentId), "inside", obj, function() {}, true);
        }
    });
}


function updateUpnpList() {
    var list = cli._servers;
    $('#upnp_upnpRootNode ul').remove()
    if ($('#UpnpContainer li').length === 0) {
        $(function() {
            $("#UpnpContainer").jstree({
                "plugins": ["themes", "json_data", "ui", "types", "crrm"],
                "json_data": {
                    "data": {
                        "attr": {
                            id: '' + _("upnp") + '_upnpRootNode'
                        },
                        "data": _("Upnp"),
                        "children": []
                    }
                },
                "themes": {
                    "theme": "default"
                },
            }).bind("select_node.jstree", function(e, data) {
                onSelectedItem(data);
            }).bind('before.jstree', function(event, data) {
                if (data.plugin == 'contextmenu') {
                    var settings = data.inst._get_settings();
                    if ((data.inst._get_parent(data.args[0]) == -1) || (data.args[0].id === '')) {
                        settings.contextmenu.items.remove._disabled = true;
                        settings.contextmenu.items.rename._disabled = true;
                        settings.contextmenu.items.create._disabled = false;
                    } else {
                        settings.contextmenu.items.remove._disabled = false;
                        settings.contextmenu.items.rename._disabled = false;
                        settings.contextmenu.items.create._disabled = true;
                    }
                }
            }).bind("loaded.jstree", function(event, data) {
                console.log('upnp tree loaded...')
            });
        });
    }
    $.each(list, function(index, server) {
		// load upnpFolder if not already loaded
        if ($('#' + server._index + '_upnpRootNode').length === 0) {
            var obj = {
                "attr": {
                    id: '' + server._index + '_upnpRootNode'
                },
                "data": XMLEscape.xmlUnescape(server.friendlyName),
                "class": "upnpSubfolder",
                "children": []
            }
            $("#UpnpContainer").jstree("create", $("#" + _("upnp") + "_upnpRootNode"), "inside", obj, function() {}, true);
        }
    })
    if(cli._avTransports.length > 0) {
		$('#upnpRenderersContainer').show();
	} 
}

function loadUpnpRenderers() {
	var list = cli._avTransports;
	upnpDevices = [];
	$('#upnpPopup').empty();
	$.each(list,function(index,item) {
		var name = item.friendlyName;
		if (upnpDevices.length === 0) {
			$('#upnpPopup').append('<span style="position:relative;top:-3px;">'+name + ' :</span> <input class="upnp" type=radio name="'+name+'" checked="true" value="'+name+'"> <br />');
		} else {
			$('#upnpPopup').append('<span style="position:relative;top:-3px;">'+name + ' :</span> <input class="upnp" type=radio name="'+name+'" value="'+name+'"> <br />');
		}
		upnpDevices.push(name);
		if(index+1 === list.length) {
			return loadUpnpQtip();
		}
	});
}


function loadUpnpQtip() {
  if (upnpDevice !== null) {
      $("#upnpPopup input").each(function(){
          var name = $(this).prop('name');
          if (name !== upnpDevice) {
              $(this).prop('checked','');
          }
      });
      $("#upnpPopup input[name='"+cli._avTransports[upnpDevice]['friendlyName']+"']").prop('checked','checked');
      mediaRenderer = new Plug.UPnP_AVTransport( cli._avTransports[upnpDevice], { debug: false } );
  } else {
	  if (upnpDevices.length > 0) {
		upnpDevice = 0;
		mediaRenderer = new Plug.UPnP_AVTransport( cli._avTransports[0], { debug: false } );
	  }
  }
  if (upnpDevices.length === 1) {
      upnpDevice = 0;
      mediaRenderer = new Plug.UPnP_AVTransport( cli._avTransports[0], { debug: false } );
      return;
  } else if (upnpDevices.length === 0){
      var text = '<p>Aucun Freebox player allumé! <br>Allumez votre freebox player et réactivez ce bouton...</p>';
      $("#upnp-toggle").qtip({
      content : {text: text},
      position: {
        corner: {
          target: 'bottomMiddle',
          tooltip: 'topMiddle'
        }
      },
      show: { ready: true },
      hide: {
        event: 'unfocus',
        effect: function(offset) {
            $(this).slideDown(1000); // "this" refers to the tooltip
        }
      },
      style: { classes : 'qtip-youtube'},
      // The magic
      api: {
        onRender: function() {
          this.elements.tooltip.click(this.hide) //
        }
      }
    });
  } else {
    var text = $('#upnpPopup').html();
    $("#upnp-toggle").qtip({
      content : {text: text},
      position: {
        corner: {
          target: 'bottomMiddle',
          tooltip: 'topMiddle'
        }
      },
      show: { ready: true },
      hide: {
        event: 'unfocus',
        effect: function(offset) {
            $(this).slideDown(1000); // "this" refers to the tooltip
        }
      },
      style: { classes : 'qtip-youtube'},
      // The magic
      api: {
        onRender: function() {
          this.elements.tooltip.click(this.hide) //
        }
      }
    });
  }
}

var continueTransition = false;
var transitionCount = 0;
function playUpnpRenderer(obj) {
	// stop upnp file loading if needed
	timeUpdater = null;
	transitionCount = 0;
	try {
		if (upnpMediaPlaying || continueTransition) {
			mediaRenderer.stop();
			continueTransition = false;
		}
	} catch(err) {}
	if(obj.type === undefined) {
		obj.type = "object.item.videoItem";
	}
	$('.mejs-time-current').width(0+'%');
	$('span.mejs-currenttime').text('00:00:00');
	$('span.mejs-duration').text('00:00:00');
	//'http://'+ipaddress+':8081/?stream='+
	var uri = XMLEscape.xmlEscape(obj.link.replace('&upnp','').replace('&torrent','').replace('&direct',''));
	var infos = JSON.parse(obj.data).protocolInfo;
	var title = XMLEscape.escape(obj.title);
	var type = obj.type;
	currentMedia = obj;
	
	//var metaString = '&lt;DIDL-Lite xmlns=&quot;urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/&quot; xmlns:dc=&quot;http://purl.org/dc/elements/1.1/&quot; xmlns:upnp=&quot;urn:schemas-upnp-org:metadata-1-0/upnp/&quot; xmlns:dlna=&quot;urn:schemas-dlna-org:metadata-1-0/&quot; xmlns:sec=&quot;http://www.sec.co.kr/&quot;&gt;&lt;item&gt;&lt;dc:title&gt;'+title+'&lt;/dc:title&gt;&lt;upnp:class&gt;'+type+'&lt;/upnp:class&gt;&lt;res protocolInfo=&quot;'+infos+':*&quot; size=&quot;0&quot;&gt;'+uri+'&lt;/res&gt;&lt;/item&gt;&lt;/DIDL-Lite&gt;'
	var metaString= '&lt;DIDL-Lite xmlns=\"urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/\" xmlns:upnp=\"urn:schemas-upnp-org:metadata-1-0/upnp/\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:dlna=\"urn:schemas-dlna-org:metadata-1-0/\" xmlns:sec=\"http://www.sec.co.kr/\"&gt;&lt;item id=\"0/0/912/145-0\" parentID=\"0/0/912\" restricted=\"1\"&gt;&lt;upnp:class&gt;'+type+'&lt;/upnp:class&gt;&lt;dc:title&gt;'+title+'&lt;/dc:title&gt;&lt;dc:creator&gt;Unknown Artist&lt;/dc:creator&gt;&lt;upnp:artist&gt;Unknown Artist&lt;/upnp:artist&gt;&lt;upnp:album&gt;Unknown Album&lt;/upnp:album&gt;&lt;res protocolInfo=\"'+infos+':*\"&gt;'+uri+'&lt;/res&gt;&lt;/item&gt;&lt;/DIDL-Lite&gt;'
	mediaRenderer.setAVTransportURI("0",uri,metaString).then(function(response) {
		if (response && response.data) {
			console.log('UPNP: Ok playing' + uri);
			// start watching for PLAYING state
			mediaRenderer.play();
			continueTransition = true;
			getRendererState('PLAYING');
		} else {
			mediaRenderer.stop();
			continueTransition = false;
			upnpMediaPlaying = false;
			console.log('UPNP: No response for' + uri)
			getRendererState('STOPPED');
		}
		
	}).then( null, function( error ) { // Handle any errors

		console.log( "An error occurred: " + error.description );

	});
}

function getRendererState(state) {
	mediaRenderer.getTransportInfo().then(function(response) {
		if (response && response.data) {
			if(response.data.CurrentTransportState !== state && continueTransition) {
				if(response.data.CurrentTransportState === 'TRANSITIONING') {
					if (transitionCount === 20) {
						upnpMediaPlaying = false;
						continueTransition = false;
						mediaRenderer.stop();
						initPlayer();
					} else {
						transitionCount += 1;
						$('.mejs-time-current').width(0+'%');
						$('span.mejs-currenttime').text('--:--');
						$('span.mejs-duration').text('--:--');
						setTimeout(function(){ 
							getRendererState(state);
							getUpnpPosition(); 
						},1000);
					}
				} else {
					setTimeout(function(){ 
						getRendererState(state);
						getUpnpPosition(); 
					},1000);
				}
			} else {
				console.log("PLAYER STATE " + state)
				if (state === 'PLAYING') {
					upnpMediaPlaying = true;
					continueTransition = true;
					setTimeout(function(){
						$('#song-title').empty().append(_('Playing: ') + decodeURIComponent(currentMedia.title));
						$('.mejs-overlay-button').hide();
						$('.mejs-overlay-loading').hide();
						$('.mejs-container p#fbxMsg').remove();
						$('.mejs-container').append('<p id="fbxMsg" style="height:100px !important;position: absolute;top: 45%;margin: 0 50%;color: white;font-size: 30px;text-align: center;z-index: 10000;width: 450px;right: 50%;left: -225px;">'+_("Playing on your UPNP device !")+'</p>')
						$('.mejs-controls').width('100%');
					},1000);
					// watch for STOPPED state
					console.log("start watching for stopped state")
					getRendererState('STOPPED');
				} else if (state === 'STOPPED') {
					continueTransition = false;
					setTimeout(function(){
					// if user asked stop
						if(upnpMediaPlaying === false) {
							console.log("upnp stopped")
							continueTransition = false;
						// else continue
						} else {
							console.log('upnp finished playing...')
							continueTransition = false;
							upnpMediaPlaying = false;
							on_media_finished();
						}
						try {
							if(torrentPlaying) {
							 stopTorrent();
							}
						} catch (err) {}
						$('.mejs-time-buffering').width(0+'%');
						$('.mejs-time-loaded').width(0+'%');
						$('.mejs-time-current').width(0+'%');
						$('span.mejs-currenttime').text('00:00:00');
						$('span.mejs-duration').text('00:00:00');
						$(".mejs-overlay").show();
						$(".mejs-layer").show();
						$(".mejs-overlay-loading").hide();
						$(".mejs-overlay-button").show();
						$('#fbxMsg').remove();
						$('#song-title').empty().append(_('Stopped...'));
					},2000);
				}
			}
		} else {
			console.log("Service is reporting no response");
		}
	}).then( null, function( error ) { // Handle any errors
		console.log( "An error occurred: " + error );
	});
}

function getUpnpPosition() {
	mediaRenderer.getPositionInfo().then(function(response) {      
		if (response && response.data) {
			var pct = (hmsToSecondsOnly(response.data.RelTime) * 100 / hmsToSecondsOnly(response.data.TrackDuration)).toFixed(2);
			$('.mejs-time-current').css({width: pct+'%', maxWidth: '100%'})
			$('span.mejs-currenttime').text(response.data.RelTime);
			$('span.mejs-duration').text(response.data.TrackDuration);
		} else {
			console.log(response);
		}
    }).then( null, function( error) { // Handle any errors
		var pct = (hmsToSecondsOnly(relTime) * 100 / hmsToSecondsOnly(trackDuration)).toFixed(2);
		$('.mejs-time-current').css({width: pct+'%', maxWidth: '100%'})
		$('span.mejs-currenttime').text(relTime);
		$('span.mejs-duration').text(trackDuration);
	});
}

function hmsToSecondsOnly(str) {
    var p = str.split(':'),
        s = 0, m = 1;

    while (p.length > 0) {
        s += m * parseInt(p.pop(), 10);
        m *= 60;
    }

    return s;
}

var decodeUri = function(uri) {
    if (uri.match(/\/%25\//) !== null) {
        uri = uri.replace(/\/%25\//g, '/');
    }
    if (uri.match(/%2525/) !== null) {
        uri = uri.replace(/%2525/g, '%');
    }
    if (uri.match(/%25/) !== null) {
        uri = uri.replace(/%25/g, '%');
    }
    // test double http
    if (uri.match(/http/g).length > 1) {
        uri = "http://" + uri.split('http').pop();
    }
    return encodeXML(uri);
}

var XMLEscape = {
       escape: function(string) {
           return this.xmlEscape(string);
       },
       unescape: function(string) {
           return this.xmlUnescape(string);
       },
       xmlEscape: function(string) {
           string = string.replace(/&/g, "&amp;");
           string = string.replace(/"/g, "&quot;");
           string = string.replace(/'/g, "&apos;");
           string = string.replace(/</g, "&lt;");
           string = string.replace(/>/g, "&gt;");
           return string;
       },
       xmlUnescape: function(string) {
           string = string.replace(/&amp;/g, "&");
           string = string.replace(/&quot;/g, "\"");
           string = string.replace(/&apos;/g, "'");
           string = string.replace(/&lt;/g, "<");
           string = string.replace(/&gt;/g, ">");
           return string;
       }
   };

var decodeXML = function ( str ) {
    return str.replace(/&quot;/g, '"')
               .replace(/&\#39;/g, '\'')
               .replace(/&gt;/g, '>')
               .replace(/&lt;/g, '<')
               .replace(/&amp;/g, '&');
};
  
var encodeXML = function ( str ) {
     return str.replace(/&/g, '&amp;');         
  };
