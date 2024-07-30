function stepDefs() {
	return [{
		id: 0,
		stepType: 'when',
		type: 'Go To Website / URL',
		pre: 'I go to the website:',
		mid: '',
		values: ['']
	}, {
		id: 10,
		stepType: 'when',
		type: 'Button',
		pre: 'I click the button:',
		mid: '',
		values: ['']
	}, {
		id: 1,
		stepType: 'when',
		type: 'Textfield',
		pre: 'I insert',
		mid: 'into the field ',
		values: ['', '']
	}, {
		id: 500,
		stepType: 'given',
		type: 'New Step',
		pre: 'Recommended Title:',
		mid: '',
		values: [
			''
		]
	}, {
		id: 500,
		stepType: 'when',
		type: 'New Step',
		pre: 'Recommended Title:',
		mid: '',
		values: [
			''
		]
	}, {
		id: 500,
		stepType: 'then',
		type: 'New Step',
		pre: 'Recommended Title:',
		mid: '',
		values: [
			''
		]
	}, {
		id: 498,
		stepType: 'when',
		type: 'Wait',
		pre: 'The site should wait for',
		mid: 'milliseconds',
		values: [
			''
		]
	}, {
		id: 20,
		stepType: 'when',
		type: 'Checkbox',
		pre: 'I check the box',
		mid: '',
		values: [
			''
		]
	}, {
		id: 0,
		stepType: 'given',
		type: 'Website / URL',
		pre: 'I am on the website:',
		mid: '',
		values: [
			''
		]
	}, {
		id: 0,
		stepType: 'example',
		type: 'Add Variable',
		pre: '',
		mid: '',
		values: [
			''
		]
	}, {
		id: 50,
		stepType: 'when',
		type: 'Radio-Selection',
		pre: 'I select',
		mid: 'from the selection ',
		values: [
			'',
			''
		]
	}, {
		id: 30,
		stepType: 'when',
		type: 'Dropdown Menu',
		pre: 'I select the option',
		mid: 'from the drop-down-menue ',
		values: [
			'',
			''
		]
	}, {
		id: 40,
		stepType: 'when',
		type: 'Hover Over & Select',
		pre: 'I hover over the element',
		mid: 'and select the option',
		values: [
			'',
			''
		]
	}, {
		id: 0,
		stepType: 'then',
		type: 'Correct Website / URL',
		pre: 'So I will be navigated to the website:',
		mid: '',
		values: [
			''
		]
	}, {
		id: 3,
		stepType: 'then',
		type: 'Text in Textbox',
		pre: 'So I can see the text',
		mid: 'in the textbox: ',
		values: [
			'',
			''
		]
	}, {
		id: 1,
		stepType: 'then',
		type: 'Check Text on Page',
		pre: 'So I can see the text:',
		mid: '',
		values: [
			''
		]
	}, {
		id: 2,
		stepType: 'then',
		type: 'Text Not on Page',
		pre: 'So I can\'t see the text:',
		mid: '',
		values: [
			''
		]
	}, {
		id: 397,
		stepType: 'when',
		type: 'Switch to newest Tab',
		pre: 'Switch to the newly opened tab',
		mid: '',
		values: []
	}, {
		id: 398,
		stepType: 'when',
		type: 'Switch to Tab Nr. X',
		pre: 'Switch to the tab number',
		mid: '',
		values: [
			''
		]
	}, {
		id: 31,
		stepType: 'when',
		type: 'Select Dropdown Item directly (XPath)',
		pre: 'I select the option',
		mid: '',
		values: [
			''
		]
	}, {
		id: 1,
		mid: 'and value ',
		pre: 'I add a cookie with the name',
		stepType: 'given',
		values: [
			'',
			''
		],
		type: 'Add Cookie'
	}, {
		id: 2,
		mid: '',
		pre: 'I remove a cookie with the name',
		stepType: 'given',
		values: [
			''
		],
		type: 'Remove Cookie'
	}, {
		id: 3,
		mid: 'and value ',
		pre: 'I add a session-storage with the name',
		stepType: 'given',
		values: [
			'',
			''
		],
		type: 'Add Session-Storage'
	}, {
		id: 4,
		mid: '',
		pre: 'I remove a session-storage with the name',
		stepType: 'given',
		values: [
			''
		],
		type: 'Remove Session-Storage'
	}, {
		id: 300,
		stepType: 'when',
		type: 'Upload File',
		pre: 'I want to upload the file from this path:',
		mid: 'into this uploadfield: ',
		values: [
			'',
			''
		]
	}, {
		id: 20,
		stepType: 'then',
		type: 'Validate Downloaded File',
		pre: 'So a file with the name',
		mid: 'is downloaded in this Directory ',
		values: [
			'',
			''
		]
	}, {
		id: 0,
		stepType: 'LEGACY',
		type: 'Screenshot',
		pre: 'I take a screenshot',
		mid: '',
		selection: [],
		values: [
			''
		]
	}, {
		id: 1,
		stepType: 'LEGACY',
		type: 'Screenshot',
		pre: 'I take a screenshot',
		mid: '',
		values: []
	}, {
		id: 2,
		stepType: 'LEGACY',
		type: 'Screenshot',
		pre: 'I take a screenshot',
		mid: '',
		values: []
	}, {
		id: 499,
		stepType: 'given',
		type: 'Screenshot',
		pre: 'I take a screenshot. Optionally: Focus the page on the element',
		mid: '',
		values: [
			''
		]
	}, {
		id: 499,
		stepType: 'when',
		type: 'Screenshot',
		pre: 'I take a screenshot. Optionally: Focus the page on the element',
		mid: '',
		values: [
			''
		]
	}, {
		id: 499,
		stepType: 'then',
		type: 'Screenshot',
		pre: 'I take a screenshot. Optionally: Focus the page on the element',
		mid: '',
		values: [
			''
		]
	}, {
		id: 10,
		stepType: 'then',
		type: 'Checkbox',
		pre: 'So the checkbox',
		mid: 'is set to ',
		post: '[true OR false]',
		values: [
			'',
			''
		],
		selection: [
			'checked',
			'unchecked'
		],
		selectionValue: 1
	},
	{
		id: 20,
		stepType: 'then',
		type: 'Check Tooltip',
		pre: 'So the element',
		mid: 'has the tooltip ',
		values: [
			'',
			''
		]
	},
	{
		id: 31,
		stepType: 'then',
		type: 'CSS-Property',
		pre: 'So on element',
		mid: 'the css property ',
		post: 'is',
		values: [
			'',
			'',
			''
		]
	},
	{
		id: 40,
		stepType: 'then',
		type: 'Check Image Name',
		pre: 'So the image',
		mid: 'has the name ',
		values: [
			'',
			''
		]
	},
	{
		id: 3,
		stepType: 'then',
		type: 'Empty Textbox',
		pre: 'So I can\'t see text in the textbox:',
		values: [
			''
		],
		mid: ''
	}, {
		id: 500,
		stepType: 'given',
		type: 'TestStep',
		pre: 'Recommended Title:',
		mid: '',
		values: [
			''
		]
	}, {
		id: 11,
		stepType: 'given',
		type: 'Button',
		pre: 'I click the button:',
		mid: '',
		values: [
			''
		]
	}, {
		id: 15,
		stepType: 'given',
		type: 'Textfield',
		pre: 'I insert',
		mid: 'into the field ',
		values: [
			'',
			''
		]
	}, {
		id: 16,
		stepType: 'given',
		type: 'Checkbox',
		pre: 'I check the box',
		mid: '',
		values: [
			''
		]
	}, {
		id: 31,
		stepType: 'given',
		type: 'Dropdown Menu',
		pre: 'I select the option',
		mid: 'from the drop-down-menue ',
		values: [
			'',
			''
		]
	}, {
		id: 33,
		stepType: 'given',
		type: 'Select Dropdown Item directly (XPath)',
		pre: 'I select the option',
		mid: '',
		values: [
			''
		]
	}, {
		id: 41,
		stepType: 'given',
		type: 'Hover Over & Select',
		pre: 'I hover over the element',
		mid: 'and select the option ',
		values: [
			'',
			''
		]
	}, {
		id: 55,
		stepType: 'given',
		type: 'Radio-Selection',
		pre: 'I select',
		mid: 'from the selection ',
		values: [
			'',
			''
		]
	}, {
		id: 301,
		stepType: 'given',
		type: 'Upload File',
		pre: 'I want to upload the file from this path:',
		mid: 'into this uploadfield: ',
		values: [
			'',
			''
		]
	}, {
		id: 398,
		stepType: 'given',
		type: 'Switch to newest Tab',
		pre: 'Switch to the newly opened tab',
		mid: '',
		values: []
	}, {
		id: 399,
		stepType: 'given',
		type: 'Switch to Tab Nr. X',
		pre: 'Switch to the tab number',
		mid: '',
		values: [
			''
		]
	}, {
		id: 501,
		stepType: 'given',
		type: 'Wait',
		pre: 'The site should wait for',
		mid: 'milliseconds',
		values: [
			''
		]
	}
	];
}

module.exports = stepDefs;
