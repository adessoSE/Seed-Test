const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongo = require('../database/DbServices');

const router = express.Router();

// Handling response errors
function handleError(res, reason, statusMessage, code) {
    console.error(`ERROR: ${reason}`);
    res.status(code || 500)
        .json({ error: statusMessage });
}

// router for all mongo requests
router
    .use(cors())
    .use(bodyParser.json({ limit: '100kb' }))
    .use(bodyParser.urlencoded({
        limit: '100kb',
        extended: true
    }))
    .use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Credentials');
        next();
    })
    .use((_, __, next) => {
        //console.log(_.url + JSON.stringify(_.user));
        console.log('Time of workgroups request:', Date.now());
        next();
    });

// if an workgroup with the id exists it adds the email as a new user, if not it creates a workgroup and adds the member
router.post('/wgmembers/:id', async (req, res) => {
    try {
        req.body.email = req.body.email.toLowerCase();
        const user = await mongo.getUserByEmail(req.body.email)
        if (!user) {
            res.status(400).json({ error: 'User mit dieser E-mail nicht gefunden' })
            return
        }
        const wG = await mongo.getWorkgroup(req.params.id)
        if (wG) {
            if (wG.owner === req.body.email) {
                res.status(400).json({ error: 'Der User ist bereits der Owner' })
                return
            }
        }
        const result = await mongo.addMember(req.params.id, req.body)
        if (result === "Dieser User ist bereits in der Workgroup") {
            res.status(400).json({ error: 'Dieser User ist bereits in der Workgroup' })
        } else {
            res.status(200).json(result);
        }
    } catch (error) {
        handleError(res, error, error, 500);
    }
});

router.put('/wgmembers/:id', async (req, res) => {
    try {
        req.body.email = req.body.email.toLowerCase();
        const user = await mongo.getUserByEmail(req.body.email)
        if (!user) {
            res.status(400).json({ error: 'User mit dieser E-mail nicht gefunden' })
            return
        }
        let result = await mongo.updateMemberStatus(req.params.id, req.body)
        return result
    } catch (error) {
        handleError(res, error, error, 500);
    }
});

router.get('/wgmembers/:id', async (req, res) => {
    try {
        const result = await mongo.getMembers(req.params.id)
        res.status(200).json(result);
    } catch (error) {
        handleError(res, error, error, 500);
    }
});

router.post('/deletemember/:id', async (req, res) => {
    try {
        req.body.email.email = req.body.email.email.toLowerCase();
        const result = await mongo.removeFromWorkgroup(req.params.id, req.body.email)
        if (!result) res.status(500).json({ error: 'Beim Löschen des Users ist ein Fehler aufgetreten' })
        res.status(200).json(result);
    } catch (error) {
        handleError(res, error, error, 500);
    }
});


module.exports = router;