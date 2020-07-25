const express = require('express');
const router = express.Router();
const controller = require('../controllers/todos');
console.log('その5　todo.js(routers)');

router
    .route('/')
    .get(controller.getTodos);

module.exports = router;