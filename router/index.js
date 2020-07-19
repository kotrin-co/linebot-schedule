const express = require('express');
const router = express.Router();

router 
    .get('/',(req,res)=>{
        res.send('トップページ');
    })
    .get('/users',(req,res)=>{
        res.send('ユーザー管理画面');
    })
    .get('/reservation',(req,res)=>{
        res.send('予約管理画面');
    });

module.exports = router;