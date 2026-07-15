const s3 = require('../config/s3');

// Кэш для данных (оптимизация)
const cache = {};
const CACHE_TTL = 5000;

async function readData(fileName) {
    const key = `data/${fileName}`;
    
    // Проверяем кэш
    if (cache[key] && cache[key].timestamp > Date.now() - CACHE_TTL) {
        console.log(`📦 Кэш: ${fileName}`);
        return cache[key].data;
    }
    
    try {
        const data = await s3.downloadFromS3(key);
        
        if (data === null) {
            console.log(`📄 Новый файл: ${fileName} (будет создан при первом сохранении)`);
            return [];
        }
        
        const parsed = JSON.parse(data);
        cache[key] = { data: parsed, timestamp: Date.now() };
        console.log(`📖 Загружено из S3: ${fileName} (${parsed.length} записей)`);
        return parsed;
    } catch (error) {
        console.error(`Ошибка чтения ${fileName}:`, error.message);
        return [];
    }
}

async function writeData(fileName, data) {
    const key = `data/${fileName}`;
    
    try {
        const result = await s3.uploadToS3(key, data);
        
        if (result) {
            cache[key] = { data: data, timestamp: Date.now() };
            console.log(`💾 Сохранено в S3: ${fileName} (${data.length} записей)`);
            return true;
        } else {
            console.error(`❌ Ошибка сохранения в S3: ${fileName}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Критическая ошибка записи ${fileName}:`, error.message);
        return false;
    }
}

async function deleteData(fileName) {
    const key = `data/${fileName}`;
    
    try {
        await s3.deleteFromS3(key);
        delete cache[key];
        console.log(`🗑️ Удалено из S3: ${fileName}`);
        return true;
    } catch (error) {
        console.error(`Ошибка удаления ${fileName}:`, error.message);
        return false;
    }
}

async function listDataFiles() {
    try {
        const files = await s3.listS3Files('data/');
        return files.map(f => f.replace('data/', ''));
    } catch (error) {
        console.error('Ошибка получения списка файлов:', error.message);
        return [];
    }
}

async function checkFileExists(fileName) {
    const key = `data/${fileName}`;
    try {
        const data = await s3.downloadFromS3(key);
        return data !== null;
    } catch (error) {
        return false;
    }
}

module.exports = {
    readData,
    writeData,
    deleteData,
    listDataFiles,
    checkFileExists
};
