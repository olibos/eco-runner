import { AzureOpenAI } from "openai";
import fs from "fs";
import path from "node:path";
import type { ImagesResponse } from "openai/resources";

const client = new AzureOpenAI({
  endpoint: process.env.AZURE_API_ENDPOINT,
  apiKey: process.env.AZURE_API_KEY,
  apiVersion: "2025-04-01-preview",
  deployment: "gpt-image-1.5",
});

async function generateImage(fileName: string) {
  const prompt = `
WipEout HD Fury futuristic racing HUD style portrait of user,
wearing a futuristic anti-gravity pilot half-helmet with HUD visor,
orange and chrome neon palette,
dark void with floating holographic HUD elements background,
photorealistic face preserved exactly,
sharp cinematic lighting,
highly detailed,
4K,
avatar composition,
face centered and fully visible,
hyperrealistic skin texture,
dramatic rim lighting.

Add:
- holographic racing telemetry
- AG racing league interface
- futuristic speed indicators
- chrome armor details
- orange neon glow reflections
- cinematic sci-fi atmosphere
`;

  const imagePath = path.join("./profile-pictures", fileName);
  const outputFileName = `${path.parse(fileName).name}.jpg`;
  const outputPath = path.join("./game-pictures", outputFileName);
  if (await Bun.file(outputPath).exists()) {
    console.log(`Image already exists, skipping: ${outputPath}`);
    return false;
  }

  const image = Bun.file(imagePath);
  const result = await client.images.edit({
    prompt,
    size: "1024x1024",
    image,
    output_format: "jpeg",
    n: 1,
  }).catch(e =>{
    console.error(`Error generating image for ${fileName}:`, e);
    return {} as unknown as ImagesResponse;
  });

  const imageBase64 = result.data?.[0]?.b64_json;
  if (!imageBase64) {
    console.error(`No image data returned for ${fileName}`);
    return true;
  }

  fs.mkdirSync("./game-pictures", { recursive: true });

  fs.writeFileSync(
    outputPath,
    Buffer.from(imageBase64, "base64")
  );

  console.log(`Image generated: ${outputPath}`);
  return true;
}

async function generateDefault() {
  const prompt = `
WipEout HD Fury futuristic racing HUD style portrait,
wearing a futuristic anti-gravity pilot half-helmet with HUD visor that fully conceals all facial features,
completely anonymous pilot, no face visible, no skin visible, no gender-defining features,
the visor is fully opaque and reflective, hiding everything behind it,
orange and chrome neon palette,
dark void with floating holographic HUD elements background,
sharp cinematic lighting,
highly detailed,
4K,
avatar composition,
helmet centered and fully visible,
dramatic rim lighting.

Add:
- holographic racing telemetry
- AG racing league interface
- futuristic speed indicators
- chrome armor details
- orange neon glow reflections
- cinematic sci-fi atmosphere
`;

  const outputPath = path.join("./game-pictures", "default.jpg");
  if (await Bun.file(outputPath).exists()) {
    console.log(`Default image already exists, skipping: ${outputPath}`);
    return;
  }

  const result = await (client.images.generate({
    prompt,
    size: "1024x1024",
    output_format: "jpeg",
    n: 1,
  })).catch(e => {
    console.error(`Error generating default image:`, e);
    return {} as ImagesResponse;
  });

  const imageBase64 = result.data?.[0]?.b64_json;
  if (!imageBase64) {
    console.error(`No image data returned for default`);
    return;
  }

  fs.mkdirSync("./game-pictures", { recursive: true });

  fs.writeFileSync(
    outputPath,
    Buffer.from(imageBase64, "base64")
  );

  console.log(`Default image generated: ${outputPath}`);
}

async function generateImagesFromProfilePictures() {
  const profilePicturesDir = "./profile-pictures";
  const fileNames = fs
    .readdirSync(profilePicturesDir)
    .filter((fileName) => {
      const extension = path.extname(fileName).toLowerCase();
      return extension === ".jpg" || extension === ".jpeg";
    });

  if (fileNames.length === 0) {
    throw new Error(`No JPEG files found in ${profilePicturesDir}`);
  }

  for (const fileName of fileNames) {
    if(await generateImage(fileName)) {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // pause 10 seconds between requests to avoid rate limits
    }
  }
}

generateDefault().catch(console.error);
generateImagesFromProfilePictures().catch(console.error);