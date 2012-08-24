
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
$.fn.showAlert = function(heading, message, type) {
  this.empty();
  if (heading) {
    this.append('<strong>' + heading + '! </strong>');
  }
  this.append(message)
      .attr('class', 'alert fade in')
      .addClass('alert-' + type)
      .show();
  return this;
}