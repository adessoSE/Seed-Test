import { Cipher, Decipher, scryptSync, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
const mongo = require('../src/database/DbServices');
const cryptoAlgorithm = 'aes-256-ccm';
const key = scryptSync(process.env.JIRA_SECRET, process.env.JIRA_SALT, 32);


function jiraEncryptPassword(pass: string): Buffer[] {
    const nonce = randomBytes(13);
    const cipher = createCipheriv(cryptoAlgorithm, key, nonce, { authTagLength: 16 });
    const ciphertext = cipher.update(pass, 'utf8');
    cipher.final();
    const tag = cipher.getAuthTag();

    return [ciphertext, nonce, tag];
}

function jiraDecryptPassword(ciphertext: Buffer, nonce: Buffer, tag: Buffer): string {
    nonce = nonce ? nonce : Buffer.alloc(13, 0);
    try {
        const decipher = createDecipheriv(cryptoAlgorithm, key, nonce, { authTagLength: 16 });
        decipher.setAuthTag(tag);
        console.log("ciphertext", ciphertext);
        const receivedPlaintext = decipher.update(ciphertext, null, 'utf8');
        decipher.final();
        return receivedPlaintext;
    } catch (err) {
        console.log("Authentication Failed");// leaf in or replace with proper logging
        throw new Error('Authentication failed!');
    }
}

async function updateJiraCredential(UserID: string, username: string, jiraClearPassword: string, host: string) {
    const [password, nonce, tag] = jiraEncryptPassword(jiraClearPassword);
    const jira = {
        AccountName: username,
        Password: password,
        Password_Nonce: nonce,
        Password_Tag: tag,
        Host: host
    };
    const user = await mongo.getUserData(UserID);
    user.jira = jira;
    await mongo.updateUser(UserID, user);
}

module.exports = {
    jiraDecryptPassword,
    jiraEncryptPassword,
    updateJiraCredential
};
