import {Shopify} from "@shopify/shopify-api";
import {Application, Request, Response} from "express";

export default async function redirectToAuth(req: Request, res: Response, app: Application) {
  if (!req.query.shop) {
    res.status(500);
    return res.send("No shop provided");
  }

  if (req.query.embedded === "1") {
    return clientSideRedirect(req, res);
  }

  return await serverSideRedirect(req, res, app);
}

function clientSideRedirect(req: Request, res: Response) {
  const shop = Shopify.Utils.sanitizeShop(req.query.shop as string) as string;
  const redirectUriParams = new URLSearchParams({
    shop,
    host: req.query.host as string,
  }).toString();
  const queryParams = new URLSearchParams({
    ...req.query,
    shop,
    redirectUri: `https://${Shopify.Context.HOST_NAME}/api/auth?${redirectUriParams}`,
  }).toString();

  return res.redirect(`/exitiframe?${queryParams}`);
}

async function serverSideRedirect(req: Request, res: Response, app: Application) {
  const redirectUrl = await Shopify.Auth.beginAuth(
    req,
    res,
    req.query.shop as string,
    "/api/auth/callback",
    app.get("use-online-tokens")
  );

  return res.redirect(redirectUrl);
}
