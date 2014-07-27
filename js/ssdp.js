var ssdp = require('node-ssdp')
  , client = new ssdp({logLevel: 'TRACE', log: true})
  , http = require('http');
  
var renderersList = {};
var serversList = {};

client.on('notify', function () {
  console.log('Got a notification.');
});

client.on('response', function inResponse(msg, rinfo) {
  try {
    var location = msg.toLowerCase().match(/location:(.*?)\r/)[1];
    $.get(location,function(res) {
      try {
        var xjs = new X2JS();
        var renderer = xjs.xml2json(res);
        var device = renderer.root.device;
        device.url = location;
        if (device.deviceType.indexOf('MediaRenderer') !== -1) {
          renderersList[device.friendlyName] = device;
        } else if (device.deviceType.indexOf('MediaServer') !== -1) {
          serversList[device.friendlyName] = device;
        }
        } catch(err) {
          console.log("ERRORRR:" + err + "\n" + res );
        }
    });
  } catch(err) {}
});

client.search('ssdp:all');
