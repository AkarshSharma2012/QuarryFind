// DELETE → deletes the signed-in user. Every table cascades from auth.users.
import { admin, cors, err, userFromJwt } from "../_shared/server.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "DELETE") return err(req, 405, "method_not_allowed", "Use DELETE.");
  const user = await userFromJwt(req);
  if (!user) return err(req, 401, "unauthorized", "Sign in first.");
  const { error } = await admin().auth.admin.deleteUser(user.id);
  if (error) return err(req, 500, "server_error", "Couldn’t delete the account. Try again or contact support.");
  return new Response(null, { status: 204, headers: cors(req) });
});
