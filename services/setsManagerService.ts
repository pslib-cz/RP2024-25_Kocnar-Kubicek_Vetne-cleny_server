import express from 'express';
import type { Request } from 'express';
import { join } from 'path';
import multer from 'multer';
import { basicAuth } from './adminAuth';

const router = express.Router();

const DATA_ROOT = process.env.DATA_ROOT ?? join(__dirname, 'data');

const SETS_DIR = join(DATA_ROOT, 'sets')
const SETS_FILE = join(SETS_DIR, 'sets.json');
const TYPES_FILE = join(SETS_DIR, 'types.json');

const VERSION_FILE = join(SETS_DIR, 'version.json');

const upload = multer();

router.post('/sets', basicAuth, upload.single('file'), (req, res) => {
  const fileReq = req as Request & { file?: Express.Multer.File };
  if (!fileReq.file) {
    res.status(400).json({ error: 'Missing sets.json file' });
    return void 0;
  }
  Bun.write(SETS_FILE, fileReq.file.buffer)
    .then(() => {
      res.status(200).json({ status: 'ok' });
      return void 0;
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Failed to write sets.json' });
      return void 0;
    });

  const now = new Date();
  Bun.write(VERSION_FILE, JSON.stringify({ version: `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}` }))
    .catch(() => {
      res.status(500).json({ error: 'Failed to write version.json' });
      return void 0;
    });
});

router.post('/types', basicAuth, upload.single('file'), (req, res) => {
  const fileReq = req as Request & { file?: Express.Multer.File };
  if (!fileReq.file) {
    res.status(400).json({ error: 'Missing types.json file' });
    return void 0;
  }
  Bun.write(TYPES_FILE, fileReq.file.buffer)
    .then(() => {
      res.status(200).json({ status: 'ok' });
      return void 0;
    })
    .catch((err) => {
      console.error(err);   
      res.status(500).json({ error: 'Failed to write types.json' });
      return void 0;
    });
});

router.post('/version', basicAuth, (req, res) => {
  const now = new Date();
  Bun.write(VERSION_FILE, JSON.stringify({ version: `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}` }))
    .then(() => {
      res.status(200).json({ status: 'ok' });
      return void 0;
    })
    .catch(() => {
      res.status(500).json({ error: 'Failed to write version.json' });
      return void 0;
    });
});

export default router;