// https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/image
export const prerender = false;

import type { APIRoute } from "astro";
// @ts-ignore
import AttrModelJson from "@/aimodels/attr/model.json?url";
import attrMetadataJson from "@/aimodels/attr/metadata.json";
import AttrModel from "@/aimodels/attr/weights.bin?url";

import StarModelJson from "@/aimodels/star/model.json?url";
import StarMetadataJson from "@/aimodels/star/metadata.json";
import StarModel from "@/aimodels/star/weights.bin?url";
import { TwitterOpenApi } from "twitter-openapi-typescript";
import { Buffer } from "node:buffer";
import { greet } from "wasm";

const url = (import.meta.env.DEV)
  ? "http://localhost:4321"
  : "https://rating-icon.pages.dev";
const AttrModelJsonUrl = url + AttrModelJson;
const AttrModelUrl = url + AttrModel;
const StarModelJsonUrl = url + StarModelJson;
const StarModelUrl = url + StarModel;

import {
  browser,
  dispose,
  image,
  LayersModel,
  loadLayersModel,
  type PixelData,
  Rank,
  scalar,
  Tensor,
  tidy,
} from "@tensorflow/tfjs";

import { Readable } from "node:stream";

const useAttrModel = async (imageUrl: string): Promise<
  Array<{
    className: string;
    probability: number;
  }>
> => {
  console.log(AttrModelJsonUrl);
  const model = await loadLayersModel(AttrModelJsonUrl, {
    weightUrlConverter: async (_) => AttrModelUrl,
  });

  const prediction = await loadImage(
    model,
    imageUrl,
    attrMetadataJson.labels,
  );

  return prediction;
};

const useStarModel = async (imageUrl: string): Promise<
  Array<{
    className: string;
    probability: number;
  }>
> => {
  const model = await loadLayersModel(StarModelJsonUrl, {
    weightUrlConverter: async (_) => StarModelUrl,
  });

  const prediction = await loadImage(
    model,
    imageUrl,
    StarMetadataJson.labels,
  );

  return prediction;
};

export const GET: APIRoute = async ({ request }) => {
  const twitter = new URL(request.url).searchParams.get("twitter");
  // const twitterImage = `https://twitter.com/${twitter}/photo`;

  if (!twitter) {
    throw new Error("twitter is not defined");
  }

  const twitterImage = await getUserNameFromTwitter(twitter);

  const attrPrediction = await useAttrModel(twitterImage);

  const starPrediction = await useStarModel(twitterImage);

  const response = new Response(JSON.stringify({
    attr: attrPrediction,
    star: starPrediction,
  }));
  return response;
};

const predict = async (
  buffer: Buffer,
  model: LayersModel,
  metaClasses: string[],
): Promise<
  Array<{
    className: string;
    probability: number;
  }>
> => {
  // const sharpImage = sharp(buffer);
  const img_alt: PixelData = {
    data: Buffer.from(buffer),
    width: 0,
    height: 0,
  };

  const logits = tidy(() => {
    // browser.fromPixels() returns a Tensor from an image element.
    let img = browser.fromPixels(img_alt).toFloat();

    if (
      !model.inputs[0].shape[1] || !model.inputs[0].shape[2] ||
      !model.inputs[0].shape[3]
    ) {
      throw new Error("model has not been trained or converted properly");
    }

    img = image.resizeNearestNeighbor(img, [
      model.inputs[0].shape[1],
      model.inputs[0].shape[2],
    ]);

    const offset = scalar(127.5);
    // Normalize the image from [0, 255] to [-1, 1].
    const normalized = img.sub(offset).div(offset);

    // Reshape to a single-element batch so we can pass it to predict.
    const batched = normalized.reshape([
      1,
      model.inputs[0].shape[1],
      model.inputs[0].shape[2],
      model.inputs[0].shape[3],
    ]);

    return model.predict(batched);
  });

  const values = await (logits as Tensor<Rank>).data();

  const classes = [];
  for (let i = 0; i < values.length; i++) {
    classes.push({
      className: metaClasses[i],
      probability: values[i],
    });
  }

  dispose(logits);

  return classes;
};

const loadImage = async (
  model: LayersModel,
  imageUrl: string,
  classes: string[],
): Promise<
  Array<{
    className: string;
    probability: number;
  }>
> => {
  console.log("####### 1 #######");
  const data = await fetch(imageUrl);
  console.log("####### 2 #######");

  const contentType = data.headers.get("Content-Type");
  console.log("####### 3 #######");
  const buffer = await data.arrayBuffer();

  console.log("####### 4 #######");
  // const stream = bufferToStream(buffer);

  console.log("####### 5 #######");
  if (!contentType) {
    throw new Error("Content-Type is not defined");
  }

  // console.log(wasmUrl);
  // console.log("####### 5.1 #######");
  // let wasmUrlFetch: Response | Uint8Array | undefined = undefined;
  // try {
  //   wasmUrlFetch = await fetch(wasmUrl);
  // } catch (error) {
  //   wasmUrlFetch = parseDataURL(wasmUrl)?.body;
  //   if (!wasmUrlFetch) {
  //     throw new Error("cannot parse url");
  //   }
  // }
  // await init(wasmUrlFetch);
  // console.log(wasmUrlFetch);
  greet();

  console.log("####### 6 #######");

  // let imageBitmap: Bitmap | null = null;
  // {
  //   console.log("####### 7 #######");
  //   const lowerCaseContentType = contentType.toLowerCase();

  //   console.log("####### 8 #######");
  //   if (lowerCaseContentType.includes("png")) {
  //     console.log("####### 9 #######");
  //     imageBitmap = await decodePNGFromStream(stream);
  //   }

  //   console.log("####### 10 #######");
  //   if (
  //     lowerCaseContentType.includes("jpeg") ||
  //     lowerCaseContentType.includes("jpg")
  //   ) {
  //     console.log("####### 11 #######");
  //     imageBitmap = await decodeJPEGFromStream(stream);
  //     console.log("####### 12 #######");
  //   }
  // }

  // console.log("####### 12 #######");
  // if (!imageBitmap) {
  //   throw new Error("ImageBitmap is not defined");
  // }

  const predictions = await predict(Buffer.from(buffer), model, classes);

  return predictions;
};

const bufferToStream = (binary: ArrayBuffer) => {
  const buffer = Buffer.from(binary); // Convert ArrayBuffer to Buffer

  const readableInstanceStream = new Readable({
    read() {
      console.log("####### 13 #######");
      this.push(buffer);
      console.log("####### 14 #######");
      this.push(null);
      console.log("####### 15 #######");
    },
  });

  return readableInstanceStream;
};

const getUserNameFromTwitter = async (twitter: string): Promise<string> => {
  const api = new TwitterOpenApi();
  const client = await api.getGuestClient();
  const responseTwitter = await client.getUserApi().getUserByScreenName({
    screenName: twitter,
  });

  const url = responseTwitter.data.user?.legacy.profileImageUrlHttps;

  if (!url) {
    throw new Error("url is not defined");
  }

  return url;
};
