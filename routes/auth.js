var express = require("express");
var router = express.Router();
let userController = require('../controllers/users')
let { RegisterValidator, ChangePasswordValidator, validatedResult } = require('../utils/validator')
let {CheckLogin} = require('../utils/authHandler')
//login
router.post('/login',async function (req, res, next) {
    let { username, password } = req.body;
    let result = await userController.QueryLogin(username,password);
    if(!result){
        res.status(404).send("thong tin dang nhap khong dung")
    }else{
        res.send(result)
    }
    
})
router.post('/register', RegisterValidator, validatedResult, async function (req, res, next) {
    let { username, password, email } = req.body;
    let newUser = await userController.CreateAnUser(
        username, password, email, '69b6231b3de61addb401ea26'
    )
    res.send(newUser)
})
router.get('/me',CheckLogin,function(req,res,next){
    res.send(req.user)
})

router.post('/change-password', CheckLogin, ChangePasswordValidator, validatedResult, async function (req, res, next) {
    let result = await userController.ChangePassword(
        req.user.id,
        req.body.oldpassword,
        req.body.newpassword
    );

    if (!result.success) {
        res.status(400).send({ message: result.message });
        return;
    }

    res.send({ message: result.message });
})

//register
//changepassword
//me
//forgotpassword
//permission
module.exports = router;
