import { mapPredictions } from "./scrapLabelMap";

// Runs entirely in the user's browser — no server, API key or per-use cost.
// The TensorFlow libraries and the small MobileNet model are fetched only the
// first time someone asks for a suggestion (dynamic import = separate chunk),
// then cached by the browser.
let modelPromise = null;

function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const [tf, mobilenet] = await Promise.all([import("@tensorflow/tfjs"), import("@tensorflow-models/mobilenet")]);
      try {
        await tf.setBackend("webgl");
      } catch {
        await tf.setBackend("cpu");
      }
      await tf.ready();
      return mobilenet.load({ version: 2, alpha: 0.5 });
    })().catch((err) => {
      modelPromise = null; // allow a retry after a network failure
      throw err;
    });
  }
  return modelPromise;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read the photo"));
    img.src = url;
  });
}

/** Resolves to [{ scrapType, share }] — empty when nothing scrap-like was recognised. */
export async function suggestScrapTypes(imageUrl) {
  const [model, img] = await Promise.all([loadModel(), loadImage(imageUrl)]);
  const predictions = await model.classify(img, 12);
  return mapPredictions(predictions);
}