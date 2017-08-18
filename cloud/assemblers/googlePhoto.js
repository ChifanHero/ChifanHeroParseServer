/**
 * Created by xnzhang on 5/2/17.
 */

'use strict';

exports.assemble = function(source){
  const image = {};
  if (source !== undefined) {
    image['google_photo_reference'] = source.photo_reference;
    image['html_attributions'] = source.html_attributions;
  }
  return image;
};