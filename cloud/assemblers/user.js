const imageAssembler = require('./image');

exports.assemble = function(source) {
  	const user = {};
  	console.log(source);
	if (source !== undefined) {
		user['id'] = source.id;
		user['username'] = source.get('username');
		user['nick_name'] = source.get('nick_name');
		user['email'] = source.get('email');
		user['email_verified'] = source.get('emailVerified');
		user['using_default_username'] = source.get('using_default_username');
		user['using_default_password'] = source.get('using_default_password');
		user['using_default_nickname'] = source.get('using_default_nickname');
		if (source.get('picture') !== undefined) {
	  		user['picture'] = imageAssembler.assemble(source.get('picture')); 
		}
	}
	return user;
};