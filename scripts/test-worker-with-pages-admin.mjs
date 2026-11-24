import worker from "../worker/src/index.ts";
import { adminApi } from "../worker/src/pages-admin.ts";

export default worker.route("/", adminApi);
