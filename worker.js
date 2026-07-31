const mediaPrefix = "/_experiences/seatline-kolkata/media/";
const trailers = new Set([
  "ramayana-trailer.mp4",
  "spiderman-trailer.mp4",
  "dhurandhar-trailer.mp4",
]);

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/") {
      return Response.redirect(new URL("/_experiences/seatline-kolkata/", request.url), 302);
    }
    if (!pathname.startsWith(mediaPrefix)) return new Response("Not found", { status: 404 });

    const name = decodeURIComponent(pathname.slice(mediaPrefix.length));
    if (!trailers.has(name)) return new Response("Not found", { status: 404 });

    const object = await env.TRAILERS.get(
      name,
      request.headers.has("range") ? { range: request.headers } : undefined,
    );
    if (!object) return new Response("Not found", { status: 404 });

    const headers = new Headers({
      "accept-ranges": "bytes",
      "cache-control": "public, max-age=31536000, immutable",
      "content-type": "video/mp4",
      etag: object.httpEtag,
    });
    object.writeHttpMetadata(headers);

    if (object.range) {
      const { offset, length } = object.range;
      headers.set("content-length", String(length));
      headers.set("content-range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
    } else {
      headers.set("content-length", String(object.size));
    }

    return new Response(request.method === "HEAD" ? null : object.body, {
      status: object.range ? 206 : 200,
      headers,
    });
  },
};
