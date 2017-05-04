/**
 * Created by xnzhang on 5/2/17.
 */

'use strict'

exports.assemble = function(source){
  var image = {};
  if (source != undefined) {
    image['google_photo_reference'] = source.photo_reference;
  }
  return image;
}