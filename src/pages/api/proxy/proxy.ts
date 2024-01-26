export const prerender = false;

import type { APIRoute } from "astro";

// サーバサイドプロキシ

// searchパラメータを受け取る

// solidJS

export const GET: APIRoute = async ({ request }) => {
  const params = new URL(request.url).searchParams;
  const resp = await fetch(
    params.get("url") as string,
  );
  const data = await resp.arrayBuffer();
  const response = new Response(
    data,
    {
      status: resp.status,
    },
  );
  response.headers.set("Access-Control-Allow-Origin", "http://localhost:4321");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST");
  return response;
};
