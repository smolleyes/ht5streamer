multicurl
=========

`multicurl` is a npm module that allows you to download files while accelerating download speed by using multiple connections. It uses the `curl` executable to download the parts and uses `cat` to merge the files afterwards.

## Usage

```js
var multicurl = require("multicurl");

var download = new multicurl("http://www.speedtest.qsc.de/1MB.qsc", {
  connections: 3, // The amout of connections used (default: 3)
  destination: "/tmp/something", // The destination path (required)
});

download.on("progress", function (bytesDone, bytesTotal) {
  console.log(bytesDone, "of", bytesTotal, "bytes loaded");
});

download.on("done", function () {
  console.log("Done downloading");
});

download.run();
```

## License

The MIT License (MIT)

Copyright (c) 2013 Sascha Gehlich and FILSH Media GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
