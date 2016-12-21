exports.assemble = function(source) {
	var message = {};
	if (source != undefined) {
		message['id'] = source.id;
		message['body'] = source.get('body');
		message['title'] = source.get('title');
		message['greeting'] = source.get('greeting');
		message['signature'] = source.get('signature');
	}
	return message;
}