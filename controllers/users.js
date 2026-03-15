let userModel = require("../schemas/users");
let bcrypt = require('bcrypt')
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
    CreateAnUser: async function (username, password, email, role, fullName, avatarUrl, status, loginCount) {
        let newItem = new userModel({
            username: username,
            password: password,
            email: email,
            fullName: fullName,
            avatarUrl: avatarUrl,
            status: status,
            role: role,
            loginCount: loginCount
        });
        await newItem.save();
        return newItem;
    },
    GetAllUser: async function () {
        return await userModel
            .find({ isDeleted: false })
    },
    GetUserById: async function (id) {
        try {
            return await userModel
                .findOne({
                    isDeleted: false,
                    _id: id
                })
        } catch (error) {
            return false;
        }
    },
    QueryLogin: async function (username, password) {
        if (!username || !password) {
            return false;
        }
        let user = await userModel.findOne({
            username: username,
            isDeleted: false
        })
        if (user) {
            if (bcrypt.compareSync(password, user.password)) {
                let { privateKey } = getJwtKeys();
                return jwt.sign({
                    id: user.id
                }, privateKey, {
                    algorithm: 'RS256',
                    expiresIn: '1d'
                })
            } else {
                return false;
            }
        } else {
            return false;
        }
    },
    ChangePassword: async function (userId, oldPassword, newPassword) {
        if (!userId || !oldPassword || !newPassword) {
            return {
                success: false,
                message: "thieu thong tin doi mat khau"
            };
        }

        let user = await userModel.findOne({
            _id: userId,
            isDeleted: false
        });

        if (!user) {
            return {
                success: false,
                message: "nguoi dung khong ton tai"
            };
        }

        if (!bcrypt.compareSync(oldPassword, user.password)) {
            return {
                success: false,
                message: "mat khau cu khong dung"
            };
        }

        user.password = newPassword;
        await user.save();

        return {
            success: true,
            message: "doi mat khau thanh cong"
        };
    }
}
