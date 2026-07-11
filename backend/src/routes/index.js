const express = require('express');
const healthRouter = require('./health.routes');
const placeholderRouter = require('./placeholder.routes');

const router = express.Router();

// Mount sub-routers
router.use('/health', healthRouter);
router.use('/', placeholderRouter); // Mount auth/items endpoints directly

module.exports = router;
