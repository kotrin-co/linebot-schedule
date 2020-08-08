const express = require('express');
const router = express.Router();
const controller = require('../controllers/todos');

router
    .route('/')
    .get(controller.getTodos)
    .post(controller.postTodo);

router
    .route('/:id')
    .post(controller.putTodo);

router
    .route('/remove/:id')
    .post(controller.removeTodo);

router 
    .route('/users/:id')
    .post(controller.postUser);

module.exports = router;