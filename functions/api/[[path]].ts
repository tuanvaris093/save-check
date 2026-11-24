import { adminApi } from "../../worker/src/pages-admin";
import type { AdminBindings } from "../../worker/src/routes/admin";

export const onRequest: PagesFunction<AdminBindings> = ({ request, env }) =>
  adminApi.fetch(request, env);
