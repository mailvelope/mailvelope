
// https://gist.github.com/1101534
$.extend({
  parseQuerystring: function(){
    var nvpair = {};
    var qs;
    if (window.location.search) {
      qs = window.location.search.replace('?', '');
    } else {
      qs = window.location.href.split('?')[1];
      if (window.location.hash) {
        qs = window.location.href.split(window.location.hash)[0]
      }
    }
    if(qs !== undefined) {
      var pairs = qs.split('&');
      $.each(pairs, function(i, v){
        var pair = v.split('=');
        nvpair[pair[0]] = pair[1];
      });
    }
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
    heading = heading + ' ';
    $('<strong/>').appendTo(row).text(heading);
  }
  if (typeof message === 'string') {
    $('<span/>').appendTo(row).text(message);
  } else {
    row.append(message);
  }
  row.attr('class', 'alert fade in');
  row.addClass('alert-' + type);
  this.show();
  return this;
};
