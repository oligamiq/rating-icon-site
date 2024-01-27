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
import { load_image } from "wasm";

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
  pixelData: PixelData,
  model: LayersModel,
  metaClasses: string[],
): Promise<
  Array<{
    className: string;
    probability: number;
  }>
> => {
  const logits = tidy(() => {
    // browser.fromPixels() returns a Tensor from an image element.
    let img = browser.fromPixels(pixelData).toFloat();

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

  const buffer = await data.arrayBuffer();

  const parseData = JSON.parse(load_image(buffer)) as {
    data: number[];
    width: number;
    height: number;
  };
  const pixelData: PixelData = {
    data: new Uint8Array(parseData.data),
    width: parseData.width,
    height: parseData.height,
  };

  console.log("####### 6 #######");

  const predictions = await predict(pixelData, model, classes);

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
