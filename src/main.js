import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid'
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// __dirname 替代写法（ESModule 没有 __dirname）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const uploadDir = path.join(__dirname, 'uploads');

// 创建 uploads 目录
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// 允许的 MIME 类型
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// 配置 multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const id = nanoid();
        cb(null, `${id}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: function (req, file, cb) {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type'));
        }
    }
});

// 静态访问上传的图片
app.use('/images', express.static(uploadDir));

// 上传接口
app.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }

    const filepath = path.join(uploadDir, req.file.filename);

    try {
        await sharp(filepath).metadata(); // 尝试读取图片信息
        const fileUrl = `/images/${req.file.filename}`;
        res.json({
            message: 'Image uploaded successfully',
            url: fileUrl
        });
    } catch (err) {
        fs.unlinkSync(filepath); // 删除伪造图片
        res.status(400).json({ error: 'Invalid image file (corrupted or fake)' });
    }
});

// 错误处理
app.use((err, req, res, next) => {
    if (err.message === 'Unsupported file type') {
        return res.status(400).json({ error: 'Only JPG, PNG, GIF, and WEBP images are allowed.' });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Max size is 5MB.' });
    }
    res.status(500).json({ error: 'Upload failed', detail: err.message });
});

// 启动服务
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});