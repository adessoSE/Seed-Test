const { log } = require('console');
const nodemailer = require('nodemailer');

async function sendResetLink(email, id) {
	if (process.env.EMAIL_HOST === undefined || process.env.EMAIL_PORT === undefined) {
		log("To send emails please provide a email server and port. You can see how to do it in the README.");
		throw new Error("Bad email config")
	}
	if (process.env.EMAIL_AUTH === undefined || process.env.EMAIL_PW === undefined) {
		log("To send emails please provide a valid email account. You can see how to do it in the README.");
		throw new Error("Bad email config")
	}

	const transporter = nodemailer.createTransport({
		host: process.env.EMAIL_HOST,
		port: process.env.EMAIL_PORT,
		secureConnection: false,
		auth: {
			user: process.env.EMAIL_AUTH,
			pass: process.env.EMAIL_PW
		},
		tls: {
			ciphers: 'SSLv3'
		}
	});

	const mailOptions = {
		from: 'seed-test@mail.de',
		to: email,
		subject: 'Seed-Test-Password-Reset',
		html: `<p>
                Sie haben kürzlich versucht das Passwort Ihres Seed-Test-Account zu ändern.<br>
                Falls das nicht Sie waren, oder Sie keine Änderung der Passworts wünschen, ignorieren Sie diese Mail.<br><br>
                Klicken Sie auf folgenden Link, um jetzt Ihr Passwort zu ändern: 
                <a href='${process.env.FRONTEND_URL||'http://localhost:4200'}/resetpasswordconfirm?uuid=${id}'>Click here</a><br><br>
                Dieser Link  und die Anfrage verfallen in 60 Minuten.<br>
                Dies ist eine automatische E-Mail, bitte antworten Sie nicht darauf.<br><br><br>
                Mit freundlichen Grüßen<br>
                Das Seed-Test Team
                </p>`
	};

	transporter.sendMail(mailOptions, (error, info) => {
		if (error) console.log(error);
		else console.log(`Email sent: ${info.response}`);
	});
}

module.exports = {
	sendResetLink
};
