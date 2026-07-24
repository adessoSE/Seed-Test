import moment from 'moment';

/**
 * Applies special date commands found within a string.
 * Commands like @@Date, @@Day+@@1,Month etc. are replaced with formatted dates.
 * It searches for the patterns and replaces them using the calcDate logic.
 * @param str The input string possibly containing date commands.
 * @returns The string with resolved date commands.
 */
export function applySpecialCommands(str: string): string {
	// Regex to find potential date command patterns
	const pattern = /(((((@@(Day|Month|Year),(\d\d?\d?\d?))+)|(@@((\d|\d\d),)?[a-zA-Z]+))((\+|-)(@@((\d|\d\d),)?[a-zA-Z]+))+)|(((@@(Day|Month|Year),(\d\d?\d?\d?))+)|(@@((\d|\d\d),)?[a-zA-Z]+)))(@@format:.*€€)?/g;
    
	// Replace each found match using the original calcDate logic
	return str.replace(pattern, (match) => calcDate(match));
}


/**
 * Calculates a date based on a specific command string format.
 * This function preserves the logic from the original serverHelper.js.
 * @param value The date command string (e.g., "@@Date+@@2,Day@@format:YYYY-MM-DD€€").
 * @returns The calculated and formatted date string.
 */
function calcDate(value: string): string {
	// Original Regex patterns from serverHelper.js
	const mid_regex = /(^((\+|-)@@(\d+),(Day|Month|Year))*)|(^\s*$)/;
	const end_regex = /(^(@@format:\w*€€)*)|(^\s*$)/;

	// Helper to find the start part (before calculations or format)
	function getStart(str: string): string {
		let endIndex = str.length;
		const symbols = ['+', '-', '@@format'];
		symbols.forEach((symbol) => {
			const symbolIndex = str.indexOf(symbol);
			if (symbolIndex !== -1 && symbolIndex < endIndex) endIndex = symbolIndex;
		});
		return str.substring(0, endIndex);
	}

	// Helper to find the middle part (calculations)
	function getMid(str: string): string {
		let endIndex = str.length;
		const symbols = ['@@format'];
		symbols.forEach((symbol) => {
			const symbolIndex = str.indexOf(symbol);
			if (symbolIndex !== -1 && symbolIndex < endIndex) endIndex = symbolIndex;
		});
		return str.substring(0, endIndex);
	}

	const start = getStart(value).replace(/\s/g, ''); // Remove spaces
	const mid = getMid(value.replace(start, '')).replace(/\s/g, ''); // Remove spaces
	const end = value.replace(start, '').replace(mid, '').trim(); // Format part

	// --- Validation (kept from original logic) ---
	const dates = start.split(/@@Date/);
	const substrings = [/@@Day,\d{1,2}|@@Day/, /@@Month,\d{1,2}|@@Month/, /@@Year,\d{4}|@@Year/];
	const substringsErr = ['@@Day', '@@Month', '@@Year'];
	if (dates.length > 1) { // @@Date used
		if (dates.length - 1 > 1) throw new Error('@@Date should only be used once.');
		substrings.forEach((sub, i) => {
			if (sub.test(start)) throw new Error(`@@Date should only be used by itself. Found: ${substringsErr[i]}`);
		});
	} else { // Check @@Day, @@Month, @@Year usage
		let startcopy = start;
		substrings.forEach((sub, i) => {
			if ((start.split(sub).length - 1) > 1) throw new Error(`${substringsErr[i]} may only be used 0 or 1 time. Input: ${start}`);
			startcopy = startcopy.replace(sub, '');
		});
		// Original check allowed unknown tokens, preserving that:
		// if (startcopy.length !== 0) throw Error(`Unknown tokens in the start section: ${startcopy}`);
	}
	if (!mid_regex.test(mid)) throw new Error(`Error parsing the calculation section. Example: +@@23,Day-@@Month,1 Found: ${mid}`);
	if (!end_regex.test(end)) throw new Error(`Error parsing the format section. Example: @@format:XXXXXX€€. Found: ${end}`);
	// --- End Validation ---

	// --- Date Calculation (kept from original logic) ---
	const formatMatch = value.match(/@@format:(.*)€€/);
	let format: string;

	const currDate = moment(); // Use moment for easier date manipulation

	// Set initial date based on start part
	const dayMatch = start.match(/@@Day,(\d{1,2})/);
	const monthMatch = start.match(/@@Month,(\d{1,2})/);
	const yearMatch = start.match(/@@Year,(\d{4})/);

	if (!start.includes('@@Date')) { // Only set specific parts if @@Date is NOT used
		if (yearMatch) currDate.year(parseInt(yearMatch[1], 10));
		if (monthMatch) currDate.month(parseInt(monthMatch[1], 10) - 1); // Moment months are 0-indexed
		if (dayMatch) currDate.date(parseInt(dayMatch[1], 10));
	}


	// Apply calculations from the middle part
	const adds: string [] = mid.match(/\+@@(\d+),(Day|Month|Year)/g) || [];
	const subs: string [] = mid.match(/-@@(\d+),(Day|Month|Year)/g) || [];

	adds.forEach(add => {
		const [, num, unit] = add.match(/\+@@(\d+),(Day|Month|Year)/)!;
		currDate.add(parseInt(num, 10), unit.toLowerCase() as moment.unitOfTime.DurationConstructor);
	});

	subs.forEach(sub => {
		const [, num, unit] = sub.match(/-@@(\d+),(Day|Month|Year)/)!;
		currDate.subtract(parseInt(num, 10), unit.toLowerCase() as moment.unitOfTime.DurationConstructor);
	});

	// Determine format
	if (formatMatch) 
		format = formatMatch[1];
	else {
		format = start.replace(/@@Day(,\d{1,2})?/, 'DD.')
			.replace(/@@Month(,\d{1,2})?/, 'MM.')
			.replace(/@@Year(,\d{4})?/, 'YYYY.')
			.replace('@@Date', 'DD.MM.YYYY.')
			.replace(/(\.)$/, ''); // remove trailing dot if exists
		if (!format) format = 'DD.MM.YYYY'; // Default if only calculations were present
	}
	// --- End Date Calculation ---

	return currDate.format(format);
}