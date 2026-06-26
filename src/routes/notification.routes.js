const { Router }    = require('express');
const notifCtrl     = require('../controllers/notification.controller');
const { verifyJWT } = require('../middleware/auth.middleware');

const router = Router();
router.use(verifyJWT);

router.get('/',              notifCtrl.getNotifications);
router.patch('/read-all',    notifCtrl.markAllRead);       // Must be BEFORE /:id
router.patch('/:id/read',    notifCtrl.markRead);

module.exports = router;