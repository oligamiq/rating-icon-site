// <define:__ROUTES__>
var define_ROUTES_default = {
  version: 1,
  include: [
    "/_image",
    "/api/ai"
  ],
  exclude: []
};

// node_modules/.pnpm/wrangler@3.25.0/node_modules/wrangler/templates/pages-dev-pipeline.ts
import worker from "C:\\Users\\nziq5\\Documents\\4J\\\u5F8C\u671F\\\u77E5\u8B58\u60C5\u5831\u5DE5\u5B66\\rating-icon\\.wrangler\\tmp\\pages-A7rxRE\\bundledWorker-0.461230415526968.mjs";
import { isRoutingRuleMatch } from "C:\\Users\\nziq5\\Documents\\4J\\\u5F8C\u671F\\\u77E5\u8B58\u60C5\u5831\u5DE5\u5B66\\rating-icon\\node_modules\\.pnpm\\wrangler@3.25.0\\node_modules\\wrangler\\templates\\pages-dev-util.ts";
export * from "C:\\Users\\nziq5\\Documents\\4J\\\u5F8C\u671F\\\u77E5\u8B58\u60C5\u5831\u5DE5\u5B66\\rating-icon\\.wrangler\\tmp\\pages-A7rxRE\\bundledWorker-0.461230415526968.mjs";
var routes = define_ROUTES_default;
var pages_dev_pipeline_default = {
  fetch(request, env, context) {
    const { pathname } = new URL(request.url);
    for (const exclude of routes.exclude) {
      if (isRoutingRuleMatch(pathname, exclude)) {
        return env.ASSETS.fetch(request);
      }
    }
    for (const include of routes.include) {
      if (isRoutingRuleMatch(pathname, include)) {
        if (worker.fetch === void 0) {
          throw new TypeError("Entry point missing `fetch` handler");
        }
        return worker.fetch(request, env, context);
      }
    }
    return env.ASSETS.fetch(request);
  }
};
export {
  pages_dev_pipeline_default as default
};
//# sourceMappingURL=rcrsxlv69yb.js.map
