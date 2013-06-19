exports['read'] = function (srcPath, next) {
  // Balk hook event with no argument.
  next();
};

// make sure you return `data.content`, not `data`
exports['each'] = function (data, callback, stop) {
  callback(null, data.content);
};

// You cannot balk join event
exports['join'] = function (dataArray, next) {
  var files = dataArray.map(function (data) {
    return data.content;
  });
  next(null, files.join('\n'));
};