import ImageKit from '@imagekit/nodejs';
import { readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const GAME_PICTURES_DIR = './game-pictures';

interface UploadOptions {
    connectionString: string;
    containerName: string;
    directory?: string;
}

async function uploadJpgsToAzure(options: UploadOptions): Promise<void> {
    const { connectionString, containerName, directory = GAME_PICTURES_DIR } = options;

    // Validate inputs
    if (!connectionString) {
        throw new Error('Connection string is required. Set AZURE_STORAGE_CONNECTION_STRING environment variable.');
    }
    if (!containerName) {
        throw new Error('Container name is required.');
    }

    try {
        // Get all JPG files from the directory
        const files = readdirSync(directory);
        const jpgFiles = files.filter(file => {
            const filePath = join(directory, file);
            const stat = statSync(filePath);
            return stat.isFile() && extname(file).toLowerCase() === '.jpg' || extname(file).toLowerCase() === '.jpeg';
        });

        if (jpgFiles.length === 0) {
            console.log(`No JPG files found in ${directory}`);
            return;
        }

        console.log(`Found ${jpgFiles.length} JPG file(s) to upload`);
        console.log(`Uploading to container: ${containerName}\n`);

        const client = new ImageKit({
            privateKey: process.env.IMAGEKIT_UPLOAD_TOKEN!,
        });
        // Upload each file
        for (const file of jpgFiles) {
            const filePath = join(directory, file);

            const fileName = hash(file);
            try{
                await client.files.upload({
                    file: Bun.file(filePath),
                    fileName,
                    useUniqueFileName: false,
                });
                console.log(`Uploading ${file}/${fileName}... ✓ Done`);
            } catch (error) {
                console.error(`✗ Failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        console.log('\nUpload process completed!');
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

// CLI entry point
async function main(): Promise<void> {
    // Parse arguments
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = 'runners';
    const directory = GAME_PICTURES_DIR;

    await uploadJpgsToAzure({ connectionString: connectionString || '', containerName, directory });
}

function hash(file: string): string {
    if (file === "default.jpg") return file;
    const hasher = new Bun.CryptoHasher("md5");
    hasher.update(file.toLowerCase().replace(/\.jpe?g/, ''));
    return hasher.digest("hex") + '.jpg';
}


main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});