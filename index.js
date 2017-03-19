const TelegramBot = require('node-telegram-bot-api'),
	express = require('express'),
	bodyParser = require('body-parser'),

	Abstracts = require('./models/abstract'),
	SerdechkoBot = require('./models/telegram-bot'),
	Group = require('./models/group'),
	Schedule = require('./models/schedule'),
	scheduleHandler = require('./schedule'),

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
				let groups = group[0].groups,
					absText = abstract[0].text;
				console.log('List of ids: ', groups)

				groups.forEach((id) => {
					bot.sendMessage(id, `${abstract[0].author} сохранил конспект "${abstract[0].name}" по предмету ${abstract[0].subject}`);

					bot.sendMessage(id, absText);
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

		let absText = abstracts[number - 1].text,
			length = absText.length;
		const maxLength = 4096;
		if (length > maxLength) {
			let i = 0;

			while (i < length) {
				j = i + maxLength;
				if (j < length)
					while (absText[j] != '\n') j--;

				setTimeout(function(i, j) {
					bot.sendMessage(msg.chat.id, absText.slice(i, j)) 
				}, Math.trunc(i / 10), i, j);
				
				i = j + 1;
			}
		} else
			bot.sendMessage(msg.chat.id, absText);
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
		if (!group) return bot.sendMessage(msg.chat.id, 'Не нашел группу');
		
		let response = '';
		for (let i = 0; i < group[0].amount; i++)
			response += `${i+1}. ${group[0].list[i].name} ${group[0].list[i].surname}\n`;
		bot.sendMessage(msg.chat.id, response);
	})
});

bot.onText(/\/schedule/, (msg, match) => {
	scheduleHandler(msg, bot, SerdechkoBot, groups, Schedule);
});

bot.onText(/\/timesch/, (msg, match) => {
	let response = '',
		firstStart = new Date('1 8:30'),
		len = new Date('1 1:35'),
		shift = new Date('1 1:55');

	for (let i = 0; i < 5; i++) {
		let startM = firstStart.getMinutes() + shift.getMinutes() * i,
			startH = firstStart.getHours() + shift.getHours() * i;
		while(startM >= 60) {
			startM -= 60;
			startH++;
		};

		let endM = startM + len.getMinutes(),
			endH = startH + len.getHours();
		while(endM >= 60) {
			endM -= 60;
			endH++;
		};
		if (endM < 10) endM = '0' + endM;

		response += `${i+1}. ${startH}:${startM} - ${endH}:${endM}\n`;
	}
	bot.sendMessage(msg.chat.id, response);
});

bot.onText(/\/timeleft/, (msg, match) => {
	let len = 100 * 60 + 100 * 35, // 1:35
		shift = 100 * 60 + 100 * 55, // 1:55
		firstStart = 100 * 60 * 8 + 100 * 30, // 8:30
		timeNow = new Date(),
		curr = 100 * 60 * (timeNow.getHours() + 2) + 100 * timeNow.getMinutes(),
		flag = false;

	for (let i = 0; i < 5; i++) {
		let start = firstStart + shift * i,
			end = start + len;

		if (curr > start && curr < end)	{
			flag = true;
			let minutes = Math.trunc((end - curr) / 100),
				ending;

			if (time % 10 == 1)
				if (time == 11)
					ending = 'минуточек'
				else
					ending = 'минуточка'
			else if (time % 10 < 5 && time % 10 != 0)
				if (time > 10 && time < 15)
					ending = 'минуточек'
				else
					ending = 'минуточки'
			else
				ending = 'минуточек'

			response = `Тебе осталось ${minutes} ${ending}`;
		}
	}
	flag ? bot.sendMessage(msg.chat.id, response) : bot.sendMessage(msg.chat.id, 'Тебе повезло, ты не на паре');
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
		`/grouplist - посмотреть список своей группы\n/schedule - посмотреть расписание\n/love - дарить любовь\n` +
		`/schedule group/day/today/tomorrow - как хочешь, так и юзаешь, чтобы посмотреть расписание любой группы потока`);
});

bot.onText(/\/love/, (msg, match) => {
	bot.sendMessage(msg.chat.id, 'Всем любви в этом чатике <3');
	// bot.sendMessage(msg.chat.id, 'Это love-police. Вы арестованы за нелюбовь к чатику. Штраф - ваше сердечко. Впредь без нарушений');
})

bot.on('webhook_error', error => console.log(error));


app.listen(port, () => console.log(`Express-bot is running on port ${port}`));