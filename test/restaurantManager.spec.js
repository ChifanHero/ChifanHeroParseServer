/**
 * Created by xnzhang on 4/21/17.
 */

"use strict";

var chaiHttp = require('chai-http');
var chai = require('chai');
var should = chai.should();
var server = require('../index.js');
var appconfig = require('../appconfig.json');

var Restaurant = Parse.Object.extend('Restaurant');

chai.use(chaiHttp);

describe('restaurantManager', function () {
  describe('/GET /restaurants/:id', function () {
    it('it should GET a restaurant b the given id', (done) => {
      var restaurant = new Restaurant();
      restaurant.set('name', 'Test');
      restaurant.save().then(result => {
        chai.request(server)
          .get('/parse/restaurants/' + result.id + '?lon=-118.23&lat=33.97')
          .set('X-Parse-Application-Id', appconfig.dev.appId)
          .set('X-Parse-Master-Key', appconfig.dev.masterKey)
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.have.property('result').have.property('id').eql(result.id);
            done();
          });
      });
    });
  });
});
