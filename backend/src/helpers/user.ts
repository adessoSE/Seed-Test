import { Cipher, Decipher, scryptSync, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
enum Sources{
    GITHUB = "github",
    JIRA = "jira",
    DB = "db"
}

class Group{
    _id: string
    name: string
    member_stories: Array<string>
    isSequential: boolean
}

class Repository{
    _id: string
    owner: string
    gitOwner: string
    stories: Array<string>
    repoType: Enumerator<Sources>
    customBlocks: Array<string>
    groups: Array<Group>
}

const cryptoAlgorithm = 'aes-256-ccm';
const key = scryptSync(process.env.JIRA_SECRET, process.env.JIRA_SALT, 32);


function jiraEncryptPassword(pass: string):Buffer[]{
    const nonce = randomBytes(13);
    const cipher = createCipheriv(cryptoAlgorithm, key, nonce, { authTagLength: 16 });
    const ciphertext = cipher.update(pass, 'utf8');
    cipher.final();
    const tag = cipher.getAuthTag();

    return [ciphertext, nonce, tag];
}

function jiraDecryptPassword(ciphertext:Buffer, nonce:Buffer, tag:Buffer): string {
    nonce = nonce? nonce: Buffer.alloc(13, 0);
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

module.exports = {
    jiraDecryptPassword,
    jiraEncryptPassword
};
