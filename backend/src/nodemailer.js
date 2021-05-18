const nodemailer = require('nodemailer');



async function sendResetLink(email, id){

    const transporter = nodemailer.createTransport({
        host: 'smtp.mail.de',
        port: 587,
        secureConnection: false,
        auth: {
            user: process.env.EMAIL_AUTH,
            pass: process.env.EMAIL_PW
        },
        tls: {
            ciphers:'SSLv3'
        }
    });

    const mailOptions = {
        from: 'seed-test@mail.de',
        to: email,
        subject: 'Seed-Test-Passwort-Reset',
        html: `<p>Dies ist eine automatische Email, bitte antworten sie nicht darauf.<br>
                Sie oder jemand anderes hat versucht das Passwort für ihren Seed-Test-Account zu ändern. Sollten sie das nicht wünschen, ignorieren Sie einfach diese E-Mail.<br>
                Wünschen sie ihr Passwort zu ändern, klicken sie bitte den folgenden Link:<br>
                <a href='https://seed-test-frontend.herokuapp.com/resetpasswordconfirm?uuid=confirm${id}'>Click here</a>
                </p>`
                
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

module.exports = {
    sendResetLink
};