// This suite exists because of a real incident: `middleware/upload.js`
// only `require()`s the Cloudinary storage engine inside an
// `if (hasCloudinaryConfig)` branch. In every other test file,
// CLOUDINARY_* env vars are unset, so that branch — and that require —
// never runs. That's exactly the code path that broke in production
// (twice): a missing file and, separately, a file with the wrong content
// both passed the full existing test suite and CI, because nothing ever
// exercised the "Cloudinary actually configured" branch the way Railway's
// production environment does.
//
// This test closes that gap directly: set the same env vars production
// sets, then require the app fresh and confirm it doesn't throw. It won't
// catch logic bugs, but it will catch MODULE_NOT_FOUND, wrong exports, and
// other wiring mistakes at `npm test` time instead of on a live deploy.
describe("App boots with production-shaped config", () => {
  const REQUIRED_ENV = {
    NODE_ENV: "production",
    CLOUDINARY_CLOUD_NAME: "smoke-test-cloud",
    CLOUDINARY_API_KEY: "smoke-test-key",
    CLOUDINARY_API_SECRET: "smoke-test-secret",
    JWT_SECRET: "smoke-test-jwt-secret",
    MONGO_URI: "mongodb://localhost:27017/smoke-test",
  };

  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    Object.assign(process.env, REQUIRED_ENV);
    // Force every required module to be re-evaluated from scratch under
    // this env, rather than reusing whatever any earlier test file already
    // cached (e.g. config/cloudinary.js computing hasCloudinaryConfig once
    // at first require and never re-checking it).
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  test("config/cloudinary.js reports configured and exposes a working SDK instance", () => {
    const { hasCloudinaryConfig, cloudinary } = require("../src/config/cloudinary");
    expect(hasCloudinaryConfig).toBe(true);
    expect(typeof cloudinary.config).toBe("function");
    expect(typeof cloudinary.uploader.upload_stream).toBe("function");
  });

  test("middleware/upload.js loads without throwing when Cloudinary is configured", () => {
    // This is the exact require chain that broke: upload.js requires
    // lib/cloudinaryStorage.js only inside the hasCloudinaryConfig branch.
    expect(() => require("../src/middleware/upload")).not.toThrow();
  });

  test("the full app assembles and every route module resolves", () => {
    // Requires the whole app.js require graph — every routes/*.js file and
    // everything they in turn require, including middleware/upload.js via
    // routes/pickupRoutes.js. A missing or misnamed file anywhere in that
    // graph fails here with the same MODULE_NOT_FOUND Railway showed.
    const createApp = require("../src/app");
    expect(() => createApp()).not.toThrow();
  });
});