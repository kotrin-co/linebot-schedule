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
    })
    .get('/edit',(req,res)=>{
        res.render('pages/edit');
    });

module.exports = router;