const mongoose = require('mongoose'),
	config = require('./config')
	url = config.dburl,
	db = mongoose.connection,

mongoose.Promise = Promise;

mongoose.connect(url);
db.on('error', err => console.log(err));
db.once('open', () => console.log('Connected to database'));
db.once('close', () => console.log('connection has closed'));

module.exports = mongoose;