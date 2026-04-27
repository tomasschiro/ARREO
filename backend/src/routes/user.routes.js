const { Router } = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { getMe } = require('../controllers/user.controller');

const router = Router();

router.get('/me', authenticate, getMe);

module.exports = router;
