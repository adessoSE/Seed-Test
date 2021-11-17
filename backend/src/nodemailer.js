const nodemailer = require('nodemailer');

async function sendResetLink(email, id) {
	const transporter = nodemailer.createTransport({
		host: 'smtp.mail.de',
		port: 587,
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
                <a href='${process.env.FRONTEND_URL}/resetpasswordconfirm?uuid=${id}'>Click here</a><br><br>
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
