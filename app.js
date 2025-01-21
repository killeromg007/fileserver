const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const archiver = require('archiver'); // Add this line
const unzipper = require('unzipper'); // Add this line

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

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

// Helper function to get directory structure
function getDirectoryStructure(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    const structure = [];

    items.forEach(item => {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            structure.push({
                name: item.name,
                path: fullPath.replace(/\\/g, '/').replace('uploads/', ''),
                type: 'folder',
                children: getDirectoryStructure(fullPath)
            });
        } else {
            const stats = fs.statSync(fullPath);
            structure.push({
                name: item.name,
                path: fullPath.replace(/\\/g, '/').replace('uploads/', ''),
                type: getFileType(item.name),
                size: (stats.size / 1024 / 1024).toFixed(2),
                date: stats.mtime.toLocaleDateString()
            });
        }
    });

    return structure;
}

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folder = req.body.folder || '';
        const uploadDir = path.join('uploads', folder);
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, Date.now() + '-' + sanitizedName);
    }
});

const upload = multer({ storage: storage });

app.get('/', (req, res) => {
    const currentPath = req.query.path || '';
    const structure = getDirectoryStructure('uploads');
    const files = currentPath ? 
        getDirectoryStructure(path.join('uploads', currentPath)) :
        structure;
    
    res.render('index', { 
        files,
        structure,
        currentPath
    });
});

app.post('/folder', express.json(), (req, res) => {
    const folderPath = path.join('uploads', req.body.path || '', req.body.name);
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Folder already exists' });
    }
});

app.post('/upload-archive', upload.single('archive'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file selected');
    }
    const filePath = path.join('uploads', req.file.filename);
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    if (ext === '.zip') {
        fs.createReadStream(filePath)
            .pipe(unzipper.Extract({ path: 'uploads' }))
            .on('close', () => res.redirect('/'))
            .on('error', (err) => res.status(500).send('Error extracting ZIP file'));
    } else if (ext === '.rar') {
        // Handle RAR extraction (you may need a library for this)
        res.status(400).send('RAR extraction not implemented');
    } else {
        res.status(400).send('Invalid file type');
    }
});

app.get('/upload', (req, res) => {
    const structure = getDirectoryStructure('uploads');
    res.render('upload', { structure });
});

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file selected');
    }
    res.redirect('/?path=' + (req.body.folder || ''));
});

app.get('/download/:path(*)', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.path);
    res.download(filePath);
});

app.get('/edit/:path(*)', async (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.path);
    try {
        const content = await fsPromises.readFile(filePath, 'utf8');
        res.render('edit', { 
            content,
            filePath: req.params.path,
            apiKey: 'jaqrbgaheclvc8lq4j1sds2f4ip3fq0e4e5frc2985tq2p9k'
        });
    } catch (error) {
        res.status(500).send('Error reading file');
    }
});

app.post('/save/:path(*)', express.json(), async (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.path);
    try {
        await fsPromises.writeFile(filePath, req.body.content);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save file' });
    }
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 