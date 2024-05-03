function stepDefs() {
	return [{
		id: 10,
		type: 'Go To Website / URL',
		pre: 'I go to the website:',
		mid: '',
		values: ['']
	},
	{
		id: 20,
		type: 'Textfield',
		pre: 'I insert',
		mid: 'into the field ',
		values: ['', '']
	}, {
		id: 30,
		type: 'Button',
		pre: 'I click the button:',
		mid: '',
		values: ['']
	},
	{
		id: 40,
		type: 'Screenshot',
		pre: 'I take a screenshot. Optionally: Focus the page on the element',
		mid: '',
		values: [
			''
		]
	},
	{
		id: 50,
		type: 'Wait',
		pre: 'The site should wait for',
		mid: 'milliseconds',
		values: [
			''
		]
	},
	{
		id: 60,
		type: 'Correct Website / URL',
		pre: 'So I will be navigated to the website:',
		mid: '',
		values: [
			''
		]
	},
	{
		id: 70,
		type: 'Check Text on Page',
		pre: 'So I can see the text:',
		mid: '',
		values: [
			''
		]
	},
	{
		id: 80,
		type: 'Text in Textbox',
		pre: 'So I can see the text',
		mid: 'in the textbox: ',
		values: [
			'',
			''
		]
	},
	{
		id: 90,
		type: 'Hover Over & Select',
		pre: 'I hover over the element',
		mid: 'and select the option',
		values: [
			'',
			''
		]
	},
	{
		id: 100,
		type: 'Checkbox',
		pre: 'I check the box',
		mid: '',
		values: [
			''
		]
	},
	{
		id: 110,
		type: 'Dropdown Menu',
		pre: 'I select the option',
		mid: 'from the drop-down-menue ',
		values: [
			'',
			''
		]
	},
	{
		id: 120,
		type: 'Radio-Selection',
		pre: 'I select',
		mid: 'from the selection ',
		values: [
			'',
			''
		]
	},
	{
		id: 130,
		type: 'Text Not on Page',
		pre: 'So I can\'t see the text:',
		mid: '',
		values: [
			''
		]
	},
	{
		id: 140,
		type: 'Empty Textbox',
		pre: 'So I can\'t see text in the textbox:',
		values: [
			''
		],
		mid: ''
	},
	{
		id: 150,
		type: 'Then checkbox',
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
		id: 160,
		type: 'Switch to newest Tab',
		pre: 'Switch to the newly opened tab',
		mid: '',
		values: []
	},
	{
		id: 170,
		type: 'Select Dropdown Item directly (XPath)',
		pre: 'I select the option',
		mid: '',
		values: [
			''
		]
	},
	{
		id: 180,
		type: 'Check Image Name',
		pre: 'So the image',
		mid: 'has the name ',
		values: [
			'',
			''
		]
	},
	{
		id: 190,
		type: 'Add Cookie',
		mid: 'and value ',
		pre: 'I add a cookie with the name',
		values: [
			'',
			''
		],

	},
	{
		id: 200,
		type: 'Remove Cookie',
		mid: '',
		pre: 'I remove a cookie with the name',
		values: [
			''
		],
	},
	{
		id: 210,
		type: 'Upload File',
		pre: 'I want to upload the file from this path:',
		mid: 'into this uploadfield: ',
		values: [
			'',
			''
		]
	},
	{
		id: 220,
		type: 'Switch to Tab Nr. X',
		pre: 'Switch to the tab number',
		mid: '',
		values: [
			''
		]
	},
	{
		id: 230,
		type: 'Add Session-Storage',
		mid: 'and value ',
		pre: 'I add a session-storage with the name',
		values: [
			'',
			''
		],
	},
	{
		id: 240,
		type: 'Remove Session-Storage',
		mid: '',
		pre: 'I remove a session-storage with the name',
		values: [
			''
		],
	},
	{
		id: 250,
		type: 'Check Tooltip',
		pre: 'So the element',
		mid: 'has the tooltip ',
		values: [
			'',
			''
		]
	},
	{
		id: 260,
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
		id: 270,
		type: 'Validate Downloaded File',
		pre: 'So a file with the name',
		mid: 'is downloaded in this Directory ',
		values: [
			'',
			''
		]
	},
	{
		id: 280,
		type: 'New Step',
		pre: 'Recommended Title:',
		mid: '',
		values: [
			''
		]
	},
	{
		id: 290,
		type: 'TestStep',
		pre: 'Recommended Title:',
		mid: '',
		values: [
			''
		]
	}, {
		id: 500,
		type: 'New Step',
		pre: 'Recommended Title:',
		mid: '',
		values: [
			''
		]
	},
	];
}

module.exports = stepDefs;
