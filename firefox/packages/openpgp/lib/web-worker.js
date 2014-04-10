
var data = require('sdk/self').data;
var pageWorker = require("sdk/page-worker");

function WebWorker() {
  var that = this;
  this.msgQueue = [];
  this.workerReady = false;
  this.worker = pageWorker.Page({
    contentURL: data.url("content.html")
  });
  this.worker.on('message', function(msg) {
    if (msg.event == 'worker-ready') {
      that.workerReady = true;
      that.msgQueue.forEach(function(msg) {
        that.worker.postMessage(msg);
      });
      that.msgQueue = null;
    } else {
      that.onmessage({data: msg});
    }
  });
}

WebWorker.prototype.postMessage = function(msg) {
  if (this.workerReady) {
    this.worker.postMessage(msg);  
  } else {
    this.msgQueue.push(msg);
  }
};

exports.Worker = WebWorker;