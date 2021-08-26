function stepDefs() {
	return [{
		id: 0,
		stepType: 'example',
		type: 'Add Variable',
		pre: '',
		mid: '',
		values: ['']
	}, {

		id: 0,
		stepType: 'when',
		type: 'HoverOverAndSelect',
		pre: 'I hover over the element',
		mid: 'and select the option ',
		values: ['', '']
	}, {
		id: 0,
		stepType: 'given',
		type: 'Website',
		pre: 'I am on the website:',
		mid: '',
		values: ['']
	}, {
		id: 0,
		stepType: 'when',
		type: 'Website',
		pre: 'I go to the website:',
		mid: '',
		values: ['']
	}, {
		id: 0,
		stepType: 'when',
		type: 'Button',
		pre: 'I click the button:',
		mid: '',
		values: ['']
	}, {
		id: 0,
		stepType: 'when',
		type: 'Textfield',
		pre: 'I insert',
		mid: 'into the field ',
		values: ['', '']
	}, {
		id: 0,
		stepType: 'then',
		type: 'Website',
		pre: 'So I will be navigated to the website:',
		mid: '',
		values: ['']
	}, {
		id: 0,
		stepType: 'when',
		type: 'Radio',
		pre: 'I select',
		mid: 'from the selection ',
		values: ['', '']
	}, {
		id: 0,
		stepType: 'when',
		type: 'ListSelection',
		pre: 'I select from the',
		mid: 'multiple selection, the values ',
		values: ['', '', '', '']
	}, {
		id: 0,
		stepType: 'given',
		type: 'Role',
		pre: 'As a',
		mid: '',
		values: ['']
	}, {
		id: 0,
		stepType: 'then',
		type: 'Textbox',
		pre: 'So I can see the text',
		mid: 'in the textbox: ',
		values: ['', '']
	}, {
		id: 0,
		stepType: 'when',
		type: 'Dropdown',
		pre: 'I select the option',
		mid: 'from the drop-down-menue ',
		values: ['', '']
	}, {
		id: 0,
		stepType: 'when',
		type: 'Dropdown via Xpath',
		pre: 'I select the option',
		mid: '',
		values: ['']
	}, {
		id: 0,
		stepType: 'then',
		type: 'Not this Text',
		pre: 'So I can\'t see the text:',
		mid: '',
		values: ['']
	}, {
		id: 0,
		stepType: 'given',
		type: 'New Step',
		pre: 'Recommended Title:',
		mid: '',
		values: ['']
	}, {
		id: 0,
		stepType: 'when',
		type: 'New Step',
		pre: 'Recommended Title:',
		mid: '',
		values: ['']
	}, {
		id: 0,
		stepType: 'then',
		type: 'New Step',
		pre: 'Recommended Title:',
		mid: '',
		values: ['']
	}, {
		id: 0,
		stepType: 'then',
		type: 'This Text',
		pre: 'So I can see the text:',
		mid: '',
		values: ['']
	}, {
		id: '0',
		stepType: 'when',
		type: 'Wait',
		pre: 'The site should wait for',
		mid: 'milliseconds',
		values: ['']
	}, {
		id: '0',
		stepType: 'then',
		type: 'Empty Textbox',
		pre: 'So I can see the text in the textbox:',
		mid: '',
		values: ['']
	}, {
		id: '0',
		stepType: 'then',
		type: 'Validate downloaded File',
		pre: 'So a file with the name',
		mid: 'is downloaded in this Directory',
		values: ['', '']
	},
	{
		id: '',
		stepType: 'when',
		type: 'Checkbox',
		pre: 'I check the box',
		mid: '',
		values: ['']
	},
	{
		// TODO: delete this following step (also in DB), once every branch has the changes
		id: '0',
		stepType: 'when',
		type: 'Switch Tab',
		pre: 'I switch to the next tab',
		mid: '',
		values: []
	},
	{
		id: '',
		stepType: 'when',
		type: 'Switch to newest Tab',
		pre: 'Switch to the newly opened tab',
		mid: '',
		values: []
	},
	{
		id: '',
		stepType: 'when',
		type: 'Switch to Tab Nr. X',
		pre: 'Switch to the tab number',
		mid: '',
		values: ['']
	},
	{
		id: '',
		stepType: 'given',
		type: 'Add Cookie',
		pre: 'I add a cookie with the name',
		mid: 'and value ',
		values: ['', '']
	},
	{
		id: '',
		stepType: 'given',
		type: 'Remove Cookie',
		pre: 'I remove a cookie with the name',
		mid: '',
		values: ['']
	},
	{
		id: '',
		stepType: 'when',
		type: 'Upload a file',
		pre: 'I want to upload the file from this path:',
		mid: 'into this uploadfield: ',
		values: ['', '']
	},
	{
		id: 0,
		stepType: 'then',
		type: 'Screenshot',
		pre: 'I take a screenshot (optionally: Focus the page on the element',
		mid: ')',
		values: ['']
	},
	{
		id: 0,
		stepType: 'then',
		type: 'Screenshot',
		pre: 'I take a screenshot (optionally: Focus the page on the element',
		mid: ')',
		values: ['']
	},
	{
		id: 0,
		stepType: 'then',
		type: 'Screenshot',
		pre: 'I take a screenshot (optionally: Focus the page on the element',
		mid: ')',
		values: ['']
	},
	{
		id: 0,
		stepType: 'then',
		type: 'Checkbox',
		pre: 'So the checkbox',
		mid: 'is set to ',
		post: '(true/false)',
		values: ['', '']
	}
	];
}
module.exports = stepDefs;
