var Message = Parse.Object.extend('Message');
var _ = require('underscore');
var message_assembler = require('../assemblers/message');
var error_handler = require('../error_handler');

exports.listAll = function(req, res) {
	var query = new Parse.Query(Message);
	query.find().then(function(results) {
		var messages = [];
		_.each(results, function(result){
			var message = message_assembler.assemble(result);
			messages.push(message);
		});
		var response = {};
		response['results'] = messages;
		res.json(200, response);
	}, function(error){
		error_handler.handle(error, {}, res);
	});
}

exports.findById = function(req, res) {
	var id = req.params.id;
	var query = new Parse.Query(Message);
	query.get(id).then(function(obj){
		var message = message_assembler.assemble(obj);
		var response = {};
		response['result'] = message;
		res.json(200, response);
	}, function(error){
		error_handler.handle(error, {}, res);
	});
}