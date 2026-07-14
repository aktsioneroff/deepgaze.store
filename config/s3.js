const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Конфигурация S3
const s3Config = {
    endpoint: 'https://s3.twcstorage.ru',
    accessKeyId: 'WH5JV70A76ML0WY9VWJM',
    secretAccessKey: 'EtN37sHNRkLs5dPgJzkB2TQFUW8mSE81gDIFe8DP',
    region: 'ru-1',
    s3ForcePathStyle: true,
    signatureVersion: 'v4',
    httpOptions: {
        timeout: 30000,
        connectTimeout: 10000
    }
};

const BUCKET_NAME = 'b84d36c2-5e58-406e-9d3d-5754fe0dda39';

// Создаем экземпляр S3
const s3 = new AWS.S3(s3Config);

// ===== ЛОГИРОВАНИЕ ПОДКЛЮЧЕНИЯ =====
function logS3Connection() {
    console.log('📦 ===== S3 ПОДКЛЮЧЕНИЕ =====');
    console.log(`  ├─ Endpoint: ${s3Config.endpoint}`);
    console.log(`  ├─ Bucket: ${BUCKET_NAME}`);
    console.log(`  ├─ Access Key: ${s3Config.accessKeyId.substring(0, 8)}...`);
    console.log(`  ├─ Region: ${s3Config.region}`);
    console.log(`  └─ SDK Version: ${AWS.VERSION}`);
    console.log('📦 ============================');
}

// ===== ПРОВЕРКА ПОДКЛЮЧЕНИЯ =====
async function testS3Connection() {
    const startTime = Date.now();
    console.log('🔍 Проверка подключения к S3...');
    
    try {
        // Проверяем доступность бакета
        await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
        console.log(`✅ Бакет доступен (${Date.now() - startTime}ms)`);
        
        // Пробуем создать тестовый файл
        const testKey = `_test_connection_${Date.now()}.txt`;
        await s3.putObject({
            Bucket: BUCKET_NAME,
            Key: testKey,
            Body: `Connection test - ${new Date().toISOString()}`,
            ContentType: 'text/plain'
        }).promise();
        console.log(`✅ Тестовый файл создан (${Date.now() - startTime}ms)`);
        
        // Проверяем, что файл создался
        const headResult = await s3.headObject({
            Bucket: BUCKET_NAME,
            Key: testKey
        }).promise();
        console.log(`✅ Тестовый файл проверен (${Date.now() - startTime}ms)`);
        
        // Удаляем тестовый файл
        await s3.deleteObject({
            Bucket: BUCKET_NAME,
            Key: testKey
        }).promise();
        console.log(`✅ Тестовый файл удален (${Date.now() - startTime}ms)`);
        
        console.log('✅ S3 подключение успешно!');
        return true;
    } catch (error) {
        console.error(`❌ Ошибка подключения к S3 (${Date.now() - startTime}ms):`);
        console.error('  ├─ Code:', error.code || 'Неизвестно');
        console.error('  ├─ Status Code:', error.statusCode || 'Нет');
        console.error('  └─ Message:', error.message);
        return false;
    }
}

// ===== ЗАГРУЗКА ФАЙЛА В S3 =====
async function uploadToS3(key, data, contentType = 'application/json') {
    const startTime = Date.now();
    try {
        const params = {
            Bucket: BUCKET_NAME,
            Key: key,
            Body: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
            ContentType: contentType
        };
        
        const result = await s3.putObject(params).promise();
        console.log(`✅ Файл загружен: ${key} (${Date.now() - startTime}ms)`);
        return result;
    } catch (error) {
        console.error(`❌ Ошибка загрузки файла ${key}:`, error.message);
        throw error;
    }
}

// ===== СКАЧИВАНИЕ ФАЙЛА ИЗ S3 =====
async function downloadFromS3(key) {
    const startTime = Date.now();
    try {
        const params = {
            Bucket: BUCKET_NAME,
            Key: key
        };
        
        const result = await s3.getObject(params).promise();
        console.log(`✅ Файл скачан: ${key} (${Date.now() - startTime}ms)`);
        return result.Body.toString('utf8');
    } catch (error) {
        if (error.code === 'NoSuchKey') {
            console.log(`⚠️ Файл не найден в S3: ${key}`);
            return null;
        }
        console.error(`❌ Ошибка скачивания файла ${key}:`, error.message);
        throw error;
    }
}

// ===== ПРОВЕРКА СУЩЕСТВОВАНИЯ ФАЙЛА =====
async function fileExistsInS3(key) {
    try {
        await s3.headObject({
            Bucket: BUCKET_NAME,
            Key: key
        }).promise();
        return true;
    } catch (error) {
        if (error.code === 'NotFound') {
            return false;
        }
        throw error;
    }
}

// ===== УДАЛЕНИЕ ФАЙЛА ИЗ S3 =====
async function deleteFromS3(key) {
    try {
        await s3.deleteObject({
            Bucket: BUCKET_NAME,
            Key: key
        }).promise();
        console.log(`✅ Файл удален из S3: ${key}`);
        return true;
    } catch (error) {
        console.error(`❌ Ошибка удаления файла ${key}:`, error.message);
        return false;
    }
}

// ===== ПОЛУЧЕНИЕ СПИСКА ФАЙЛОВ =====
async function listS3Files(prefix = '') {
    try {
        const params = {
            Bucket: BUCKET_NAME,
            Prefix: prefix
        };
        
        const result = await s3.listObjectsV2(params).promise();
        return result.Contents ? result.Contents.map(item => item.Key) : [];
    } catch (error) {
        console.error('❌ Ошибка получения списка файлов:', error.message);
        return [];
    }
}

module.exports = {
    s3,
    s3Config,
    BUCKET_NAME,
    logS3Connection,
    testS3Connection,
    uploadToS3,
    downloadFromS3,
    fileExistsInS3,
    deleteFromS3,
    listS3Files
};
