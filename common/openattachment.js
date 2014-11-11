self.port.on("attachmentContent", function(attachment) {
  console.log("Content of the attachment: "+JSON.stringify(attachment));

  var contentLength = Object.keys(attachment.content).length;
  //console.log("contentLength: "+contentLength);
  var uint8Array = new Uint8Array(contentLength);
  for (var i = 0; i < contentLength; i++) {
    uint8Array[i] = attachment.content[i];
  }
  //console.log("uint8Array: "+JSON.stringify(uint8Array));
  //console.log("Exists: "+window.URL.createObjectURL());
  var blob = new Blob([uint8Array]);
  //console.log("blob: "+blob);
  var objectURL = window.URL.createObjectURL(blob);
  //console.log("Object URL: "+objectURL);
  self.port.emit('blobURL',objectURL);
});