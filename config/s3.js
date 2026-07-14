const { S3Client, HeadBucketCommand, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// Конфигурация S3
const s3Config = {
    endpoint: 'https://s3.twcstorage.ru',
    region: 'ru-1',
    credentials: {
        accessKeyId: 'WH5JV70A76ML0WY9VWJM',
        secretAccessKey: 'EtN37sHNRkLs5dPgJzkB2TQFUW8mSE81gDIFe8DP'
    },
    forcePathStyle: true
};

const BUCKET_NAME = 'b84d36c2-5e58-406e-9d3d-5754fe0dda39';

// Создаем экземпляр S3
const s3Client = new S3Client(s3Config);

// ===== ЛОГИРОВАНИЕ ПОДКЛЮЧЕНИЯ =====
function logS3Connection() {
    console.log('📦 ===== S3 ПОДКЛЮЧЕНИЕ =====');
    console.log(`  ├─ Endpoint: ${s3Config.endpoint}`);
    console.log(`  ├─ Bucket: ${BUCKET_NAME}`);
    console.log(`  ├─ Access Key: ${s3Config.credentials.accessKeyId.substring(0, 8)}...`);
    console.log(`  ├─ Region: ${s3Config.region}`);
    console.log(`  └─ SDK: @aws-sdk/client-s3 v3`);
    console.log('📦 ============================');
}

// ===== ПРОВЕРКА ПОДКЛЮЧЕНИЯ =====
async function testS3Connection() {
    const startTime = Date.now();
    console.log('🔍 Проверка подключения к S3...');
    
    try {
        // Проверяем доступность бакета
        console.log('  ├─ Проверка бакета...');
        await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
        console.log(`  ├─ ✅ Бакет доступен (${Date.now() - startTime}ms)`);
        
        // Пробуем создать тестовый файл
        const testKey = `_test_connection_${Date.now()}.txt`;
        console.log(`  ├─ Создание тестового файла...`);
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: testKey,
            Body: `Connection test - ${new Date().toISOString()}`,
            ContentType: 'text/plain'
        }));
        console.log(`  ├─ ✅ Тестовый файл создан (${Date.now() - startTime}ms)`);
        
        // Проверяем, что файл создался
        console.log(`  ├─ Проверка тестового файла...`);
        await s3Client.send(new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: testKey
        }));
        console.log(`  ├─ ✅ Тестовый файл проверен (${Date.now() - startTime}ms)`);
        
        // Удаляем тестовый файл
        console.log(`  ├─ Удаление тестового файла...`);
        await s3Client.send(new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: testKey
        }));
        console.log(`  ├─ ✅ Тестовый файл удален (${Date.now() - startTime}ms)`);
        
        console.log(`✅ S3 подключение успешно! (${Date.now() - startTime}ms)`);
        return true;
    } catch (error) {
        console.error(`❌ Ошибка подключения к S3 (${Date.now() - startTime}ms):`);
        console.error('  ├─ Name:', error.name || 'Неизвестно');
        console.error('  ├─ Code:', error.Code || error.$metadata?.httpStatusCode || 'Нет');
        console.error('  └─ Message:', error.message);
        return false;
    }
}

// ===== ЗАГРУЗКА ФАЙЛА В S3 =====
async function uploadToS3(key, data, contentType = 'application/json') {
    const startTime = Date.now();
    console.log(`📤 Загрузка в S3: ${key}`);
    
    try {
        const params = {
            Bucket: BUCKET_NAME,
            Key: key,
            Body: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
            ContentType: contentType
        };
        
        const result = await s3Client.send(new PutObjectCommand(params));
        console.log(`  └─ ✅ Загружено (${Date.now() - startTime}ms) - ETag: ${result.ETag}`);
        return result;
    } catch (error) {
        console.error(`  └─ ❌ Ошибка загрузки: ${error.message}`);
        throw error;
    }
}

// ===== СКАЧИВАНИЕ ФАЙЛА ИЗ S3 =====
async function downloadFromS3(key) {
    const startTime = Date.now();
    console.log(`📥 Скачивание из S3: ${key}`);
    
    try {
        const params = {
            Bucket: BUCKET_NAME,
            Key: key
        };
        
        const result = await s3Client.send(new GetObjectCommand(params));
        const body = await result.Body.transformToString();
        console.log(`  └─ ✅ Скачано (${Date.now() - startTime}ms) - ${body.length} байт`);
        return body;
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            console.log(`  └─ ⚠️ Файл не найден`);
            return null;
        }
        console.error(`  └─ ❌ Ошибка скачивания: ${error.message}`);
        throw error;
    }
}

// ===== ПРОВЕРКА СУЩЕСТВОВАНИЯ ФАЙЛА =====
async function fileExistsInS3(key) {
    try {
        await s3Client.send(new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        }));
        console.log(`🔍 Файл существует: ${key}`);
        return true;
    } catch (error) {
        if (error.name === 'NotFound') {
            console.log(`🔍 Файл не найден: ${key}`);
            return false;
        }
        throw error;
    }
}

// ===== УДАЛЕНИЕ ФАЙЛА ИЗ S3 =====
async function deleteFromS3(key) {
    try {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        }));
        console.log(`🗑️ Файл удален из S3: ${key}`);
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
        
        const result = await s3Client.send(new ListObjectsV2Command(params));
        const files = result.Contents ? result.Contents.map(item => item.Key) : [];
        console.log(`📁 Список файлов (${prefix}): ${files.length} файлов`);
        return files;
    } catch (error) {
        console.error('❌ Ошибка получения списка файлов:', error.message);
        return [];
    }
}

module.exports = {
    s3Client,
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
