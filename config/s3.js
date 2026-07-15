const { S3Client, HeadBucketCommand, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// ===== КОНФИГУРАЦИЯ S3 =====
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

// Создаем S3 клиент
const s3Client = new S3Client(s3Config);
let s3Connected = false;

// ===== ФУНКЦИЯ ПРОВЕРКИ S3 =====
async function testS3Connection() {
    console.log('🔍 Проверка подключения к S3...');
    try {
        await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
        console.log('✅ S3 подключен успешно!');
        s3Connected = true;
        return true;
    } catch (error) {
        console.error('❌ Ошибка подключения к S3:');
        console.error('  ├─ Name:', error.name);
        console.error('  ├─ Code:', error.Code || 'Нет');
        console.error('  └─ Message:', error.message);
        s3Connected = false;
        return false;
    }
}

// ===== ФУНКЦИИ ДЛЯ РАБОТЫ С S3 =====
async function uploadToS3(key, data, contentType = 'application/json') {
    if (!s3Connected) {
        console.log(`⚠️ S3 не доступен, данные НЕ СОХРАНЕНЫ: ${key}`);
        return false;
    }
    try {
        const params = {
            Bucket: BUCKET_NAME,
            Key: key,
            Body: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
            ContentType: contentType
        };
        const result = await s3Client.send(new PutObjectCommand(params));
        console.log(`✅ Файл загружен в S3: ${key} (ETag: ${result.ETag})`);
        return true;
    } catch (error) {
        console.error(`❌ Ошибка загрузки в S3: ${error.message}`);
        console.error(`  └─ Key: ${key}`);
        return false;
    }
}

async function downloadFromS3(key) {
    if (!s3Connected) {
        console.log(`⚠️ S3 не доступен: ${key}`);
        return null;
    }
    try {
        const params = { Bucket: BUCKET_NAME, Key: key };
        const result = await s3Client.send(new GetObjectCommand(params));
        const body = await result.Body.transformToString();
        console.log(`✅ Файл скачан из S3: ${key} (${body.length} байт)`);
        return body;
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            console.log(`📄 Файл не найден в S3: ${key} (будет создан при первом сохранении)`);
            return null;
        }
        console.error(`❌ Ошибка скачивания из S3: ${error.message}`);
        console.error(`  └─ Key: ${key}`);
        return null;
    }
}

async function deleteFromS3(key) {
    if (!s3Connected) {
        console.log(`⚠️ S3 не доступен, пропускаем удаление: ${key}`);
        return false;
    }
    try {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        }));
        console.log(`🗑️ Файл удален из S3: ${key}`);
        return true;
    } catch (error) {
        console.error(`❌ Ошибка удаления из S3: ${error.message}`);
        return false;
    }
}

async function listS3Files(prefix = '') {
    if (!s3Connected) {
        console.log(`⚠️ S3 не доступен`);
        return [];
    }
    try {
        const params = {
            Bucket: BUCKET_NAME,
            Prefix: prefix
        };
        const result = await s3Client.send(new ListObjectsV2Command(params));
        const files = result.Contents ? result.Contents.map(item => item.Key) : [];
        console.log(`📁 Список файлов в S3 (${prefix}): ${files.length} файлов`);
        return files;
    } catch (error) {
        console.error('❌ Ошибка получения списка файлов:', error.message);
        return [];
    }
}

// ===== ЭКСПОРТ =====
module.exports = {
    s3Client,
    s3Config,
    BUCKET_NAME,
    s3Connected,
    testS3Connection,
    uploadToS3,
    downloadFromS3,
    deleteFromS3,
    listS3Files
};
