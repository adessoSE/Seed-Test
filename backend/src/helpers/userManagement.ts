import { Cipher, Decipher, scryptSync, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
const passport = require('passport');

const mongo = require('../../src/database/DbServices');
const cryptoAlgorithm = 'aes-256-ccm';
const key = scryptSync(process.env.JIRA_SECRET || "anotherUnsaveSecret", process.env.JIRA_SALT || "9bNyV23AbaC7", 32);


function jiraEncryptPassword(pass: string): Buffer[] {
    const nonce = randomBytes(13);
    const cipher = createCipheriv(cryptoAlgorithm, key, nonce, { authTagLength: 16 });
    const ciphertext = cipher.update(pass, 'utf8');
    cipher.final();
    const tag = cipher.getAuthTag();

    return [ciphertext, nonce, tag];
}

function jiraDecryptPassword(ciphertext: Buffer, nonce: Buffer, tag: Buffer): string {
    nonce = nonce ? Buffer.from(nonce.buffer) : Buffer.alloc(13, 0);
    try {
        const decipher = createDecipheriv(cryptoAlgorithm, key, nonce, { authTagLength: 16 });
        decipher.setAuthTag(Buffer.from(tag.buffer));
        console.log("ciphertext", ciphertext);
        const receivedPlaintext = decipher.update(Buffer.from(ciphertext.buffer), null, 'utf8');
        decipher.final();
        return receivedPlaintext;
    } catch (err) {
        console.log(`Authentication Failed: ${err}`);// leaf in or replace with proper logging
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

const getGithubData = (res, req, accessToken) => {
	fetch(
		`https://api.github.com/user?access_token=${accessToken}`,
		{
			method: 'GET',
			headers:
			{
				'User-Agent': 'SampleOAuth',
				Authorization: `Token ${accessToken}`
			}
		}
	)
		.then((response) => response.json())
		.then(async (json) => {
			console.log('JSON in GetGitHubData');
			console.log(json);
			req.body = json;
			req.body.githubToken = accessToken;
			try {
				await mongo.findOrRegisterGithub(req.body);
				passport.authenticate('github-local', (error, user) => {
					if (error || !user) res.json({ error: 'Authentication Error' });
					req.logIn(user, (LoginError) => {
						if (LoginError) {
							res.json({ error: 'Login Error' });
						} else {
							res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:4200');
							res.header('Access-Control-Allow-Credentials', 'true');
							res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials');
							res.json({
								login: user.github.login,
								id: user.github.id
							});
						}
					});
				})(req, res);
			} catch (error) {
				console.log('getGithubData error:', error);
				res.sendStatus(400);
			}
		});
};

/*
* validates Github username and reponame
* @param {string} userName
* @param {string} repoName
* @returns boolean, true if they are valid
*/
function checkValidGithub(userName, repoName) {
    const githubUsernameCheck = new RegExp(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i); // https://github.com/shinnn/github-username-regex
    const githubReponameCheck = new RegExp(/^([a-z\d._-]){0,100}$/i);
    return !!(githubUsernameCheck.test(userName.toString()) && githubReponameCheck.test(repoName.toString()));
}

export {
    jiraDecryptPassword,
    jiraEncryptPassword,
    updateJiraCredential,
    checkValidGithub,
    getGithubData
};
