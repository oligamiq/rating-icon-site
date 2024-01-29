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
// import { Buffer } from "node:buffer";
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
  ready,
  scalar,
  setBackend,
  Tensor,
  tidy,
} from "@tensorflow/tfjs";

// import { Readable } from "node:stream";

// import tfjsWasm from "@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm?module";
// import tfjsWasmSimd from "@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-simd.wasm?module";
// import tfjsWasmThreadedSimd from "@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-threaded-simd.wasm?module";
// import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";

const useAttrModel = async (imageUrl: PixelData): Promise<
  Array<{
    className: string;
    probability: number;
  }>
> => {
  console.log(AttrModelJsonUrl);
  console.log("load model attr");
  const model = await loadLayersModel(AttrModelJsonUrl, {
    weightUrlConverter: async (_) => AttrModelUrl,
  });
  console.log("load model attr end");

  const prediction = await loadImage(
    model,
    imageUrl,
    attrMetadataJson.labels,
  );

  return prediction;
};

const useStarModel = async (imageUrl: PixelData): Promise<
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
  console.log(`start time: ${new Date().getTime()}`);

  const new_url = new URL(request.url);
  const twitter = new_url.searchParams.get("twitter");
  const only = new_url.searchParams.get("only");
  // const twitterImage = `https://twitter.com/${twitter}/photo`;

  if (!twitter) {
    throw new Error("twitter is not defined");
  }

  // globalThis.location = globalThis.location ?? new URL(url);

  // console.log(tfjsWasm, tfjsWasmSimd, tfjsWasmThreadedSimd);
  // setWasmPaths({
  //   "tfjs-backend-wasm.wasm": tfjsWasm,
  //   "tfjs-backend-wasm-simd.wasm": tfjsWasmSimd,
  //   "tfjs-backend-wasm-threaded-simd.wasm": tfjsWasmThreadedSimd,
  // });

  // if (await setBackend("wasm")) {
  //   console.log("WASM WAS LOADED");
  // } else {
  //   console.log("WASM WAS NOT LOADED");
  // }
  await setBackend("cpu");
  await ready();
  console.log(`get twitter image url from ${twitter}`);
  const twitterImageUrl = await getUserNameFromTwitter(twitter);
  console.log(`twitter image url is ${twitterImageUrl}`);
  const pixelData = await getPixelData(twitterImageUrl);
  // const [attrPrediction, starPrediction] = await Promise.all([
  //   useAttrModel(pixelData),
  //   useStarModel(pixelData),
  // ]);
  if (only === "attr") {
    const attrPrediction = await useAttrModel(pixelData);
    const response = new Response(JSON.stringify({
      attr: attrPrediction,
      img: twitterImageUrl,
    }));
    return response;
  }
  if (only === "star") {
    const starPrediction = await useStarModel(pixelData);
    const response = new Response(JSON.stringify({
      star: starPrediction,
      img: twitterImageUrl,
    }));
    return response;
  }
  const attrPrediction = await useAttrModel(pixelData);
  const starPrediction = await useStarModel(pixelData);

  const response = new Response(JSON.stringify({
    attr: attrPrediction,
    star: starPrediction,
    img: twitterImageUrl,
  }));
  return response;
};

const getPixelData = async (imageUrl: string): Promise<PixelData> => {
  console.log("####### start getPixelData #######");
  const data = await fetch(imageUrl);
  console.log("####### fetch getPixelData #######");

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

  console.log("####### get getPixelData #######");

  return pixelData;
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

    console.log("predict time");

    const predict = model.predict(batched);

    return predict;
  });

  const values = await (logits as Tensor<Rank>).data();

  console.log("get predict result");

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
  pixelData: PixelData,
  classes: string[],
): Promise<
  Array<{
    className: string;
    probability: number;
  }>
> => {
  console.log("####### 6 #######");

  const predictions = await predict(pixelData, model, classes);

  console.log("####### 7 #######");

  return predictions;
};

// const bufferToStream = (binary: ArrayBuffer) => {
//   const buffer = Buffer.from(binary); // Convert ArrayBuffer to Buffer

//   const readableInstanceStream = new Readable({
//     read() {
//       console.log("####### 13 #######");
//       this.push(buffer);
//       console.log("####### 14 #######");
//       this.push(null);
//       console.log("####### 15 #######");
//     },
//   });

//   return readableInstanceStream;
// };

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
