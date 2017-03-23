module.exports = function(msg, bot, SerdechkoBot, groups, Schedule) {
	let weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
		isFirstWeek, // 1 or 0 | true or false
		command,
		searchDay,
		currDay,
		promise = SerdechkoBot.findOne({}).exec();

	promise.then(botData => {
		currDay = (new Date).getDay();

		if (currDay == 1 && botData.flagWeek) {
			botData.flagWeek = false;
			botData.currWeek ? botData.currWeek-- : botData.currWeek++;
		} else if (currDay != 1)
			botData.flagWeek = true;

		isFirstWeek = botData.currWeek;
		botData.save();

		let input = msg.text.split(' '),
			isGroup = 0,
			group = 'КВ-51',
			commands = ['week', 'today', 'tomorrow', 'all'];

		if (input[1] && groups.indexOf(input[1].toUpperCase()) + 1) { // if group is specified
			group = input[1].toUpperCase();
			isGroup = 1;
		};

		let fArg = input[1 + isGroup], // command or searched day
			weekNum = input[2 + isGroup]; // specified week number

		if (!fArg) {
			bot.sendMessage(msg.chat.id, 'Выбери что-то: all, today, tomorrow');
			return 0;
		}

		if (weekNum) // if week number specified then change isFirstWeek
			if (weekNum == 1 || weekNum == 2)
				isFirstWeek = weekNum % 2
			else {
				bot.sendMessage(msg.chat.id, 'Это у тебя первая или вторая неделя, солнце?');
				return 0;
			}

		// if command or search day specified then set it
		if (fArg && commands.indexOf(fArg.toLowerCase()) + 1)
			command = fArg.toLowerCase();
		else if (fArg) {
			searchDay = fArg.charAt(0).toUpperCase() + fArg.slice(1).toLowerCase();
			if (!(weekDays.indexOf(searchDay) + 1)) {
				bot.sendMessage(msg.chat.id, 'Не нашел такого дня :c');
				return 0;
			}
		}

		return Schedule.findOne({ group });
	})
	.then(schedule => {
		if (schedule) {
			let twoWeeks = [schedule.firstWeek, schedule.secondWeek],
				response = '';

			if (command == 'tomorrow') // switch week if it's Sunday now
				if (currDay == 0) isFirstWeek ? isFirstWeek-- : isFirstWeek++

			if (command != 'all' || searchDay) delete twoWeeks[isFirstWeek]; // leave one week if command or search day is specified

			twoWeeks.forEach((week, i) => {
				i == 0 ? response += 'First Week:\n' : response += 'Second Week:\n'

				if (command == 'today' || command == 'tomorrow') {
					let j = command == 'today' ? 1 : 0
					sendDay(week[currDay - j]);
				} else if (searchDay) 
					sendDay(week[weekDays.indexOf(searchDay)]);
				else if (command == 'all')
					week.forEach(day => sendDay(day))

				function sendDay(day) {	// function for out some day
					if (!day) {
						response = '';
						return bot.sendMessage(msg.chat.id, 'У тебя выходной, расслабься');
					}

					let types = ['Лек', 'Практ', 'Лаб'];
					response += `---${day.weekday}---\n`;
					
					for (num in day.subjects) {
						let subject = day.subjects[num],
							teacher = subject.teachers[0] ? `${subject.teachers[0].short_name}` : '',
							room = subject.rooms[0] ? subject.rooms[0].name : '',
							building = subject.rooms[0] ? subject.rooms[0].building.name : '',
							place = room ? `  ${room}-${building}\n` : '',
							type = types[subject.type] ? types[subject.type] : '';
						response += `${num}. ${subject.discipline.name} ${type}\n${teacher}${place}`		
					};
					response += '\n'
				}
			})

			if (response) bot.sendMessage(msg.chat.id, response);
		}
	})
	.catch(e => console.log(e));
}