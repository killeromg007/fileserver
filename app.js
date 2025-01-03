const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/uploads', express.static('uploads')); // Allow access to uploads for preview

// Helper function to get file type
function getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return 'image';
    if (['.mp4', '.webm', '.ogg'].includes(ext)) return 'video';
    if (['.mp3', '.wav'].includes(ext)) return 'audio';
    if (['.pdf'].includes(ext)) return 'pdf';
    if (['.txt', '.md', '.js', '.html', '.css'].includes(ext)) return 'text';
    return 'other';
}

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, Date.now() + '-' + sanitizedName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

app.get('/', (req, res) => {
    const files = fs.readdirSync('uploads').map(filename => {
        const stats = fs.statSync(path.join('uploads', filename));
        return {
            name: filename,
            size: (stats.size / 1024 / 1024).toFixed(2), // Size in MB
            type: getFileType(filename),
            date: stats.mtime.toLocaleDateString()
        };
    });
    res.render('index', { files });
});

app.get('/upload', (req, res) => {
    res.render('upload');
});

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file selected');
    }
    res.redirect('/');
});

app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    res.download(filePath);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 