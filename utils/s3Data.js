const s3 = require('../config/s3');
const path = require('path');

// Кэш для данных (оптимизация)
const cache = {};

// ===== ЧТЕНИЕ ДАННЫХ ИЗ S3 =====
async function readData(fileName) {
    const key = `data/${fileName}`;
    
    try {
        // Проверяем кэш
        if (cache[key] && cache[key].timestamp > Date.now() - 5000) {
            return cache[key].data;
        }
        
        const data = await s3.downloadFromS3(key);
        
        if (data === null) {
            // Файла нет - возвращаем пустой массив
            return [];
        }
        
        const parsed = JSON.parse(data);
        
        // Сохраняем в кэш
        cache[key] = {
            data: parsed,
            timestamp: Date.now()
        };
        
        return parsed;
    } catch (error) {
        console.error(`Ошибка чтения ${fileName}:`, error.message);
        return [];
    }
}

// ===== ЗАПИСЬ ДАННЫХ В S3 =====
async function writeData(fileName, data) {
    const key = `data/${fileName}`;
    
    try {
        await s3.uploadToS3(key, data);
        
        // Обновляем кэш
        cache[key] = {
            data: data,
            timestamp: Date.now()
        };
        
        return true;
    } catch (error) {
        console.error(`Ошибка записи ${fileName}:`, error.message);
        return false;
    }
}

// ===== УДАЛЕНИЕ ФАЙЛА =====
async function deleteData(fileName) {
    const key = `data/${fileName}`;
    
    try {
        await s3.deleteFromS3(key);
        
        // Удаляем из кэша
        delete cache[key];
        
        return true;
    } catch (error) {
        console.error(`Ошибка удаления ${fileName}:`, error.message);
        return false;
    }
}

// ===== ПОЛУЧЕНИЕ СПИСКА ФАЙЛОВ =====
async function listDataFiles() {
    try {
        const files = await s3.listS3Files('data/');
        return files.map(f => f.replace('data/', ''));
    } catch (error) {
        console.error('Ошибка получения списка файлов:', error.message);
        return [];
    }
}

// ===== МИГРАЦИЯ ЛОКАЛЬНЫХ ДАННЫХ В S3 =====
async function migrateLocalDataToS3() {
    const fs = require('fs');
    const path = require('path');
    const localDataDir = path.join(__dirname, '../data');
    
    console.log('📦 ===== МИГРАЦИЯ ДАННЫХ В S3 =====');
    
    if (!fs.existsSync(localDataDir)) {
        console.log('⚠️ Папка data не найдена, миграция не требуется');
        return;
    }
    
    const files = fs.readdirSync(localDataDir);
    let migrated = 0;
    
    for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        try {
            const filePath = path.join(localDataDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Проверяем, есть ли файл в S3
            const exists = await s3.fileExistsInS3(`data/${file}`);
            
            if (!exists) {
                await s3.uploadToS3(`data/${file}`, content);
                console.log(`  ├─ ✅ Мигрирован: ${file}`);
                migrated++;
            } else {
                console.log(`  ├─ ⏭️ Пропущен (уже есть): ${file}`);
            }
        } catch (error) {
            console.error(`  ├─ ❌ Ошибка миграции ${file}:`, error.message);
        }
    }
    
    console.log(`📦 ===== МИГРАЦИЯ ЗАВЕРШЕНА (${migrated} файлов) =====`);
}

module.exports = {
    readData,
    writeData,
    deleteData,
    listDataFiles,
    migrateLocalDataToS3
};
