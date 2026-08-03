import { format, addDays, addMonths, addYears, subDays, subMonths, subYears, setDate, setMonth, setYear } from 'date-fns';

/**
 * Converts moment.js format tokens to date-fns equivalents.
 * Only day (D→d) and year (Y→y) case differs; month (M) is the same in both.
 * Needed because existing user test data may contain moment-style format strings.
 */
function momentToDateFnsFormat(fmt: string): string {
	return fmt
		.replace(/YYYY/g, 'yyyy')
		.replace(/(?<!Y)YY(?!Y)/g, 'yy')
		.replace(/(?<!Y)Y(?!Y)/g, 'y')
		.replace(/DD/g, 'dd')
		.replace(/(?<!D|d)D(?!D)/g, 'd');
}

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
	// Validation patterns — must match the ENTIRE mid/end section, or be empty
	// Fixed: original used * quantifier which matched empty string at ^, bypassing validation entirely
	const mid_regex = /^((\+|-)@@(\d+),(Day|Month|Year))+$|^\s*$/;
	const end_regex = /^@@format:[^€]*€€$|^\s*$/;

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
	}
	if (!mid_regex.test(mid)) throw new Error(`Error parsing the calculation section. Example: +@@23,Day-@@Month,1 Found: ${mid}`);
	if (!end_regex.test(end)) throw new Error(`Error parsing the format section. Example: @@format:XXXXXX€€. Found: ${end}`);
	// --- End Validation ---

	// --- Date Calculation (kept from original logic) ---
	const formatMatch = value.match(/@@format:(.*)€€/);

	let currDate = new Date();

	// Set initial date based on start part
	const dayMatch = start.match(/@@Day,(\d{1,2})/);
	const monthMatch = start.match(/@@Month,(\d{1,2})/);
	const yearMatch = start.match(/@@Year,(\d{4})/);

	if (!start.includes('@@Date')) { // Only set specific parts if @@Date is NOT used
		if (yearMatch) currDate = setYear(currDate, parseInt(yearMatch[1], 10));
		// date-fns setMonth is 0-indexed, same as the original moment logic
		if (monthMatch) currDate = setMonth(currDate, parseInt(monthMatch[1], 10) - 1);
		if (dayMatch) currDate = setDate(currDate, parseInt(dayMatch[1], 10));
	}


	// Apply calculations from the middle part
	const adds: string [] = mid.match(/\+@@(\d+),(Day|Month|Year)/g) ?? [];
	const subs: string [] = mid.match(/-@@(\d+),(Day|Month|Year)/g) ?? [];

	adds.forEach(add => {
		const [, num, unit] = add.match(/\+@@(\d+),(Day|Month|Year)/)!;
		const n = parseInt(num, 10);
		switch (unit) {
			case 'Day': currDate = addDays(currDate, n); break;
			case 'Month': currDate = addMonths(currDate, n); break;
			case 'Year': currDate = addYears(currDate, n); break;
		}
	});

	subs.forEach(sub => {
		const [, num, unit] = sub.match(/-@@(\d+),(Day|Month|Year)/)!;
		const n = parseInt(num, 10);
		switch (unit) {
			case 'Day': currDate = subDays(currDate, n); break;
			case 'Month': currDate = subMonths(currDate, n); break;
			case 'Year': currDate = subYears(currDate, n); break;
		}
	});

	// Determine format string
	let dateFormat: string;
	if (formatMatch)
		// User-supplied format — convert from moment.js tokens to date-fns tokens
		dateFormat = momentToDateFnsFormat(formatMatch[1]);
	else {
		// Build default format from template tokens (already in date-fns convention)
		dateFormat = start.replace(/@@Day(,\d{1,2})?/, 'dd.')
			.replace(/@@Month(,\d{1,2})?/, 'MM.')
			.replace(/@@Year(,\d{4})?/, 'yyyy.')
			.replace('@@Date', 'dd.MM.yyyy.')
			.replace(/(\.)$/, ''); // remove trailing dot if exists
		if (!dateFormat) dateFormat = 'dd.MM.yyyy'; // Default if only calculations were present
	}
	// --- End Date Calculation ---

	// Always convert format tokens — handles both user-supplied moment-style and edge cases
	return format(currDate, momentToDateFnsFormat(dateFormat));
}
