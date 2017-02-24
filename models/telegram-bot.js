const mongoose = require('../mongoose'),
	db = mongoose.connection,
	Schema = mongoose.Schema,

	SerdechkoBot = new Schema({
		groups: []
	});

module.exports = mongoose.model('SerdechkoBot', SerdechkoBot);