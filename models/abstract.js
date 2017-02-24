const mongoose = require('../mongoose'),

	Schema = mongoose.Schema,
	Abstract = new Schema({
		subject: String,
		name: String,
		author: String,
		text: String,
		date: { type: Date, default: Date.now }
	});

module.exports = mongoose.model('Abstract', Abstract);