var EventEmitter = require("events").EventEmitter
  , util = require("util")
  , exec = require("child_process").exec
  , fs = require("fs");

function FileMerger(connections) {
  this.connections = connections;
};
util.inherits(FileMerger, EventEmitter);

// Initiates the merging process
FileMerger.prototype.run = function(destination) {
  var self = this;

  this.merge(destination, function (err) {
    if(err) return self.emit("error", err);
    self.cleanUp(function (err) {
      if(err) return self.emit("error", err);

      self.emit("done");
    });
  });
};

// Merges the files
FileMerger.prototype.merge = function (destination, callback) {
  // Build the arguments
  var args = ""
    , connection;
  for(var i = 0; i < this.connections.length; i++) {
    var connection = this.connections[i];
    args += " " + connection.options.destination;
  }
  args += " > " + destination;

  // Run the process
  var p = exec("cat " + args);
  p.on("exit", function (code) {
    if(code !== 0) {
      return callback(new Error("`cat` exited with status code " + code));
    }
    callback();
  });
};

// Removes the partial files
FileMerger.prototype.cleanUp = function (callback) {
  var filesDone = 0
    , filesTotal = this.connections.length
    , connection;

  for(var i = 0; i < filesTotal; i++) {
    connection = this.connections[i];
    fs.unlink(connection.options.destination, function () {
      filesDone ++;
      if(filesDone === filesTotal) {
        callback();
      }
    });
  }
};

module.exports = FileMerger;
