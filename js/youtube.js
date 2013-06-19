//load modules
var gui = require('nw.gui');
var win = gui.Window.get();
var fs = require('fs');
var ytdl = require('ytdl');
var youtube = require('youtube-feeds');
var ffmpeg = require('fluent-ffmpeg');
var http = require('http');
var path = require('path');
var spawn = require('child_process').spawn;

//var player;
var exec_path=path.dirname(process.execPath);
var search_type = 'Videos';
var selected_resolution='1080p';
var current_video = NaN;
var current_search = '';
var current_start_index = 1;
var current_prev_start_index = 1;
var current_page = 1;
var current_song_page = 1;
var load_first_song_next=false;
var load_first_song_prev=false;
var videos_responses = new Array();
var current_song = NaN;
var next_vid;
var prev_vid;
var isDownloading = false;

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

    var player = $('#video_youtube').mediaelementplayer()[0].player;
    
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
            next_vid = $('#'+current_song).parent().parent().next().find('div')[4].id;
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
        current_start_index-=25;
        current_page-=1;
        startSearch(current_search);
    });
    $('.next').click(function() {
        current_start_index+=25;
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
    
    //start a req
    startSearch('rza');
    current_search = 'rza';
});

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
                    console.log('successfully renamed '+title);
                }
            });
            setTimeout(function(){pbar.hide()},5000);
        });
    } catch(err) {
        console.log('can\'t convert you video '+title+' to mp3...')
    }
}

function startSearch(query){
    $('#items_container').hide();
    $('#pagination').hide();
    $('#search').hide()
    $('#loading').show();
    if (search_type == 'Videos') {
        searchVideos(query);
    } else {
        searchPlaylists(query);
    }
}

function getUserHome() {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}

function downloadFile(link,title) {
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
    isDownloading = true;
    var val = $('#progress_'+vid+' progress').attr('value');
    var currentTime;
    var startTime = (new Date()).getTime();
    var target = download_dir+'/ht5_download.'+startTime;
    pbar.show();
	var request = http.request(link,
		function (response) {
			var contentLength = response.headers["content-length"];
			console.log(contentLength);
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
}

function secondstotime(secs)
{
    var t = new Date(1970,0,1);
    t.setSeconds(secs);
    var s = t.toTimeString().substr(0,8);
    if(secs > 86399)
    	s = Math.floor((t - Date.parse("1/1/70")) / 3600000) + s.substr(2);
    return s;
}

function printVideoInfos(infos){
    try{
        var title = infos.title;
        var thumb = infos.thumbnail_url;
        var vid = infos.video_id;
        var seconds = secondstotime(infos.length_seconds);
        var views = infos.view_count;
        var author = infos.author;
        $('#items_container').append('<div class="youtube_item"><div class="left"><img src="'+thumb+'" class="video_thumbnail" /></div><div class="item_infos"><span class="video_length">'+seconds+'</span><p><b>'+title+'</b></p><div><span><b>Posted by: </b> '+author+  ' </span><span style="margin-left:10px;"><b>Views: </b> '+views+'</span></div><div id="progress_'+vid+'" class="progress" style="display:none;"><p><b>Downloading :</b> <strong>0%</strong></p><progress value="5" min="0" max="100">0%</progress><a href="#" style="display:none;" class="convert" alt="" title="convert to mp3"><img src="images/video_convert.png"></a><a href="#" style="display:none;" class="hide_bar" alt="" title="close"><img src="images/close.png"></a></div><div id="youtube_entry_res_'+vid+'"></div></div></div>');
        var num=infos.formats.length;
        if ( parseInt(num) === 0) {
                return;
        }
        var resolutions = new Array([]);
        for(var i=0; i<num; i++) {
            var vlink = infos.formats[i].url;
            var resolution = infos.formats[i].resolution;
            var resolution_full = infos.fmt_list[i][1];
            var container = infos.formats[i].container;
            // if resolution is alreay available in webm continue...
            if ( $.inArray(resolution, resolutions) > -1 ) {
                continue;
            }
            resolutions.push(resolution);
            if (container == 'flv' || container == '3gp') {
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

function getVideoInfos(video_link,num,total){
    try {
        ytdl.getInfo(video_link, num, total, function(err,num,total,info){
            if(err) {
                console.log(err);
            } else {
                storeVideosInfos(info,num,total);
            }
        });
        } catch(err) {
            console.log('getVideoInfos err: '+ err);
        }
}

function storeVideosInfos(infos,num,total){
    position = num.split('_')[1]
    videos_responses[position]=infos;
    if (videos_responses.length == total) {
        for(var i=0; i<total; i++) {
            printVideoInfos(videos_responses[i]);
        }
        videos_responses= new Array();
        $('#items_container').show();
        $('#pagination').show();
        $('#search').show();
        $('#loading').hide();
        if (load_first_song_next == true || load_first_song_prev === true) {
            playNextVideo();
        }
    }
}

//playlists
function searchPlaylists(user_search){
    var totalResults = 0;
    try {
        videos_responses = new Array();
        $('#items_container').empty();
        youtube.feeds.playlistSearch({
            q:              ''+user_search+'',
            'start-index' : ''+current_start_index+'',
            'max-results':  25,
            orderby:        'relevance'
            },
        function( err, data ) {
        if( err ) {
            $('#search_results').html('<p><strong>No playlists</strong> found...</p>');
            $('#search').show();
            $('#loading').hide();
            return;
        } else {
            totalResults = data.totalItems;
            if (totalResults === 0) {
                $('#search_results').html('<p><strong>No playlists</strong> found...</p>');
                $('#search').show();
                $('#loading').hide();
                return;
            }
            $('#search_results').html('<p><strong>'+totalResults+'</strong> playlists found, page '+current_page+'</p>');
            items=data.items;
            current_prev_start_index=current_start_index;
                if (current_page == 1){
                    $('.back').css({'display':'None'});
                } else {
                    $('.back').css({'display':'block'});
                    $('.next').css({'display':'block'});
                }
                if (items.length < 25) {
                    $('.next').css({'display':'None'});
                }
                for(var i=0; i<items.length; i++) {
                    getPlaylistInfos(items[i]);
                }
        }
    });
    } catch(err) {
        console.log('searchPlaylists err: '+err);
    }   
}

function getPlaylistInfos(item){
    var title = item.title;
    var thumb = item.thumbnail.sqDefault;
    var pid = item.id;
    var length=item.size;
    var author = item.author;
    var description = item.description;
    $('#items_container').append('<div class="youtube_item_playlist"><img src="'+thumb+'" style="float:left;"/><div class="left" style="width:440px;"><p><b>'+title+'</b></p><p>Description: '+description+'</p><p><span><b>total videos:</b> '+length+'</span>      <span><b>      author:</b> '+author+'</span></p></div><div class="right"><a href="#" id="'+pid+'::'+length+'" class="load_playlist"><img src="images/play.png" /></a></div></div>');
    $('#items_container').show();
    $('#pagination').show();
    $('#search').show();
    $('#loading').hide();
}

function loadPlaylistSongs(pid){
    $('#items_container').hide();
    $('#pagination').hide();
    $('#search').hide();
    $('#loading').show();
    var plid = pid.split('::')[0];
    var length = pid.split('::')[1];
    $('#items_container').empty();
    current_start_index = 1;
    current_prev_start_index = 1;
    loadSongs(plid,length);
    $('.next').css({'display':'None'});
}

function loadSongs(plid,length){
    try{
        youtube.feeds.playlist(''+plid+'',{
                'start-index' : ''+current_start_index+'',
                'max-results':  50
            },
            function( err, data ) {
            if( err ) {
                console.log( err );
            } else {
                try{
                    $('#search_results').html('<p><strong>'+length+'</strong> videos in this playlist</p>');
                    items=data.items;
                    current_start_index+=items.length+1;
                    for(var i=0; i<items.length; i++) {
                         getVideoInfos('http://www.youtube.com/watch?v='+items[i].video.id,'video_'+i,items.length);
                    }
                } catch(err) {
                }
            }
        });
        if ( parseInt(current_start_index) < parseInt(length) ) {
            setTimeout(function(){loadSongs(plid,length);}, 5000);
        }
    } catch(err) {
        console.log('loadSongs err: '+err);
    }
}

function searchVideos(user_search){
    var totalResults = 0;
    $('#search_results').empty();
    try{
       videos_responses = new Array();
        $('#items_container').empty();
        youtube.feeds.videos({
                q:              ''+user_search+'',
                'start-index' : ''+current_start_index+'',
                'max-results':  25,
                orderby:        'relevance'
            },
            function( err, data ) {
            if( err ) {
                $('#search_results').html('<p><strong>No videos</strong> found...</p>');
                $('#search').show();
                $('#loading').hide();
                return;
            } else {
                totalResults = data.totalItems;
                if (totalResults === 0) {
                    $('#search_results').html('<p><strong>No videos</strong> found...</p>');
                    $('#search').show();
                    $('#loading').hide();
                    return;
                }
                $('#search_results').html('<p><strong>'+totalResults+'</strong> videos found, page '+current_page+'</p>');
                items=data.items;
                current_prev_start_index=current_start_index;
                if (current_page == 1){
                    $('.back').css({'display':'None'});
                } else {
                    $('.back').css({'display':'block'});
                    $('.next').css({'display':'block'});
                }
                if (items.length < 25) {
                    $('.next').css({'display':'None'});
                }
                for(var i=0; i<items.length; i++) {
                    getVideoInfos('http://www.youtube.com/watch?v='+items[i].id,'video_'+i,items.length);
                }
            }
        });
    }catch(err){
        console.log('searchVideos err: '+err);
    }
}

function playNextVideo(vid_id) {
    try {
        var elem_id = '';
        // if page was changed
        if (current_song_page !== current_page){
            // if some items are loaded
            if ($('#items_container').children().length > 1){
                // play first item
                vid_id = $('#items_container').find('.youtube_item').find('div')[4].id;
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
