// config/s3.js - временная заглушка
console.log('⚠️ S3 временно отключен');

module.exports = {
    s3: null,
    s3Config: null,
    BUCKET_NAME: null,
    logS3Connection: () => console.log('S3: disabled'),
    testS3Connection: async () => false,
    uploadToS3: async () => { console.log('S3 upload: disabled'); return null; },
    downloadFromS3: async () => null,
    fileExistsInS3: async () => false,
    deleteFromS3: async () => false,
    listS3Files: async () => []
};
