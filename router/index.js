const express = require('express');
const router = express.Router();

router 
    .get('/',(req,res)=>{
        res.send('pages/index');
    })
    .get('/users',(req,res)=>{
        res.render('pages/users');
    })
    .get('/reservations',(req,res)=>{
        res.send('pages/reservations');
    });

module.exports = router;