const fetch = require('node-fetch');

const base_url = 'http://localhost:8080/api';

describe('Server', () => {
	describe('GET /api', () => {
		it('returns status code 200', (done) => {
			fetch(base_url)
				.then((response) => {
					expect(response.status).toBe(200);
					done();
				});
		});
	});
	describe('GET /api/stepTypes', () => {
		it('StepTypes match expected output', (done) => {
			const result = [
				{
					_id: '5dce728851e70f2894a170b1',
					id: 1,
					stepType: 'when',
					type: 'Textfield',
					pre: 'I insert',
					mid: 'into the field ',
					values: [
						'',
						''
					]
				},
				{
					_id: '5dce728851e70f2894a170ac',
					id: 0,
					stepType: 'DISABLED_FOR_NOW',
					type: 'Role',
					pre: 'As a',
					mid: '',
					values: [
						''
					],
					selection: [
						'Guest',
						'User'
					]
				},
				{
					_id: '5dce728851e70f2894a170af',
					id: 0,
					stepType: 'when',
					type: 'Go To Website / URL',
					pre: 'I go to the website:',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '5dce728851e70f2894a170b0',
					id: 10,
					stepType: 'when',
					type: 'Button',
					pre: 'I click the button:',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '5df38b4d1c9d440000dd807a',
					id: 500,
					stepType: 'given',
					type: 'New Step',
					pre: 'Recommended Title:',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '5df38bbc1c9d440000dd807b',
					id: 500,
					stepType: 'when',
					type: 'New Step',
					pre: 'Recommended Title:',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '5df38bd61c9d440000dd807c',
					id: 500,
					stepType: 'then',
					type: 'New Step',
					pre: 'Recommended Title:',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '5ef31e3094180545b0a51d1e',
					id: 498,
					stepType: 'when',
					type: 'Wait',
					pre: 'The site should wait for',
					mid: 'milliseconds',
					values: [
						''
					]
				},
				{
					_id: '5ef3235337a8b767ac5f87ad',
					id: 20,
					stepType: 'when',
					type: 'Checkbox',
					pre: 'I check the box',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '5ef9bf4e0fbf442e64632c90',
					id: 0,
					stepType: 'given',
					type: 'Website / URL',
					pre: 'I am on the website:',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '5ef9bf4e0fbf442e64632c95',
					id: 50,
					stepType: 'when',
					type: 'Radio-Selection',
					pre: 'I select',
					mid: 'from the selection ',
					values: [
						'',
						''
					]
				},
				{
					_id: '5ef9bf4e0fbf442e64632c9c',
					id: 3,
					stepType: 'then',
					type: 'Text in Textbox',
					pre: 'So I can see the text',
					mid: 'in the textbox: ',
					values: [
						'',
						''
					]
				},
				{
					_id: '5ef9bf4e0fbf442e64632c9e',
					id: 2,
					stepType: 'then',
					type: 'Text Not on Page',
					pre: 'So I can\'t see the text:',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '5ef9bf4e0fbf442e64632c96',
					id: 30,
					stepType: 'when',
					type: 'Dropdown Menu',
					pre: 'I select the option',
					mid: 'from the drop-down-menue ',
					values: [
						'',
						''
					]
				},
				{
					_id: '5ef9bf4e0fbf442e64632c97',
					id: 40,
					stepType: 'when',
					type: 'Hover Over & Select',
					pre: 'I hover over the element',
					mid: 'and select the option ',
					values: [
						'',
						''
					]
				},
				{
					_id: '5ef9bf4e0fbf442e64632c98',
					id: 0,
					stepType: 'DISABLED_FOR_NOW',
					type: 'ListSelection',
					pre: 'I select from the',
					mid: 'multiple selection, the values ',
					values: [
						'',
						''
					]
				},
				{
					_id: '5ef9bf4e0fbf442e64632c9b',
					id: 0,
					stepType: 'then',
					type: 'Correct Website / URL',
					pre: 'So I will be navigated to the website:',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '5ef9bf4e0fbf442e64632c9d',
					id: 1,
					stepType: 'then',
					type: 'Check Text on Page',
					pre: 'So I can see the text:',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '5ef9bf4e0fbf442e64632c91',
					id: 0,
					stepType: 'example',
					type: 'Add Variable',
					pre: '',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '5f5f560f4715692a7fb5882f',
					id: 397,
					stepType: 'when',
					type: 'Switch to newest Tab',
					pre: 'Switch to the newly opened tab',
					mid: '',
					values: []
				},
				{
					_id: '5f5f56b0f49f02585ca9ff84',
					id: 398,
					stepType: 'when',
					type: 'Switch to Tab Nr. X',
					pre: 'Switch to the tab number',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '5fa27e9b836b50d6cc7ccdc8',
					id: 31,
					stepType: 'when',
					type: 'Select Dropdown Item directly (XPath)',
					pre: 'I select the option',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '6047822c79e1f57a3caa49b8',
					id: 1,
					mid: 'and value ',
					pre: 'I add a cookie with the name',
					stepType: 'given',
					values: [
						'',
						''
					],
					type: 'Add Cookie'
				},
				{
					_id: '60478395d324fb3c5c32a3ae',
					id: 2,
					mid: '',
					pre: 'I remove a cookie with the name',
					stepType: 'given',
					values: [
						''
					],
					type: 'Remove Cookie'
				},
				{
					_id: '6056eeeacedfab4cd4ba214a',
					id: 300,
					stepType: 'when',
					type: 'Upload File',
					pre: 'I want to upload the file from this path:',
					mid: 'into this uploadfield: ',
					values: [
						'',
						''
					]
				},
				{
					_id: '606aa2dacedfab4cd4ba214b',
					id: 20,
					stepType: 'then',
					type: 'Validate Downloaded File',
					pre: 'So a file with the name',
					mid: 'is downloaded in this Directory ',
					values: [
						'',
						''
					]
				},
				{
					_id: '60ac9bee596097c6844d710b',
					id: 0,
					stepType: 'LEGACY',
					type: 'Screenshot',
					pre: 'I take a screenshot',
					mid: '',
					selection: [],
					values: [
						''
					]
				},
				{
					_id: '60ac9bf9596097c6844d710c',
					id: 1,
					stepType: 'LEGACY',
					type: 'Screenshot',
					pre: 'I take a screenshot',
					mid: '',
					values: []
				},
				{
					_id: '60ac9bfe596097c6844d710d',
					id: 2,
					stepType: 'LEGACY',
					type: 'Screenshot',
					pre: 'I take a screenshot',
					mid: '',
					values: []
				},
				{
					_id: '60e4239329442b9124db6882',
					id: 499,
					stepType: 'then',
					type: 'Screenshot',
					pre: 'I take a screenshot. Optionally: Focus the page on the element',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '60e4239329442b9124db6881',
					id: 499,
					stepType: 'when',
					type: 'Screenshot',
					pre: 'I take a screenshot. Optionally: Focus the page on the element',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '60e4239329442b9124db6880',
					id: 499,
					stepType: 'given',
					type: 'Screenshot',
					pre: 'I take a screenshot. Optionally: Focus the page on the element',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '61275b15760e256d5e8a9ad7',
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
					_id: '60acc98d261ee734a08190c1',
					id: 3,
					stepType: 'then',
					type: 'Empty Textbox',
					pre: 'So I can\'t see text in the textbox:',
					values: [
						''
					],
					mid: ''
				},
				{
					_id: '6329b02283c1a0e45acdbd0d',
					id: 498,
					stepType: 'given',
					type: 'TestStep',
					pre: 'Recommended Title:',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '634d3a3e127a7c3741e248cf',
					id: 11,
					stepType: 'given',
					type: 'Button',
					pre: 'I click the button:',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '634d4597127a7c3741e248d0',
					id: 15,
					stepType: 'given',
					type: 'Textfield',
					pre: 'I insert',
					mid: 'into the field ',
					values: [
						'',
						''
					]
				},
				{
					_id: '634d464a127a7c3741e248d1',
					id: 16,
					stepType: 'given',
					type: 'Checkbox',
					pre: 'I check the box',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '634d46cc127a7c3741e248d2',
					id: 31,
					stepType: 'given',
					type: 'Dropdown Menu',
					pre: 'I select the option',
					mid: 'from the drop-down-menue ',
					values: [
						'',
						''
					]
				},
				{
					_id: '634d4787127a7c3741e248d3',
					id: 33,
					stepType: 'given',
					type: 'Select Dropdown Item directly (XPath)',
					pre: 'I select the option',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '634d4800127a7c3741e248d4',
					id: 41,
					stepType: 'given',
					type: 'Hover Over & Select',
					pre: 'I hover over the element',
					mid: 'and select the option ',
					values: [
						'',
						''
					]
				},
				{
					_id: '634d4968127a7c3741e248d5',
					id: 55,
					stepType: 'given',
					type: 'Radio-Selection',
					pre: 'I select',
					mid: 'from the selection ',
					values: [
						'',
						''
					]
				},
				{
					_id: '634d49c8127a7c3741e248d6',
					id: 301,
					stepType: 'given',
					type: 'Upload File',
					pre: 'I want to upload the file from this path:',
					mid: 'into this uploadfield: ',
					values: [
						'',
						''
					]
				},
				{
					_id: '634d4a48127a7c3741e248d7',
					id: 398,
					stepType: 'given',
					type: 'Switch to newest Tab',
					pre: 'Switch to the newly opened tab',
					mid: '',
					values: []
				},
				{
					_id: '634d4acf127a7c3741e248d8',
					id: 399,
					stepType: 'given',
					type: 'Switch to Tab Nr. X',
					pre: 'Switch to the tab number',
					mid: '',
					values: [
						''
					]
				},
				{
					_id: '634d4c05127a7c3741e248d9',
					id: 498,
					stepType: 'given',
					type: 'Wait',
					pre: 'The site should wait for',
					mid: 'milliseconds',
					values: [
						''
					]
				}
			];

			fetch(`${base_url}/stepTypes`)
				.then((response) => {
					expect(response.status).toBe(200);
					return response.json();
				})
				.then((body) => { // when test timeout something doesn't match
					for (const step of result) expect(body).toContainEqual(step);
					done();
				})
				.catch((err) => console.error(err));
		});
	});
});
