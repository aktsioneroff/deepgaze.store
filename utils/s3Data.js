const s3 = require('../config/s3');
const fs = require('fs');
const path = require('path');

// Кэш для данных
const cache = {};
const CACHE_TTL = 5000;

// Локальная папка для данных
const LOCAL_DATA_DIR = path.join(__dirname, '../data');

// Убеждаемся, что папка существует
if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    console.log(`📁 Создана локальная папка данных: ${LOCAL_DATA_DIR}`);
}

// ===== ЧТЕНИЕ ДАННЫХ =====
async function readData(fileName) {
    const key = `data/${fileName}`;
    console.log(`📖 Чтение данных: ${fileName}`);
    
    try {
        // Проверяем кэш
        if (cache[key] && cache[key].timestamp > Date.now() - CACHE_TTL) {
            console.log(`  └─ 📦 Из кэша (${cache[key].data.length} записей)`);
            return cache[key].data;
        }
        
        let data = await s3.downloadFromS3(key);
        
        // Если данные не найдены в S3, пробуем локально
        if (data === null) {
            const localPath = path.join(LOCAL_DATA_DIR, fileName);
            console.log(`  ├─ 🔍 Проверка локально: ${localPath}`);
            if (fs.existsSync(localPath)) {
                data = fs.readFileSync(localPath, 'utf8');
                console.log(`  └─ ✅ Найдено локально`);
            }
        }
        
        if (data === null) {
            console.log(`  └─ ⚠️ Файл не найден, возвращаем пустой массив`);
            return [];
        }
        
        const parsed = JSON.parse(data);
        console.log(`  └─ ✅ Загружено (${parsed.length} записей)`);
        
        cache[key] = {
            data: parsed,
            timestamp: Date.now()
        };
        
        return parsed;
    } catch (error) {
        console.error(`  └─ ❌ Ошибка чтения: ${error.message}`);
        return [];
    }
}

// ===== ЗАПИСЬ ДАННЫХ =====
async function writeData(fileName, data) {
    const key = `data/${fileName}`;
    console.log(`💾 Запись данных: ${fileName} (${data.length} записей)`);
    
    try {
        // Сохраняем в S3
        await s3.uploadToS3(key, data);
        console.log(`  └─ ✅ Сохранено в S3`);
        
        // Всегда сохраняем локально для надежности
        const localPath = path.join(LOCAL_DATA_DIR, fileName);
        fs.writeFileSync(localPath, JSON.stringify(data, null, 2));
        console.log(`  └─ ✅ Сохранено локально: ${localPath}`);
        
        cache[key] = {
            data: data,
            timestamp: Date.now()
        };
        
        return true;
    } catch (error) {
        console.error(`  └─ ❌ Ошибка записи: ${error.message}`);
        // Все равно сохраняем локально
        const localPath = path.join(LOCAL_DATA_DIR, fileName);
        fs.writeFileSync(localPath, JSON.stringify(data, null, 2));
        console.log(`  └─ 💾 Сохранено только локально: ${localPath}`);
        return false;
    }
}

// ===== УДАЛЕНИЕ ФАЙЛА =====
async function deleteData(fileName) {
    const key = `data/${fileName}`;
    console.log(`🗑️ Удаление данных: ${fileName}`);
    
    try {
        await s3.deleteFromS3(key);
        console.log(`  └─ ✅ Удалено из S3`);
    } catch (error) {
        console.error(`  └─ ⚠️ Ошибка удаления из S3: ${error.message}`);
    }
    
    // Удаляем локально
    const localPath = path.join(LOCAL_DATA_DIR, fileName);
    if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        console.log(`  └─ ✅ Удалено локально`);
    }
    
    delete cache[key];
    return true;
}

// ===== ПОЛУЧЕНИЕ СПИСКА ФАЙЛОВ =====
async function listDataFiles() {
    console.log('📁 Получение списка файлов данных...');
    
    try {
        const files = await s3.listS3Files('data/');
        if (files.length > 0) {
            const names = files.map(f => f.replace('data/', ''));
            console.log(`  └─ S3: ${names.length} файлов`);
            return names;
        }
    } catch (error) {
        console.log(`  └─ ⚠️ Ошибка получения списка из S3: ${error.message}`);
    }
    
    // Если S3 не доступен, читаем локально
    if (fs.existsSync(LOCAL_DATA_DIR)) {
        const files = fs.readdirSync(LOCAL_DATA_DIR);
        console.log(`  └─ Локально: ${files.length} файлов`);
        return files;
    }
    
    console.log(`  └─ Нет файлов`);
    return [];
}

// ===== ОЧИСТКА КЭША =====
function clearCache() {
    const count = Object.keys(cache).length;
    Object.keys(cache).forEach(key => delete cache[key]);
    console.log(`🗑️ Кэш очищен (${count} записей)`);
}

module.exports = {
    readData,
    writeData,
    deleteData,
    listDataFiles,
    clearCache,
    LOCAL_DATA_DIR
};
