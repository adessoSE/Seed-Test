const path = require('path');
const userHelper = require('../helpers/userManagement');

const config = path.resolve(__dirname, './support/.env');
console.log(config);
require('dotenv').config();

describe('Encrypt&Decrypt jira', () => {
	it('correctly encrypts and decrypts password', () => {
		process.env.JIRA_SECRET = 'abcdef';
		process.env.JIRA_SALT = 'ghjkllö';
		const [ciphertext, nonce, tag] = userHelper.jiraEncryptPassword('myPassword');
		expect(userHelper.jiraDecryptPassword(ciphertext, nonce, tag)).toBe('myPassword');
	});
});
