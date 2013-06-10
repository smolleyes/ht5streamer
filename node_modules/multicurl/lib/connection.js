var util         = require("util")
  , EventEmitter = require("events").EventEmitter
  , spawn        = require("child_process").spawn;

function Connection(url, options) {
  this.url = url;
  this.options = options;
  this.retries = 0;
};
util.inherits(Connection, EventEmitter);

Connection.prototype.run = function() {
  var args = this.buildArguments(this.options);
  args = args.concat(["--range", this.options.range.from + "-" + this.options.range.to]);
  args = args.concat(["--connect-timeout", this.options.timeout]);
  args = args.concat(["-f"]); // Make it fail on status code > 400
  args.push(this.url);

  this.bytesDone = 0;
  var buffer = ""
    , self = this;

  this.process = spawn("curl", args);

  // Listen for exit
  this.process.on("exit", function(exitCode) {
    if(exitCode !== 0 && exitCode !== null) {
      if(self.retries < self.options.maxRetries) {
        self.retries++;
        self.emit("retry", self.retries, self.options.index);

        self.run();
      } else {
        self.emit("error", new Error("Failed to download file after " + self.options.maxRetries + " retries"));
      }
    } else if(exitCode !== null) {
      self.bytesDone = self.options.range.size;
      self.emit("progress", self.options.range.size);
      self.emit("done");
    }
  });

  // Listen for stderr output
  this.process.stderr.on("data", function (chunk) {
    chunk = chunk.toString();
    buffer += chunk;

    // Find last line that ends with a \r
    var lineSplit = buffer.split("\r")
      , lastLine  = null;

    // Find the last valid line
    for(var i = 0; i < lineSplit.length; i++) {
      var line = lineSplit[i].replace(/\r/g, "").replace(/\s+/g, " ").replace(/^\s+|\s+$/, "");

      // We have reached our last and incomplete line
      if(line.split(" ").length === 12) {
        lastLine = line;
      }
    }

    if(lastLine) {
      // Split the line and parse the file size
      var wordSplit = lastLine.split(" ")
        , transferred = wordSplit[3]
        , transferredInt = parseInt(wordSplit[3])
        , match;

      if(match = transferred.match(/([0-9]*\.?[0-9]+)([M|k]?)/)) {
        switch(match[2]) {
          case "k":
            transferredInt *= 1024
            break;
          case "M":
            transferredInt *= 1024 * 1024
            break;
        }

        self.bytesDone = transferredInt;

        // Emit a new progress event
        self.emit("progress", transferredInt);
      }
    }

  });
};

// Builds the arguments for calling curl
Connection.prototype.buildArguments = function(options) {
  var args = [];

  // Destination
  args = args.concat(["-o", this.options.destination]);

  return args;
};

// Stops the running curl process (if running)
Connection.prototype.stop = function () {
  if(this.process) {
    this.process.kill("SIGKILL");
  }
};

module.exports = Connection;
