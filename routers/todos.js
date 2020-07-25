const express = require('express');
const router = express.Router();
const controller = require('../controllers/todos');
console.log('routers実行');

router
    .route('/')
    .get(controller.getTodos);

module.exports = router;