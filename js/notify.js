var http=require('http');
var path = require('path');
var fs = require('fs');
var temp = require('temp');
var exec = require('child_process').exec;
 
var online_version;

$(document).ready(function(){
    try {
        http.get('http://sd-20470.dedibox.fr/ht5streamer/update.html',function(res,err){
            var datas = [];
            res.on('data',function(chunk){
                datas.push(chunk);
            });
            res.on('end',function(){
                console.log("Checking for updates....");
                var data = datas.join('');
                var txt = $('p',data).prevObject[1].innerHTML;
                online_version = txt;
                try {
					console.log("online version : "+online_version+', current version : '+ settings.version);
				} catch(err){
					console.log(err);
					return;
				}
                if (online_version === settings.version) {
                    $.notif({title: 'Ht5streamer:',cls:'green',icon: '&#10003;',content:myLocalize.translate("Your software is up to date !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'})
                } else {
                    $.notif({title: 'Ht5streamer:',cls:'red',icon: '&#59256;',timeout:0,content:myLocalize.translate("A new version is available !"),btnId:'updateBtn',btnTitle:myLocalize.translate('Update'),btnColor:'black',btnDisplay: 'block',updateDisplay:'none'})
                }
            });
        });
    } catch (err) {
        console.log("offline mode or update server down....");
    }
    
    // udpates
    $(document).on('click','#updateBtn',function(e) {
        e.preventDefault();
        var arch = process.arch;
        var file = '';
        var link = '';
        if (process.platform === 'win32') {
            file = 'ht5streamer-setup.exe';
            link = 'http://sd-20470.dedibox.fr/ht5streamer/windows/'+file;
        } else {
            if (arch === 'ia32') {
                console.log('linux 32 bits detected...');
                file = 'ht5streamer-32.zip';
            } else if (arch === 'x64') {
                console.log('linux 64 bits detected...');
                file = 'ht5streamer-64.zip';
            }
            link = 'http://sd-20470.dedibox.fr/ht5streamer/'+file;
        }
        downloadUpdate(link,file);
    });
});

function downloadUpdate(link,filename) {
    $.notif({title: 'Ht5streamer update:',icon: '&#128229;',timeout:0,content:'',btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'block'});
    // remove file if already exist
    var pbar = $('#updateProgress');
    var execDir = path.dirname(process.execPath);
    // start download
    $('#updateProgress strong').html(myLocalize.translate('Waiting for connection...'));
    var val = $('#updateProgress progress').attr('value');
    var currentTime;
    var startTime = (new Date()).getTime();
    
	current_download = http.request(link,
		function (response) {
			var contentLength = response.headers["content-length"];
            if (parseInt(contentLength) === 0) {
                $('#updateProgress strong').html(myLocalize.translate("can't download this file..."));
                setTimeout(function(){pbar.hide()},5000);
            }
            temp.mkdir('ht5streamer', function(err, dirPath) {
			tmpPath = dirPath;
			var target;
			if (process.platform === 'win32') {
				target = dirPath+'\\'+filename;
			} else {
				target = dirPath+'/'+filename;
			}
			var file = fs.createWriteStream(target);
			console.log(target);
			response.on('data',function (chunk) {
				file.write(chunk);
				var bytesDone = file.bytesWritten;
				currentTime = (new Date()).getTime();
				var transfer_speed = (bytesDone / ( currentTime - startTime)).toFixed(2);
				var newVal= bytesDone*100/contentLength;
				var txt = Math.floor(newVal)+'% '+ myLocalize.translate('done at')+' '+transfer_speed+' kb/s';
				$('#updateProgress progress').attr('value',newVal).text(txt);
				$('#updateProgress strong').html(txt);
			});
			response.on('end', function() {
				file.end();
                $('#updateProgress b').empty();
                $('#updateProgress strong').html(myLocalize.translate('Download ended !'));
                $('#updateProgress progress').hide();
                var execDir = path.dirname(process.execPath);
				var update;
				process.chdir(tmpPath);
				$('#updateProgress strong').html(myLocalize.translate('Installing update...'));
				
				if (process.platform === 'win32') {
					update = exec(filename);
				} else {
					var args = ['-o',filename,'-d',execDir];
					var update = spawn('unzip', args);
				}
				update.on('exit', function(data){
					pbar.click();
					$('.notification').click();
					if (parseInt(data) == 0) {
						$.notif({title: 'Ht5streamer:',cls:'green',timeout:10000,icon: '&#10003;',content:myLocalize.translate("Update successfully installed! please restart ht5streamer"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});
					} else {
						$.notif({title: 'Ht5streamer:',cls:'red',timeout:10000,icon: '&#10006;',content:myLocalize.translate("Update error, please report the problem... !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});
					}
				});
				update.stderr.on('data', function(data) {
					$('.notification').click();
					$.notif({title: 'Ht5streamer:',cls:'red',timeout:10000,icon: '&#10006;',content:myLocalize.translate("Update error, please report the problem... !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});
					console.log('update stderr: ' + data);
				});
			});
		});
	});
    current_download.end();
}
