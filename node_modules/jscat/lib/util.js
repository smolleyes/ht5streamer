var async = require('async')
  , mkdirp = require('mkdirp')
  , dirname = require('path').dirname
  , writeFile = require('fs').writeFile
  , readFile = require('fs').readFile
  ;

exports.writeTo = function (outPath, content, callback) {
  async.waterfall([
    // mkdirp
    function (next) {
      mkdirp(dirname(outPath), 755, function (err) {
        if (err) return next(err);
        next();
      });
    }
    // writeFile
  , function (next) {
      writeFile(outPath, content, function (err) {
        if (err) return next(err);
        next();
      });
    }
  ], callback);
};

exports.readFile = function (filePath, next) {
  readFile(filePath, function (err, content) {
    if (err) return next(err);
    next(null, {
      path: filePath
    , content: content
    });
  });
};

exports.joinData = function (dataArray, next) {
  var files = dataArray.map(function (data) {
    return data.content;
  });
  next(null, files.join('\n'));
};