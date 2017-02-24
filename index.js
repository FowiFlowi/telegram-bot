const TelegramBot = require('node-telegram-bot-api'),
	express = require('express'),
	bodyParser = require('body-parser'),
	fs = require('fs'),

	Abstracts = require('./models/abstract'),
	SerdechkoBot = require('./models/telegram-bot'),
	Group = require('./models/group'),
	Schedule = require('./models/schedule'),

	config = require('./config'),
	token = config.token,
	url = config.url,
	port = process.env.PORT || 3000,
	secret = config.secret,
	botId = 348857845,
	subjects = ['Английский', 'ПРВ', 'Философия', 'Матан', 'Комп.электроника', 'ТЭЦ', 'ООП', 'КЛ', 'СП'],
	groups = ['КВ-51', 'КВ-52', 'КВ-53'],

	app = express(),
	bot = new TelegramBot(token);

bot.setWebHook(`${url}/bot${token}`);

app.use((req, res, next) => {
	console.log(req.method, req.url);
	next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.post(`/bot${token}`, (req, res) => { // requests form Telegram
	bot.processUpdate(req.body);
	res.sendStatus(200);
});

app.post('/', (req, res) => {	// requests from another app
	console.log(req.body);
	if (req.body.secret == secret) {
		let name = req.body.name;

		Abstracts.find({ name }, (err, abstract) => {
			if (err) {
				console.log(err);
				return res.end('error');
			}
			SerdechkoBot.find({}, (err, group) => {
				let groups = group[0].groups;
				console.log('List of ids: ', groups)

				groups.forEach((id) => {
					bot.sendMessage(id, `${abstract[0].author} сохранил конспект "${abstract[0].name}" по предмету ${abstract[0].subject}`);
					bot.sendMessage(id, abstract[0].text);
				});

				res.end('Abstract has sent to the telegram chat');
			})
		})
	} else res.end('Wrong secret');
});

app.use((err, req, res, next) => {
	console.log(err);
	res.send('error');
	next();
})


bot.onText(/\/show/, (msg, match) => {
	let text = match.input.split(' '),
		subject = text[1],
		number = text[2];

	Abstracts.find({ subject }, (err, abstracts) => {
		if (err || !abstracts[number - 1]) 
			return bot.sendMessage(msg.chat.id, `Ничего не нашел :c \nВот список предметов: ${subjects.join('; ')}`);

		abstracts.sort((a, b) => a.date - b.date);
		bot.sendMessage(msg.chat.id, abstracts[number - 1].text);
	})
});

bot.onText(/\/all/, (msg, match) => {
	let res = 'Вот что по лекциям:\n',
		num = subjects.length,
		counter = 0;
	subjects.forEach((subject) => {
		Abstracts.find({ subject }, (err, abstracts) => {
			if (abstracts.length != 0)
				res += `${subject}: ${abstracts.length}\n`;
			counter++;
			if (counter == num) bot.sendMessage(msg.chat.id, res);
		})
	})
});

bot.onText(/\/grouplist/, (msg, match) => {
	let text = match.input.split(' '),
		name = text[1] || 'КВ-51';
	Group.find({ name }, (err, group) => {
		if (err) return console.log(err);
		let response = '';
		for (let i = 0; i < group[0].amount; i++)
			response += `${i+1}. ${group[0].list[i].name} ${group[0].list[i].surname}\n`;
		bot.sendMessage(msg.chat.id, response);
	})
});

bot.onText(/\/schedule/, (msg, match) => {
	let text = match.input.split(' '),
		weekLen = new Date(2016, 9, 8) - new Date(2016, 9, 1),
		dateNow = new Date(),
		dateBegin = new Date(2017, 2, 13),
		isFirstWeek = Math.trunc(new Date(dateNow - dateBegin) / weekLen) % 2 == 0 ? 0 : 1, // or is Even?
		weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
		commands = ['week', 'today', 'tomorrow'],
		command,
		group = 'КВ-51',
		isSetGroup = 0,
		searchDay = '';

	if (groups.indexOf(text[1]) + 1) {	// if group is set
		group = text[1];
		isSetGroup = 1;
	}

	if (commands.indexOf(text[1 + isSetGroup]) + 1) {	// if command is set
		command = text[1 + isSetGroup]

	} else if (weekDays.indexOf(text[1 + isSetGroup]) + 1) {	// if command isn't set but search day is set
		searchDay = text[1 + isSetGroup];

		if (text[2 + isSetGroup] == 1 || text[2 + isSetGroup] == 2) // if number of week is correct
			isFirstWeek = text[2 + isSetGroup] % 2;
		else if (text[2 + isSetGroup])
			return bot.sendMessage(msg.chat.id, 'Странный у тебя номер недели');
		
	} else if (text[1 + isSetGroup])	// if day is set incorrect
		return bot.sendMessage(msg.chat.id, 'Не нашел такого дня')

	Schedule.find({ group }, (err, schedule) => {
		if (err) return console.log(err);
		if (!schedule[0]) return bot.sendMessage(msg.chat.id, 'Странная группа у тебя, не знаю такой');

		let twoWeeks = [schedule[0].firstWeek, schedule[0].secondWeek];
			response = '';

		if (command || searchDay) delete twoWeeks[isFirstWeek]

		twoWeeks.forEach((week, i) => {
			!command ? i == 0 ? response += 'First Week:\n' : response += 'Second Week:\n'
					 : isFirstWeek ? response += 'First Week:\n' : response += 'Second Week:\n'

			if (command == 'today' || command == 'tomorrow') {
				let j = command == 'today' ? 1 : 0,
					dayNum = (new Date()).getDay(),
					day = week[dayNum - j];
				dayServe(day);
			} else if (searchDay) {
				dayServe(week[weekDays.indexOf(searchDay)])
			} else week.forEach(day => dayServe(day))
		})
		bot.sendMessage(msg.chat.id, response);


		function dayServe(day) {	// function for out some day
			let types = ['Лек', 'Практ', 'Лаб'];
			response += `---${day.weekday}---\n`;

			Object.keys(day.subjects).forEach((keySub, i) => {
				let subject = day.subjects[keySub],
					teacher = subject.teachers[0] ? `${subject.teachers[0].short_name}` : '',
					room = subject.rooms[0] ? subject.rooms[0].name : '',
					building = subject.rooms[0] ? subject.rooms[0].building.name : '',
					place = room ? `  ${room}-${building}\n` : '',
					type = types[subject.type] ? types[subject.type] : '';
				response += `${i+1}. ${subject.discipline.name} ${type}\n${teacher}${place}`
			})
			response += '\n';
		}
	})
})

bot.onText(/\/start/, (msg, match) => {
	SerdechkoBot.find({}, (err, data) => {
		let groups = data[0].groups;
		if (!(groups.indexOf(msg.chat.id) + 1)) {
			groups.push(msg.chat.id);
			SerdechkoBot.update({}, { groups }, err => err ? console.log(err) : console.log('New group!'));
			bot.sendMessage(msg.chat.id, 'Привет <3');
		} else {
			bot.sendMessage(msg.chat.id, 'Я тебя уже знаю!');
		}
	});
});

bot.onText(/\/help/, (msg, match) => {
	bot.sendMessage(msg.chat.id, `Я бот-сердечко. Записываю лекции и дарю любовь <3\n\n` +
		`/all - посмотреть что по лекциям\n/show subject number - посмотреть конкретную лекцию\n` +
		`/grouplist - посмотреть список своей группы\n/schedule - посмотреть расписание\n/love - дарить любовь` +
		`/schedule group/day/today/tomorrow - как хочешь, так и юзаешь, чтобы посмотреть расписание любой группы потока`);
});

bot.onText(/\/love/, (msg, match) => {
	bot.sendMessage(msg.chat.id, 'Всем любви в этом чатике <3');
	// bot.sendMessage(msg.chat.id, 'Это love-police. Вы арестованы за нелюбовь к чатику. Штраф - ваше сердечко. Впредь без нарушений');
})

bot.on('webhook_error', error => console.log(error));


app.listen(port, () => console.log(`Express-bot is running on port ${port}`));