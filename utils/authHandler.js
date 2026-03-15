let userController = require('../controllers/users')
let jwt = require('jsonwebtoken')
let fs = require('fs')
let path = require('path')
let crypto = require('crypto')

let keyDirectory = path.join(__dirname, '..', 'keys');
let privateKeyPath = path.join(keyDirectory, 'jwtRS256.key');
let publicKeyPath = path.join(keyDirectory, 'jwtRS256.key.pub');

function getJwtKeys() {
    let privateKey = process.env.JWT_PRIVATE_KEY;
    let publicKey = process.env.JWT_PUBLIC_KEY;

    if (privateKey && publicKey) {
        return { privateKey, publicKey };
    }

    if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
        let keyPair = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'pkcs1',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs1',
                format: 'pem'
            }
        });

        fs.mkdirSync(keyDirectory, { recursive: true });
        fs.writeFileSync(privateKeyPath, keyPair.privateKey, 'utf8');
        fs.writeFileSync(publicKeyPath, keyPair.publicKey, 'utf8');

        return keyPair;
    }

    return {
        privateKey: fs.readFileSync(privateKeyPath, 'utf8'),
        publicKey: fs.readFileSync(publicKeyPath, 'utf8')
    };
}
module.exports = {
    CheckLogin: async function (req, res, next) {
        try {
            let token = req.headers.authorization;
            if (!token || !token.startsWith("Bearer")) {
                res.status(403).send({ message: "ban chua dang nhap" })
                return;
            }
            token = token.split(' ')[1]
            let { publicKey } = getJwtKeys();
            let result = jwt.verify(token, publicKey, {
                algorithms: ['RS256']
            });
            let getUser = await userController.GetUserById(result.id);
            if (!getUser) {
                res.status(403).send({ message: "ban chua dang nhap" })
            } else {
                req.user = getUser;
                next();
            }
        } catch (error) {
            res.status(403).send({ message: "ban chua dang nhap" })
        }

    }
}
