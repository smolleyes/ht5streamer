//load modules
var gui = require('nw.gui');
var win = gui.Window.get();
var fs = require('fs');
var scrapper = require('scrapper');
var vidinfo = require('vidinfo')({format:true});
var https = require('https');

//var
//var player;
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
var videos_responses = new Array();
var current_song = NaN;
var next_vid;
var prev_vid;

$(document).ready(function(){
     var player = $('#video_dailymotion').mediaelementplayer()[0].player;
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
            next_vid = $(this).parent().parent().parent().next().find('div')[0].id;
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
        $('#player').trigger('download_file',[$(this).attr('href'),$(this).attr('title')]);
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
    
    startSearch('wu tang clan');
});

function startSearch(query){
    $('#items_container').hide();
    $('#pagination').hide();
    $('#loading').show();
    current_search=query;
    if (search_type == 'Videos') {
        searchVideos(query);
    } else {
        searchPlaylists(query);
    }
}

function searchPlaylists(user_search){
    try{
       videos_responses = new Array();
        $('#items_container').empty();
        req=https.get('https://api.dailymotion.com/playlists?sort=relevance&page='+current_page+'&limit=25&search='+user_search+'&fields=id,description,owner.username,name,thumbnail_medium_url,videos_total');
        
        req.on('response',function(response) { 
            var data = new Array(); 
            response.on("data", function(chunk) {
                data.push(chunk);
            });
            response.on('end', function() {
                var datas = JSON.parse(data.join(''));
                items=datas.list;
                if (current_page == 1){
                    $('.back').css({'display':'None'});
                } else {
                    $('.back').css({'display':'block'});
                    $('.next').css({'display':'block'});
                }
                if (datas.has_more === 'true') {
                    $('.next').css({'display':'None'});
                }
                for(var i=0; i<items.length; i++) {
                    getPlaylistInfos(items[i]);
                }
            });
        });
        req.on('error', function(e) {
            console.log("Got error: " + e.message);
        });
        
        req.end();
    } catch(err){
        console.log('searchVideos err: '+err);
    }
}

function getPlaylistInfos(item){
    var title = item.name;
    var thumb = item.thumbnail_medium_url;
    var pid = item.id;
    var length=item.videos_total;
    var author = item['owner.username'];
    var description = item.description;
    $('#items_container').append('<div class="youtube_item_playlist"><img src="'+thumb+'" style="float:left;width:120px;height:90px;"/><div class="left" style="width:440px;"><p><b>'+title+'</b></p><p>Description: '+description+'</p><p><span><b>total videos:</b> '+length+'</span>      <span><b>      author:</b> '+author+'</span></p></div><div class="right"><a href="#" id="'+pid+'::'+length+'" class="load_playlist"><img src="images/play.png" /></a></div></div>');
    $('#items_container').show();
    $('#pagination').show();
    $('#loading').hide();
}

function loadPlaylistSongs(pid){
    $('#items_container').hide();
    $('#pagination').hide();
    $('#loading').show();
    var plid = pid.split('::')[0];
    var length = pid.split('::')[1];
    $('#items_container').empty();
    current_start_index = 1;
    current_prev_start_index = 1;
    current_search_page=1;
    loadSongs(plid,length);
    $('.next').css({'display':'None'});
}

function loadSongs(plid,length){
    try{
        req=https.get('https://api.dailymotion.com/playlist/'+plid+'/videos?page='+current_search_page+'&limit=50');
            req.on('response',function(response) { 
                var data = new Array(); 
                response.on("data", function(chunk) {
                    data.push(chunk)
                });
                response.on('end',function(){
                    var datas = JSON.parse(data.join(''));
                    items=datas.list;
                    if (current_page == 1){
                        $('.back').css({'display':'None'});
                    } else {
                        $('.back').css({'display':'block'});
                        $('.next').css({'display':'block'});
                    }
                    for(var i=0; i<items.length; i++) {
                        getVideoInfos(items[i].id,i,items.length);
                    }
                    if (datas.has_more === true) {
                        current_search_page+=1;
                        setTimeout(function(){loadSongs(plid,length);}, 2000);
                    }
                });
            });
        req.on('error', function(e) {
            console.log("Got error: " + e.message);
        });
        req.end();
    } catch(err) {
        console.log('loadSongs err: '+err);
    }
}

function searchVideos(user_search){
    try{
       videos_responses = new Array();
        $('#items_container').empty();
        req=https.get('https://api.dailymotion.com/videos?sort=relevance&page='+current_page+'&limit=25&search='+user_search+'&fields=id');
        req.on('response',function(response) { 
            var data = new Array(); 
            response.on("data", function(chunk) {
                data.push(chunk)
            });
            response.on('end',function(){
                var datas = JSON.parse(data.join(''));
                items=datas.list;
                if (current_page == 1){
                    $('.back').css({'display':'None'});
                } else {
                    $('.back').css({'display':'block'});
                    $('.next').css({'display':'block'});
                }
                if (datas.has_more === 'true') {
                    $('.next').css({'display':'None'});
                }
                for(var i=0; i<items.length; i++) {
                    getVideoInfos(items[i].id,i,items.length);
                }
            });
        });
        req.on('error', function(e) {
            console.log("Got error: " + e.message);
        });
        req.end();
    } catch(err){
        console.log('searchVideos err: '+err);
    }
}

function getVideoInfos(id,num,total) {
    vidinfo.dmo(id,function (obj) {
    var video = {};
    video.num=num;
    video.total=total;
    video.id = obj.id;
    video.link = obj.embed_url;
    video.title = obj.title;
    video.views = obj.views_total;
    video.thumb =  obj.thumbnail_medium_url;
    
    scrapper.get(video.link, function($){
        loadhtml($('body').text().replace(/\\/g,''),video)
        }, {text: ''}, {'User-Agent': 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1521.3 Safari/537.36'});
    });    
}

function loadhtml(data, video){
    resolutions_regex = ['stream_h264_hd1080_url','stream_h264_hd_url','stream_h264_hq_url','stream_h264_ld_url'];
    var resolutions = new Array();
    for(var v=0; v<resolutions_regex.length; v++) {
        try{
            var regex =  new RegExp(resolutions_regex[v]+'":(.*?),','i');
            var link=data.match(regex)[1].replace(/\"/g,'');
            resolutions[v] = link;
        } catch(err) {
            console.log(err);
        }
    }
    video.resolutions=resolutions;
    storeVideosInfos(video);
}

function storeVideosInfos(infos){
    videos_responses[infos.num]=infos;
    if (videos_responses.length == infos.total) {
        for(var i=0; i<infos.total; i++) {
            printVideoInfos(videos_responses[i]);
        }
        videos_responses= new Array();
        $('#items_container').show();
        $('#pagination').show();
        $('#loading').hide();
        if (load_first_song_next == true || load_first_song_prev === true) {
            playNextVideo();
        }
    }
}

function printVideoInfos(infos){
    try{
        var title = infos.title;
        var thumb = infos.thumb;
        var vid = infos.id;
        $('#items_container').append('<div class="youtube_item"><img src="'+thumb+'" class="video_thumbnail" /><p><b>'+title+'</b></p><div id="youtube_entry_res_'+vid+'"></div></div>');
        var resolutions_string = ['1080p','720p','480p','360p'];
        for(var i=0; i<infos.resolutions.length; i++) {
            var vlink = infos.resolutions[i];
            if ( vlink === 'null' ) {
                continue;
            }
            var resolution = resolutions_string[i];
            var container = 'mp4';
            var img='';
            if (resolution == "720p" || resolution == "1080p") {
                img='images/hd.png';
            } else {
                img='images/sd.png';
            }
            $('#youtube_entry_res_'+vid).append('<div class="resolutions_container"><a class="video_link" href="'+vlink+'" alt="'+resolution+'"><img src="'+img+'" class="resolution_img" /><span>'+ resolution+'</span></a><a href="'+vlink+'" title="'+title+'.'+container+'" class="download_file"><img src="images/down_arrow.png" /></a></div>');
        }
        if ($('#youtube_entry_res_'+vid+' div a.video_link').length === 0){
            $('#youtube_entry_res_'+vid).parent().remove();
        }
    } catch(err){
        console.log('printVideoInfos err: '+err);
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
                vid_id = $('#items_container').find('.youtube_item').find('div')[0].id;
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
