var multicurl = require("../lib/multicurl")
  , fs = require("fs")
  , should = require("should")
  , exec = require("child_process").exec;

// Create temporary directory if it doesn't exist already
before(function () {
  if(!fs.existsSync("tmp")) {
    fs.mkdirSync("tmp");
  }
});

describe("multicurl", function () {
  it("should throw an error if no destination is given", function (done) {
    multicurl.should.throw("No destination given");
    try {
      var download = new multicurl("http://www.speedtest.qsc.de/1MB.qsc", {
        connections: 3
      });
    } catch (e) {}
    done();
  });

  describe("when downloading a test file with 3 connections", function () {
    var download
      , filename = "tmp/test" + Math.round(Math.random() * 10000);
    before(function () {
      download = new multicurl("http://www.speedtest.qsc.de/1MB.qsc", {
        connections: 3,
        destination: filename
      });
      download.run();
    });

    it("should fire a filesize event", function (done) {
      download.once("filesize", function (fileSize) {
        fileSize.should.equal(1048576);
        done()
      });
    });

    it("should fire a progress event", function (done) {
      download.once("progress", function (bytesDone, bytesTotal) {
        done()
      });
    });

    it("should fire a done event when it finished downloading", function (done) {
      this.timeout(10000);
      download.once("done", function () {
        done()
      });
    });

    it("should clean up after merging the parts", function (done) {
      fs.existsSync(filename + ".0").should.be.false;
      fs.existsSync(filename + ".1").should.be.false;
      fs.existsSync(filename + ".2").should.be.false;
      done();
    });
  });

  describe("when an error happens before running curl", function () {
    var download;
    before(function () {
      download = new multicurl("http://www.speedtest.qsc.de/thisprobablydoesntexist", {
        connections: 3,
        destination: "temp/test" + Math.round(Math.random() * 10000)
      });
    });

    it("should fire an error event", function (done) {
      download.run();
      download.on("error", function (err) {
        should.exist(err);
        done();
      });
    });
  });

  describe("when an error happens while running curl", function () {
    var download;
    before(function () {
      download = new multicurl("http://www.speedtest.qsc.de/1MB.qsc", {
        connections: 3,
        destination: "somethingthatdoesntexist/test" + Math.round(Math.random() * 10000)
      });
    });

    it("should fire an error event", function (done) {
      download.run();
      download.on("error", function (err) {
        should.exist(err);
        done();
      });
    });
  });

  describe("when a connection fails", function () {
    var download;
    before(function () {
      download = new multicurl("http://localhost:4444/testfile", {
        connections: 3,
        destination: "tmp/test" + Math.round(Math.random() * 10000),
        timeout: 500
      });
    });

    var testServer = require("./test-server.js")
      , retried = 0;
    it("should try to reconnect and still finish downloading", function (done) {
      this.timeout(30000);
      download.on("retry", function (retry, connectionIndex) {
        retried++;
      });
      download.once("done", function () {
        retried.should.be.above(0);
        done();
      });
      download.run();
    });
  });

  describe("when stopping a download", function () {
    this.timeout(5000);

    var download;
    before(function () {
      download = new multicurl("http://www.speedtest.qsc.de/100MB.qsc", {
        connections: 3,
        destination: "tmp/test" + Math.round(Math.random() * 10000)
      });
    });

    it("should stop all processes", function (done) {
      setTimeout(function () {
        download.stop();

        setTimeout(function () {
          // Get the amount of curl processes running
          exec("ps aux|grep curl|grep -v grep|grep -v mocha|wc -l", function (err, stdout, stderr) {
            stdout.trim().should.equal("0");
            done();
          });
        }, 500);

      }, 3000);
      download.run();
    });
  });
});
