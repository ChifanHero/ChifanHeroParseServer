const imageAssembler = require('./image');

exports.assemble = function(source) {
  const user = {};
	if (source !== undefined) {
		user['id'] = source.id;
		user['username'] = source.get('username');
		user['nick_name'] = source.get('nick_name');
		user['email'] = source.get('email');
		user['emailVerified'] = source.get('emailVerified');
		if (source.get('picture') !== undefined) {
      user['picture'] = imageAssembler.assemble(source.get('picture')); 
    }
	}
	return user;
};