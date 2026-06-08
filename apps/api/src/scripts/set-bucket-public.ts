import { S3Client, PutBucketPolicyCommand } from '@aws-sdk/client-s3';

async function makeBucketPublic() {
  console.log('Making catalog bucket public...');

  const accessKeyId = process.env.SEAWEDFS_S3_ACCESS_KEY;
  const secretAccessKey = process.env.SEAWEDFS_S3_SECRET_KEY;

  if (!accessKeyId || !secretAccessKey) {
    console.error('❌ Missing SeaweedFS credentials. Check .env file.');
    process.exit(1);
  }

  const client = new S3Client({
    endpoint: 'http://localhost:8333',
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
    region: 'us-east-1',
  });

  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: ['arn:aws:s3:::catalog/*'],
      },
    ],
  };

  const command = new PutBucketPolicyCommand({
    Bucket: 'catalog',
    Policy: JSON.stringify(policy),
  });

  try {
    await client.send(command);
    console.log('✅ Bucket policy updated successfully!');
    console.log('Images are now publicly accessible at: http://localhost:8333/catalog/*');
    console.log('');
    console.log('Example: http://localhost:8333/catalog/product-images/a7f3/91578A103-1.jpg');
  } catch (error) {
    console.error('❌ Error setting bucket policy:', error);
    process.exit(1);
  }
}

makeBucketPublic();
