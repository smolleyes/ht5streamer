var gui = require('nw.gui');
var win = gui.Window.get();
var fs = require('fs');
var path = require('path');
var request = require('request');
var https = require('https');
var http = require('http');
var ffmpeg = require('fluent-ffmpeg');

//engines
var dailymotion = require('dailymotion');
var youtube = require('yt-streamer');

//var player;
var exec_path=path.dirname(process.execPath);
var search_type = 'Videos';
var selected_resolution='1080p';
var current_video = NaN;
var current_search = '';
var current_start_index = 1;
var current_prev_start_index = 1;
var current_page = 1;
var current_search_page=1;
var current_song_page = 1;
var load_first_song_next=false;
var load_first_song_prev=false;
var current_song = NaN;
var next_vid;
var prev_vid;
var isDownloading = false;

// global var
var search_engine = 'youtube';


// settings
var confDir;
if (process.platform === 'win32') {
    confDir = process.env.APPDATA+'/ht5streamer';
} else {
    confDir = getUserHome()+'/.config/ht5streamer';
}
var settings = JSON.parse(fs.readFileSync(confDir+'/ht5conf.json', encoding="utf-8"));
var download_dir = settings.download_dir;
var selected_resolution = settings.resolution;

$(document).ready(function(){
     var player = $('#video_player').mediaelementplayer()[0].player;
     $('#video_search').bind('submit', function(e){
        e.preventDefault();
        query=$('#video_search_query').val();
        current_start_index = 1;
        current_prev_start_index = 1;
        current_search=query;
        startSearch(query);
    });
    // fullscreen signal and callback
    $(document).on('click','.mejs-fullscreen-button',function(e) {
        win.toggleFullscreen();
    });
    // next signal and callback
    $(document).on('click','.mejs-next-btn',function(e) {
        e.preventDefault();
        playNextVideo(next_vid);
    });
    // previous signal and callback
    $(document).on('click','.mejs-back-btn',function(e) {
        e.preventDefault();
        playNextVideo(prev_vid);
    });
    // load video signal and callback
    $(document).on('click','.video_link',function(e) {
        e.preventDefault();
        try {
            $('#'+current_song).closest('.youtube_item').toggleClass('highlight','false');
        } catch(err) {
            console.log(err);
        }
        // save current song/page and search for back btn
        try {
            prev_vid = current_song;
        } catch(err) {
            console.log('no media loaded, can\'t save current song...');
        }
        current_song_page = current_page;
        current_song = $(this).parent().parent()[0].id;
        $('#'+current_song).closest('.youtube_item').toggleClass('highlight','true');
        try {
            next_vid = $('#'+current_song).parent().parent().next().find('div')[5].id;
        } catch(err) {
            load_first_song_next=true;
        }
        $('#player').trigger('loadPlayer',[$(this).attr('href'),next_vid]);
    });
    $('#player').on('loadPlayer',function(e,link,next_vid){
        $(document).scrollTop( $("#player").offset().top);
        player.pause();
        player.setSrc(link);
        player.play();
        player.media.addEventListener('ended', function () {
            // if previous page ended while playing continue with the first video on the new page
            if ( load_first_song_next === true ) {
                //try to load a new page if available
                    try {
                        if ($('.next').is(":visible")){
                            $('.next').click();
                        } else {
                            console.log('No more videos to plays...');
                        }
                    } catch(err) {
                        console.log(err + " : can't play next video...");
                    }
            } else if ( load_first_song_prev === true ) {
                try {
                    if ($('.back').is(":visible")){
                        $('.back').click();
                    } else {
                        console.log('No more videos to plays...');
                    }
                } catch(err) {
                    console.log(err + " : can't play next video...");
                }
            } else  {
                playNextVideo(next_vid);
            }
        });
    });
    //load playlist
    $(document).on('click','.load_playlist',function(e) {
        var pid = $(this).attr('id');
        loadPlaylistSongs(pid);
    });
    // download file signal and callback
    $(document).on('click','.download_file',function(e) {
        e.preventDefault();
        downloadFile($(this).attr('href'),$(this).attr('title'));
    });
    $('#player').on('download_file',function(e,link,title){
        var a = document.createElement("a");
        a.href = link;
        a.setAttribute("download",title);
        a.click();
    });
    //resolutions select
    $("select#resolutions_select").change(function () {
        var str = "";
        $("select#resolutions_select option:selected").each(function () {
                selected_resolution = $(this).text();
        });
    });
    $("select#search_type_select").change(function () {
        var str = "";
        $("select#search_type_select option:selected").each(function () {
                search_type = $(this).text();
        });
    });
    
    // pagination
    $('.back').click(function() {
        current_page-=1;
        startSearch(current_search);
    });
    $('.next').click(function() {
        current_page+=1;
        startSearch(current_search);
    });
    // convert to mp3
    $(document).on('click','.convert',function(e) {
        e.preventDefault();
        if ( process.platform === 'win32' ){
            convertTomp3Win($(this).attr('alt'));
        }else{
            convertTomp3($(this).attr('alt'));
        }
    });
    // hide progress
    $(document).on('click','.hide_bar',function(e) {
        e.preventDefault();
        $(this).closest('.progress').hide();
    });
    
    startSearch('gza');
});


//search
function startSearch(query){
    $('#items_container').empty().hide();
    $('#pagination').hide();
    $('#search').hide();
    $('#loading').show();
    current_search=query;
    current_page =1;
    current_search=1;
    current_start_index=1;
    if (search_engine === 'dailymotion') {
        if (search_type === 'Videos') {
            dailymotion.searchVideos(query,current_page,function(datas){ getVideosDetails(datas,'dailymotion'); });
        } else {
            dailymotion.searchPlaylists(query,current_page,function(datas){ getPlaylistInfos(datas, 'dailymotion'); });
        }
    }
    else if (search_engine === 'youtube') {
        if (search_type === 'Videos') {
            youtube.searchVideos(query,current_page,function(datas){ getVideosDetails(datas,'youtube'); });
        } else {
            youtube.searchPlaylists(query,current_page,function(datas){ getPlaylistInfos(datas, 'youtube'); });
        }
    }
    
}


function getVideosDetails(datas,engine) {
    // show next or hide back button if necessary
    if (current_page == 1){
        $('.back').css({'display':'None'});
    } else {
        $('.back').css({'display':'block'});
        $('.next').css({'display':'block'});
    }
    //dailymotion
    if (engine === 'dailymotion') {
        var items = datas.list;
        var totalResults = datas.total;
        if (totalResults === 0) {
            $('#search_results').html('<p><strong>No videos</strong> found...</p>');
            $('#search').show();
            $('#loading').hide();
            return;
        }
        if (datas.has_more === 'true') {
            $('.next').css({'display':'None'});
        }
        // print total results
        $('#search_results').html('<p><strong>'+totalResults+'</strong> videos found, page '+current_page+'</p>');
        
        // load videos
        for(var i=0; i<items.length; i++) {
            dailymotion.getVideoInfos(items[i].id,i,items.length,function(datas) {fillPlaylist(datas);});
        }
    }
    // youtube
    else if (engine === 'youtube') {
        totalResults = datas.totalItems;
        if (totalResults === 0) {
            $('#search_results').html('<p><strong>No videos</strong> found...</p>');
            $('#search').show();
            $('#loading').hide();
            return;
        }
        $('#search_results').html('<p><strong>'+totalResults+'</strong> videos found, page '+current_page+'</p>');
        var items=datas.items;
        try {
            if (items.length < 25) {
                $('.next').css({'display':'None'});
            }
        } catch(err) {
            $('#search_results').html('<p><strong>No videos</strong> found...</p>');
            $('#search').show();
            $('#loading').hide();
            return;
        }
        // load videos
        for(var i=0; i<items.length; i++) {
            youtube.getVideoInfos('http://www.youtube.com/watch?v='+items[i].id,i,items.length,function(datas) {fillPlaylist(datas);});
        }
    }
}

function getPlaylistInfos(datas, engine){
    if (current_page == 1){
        $('.back').css({'display':'None'});
        $('.next').css({'display':'block'});
    } else {
        $('.back').css({'display':'block'});
        $('.next').css({'display':'block'});
    }
    //dailymotion
    if (engine === 'dailymotion') {
        var items=datas.list;
        var totalResults = datas.total;
        if (totalResults === 0) {
            $('#search_results').html('<p><strong>No playlists</strong> found...</p>');
            $('#search').show();
            $('#loading').hide();
            return;
        }
        $('#search_results').html('<p><strong>'+totalResults+'</strong> playlists found, page '+current_search_page+'</p>');
        if (datas.has_more === 'true') {
            $('.next').css({'display':'None'});
        }
        for(var i=0; i<items.length; i++) {
            loadPlaylistItems(items[i], 'dailymotion');
        }
    }
    // youtube
    else if (engine === 'youtube') {
        totalResults = datas.totalItems;
        if (totalResults === 0) {
            $('#search_results').html('<p><strong>No playlist</strong> found...</p>');
            $('#search').show();
            $('#loading').hide();
            return;
        }
        $('#search_results').html('<p><strong>'+totalResults+'</strong> playlist found, page '+current_page+'</p>');
        var items=datas.items;
        try {
            if (items.length < 25) {
                $('.next').css({'display':'None'});
            }
        } catch(err) {
            $('#search_results').html('<p><strong>No playlist</strong> found...</p>');
            $('#search').show();
            $('#loading').hide();
            return;
        }
        // load videos
        for(var i=0; i<items.length; i++) {
           loadPlaylistItems(items[i], 'youtube');
        }
    }
    $('#items_container').show();
    $('#pagination').show();
    $('#search').show();
    $('#loading').hide();
}

function loadPlaylistItems(item, engine) {
    if (engine === 'dailymotion') {
        var title = item.name;
        var thumb = item.thumbnail_medium_url;
        var pid = item.id;
        var length=item.videos_total;
        var author = item['owner.username'];
        var description = item.description;
    }
    else if ( engine === 'youtube') {
        var pid = item.id;
        var length = item.size;
        var author = item.author;
        var description = item.description;
        var thumb =  item.thumbnail.sqDefault;
        var title = item.title;
    }
    $('#items_container').append('<div class="youtube_item_playlist"><img src="'+thumb+'" style="float:left;width:120px;height:90px;"/><div class="left" style="width:440px;"><p><b>'+title+'</b></p><p>Description: '+description+'</p><p><span><b>total videos:</b> '+length+'</span>      <span><b>      author:</b> '+author+'</span></p></div><div class="right"><a href="#" id="'+pid+'::'+length+'::'+engine+'" class="load_playlist"><img src="images/play.png" /></a></div></div>');
}

function loadPlaylistSongs(pid){
    $('#items_container').empty().hide();
    $('#pagination').hide();
    $('#search').hide();
    $('#loading').show();
    var plid = pid.split('::')[0];
    var length = pid.split('::')[1];
    var engine = pid.split('::')[2]
    current_start_index = 1;
    current_prev_start_index = 1;
    current_search_page=1;
    if (engine === 'dailymotion'){
        dailymotion.loadSongs(plid,length,current_search_page, function(datas, length, pid, engine) { fillPlaylistFromPlaylist(datas, length, pid, engine); });
    }
    else if ( engine === 'youtube') {
        youtube.loadSongs(plid,length,current_start_index, function(datas, length, pid, engine) { fillPlaylistFromPlaylist(datas, length, pid, engine); });
    }
    $('.next .back').css({'display':'None'});
}

function fillPlaylistFromPlaylist(datas, length, pid, engine) {
    $('#search_results').html('<p><strong>'+length+'</strong> videos in this playlist (loading...)</p>');
    if (engine === 'dailymotion') {
        var items=datas.list;
        for(var i=0; i<items.length; i++) {
            dailymotion.getVideoInfos(items[i].id,i,items.length,function(datas) {fillPlaylist(datas);});
        }
        if (datas.has_more === true) {
            current_search_page+=1;
            setTimeout(function(){dailymotion.loadSongs(pid,length,current_search_page, function(datas,length, pid, engine) { fillPlaylistFromPlaylist(datas, length, pid, engine); });}, 2000);
        } else {
            current_page = 1;
            current_search_page = 1;
        }
    }
    else if ( engine === 'youtube') {
        var items=datas.items;
        current_start_index+=25;
        try {
            t = items.length;
        } catch(err) {
            $('#search_results').html('<p><strong>'+valid_vid+'</strong> verified videos in this playlist</p>');
            current_start_index=1;
            current_page=1;
        }
        for(var i=0; i<items.length; i++) {
            youtube.getVideoInfos('http://www.youtube.com/watch?v='+items[i].video.id,i,items.length,function(datas) {fillPlaylist(datas);});
        }
        if ( parseInt(current_start_index) < parseInt(length) ) {
            setTimeout(function(){youtube.loadSongs(pid,length,current_start_index, function(datas, length, pid, engine) { fillPlaylistFromPlaylist(datas, length, pid, engine); });}, 2000);
        } else {
            current_start_index=1;
            current_page=1;
        }
    }
}

function fillPlaylist(items) {
    for(var i=0; i<items.length; i++) {
        printVideoInfos(items[i]);
    }
    $('#items_container').show();
    $('#pagination').show();
    $('#search').show();
    $('#loading').hide();
    if (search_type === 'Playlists') {
        var valid_vid = $('.youtube_item').length
        $('#search_results').html('<p><strong>'+valid_vid+'</strong> verified videos in this playlist</p>');
    }
    if (load_first_song_next == true || load_first_song_prev === true) {
        playNextVideo();
    }
}

function printVideoInfos(infos){
    try{
        var title = infos.title;
        var thumb = infos.thumb;
        var vid = infos.id;
        var seconds = secondstotime(parseInt(infos.duration));
        var views = infos.views;
        var author = infos.author;
        $('#items_container').append('<div class="youtube_item"><div class="left"><img src="'+thumb+'" class="video_thumbnail" /></div><div class="item_infos"><span class="video_length">'+seconds+'</span><div><p><b>'+title+'</b></p><div><span><b>Posted by: </b> '+author+  ' </span><span style="margin-left:10px;"><b>Views: </b> '+views+'</span></div></div><div id="progress_'+vid+'" class="progress" style="display:none;"><p><b>Downloading :</b> <strong>0%</strong></p><progress value="5" min="0" max="100">0%</progress><a href="#" style="display:none;" class="convert" alt="" title="convert to mp3"><img src="images/video_convert.png"></a><a href="#" style="display:none;" class="hide_bar" alt="" title="close"><img src="images/close.png"></a></div><div id="youtube_entry_res_'+vid+'"></div></div></div>');
        var resolutions_string = ['1080p','720p','480p','360p'];
        var resolutions = infos.resolutions;
        for(var i=0; i<resolutions_string.length; i++) {
            try {
                var resolution = resolutions_string[i];
                var vlink = resolutions[resolution]['link'];
                if (vlink === 'null') { continue; }
                var container = resolutions[resolution]['container'];
            } catch(err) {
                continue;
            }
            var img='';
            if (resolution == "720p" || resolution == "1080p") {
                img='images/hd.png';
            } else {
                img='images/sd.png';
            }
            $('#youtube_entry_res_'+vid).append('<div class="resolutions_container"><a class="video_link" href="'+vlink+'" alt="'+resolution+'"><img src="'+img+'" class="resolution_img" /><span>'+ resolution+'</span></a><a href="'+vlink+'" title="'+title+'.'+container+'::'+vid+'" class="download_file"><img src="images/down_arrow.png" /></a></div>');
        }
        if ($('#youtube_entry_res_'+vid+' a.video_link').length === 0){
            $('#youtube_entry_res_'+vid).parent().parent().remove();
        }
    } catch(err){
        console.log('printVideoInfos err: '+err);
    }
}

//playlist
function playNextVideo(vid_id) {
    try {
        var elem_id = '';
        // if page was changed
        if (current_song_page !== current_page){
            // if some items are loaded
            if ($('#items_container').children().length > 1){
                // play first item
                vid_id = $('#items_container').find('.youtube_item').find('div')[5].id;
            } else {
                return;
            } 
        }
        load_first_song_next=false;
        load_first_song_prev=false;
        current_song_page = current_page;
        var childs = $('#'+vid_id+' a.video_link');
        var elength = parseInt(childs.length);
        if (elength > 1){
            for(var i=0; i<elength; i++) {
                var found = false;
                var res = $(childs[i],this).attr('alt');
                if ( res == selected_resolution ){
                    childs[i].click();
                    break;
                } else {
                    // if not found  select the highest resolution available...
                    if ( i+1 == elength){
                        if (found === false){
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
    } catch(err) {
        console.log(err + " : can't play next video...");
    }
}

//download and convert

function downloadFile(link,title){
    var vid = title.split('::')[1];
    var pbar = $('#progress_'+vid);
    var title = title.split('::')[0];
    if ( isDownloading === true ){
         pbar.show();
         $('#progress_'+vid+' strong').html('a download is already running, please wait...');
         setTimeout(function(){pbar.hide()},5000);
         return;
    }
    // remove file if already exist
    fs.unlink(download_dir+'/'+title, function (err) {
        if (err) {
        } else {
            console.log('successfully deleted '+download_dir+'/'+title);
        }
    });
    // start download
    pbar.show();
    $('#progress_'+vid+' strong').html('waiting for connection...');
    isDownloading = true;
    var opt = {};
    var val = $('#progress_'+vid+' progress').attr('value');
    opt.link = link;
    opt.title = title;
    opt.vid = vid;
    var currentTime;
    var startTime = (new Date()).getTime();
    var target = download_dir+'/ht5_download.'+startTime;
    
    var req = request(link, function (error, response, body) {
        if (!error) {
            link = response.request.href;
            var request = http.request(link,
                function (response) {
                    var contentLength = response.headers["content-length"];
                    var file = fs.createWriteStream(target);
                    response.on('data',function (chunk) {
                        file.write(chunk);
                        var bytesDone = file.bytesWritten;
                        currentTime = (new Date()).getTime();
                        var transfer_speed = (bytesDone / ( currentTime - startTime)).toFixed(2);
                        var newVal= bytesDone*100/contentLength;
                        var txt = Math.floor(newVal)+'% done at '+transfer_speed+ ' kb/s';
                        $('#progress_'+vid+' progress').attr('value',newVal).text(txt);
                        $('#progress_'+vid+' strong').html(txt);
                    });
                    response.on('end', function() {
                        file.end();
                        fs.rename(target,download_dir+'/'+title, function (err) {
                            if (err) {
                            } else {
                                console.log('successfully renamed '+download_dir+'/'+title);
                            }
                        });
                        $('#progress_'+vid+' strong').html('complete !');
                        isDownloading = false;
                        $('#progress_'+vid+' a.convert').attr('alt',download_dir+'/'+title+'::'+vid).show();
                        $('#progress_'+vid+' a.hide_bar').show();
                    });
                });
            request.end();
            //startDownload(datas.link,datas.title);
        } else {
            console.log('can\'t get dailymotion download link');
            pbar.hide();
            return;
        }
    });
}

function convertTomp3Win(file){
	var vid = file.split('::')[1];
    var title = file.split('::')[0];
    var pbar = $('#progress_'+vid);
    var target=title.substring(0, title.lastIndexOf('.'))+'.mp3';
    $('#progress_'+vid+' strong').html('Converting video to mp3, please wait...');
	var args = ['-i', title, '-ab', '192k', target];
    var ffmpeg = spawn(exec_path+'/ffmpeg.exe', args);
    console.log('Spawning ffmpeg ' + args.join(' '));
    ffmpeg.on('exit', function(){
		console.log('ffmpeg exited');
		$('#progress_'+vid+' strong').html('file has been converted succesfully');
		setTimeout(function(){pbar.hide()},5000);
	});
    ffmpeg.stderr.on('data', function(data) {
        console.log('grep stderr: ' + data);
    });
}

function convertTomp3(file) {
    try{
        var vid = file.split('::')[1];
        var title = file.split('::')[0];
        var pbar = $('#progress_'+vid);
        var target=title.substring(0, title.lastIndexOf('.'))+'.mp3';
        $('#progress_'+vid+' strong').html('Converting video to mp3, please wait...');
        var proc = new ffmpeg({ source: title })
          .withAudioBitrate('192k')
          .withAudioCodec('libmp3lame')
          .withAudioChannels(2)
          .toFormat('mp3')
          .saveToFile(target, function(stdout, stderr) {
            $('#progress_'+vid+' strong').html('file has been converted succesfully');
            fs.rename(target.replace(/ /,'\\ '),target, function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('successfully renamed '+getUserHome()+'/'+title);
                }
            });
            setTimeout(function(){pbar.hide()},5000);
        });
    } catch(err) {
        console.log('can\'t convert you video '+title+' to mp3...')
    }
}


// functions

function secondstotime(secs)
{
    var t = new Date(1970,0,1);
    t.setSeconds(secs);
    var s = t.toTimeString().substr(0,8);
    if(secs > 86399)
    	s = Math.floor((t - Date.parse("1/1/70")) / 3600000) + s.substr(2);
    return s;
}

function getUserHome() {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}


