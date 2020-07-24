const express = require('express');
const router = express.Router();

router 
    .get('/',(req,res)=>{
        res.render('pages/index');
    })
    .get('/users',(req,res)=>{
        res.render('pages/users');
    })
    .get('/reservations',(req,res)=>{
        res.render('pages/reservations');
    });

module.exports = router;