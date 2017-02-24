const mongoose = require('../mongoose'),

	Schema = mongoose.Schema,

	Schedule = new Schema({
		firstWeek: [],
		secondWeek: []
	});

module.exports = mongoose.model('Schedule', Schedule);