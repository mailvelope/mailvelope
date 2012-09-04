
// https://gist.github.com/1101534
$.extend({
  parseQuerystring: function(){
    var nvpair = {};
    var qs = window.location.search.replace('?', '');
    var pairs = qs.split('&');
    $.each(pairs, function(i, v){
      var pair = v.split('=');
      nvpair[pair[0]] = pair[1];
    });
    return nvpair;
  }
});

$.extend({
  setEqualWidth: function(first, other){
    var width = first.width();
    var otherWidth = other.width();
    if (width > otherWidth) {
      other.width(width);
    } else if (width < otherWidth) {
      first.width(otherWidth);
    }
    return this;
  }
});

// append alert message to element and show it
$.fn.showAlert = function(heading, message, type, keep) {
  if (keep === undefined || keep === false) {
    this.empty();
  }
  var row = $('<div/>').appendTo(this);
  if (heading) {
    heading = heading + '! ';
    $('<strong/>').appendTo(row).text(heading);
  }
  $('<span/>').appendTo(row).text(message);
  row.attr('class', 'alert fade in')
     .addClass('alert-' + type);
  this.show();
  return this;
}