import { Router } from 'express';
import { config } from '../config.js';
import { createToken } from '../utils/tokenStore.js';

const router = Router();

router.post('/auth', (req, res) => {
  const { password } = req.body;
  if (password === config.adminPassword) {
    res.json({ token: createToken() });
  } else {
    res.status(403).json({ error: 'Wrong password' });
  }
});

export default router;
