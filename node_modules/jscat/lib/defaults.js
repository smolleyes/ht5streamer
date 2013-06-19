var exec = require('child_process').exec;

exports['read.js:compress'] = function (srcPath, next) {
  // balk if srcPath is like *min.js
  if (/min\.js$/.test(srcPath)) return next();
  exec('uglifyjs ' + srcPath, next);
};

// exports['each.js'] = function (data, callback, stop) {
//   console.error('each debug path : ' + data.path);
//   callback(null, data.content);
//   // third argument stop: true to stop chain
//   // callback(null, content, true)
// };

exports['join.js'] = function (dataArray, next) {
  var files = dataArray.map(function (data) {
    return data.content;
  });
  next(null, files.join(';\n\n\n'));
};