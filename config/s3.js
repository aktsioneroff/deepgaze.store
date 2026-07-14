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
        await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
        console.log(`  ├─ ✅ Бакет доступен (${Date.now() - startTime}ms)`);
        
        // Пробуем создать тестовый файл
        const testKey = `_test_connection_${Date.now()}.txt`;
        await s3Client.send(new PutObjectCommand({
            Bucket:
