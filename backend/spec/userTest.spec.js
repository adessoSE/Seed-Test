import * as userHelper from "../dist/helpers/userManagement.js";
import { config as config$0 } from "dotenv";
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = path.resolve(__dirname, './support/.env');
console.log(config);
({ config: config$0 }.config());
describe('Encrypt&Decrypt jira', () => {
    it('correctly encrypts and decrypts password', () => {
        process.env.JIRA_SECRET = 'abcdef';
        process.env.JIRA_SALT = 'ghjkllö';
        const [ciphertext, nonce, tag] = userHelper.jiraEncryptPassword('myPassword');
        expect(userHelper.jiraDecryptPassword(ciphertext, nonce, tag)).toBe('myPassword');
    });
});
