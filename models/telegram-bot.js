const mongoose = require('../mongoose'),
	db = mongoose.connection,
	Schema = mongoose.Schema,

	SerdechkoBot = new Schema({
		currWeek: Number,
		flagWeek: Boolean,
		groups: []
	});

module.exports = mongoose.model('SerdechkoBot', SerdechkoBot);