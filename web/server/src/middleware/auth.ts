import {BillingSettings, Shopify} from "@shopify/shopify-api";
import { gdprTopics } from "@shopify/shopify-api/dist/webhooks/registry.js";
import { Request, Response, Application} from "express";

import ensureBilling from "../helpers/ensure-billing";
import redirectToAuth from "../helpers/redirect-to-auth";

export default function applyAuthMiddleware(
  app: Application,
  { billing }: {billing: BillingSettings & {required: boolean}}
) {
  app.get("/api/auth", async (req: Request, res: Response) => {
    return redirectToAuth(req, res, app)
  });

  app.get("/api/auth/callback", async (req: Request, res: Response) => {
    try {
      const session = await Shopify.Auth.validateAuthCallback(
        req,
        res,
        req.query as {
          shop: string;
          code: string;
          timestamp: string;
          state: string;
        }
      );

      const responses = await Shopify.Webhooks.Registry.registerAll({
        shop: session.shop,
        accessToken: session.accessToken as string,
      });

      Object.entries(responses).map(([topic, response]) => {
        // The response from registerAll will include errors for the GDPR topics.  These can be safely ignored.
        // To register the GDPR topics, please set the appropriate webhook endpoint in the
        // 'GDPR mandatory webhooks' section of 'App setup' in the Partners Dashboard.
        if (!response.success && !gdprTopics.includes(topic)) {
          console.log(
              // @ts-ignore
            `Failed to register ${topic} webhook: ${response.result.errors[0].message}`
          );
        }
      });

      // If billing is required, check if the store needs to be charged right away to minimize the number of redirects.
      if (billing.required) {
        const [hasPayment, confirmationUrl] = await ensureBilling(
          session,
            billing
        );

        if (!hasPayment) {
          return res.redirect(confirmationUrl);
        }
      }

      const host = Shopify.Utils.sanitizeHost(`${req.query.host}`);
      const redirectUrl = Shopify.Context.IS_EMBEDDED_APP
        ? Shopify.Utils.getEmbeddedAppUrl(req)
        : `/?shop=${session.shop}&host=${encodeURIComponent(host || '')}`;

      res.redirect(redirectUrl);
    } catch (e) {
      console.warn(e);
      switch (true) {
        case e instanceof Shopify.Errors.InvalidOAuthError:
          res.status(400);
          res.send((e as any).message);
          break;
        case e instanceof Shopify.Errors.CookieNotFound:
        case e instanceof Shopify.Errors.SessionNotFound:
          // This is likely because the OAuth session cookie expired before the merchant approved the request
          return redirectToAuth(req, res, app);
          break;
        default:
          res.status(500);
          res.send((e as any).message);
          break;
      }
    }
  });
}
