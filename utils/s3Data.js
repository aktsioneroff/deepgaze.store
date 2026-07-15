const fs = require('fs');
const path = require('path');
const s3 = require('../config/s3');

const LOCAL_DATA_DIR = path.join(__dirname, '../data');

if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
}

const cache = {};
const CACHE_TTL = 5000;

async function readData(fileName) {
    const key = `data/${fileName}`;
    
    if (cache[key] && cache[key].timestamp > Date.now() - CACHE_TTL) {
        console.log(`📦 Кэш: ${fileName}`);
        return cache[key].data;
    }
    
    try {
        let data = await s3.downloadFromS3(key);
        
        if (data === null) {
            const localPath = path.join(LOCAL_DATA_DIR, fileName);
            if (fs.existsSync(localPath)) {
                data = fs.readFileSync(localPath, 'utf8');
                console.log(`📁 Локально: ${fileName}`);
            }
        }
        
        if (data === null) {
            console.log(`📄 Новый файл: ${fileName}`);
            return [];
        }
        
        const parsed = JSON.parse(data);
        cache[key] = { data: parsed, timestamp: Date.now() };
        return parsed;
    } catch (error) {
        console.error(`Ошибка чтения ${fileName}:`, error.message);
        return [];
    }
}

async function writeData(fileName, data) {
    const key = `data/${fileName}`;
    
    try {
        await s3.uploadToS3(key, data);
        
        const localPath = path.join(LOCAL_DATA_DIR, fileName);
        fs.writeFileSync(localPath, JSON.stringify(data, null, 2));
        
        cache[key] = { data: data, timestamp: Date.now() };
        console.log(`💾 Сохранено в S3 и локально: ${fileName}`);
        return true;
    } catch (error) {
        console.error(`Ошибка записи ${fileName}:`, error.message);
        const localPath = path.join(LOCAL_DATA_DIR, fileName);
        fs.writeFileSync(localPath, JSON.stringify(data, null, 2));
        return false;
    }
}

async function deleteData(fileName) {
    const key = `data/${fileName}`;
    
    try {
        await s3.deleteFromS3(key);
    } catch (error) {
        console.error(`Ошибка удаления из S3:`, error.message);
    }
    
    const localPath = path.join(LOCAL_DATA_DIR, fileName);
    if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
    }
    
    delete cache[key];
    console.log(`🗑️ Удалено: ${fileName}`);
    return true;
}

async function listDataFiles() {
    if (fs.existsSync(LOCAL_DATA_DIR)) {
        return fs.readdirSync(LOCAL_DATA_DIR);
    }
    return [];
}

module.exports = {
    readData,
    writeData,
    deleteData,
    listDataFiles,
    LOCAL_DATA_DIR
};
