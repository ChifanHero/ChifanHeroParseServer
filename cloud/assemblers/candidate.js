var dish_assembler = require('./dish');

exports.assemble = function(source){
	var candidate = {};
	if (source != undefined) {
		candidate['dish'] = dish_assembler.assemble(source.get('dish'));
		candidate['list'] = dish_assembler.assemble(source.get('list'));
		candidate['count'] = source.get('count');
		candidate['id'] = source.id;
	}
	return candidate;
}