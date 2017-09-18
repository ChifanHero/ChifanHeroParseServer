const restImageAssembler = require('./restImage');

exports.assemble = function(source) {
  	const user = {};
	if (source !== undefined) {
		user['id'] = source['objectId'];
		user['username'] = source['username'];
		user['nick_name'] = source['nick_name'];
		user['email'] = source['email'];
		user['email_verified'] = source['emailVerified'];
		user['using_default_username'] = source['using_default_username'];
		user['using_default_password'] = source['using_default_password'];
		user['using_default_nickname'] = source['using_default_nickname'];
		if (source['picture'] !== undefined) {
	  		user['picture'] = restImageAssembler.assemble(source['picture']); 
		}
	}
	return user;
};