
$(document).ready(function() {
  var element = $('textarea');
  var editor = new wysihtml5.Editor(element.get(0), {
    parserRules:  wysihtml5ParserRules
  });
  self.port.on('parse', function(message) {
    self.port.emit(message.response, editor.parse(message.data));
  })
});